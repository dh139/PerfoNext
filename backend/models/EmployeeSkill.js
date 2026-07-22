const mongoose = require('mongoose');

const employeeSkillSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  skillId: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill', required: true, index: true },
  proficiencyLevel: { type: Number, min: 1, max: 5, default: 1 }, // 1: Novice, 5: Expert
  selfRating: { type: Number, min: 1, max: 5, default: null },
  managerRating: { type: Number, min: 1, max: 5, default: null },
  lastAssessedDate: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('EmployeeSkill', employeeSkillSchema);
