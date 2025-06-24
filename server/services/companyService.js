// server/services/companyService.js

const bcrypt = require("bcryptjs");
const Company = require("../models/Company");
const User = require("../models/User");
const EmailService = require("../services/emailService");
const VerificationService = require("../services/verificationService");
const { generateUniqueStaffId } = require("../utils/staffUtils");

/**
 * Step 1: Create the company stub (basic info) and send back companyId
 */
async function registerCompany(payload) {
  const { name, email, password, phone } = payload;

  // Prevent duplicates
  const [existingCompany, existingUser] = await Promise.all([
    Company.findOne({ email, isDeleted: false }),
    User.findOne({ email, isDeleted: false }),
  ]);

  if (existingCompany || existingUser) {
    const error = new Error("A company or user with this email already exists.");
    error.code = "EMAIL_TAKEN";
    error.field = "email";
    // Include the existing company ID so controller can resend OTP
    error.existingCompanyId = existingCompany
      ? existingCompany._id
      : existingUser.companyId;
    throw error;
  }

  // Create basic company record (details to follow in next step)
  const company = await Company.create({
    name,
    email,
    phone,
    subscription: {
      planId: null,
      status: "pending",
      startDate: Date.now(),
      nextBillingDate: null,
      lastPaymentAmount: 0,
      paymentHistory: [],
    },
    trustLevel: "new",
    isVerified: false,    // ← explicitly mark as un-verified until OTP step
    isDeleted: false,
  });

  return { companyId: company._id };
}

/**
 * Step 2: Fill in the additional company details (GSTIN, CIN, PAN, etc.),
 *         then create the tenant-admin user, send welcome + verification emails
 */
async function completeRegistrationAndCreateAdmin(payload) {
  const {
    companyId,
    gstin,
    cin,
    pan,
    companyType,
    address,
    adminPassword,
  } = payload;

  try {
    // Update company details
    const company = await Company.findByIdAndUpdate(
      companyId,
      { gstin, cin, pan, companyType, address },
      { new: true, runValidators: true }
    );

    if (!company) {
      const error = new Error("Company not found for details completion.");
      error.code = "COMPANY_NOT_FOUND";
      throw error;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    const staffId = await generateUniqueStaffId();
    const adminUser = await User.create({
      name: `${company.name} Admin`,
      email: company.email,
      password: hashedPassword,
      role: "admin",
      companyId: company._id,
      staffId,
      permissions: ["manage_project", "manage_task", "manage_staff"],
      isActive: true,
      isDeleted: false,
    });

    // Send welcome email (fire-and-forget)
    const welcomeSubject = "Welcome to KadagamNext";
    const welcomeText = `
Hello ${adminUser.name},

Your account is ready!
 • Company Code: ${company._id}
 • Your Staff ID:   ${adminUser.staffId}

Next, please verify your email with the code we'll send you.
Thanks,
KadagamNext Team`.trim();

    const welcomeHtml = `
<p>Hello <strong>${adminUser.name}</strong>,</p>
<p>Your tenant account has been created.</p>
<ul>
  <li><strong>Company Code:</strong> ${company._id}</li>
  <li><strong>Staff ID:</strong> ${adminUser.staffId}</li>
</ul>
<p>Please verify your email using the verification code you will receive shortly.</p>
<p>Thank you,<br/>KadagamNext Team</p>
`.trim();

    EmailService.sendEmail(
      adminUser.email,
      welcomeSubject,
      welcomeText,
      welcomeHtml,
      `${company.name} Admin`
    ).catch((err) => console.error("Welcome email error:", err));

    // Send verification code (fire-and-forget)
    VerificationService.generateCode(company._id)
      .then(() =>
        VerificationService.sendVerificationEmail(company._id, adminUser.email)
      )
      .catch((err) => console.error("Verification email error:", err));

    return { company, adminUser };

  } catch (err) {
    // Handle duplicate details submission
    if (err.code === 11000) {
      const duplicateErr = new Error(
        "Company details already submitted; pending verification."
      );
      duplicateErr.code = "DETAILS_DUPLICATE";
      throw duplicateErr;
    }
    // Propagate known service errors or unexpected ones
    throw err;
  }
}

/**
 * Step 3 (optional): Verify the company once OTP/code is confirmed
 */
async function verifyCompany(companyId, code) {
  // Assume VerificationService.verifyCode returns a boolean
  const isValid = await VerificationService.verifyCode(companyId, code);
  if (!isValid) {
    const error = new Error("Invalid or expired verification code.");
    error.code = "INVALID_OTP";
    throw error;
  }

  // Flip the flag to verified
  const company = await Company.findByIdAndUpdate(
    companyId,
    { isVerified: true },
    { new: true }
  );
  return company;
}

module.exports = {
  registerCompany,
  completeRegistrationAndCreateAdmin,
  verifyCompany,   // export the verify method
};
