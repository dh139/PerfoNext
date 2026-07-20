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
const Skill = require('../models/Skill');
const EmployeeSkill = require('../models/EmployeeSkill');
const Certification = require('../models/Certification');
const Attendance = require('../models/Attendance');
const IntegrationLog = require('../models/IntegrationLog');
const LmsRecord = require('../models/LmsRecord');

const cleanup = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/epts');

    console.log('Wiping all mock/transactional data (keeping Departments, Designations, KPI Templates)...');

    await User.deleteMany({});
    await ReviewCycle.deleteMany({});
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
    await Skill.deleteMany({});
    await EmployeeSkill.deleteMany({});
    await Certification.deleteMany({});
    await Attendance.deleteMany({});
    await IntegrationLog.deleteMany({});
    await LmsRecord.deleteMany({});

    console.log('Wiped. Departments, Designations, and KPI Templates were left untouched.');

    // Users were wiped entirely, so nobody can log in. Create one admin account
    // (reusing the first existing department/designation) so the system stays accessible.
    let department = await Department.findOne();
    if (!department) {
      department = await Department.create({
        departmentName: 'Administration',
        description: 'Default administration department',
        status: 'active'
      });
      console.log('No department existed — created a default "Administration" department.');
    }

    let designation = await Designation.findOne({ departmentId: department._id });
    if (!designation) {
      designation = await Designation.create({
        designationName: 'System Administrator',
        departmentId: department._id,
        status: 'active'
      });
      console.log('No designation existed for that department — created "System Administrator".');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('AdminPass123!', salt);

    const admin = await User.create({
      employeeCode: 'EMP001',
      firstName: 'System',
      lastName: 'Admin',
      email: 'admin@epts.com',
      mobile: '9000000000',
      passwordHash,
      departmentId: department._id,
      designationId: designation._id,
      managerId: null,
      joiningDate: new Date(),
      employmentStatus: 'active',
      role: 'admin'
    });

    console.log('\nCreated fresh admin account so you can log back in:');
    console.log('  Email:    admin@epts.com');
    console.log('  Password: AdminPass123!');
    console.log('\nDone.');

    process.exit(0);
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  }
};

cleanup();
