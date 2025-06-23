const CompanyService = require("../services/companyService");
const EmailService = require("../services/emailService");
const VerificationService = require("../services/verificationService");

/**
 * Step 1: Stub-register the company (basic info) and return companyId
 * Endpoint: POST /api/company/register
 */
async function registerCompany(req, res) {
  try {
    const { name, email, password, phone } = req.body;

    // Delegate to service; throws on duplicate email
    const { companyId } = await CompanyService.registerCompany({
      name: name.trim(),
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
        errors: [
          {
            field: err.field || "email",
            message: err.message || "This email is already registered.",
          },
        ],
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

    // Fire-and-forget welcome email
    EmailService.sendEmail(
      adminUser.email,
      "Welcome to KadagamNext",
      `
Hello ${adminUser.name},

Your account is ready!
 • Company Code: ${company._id}
 • Your Staff ID: ${adminUser.staffId}

Next, please verify your email with the code we'll send you.
Thanks,
KadagamNext Team`.trim(),
      `
<p>Hello <strong>${adminUser.name}</strong>,</p>
<p>Your tenant account has been created.</p>
<ul>
  <li><strong>Company Code:</strong> ${company._id}</li>
  <li><strong>Staff ID:</strong> ${adminUser.staffId}</li>
</ul>
<p>Please verify your email using the verification code you will receive shortly.</p>
<p>Thank you,<br/>KadagamNext Team</p>`.trim(),
      `${company.name} Admin`
    ).catch((e) => console.error("Welcome email error:", e));

    // Fire-and-forget verification code
    VerificationService.generateCode(company._id)
      .then(() =>
        VerificationService.sendVerificationEmail(company._id, adminUser.email)
      )
      .catch((e) => console.error("Verification email error:", e));

    return res.status(200).json({
      success: true,
      message:
        "Company details saved and admin user created. Verification code sent.",
      data: {
        company,
        adminStaffId: adminUser.staffId,
        email: adminUser.email,
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

    return res.status(500).json({
      success: false,
      message: "Could not complete registration. Please try again later.",
    });
  }
}

module.exports = {
  registerCompany,
  addCompanyDetails,
};
