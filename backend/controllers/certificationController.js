const Certification = require('../models/Certification');
const ReviewCycle = require('../models/ReviewCycle');
const AIReport = require('../models/AIReport');
const User = require('../models/User');
const fs = require('fs');
const pdf = require('pdf-parse');

const getCertifications = async (req, res) => {
  try {
    const employeeId = req.query.employeeId || req.user.id;

    // Enforce role boundary
    if (req.user.role === 'employee' && employeeId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const certs = await Certification.find({ employeeId }).sort('-createdAt');
    res.json(certs);
  } catch (error) {
    console.error('getCertifications error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const uploadCertification = async (req, res) => {
  try {
    const { name, issuer, issueDate, expiryDate, employeeId } = req.body;
    const targetEmployeeId = employeeId || req.user.id;

    if (!name || !issuer || !issueDate) {
      return res.status(400).json({ message: 'name, issuer, and issueDate are required.' });
    }

    // Role check: employees can only upload for themselves
    if (req.user.role === 'employee' && targetEmployeeId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // Check for duplicate certificate title for this employee
    const existingCert = await Certification.findOne({
      employeeId: targetEmployeeId,
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });

    if (existingCert) {
      if (req.file && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
      return res.status(400).json({
        message: `A certification titled "${name.trim()}" has already been registered for this employee.`
      });
    }

    // Resolve target employee and department
    const targetUser = await User.findById(targetEmployeeId).populate('departmentId');
    if (!targetUser) {
      return res.status(404).json({ message: 'Target employee not found.' });
    }

    // Check if there is an active review cycle (or individual extension unlocked cycle) applicable to this user's department and role
    await ReviewCycle.autoCloseExpiredCycles();
    const activeCycles = await ReviewCycle.find({
      $or: [
        { status: 'active' },
        { unlockedUserIds: targetEmployeeId }
      ]
    }).populate('kpiTemplateId');

    const userDeptId = targetUser.departmentId?._id
      ? targetUser.departmentId._id.toString()
      : targetUser.departmentId
      ? targetUser.departmentId.toString()
      : null;
    const userRole = targetUser.role;

    const isTargetCycleActive = activeCycles.some(c => {
      const cycleDeptId = c.kpiTemplateId?.departmentId
        ? (c.kpiTemplateId.departmentId._id || c.kpiTemplateId.departmentId).toString()
        : null;
      const templateName = (c.kpiTemplateId?.templateName || '').toLowerCase();
      const isGeneralTemplate = !cycleDeptId || templateName.includes('general');

      const deptMatches = isGeneralTemplate || (userDeptId && cycleDeptId === userDeptId);

      let roleMatches = true;
      if (c.targetRole === 'manager') {
        roleMatches = userRole === 'manager' || userRole === 'hr';
      } else if (c.targetRole === 'employee') {
        roleMatches = userRole === 'employee';
      }

      return deptMatches && roleMatches;
    });

    if (!isTargetCycleActive) {
      if (req.file && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
      return res.status(400).json({
        message: `Cannot upload certification for ${targetUser.firstName} ${targetUser.lastName}. There is no active review cycle open for their department and role.`
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Certificate file upload is required.' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    // Extract text content from PDF if uploaded certificate is a PDF
    let extractedText = '';
    if (req.file.mimetype === 'application/pdf' && fs.existsSync(req.file.path)) {
      try {
        const dataBuffer = fs.readFileSync(req.file.path);
        const parser = new pdf.PDFParse({});
        await parser.load(dataBuffer);
        extractedText = await parser.getText() || '';
      } catch (err) {
        console.error('PDF text extraction failed:', err);
      }
    }

    const cert = await Certification.create({
      employeeId: targetEmployeeId,
      name,
      issuer,
      issueDate,
      expiryDate: expiryDate || null,
      fileUrl,
      extractedText
    });

    // Invalidate AI report cache to trigger fresh AI insight generation with new certificate
    await AIReport.deleteMany({ employeeId: targetEmployeeId });

    res.status(201).json(cert);
  } catch (error) {
    console.error('uploadCertification error:', error);
    res.status(500).json({ message: error.message || 'Internal server error.' });
  }
};

module.exports = {
  getCertifications,
  uploadCertification
};
