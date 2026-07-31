const KpiTemplate = require('../models/KpiTemplate');

const getKpiTemplates = async (req, res) => {
  try {
    const { departmentId, status } = req.query;
    const filter = {};

    if (!['admin', 'hr', 'executive'].includes(req.user.role)) {
      // Force non-privileged users to only see their department's template or global templates
      filter.departmentId = { $in: [req.user.departmentId || null, null] };
    } else if (departmentId) {
      filter.departmentId = departmentId === 'null' ? null : departmentId;
    }
    
    if (status) {
      filter.status = status;
    }

    const templates = await KpiTemplate.find(filter)
      .populate('departmentId')
      .populate({ path: 'createdBy', select: 'firstName lastName email' });

    res.json(templates);
  } catch (error) {
    console.error('getKpiTemplates error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getKpiTemplateById = async (req, res) => {
  try {
    const template = await KpiTemplate.findById(req.params.id)
      .populate('departmentId')
      .populate({ path: 'createdBy', select: 'firstName lastName email' });

    if (!template) {
      return res.status(404).json({ message: 'KPI Template not found.' });
    }

    // Ownership / department isolation validation
    if (!['admin', 'hr', 'executive'].includes(req.user.role)) {
      const callerDeptId = req.user.departmentId?.toString();
      const templateDeptId = template.departmentId?._id?.toString() || template.departmentId?.toString();
      if (templateDeptId && templateDeptId !== callerDeptId) {
        return res.status(403).json({ message: 'Access denied to this department\'s KPI template.' });
      }
    }

    res.json(template);
  } catch (error) {
    console.error('getKpiTemplateById error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const createKpiTemplate = async (req, res) => {
  try {
    let { templateName, departmentId, status, items } = req.body;

    if (req.user.role === 'manager') {
      const userDeptId = (req.user.departmentId?._id || req.user.departmentId)?.toString();
      if (!userDeptId) {
        return res.status(403).json({ message: 'Forbidden. Reporting Managers must belong to a department to create KPI templates.' });
      }
      // Force departmentId to manager's assigned department
      departmentId = userDeptId;
    }

    const template = await KpiTemplate.create({
      templateName,
      departmentId: departmentId || null,
      status: status || 'active',
      items: items || [],
      createdBy: req.user.id
    });

    res.status(201).json(template);
  } catch (error) {
    console.error('createKpiTemplate error:', error);
    res.status(500).json({ message: error.message || 'Internal server error.' });
  }
};

const updateKpiTemplate = async (req, res) => {
  try {
    const existing = await KpiTemplate.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'KPI Template not found.' });
    }

    if (req.user.role === 'manager') {
      const userDeptId = (req.user.departmentId?._id || req.user.departmentId)?.toString();
      const templateDeptId = (existing.departmentId?._id || existing.departmentId)?.toString();
      if (!templateDeptId || templateDeptId !== userDeptId) {
        return res.status(403).json({ message: 'Forbidden. Reporting Managers can only edit KPI templates for their assigned department.' });
      }
      req.body.departmentId = userDeptId;
    }

    const template = await KpiTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('departmentId')
      .populate({ path: 'createdBy', select: 'firstName lastName email' });

    res.json(template);
  } catch (error) {
    console.error('updateKpiTemplate error:', error);
    res.status(500).json({ message: error.message || 'Internal server error.' });
  }
};

const deleteKpiTemplate = async (req, res) => {
  try {
    const existing = await KpiTemplate.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'KPI Template not found.' });
    }

    if (req.user.role === 'manager') {
      const userDeptId = (req.user.departmentId?._id || req.user.departmentId)?.toString();
      const templateDeptId = (existing.departmentId?._id || existing.departmentId)?.toString();
      if (!templateDeptId || templateDeptId !== userDeptId) {
        return res.status(403).json({ message: 'Forbidden. Reporting Managers can only delete KPI templates for their assigned department.' });
      }
    }

    await KpiTemplate.findByIdAndDelete(req.params.id);
    res.json({ message: 'KPI Template deleted successfully.' });
  } catch (error) {
    console.error('deleteKpiTemplate error:', error);
    res.status(500).json({ message: error.message || 'Internal server error.' });
  }
};

module.exports = {
  getKpiTemplates,
  getKpiTemplateById,
  createKpiTemplate,
  updateKpiTemplate,
  deleteKpiTemplate
};
