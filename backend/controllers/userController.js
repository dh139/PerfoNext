const User = require('../models/User');
const Department = require('../models/Department');
const Designation = require('../models/Designation');
const bcrypt = require('bcryptjs');
const { logAction } = require('../utils/logger');

// ==================== USER CONTROLLERS ====================

const getUsers = async (req, res) => {
  try {
    const { departmentId, designationId, managerId, role, status } = req.query;
    const query = {};

    if (departmentId) query.departmentId = departmentId;
    if (designationId) query.designationId = designationId;
    if (managerId) query.managerId = managerId;
    if (role) query.role = role;
    if (status) query.employmentStatus = status;

    const users = await User.find(query)
      .populate('departmentId designationId')
      .populate({ path: 'managerId', select: 'firstName lastName employeeCode email' })
      .select('-passwordHash -refreshToken');

    res.json(users);
  } catch (error) {
    console.error('getUsers error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('departmentId designationId')
      .populate({ path: 'managerId', select: 'firstName lastName employeeCode email' })
      .select('-passwordHash -refreshToken');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json(user);
  } catch (error) {
    console.error('getUserById error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const createUser = async (req, res) => {
  try {
    const {
      employeeCode,
      firstName,
      lastName,
      email,
      mobile,
      password,
      departmentId,
      designationId,
      managerId,
      joiningDate,
      employmentStatus,
      role
    } = req.body;

    // Validate email & employeeCode uniqueness
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ message: 'Email already exists.' });
    }

    const codeExists = await User.findOne({ employeeCode });
    if (codeExists) {
      return res.status(400).json({ message: 'Employee Code already exists.' });
    }

    if (mobile) {
      const mobileExists = await User.findOne({ mobile: String(mobile).trim() });
      if (mobileExists) {
        return res.status(400).json({ message: 'This mobile number is already registered with another account.' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password || 'EPTS2026!', salt);

    const newUser = await User.create({
      employeeCode,
      firstName,
      lastName,
      email,
      mobile,
      passwordHash,
      departmentId,
      designationId,
      managerId: managerId || null,
      joiningDate: joiningDate || new Date(),
      employmentStatus: employmentStatus || 'active',
      role
    });

    const userObj = newUser.toObject();
    delete userObj.passwordHash;
    delete userObj.refreshToken;

    await logAction({
      userId: req.user.id,
      action: 'user_modification',
      entityType: 'User',
      entityId: newUser._id,
      after: userObj,
      ipAddress: req.ip || ''
    });

    res.status(201).json(userObj);
  } catch (error) {
    console.error('createUser error:', error);
    res.status(500).json({ message: error.message || 'Internal server error.' });
  }
};

const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const before = user.toObject();
    delete before.passwordHash;
    delete before.refreshToken;

    const updates = { ...req.body };

    if (updates.mobile) {
      const mobileExists = await User.findOne({ mobile: String(updates.mobile).trim(), _id: { $ne: userId } });
      if (mobileExists) {
        return res.status(400).json({ message: 'This mobile number is already registered with another account.' });
      }
    }

    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      updates.passwordHash = await bcrypt.hash(updates.password, salt);
      delete updates.password;
    }

    // Handle managerId clean format
    if (updates.managerId === '') {
      updates.managerId = null;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true })
      .populate('departmentId designationId')
      .select('-passwordHash -refreshToken');

    await logAction({
      userId: req.user.id,
      action: 'user_modification',
      entityType: 'User',
      entityId: updatedUser._id,
      before,
      after: updatedUser.toObject(),
      ipAddress: req.ip || ''
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('updateUser error:', error);
    res.status(500).json({ message: error.message || 'Internal server error.' });
  }
};

// ==================== DEPARTMENT CONTROLLERS ====================

const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find();
    res.json(departments);
  } catch (error) {
    console.error('getDepartments error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const createDepartment = async (req, res) => {
  try {
    const { departmentName, description, status } = req.body;

    const exists = await Department.findOne({ departmentName });
    if (exists) {
      return res.status(400).json({ message: 'Department already exists.' });
    }

    const dept = await Department.create({ departmentName, description, status });
    res.status(201).json(dept);
  } catch (error) {
    console.error('createDepartment error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const updateDepartment = async (req, res) => {
  try {
    const dept = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!dept) {
      return res.status(404).json({ message: 'Department not found.' });
    }
    res.json(dept);
  } catch (error) {
    console.error('updateDepartment error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// ==================== DESIGNATION CONTROLLERS ====================

const getDesignations = async (req, res) => {
  try {
    const { departmentId } = req.query;
    const filter = {};
    if (departmentId) filter.departmentId = departmentId;

    const designations = await Designation.find(filter).populate('departmentId');
    res.json(designations);
  } catch (error) {
    console.error('getDesignations error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const createDesignation = async (req, res) => {
  try {
    const { designationName, departmentId, status } = req.body;
    const designation = await Designation.create({ designationName, departmentId, status });
    res.status(201).json(designation);
  } catch (error) {
    console.error('createDesignation error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const updateDesignation = async (req, res) => {
  try {
    const designation = await Designation.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('departmentId');
    if (!designation) {
      return res.status(404).json({ message: 'Designation not found.' });
    }
    res.json(designation);
  } catch (error) {
    console.error('updateDesignation error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// ==================== SELF-SERVICE PROFILE CONTROLLERS ====================

const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('departmentId designationId')
      .populate({ path: 'managerId', select: 'firstName lastName employeeCode email' })
      .select('-passwordHash -refreshToken');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json(user);
  } catch (error) {
    console.error('getMyProfile error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const updateMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const before = user.toObject();
    delete before.passwordHash;
    delete before.refreshToken;

    const { firstName, lastName, mobile, currentPassword, newPassword } = req.body;

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (mobile && mobile.trim() !== user.mobile) {
      const mobileExists = await User.findOne({ mobile: mobile.trim(), _id: { $ne: user._id } });
      if (mobileExists) {
        return res.status(400).json({ message: 'This mobile number is already registered with another account.' });
      }
      user.mobile = mobile.trim();
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required to set a new password.' });
      }
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect.' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
      }
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(newPassword, salt);
    }

    await user.save();

    const updatedUser = await User.findById(user._id)
      .populate('departmentId designationId')
      .populate({ path: 'managerId', select: 'firstName lastName employeeCode email' })
      .select('-passwordHash -refreshToken');

    await logAction({
      userId: req.user.id,
      action: 'user_modification',
      entityType: 'User',
      entityId: user._id,
      before,
      after: updatedUser.toObject(),
      ipAddress: req.ip || ''
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('updateMyProfile error:', error);
    res.status(500).json({ message: error.message || 'Internal server error.' });
  }
};

const getPublicManagers = async (req, res) => {
  try {
    const managers = await User.find({
      role: { $in: ['manager', 'hr', 'admin'] },
      employmentStatus: 'active'
    }).select('firstName lastName role');
    res.json(managers);
  } catch (error) {
    console.error('getPublicManagers error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  getMyProfile,
  updateMyProfile,
  getDepartments,
  createDepartment,
  updateDepartment,
  getDesignations,
  createDesignation,
  updateDesignation,
  getPublicManagers
};
