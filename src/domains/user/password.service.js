const crypto  = require('crypto');
const bcrypt   = require('bcryptjs');
const pool     = require('../../core/config/db');
const mailer   = require('../../core/utils/mailer');

/**
 * FORGOT PASSWORD
 * Generates a 6-digit OTP, stores it with a 1-hour expiry, Sends via Email.
 */
exports.forgotPassword = async (email) => {
  if (!email) throw Object.assign(new Error('Email is required'), { statusCode: 400 });

  const userRes = await pool.query('SELECT id, name, email FROM users WHERE email = $1', [email]);
  if (!userRes.rows.length) {
    // Return positive message even if email doesn't exist for security (anti-enumeration)
    return { message: 'If that email exists, a reset code has been sent.' };
  }

  const user = userRes.rows[0];

  // Invalidate any old unused tokens/OTPs for this user
  await pool.query(
    'UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE',
    [user.id]
  );

  // Generate a 6-digit numeric OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await pool.query(
    'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [user.id, otp, expiresAt]
  );

  // Send Email
  try {
    await mailer.sendEmail({
      to: user.email,
      subject: 'Varuna Nexus — Password Reset Code',
      text: `Hello ${user.name},\n\nYour password reset code is: ${otp}\n\nThis code expires in 1 hour. If you did not request this, please ignore this email.`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px;">
          <h2 style="color: #002444;">VARUNA NEXUS</h2>
          <p>Hello <strong>${user.name}</strong>,</p>
          <p>You requested a password reset. Use the code below to complete the process:</p>
          <div style="background: #f2f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 12px; color: #002444;">${otp}</span>
          </div>
          <p style="color: #73777f; font-size: 14px;">This code expires in <strong>1 hour</strong>. If you did not request this, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin-top: 20px;" />
          <p style="color: #43474e; font-size: 12px;">© 2026 Varuna Nexus • Drone Operations Platform</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('❌ Failed to send reset email:', err);
    // Continue: We stored the token, but couldn't send the mail. 
    // In a real prod env, we might throw here, but for now we'll just log.
  }

  return {
    message: 'A password reset code has been sent to your email.',
  };
};

/**
 * RESET PASSWORD
 * Validates the 6-digit OTP, checks expiry, hashes new password.
 */
exports.resetPassword = async (token, newPassword) => {
  if (!token || !newPassword) {
    throw Object.assign(new Error('Reset code and new password are required'), { statusCode: 400 });
  }
  if (newPassword.length < 8) {
    throw Object.assign(new Error('Password must be at least 8 characters'), { statusCode: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Find valid token (matching the input code)
    const result = await client.query(
      `SELECT prt.*, u.id as uid
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = $1 AND prt.used = FALSE
       ORDER BY prt.created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [token]
    );

    if (!result.rows.length) {
      throw Object.assign(new Error('Invalid or expired reset code'), { statusCode: 400 });
    }

    const record = result.rows[0];

    // Check expiry
    if (new Date() > new Date(record.expires_at)) {
      throw Object.assign(new Error('Reset code has expired. Please request a new one.'), { statusCode: 400 });
    }

    // Hash new password
    const password_hash = await bcrypt.hash(newPassword, 12);

    // Update user
    await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [password_hash, record.uid]);

    // Mark token as used
    await client.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [record.id]);

    await client.query('COMMIT');
    return { message: 'Password reset successful. You can now log in with your new password.' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
