
const express = require("express");
const router = express.Router();
const companyController = require("../controllers/companyController");


router.post("/register", companyController.registerCompany);


router.post("/details", companyController.addCompanyDetails);

module.exports = router;
