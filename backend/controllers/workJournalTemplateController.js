const WorkJournalTemplate = require('../models/WorkJournalTemplate');
const Department = require('../models/Department');
const mongoose = require('mongoose');

const getSmartDefaultsForDepartment = (deptName = '') => {
  const name = deptName.toLowerCase();

  if (name.includes('sales') || name.includes('business dev')) {
    return {
      titlePlaceholder: 'e.g. Conducted product demo & sent proposal to Acme Corp',
      projectLabel: 'Client / Account Name',
      projectPlaceholder: 'e.g. Acme Corp Account',
      evidenceRefLabel: 'Proof Link / Deal Ref',
      evidenceRefPlaceholder: 'e.g. Quote #891 or CRM Link',
      evidenceTypes: [
        'Client Email / Approval',
        'Signed Proposal / Contract',
        'CRM Opportunity Link',
        'Screenshot Upload',
        'Document / Presentation Link'
      ],
      categories: [
        { name: 'Client Meeting & Demo', description: 'Pitching or demoing to prospects' },
        { name: 'Lead Qualification & Call', description: 'Cold or warm outbound/inbound calls' },
        { name: 'Proposal & Quote Submitted', description: 'Formal commercial proposal sent' },
        { name: 'Deal Closing & Contract', description: 'Signed contract or closed-won deal' },
        { name: 'Client Follow-up & Nurturing', description: 'Ongoing client communication' },
        { name: 'Account Management', description: 'Upselling, renewals, or relationship management' },
        { name: 'Market Research', description: 'Competitor or market analysis' }
      ],
      customFields: [
        { label: 'Client / Company Name', fieldKey: 'clientName', fieldType: 'text', placeholder: 'e.g. Acme Corp', required: false },
        { label: 'Deal Value ($)', fieldKey: 'dealValue', fieldType: 'number', placeholder: 'e.g. 5000', required: false },
        { label: 'Lead / Deal Stage', fieldKey: 'dealStage', fieldType: 'select', options: ['Prospecting', 'Qualified', 'Proposal Sent', 'Closed Won', 'Closed Lost'], required: false }
      ]
    };
  }

  if (name.includes('market')) {
    return {
      titlePlaceholder: 'e.g. Launched Q3 LinkedIn Ad Campaign & Generated 120 Leads',
      projectLabel: 'Campaign / Channel',
      projectPlaceholder: 'e.g. Q3 Growth Campaign',
      evidenceRefLabel: 'Proof Link / Asset URL',
      evidenceRefPlaceholder: 'e.g. Dashboard Link or Asset URL',
      evidenceTypes: [
        'Campaign Dashboard Link',
        'Social Media Post / Creative Link',
        'Lead Export / Analytics',
        'Screenshot Upload',
        'Document Link'
      ],
      categories: [
        { name: 'Campaign Execution', description: 'Running ad or outreach campaign' },
        { name: 'Content & Graphic Creation', description: 'Blog, video, copy, or social design' },
        { name: 'SEO & Website Analytics', description: 'On-page, keyword, or traffic optimization' },
        { name: 'Social Media Engagement', description: 'LinkedIn, Twitter, or Meta posts' },
        { name: 'Ad Spend & Lead Gen', description: 'PPC or paid campaign management' },
        { name: 'Brand Strategy & PR', description: 'Press release or partner marketing' }
      ],
      customFields: [
        { label: 'Campaign Name', fieldKey: 'campaignName', fieldType: 'text', placeholder: 'e.g. Q3 Growth Launch', required: false },
        { label: 'Leads / Reach Generated', fieldKey: 'leadsGenerated', fieldType: 'text', placeholder: 'e.g. 150 MQLs / +12% CTR', required: false }
      ]
    };
  }

  if (name.includes('finance') || name.includes('account')) {
    return {
      titlePlaceholder: 'e.g. Completed July Tax Filing & Invoice Audit',
      projectLabel: 'Account / Ledger',
      projectPlaceholder: 'e.g. Q3 Tax Reconciliation',
      evidenceRefLabel: 'Proof Link / Invoice Ref',
      evidenceRefPlaceholder: 'e.g. INV-2026-99 or Receipt URL',
      evidenceTypes: [
        'Voucher / Invoice Copy',
        'Bank Reconciliation / Receipt',
        'ERP / Accounting Entry',
        'Screenshot Upload',
        'Document Link'
      ],
      categories: [
        { name: 'Invoice Audit & Processing', description: 'Processing client/vendor invoices' },
        { name: 'Tax & Statutory Compliance', description: 'GST, TDS, or tax filing' },
        { name: 'Payroll Execution', description: 'Salary disbursement or benefit calculation' },
        { name: 'Budgeting & Forecasting', description: 'Department budget analysis' },
        { name: 'Financial Reporting & Audit', description: 'P&L, Balance Sheet, or Audit prep' },
        { name: 'Vendor & Payment Reconciliation', description: 'Bank or vendor ledger reconciliation' }
      ],
      customFields: [
        { label: 'Voucher / Invoice Reference', fieldKey: 'voucherNo', fieldType: 'text', placeholder: 'e.g. INV-2026-88', required: false },
        { label: 'Transaction Amount ($)', fieldKey: 'transactionAmount', fieldType: 'number', placeholder: 'e.g. 1250.00', required: false }
      ]
    };
  }

  if (name.includes('human') || name.includes('hr')) {
    return {
      titlePlaceholder: 'e.g. Conducted 4 Tech Interviews & Onboarded 2 Senior Engineers',
      projectLabel: 'HR Initiative / Role',
      projectPlaceholder: 'e.g. Tech Hiring Q3',
      evidenceRefLabel: 'Proof Link / Doc Ref',
      evidenceRefPlaceholder: 'e.g. Candidate File or Offer Doc',
      evidenceTypes: [
        'Interview Rating Sheet / Form',
        'Offer Letter / Onboarding Doc',
        'Policy Document',
        'Screenshot Upload',
        'Email Approval'
      ],
      categories: [
        { name: 'Recruitment & Interviewing', description: 'Sourcing, screening, or interview' },
        { name: 'Employee Onboarding', description: 'New joiner paperwork and orientation' },
        { name: 'Performance & Review Desk', description: 'Appraisal cycle management' },
        { name: 'Employee Engagement', description: 'Culture, events, or satisfaction' },
        { name: 'Policy & Compliance', description: 'HR policy update or legal audit' },
        { name: 'Training & L&D', description: 'Employee upskilling initiatives' }
      ],
      customFields: [
        { label: 'Candidate / Employee Name', fieldKey: 'targetEmployee', fieldType: 'text', placeholder: 'e.g. Rahul Sharma', required: false },
        { label: 'Cases / Positions Processed', fieldKey: 'casesProcessed', fieldType: 'number', placeholder: 'e.g. 3', required: false }
      ]
    };
  }

  if (name.includes('support') || name.includes('customer success')) {
    return {
      titlePlaceholder: 'e.g. Resolved 15 Priority-1 Escalations with zero SLA breach',
      projectLabel: 'Customer Account',
      projectPlaceholder: 'e.g. Enterprise Account Support',
      evidenceRefLabel: 'Proof Link / Ticket ID',
      evidenceRefPlaceholder: 'e.g. TICKET-9921 or Zendesk Link',
      evidenceTypes: [
        'Zendesk / Ticket Link',
        'Client Chat Transcript',
        'Call Recording / Summary',
        'Screenshot Upload',
        'KB Article Link'
      ],
      categories: [
        { name: 'Ticket Resolution', description: 'Handling support tickets' },
        { name: 'Customer Call & Onboarding', description: 'Client training or help call' },
        { name: 'Escalation Handling', description: 'Critical issue escalation' },
        { name: 'KB Article Creation', description: 'Help documentation' },
        { name: 'SLA Monitoring', description: 'Queue and SLA management' }
      ],
      customFields: [
        { label: 'Ticket / Case ID', fieldKey: 'ticketId', fieldType: 'text', placeholder: 'e.g. TICKET-9941', required: false },
        { label: 'Customer Account', fieldKey: 'customerAccount', fieldType: 'text', placeholder: 'e.g. Globex Inc', required: false }
      ]
    };
  }

  if (name.includes('operation')) {
    return {
      titleLabel: 'Operational Task',
      titlePlaceholder: 'e.g. Inspected facility hardware & updated inventory logs',
      projectLabel: 'Location / Facility',
      projectPlaceholder: 'e.g. Head Office - Server Room',
      summaryLabel: 'Task Result & Outcome',
      summaryPlaceholder: 'Summarize maintenance outcome, audits, or logistics...',
      evidenceRefLabel: 'Supporting Document / Report',
      evidenceRefPlaceholder: 'e.g. Audit Form URL or Photo Link',
      evidenceTypes: [
        'Inspection Report',
        'Log Sheet',
        'Inventory Slip',
        'Screenshot Upload',
        'Document Link'
      ],
      categories: [
        { name: 'Facility Management', description: 'Office and server room maintenance' },
        { name: 'Hardware & Asset Logistics', description: 'Asset deployment and inventory' },
        { name: 'Vendor Operations', description: 'Managing third-party contractors' },
        { name: 'Process Audit', description: 'Internal operations audit' },
        { name: 'Security & Safety', description: 'Safety inspection and compliance' }
      ],
      customFields: [
        { label: 'Target Department', fieldKey: 'targetDepartment', fieldType: 'text', placeholder: 'e.g. IT Infrastructure', required: false },
        { label: 'Issues / Defect Identified', fieldKey: 'issuesIdentified', fieldType: 'text', placeholder: 'e.g. AC cooling leak in rack B', required: false }
      ]
    };
  }

  // Default Engineering / Operations Preserved
  return {
    titleLabel: 'Achievement Title',
    titlePlaceholder: 'e.g. Registered authentication module API routes',
    projectLabel: 'Project / Module',
    projectPlaceholder: 'e.g. Payroll System',
    summaryLabel: 'Work Summary & Output Result',
    summaryPlaceholder: 'Summarize deliverables, defects solved, or business result achieved...',
    evidenceRefLabel: 'Proof Link / PR ID',
    evidenceRefPlaceholder: 'e.g. PR#142 or GitHub URL',
    evidenceTypes: [
      'Screenshot Upload',
      'Github PR / Commit',
      'Jira / Task Ticket',
      'Document / Doc Link',
      'Client Email / Approval'
    ],
    categories: [
      { name: 'Development', description: 'Feature coding & implementation' },
      { name: 'Testing', description: 'Unit, integration, or manual testing' },
      { name: 'Bug Fix', description: 'Defect triage and resolution' },
      { name: 'Architecture & System Design', description: 'Technical design & schema' },
      { name: 'Code Review', description: 'PR reviewing and feedback' },
      { name: 'Documentation', description: 'API or system documentation' },
      { name: 'Deployment & DevOps', description: 'CI/CD, release, infrastructure' },
      { name: 'Process Improvement', description: 'Workflow & tooling optimization' },
      { name: 'Other', description: 'Miscellaneous tasks' }
    ],
    customFields: []
  };
};

