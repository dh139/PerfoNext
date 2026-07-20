const mongoose = require('mongoose');

const feedbackRequestSchema = new mongoose.Schema({
  cycleId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReviewCycle', required: true, index: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // Person being evaluated
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // Person giving feedback
  relationship: { type: String, enum: ['manager', 'peer', 'subordinate'], required: true },
  status: { type: String, enum: ['pending', 'submitted', 'declined'], default: 'pending', required: true, index: true }
}, { timestamps: true });

module.exports = mongoose.model('FeedbackRequest', feedbackRequestSchema);
