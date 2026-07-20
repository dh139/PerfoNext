const mongoose = require('mongoose');

const certificationSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  issuer: { type: String, required: true, trim: true },
  issueDate: { type: Date, required: true },
  expiryDate: { type: Date },
  fileUrl: { type: String, required: true } // Multer local uploads file path
}, { timestamps: true });

module.exports = mongoose.model('Certification', certificationSchema);
