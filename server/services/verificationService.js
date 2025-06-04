// server/services/verificationService.js

const VerificationCode = require('../models/VerificationCode');
const EmailService = require('./emailService');

const VERIFICATION_TTL_MINUTES = 10;

module.exports = {
  /**
   * Generate & store a 4-digit code for this company.
   *
   * @param {string|ObjectId} companyId
   * @returns {Promise<string>} the generated code
   */
  async generateCode(companyId) {
    if (!companyId) {
      throw new Error('companyId is required to generate verification code');
    }

    const code = String(Math.floor(1000 + Math.random() * 9000));
    const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MINUTES * 60 * 1000);

    // Upsert so that if a previous code exists, it's overwritten
    await VerificationCode.findOneAndUpdate(
      { companyId },
      { code, expiresAt },
      { upsert: true, new: true }
    );

    return code;
  },

  /**
   * Verify the code and delete it once used.
   *
   * @param {string|ObjectId} companyId
   * @param {string} code
   * @returns {Promise<boolean>}
   */
  async verifyCode(companyId, code) {
    if (!companyId || !code) {
      throw new Error('companyId and code are required to verify');
    }

    const record = await VerificationCode.findOne({ companyId, code });
    if (!record) {
      throw new Error('Invalid or expired verification code');
    }

    // Code is valid—remove it so it cannot be reused
    await VerificationCode.deleteOne({ _id: record._id });
    return true;
  },

  /**
   * Generate a 4-digit code, store it, and email it to the user.
   *
   * @param {string|ObjectId} companyId
   * @param {string} recipientEmail
   * @returns {Promise<string>} the generated code
   */
  async sendVerificationEmail(companyId, recipientEmail) {
    if (!companyId || !recipientEmail) {
      throw new Error('companyId and recipientEmail are required to send verification email');
    }

    // 1) Generate & persist the code
    const code = await this.generateCode(companyId);

    // 2) Delegate email sending to the centralized EmailService helper
    await EmailService.sendVerificationCodeEmail(
      recipientEmail,
      code,
      VERIFICATION_TTL_MINUTES
    );

    return code;
  }
};
