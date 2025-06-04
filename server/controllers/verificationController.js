// server/controllers/verificationController.js

const verificationService = require('../services/verificationService');
const EmailService = require('../services/emailService');
const Company = require('../models/Company');

module.exports = {
  /**
   * POST /api/verify/send
   * Body: { companyId }
   */
  async sendCode(req, res) {
    try {
      const { companyId } = req.body;
      if (!companyId) {
        return res.status(400).json({ error: 'companyId is required' });
      }

      // ensure company exists
      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      // generate & send the 4-digit code
      await verificationService.sendVerificationEmail(
        companyId,
        company.email
      );

      return res.json({ message: 'Verification code sent.' });
    } catch (err) {
      console.error('sendCode error:', err);
      return res.status(500).json({ error: 'Failed to send verification code.' });
    }
  },

  /**
   * POST /api/verify/confirm
   * Body: { companyId, code }
   */
  async confirmCode(req, res) {
    try {
      const { companyId, code } = req.body;
      if (!companyId || !code) {
        return res.status(400).json({ error: 'companyId and code are required' });
      }

      // verify & expire the code
      await verificationService.verifyCode(companyId, code);

      // mark company as verified
      const company = await Company.findByIdAndUpdate(
        companyId,
        { isVerified: true },
        { new: true }
      );
      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      // send final welcome email (fire-and-forget)
      // using centralized EmailService helper
      EmailService.sendWelcomeEmail(
        company.email,
        {
          name: company.name,
          companyId: company._id
        }
      ).catch(err => console.error('Final welcome email failed:', err));

      return res.json({ message: 'Company verified and welcome email sent.' });
    } catch (err) {
      console.error('confirmCode error:', err);
      return res.status(500).json({ error: 'Verification failed.' });
    }
  },
};
