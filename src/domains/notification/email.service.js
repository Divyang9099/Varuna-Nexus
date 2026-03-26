/**
 * Email Service — Nodemailer integration
 *
 * To activate: set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in your .env
 * Works with Gmail, Zoho, Mailgun, SendGrid SMTP, etc.
 *
 * Usage:
 *   const email = require('./email.service');
 *   await email.sendEmail({ to: 'client@example.com', subject: 'Estimate Ready', html: '<p>...</p>' });
 */

const nodemailer = require('nodemailer');
const env = require('../../core/config/env');

const buildTransporter = () => {
  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass,
    },
  });
};

exports.sendEmail = async ({ to, subject, html, text }) => {
  // If SMTP is not configured, log and skip gracefully (dev mode)
  if (!env.smtp.host || !env.smtp.user) {
    console.log(`[Email Stub] To: ${to} | Subject: ${subject}`);
    return { skipped: true };
  }

  const transporter = buildTransporter();

  const info = await transporter.sendMail({
    from: `"${env.smtp.fromName}" <${env.smtp.user}>`,
    to,
    subject,
    html,
    text: text || '',
  });

  console.log(`[Email Sent] MessageId: ${info.messageId} → ${to}`);
  return info;
};

/**
 * Pre-built email templates
 */
exports.sendAllocationNotification = async ({ to, pilotName, projectName, startDate }) => {
  return exports.sendEmail({
    to,
    subject: `New Assignment: ${projectName}`,
    html: `
      <h2>Hi ${pilotName},</h2>
      <p>You have been assigned to project <strong>${projectName}</strong>.</p>
      <p>Start Date: <strong>${startDate}</strong></p>
      <p>Log in to DroneOps to view full details.</p>
    `,
  });
};

exports.sendDeliverableReady = async ({ to, clientName, projectName, downloadUrl }) => {
  return exports.sendEmail({
    to,
    subject: `Deliverable Ready — ${projectName}`,
    html: `
      <h2>Hi ${clientName},</h2>
      <p>Your deliverables for project <strong>${projectName}</strong> are ready.</p>
      <p><a href="${downloadUrl}">Click here to download</a></p>
    `,
  });
};
