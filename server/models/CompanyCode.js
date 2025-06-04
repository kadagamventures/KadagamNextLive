// models/CompanyCode.js
const mongoose = require("mongoose");

const companyCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,         // ensure no two tenants share the same 6-digit
    match: [/^[0-9]{6}$/, "Code must be exactly 6 digits"],
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  }
}, { timestamps: true });

module.exports = mongoose.model("CompanyCode", companyCodeSchema);
