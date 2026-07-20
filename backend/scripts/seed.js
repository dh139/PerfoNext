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

const seedDB = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/epts');
    console.log('Connected. Cleaning database collections...');

    await Department.deleteMany({});
    await Designation.deleteMany({});
    await User.deleteMany({});
    await KpiTemplate.deleteMany({});
    await ReviewCycle.deleteMany({});
    await SelfAssessment.deleteMany({});
    await ManagerReview.deleteMany({});
    await ReviewScore.deleteMany({});
    await Notification.deleteMany({});
    await AuditLog.deleteMany({});

    console.log('Collections cleared. Seeding Departments...');
    
    const deptEng = await Department.create({ departmentName: 'Engineering', description: 'Software Development & IT Services' });
    const deptSales = await Department.create({ departmentName: 'Sales', description: 'Enterprise Sales & Business Development' });
    const deptHR = await Department.create({ departmentName: 'Human Resources', description: 'HR Operations, Talent Acquisition & L&D' });

    console.log('Seeding Designations...');
    const desSE = await Designation.create({ designationName: 'Software Engineer', departmentId: deptEng._id });
    const desSSE = await Designation.create({ designationName: 'Senior Software Engineer', departmentId: deptEng._id });
    const desEM = await Designation.create({ designationName: 'Engineering Manager', departmentId: deptEng._id });

    const desSE_Sales = await Designation.create({ designationName: 'Sales Executive', departmentId: deptSales._id });
    const desSM = await Designation.create({ designationName: 'Sales Manager', departmentId: deptSales._id });

    const desHR = await Designation.create({ designationName: 'HR Manager', departmentId: deptHR._id });
    const desAdmin = await Designation.create({ designationName: 'System Administrator', departmentId: deptHR._id });

    console.log('Seeding Users...');
    const salt = await bcrypt.genSalt(10);
    const getHash = async (pass) => await bcrypt.hash(pass, salt);

    // 1. Admin
    const userAdmin = await User.create({
      employeeCode: 'EMP001',
      firstName: 'Alok',
      lastName: 'Sharma',
      email: 'admin@epts.com',
      mobile: '9876543210',
      passwordHash: await getHash('AdminPass123!'),
      departmentId: deptHR._id,
      designationId: desAdmin._id,
      managerId: null,
      joiningDate: new Date('2024-01-10'),
      employmentStatus: 'active',
      role: 'admin'
    });

    // 2. HR Manager
    const userHR = await User.create({
      employeeCode: 'EMP002',
      firstName: 'Riddhi',
      lastName: 'Patel',
      email: 'hr@epts.com',
      mobile: '9876543211',
      passwordHash: await getHash('HrPass123!'),
      departmentId: deptHR._id,
      designationId: desHR._id,
      managerId: null,
      joiningDate: new Date('2024-03-15'),
      employmentStatus: 'active',
      role: 'hr'
    });

    // 3. Engineering Manager
    const userMgrEng = await User.create({
      employeeCode: 'EMP003',
      firstName: 'Girish',
      lastName: 'Gajjar',
      email: 'manager1@epts.com',
      mobile: '9876543212',
      passwordHash: await getHash('ManagerPass123!'),
      departmentId: deptEng._id,
      designationId: desEM._id,
      managerId: null,
      joiningDate: new Date('2023-06-01'),
      employmentStatus: 'active',
      role: 'manager'
    });

    // 4. Sales Manager
    const userMgrSales = await User.create({
      employeeCode: 'EMP004',
      firstName: 'Sanjay',
      lastName: 'Shah',
      email: 'manager2@epts.com',
      mobile: '9876543213',
      passwordHash: await getHash('ManagerPass123!'),
      departmentId: deptSales._id,
      designationId: desSM._id,
      managerId: null,
      joiningDate: new Date('2023-08-20'),
      employmentStatus: 'active',
      role: 'manager'
    });

    // 5. Software Engineers (reporting to MgrEng)
    const userDev1 = await User.create({
      employeeCode: 'EMP005',
      firstName: 'Dhrumil',
      lastName: 'Shah',
      email: 'dev1@epts.com',
      mobile: '9876543214',
      passwordHash: await getHash('EmpPass123!'),
      departmentId: deptEng._id,
      designationId: desSSE._id,
      managerId: userMgrEng._id,
      joiningDate: new Date('2025-01-05'),
      employmentStatus: 'active',
      role: 'employee'
    });

    const userDev2 = await User.create({
      employeeCode: 'EMP006',
      firstName: 'Parth',
      lastName: 'Mehta',
      email: 'dev2@epts.com',
      mobile: '9876543215',
      passwordHash: await getHash('EmpPass123!'),
      departmentId: deptEng._id,
      designationId: desSE._id,
      managerId: userMgrEng._id,
      joiningDate: new Date('2025-05-12'),
      employmentStatus: 'active',
      role: 'employee'
    });

    // 6. Sales Executive (reporting to MgrSales)
    const userSales1 = await User.create({
      employeeCode: 'EMP007',
      firstName: 'Ankit',
      lastName: 'Desai',
      email: 'sales1@epts.com',
      mobile: '9876543216',
      passwordHash: await getHash('EmpPass123!'),
      departmentId: deptSales._id,
      designationId: desSE_Sales._id,
      managerId: userMgrSales._id,
      joiningDate: new Date('2025-02-18'),
      employmentStatus: 'active',
      role: 'employee'
    });

    console.log('Seeding KPI Templates...');
    // Create Org-wide KPI template
    const templateOrg = await KpiTemplate.create({
      templateName: 'Organization Core KPI Template',
      departmentId: null,
      status: 'active',
      createdBy: userHR._id,
      items: [
        { kpiName: 'Attendance & Timeliness', category: 'productivity', weight: 1, description: 'Reports to work on time and adheres to schedules.' },
        { kpiName: 'Team Integration', category: 'communication', weight: 1, description: 'Cooperates well with coworkers across teams.' },
        { kpiName: 'Reliability', category: 'ownership', weight: 1, description: 'Takes responsibility for assigned tasks and works independently.' }
      ]
    });

    // Create Engineering specific KPI template
    const templateEng = await KpiTemplate.create({
      templateName: 'Engineering Performance Template',
      departmentId: deptEng._id,
      status: 'active',
      createdBy: userHR._id,
      items: [
        { kpiName: 'Code Quality', category: 'quality', weight: 2, description: 'Writes clean, robust, and commented code with minimal bugs.' },
        { kpiName: 'Sprint Delivery Velocity', category: 'productivity', weight: 1.5, description: 'Completes assigned Jira tasks within sprints.' },
        { kpiName: 'Problem Solving & System Design', category: 'technical', weight: 2, description: 'Identifies core technical issues and designs scalable solutions.' },
        { kpiName: 'Technical Mentorship', category: 'communication', weight: 1, description: 'Helps junior devs and reviews pull requests.' },
        { kpiName: 'DevOps & CI/CD Ownership', category: 'ownership', weight: 1.5, description: 'Takes ownership of release pipelines and monitoring alerts.' },
        { kpiName: 'Self Learning & Up-skilling', category: 'learning', weight: 1, description: 'Learns and implements new tools, frameworks or architectures.' }
      ]
    });

    console.log('Seeding Review Cycles...');
    
    // Past closed cycle (June 2026)
    const cycleJune = await ReviewCycle.create({
      reviewMonth: '2026-06',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-30'),
      status: 'closed',
      kpiTemplateId: templateEng._id
    });

    // Current active cycle (July 2026)
    const cycleJuly = await ReviewCycle.create({
      reviewMonth: '2026-07',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-07-31'),
      status: 'active',
      kpiTemplateId: templateEng._id
    });

    console.log('Seeding June 2026 Mock Review Scores...');
    // Seed completed June reviews for Dev1
    const juneSelfAss = await SelfAssessment.create({
      reviewCycleId: cycleJune._id,
      employeeId: userDev1._id,
      status: 'submitted',
      submittedAt: new Date('2026-06-25'),
      details: templateEng.items.map(item => ({
        category: item.category,
        kpiItemId: item._id.toString(),
        score: 4,
        comment: 'Satisfactory performance in June.'
      }))
    });

    const juneManagerRev = await ManagerReview.create({
      reviewCycleId: cycleJune._id,
      employeeId: userDev1._id,
      managerId: userMgrEng._id,
      status: 'submitted',
      submittedAt: new Date('2026-06-28'),
      details: templateEng.items.map(item => ({
        category: item.category,
        kpiItemId: item._id.toString(),
        score: item.category === 'quality' ? 5 : item.category === 'technical' ? 4 : 3,
        comment: 'Great software standards, communicates well.'
      }))
    });

    // Calculate score for June (Quality=5 (avg 5), Technical=4 (avg 4), others average 3)
    // Formula weight sum: quality=5*0.25 (1.25), productivity=3*0.20 (0.60), technical=4*0.20 (0.80),
    // communication=3*0.10 (0.30), ownership=3*0.15 (0.45), learning=3*0.10 (0.30)
    // Weighted Sum = 1.25 + 0.60 + 0.80 + 0.30 + 0.45 + 0.30 = 3.70
    // Normalized active weights sum: 0.25+0.20+0.20+0.10+0.15+0.10 = 1.0
    // Final score = 3.70 (Meets Expectations)
    await ReviewScore.create({
      reviewCycleId: cycleJune._id,
      employeeId: userDev1._id,
      categoryScores: {
        workQuality: 5,
        productivity: 3,
        technical: 4,
        communication: 3,
        ownership: 3,
        learning: 3
      },
      finalScore: 3.70,
      rating: 'Meets Expectations',
      calculatedAt: new Date('2026-06-28')
    });

    console.log('Seeding July 2026 Active Cycle Assessments (Draft/Submitted)...');
    
    // Dev1 (Dhrumil) has submitted self-assessment for July, manager review is pending
    await SelfAssessment.create({
      reviewCycleId: cycleJuly._id,
      employeeId: userDev1._id,
      status: 'submitted',
      submittedAt: new Date('2026-07-15'),
      details: templateEng.items.map(item => ({
        category: item.category,
        kpiItemId: item._id.toString(),
        score: item.category === 'quality' ? 5 : 4,
        comment: 'Did solid work in July.'
      }))
    });

    // Dev2 (Parth) has a draft self-assessment
    await SelfAssessment.create({
      reviewCycleId: cycleJuly._id,
      employeeId: userDev2._id,
      status: 'draft',
      details: templateEng.items.map(item => ({
        category: item.category,
        kpiItemId: item._id.toString(),
        score: 3,
        comment: ''
      }))
    });

    // Seed notifications
    await Notification.create({
      userId: userDev1._id,
      type: 'review_assigned',
      message: 'A new performance review cycle has been started for 2026-07. Please complete your self-assessment.'
    });

    await Notification.create({
      userId: userMgrEng._id,
      type: 'assessment_pending',
      message: 'Dhrumil Shah has submitted their self-assessment for 2026-07. Please complete your manager review.'
    });

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding database error:', error);
    process.exit(1);
  }
};

seedDB();
