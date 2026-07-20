const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  return transporter;
};

const sendOtpEmail = async (toEmail, otp) => {
  const subject = 'EPTS Password Reset OTP';
  const text = `Your One-Time Password (OTP) to reset your EPTS account password is: ${otp}\n\nThis OTP is valid for 10 minutes. If you did not request a password reset, please ignore this email.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #0369a1;">EPTS Password Reset</h2>
      <p>Your One-Time Password (OTP) to reset your account password is:</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #0f172a;">${otp}</p>
      <p>This OTP is valid for <strong>10 minutes</strong>. If you did not request a password reset, please ignore this email.</p>
    </div>
  `;

  const t = getTransporter();

  if (!t) {
    // Dev fallback: SMTP not configured, log the OTP instead of sending an email.
    console.log(`[emailService] SMTP not configured. OTP for ${toEmail}: ${otp}`);
    return { simulated: true };
  }

  return t.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject,
    text,
    html
  });
};

module.exports = { sendOtpEmail };
