const Document = require('../models/Document');
const { logAction } = require('../utils/logger');

const getDocuments = async (req, res) => {
  try {
    const { employeeId, pipId, promotionId } = req.query;
    const filter = {};

    if (employeeId) filter.employeeId = employeeId;
    if (pipId) filter.pipId = pipId;
    if (promotionId) filter.promotionId = promotionId;

    if (req.user.role === 'employee') {
      filter.employeeId = req.user.id;
    }

    const docs = await Document.find(filter)
      .populate({ path: 'uploadedBy', select: 'firstName lastName email' });

    res.json(docs);
  } catch (error) {
    console.error('getDocuments error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file attachment uploaded.' });
    }

    const { employeeId, pipId, promotionId } = req.body;
    const uploadedBy = req.user.id;

    const doc = await Document.create({
      employeeId: employeeId || req.user.id,
      pipId: pipId || null,
      promotionId: promotionId || null,
      fileName: req.file.originalname,
      fileUrl: `/uploads/${req.file.filename}`, // relative static file path
      mimeType: req.file.mimetype,
      uploadedBy
    });

    const populated = await Document.findById(doc._id)
      .populate({ path: 'uploadedBy', select: 'firstName lastName' });

    await logAction({
      userId: req.user.id,
      action: 'user_modification', // Document attachment
      entityType: 'Document',
      entityId: doc._id,
      after: doc.toObject(),
      ipAddress: req.ip || ''
    });

    res.status(201).json(populated);
  } catch (error) {
    console.error('uploadDocument error:', error);
    res.status(500).json({ message: error.message || 'Internal server error.' });
  }
};

module.exports = {
  getDocuments,
  uploadDocument
};
