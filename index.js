require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt"); 
const SignupModel = require("./models/adminsignup");
const ProductModel = require("./models/product");
const nodemailer = require("nodemailer");
const BusinessProfile = require("./models/businessprofile");

const app = express();


app.post("/business-profile", async (req, res) => {
  try {
    const {
      userEmail,
      businessName,
      businessMobile,
      businessAddress,
      businessEmail,
      businessLogo,
      businessStamp,
      businessCategory,
    } = req.body;

    // Upsert: update if exists, else create
    const profile = await BusinessProfile.findOneAndUpdate(
      { userEmail },
      {
        businessName,
        businessMobile,
        businessAddress,
        businessEmail,
        businessLogo,
        businessStamp,
        businessCategory,
      },
      { new: true, upsert: true }
    );
    res.json({ status: "success", profile });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// Get business profile by user email
app.get("/business-profile/:userEmail", async (req, res) => {
  try {
    const { userEmail } = req.params;
    const profile = await BusinessProfile.findOne({ userEmail });
    if (!profile) {
      return res.status(404).json({ status: "not_found" });
    }
    res.json({ status: "success", profile });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});


const app = express();

const allowedOrigins = [ "https://mimsp.netlify.app" , "http://localhost:5173"];

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

let otpStore = {};



mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log("MongoDB Connection Error:", err));


app.get("/run", (req, res) => {
  res.send("Backend is running!");
});



// Transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Password + OTP Step 1: Validate credentials and send OTP

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
    if (await bcrypt.compare(password, user.password)) { // Compare hashed password
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
    const hashedPassword = await bcrypt.hash(password, 10); // Hash password
    const newUser = await SignupModel.create({ name, email, password: hashedPassword });
    res.json(newUser);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Add Products
app.post("/add-product", async (req, res) => {
  try {
    const { name, quantity, price } = req.body;
    const newProduct = await ProductModel.create({ name, quantity, price });
    res.json(newProduct);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Fetch All Products
app.get("/products", async (req, res) => {
  try {
    const products = await ProductModel.find();
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
    const { name, quantity, price } = req.body;
    const updatedProduct = await ProductModel.findByIdAndUpdate(req.params.id, { name, quantity, price }, { new: true });
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const billSchema = new mongoose.Schema({
  customer: {
    name: String,
    mobile: String,
    email: String,
  },
  billDate: String,
  order: [
    {
      productName: String,
      price: Number,
      quantity: Number,
      totalPrice: Number,
    },
  ],
  total: Number,
});

const Bill = mongoose.model("Bill", billSchema);

app.post("/save-bill", async (req, res) => {
  try {
    const newBill = new Bill(req.body);
    await newBill.save();

    for (const item of req.body.order) {
      const updatedProduct = await ProductModel.findOneAndUpdate(
        { name: item.productName },
        { $inc: { quantity: -item.quantity } },
        { new: true }
      );
      if (updatedProduct.quantity <= 0) {
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
    const bills = await Bill.find();
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





// require("dotenv").config();
// const express = require("express");
// const mongoose = require("mongoose");
//  const cors = require("cors");
// const bcrypt = require("bcrypt"); 
// const SignupModel = require("./models/adminsignup");
// const ProductModel = require("./models/product");
// const nodemailer = require("nodemailer");


// const app = express();

// const allowedOrigins = [ "https://mimsp.netlify.app"];

// app.use(
//   cors({
//     origin: function (origin, callback) {
//       if (!origin || allowedOrigins.includes(origin)) {
//         callback(null, true);
//       } else {
//         callback(new Error("Not allowed by CORS"));
//       }
//     },
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "DELETE"],
//   })
// );




// app.use(express.json());

// let otpStore = {};



// mongoose.connect(process.env.MONGO_URI)
//     .then(() => console.log("MongoDB Connected"))
//     .catch(err => console.log("MongoDB Connection Error:", err));


// app.get("/run", (req, res) => {
//   res.send("Backend is running!");
// });



// // Transporter
// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// // Password + OTP Step 1: Validate credentials and send OTP
// app.post("/login-with-otp", async (req, res) => {
//   const { email, password } = req.body;
//   const user = await SignupModel.findOne({ email });

//   if (!user || !await bcrypt.compare(password, user.password)) { 
//     return res.json({ status: "invalid" });
//   }

//   // Generate OTP
//   const otp = Math.floor(100000 + Math.random() * 900000).toString();
//   otpStore[email] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 };

//   // Send OTP via Gmail
//   await transporter.sendMail({
//     from: process.env.EMAIL_USER,
//     to: email,
//     subject: "🔐 Your One-Time Password (OTP) for Login",
//     html: `
//     <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
//       <div style="max-width: 500px; margin: auto; background-color: #ffffff; padding: 20px; border-radius: 5px; text-align: center;">
//         <h2 style="color: #333;">Your OTP Code</h2>
//         <p style="color: #555;">Hello,</p>
//         <p style="color: #555;">Use the following One-Time Password to log in:</p>
//         <div style="margin: 20px 0;">
//           <span style="display: inline-block; padding: 10px 20px; font-size: 20px; color: #fff; background-color: #007BFF; border-radius: 4px;">
//             ${otp}
//           </span>
//         </div>
//         <p style="color: #777; font-size: 14px;">This OTP is valid for 5 minutes. Do not share it.</p>
//         <p style="color: #777; font-size: 14px;">If you didn’t request this, ignore this email.</p>
//         <p style="color: #555;">Best,<br>The Security Team</p>
//       </div>
//       <p style="text-align: center; color: #999; font-size: 12px; margin-top: 15px;">
//         © ${new Date().getFullYear()} Your Company
//       </p>
//     </div>
//     `,
//   });

//   res.json({ status: "otp-sent" });
// });

// // Step 2: Verify OTP
// app.post("/verify-login-otp", async (req, res) => {
//   const { email, otp } = req.body;
//   const record = otpStore[email];

//   if (!record) return res.json({ status: "error", message: "OTP not sent" });
//   if (Date.now() > record.expiresAt)
//     return res.json({ status: "expired", message: "OTP expired" });

//   if (record.otp !== otp)
//     return res.json({ status: "invalid", message: "Invalid OTP" });

//   delete otpStore[email];
//   res.json({ status: "success" });
// });

// // Update Admin Info
// app.put("/update-admin", async (req, res) => {
//   const { email, name, password } = req.body;

//   try {
//     const update = { name };
//     if (password) {
//       update.password = await bcrypt.hash(password, 10); 
//     }

//     await SignupModel.findOneAndUpdate({ email }, update);
//     res.json({ status: "success" });
//   } catch (error) {
//     res.status(500).json({ status: "error", message: error.message });
//   }
// });

// app.post("/login", async (req, res) => {
//   const { email, password } = req.body;
//   const user = await SignupModel.findOne({ email });

//   if (user) {
//     if (await bcrypt.compare(password, user.password)) { // Compare hashed password
//       res.json("success");
//     } else {
//       res.json("incorrect password");
//     }
//   } else {
//     res.json("no record exists");
//   }
// });

// app.post("/register", async (req, res) => {
//   try {
//     const { name, email, password } = req.body;
//     const hashedPassword = await bcrypt.hash(password, 10); // Hash password
//     const newUser = await SignupModel.create({ name, email, password: hashedPassword });
//     res.json(newUser);
//   } catch (err) {
//     res.status(500).json(err);
//   }
// });

// // Add Products
// app.post("/add-product", async (req, res) => {
//   try {
//     const { name, quantity, price } = req.body;
//     const newProduct = await ProductModel.create({ name, quantity, price });
//     res.json(newProduct);
//   } catch (error) {
//     res.status(400).json({ error: error.message });
//   }
// });

// // Fetch All Products
// app.get("/products", async (req, res) => {
//   try {
//     const products = await ProductModel.find();
//     res.json(products);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // Delete Product
// app.delete("/delete-product/:id", async (req, res) => {
//   try {
//     await ProductModel.findByIdAndDelete(req.params.id);
//     res.json({ message: "Product deleted successfully" });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // Update Product
// app.put("/update-product/:id", async (req, res) => {
//   try {
//     const { name, quantity, price } = req.body;
//     const updatedProduct = await ProductModel.findByIdAndUpdate(req.params.id, { name, quantity, price }, { new: true });
//     res.json(updatedProduct);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// const billSchema = new mongoose.Schema({
//   customer: {
//     name: String,
//     mobile: String,
//     email: String,
//   },
//   billDate: String,
//   order: [
//     {
//       productName: String,
//       price: Number,
//       quantity: Number,
//       totalPrice: Number,
//     },
//   ],
//   total: Number,
// });

// const Bill = mongoose.model("Bill", billSchema);

// app.post("/save-bill", async (req, res) => {
//   try {
//     const newBill = new Bill(req.body);
//     await newBill.save();

//     for (const item of req.body.order) {
//       const updatedProduct = await ProductModel.findOneAndUpdate(
//         { name: item.productName },
//         { $inc: { quantity: -item.quantity } },
//         { new: true }
//       );
//       if (updatedProduct.quantity <= 0) {
//         await ProductModel.findByIdAndUpdate(updatedProduct._id, { quantity: 0 });
//       }
//     }

//     res.status(201).json({ message: "Bill saved & inventory updated successfully!" });
//   } catch (error) {
//     res.status(500).json({ error: "Error saving bill or updating inventory." });
//   }
// });

// app.get("/bills", async (req, res) => {
//   try {
//     const bills = await Bill.find();
//     res.json(bills);
//   } catch (error) {
//     res.status(500).json({ error: "Failed to fetch bills" });
//   }
// });

// app.get("/top-selling-products", async (req, res) => {
//   try {
//     const bills = await Bill.find();
//     const products = await ProductModel.find();

//     let productSales = {};

//     bills.forEach((bill) => {
//       bill.order.forEach((item) => {
//         if (productSales[item.productName]) {
//           productSales[item.productName] += item.quantity;
//         } else {
//           productSales[item.productName] = item.quantity;
//         }
//       });
//     });

//     const productDetails = products.map((product) => {
//       const soldQuantity = productSales[product.name] || 0;
//       const isOutOfStock = product.quantity <= 0;
//       return {
//         name: product.name,
//         quantitySold: soldQuantity,
//         quantityInStock: product.quantity,
//         isOutOfStock
//       };
//     });

//     const sortedProducts = productDetails
//       .sort((a, b) => b.quantitySold - a.quantitySold);

//     res.json(sortedProducts);
//   } catch (error) {
//     res.status(500).json({ error: "Failed to fetch top-selling products." });
//   }
// });

// const PORT = process.env.PORT || 3001;
// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });