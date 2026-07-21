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

const sendWelcomeEmail = async (toEmail, firstName, employeeCode, role) => {
  const subject = 'Welcome to EPTS - Account Created Successfully';
  const roleTitle = role === 'admin' ? 'Administrator' : role === 'hr' ? 'HR Manager' : role === 'manager' ? 'Reporting Manager' : role === 'executive' ? 'CEO / Management' : 'Employee';
  
  const text = `Hello ${firstName},\n\nWelcome to EPTS (Employee Performance Tracking System)!\nYour account has been created successfully.\n\nAccount Details:\n- Employee Code: ${employeeCode}\n- Registered Email: ${toEmail}\n- System Role: ${roleTitle}\n\nYou can now log in to the EPTS portal.\n\nBest regards,\nEPTS Team`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #0284c7; margin: 0;">Welcome to EPTS!</h2>
        <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Employee Performance Tracking System</p>
      </div>
      
      <p style="color: #334155; font-size: 15px;">Hello <strong>${firstName}</strong>,</p>
      <p style="color: #334155; font-size: 14px; line-height: 1.5;">Your EPTS account has been created successfully. Below are your account details:</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 4px 0; color: #1e293b; font-size: 13px;"><strong>Employee Code:</strong> ${employeeCode}</p>
        <p style="margin: 4px 0; color: #1e293b; font-size: 13px;"><strong>Registered Email:</strong> ${toEmail}</p>
        <p style="margin: 4px 0; color: #1e293b; font-size: 13px;"><strong>System Role:</strong> ${roleTitle}</p>
      </div>

      <p style="color: #334155; font-size: 14px;">You can now log in to access your performance evaluations, skill matrix, and dashboards.</p>

      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; text-align: center; color: #94a3b8; font-size: 12px;">
        <p style="margin: 0;">EPTS System Notification • Please do not reply directly to this email.</p>
      </div>
    </div>
  `;

  const t = getTransporter();

  if (!t) {
    console.log(`[emailService] SMTP not configured. Welcome email simulated for ${toEmail} (Code: ${employeeCode}, Role: ${roleTitle})`);
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

const sendReviewCycleStartedEmail = async (toEmail, firstName, reviewMonth, endDate) => {
  const subject = `New Performance Review Cycle Started (${reviewMonth})`;
  const text = `Hello ${firstName},\n\nA new performance review cycle for ${reviewMonth} has officially started.\nPlease complete and submit your self-assessment in the EPTS portal before ${new Date(endDate).toLocaleDateString()}.\n\nBest regards,\nEPTS Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; background-color: #ffffff;">
      <h2 style="color: #0284c7; margin: 0 0 8px 0;">New Performance Review Cycle Started</h2>
      <p style="color: #64748b; font-size: 14px; margin-top: 0;">Review Month: <strong>${reviewMonth}</strong></p>
      <p style="color: #334155; font-size: 14px;">Hello <strong>${firstName}</strong>,</p>
      <p style="color: #334155; font-size: 14px; line-height: 1.5;">The performance review cycle for <strong>${reviewMonth}</strong> is now active. Please log in to complete your self-assessment before the deadline.</p>
      <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; margin: 16px 0;">
        <p style="margin: 0; color: #1e293b; font-size: 13px;"><strong>Self-Assessment Deadline:</strong> ${new Date(endDate).toLocaleDateString()}</p>
      </div>
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; text-align: center; color: #94a3b8; font-size: 12px;">
        <p style="margin: 0;">EPTS System Notification • Please do not reply directly to this email.</p>
      </div>
    </div>
  `;

  const t = getTransporter();
  if (!t) {
    console.log(`[emailService] SMTP not configured. Review cycle email simulated for ${toEmail}`);
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

const sendSelfAssessmentSubmittedEmail = async (managerEmail, managerName, employeeName, reviewMonth) => {
  const subject = `Self-Assessment Submitted: ${employeeName} (${reviewMonth})`;
  const text = `Hello ${managerName},\n\n${employeeName} has submitted their self-assessment for the ${reviewMonth} review cycle.\nPlease log in to EPTS to conduct and submit your manager review.\n\nBest regards,\nEPTS Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; background-color: #ffffff;">
      <h2 style="color: #d97706; margin: 0 0 8px 0;">Self-Assessment Submitted</h2>
      <p style="color: #334155; font-size: 14px;">Hello <strong>${managerName}</strong>,</p>
      <p style="color: #334155; font-size: 14px; line-height: 1.5;"><strong>${employeeName}</strong> has completed and submitted their self-assessment for the <strong>${reviewMonth}</strong> performance review cycle.</p>
      <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; margin: 16px 0;">
        <p style="margin: 0; color: #92400e; font-size: 13px;">Action Required: Please log in to your Reporting Manager Workspace to evaluate ${employeeName}.</p>
      </div>
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; text-align: center; color: #94a3b8; font-size: 12px;">
        <p style="margin: 0;">EPTS System Notification • Please do not reply directly to this email.</p>
      </div>
    </div>
  `;

  const t = getTransporter();
  if (!t) {
    console.log(`[emailService] SMTP not configured. Self-assessment submission email simulated for manager ${managerEmail}`);
    return { simulated: true };
  }

  return t.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: managerEmail,
    subject,
    text,
    html
  });
};

const sendFinalReportGeneratedEmail = async (employeeEmail, employeeName, reviewMonth, finalScore, rating) => {
  const subject = `Performance Evaluation Summary Published (${reviewMonth})`;
  const text = `Hello ${employeeName},\n\nYour performance review score for ${reviewMonth} has been computed.\nFinal Rating: ${finalScore} / 5.0 (${rating})\n\nYou can log in to EPTS to view your complete performance report.\n\nBest regards,\nEPTS Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; background-color: #ffffff;">
      <h2 style="color: #059669; margin: 0 0 8px 0;">Performance Report Published</h2>
      <p style="color: #334155; font-size: 14px;">Hello <strong>${employeeName}</strong>,</p>
      <p style="color: #334155; font-size: 14px; line-height: 1.5;">Your aggregate performance score for <strong>${reviewMonth}</strong> has been computed.</p>
      <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;">
        <p style="margin: 0; color: #047857; font-size: 12px; font-weight: bold; text-transform: uppercase;">Final Calculated Rating</p>
        <p style="margin: 4px 0 0 0; color: #065f46; font-size: 24px; font-weight: bold;">${finalScore} / 5.0</p>
        <p style="margin: 2px 0 0 0; color: #047857; font-size: 13px; font-weight: bold;">${rating}</p>
      </div>
      <p style="color: #334155; font-size: 13px;">Log in to the portal to view detailed category breakdowns and AI feedback recommendations.</p>
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; text-align: center; color: #94a3b8; font-size: 12px;">
        <p style="margin: 0;">EPTS System Notification • Please do not reply directly to this email.</p>
      </div>
    </div>
  `;

  const t = getTransporter();
  if (!t) {
    console.log(`[emailService] SMTP not configured. Final report email simulated for ${employeeEmail}`);
    return { simulated: true };
  }

  return t.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: employeeEmail,
    subject,
    text,
    html
  });
};

module.exports = {
  sendOtpEmail,
  sendWelcomeEmail,
  sendReviewCycleStartedEmail,
  sendSelfAssessmentSubmittedEmail,
  sendFinalReportGeneratedEmail
};

