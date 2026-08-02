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

const getEmailWrapper = (title, contentHtml) => {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; padding: 32px 16px; margin: 0; min-height: 100%; width: 100%;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02); border: 1px solid #e2e8f0; border-collapse: collapse;">
        <!-- Header -->
        <tr>
          <td style="background-color: #0f172a; padding: 24px; text-align: center; border-bottom: 3px solid #0ea5e9;">
            <span style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: 2px;">PerfoNext</span>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;">Enterprise Performance Platform</div>
          </td>
        </tr>
        
        <!-- Title Banner -->
        ${title ? `
        <tr>
          <td style="padding: 32px 32px 0 32px; text-align: center;">
            <h2 style="font-size: 20px; font-weight: 700; color: #1e293b; margin: 0;">${title}</h2>
          </td>
        </tr>
        ` : ''}

        <!-- Content Body -->
        <tr>
          <td style="padding: 32px; color: #334155; font-size: 14px; line-height: 1.6;">
            ${contentHtml}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 11px; line-height: 1.5;">
            <p style="margin: 0; font-weight: 600; color: #64748b;">PerfoNext Corporation</p>
            <p style="margin: 4px 0 0 0;">This is an automated system notification. Please do not reply directly to this email.</p>
          </td>
        </tr>
      </table>
    </div>
  `;
};

const sendOtpEmail = async (toEmail, otp) => {
  const subject = 'PerfoNext Password Reset OTP';
  const text = `Your One-Time Password (OTP) to reset your PerfoNext account password is: ${otp}\n\nThis OTP is valid for 10 minutes. If you did not request a password reset, please ignore this email.`;
  const html = getEmailWrapper(
    'Password Reset Request',
    `
      <p style="margin-top: 0;">Hello,</p>
      <p>We received a request to reset the password for your PerfoNext account. Use the One-Time Password (OTP) below to proceed:</p>
      <div style="text-align: center; margin: 32px 0;">
        <div style="display: inline-block; background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 16px 32px; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #0ea5e9;">
          ${otp}
        </div>
      </div>
      <p>This code is valid for <strong>10 minutes</strong>. If you did not request a password reset, you can safely ignore this email.</p>
    `
  );

  const t = getTransporter();

  if (!t) {
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

const sendWelcomeEmail = async (toEmail, firstName, employeeCode, role, password) => {
  const subject = 'Welcome to PerfoNext - Account Created Successfully';
  const roleTitle = role === 'admin' ? 'Administrator' : role === 'hr' ? 'HR Manager' : role === 'manager' ? 'Reporting Manager' : role === 'executive' ? 'CEO / Management' : 'Employee';
  
  const text = `Hello ${firstName},\n\nWelcome to PerfoNext (Enterprise Performance Platform)!\nYour account has been created successfully.\n\nAccount Details:\n- Employee Code: ${employeeCode}\n- Registered Email: ${toEmail}\n- Temporary Password: ${password || 'PerfoNext2026!'}\n- System Role: ${roleTitle}\n\nYou can now log in to the PerfoNext portal.\n\nBest regards,\nPerfoNext Team`;
  
  const html = getEmailWrapper(
    'Welcome to PerfoNext!',
    `
      <p style="margin-top: 0;">Hello <strong>${firstName}</strong>,</p>
      <p>Your account on the PerfoNext platform has been created successfully. Below are your login and configuration details:</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 18px; margin: 24px 0;">
        <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <td width="35%" style="color: #64748b; font-weight: 600; font-size: 13px; padding: 4px 0;">Employee Code:</td>
            <td style="color: #1e293b; font-weight: bold; font-size: 13px; padding: 4px 0;">${employeeCode}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600; font-size: 13px; padding: 4px 0;">Registered Email:</td>
            <td style="color: #1e293b; font-weight: bold; font-size: 13px; padding: 4px 0;">${toEmail}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600; font-size: 13px; padding: 4px 0;">Temporary Pass:</td>
            <td style="padding: 4px 0;"><code style="background-color: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #0284c7; font-size: 13px; font-family: monospace;">${password || 'EPTS2026!'}</code></td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600; font-size: 13px; padding: 4px 0;">System Role:</td>
            <td style="color: #1e293b; font-weight: bold; font-size: 13px; padding: 4px 0;">${roleTitle}</td>
          </tr>
        </table>
      </div>

      <p>For security, please log in and update your temporary password in the <strong>Profile</strong> tab immediately.</p>
    `
  );

  const t = getTransporter();

  if (!t) {
    console.log(`[emailService] SMTP not configured. Welcome email simulated for ${toEmail} (Code: ${employeeCode}, Role: ${roleTitle}, Pass: ${password || 'EPTS2026!'})`);
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
  const text = `Hello ${firstName},\n\nA new performance review cycle for ${reviewMonth} has officially started.\nPlease complete and submit your self-assessment in the PerfoNext portal before ${new Date(endDate).toLocaleDateString()}.\n\nBest regards,\nPerfoNext Team`;
  const html = getEmailWrapper(
    'Performance Review Cycle Open',
    `
      <p style="margin-top: 0;">Hello <strong>${firstName}</strong>,</p>
      <p>The performance review cycle for <strong>${reviewMonth}</strong> has been opened. Please complete your self-assessment as part of the employee journey setup.</p>
      
      <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 18px; margin: 24px 0; text-align: center;">
        <span style="color: #1e40af; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">Submission Deadline</span>
        <span style="color: #1d4ed8; font-size: 20px; font-weight: 800; display: block;">${new Date(endDate).toLocaleDateString()}</span>
      </div>

      <p>Log in to your PerfoNext Dashboard and select <strong>Continue Review</strong> to complete your scoring sheet.</p>
    `
  );

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
  const text = `Hello ${managerName},\n\n${employeeName} has submitted their self-assessment for the ${reviewMonth} review cycle.\nPlease log in to PerfoNext to conduct and submit your manager review.\n\nBest regards,\nPerfoNext Team`;
  const html = getEmailWrapper(
    'Self-Assessment Action Required',
    `
      <p style="margin-top: 0;">Hello <strong>${managerName}</strong>,</p>
      <p>Your team member <strong>${employeeName}</strong> has completed and submitted their self-assessment for the <strong>${reviewMonth}</strong> review cycle.</p>
      
      <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 18px; margin: 24px 0; text-align: center; color: #92400e; font-weight: bold; font-size: 13px; line-height: 1.5;">
        Action Required: Please evaluate and validate their skill ratings & KPI achievements.
      </div>

      <p>Log in to your Manager workspace and open the pending evaluations list to submit the official validation.</p>
    `
  );

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
  const text = `Hello ${employeeName},\n\nYour performance review score for ${reviewMonth} has been computed.\nFinal Rating: ${finalScore} / 5.0 (${rating})\n\nYou can log in to PerfoNext to view your complete performance report.\n\nBest regards,\nPerfoNext Team`;
  const html = getEmailWrapper(
    'Evaluation Summary Published',
    `
      <p style="margin-top: 0;">Hello <strong>${employeeName}</strong>,</p>
      <p>Your performance evaluation report for <strong>${reviewMonth}</strong> is finalized and has been published to your workspace.</p>
      
      <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
        <span style="color: #047857; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">Official Performance Rating</span>
        <span style="color: #065f46; font-size: 32px; font-weight: 800; display: block;">${finalScore} / 5.0</span>
        <span style="background-color: #d1fae5; color: #065f46; font-size: 12px; font-weight: bold; padding: 4px 12px; border-radius: 9999px; margin-top: 8px; display: inline-block;">${rating}</span>
      </div>

      <p>You can view your detailed competency breakdown and career development suggestions on your Performance tab.</p>
    `
  );

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

const sendIndividualExtensionEmail = async (toEmail, firstName, reviewMonth, endDate) => {
  const subject = `Individual Extension Granted: Performance Review Cycle (${reviewMonth})`;
  const text = `Hello ${firstName},\n\nAn individual extension has been granted for your account. The performance review cycle for "${reviewMonth}" has been specially re-opened/unlocked for you.\n\nPlease log in to PerfoNext to complete and submit your self-assessment.\n\nBest regards,\nPerfoNext Team`;
  const html = getEmailWrapper(
    'Individual Review Extension Granted',
    `
      <p style="margin-top: 0;">Hello <strong>${firstName}</strong>,</p>
      <p>An individual extension has been granted for your account. The performance review cycle for <strong>${reviewMonth}</strong> has been specially re-opened and unlocked for you.</p>
      
      <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 12px; padding: 18px; margin: 24px 0; text-align: center;">
        <span style="color: #92400e; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">Individual Extension Status</span>
        <span style="color: #b45309; font-size: 18px; font-weight: 800; display: block;">Review Cycle Unlocked & Active</span>
        ${endDate ? `<span style="color: #78350f; font-size: 12px; font-weight: 600; display: block; margin-top: 4px;">Submission Deadline: ${new Date(endDate).toLocaleDateString()}</span>` : ''}
      </div>

      <p>Please log in to your PerfoNext Dashboard and click <strong>Continue Review</strong> to complete and submit your self-assessment.</p>
    `
  );

  const t = getTransporter();
  if (!t) {
    console.log(`[emailService] SMTP not configured. Individual extension email simulated for ${toEmail}`);
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

module.exports = {
  sendOtpEmail,
  sendWelcomeEmail,
  sendReviewCycleStartedEmail,
  sendSelfAssessmentSubmittedEmail,
  sendFinalReportGeneratedEmail,
  sendIndividualExtensionEmail
};

