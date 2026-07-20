const Skill = require('../models/Skill');
const EmployeeSkill = require('../models/EmployeeSkill');

const getSkills = async (req, res) => {
  try {
    const skills = await Skill.find({ status: 'active' });
    res.json(skills);
  } catch (error) {
    console.error('getSkills error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const createSkill = async (req, res) => {
  try {
    const { skillName, category } = req.body;
    if (!skillName || !category) {
      return res.status(400).json({ message: 'skillName and category are required.' });
    }

    const existing = await Skill.findOne({ skillName });
    if (existing) {
      return res.status(400).json({ message: 'Skill already exists.' });
    }

    const skill = await Skill.create({ skillName, category });
    res.status(201).json(skill);
  } catch (error) {
    console.error('createSkill error:', error);
    res.status(500).json({ message: error.message || 'Internal server error.' });
  }
};

const getEmployeeSkills = async (req, res) => {
  try {
    const employeeId = req.query.employeeId || req.user.id;

    // Enforce role check: standard employees can only view their own matrix
    if (req.user.role === 'employee' && employeeId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const employeeSkills = await EmployeeSkill.find({ employeeId }).populate('skillId');
    res.json(employeeSkills);
  } catch (error) {
    console.error('getEmployeeSkills error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const updateEmployeeSkill = async (req, res) => {
  try {
    const { skillId, proficiencyLevel, employeeId } = req.body;
    const targetEmployeeId = employeeId || req.user.id;

    if (!skillId || !proficiencyLevel) {
      return res.status(400).json({ message: 'skillId and proficiencyLevel are required.' });
    }

    // Standard employees can only update their own skills
    if (req.user.role === 'employee' && targetEmployeeId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    let empSkill = await EmployeeSkill.findOne({ employeeId: targetEmployeeId, skillId });
    if (empSkill) {
      empSkill.proficiencyLevel = proficiencyLevel;
      empSkill.lastAssessedDate = new Date();
      await empSkill.save();
    } else {
      empSkill = await EmployeeSkill.create({
        employeeId: targetEmployeeId,
        skillId,
        proficiencyLevel,
        lastAssessedDate: new Date()
      });
    }

    res.json(empSkill);
  } catch (error) {
    console.error('updateEmployeeSkill error:', error);
    res.status(500).json({ message: error.message || 'Internal server error.' });
  }
};

module.exports = {
  getSkills,
  createSkill,
  getEmployeeSkills,
  updateEmployeeSkill
};
