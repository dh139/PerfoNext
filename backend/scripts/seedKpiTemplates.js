require('dotenv').config();
const mongoose = require('mongoose');

const Department = require('../models/Department');
const User = require('../models/User');
const KpiTemplate = require('../models/KpiTemplate');

const kpiTemplatesData = [
  {
    deptName: 'Engineering',
    templateName: 'Engineering Performance Template',
    items: [
      { category: 'quality', kpiName: 'Code Quality & Robustness', description: 'Writes clean, well-commented, unit-tested code with minimal production bug regressions.', weight: 2.0 },
      { category: 'productivity', kpiName: 'Sprint Delivery Velocity', description: 'Completes assigned Jira sprint tasks and backlog items on schedule.', weight: 1.5 },
      { category: 'technical', kpiName: 'Problem Solving & System Design', description: 'Identifies core technical issues and designs scalable system architecture.', weight: 2.0 },
      { category: 'communication', kpiName: 'Technical Communication & PR Reviews', description: 'Provides constructive pull request reviews and communicates blockers effectively.', weight: 1.0 },
      { category: 'ownership', kpiName: 'DevOps & CI/CD Ownership', description: 'Takes ownership of build pipelines, deployment stability, and monitoring.', weight: 1.5 },
      { category: 'learning', kpiName: 'Technical Upskilling & Certifications', description: 'Learns new frameworks, completes LMS courses, and shares knowledge with team.', weight: 1.0 }
    ]
  },
  {
    deptName: 'Sales',
    templateName: 'Sales & BD Performance Template',
    items: [
      { category: 'quality', kpiName: 'Deal Quality & Margin', description: 'Closes high-value contracts with favorable profit margins.', weight: 2.5 },
      { category: 'productivity', kpiName: 'Sales Target Quotas', description: 'Meets or exceeds quarterly revenue quotas.', weight: 2.0 },
      { category: 'technical', kpiName: 'Product Technical Demos', description: 'Demonstrates deep product knowledge during client presentations.', weight: 1.5 },
      { category: 'communication', kpiName: 'Client Relationship Communication', description: 'Maintains responsive, professional communication with enterprise clients.', weight: 1.0 },
      { category: 'ownership', kpiName: 'Account Ownership & Retention', description: 'Takes end-to-end responsibility for client satisfaction and renewals.', weight: 1.5 },
      { category: 'learning', kpiName: 'Sales Methodology Growth', description: 'Adopts modern consultative sales techniques and completes L&D modules.', weight: 1.0 }
    ]
  },
  {
    deptName: 'Human Resources',
    templateName: 'HR & Operations Template',
    items: [
      { category: 'quality', kpiName: 'Talent Acquisition Quality', description: 'Recruits high-quality candidates matching culture and technical requirements.', weight: 2.0 },
      { category: 'productivity', kpiName: 'Time-to-Hire & Onboarding', description: 'Fills open positions promptly and executes smooth employee onboarding.', weight: 1.5 },
      { category: 'technical', kpiName: 'HRIS System Management', description: 'Maintains accurate employee database records and compliance tracking.', weight: 1.5 },
      { category: 'communication', kpiName: 'Employee Relations & Engagement', description: 'Fosters positive workplace culture and resolves employee grievances.', weight: 1.5 },
      { category: 'ownership', kpiName: 'HR Policy Compliance Ownership', description: 'Ensures full compliance with labor laws and organizational policies.', weight: 1.5 },
      { category: 'learning', kpiName: 'L&D Program Development', description: 'Organizes internal training programs and skill growth initiatives.', weight: 1.0 }
    ]
  },
  {
    deptName: 'Marketing',
    templateName: 'Marketing & Brand Strategy Template',
    items: [
      { category: 'productivity', kpiName: 'Campaign Generation & Leads', description: 'Executes digital marketing campaigns to drive inbound lead acquisition.', weight: 2.0 },
      { category: 'quality', kpiName: 'Brand Consistency & Design', description: 'Ensures all brand collaterals meet top aesthetic standards.', weight: 1.5 },
      { category: 'communication', kpiName: 'Content Strategy & Outreach', description: 'Publishes engaging blogs, social media posts, and press releases.', weight: 1.5 },
      { category: 'ownership', kpiName: 'Marketing ROI & Analytics', description: 'Tracks CPC, CAC, and conversion metrics to optimize ad spending.', weight: 1.5 }
    ]
  },
  {
    deptName: 'Finance & Accounts',
    templateName: 'Finance & Compliance Template',
    items: [
      { category: 'quality', kpiName: 'Financial Accuracy & Reporting', description: 'Prepares accurate monthly financial statements and tax filings.', weight: 2.5 },
      { category: 'productivity', kpiName: 'Payroll & Vendor Processing', description: 'Processes payroll and vendor invoices without delays.', weight: 1.5 },
      { category: 'ownership', kpiName: 'Budget Oversight & Audit', description: 'Monitors departmental budgets and assists in financial audits.', weight: 2.0 }
    ]
  },
  {
    deptName: 'Product Management',
    templateName: 'Product Strategy & Roadmap Template',
    items: [
      { category: 'productivity', kpiName: 'Product Feature Delivery', description: 'Delivers roadmap epics and features on time with engineering team.', weight: 2.0 },
      { category: 'quality', kpiName: 'User Experience & Satisfaction', description: 'Conducts user research to maintain high NPS and product adoption.', weight: 2.0 },
      { category: 'technical', kpiName: 'PRD & Feature Specification', description: 'Writes clear, detailed Product Requirement Documents (PRDs).', weight: 1.5 }
    ]
  },
  {
    deptName: 'Administration',
    templateName: 'IT Infrastructure & Support Template',
    items: [
      { category: 'productivity', kpiName: 'IT Ticket Resolution Time', description: 'Resolves hardware, network, and access tickets promptly.', weight: 2.0 },
      { category: 'ownership', kpiName: 'System Security & Uptime', description: 'Maintains server uptime and executes security patch management.', weight: 2.5 }
    ]
  }
];

