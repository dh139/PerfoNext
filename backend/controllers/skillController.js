const Skill = require('../models/Skill');
const EmployeeSkill = require('../models/EmployeeSkill');
const Department = require('../models/Department');

// Drop legacy global unique index on skillName to allow duplicate names across different departments
Skill.collection.dropIndex('skillName_1').catch(() => {});

const getSkills = async (req, res) => {
  try {
    const { departmentId, designationId } = req.query;

    // Legacy auto-migration: Associate existing engineering skills with Engineering department
    const engDept = await Department.findOne({ departmentName: { $regex: 'Engineering', $options: 'i' } });
    if (engDept) {
      await Skill.updateMany(
        {
          departmentId: null,
          category: { $in: ['Frontend', 'Backend', 'Database', 'Cloud & DevOps', 'Frontend Development', 'Backend Development'] }
        },
        { $set: { departmentId: engDept._id } }
      );
    }

    const filter = { status: 'active' };

    if (departmentId) {
      // Return skills matching the department OR general skills (null department)
      filter.departmentId = { $in: [departmentId, null] };
      if (designationId) {
        // If designation is passed, also allow matching general skills for the department, or specifically for this designation
        filter.$or = [
          { designationId: designationId },
          { designationId: null }
        ];
      }
    }

    const skills = await Skill.find(filter).populate('departmentId designationId');
    res.json(skills);
  } catch (error) {
    console.error('getSkills error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const createSkill = async (req, res) => {
  try {
    const { skillName, category, departmentId, designationId } = req.body;
    if (!skillName || !category) {
      return res.status(400).json({ message: 'skillName and category are required.' });
    }

    const existing = await Skill.findOne({
      skillName: { $regex: new RegExp(`^${skillName.trim()}$`, 'i') },
      departmentId: departmentId || null,
      designationId: designationId || null
    });
    if (existing) {
      return res.status(400).json({ message: 'Skill already exists for this department and designation.' });
    }

    const skill = await Skill.create({
      skillName,
      category,
      departmentId: departmentId || null,
      designationId: designationId || null
    });
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

    const employeeSkills = await EmployeeSkill.find({ employeeId }).populate({
      path: 'skillId',
      populate: { path: 'departmentId designationId' }
    });
    res.json(employeeSkills);
  } catch (error) {
    console.error('getEmployeeSkills error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const updateEmployeeSkill = async (req, res) => {
  try {
    const { skillId, selfRating, managerRating, employeeId } = req.body;
    const targetEmployeeId = employeeId || req.user.id;

    // Roles boundary check: standard employees can only update their own self-rating
    if (req.user.role === 'employee') {
      if (targetEmployeeId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied.' });
      }
      if (managerRating !== undefined && managerRating !== null) {
        return res.status(403).json({ message: 'Employees cannot assign manager ratings.' });
      }
    }

    let empSkill = await EmployeeSkill.findOne({ employeeId: targetEmployeeId, skillId });
    if (empSkill) {
      if (selfRating !== undefined) empSkill.selfRating = selfRating;
      if (managerRating !== undefined) {
        empSkill.managerRating = managerRating;
        empSkill.proficiencyLevel = managerRating; // Manager validation is official
      } else if (selfRating !== undefined && empSkill.managerRating === null) {
        empSkill.proficiencyLevel = selfRating; // Fallback to self-rating if manager hasn't reviewed
      }
      empSkill.lastAssessedDate = new Date();
      await empSkill.save();
    } else {
      const finalLevel = managerRating !== undefined && managerRating !== null ? managerRating : (selfRating || 1);
      empSkill = await EmployeeSkill.create({
        employeeId: targetEmployeeId,
        skillId,
        selfRating: selfRating !== undefined ? selfRating : null,
        managerRating: managerRating !== undefined ? managerRating : null,
        proficiencyLevel: finalLevel,
        lastAssessedDate: new Date()
      });
    }

    res.json(empSkill);
  } catch (error) {
    console.error('updateEmployeeSkill error:', error);
    res.status(500).json({ message: error.message || 'Internal server error.' });
  }
};

const updateSkill = async (req, res) => {
  try {
    const { id } = req.params;
    const { skillName, category, departmentId, designationId } = req.body;

    const skill = await Skill.findById(id);
    if (!skill) {
      return res.status(404).json({ message: 'Skill not found.' });
    }

    const targetName = skillName || skill.skillName;
    const targetDept = departmentId !== undefined ? (departmentId === '' ? null : departmentId) : skill.departmentId;
    const targetDesg = designationId !== undefined ? (designationId === '' ? null : designationId) : skill.designationId;

    const existing = await Skill.findOne({
      _id: { $ne: id },
      skillName: { $regex: new RegExp(`^${targetName.trim()}$`, 'i') },
      departmentId: targetDept || null,
      designationId: targetDesg || null
    });
    if (existing) {
      return res.status(400).json({ message: 'A skill with this name already exists for the target department and designation.' });
    }

    if (skillName) skill.skillName = skillName;
    if (category) skill.category = category;
    skill.departmentId = targetDept;
    skill.designationId = targetDesg;

    await skill.save();
    res.json(skill);
  } catch (error) {
    console.error('updateSkill error:', error);
    res.status(500).json({ message: error.message || 'Internal server error.' });
  }
};

const deleteSkill = async (req, res) => {
  try {
    const { id } = req.params;
    const skill = await Skill.findById(id);
    if (!skill) {
      return res.status(404).json({ message: 'Skill not found.' });
    }

    await Skill.findByIdAndDelete(id);
    await EmployeeSkill.deleteMany({ skillId: id });

    res.json({ message: 'Skill successfully deleted from catalog and employees.' });
  } catch (error) {
    console.error('deleteSkill error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = {
  getSkills,
  createSkill,
  getEmployeeSkills,
  updateEmployeeSkill,
  updateSkill,
  deleteSkill
};
