require('dotenv').config();
const mongoose = require('mongoose');

const Department = require('../models/Department');
const User = require('../models/User');
const KpiTemplate = require('../models/KpiTemplate');

const seedKpisOnly = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/epts');
    console.log('Connected. Seeding KPI Templates...');

    await KpiTemplate.deleteMany({});

    const admin = await User.findOne({ role: 'admin' });
    const deptEng = await Department.findOne({ departmentName: 'Engineering' });
    const deptSales = await Department.findOne({ departmentName: 'Sales' });
    const deptHR = await Department.findOne({ departmentName: 'Human Resources' });

    // 1. Engineering KPI Template
    await KpiTemplate.create({
      templateName: 'Engineering Performance Template',
      departmentId: deptEng?._id || null,
      status: 'active',
      createdBy: admin?._id || null,
      items: [
        {
          category: 'quality',
          kpiName: 'Code Quality & Robustness',
          description: 'Writes clean, well-commented, unit-tested code with minimal production bug regressions.',
          weight: 2.0
        },
        {
          category: 'productivity',
          kpiName: 'Sprint Delivery Velocity',
          description: 'Completes assigned Jira sprint tasks and backlog items on schedule.',
          weight: 1.5
        },
        {
          category: 'technical',
          kpiName: 'Problem Solving & System Design',
          description: 'Identifies core technical issues and designs scalable system architecture.',
          weight: 2.0
        },
        {
          category: 'communication',
          kpiName: 'Technical Communication & PR Reviews',
          description: 'Provides constructive pull request reviews and communicates blockers effectively.',
          weight: 1.0
        },
        {
          category: 'ownership',
          kpiName: 'DevOps & CI/CD Ownership',
          description: 'Takes ownership of build pipelines, deployment stability, and monitoring.',
          weight: 1.5
        },
        {
          category: 'learning',
          kpiName: 'Technical Upskilling & Certifications',
          description: 'Learns new frameworks, completes LMS courses, and shares knowledge with team.',
          weight: 1.0
        }
      ]
    });

    // 2. Sales KPI Template
    if (deptSales) {
      await KpiTemplate.create({
        templateName: 'Sales & BD Performance Template',
        departmentId: deptSales._id,
        status: 'active',
        createdBy: admin?._id || null,
        items: [
          {
            category: 'quality',
            kpiName: 'Deal Quality & Margin',
            description: 'Closes high-value contracts with favorable profit margins.',
            weight: 2.5
          },
          {
            category: 'productivity',
            kpiName: 'Sales Target Quotas',
            description: 'Meets or exceeds quarterly revenue quotas.',
            weight: 2.0
          },
          {
            category: 'technical',
            kpiName: 'Product Technical Demos',
            description: 'Demonstrates deep product knowledge during client presentations.',
            weight: 1.5
          },
          {
            category: 'communication',
            kpiName: 'Client Relationship Communication',
            description: 'Maintains responsive, professional communication with enterprise clients.',
            weight: 1.0
          },
          {
            category: 'ownership',
            kpiName: 'Account Ownership & Retention',
            description: 'Takes end-to-end responsibility for client satisfaction and renewals.',
            weight: 1.5
          },
          {
            category: 'learning',
            kpiName: 'Sales Methodology Growth',
            description: 'Adopts modern consultative sales techniques and completes L&D modules.',
            weight: 1.0
          }
        ]
      });
    }

    // 3. HR Operations Template
    if (deptHR) {
      await KpiTemplate.create({
        templateName: 'HR & Operations Template',
        departmentId: deptHR._id,
        status: 'active',
        createdBy: admin?._id || null,
        items: [
          {
            category: 'quality',
            kpiName: 'Talent Acquisition Quality',
            description: 'Recruits high-quality candidates matching culture and technical requirements.',
            weight: 2.0
          },
          {
            category: 'productivity',
            kpiName: 'Time-to-Hire & Onboarding',
            description: 'Fills open positions promptly and executes smooth employee onboarding.',
            weight: 1.5
          },
          {
            category: 'technical',
            kpiName: 'HRIS System Management',
            description: 'Maintains accurate employee database records and compliance tracking.',
            weight: 1.5
          },
          {
            category: 'communication',
            kpiName: 'Employee Relations & Engagement',
            description: 'Fosters positive workplace culture and resolves employee grievances.',
            weight: 1.5
          },
          {
            category: 'ownership',
            kpiName: 'HR Policy Compliance Ownership',
            description: 'Ensures full compliance with labor laws and organizational policies.',
            weight: 1.5
          },
          {
            category: 'learning',
            kpiName: 'L&D Program Development',
            description: 'Organizes internal training programs and skill growth initiatives.',
            weight: 1.0
          }
        ]
      });
    }

    const templateCount = await KpiTemplate.countDocuments();
    console.log(`Success! Restored and seeded ${templateCount} KPI Templates.`);
    process.exit(0);
  } catch (error) {
    console.error('KPI seeding failed:', error);
    process.exit(1);
  }
};

seedKpisOnly();
