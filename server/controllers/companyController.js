// server/controllers/companyController.js

const CompanyService = require("../services/companyService");
const Company        = require("../models/Company");

/**
 * Step 1: Stub-register the company (basic info) and return companyId
 * Endpoint: POST /api/company/register
 */
async function registerCompany(req, res) {
  try {
    const { name, email, password, phone } = req.body;

    const { companyId } = await CompanyService.registerCompany({
      name:  name.trim(),
      email: email.trim().toLowerCase(),
      password,
      phone: phone.trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Company created. Proceed to add details.",
      data: { companyId },
    });
  } catch (err) {
    console.error("Company stub registration failed:", err);

    if (err.code === "EMAIL_TAKEN") {
      return res.status(409).json({
        success: false,
        message: "Validation failed. Please check your input.",
        errors: [{
          field: err.field || "email",
          message: err.message || "This email is already registered.",
        }],
        existingCompanyId: err.existingCompanyId,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Registration failed. Please try again later.",
    });
  }
}

/**
 * Step 2: Complete company details & create tenant-admin user
 * Endpoint: POST /api/company/details
 *
 * NOTE: OTP generation/email is now handled exclusively via /api/verify/send.
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
      adminPassword,
    } = req.body;

    const { company, adminUser } =
      await CompanyService.completeRegistrationAndCreateAdmin({
        companyId,
        gstin,
        cin,
        pan,
        companyType,
        address,
        adminPassword,
      });

    // Only send the welcome email here; OTP is sent via /api/verify/send
    // (The service already sends the welcome email.)
    return res.status(200).json({
      success: true,
      next: "verify",
      message:
        "Company details saved and admin user created. Please verify via the verification endpoint.",
      data: {
        company,
        adminStaffId: adminUser.staffId,
        email:        adminUser.email,
      },
    });
  } catch (err) {
    console.error("Completing company details failed:", err);

    if (err.code === "COMPANY_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Company not found for details completion.",
      });
    }

    if (err.code === "DETAILS_DUPLICATE") {
      return res.status(200).json({
        success: true,
        next: "verify",
        message: "Details already submitted—OTP has been (re)sent.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Could not complete registration. Please try again later.",
    });
  }
}

/**
 * Step 3: Verify company via OTP/code
 * Endpoint: POST /api/company/verify
 *
 * (Optional: you may route this through your /api/verify/confirm controller instead.)
 */
async function verifyCompany(req, res) {
  try {
    const { companyId, code } = req.body;
    const company = await CompanyService.verifyCompany(companyId, code);

    return res.status(200).json({
      success: true,
      message: "Company verified! You may now log in.",
      data: { companyId: company._id },
    });
  } catch (err) {
    console.error("Company verification failed:", err);

    if (err.code === "INVALID_OTP") {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Verification failed. Please try again later.",
    });
  }
}

/**
 * Step 4: Get current company status (frontend route-guard)
 * Endpoint: GET /api/company/status
 */
async function getCompanyStatus(req, res) {
  try {
    const company = await Company.findById(
      req.user.companyId,
      "isVerified"
    );
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: { isVerified: company.isVerified },
    });
  } catch (err) {
    console.error("Fetching company status failed:", err);
    return res.status(500).json({
      success: false,
      message: "Could not fetch status. Please try again later.",
    });
  }
}

/**
 * Step 5: Resend the OTP without re-submitting details
 * Endpoint: POST /api/company/resend-otp
 */
async function resendOtp(req, res) {
  try {
    const companyId = req.user?.companyId || req.body.companyId;
    const email     = req.user?.email     || req.body.email;

    if (!companyId || !email) {
      return res.status(400).json({
        success: false,
        message: "Missing company ID or email to send OTP.",
      });
    }

    // Delegate JWT generation and email to your /api/verify/send route
    // (Or you could directly call VerificationService here if preferred.)
    return res.status(400).json({
      success: false,
      message: "Use /api/verify/send to get a new code.",
    });
  } catch (err) {
    console.error("Resend OTP failed:", err);
    return res.status(500).json({
      success: false,
      message: "Could not resend code. Please try again later.",
    });
  }
}

module.exports = {
  registerCompany,
  addCompanyDetails,
  verifyCompany,
  getCompanyStatus,
  resendOtp,
};
