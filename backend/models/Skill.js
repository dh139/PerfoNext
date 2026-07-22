const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  skillName: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true }, // e.g., Frontend, Backend, Database, Soft Skills
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: false, index: true },
  designationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Designation', default: null, index: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Skill', skillSchema);
