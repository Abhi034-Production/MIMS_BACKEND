 const mongoose = require("mongoose");
// import mongoose from 'mongoose'

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  email: { type: String, required: false }, // business email
});

const ProductModel = mongoose.model("Product", ProductSchema);
module.exports = ProductModel;
