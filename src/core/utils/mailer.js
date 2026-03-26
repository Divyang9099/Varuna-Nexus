const nodemailer = require('nodemailer');
const env = require('../config/env');

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.port === 465, // true for 465, false for other ports
  auth: {
    user: env.smtp.user,
    pass: env.smtp.pass,
  },
});

exports.sendEmail = async ({ to, subject, text, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"${env.smtp.fromName}" <${env.smtp.user}>`,
      to,
      subject,
      text,
      html,
    });
    console.log('✉️ Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Email failed:', error);
    throw error;
  }
};
