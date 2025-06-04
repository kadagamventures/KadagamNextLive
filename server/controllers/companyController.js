// server/controllers/companyController.js

const CompanyService = require("../services/companyService");
const EmailService = require("../services/emailService");

 /**
  * Step 1: Stub‐register the company (basic info) and return companyId
  * Endpoint: POST /api/company/register
  */
async function registerCompany(req, res) {
  try {
    const name     = req.body.name?.trim();
    const email    = req.body.email?.trim().toLowerCase();
    const password = req.body.password;
    const phone    = req.body.phone?.trim();

    // 1) Validate required fields
    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        error: "Missing required fields: name, email, password, phone."
      });
    }

    // 2) Create basic company record
    const { companyId } = await CompanyService.registerCompany({
      name, email, password, phone
    });

    // 3) Respond with stub companyId
    return res.status(201).json({
      message:   "Company created. Proceed to add details.",
      companyId
    });

  } catch (err) {
    console.error("Company stub registration failed:", err);
    return res.status(500).json({
      error: "Registration failed. Please try again later."
    });
  }
}


 /**
  * Step 2: Complete company details & create tenant‐admin user
  * Endpoint: POST /api/company/details
  */
async function addCompanyDetails(req, res) {
  try {
    const {
      companyId,
      gstin,
      cin,
      pan,
      companyType,
      address,
      adminPassword
    } = req.body;

    // 1) Validate required fields
    if (!companyId || !adminPassword) {
      return res.status(400).json({
        error: "Missing required fields: companyId, adminPassword."
      });
    }

    // 2) Complete the registration & create the admin user
    const { company, adminUser } = await CompanyService.completeRegistrationAndCreateAdmin({
      companyId,
      gstin,
      cin,
      pan,
      companyType,
      address,
      adminPassword
    });

    // 3) Respond with full company + admin info
    return res.status(200).json({
      message:      "Company details saved and admin user created. Verification code sent.",
      company,
      adminStaffId: adminUser.staffId,
      email:        adminUser.email
    });

  } catch (err) {
    console.error("Completing company details failed:", err);
    return res.status(500).json({
      error: "Could not complete registration. Please try again later."
    });
  }
}


module.exports = {
  registerCompany,
  addCompanyDetails,
};
