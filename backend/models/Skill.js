const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  skillName: { type: String, required: true, unique: true, trim: true },
  category: { type: String, required: true, trim: true }, // e.g., Frontend, Backend, Database, Soft Skills
  status: { type: String, enum: ['active', 'inactive'], default: 'active', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Skill', skillSchema);
