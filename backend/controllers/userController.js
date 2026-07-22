const User = require('../models/User');
const Department = require('../models/Department');
const Designation = require('../models/Designation');
const bcrypt = require('bcryptjs');
const { logAction } = require('../utils/logger');
const { sendWelcomeEmail } = require('../services/emailService');

const validateManagerSelection = async (employeeId, managerId, role, departmentId) => {
  if (managerId) {
    if (employeeId && employeeId.toString() === managerId.toString()) {
      throw new Error('An employee cannot be assigned as their own reporting manager.');
    }
    const manager = await User.findById(managerId);
    if (!manager) {
      throw new Error('Selected reporting manager not found.');
    }
    // Privileged role reports (hr/admin) can report to executive managers across departments
    const isPrivileged = ['hr', 'admin'].includes(role) && ['executive', 'admin'].includes(manager.role);
    if (!isPrivileged && departmentId) {
      const managerDeptId = manager.departmentId?.toString();
      const empDeptId = departmentId.toString();
      if (managerDeptId && managerDeptId !== empDeptId) {
        throw new Error('The selected reporting manager must belong to the same department.');
      }
    }
  }
};

const determineUserLevel = (role, designationName) => {
  const name = (designationName || '').toLowerCase();
  
  if (role === 'executive') return 1;
  if (role === 'hr') return 2;
  
  if (role === 'manager') {
    if (name.includes('manager') || name.includes('head') || name.includes('director')) {
      return 2; // Department Manager / Head
    }
    return 3; // Team Lead / Reporting Manager
  }
  
  if (role === 'employee') {
    if (name.includes('senior') || name.includes('lead')) {
      return 4; // Senior Employee
    }
    if (name.includes('associate') || name.includes('junior') || name.includes('trainee') || name.includes('writer')) {
      return 6; // Junior Employee / Trainee
    }
    return 5; // Standard Employee
  }
  
  if (role === 'admin') {
    return 3; // Admins usually manage application
  }
  
  return 5; // Default fallback
};

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
    const targetId = req.params.id;

    // Authorization & Ownership checks to prevent IDOR
    const isSelf = req.user.id === targetId;
    const isPrivileged = ['admin', 'hr', 'executive'].includes(req.user.role);

    let isDirectReport = false;
    if (req.user.role === 'manager') {
      const targetUser = await User.findById(targetId);
      if (targetUser && targetUser.managerId && targetUser.managerId.toString() === req.user.id) {
        isDirectReport = true;
      }
    }

    if (!isSelf && !isPrivileged && !isDirectReport) {
      return res.status(403).json({ message: 'Access denied. You do not have permission to view this profile.' });
    }

    const user = await User.findById(targetId)
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
    // Auto-generate employeeCode if not provided
    let finalCode = employeeCode;
    if (!finalCode) {
      const count = await User.countDocuments();
      const lastUser = await User.findOne({}, { employeeCode: 1 }).sort({ createdAt: -1 });
      let nextNum = count + 1;
      if (lastUser && lastUser.employeeCode) {
        const match = lastUser.employeeCode.match(/(\d+)/);
        if (match) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }
      finalCode = `EMP${String(nextNum).padStart(3, '0')}`;
    } else {
      const codeExists = await User.findOne({ employeeCode: finalCode });
      if (codeExists) {
        return res.status(400).json({ message: 'Employee Code already exists.' });
      }
    }

    if (mobile) {
      const mobileExists = await User.findOne({ mobile: String(mobile).trim() });
      if (mobileExists) {
        return res.status(400).json({ message: 'This mobile number is already registered with another account.' });
      }
    }

    // Resolve designation name to determine level
    let designationName = '';
    if (designationId) {
      const desDoc = await Designation.findById(designationId);
      if (desDoc) designationName = desDoc.designationName;
    }
    const computedLevel = determineUserLevel(role, designationName);

    // Validate manager selection
    try {
      await validateManagerSelection(null, managerId, role, departmentId);
    } catch (valErr) {
      return res.status(400).json({ message: valErr.message });
    }

    // Role-based restrictions on Administration department & System Administrator designation
    if (req.user.role !== 'admin') {
      if (departmentId) {
        const dept = await Department.findById(departmentId);
        if (dept && dept.departmentName.toLowerCase() === 'administration') {
          return res.status(403).json({ message: 'Only Administrators can assign employees to the Administration department.' });
        }
      }
      if (designationId) {
        const desg = await Designation.findById(designationId);
        if (desg && desg.designationName.toLowerCase() === 'system administrator') {
          return res.status(403).json({ message: 'Only Administrators can assign the System Administrator designation.' });
        }
      }
    }

    if (password && password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    // Auto-generate safe temporary password if not provided
    const rawPassword = password || Math.random().toString(36).slice(-8) + 'Pass123!';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    const newUser = await User.create({
      employeeCode: finalCode,
      firstName,
      lastName,
      email,
      mobile,
      passwordHash,
      departmentId: departmentId || null,
      designationId: designationId || null,
      managerId: managerId || null,
      joiningDate: joiningDate || new Date(),
      employmentStatus: employmentStatus || 'active',
      role,
      level: computedLevel
    });

    const userObj = newUser.toObject();
    delete userObj.passwordHash;
    delete userObj.refreshToken;

    await logAction({
      userId: req.user.id,
      action: 'user_creation',
      entityType: 'User',
      entityId: newUser._id,
      after: userObj,
      ipAddress: req.ip || ''
    });

    // Send welcome confirmation email with credentials
    try {
      await sendWelcomeEmail(newUser.email, newUser.firstName, newUser.employeeCode, newUser.role, rawPassword);
    } catch (emailErr) {
      console.error('Welcome email error:', emailErr);
    }

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
      if (updates.password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
      }
      const salt = await bcrypt.genSalt(10);
      updates.passwordHash = await bcrypt.hash(updates.password, salt);
      delete updates.password;
    }

    // Handle optional fields clean formats
    if (updates.managerId === '') {
      updates.managerId = null;
    }
    if (updates.departmentId === '') {
      updates.departmentId = null;
    }
    if (updates.designationId === '') {
      updates.designationId = null;
    }

    // Auto-calculate level if role or designation changes
    if (updates.role || updates.designationId) {
      const targetRole = updates.role || user.role;
      const targetDesignationId = updates.designationId || user.designationId;
      let designationName = '';
      if (targetDesignationId) {
        const desDoc = await Designation.findById(targetDesignationId);
        if (desDoc) designationName = desDoc.designationName;
      }
      updates.level = determineUserLevel(targetRole, designationName);
    }

    // Validate manager selection
    const targetManagerId = updates.managerId !== undefined ? updates.managerId : user.managerId;
    const targetRole = updates.role || user.role;
    const targetDeptId = updates.departmentId !== undefined ? updates.departmentId : user.departmentId;
    try {
      await validateManagerSelection(userId, targetManagerId, targetRole, targetDeptId);
    } catch (valErr) {
      return res.status(400).json({ message: valErr.message });
    }

    // Role-based restrictions on Administration department & System Administrator designation
    if (req.user.role !== 'admin') {
      const checkDeptId = updates.departmentId !== undefined ? updates.departmentId : user.departmentId;
      const checkDesgId = updates.designationId !== undefined ? updates.designationId : user.designationId;

      if (checkDeptId) {
        const dept = await Department.findById(checkDeptId);
        if (dept && dept.departmentName.toLowerCase() === 'administration') {
          return res.status(403).json({ message: 'Only Administrators can assign employees to the Administration department.' });
        }
      }
      if (checkDesgId) {
        const desg = await Designation.findById(checkDesgId);
        if (desg && desg.designationName.toLowerCase() === 'system administrator') {
          return res.status(403).json({ message: 'Only Administrators can assign the System Administrator designation.' });
        }
      }
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true })
      .populate('departmentId designationId')
      .select('-passwordHash -refreshToken');

    const roleChanged = updates.role && updates.role !== before.role;

    await logAction({
      userId: req.user.id,
      action: roleChanged ? 'role_change' : 'user_modification',
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

const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    const before = user.toObject();
    delete before.passwordHash;
    delete before.refreshToken;

    await User.findByIdAndDelete(req.params.id);

    await logAction({
      userId: req.user.id,
      action: 'user_deletion',
      entityType: 'User',
      entityId: req.params.id,
      before,
      after: null,
      ipAddress: req.ip || ''
    });

    res.json({ message: 'User deleted successfully.' });
  } catch (error) {
    console.error('deleteUser error:', error);
    res.status(500).json({ message: error.message || 'Internal server error.' });
  }
};

const deleteDepartment = async (req, res) => {
  try {
    const departmentId = req.params.id;
    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(404).json({ message: 'Department not found.' });
    }

    // Block deletion if any users are assigned to this department
    const assignedUsersCount = await User.countDocuments({ departmentId });
    if (assignedUsersCount > 0) {
      return res.status(400).json({
        message: `Cannot delete department '${department.departmentName}'. There are ${assignedUsersCount} employee(s) assigned to this department. Please reassign or remove them first.`
      });
    }

    // Delete the department
    await Department.findByIdAndDelete(departmentId);

    // Log action
    await logAction({
      userId: req.user.id,
      action: 'department_modification',
      entityType: 'Department',
      entityId: departmentId,
      before: department.toObject(),
      after: null,
      ipAddress: req.ip || ''
    });

    res.json({
      message: `Department '${department.departmentName}' has been deleted successfully.`
    });
  } catch (error) {
    console.error('deleteDepartment error:', error);
    res.status(500).json({ message: error.message || 'Internal server error.' });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  deleteDepartment,
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
