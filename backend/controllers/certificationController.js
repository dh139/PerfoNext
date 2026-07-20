const Certification = require('../models/Certification');

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

    if (!req.file) {
      return res.status(400).json({ message: 'Certificate file upload is required.' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    const cert = await Certification.create({
      employeeId: targetEmployeeId,
      name,
      issuer,
      issueDate,
      expiryDate: expiryDate || null,
      fileUrl
    });

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
