const mongoose = require('mongoose');

const lmsRecordSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  courseName: { type: String, required: true, trim: true },
  provider: { type: String, required: true, trim: true }, // e.g., Coursera, Udemy, Internal LMS
  completionDate: { type: Date, required: true },
  score: { type: Number, min: 0, max: 100 },
  status: { type: String, enum: ['completed', 'in_progress'], default: 'completed', required: true }
}, { timestamps: true });

module.exports = mongoose.model('LmsRecord', lmsRecordSchema);
