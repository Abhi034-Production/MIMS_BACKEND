
const mongoose = require('mongoose')


const billSchema = new mongoose.Schema({
    customer: {
      name: String,
      mobile: String,
      email: String,
    },
    billDate: String, // Storing datetime as a string
    order: [
      {
        productName: String,
        price: Number,
        quantity: Number,
        totalPrice: Number,
        email: String, // business email for each product (for filtering)
      },
    ],
    total: Number, // Grand total of the bill
    businessEmail: String, // business email for the bill
  });
  
  // Create Model
  const Bill = mongoose.model("Bill", billSchema);
  module.exports = Bill