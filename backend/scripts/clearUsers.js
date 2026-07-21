require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Department = require('../models/Department');
const Designation = require('../models/Designation');
const User = require('../models/User');
const KpiTemplate = require('../models/KpiTemplate');
const ReviewCycle = require('../models/ReviewCycle');
const SelfAssessment = require('../models/SelfAssessment');
const ManagerReview = require('../models/ManagerReview');
const ReviewScore = require('../models/ReviewScore');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const Pip = require('../models/Pip');
const Promotion = require('../models/Promotion');
const Recognition = require('../models/Recognition');
const Document = require('../models/Document');
const FeedbackRequest = require('../models/FeedbackRequest');
const FeedbackResponse = require('../models/FeedbackResponse');
const EmployeeSkill = require('../models/EmployeeSkill');
const Certification = require('../models/Certification');
const Attendance = require('../models/Attendance');
const LmsRecord = require('../models/LmsRecord');
const IntegrationLog = require('../models/IntegrationLog');

const cleanupUsers = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/epts');
    console.log('Connected. Clearing user mock data & associated records...');

    // Clear all mock user-generated records
    await User.deleteMany({});
    await SelfAssessment.deleteMany({});
    await ManagerReview.deleteMany({});
    await ReviewScore.deleteMany({});
    await Notification.deleteMany({});
    await AuditLog.deleteMany({});
    await Pip.deleteMany({});
    await Promotion.deleteMany({});
    await Recognition.deleteMany({});
    await Document.deleteMany({});
    await FeedbackRequest.deleteMany({});
    await FeedbackResponse.deleteMany({});
    await EmployeeSkill.deleteMany({});
    await Certification.deleteMany({});
    await Attendance.deleteMany({});
    await LmsRecord.deleteMany({});
    await IntegrationLog.deleteMany({});

    console.log('User mock data cleared.');

    // Ensure departments and designations exist for registration
    let deptHR = await Department.findOne({ departmentName: 'Human Resources' });
    if (!deptHR) {
      deptHR = await Department.create({ departmentName: 'Human Resources', description: 'HR Operations & Talent Management' });
    }

    let desAdmin = await Designation.findOne({ designationName: 'System Administrator' });
    if (!desAdmin) {
      desAdmin = await Designation.create({ designationName: 'System Administrator', departmentId: deptHR._id });
    }

    // Create 1 clean System Administrator account
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('AdminPass123!', salt);

    const adminUser = await User.create({
      employeeCode: 'EMP001',
      firstName: 'Alok',
      lastName: 'Sharma',
      email: 'admin@epts.com',
      mobile: '9876543210',
      passwordHash,
      departmentId: deptHR._id,
      designationId: desAdmin._id,
      managerId: null,
      joiningDate: new Date(),
      employmentStatus: 'active',
      role: 'admin'
    });

    console.log(`Cleaned database! Primary System Administrator account created: admin@epts.com / AdminPass123!`);
    process.exit(0);
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  }
};

cleanupUsers();
