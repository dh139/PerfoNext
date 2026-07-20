const mongoose = require('mongoose');

const feedbackResponseSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  cycleId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReviewCycle', required: true, index: true },
  relationship: { type: String, enum: ['manager', 'peer', 'subordinate'], required: true },
  ratings: {
    workQuality: { type: Number, min: 1, max: 5, required: true },
    productivity: { type: Number, min: 1, max: 5, required: true },
    technical: { type: Number, min: 1, max: 5, required: true },
    communication: { type: Number, min: 1, max: 5, required: true },
    ownership: { type: Number, min: 1, max: 5, required: true },
    learning: { type: Number, min: 1, max: 5, required: true }
  },
  comments: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('FeedbackResponse', feedbackResponseSchema);
