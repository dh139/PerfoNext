// Replace nodemailer with Brevo API
const getTransporter = () => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey || apiKey === 'your_brevo_api_key' || apiKey.trim() === '') {
    return null;
  }

  return {
    sendMail: async ({ from, to, subject, text, html }) => {
      const senderEmail = from || process.env.SMTP_FROM;
      let senderName = 'PerfoNext';
      let cleanSenderEmail = senderEmail;
      
      if (senderEmail.includes('<') && senderEmail.includes('>')) {
        const match = senderEmail.match(/^(.*?)\s*<(.*?)>$/);
        if (match) {
          senderName = match[1].trim();
          cleanSenderEmail = match[2].trim();
        }
      }

      try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sender: { email: cleanSenderEmail, name: senderName },
            to: [{ email: to }],
            subject: subject,
            textContent: text,
            htmlContent: html
          })
        });

        if (!response.ok) {
          console.error(`Brevo API send email failed with status ${response.status}`);
          throw new Error(`Brevo API Error: ${response.status}`);
        }

        return await response.json();
      } catch (err) {
        throw new Error(`Email delivery failed: ${err.message}`);
      }
    }
  };
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

const sendPipCreatedEmail = async (toEmail, employeeName, startDate, endDate) => {
  const subject = 'Performance Improvement Plan (PIP) Assigned';
  const text = `Hello ${employeeName},\n\nYou have been placed on a Performance Improvement Plan (PIP) starting ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}.\nPlease log in to PerfoNext and navigate to the PIP Workspace to review your target action goals.\n\nBest regards,\nPerfoNext Team`;
  const html = getEmailWrapper(
    'Performance Improvement Plan Assigned',
    `
      <p style="margin-top: 0;">Hello <strong>${employeeName}</strong>,</p>
      <p>A Performance Improvement Plan (PIP) has been initiated and assigned to you. Please review the details below:</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 18px; margin: 24px 0;">
        <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <td width="35%" style="color: #64748b; font-weight: 600; font-size: 13px; padding: 4px 0;">Start Date:</td>
            <td style="color: #1e293b; font-weight: bold; font-size: 13px; padding: 4px 0;">${new Date(startDate).toLocaleDateString()}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600; font-size: 13px; padding: 4px 0;">End Date:</td>
            <td style="color: #1e293b; font-weight: bold; font-size: 13px; padding: 4px 0;">${new Date(endDate).toLocaleDateString()}</td>
          </tr>
        </table>
      </div>

      <p>Please log in to your PerfoNext portal and open the <strong>PIP Workspace</strong> to review your target action goals and track your progress.</p>
    `
  );

  const t = getTransporter();
  if (!t) {
    console.log(`[emailService] SMTP not configured. PIP assignment email simulated for ${toEmail}`);
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

const sendPipStatusUpdatedEmail = async (toEmail, employeeName, status, notes, newEndDate) => {
  const statusLower = status.toLowerCase();
  
  let statusLabel = 'SUCCESSFULLY CLOSED';
  let isPositive = true;
  let isExtension = false;
  
  if (statusLower === 'unsuccessful') {
    statusLabel = 'CLOSED - UNSUCCESSFUL';
    isPositive = false;
  } else if (statusLower === 'escalated') {
    statusLabel = 'ESCALATED TO HR';
    isPositive = false;
  } else if (statusLower === 'extended') {
    statusLabel = 'EXTENDED';
    isExtension = true;
  }
  
  const subject = `Your Performance Improvement Plan (PIP) Status: ${statusLabel}`;
  const text = `Hello ${employeeName},\n\nYour Performance Improvement Plan (PIP) has been updated.\nStatus: ${statusLabel}\n\nDetails / Notes:\n"${notes || 'No notes provided.'}"\n\nBest regards,\nPerfoNext Team`;
  
  const html = getEmailWrapper(
    `PIP Status: ${statusLabel}`,
    `
      <p style="margin-top: 0;">Hello <strong>${employeeName}</strong>,</p>
      <p>Your Performance Improvement Plan (PIP) status has been updated by your evaluator.</p>
      
      <div style="background-color: ${isExtension ? '#fffbeb' : (!isPositive ? '#fff1f2' : '#f0fdf4')}; border: 1px solid ${isExtension ? '#fde68a' : (!isPositive ? '#fecdd3' : '#bbf7d0')}; border-radius: 12px; padding: 18px; margin: 24px 0;">
        <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <td width="35%" style="color: #64748b; font-weight: 600; font-size: 13px; padding: 4px 0;">Current Status:</td>
            <td style="color: ${isExtension ? '#b45309' : (!isPositive ? '#be123c' : '#15803d')}; font-weight: bold; font-size: 13px; padding: 4px 0; text-transform: uppercase;">${statusLabel}</td>
          </tr>
          ${newEndDate ? `
          <tr>
            <td style="color: #64748b; font-weight: 600; font-size: 13px; padding: 4px 0;">New End Date:</td>
            <td style="color: #1e293b; font-weight: bold; font-size: 13px; padding: 4px 0;">${new Date(newEndDate).toLocaleDateString('en-GB')}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="color: #64748b; font-weight: 600; font-size: 13px; padding: 4px 0; vertical-align: top;">Notes / Remarks:</td>
            <td style="color: #1e293b; font-style: italic; font-size: 13px; padding: 4px 0;">"${notes || 'No notes provided.'}"</td>
          </tr>
        </table>
      </div>

      <p>${statusLower === 'escalated' 
        ? 'Since the plan was escalated, the HR department will contact you shortly to schedule a review session.' 
        : (statusLower === 'unsuccessful'
          ? 'The improvement plan has been closed as unsuccessful. Your evaluator or HR department will contact you to discuss next steps.'
          : (statusLower === 'extended'
            ? 'Your Performance Improvement Plan has been extended to allow more time for goals completion and coaching.'
            : 'Congratulations on successfully completing the improvement plan. No further targets are active under this plan.'))}</p>
    `
  );

  const t = getTransporter();
  if (!t) {
    console.log(`[emailService] SMTP not configured. PIP status update email simulated for ${toEmail}`);
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

const sendLeaveSubmittedEmail = async (hrEmail, employeeName, leaveTitle, fromDate, toDate, reason) => {
  const fromStr = new Date(fromDate).toLocaleDateString('en-GB');
  const toStr = new Date(toDate).toLocaleDateString('en-GB');
  const subject = `New Leave Request Submitted: ${employeeName}`;
  const text = `Hello HR,\n\nA new leave request has been submitted by ${employeeName}.\n\nDetails:\n- Title: ${leaveTitle}\n- Dates: ${fromStr} to ${toStr}\n- Reason: ${reason}\n\nPlease log in to PerfoNext to action this request.\n\nBest regards,\nPerfoNext Team`;
  const html = getEmailWrapper(
    'New Leave Application',
    `
      <p style="margin-top: 0;">Hello HR Team,</p>
      <p>A new leave application has been submitted by employee <strong>${employeeName}</strong>. Please review the details below:</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 18px; margin: 24px 0;">
        <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <td width="35%" style="color: #64748b; font-weight: 600; font-size: 13px; padding: 4px 0;">Employee:</td>
            <td style="color: #1e293b; font-weight: bold; font-size: 13px; padding: 4px 0;">${employeeName}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600; font-size: 13px; padding: 4px 0;">Title:</td>
            <td style="color: #1e293b; font-weight: bold; font-size: 13px; padding: 4px 0;">${leaveTitle}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600; font-size: 13px; padding: 4px 0;">Duration:</td>
            <td style="color: #1e293b; font-weight: bold; font-size: 13px; padding: 4px 0;">${fromStr} to ${toStr}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600; font-size: 13px; padding: 4px 0; vertical-align: top;">Reason:</td>
            <td style="color: #1e293b; font-style: italic; font-size: 13px; padding: 4px 0;">"${reason}"</td>
          </tr>
        </table>
      </div>
      <p>Please log in to the PerfoNext portal to approve or reject this request.</p>
    `
  );

  const t = getTransporter();
  if (!t) {
    console.log(`[emailService] SMTP not configured. Leave submission email simulated for HR ${hrEmail}`);
    return { simulated: true };
  }

  return t.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: hrEmail,
    subject,
    text,
    html
  });
};

const sendLeaveReviewedEmail = async (employeeEmail, employeeName, leaveTitle, fromDate, toDate, status, rejectionReason) => {
  const fromStr = new Date(fromDate).toLocaleDateString('en-GB');
  const toStr = new Date(toDate).toLocaleDateString('en-GB');
  const isApproved = status === 'approved';
  const statusLabel = isApproved ? 'APPROVED' : 'REJECTED';
  const subject = `Leave Request ${statusLabel}: "${leaveTitle}"`;
  const text = `Hello ${employeeName},\n\nYour leave request "${leaveTitle}" has been ${statusLabel}.\n\nDetails:\n- Dates: ${fromStr} to ${toStr}\n${!isApproved && rejectionReason ? `- Rejection Reason: ${rejectionReason}\n` : ''}\nBest regards,\nPerfoNext Team`;
  const html = getEmailWrapper(
    `Leave Request ${statusLabel}`,
    `
      <p style="margin-top: 0;">Hello <strong>${employeeName}</strong>,</p>
      <p>Your leave request has been reviewed and actioned by the HR department.</p>
      
      <div style="background-color: ${isApproved ? '#f0fdf4' : '#fff1f2'}; border: 1px solid ${isApproved ? '#bbf7d0' : '#fecdd3'}; border-radius: 12px; padding: 18px; margin: 24px 0;">
        <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <td width="35%" style="color: #64748b; font-weight: 600; font-size: 13px; padding: 4px 0;">Subject:</td>
            <td style="color: #1e293b; font-weight: bold; font-size: 13px; padding: 4px 0;">${leaveTitle}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600; font-size: 13px; padding: 4px 0;">Dates:</td>
            <td style="color: #1e293b; font-weight: bold; font-size: 13px; padding: 4px 0;">${fromStr} to ${toStr}</td>
          </tr>
          <tr>
            <td style="color: #64748b; font-weight: 600; font-size: 13px; padding: 4px 0;">Decision:</td>
            <td style="color: ${isApproved ? '#15803d' : '#be123c'}; font-weight: bold; font-size: 13px; padding: 4px 0; text-transform: uppercase;">${statusLabel}</td>
          </tr>
          ${!isApproved && rejectionReason ? `
          <tr>
            <td style="color: #64748b; font-weight: 600; font-size: 13px; padding: 4px 0; vertical-align: top;">HR Remarks:</td>
            <td style="color: #1e293b; font-style: italic; font-size: 13px; padding: 4px 0;">"${rejectionReason}"</td>
          </tr>
          ` : ''}
        </table>
      </div>
      <p>If you have any questions, please contact the HR department.</p>
    `
  );

  const t = getTransporter();
  if (!t) {
    console.log(`[emailService] SMTP not configured. Leave review email simulated for ${employeeEmail}`);
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

const sendReviewCycleUpdatedEmail = async (toEmail, firstName, reviewMonth, startDate, endDate) => {
  const subject = `Performance Review Cycle Updated (${reviewMonth})`;
  const startFmt = new Date(startDate).toLocaleDateString();
  const endFmt = new Date(endDate).toLocaleDateString();
  const text = `Hello ${firstName},\n\nThe performance review cycle for ${reviewMonth} has been updated.\nThe new start date is ${startFmt} and the new evaluation due date is ${endFmt}.\n\nBest regards,\nPerfoNext Team`;
  const html = getEmailWrapper(
    'Performance Review Cycle Updated',
    `
      <p style="margin-top: 0;">Hello <strong>${firstName}</strong>,</p>
      <p>The performance review cycle details for <strong>${reviewMonth}</strong> have been updated by the administration.</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 24px 0;">
        <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>New Start Date:</strong> ${startFmt}</p>
        <p style="margin: 0; font-size: 13px;"><strong>New Evaluation Due Date:</strong> ${endFmt}</p>
      </div>

      <p>Please log in to your PerfoNext portal to continue your self-assessment during the active period.</p>
    `
  );

  const t = getTransporter();
  if (!t) {
    console.log(`[emailService] SMTP not configured. Review cycle update email simulated for ${toEmail}`);
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
  sendReviewCycleUpdatedEmail,
  sendSelfAssessmentSubmittedEmail,
  sendFinalReportGeneratedEmail,
  sendIndividualExtensionEmail,
  sendPipCreatedEmail,
  sendPipStatusUpdatedEmail,
  sendLeaveSubmittedEmail,
  sendLeaveReviewedEmail
};

