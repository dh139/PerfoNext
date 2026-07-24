require('dotenv').config();
const mongoose = require('mongoose');

const User = require('../models/User');
const Department = require('../models/Department');
const Designation = require('../models/Designation');
const Skill = require('../models/Skill');

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
const AIReport = require('../models/AIReport');

const keepUsersOnly = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/epts');
    console.log('Connected. Clearing evaluation activity data while preserving Users...');

    // Delete all transactional / activity data
    await SelfAssessment.deleteMany({});
    await ManagerReview.deleteMany({});
    await ReviewScore.deleteMany({});
    await ReviewCycle.deleteMany({});
    await KpiTemplate.deleteMany({});
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
    await AIReport.deleteMany({});

    const userCount = await User.countDocuments();
    const deptCount = await Department.countDocuments();
    const desCount = await Designation.countDocuments();

    console.log(`Success! Preserved ${userCount} Users, ${deptCount} Departments, and ${desCount} Designations.`);
    console.log('Cleared all review cycles, self-assessments, manager reviews, scores, PIPs, feedback, documents, and logs.');
    process.exit(0);
  } catch (error) {
    console.error('Operation failed:', error);
    process.exit(1);
  }
};

keepUsersOnly();
