const mongoose = require('mongoose');

const projectStatusSchema = new mongoose.Schema(
  {
    projectName: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Stale', 'Completed'],
      default: 'Active',
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ProjectStatus', projectStatusSchema);
