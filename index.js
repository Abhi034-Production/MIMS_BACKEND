require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const SignupModel = require("./models/adminsignup");
const ProductModel = require("./models/product");

const nodemailer = require("nodemailer");
const BusinessProfile = require("./models/businessprofile");
const multer = require("multer");
const path = require("path");

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "uploads"));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Ensure uploads directory exists
const fs = require("fs");
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const app = express();

const allowedOrigins = ["https://mimsp.netlify.app" , "http://localhost:5173"];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);


app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

let otpStore = {};


mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("MongoDB Connection Error:", err));


app.get("/run", (req, res) => {
  res.send("Backend is running!");
});


app.post("/business-profile", upload.fields([
  { name: "businessLogo", maxCount: 1 },
  { name: "businessStamp", maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      userEmail,
      businessName,
      businessMobile,
      businessAddress,
      businessEmail,
      businessCategory,
    } = req.body;

    // File paths
    let businessLogo = null;
    let businessStamp = null;
    if (req.files["businessLogo"]) {
      businessLogo = `/uploads/${req.files["businessLogo"][0].filename}`;
    }
    if (req.files["businessStamp"]) {
      businessStamp = `/uploads/${req.files["businessStamp"][0].filename}`;
    }

    // Upsert: update if exists, else create
    const update = {
      businessName,
      businessMobile,
      businessAddress,
      businessEmail,
      businessCategory,
    };
    if (businessLogo) update.businessLogo = businessLogo;
    if (businessStamp) update.businessStamp = businessStamp;

    const profile = await BusinessProfile.findOneAndUpdate(
      { userEmail },
      update,
      { new: true, upsert: true }
    );
    console.log("[ALERT] Business profile created/updated for:", userEmail);
    res.json({ status: "success", profile });
  } catch (error) {
    console.error("[ALERT] Error in /business-profile:", error.message);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// Get business profile by user email
app.get("/business-profile/:userEmail", async (req, res) => {
  try {
    const { userEmail } = req.params;
    const profile = await BusinessProfile.findOne({ userEmail });
    if (!profile) {
      console.log(`[ALERT] Business profile not found for: ${userEmail}`);
      return res.status(404).json({ status: "not_found" });
    }
    console.log(`[ALERT] Business profile fetched for: ${userEmail}`);
    res.json({ status: "success", profile });
  } catch (error) {
    console.error("[ALERT] Error in GET /business-profile/:userEmail:", error.message);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// Update business profile (edit)
app.put("/business-profile/:userEmail", upload.fields([
  { name: "businessLogo", maxCount: 1 },
  { name: "businessStamp", maxCount: 1 }
]), async (req, res) => {
  try {
    const { userEmail } = req.params;
    const {
      businessName,
      businessMobile,
      businessAddress,
      businessEmail,
      businessCategory,
    } = req.body;

    // File paths
    let businessLogo = null;
    let businessStamp = null;
    if (req.files["businessLogo"]) {
      businessLogo = `/uploads/${req.files["businessLogo"][0].filename}`;
    }
    if (req.files["businessStamp"]) {
      businessStamp = `/uploads/${req.files["businessStamp"][0].filename}`;
    }

    // Build update object
    const update = {
      businessName,
      businessMobile,
      businessAddress,
      businessEmail,
      businessCategory,
    };
    if (businessLogo) update.businessLogo = businessLogo;
    if (businessStamp) update.businessStamp = businessStamp;

    const profile = await BusinessProfile.findOneAndUpdate(
      { userEmail },
      update,
      { new: true }
    );
    if (!profile) {
      return res.status(404).json({ status: "not_found" });
    }
    console.log("[ALERT] Business profile updated for:", userEmail);
    res.json({ status: "success", profile });
  } catch (error) {
    console.error("[ALERT] Error in PUT /business-profile/:userEmail:", error.message);
    res.status(500).json({ status: "error", message: error.message });
  }
});


const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Non-OTP Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await SignupModel.findOne({ email });

  if (user) {
    if (await bcrypt.compare(password, user.password)) {
      res.send("success");
    } else {
      res.send("incorrect password");
    }
  } else {
    res.send("no record exists");
  }
});

// Get user data
app.post("/get-user", async (req, res) => {
  const { email } = req.body;
  const user = await SignupModel.findOne({ email });

  if (user) {
    res.json({ status: "success", name: user.name });
  } else {
    res.status(404).json({ status: "error", message: "User not found" });
  }
});

// Update Admin Info
app.put("/update-admin", async (req, res) => {
  const { email, name, password } = req.body;
  try {
    const update = { name };
    if (password) {
      update.password = await bcrypt.hash(password, 10);
    }
    await SignupModel.findOneAndUpdate({ email }, update);
    res.json({ status: "success" });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await SignupModel.findOne({ email });
  if (user) {
    if (await bcrypt.compare(password, user.password)) {
      res.json("success");
    } else {
      res.json("incorrect password");
    }
  } else {
    res.json("no record exists");
  }
});

app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await SignupModel.create({ name, email, password: hashedPassword });
    res.json(newUser);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Add Products
app.post("/add-product", async (req, res) => {
  try {
    const { name, quantity, price, email } = req.body;
    const newProduct = await ProductModel.create({ name, quantity, price, email });
    res.json(newProduct);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Fetch All Products
app.get("/products", async (req, res) => {
  try {
    const { email } = req.query;
    let products;
    if (email) {
      products = await ProductModel.find({ email });
    } else {
      products = await ProductModel.find();
    }
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Product
app.delete("/delete-product/:id", async (req, res) => {
  try {
    await ProductModel.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Product
app.put("/update-product/:id", async (req, res) => {
  try {
    const { name, quantity, price, email } = req.body;
    const updatedProduct = await ProductModel.findByIdAndUpdate(
      req.params.id,
      { name, quantity, price, email },
      { new: true }
    );
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


const Bill = require("./models/billmodel");

app.post("/save-bill", async (req, res) => {
  try {
    // Attach businessEmail to bill and to each order item
    const { businessEmail, ...rest } = req.body;
    const orderWithEmail = (rest.order || []).map(item => ({ ...item, email: businessEmail }));
    const newBill = new Bill({ ...rest, businessEmail, order: orderWithEmail });
    await newBill.save();

    for (const item of orderWithEmail) {
      const updatedProduct = await ProductModel.findOneAndUpdate(
        { name: item.productName },
        { $inc: { quantity: -item.quantity } },
        { new: true }
      );
      if (updatedProduct && updatedProduct.quantity <= 0) {
        await ProductModel.findByIdAndUpdate(updatedProduct._id, { quantity: 0 });
      }
    }

    res.status(201).json({ message: "Bill saved & inventory updated successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Error saving bill or updating inventory." });
  }
});

app.get("/bills", async (req, res) => {
  try {
    const { businessEmail } = req.query;
    let bills;
    if (businessEmail) {
      bills = await Bill.find({ businessEmail });
    } else {
      bills = await Bill.find();
    }
    res.json(bills);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch bills" });
  }
});

app.get("/top-selling-products", async (req, res) => {
  try {
    const bills = await Bill.find();
    const products = await ProductModel.find();

    let productSales = {};

    bills.forEach((bill) => {
      bill.order.forEach((item) => {
        if (productSales[item.productName]) {
          productSales[item.productName] += item.quantity;
        } else {
          productSales[item.productName] = item.quantity;
        }
      });
    });

    const productDetails = products.map((product) => {
      const soldQuantity = productSales[product.name] || 0;
      const isOutOfStock = product.quantity <= 0;
      return {
        name: product.name,
        quantitySold: soldQuantity,
        quantityInStock: product.quantity,
        isOutOfStock
      };
    });

    const sortedProducts = productDetails
      .sort((a, b) => b.quantitySold - a.quantitySold);

    res.json(sortedProducts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch top-selling products." });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

