const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { generateAccessToken, generateRefreshToken } = require('../middlewares/auth');
const { logAction } = require('../utils/logger');
const { sendOtpEmail, sendWelcomeEmail } = require('../services/emailService');

const OTP_EXPIRY_MS = 10 * 60 * 1000;

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email }).populate('departmentId designationId');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    if (user.employmentStatus !== 'active') {
      return res.status(403).json({ message: 'Account is inactive or exited.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await logAction({
        req,
        userId: user._id,
        action: 'FAILED_LOGIN',
        module: 'Authentication',
        status: 'FAILED',
        reason: 'Invalid password provided during login attempt',
        entityType: 'User',
        entityId: user._id
      });
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    await logAction({
      req,
      userId: user._id,
      action: 'LOGIN',
      module: 'Authentication',
      status: 'SUCCESS',
      reason: 'User authenticated via password credentials',
      entityType: 'User',
      entityId: user._id
    });

    res.json({
      user: {
        id: user._id,
        employeeCode: user.employeeCode,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        gender: user.gender || 'male',
        profilePhoto: user.profilePhoto || null,
        department: user.departmentId ? user.departmentId.departmentName : null,
        departmentId: user.departmentId ? user.departmentId._id : null,
        designation: user.designationId ? user.designationId.designationName : null,
        designationId: user.designationId ? user.designationId._id : null,
        managerId: user.managerId
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token is required.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired refresh token.' });
    }

    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }

    if (user.employmentStatus !== 'active') {
      return res.status(403).json({ message: 'Account is inactive.' });
    }

    // Generate new set of tokens (rotation)
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const logout = async (req, res) => {
  try {
    const { userId } = req.body;
    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        user.refreshToken = null;
        await user.save();

        await logAction({
          req,
          userId: user._id,
          action: 'LOGOUT',
          module: 'Authentication',
          status: 'SUCCESS',
          reason: 'User session terminated explicitly',
          entityType: 'User',
          entityId: user._id
        });
      }
    }
    res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const register = async (req, res) => {
  try {
    const { firstName, lastName, email, mobile, password, departmentId, designationId, managerId, role, gender } = req.body;

    const targetRole = role || 'employee';

    if (targetRole === 'employee') {
      if (!firstName || !lastName || !email || !mobile || !password || !departmentId || !designationId || !managerId) {
        return res.status(400).json({ message: 'First name, last name, email, mobile, password, department, designation, and reporting manager are required for Employees.' });
      }
    } else if (['admin', 'executive'].includes(targetRole)) {
      if (!firstName || !lastName || !email || !mobile || !password) {
        return res.status(400).json({ message: 'First name, last name, email, mobile, and password are required for Admin / Management.' });
      }
    } else {
      if (!firstName || !lastName || !email || !mobile || !password || !departmentId || !designationId) {
        return res.status(400).json({ message: 'First name, last name, email, mobile, password, department, and designation are required.' });
      }
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered.' });
    }

    const existingMobile = await User.findOne({ mobile: mobile.trim() });
    if (existingMobile) {
      return res.status(400).json({ message: 'This mobile number is already registered with another account.' });
    }

    // Auto-generate employeeCode
    const lastUser = await User.findOne({}, { employeeCode: 1 }).sort({ employeeCode: -1 });
    let nextNum = 1;
    if (lastUser && lastUser.employeeCode) {
      const match = lastUser.employeeCode.match(/(\d+)/);
      if (match) {
        nextNum = parseInt(match[1]) + 1;
      }
    }
    const employeeCode = `EMP${String(nextNum).padStart(3, '0')}`;

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      employeeCode,
      firstName,
      lastName,
      email,
      mobile,
      passwordHash,
      departmentId: departmentId || null,
      designationId: designationId || null,
      managerId: targetRole === 'executive' ? null : (managerId || null),
      joiningDate: new Date(),
      role: targetRole,
      gender: gender || 'male',
      employmentStatus: 'active'
    });

    await logAction({
      userId: user._id,
      action: 'user_modification',
      entityType: 'User',
      entityId: user._id,
      after: user.toObject(),
      ipAddress: req.ip || ''
    });

    // Send welcome confirmation email
    try {
      await sendWelcomeEmail(user.email, user.firstName, user.employeeCode, user.role);
    } catch (emailErr) {
      console.error('Welcome email error:', emailErr);
    }

    res.status(201).json({
      message: `Registration successful! Your generated Employee Code is ${employeeCode}.`,
      userId: user._id,
      employeeCode
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: error.message || 'Internal server error.' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });

    // Always respond with a generic success message to avoid leaking which emails are registered.
    const genericResponse = { message: 'If an account exists for this email, an OTP has been sent.' };

    if (!user || user.employmentStatus !== 'active') {
      return res.json(genericResponse);
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const salt = await bcrypt.genSalt(10);
    user.otpHash = await bcrypt.hash(otp, salt);
    user.otpExpiry = new Date(Date.now() + OTP_EXPIRY_MS);
    await user.save();

    await sendOtpEmail(user.email, otp);

    res.json(genericResponse);
  } catch (error) {
    console.error('forgotPassword error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required.' });
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+otpHash +otpExpiry');
    if (!user || !user.otpHash || !user.otpExpiry) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    if (user.otpExpiry.getTime() < Date.now()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    const isMatch = await bcrypt.compare(String(otp), user.otpHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    // Clear the OTP so it can't be reused, and issue a short-lived reset token.
    user.otpHash = null;
    user.otpExpiry = null;
    await user.save();

    const resetToken = jwt.sign(
      { id: user._id, purpose: 'password_reset' },
      process.env.JWT_RESET_SECRET,
      { expiresIn: '10m' }
    );

    res.json({ message: 'OTP verified successfully.', resetToken });
  } catch (error) {
    console.error('verifyOtp error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      return res.status(400).json({ message: 'Reset token and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_RESET_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired reset token. Please restart the password reset process.' });
    }

    if (decoded.purpose !== 'password_reset') {
      return res.status(401).json({ message: 'Invalid reset token.' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.refreshToken = null; // force re-login on all sessions
    await user.save();

    await logAction({
      userId: user._id,
      action: 'user_modification',
      entityType: 'User',
      entityId: user._id,
      after: { passwordReset: true },
      ipAddress: req.ip || ''
    });

    res.json({ message: 'Password has been reset successfully. Please log in with your new password.' });
  } catch (error) {
    console.error('resetPassword error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = {
  login,
  refresh,
  logout,
  register,
  forgotPassword,
  verifyOtp,
  resetPassword
};
