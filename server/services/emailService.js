const { SendEmailCommand } = require("@aws-sdk/client-ses");
require("dotenv").config();
const { ses } = require("../config/awsConfig");

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

 
  async sendVerificationCodeEmail(to, code, ttlMin = 10, companyName = "KadagamNext") {
    const subject = "Your KadagamNext Verification Code";
    const text = `
Hello,

Your KadagamNext verification code is: ${code}

It expires in ${ttlMin} minutes.

Thanks,
The KadagamNext Team
    `.trim();

    const html = `
      <p>Hello,</p>
      <p>Your KadagamNext verification code is: <strong>${code}</strong></p>
      <p>It expires in ${ttlMin} minutes.</p>
      <p>Thanks,<br/>The KadagamNext Team</p>
    `.trim();

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

    const html = `
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your company (<strong>${name.replace(' Admin','')}</strong>) has been successfully verified!</p>
      <p>Your Company Code: <strong>${companyId}</strong></p>
      <p>Thank you for joining us,<br/>The KadagamNext Team</p>
    `.trim();

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

    const html = `
      <p>Welcome to <strong>${companyName}</strong>!</p>
      <p>Your login credentials:</p>
      <ul>
        <li><strong>Staff ID:</strong> ${staffId}</li>
        <li><strong>Password:</strong> ${password}</li>
      </ul>
      <p>Please change your password after login.</p>
      <p>Best regards,<br/>${companyName} Team</p>
    `.trim();

    await this.sendEmail(to, subject, text, html, companyName);
  }

  
  async sendLeaveStatusEmail(to, status, leaveDates, adminReason, companyName = "KadagamNext") {
    const statusText = status === "approved" ? "APPROVED ✅" : "REJECTED ❌";
    const subject = `Your Leave Request Has Been ${status.toUpperCase()}`;
    const text = `
Hello,

Your leave request (${leaveDates}) has been ${status.toUpperCase()}.

Reason: ${adminReason}

Check your dashboard.

Best,
${companyName} Team
    `.trim();

    const html = `
      <p>Hello,</p>
      <p>Your leave request for <strong>${leaveDates}</strong> has been <strong>${statusText}</strong>.</p>
      <p><strong>Reason:</strong> ${adminReason}</p>
      <p>Check your dashboard for more info.</p>
      <p>Best regards,<br/>${companyName} Team</p>
    `.trim();

    await this.sendEmail(to, subject, text, html, companyName);
  }

  /**
   * Send a password-reset link.
   */
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

    const html = `
      <p>Click the link below to reset your password:</p>
      <p><a href="${resetLink}" target="_blank">${resetLink}</a></p>
      <p>If you did not request this, please ignore this email.</p>
    `.trim();

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

    const html = `
      <p>Hello,</p>
      <p>The task titled <strong>"${taskTitle}"</strong> is now in <strong>Review</strong>.</p>
      <p>Please login to ${companyName} and approve or reject it.</p>
      <p>Thank you!</p>
    `.trim();

    await this.sendEmail(to, subject, text, html, companyName);
  }

  /**
   * Send a task–approval notification.
   */
  async sendApprovalEmail(task, reason, companyName = "KadagamNext") {
    const subject = `Task Approved: ${task.title}`;
    const text = `
Hello,

Your task "${task.title}" has been approved.

Reason: ${reason}

Best,
${companyName} Team
    `.trim();

    const html = `
      <p>Hello,</p>
      <p>Your task <strong>"${task.title}"</strong> has been <strong style="color:green;">APPROVED</strong>.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>Check your dashboard for details.</p>
      <p>Best regards,<br/>${companyName} Team</p>
    `.trim();

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

    const html = `
      <p>Hello,</p>
      <p>Your task <strong>"${task.title}"</strong> has been <strong style="color:red;">REJECTED</strong>.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      ${attachmentLink ? `<p>Download file: <a href="${attachmentLink}" target="_blank">${attachmentLink}</a></p>` : ''}
      <p>Check your dashboard for updates.</p>
      <p>Best regards,<br/>${companyName} Team</p>
    `.trim();

    await this.sendEmail(task.assignedTo.email, subject, text, html, companyName);
  }
}

module.exports = new EmailService();