// GET /api/work-journal-templates/department/:departmentId
const getTemplateByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;
    if (!departmentId || !mongoose.isValidObjectId(departmentId)) {
      return res.status(400).json({ message: 'Invalid department ID format.' });
    }

    const dept = await Department.findById(departmentId);
    if (!dept) {
      return res.status(404).json({ message: 'Department not found.' });
    }

    const existingTemplate = await WorkJournalTemplate.findOne({ departmentId }).populate('departmentId', 'departmentName');
    if (existingTemplate) {
      return res.json(existingTemplate);
    }

    // Generate Smart Default for this department
    const defaults = getSmartDefaultsForDepartment(dept.departmentName);
    res.json({
      _id: `default-${dept._id}`,
      departmentId: dept,
      formTitle: `${dept.departmentName} Daily Work Journal`,
      formDescription: `Custom work log questions configured for the ${dept.departmentName} team.`,
      titlePlaceholder: defaults.titlePlaceholder,
      projectLabel: defaults.projectLabel,
      projectPlaceholder: defaults.projectPlaceholder,
      evidenceRefLabel: defaults.evidenceRefLabel,
      evidenceRefPlaceholder: defaults.evidenceRefPlaceholder,
      evidenceTypes: defaults.evidenceTypes,
      categories: defaults.categories,
      customFields: defaults.customFields,
      isDefault: true,
      isActive: true
    });
  } catch (error) {
    console.error('getTemplateByDepartment error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/work-journal-templates
const getAllTemplates = async (req, res) => {
  try {
    const departments = await Department.find({ isActive: { $ne: false } }).sort({ departmentName: 1 });
    const templates = await WorkJournalTemplate.find().populate('departmentId', 'departmentName');
    
    const templateMap = new Map();
    templates.forEach(t => {
      if (t.departmentId?._id) {
        templateMap.set(t.departmentId._id.toString(), t);
      }
    });

    const result = departments.map(d => {
      const existing = templateMap.get(d._id.toString());
      if (existing) {
        return existing;
      }
      const defaults = getSmartDefaultsForDepartment(d.departmentName);
      return {
        _id: `default-${d._id}`,
        departmentId: d,
        formTitle: `${d.departmentName} Daily Work Journal`,
        formDescription: `Custom work log questions configured for the ${d.departmentName} team.`,
        titlePlaceholder: defaults.titlePlaceholder,
        projectLabel: defaults.projectLabel,
        projectPlaceholder: defaults.projectPlaceholder,
        evidenceRefLabel: defaults.evidenceRefLabel,
        evidenceRefPlaceholder: defaults.evidenceRefPlaceholder,
        evidenceTypes: defaults.evidenceTypes,
        categories: defaults.categories,
        customFields: defaults.customFields,
        isDefault: true,
        isActive: true
      };
    });

    res.json(result);
  } catch (error) {
    console.error('getAllTemplates error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// POST /api/work-journal-templates (Create or Update)
const saveTemplate = async (req, res) => {
  try {
    if (req.user.role !== 'executive' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only the CEO can manage Daily Work Log Templates.' });
    }

    const {
      departmentId,
      formTitle,
      formDescription,
      titleLabel,
      titlePlaceholder,
      projectLabel,
      projectPlaceholder,
      summaryLabel,
      summaryPlaceholder,
      evidenceRefLabel,
      evidenceRefPlaceholder,
      evidenceTypes,
      categories,
      customFields,
      isActive
    } = req.body;

    if (!departmentId || !mongoose.isValidObjectId(departmentId)) {
      return res.status(400).json({ message: 'Valid departmentId is required.' });
    }

    const dept = await Department.findById(departmentId);
    if (!dept) {
      return res.status(404).json({ message: 'Department not found.' });
    }

    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ message: 'At least one category is required for the form template.' });
    }

    // Clean customFields keys
    const processedFields = (customFields || []).map((f, idx) => ({
      label: f.label || `Custom Field ${idx + 1}`,
      fieldKey: (f.fieldKey || f.label || `field_${idx + 1}`).toLowerCase().replace(/[^a-z0-9]/g, '_'),
      fieldType: ['text', 'number', 'select', 'url', 'textarea'].includes(f.fieldType) ? f.fieldType : 'text',
      options: Array.isArray(f.options) ? f.options.filter(Boolean) : [],
      placeholder: f.placeholder || '',
      required: !!f.required
    }));

    const defaults = getSmartDefaultsForDepartment(dept.departmentName);

    const templateData = {
      departmentId,
      formTitle: formTitle || `${dept.departmentName} Daily Work Journal`,
      formDescription: formDescription || '',
      titleLabel: titleLabel || 'Achievement Title',
      titlePlaceholder: titlePlaceholder || '',
      projectLabel: projectLabel || 'Project / Account',
      projectPlaceholder: projectPlaceholder || '',
      summaryLabel: summaryLabel || 'Work Summary & Output Result',
      summaryPlaceholder: summaryPlaceholder || '',
      evidenceRefLabel: evidenceRefLabel || 'Proof Link / Reference ID',
      evidenceRefPlaceholder: evidenceRefPlaceholder || '',
      evidenceTypes: Array.isArray(evidenceTypes) && evidenceTypes.length > 0 ? evidenceTypes.filter(Boolean) : defaults.evidenceTypes,
      categories: categories.map(c => ({ name: c.name || c, description: c.description || '' })),
      customFields: processedFields,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user._id
    };

    const updated = await WorkJournalTemplate.findOneAndUpdate(
      { departmentId },
      templateData,
      { new: true, upsert: true, runValidators: true }
    ).populate('departmentId', 'departmentName');

    res.status(200).json(updated);
  } catch (error) {
    console.error('saveTemplate error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// DELETE /api/work-journal-templates/:id (Revert to default)
const deleteTemplate = async (req, res) => {
  try {
    if (req.user.role !== 'executive' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only the CEO can reset Daily Work Log Templates.' });
    }

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid template ID format.' });
    }

    await WorkJournalTemplate.findByIdAndDelete(id);
    res.json({ message: 'Work journal template reset to default successfully.' });
  } catch (error) {
    console.error('deleteTemplate error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = {
  getTemplateByDepartment,
  getAllTemplates,
  saveTemplate,
  deleteTemplate
};
