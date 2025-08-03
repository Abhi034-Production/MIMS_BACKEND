const mongoose = require("mongoose");

const businessProfileSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, unique: true },
  businessName: { type: String, required: true },
  businessMobile: { type: String, required: true },
  businessAddress: { type: String, required: true },
  businessEmail: { type: String, required: true },
  businessLogo: { type: String }, // store as base64 or URL
  businessStamp: { type: String }, // store as base64 or URL
  businessCategory: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("BusinessProfile", businessProfileSchema);
