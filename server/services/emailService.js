// server/services/emailService.js
require("dotenv").config();
const { SendEmailCommand, SendRawEmailCommand } = require("@aws-sdk/client-ses");
const MailComposer = require("nodemailer/lib/mail-composer");
const { ses } = require("../config/awsConfig");

function getBaseTemplate({ companyName, contentHtml, footerHtml }) {
  return `
    <div style="max-width:600px;margin:32px auto;padding:32px 24px;background:#f7fafd;border-radius:12px;border:1px solid #eee;font-family:'Segoe UI',Arial,sans-serif;">
      <div style="text-align:center;margin-bottom:20px;">
        <h2 style="color:#015cad;margin:0 0 8px 0;">${companyName} Admin</h2>
      </div>
      <div style="background:#fff;padding:24px 18px;border-radius:8px;box-shadow:0 2px 12px #e3e9f5;">
        ${contentHtml}
      </div>
      <div style="margin-top:32px;font-size:13px;color:#9b9b9b;text-align:center;">
        ${footerHtml || `&copy; ${new Date().getFullYear()} ${companyName} · Powered by KadagamVentures`}
      </div>
    </div>
  `;
}

class EmailService {
  async sendEmail(to, subject, text, html = null, companyName = "KadagamNext") {
    if (!to || !subject || (!text && !html)) {
      throw new Error("Missing parameters for sending email.");
    }

    const sourceEmail = process.env.AWS_SES_SENDER_EMAIL;
    if (!sourceEmail || !sourceEmail.includes("@")) {
      console.warn("⚠️ Invalid AWS_SES_SENDER_EMAIL configured.");
      return;
    }

    const fromFormatted = `"${companyName} Admin" <${sourceEmail}>`;
    const params = {
      Source: fromFormatted,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject },
        Body: html
          ? { Html: { Data: html } }
          : { Text: { Data: text } },
      },
    };

    try {
      const command = new SendEmailCommand(params);
      const response = await ses.send(command);
      console.log(`✅ Email sent to ${to} (MessageId: ${response.MessageId})`);
    } catch (err) {
      console.error(`❌ Email to ${to} failed: ${err.message}`, err);
      throw new Error("Failed to send email via AWS SES");
    }
  }

  async sendEmailWithAttachment({ to, subject, text = "", html, attachments }) {
    if (!to || !subject || (!text && !html) || !Array.isArray(attachments) || attachments.length === 0) {
      throw new Error("Missing parameters for sendEmailWithAttachment.");
    }

    const sourceEmail = process.env.AWS_SES_SENDER_EMAIL;
    if (!sourceEmail || !sourceEmail.includes("@")) {
      console.warn("⚠️ Invalid AWS_SES_SENDER_EMAIL configured.");
      return;
    }

    const mail = new MailComposer({
      from: sourceEmail,
      to,
      subject,
      text,
      html,
      attachments,
    });

    const messageBuffer = await new Promise((resolve, reject) => {
      mail.compile().build((err, msg) => {
        if (err) reject(err);
        else resolve(msg);
      });
    });

    const rawParams = {
      RawMessage: { Data: messageBuffer },
      Source: sourceEmail,
      Destinations: [to],
    };

    try {
      const command = new SendRawEmailCommand(rawParams);
      const response = await ses.send(command);
      console.log(`✅ Email with attachment sent to ${to} (MessageId: ${response.MessageId})`);
    } catch (err) {
      console.error(`❌ sendEmailWithAttachment failed: ${err.message}`, err);
      throw new Error("Failed to send raw email via AWS SES");
    }
  }

  async sendVerificationCodeEmail(to, code, ttlMin = 10, companyName = "KadagamNext") {
    const subject = "Your KadagamNext Verification Code";
    const text = `
Hello,

Your KadagamNext verification code is: ${code}

It expires in ${ttlMin} minutes.

Thanks,
The KadagamNext Team
    `.trim();

    const contentHtml = `
      <h3 style="margin:0 0 16px 0;color:#176ee6;">Verify Your Email</h3>
      <p style="font-size:16px;">Your KadagamNext verification code is:</p>
      <div style="font-size:28px;letter-spacing:12px;font-weight:600;color:#015cad;padding:16px 0;">${code}</div>
      <p style="color:#777;">This code expires in <b>${ttlMin} minutes</b>.</p>
      <p style="margin-top:20px;color:#888;font-size:13px;">If you did not request this, you can safely ignore this email.</p>
    `;

    const html = getBaseTemplate({
      companyName,
      contentHtml,
    });

    await this.sendEmail(to, subject, text, html, companyName);
  }

  async sendWelcomeEmail(to, { name, companyId }, companyName = "KadagamNext") {
    const subject = "Your KadagamNext account is now active";
    const text = `
Hello ${name},

Your company (${name.replace(' Admin','')}) has been successfully verified!
You can now log in and start using KadagamNext.

Your Company Code: ${companyId}

Thank you for joining us,
The KadagamNext Team
    `.trim();

    const contentHtml = `
      <h3 style="margin:0 0 12px 0;font-size:20px;color:#176ee6;">Welcome to ${companyName}!</h3>
      <p style="font-size:16px;color:#222;">Hello <b>${name}</b>,</p>
      <p>Your company (<b>${name.replace(' Admin','')}</b>) has been <span style="color:green;font-weight:600;">successfully verified</span>!</p>
      <p><b>Your Company Code:</b> <span style="background:#eef6fb;padding:2px 8px;border-radius:4px;font-size:17px;letter-spacing:2px;color:#015cad;">${companyId}</span></p>
      <a href="${process.env.FRONTEND_URL}/admin/login" style="display:inline-block;margin-top:16px;background:#015cad;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:500;font-size:15px;">Login to KadagamNext</a>
      <p style="margin-top:32px;font-size:15px;color:#777;">Thank you for joining us,<br><b>${companyName} Team</b></p>
    `;

    const html = getBaseTemplate({
      companyName,
      contentHtml,
    });

    await this.sendEmail(to, subject, text, html, companyName);
  }

  async sendStaffCredentialsEmail(to, staffId, password, companyName = "KadagamNext") {
    const subject = "Your KadagamNext Staff Credentials";
    const text = `
Welcome to ${companyName}!

Staff ID: ${staffId}
Password: ${password}

Please change your password after login.

Best,
${companyName} Team
    `.trim();

    const contentHtml = `
      <h3 style="margin:0 0 16px 0;color:#176ee6;">Welcome to ${companyName}!</h3>
      <p style="font-size:16px;">Your login credentials:</p>
      <table style="margin:12px 0 20px 0;">
        <tr><td style="font-weight:bold;">Staff ID:</td><td style="padding-left:8px;">${staffId}</td></tr>
        <tr><td style="font-weight:bold;">Password:</td><td style="padding-left:8px;">${password}</td></tr>
      </table>
      <p style="color:#D36F2C;font-size:14px;">Please change your password after login.</p>
      <p style="margin-top:28px;color:#888;font-size:13px;">Best regards,<br/>${companyName} Team</p>
    `;

    const html = getBaseTemplate({
      companyName,
      contentHtml,
    });

    await this.sendEmail(to, subject, text, html, companyName);
  }

  async sendLeaveStatusEmail(to, status, leaveDates, adminReason, companyName = "KadagamNext") {
    const statusText = status === "approved"
      ? '<span style="color:green;font-weight:bold;">APPROVED ✅</span>'
      : '<span style="color:red;font-weight:bold;">REJECTED ❌</span>';
    const subject = `Your Leave Request Has Been ${status.toUpperCase()}`;
    const text = `
Hello,

Your leave request (${leaveDates}) has been ${status.toUpperCase()}.

Reason: ${adminReason}

Check your dashboard.

Best,
${companyName} Team
    `.trim();

    const contentHtml = `
      <h3 style="margin:0 0 16px 0;">Leave Status Update</h3>
      <p>Your leave request for <b>${leaveDates}</b> has been ${statusText}.</p>
      <p><b>Reason:</b> ${adminReason}</p>
      <a href="${process.env.FRONTEND_URL}/staff/dashboard" style="display:inline-block;margin:20px 0 0 0;background:#015cad;color:#fff;text-decoration:none;padding:10px 22px;border-radius:5px;font-weight:500;font-size:15px;">View Dashboard</a>
      <p style="margin-top:28px;color:#888;font-size:13px;">Best regards,<br/>${companyName} Team</p>
    `;

    const html = getBaseTemplate({
      companyName,
      contentHtml,
    });

    await this.sendEmail(to, subject, text, html, companyName);
  }

  async sendPasswordResetEmail(to, resetToken, companyName = "KadagamNext") {
    if (!process.env.FRONTEND_URL) {
      throw new Error("FRONTEND_URL is not set in your .env");
    }
    const resetLink = `${process.env.FRONTEND_URL.replace(/\/$/, "")}/reset-password/${encodeURIComponent(resetToken)}`;

    const subject = "Reset Your Password";
    const text = `
Click the link below to reset your password:

${resetLink}

If you did not request this, please ignore this email.
    `.trim();

    const contentHtml = `
      <h3 style="margin:0 0 16px 0;color:#176ee6;">Password Reset Requested</h3>
      <p>Click the button below to reset your password:</p>
      <a href="${resetLink}" target="_blank" style="display:inline-block;margin:18px 0 18px 0;background:#176ee6;color:#fff;text-decoration:none;padding:11px 25px;border-radius:5px;font-weight:500;font-size:16px;">Reset Password</a>
      <p style="color:#777;margin:18px 0 0 0;">If you did not request this, please ignore this email.</p>
    `;

    const html = getBaseTemplate({
      companyName,
      contentHtml,
    });

    await this.sendEmail(to, subject, text, html, companyName);
  }

  async sendReviewNotificationMail(to, taskTitle, companyName = "KadagamNext") {
    const subject = "Task Under Review";
    const text = `
Hello,

The task titled "${taskTitle}" is now in Review.

Please login and approve or reject it.

Thank you!
    `.trim();

    const contentHtml = `
      <h3 style="margin:0 0 16px 0;">Task Under Review</h3>
      <p>The task titled <b>"${taskTitle}"</b> is now in <b style="color:#f9a825;">Review</b>.</p>
      <a href="${process.env.FRONTEND_URL}/admin/dashboard" style="display:inline-block;margin:20px 0 0 0;background:#015cad;color:#fff;text-decoration:none;padding:10px 22px;border-radius:5px;font-weight:500;font-size:15px;">Login to Dashboard</a>
      <p style="margin-top:28px;color:#888;font-size:13px;">Thank you!</p>
    `;

    const html = getBaseTemplate({
      companyName,
      contentHtml,
    });

    await this.sendEmail(to, subject, text, html, companyName);
  }

  async sendApprovalEmail(task, reason, companyName = "KadagamNext") {
    const subject = `Task Approved: ${task.title}`;
    const text = `
Hello,

Your task "${task.title}" has been approved.

Reason: ${reason}

Best,
${companyName} Team
    `.trim();

    const contentHtml = `
      <h3 style="margin:0 0 16px 0;color:green;">Task Approved</h3>
      <p>Your task <b>"${task.title}"</b> has been <span style="color:green;font-weight:600;">APPROVED</span>.</p>
      <p><b>Reason:</b> ${reason}</p>
      <a href="${process.env.FRONTEND_URL}/staff/dashboard" style="display:inline-block;margin:20px 0 0 0;background:#015cad;color:#fff;text-decoration:none;padding:10px 22px;border-radius:5px;font-weight:500;font-size:15px;">View Dashboard</a>
      <p style="margin-top:28px;color:#888;font-size:13px;">Best regards,<br/>${companyName} Team</p>
    `;

    const html = getBaseTemplate({
      companyName,
      contentHtml,
    });

    await this.sendEmail(task.assignedTo.email, subject, text, html, companyName);
  }

  async sendRejectionEmail(task, reason, attachmentLink = null, companyName = "KadagamNext") {
    const subject = `Task Rejected: ${task.title}`;
    const textLines = [
      `Hello,`,
      ``,
      `Your task "${task.title}" has been rejected.`,
      ``,
      `Reason: ${reason}`,
      attachmentLink ? `Attachment: ${attachmentLink}` : null,
      ``,
      `Best,`,
      `${companyName} Team`
    ].filter(Boolean);
    const text = textLines.join("\n");

    const contentHtml = `
      <h3 style="margin:0 0 16px 0;color:red;">Task Rejected</h3>
      <p>Your task <b>"${task.title}"</b> has been <span style="color:red;font-weight:600;">REJECTED</span>.</p>
      <p><b>Reason:</b> ${reason}</p>
      ${
        attachmentLink
          ? `<p>Download file: <a href="${attachmentLink}" target="_blank" style="color:#015cad;">${attachmentLink}</a></p>`
          : ""
      }
      <a href="${process.env.FRONTEND_URL}/staff/dashboard" style="display:inline-block;margin:20px 0 0 0;background:#015cad;color:#fff;text-decoration:none;padding:10px 22px;border-radius:5px;font-weight:500;font-size:15px;">View Dashboard</a>
      <p style="margin-top:28px;color:#888;font-size:13px;">Best regards,<br/>${companyName} Team</p>
    `;

    const html = getBaseTemplate({
      companyName,
      contentHtml,
    });

    await this.sendEmail(task.assignedTo.email, subject, text, html, companyName);
  }
}

module.exports = new EmailService();
