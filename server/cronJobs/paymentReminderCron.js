// server/cronJobs/paymentReminderCron.js

const cron = require('node-cron');
const Company = require('../models/Company');
const emailService = require('../services/emailService');

// Runs every day at 08:00 AM IST
cron.schedule('0 8 * * *', async () => {
  try {
    const today = new Date();
    const reminderDate = new Date(today);
    reminderDate.setDate(reminderDate.getDate() + 3);
    // normalize to midnight–end of day
    const start = new Date(reminderDate.setHours(0, 0, 0, 0));
    const end = new Date(reminderDate.setHours(23, 59, 59, 999));

    const companies = await Company.find({
      isDeleted: false,
      'subscription.status': 'active',
      'subscription.nextBillingDate': { $gte: start, $lte: end }
    }).lean();

    for (const company of companies) {
      const nextDate = new Date(company.subscription.nextBillingDate)
        .toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });

      const subject = `Reminder: Your subscription renews on ${nextDate}`;
      const html = `
        <p>Hi ${company.name},</p>
        <p>This is a friendly reminder that your KadagamNext subscription will renew on <strong>${nextDate}</strong>.</p>
        <p>Please ensure your payment method is up to date to avoid any interruption of service.</p>
        <p>Thank you for being with us!</p>
        <p>— The KadagamNext Team</p>
      `;

      // sendEmail(to, subject, text, html, senderName)
      await emailService.sendEmail(
        company.email,
        subject,
        `Your subscription renews on ${nextDate}. Please update your payment method if needed.`,
        html,
        'KadagamNext'
      );
    }
  } catch (err) {
    console.error('⏰ [PaymentReminderCron] error sending reminders:', err);
  }
}, {
  timezone: 'Asia/Kolkata'
});