const seedKpisOnly = async () => {
  try {
    console.log('Connecting to database...');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/epts';
    await mongoose.connect(mongoUri);
    console.log('Connected. Seeding KPI Templates...\n');

    await KpiTemplate.deleteMany({});

    const admin = await User.findOne({ role: 'admin' });
    let createdCount = 0;

    for (const tpl of kpiTemplatesData) {
      let dept = await Department.findOne({ departmentName: tpl.deptName });

      await KpiTemplate.create({
        templateName: tpl.templateName,
        departmentId: dept ? dept._id : null,
        status: 'active',
        createdBy: admin ? admin._id : null,
        items: tpl.items
      });

      console.log(`[+] Created KPI Template: ${tpl.templateName} (${tpl.deptName})`);
      createdCount++;
    }

    // Also create a General Default KPI Template applicable for all departments
    await KpiTemplate.create({
      templateName: 'General Employee Performance Template',
      departmentId: null,
      status: 'active',
      createdBy: admin ? admin._id : null,
      items: [
        { category: 'quality', kpiName: 'Work Quality & Attention to Detail', description: 'Delivers accurate and high-quality outputs consistently.', weight: 2.0 },
        { category: 'productivity', kpiName: 'Task Execution & Timeliness', description: 'Completes assigned work within established deadlines.', weight: 2.0 },
        { category: 'communication', kpiName: 'Teamwork & Communication', description: 'Collaborates effectively with cross-functional team members.', weight: 1.5 },
        { category: 'ownership', kpiName: 'Accountability & Initiative', description: 'Takes ownership of responsibilities and proactively addresses challenges.', weight: 1.5 }
      ]
    });
    console.log(`[+] Created KPI Template: General Employee Performance Template (All Departments)`);
    createdCount++;

    console.log(`\n==================================================`);
    console.log(` SUCCESS: Seeded ${createdCount} KPI Templates!`);
    console.log(`==================================================\n`);

    process.exit(0);
  } catch (error) {
    console.error('KPI seeding failed:', error);
    process.exit(1);
  }
};

seedKpisOnly();
