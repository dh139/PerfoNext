const KpiTemplate = require('../models/KpiTemplate');

const getKpiTemplates = async (req, res) => {
  try {
    const { departmentId, status } = req.query;
    const filter = {};

    if (departmentId) {
      // Return both org-wide and specific department template, or just department template
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
    res.json(template);
  } catch (error) {
    console.error('getKpiTemplateById error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const createKpiTemplate = async (req, res) => {
  try {
    const { templateName, departmentId, status, items } = req.body;

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
    const template = await KpiTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('departmentId')
      .populate({ path: 'createdBy', select: 'firstName lastName email' });

    if (!template) {
      return res.status(404).json({ message: 'KPI Template not found.' });
    }
    res.json(template);
  } catch (error) {
    console.error('updateKpiTemplate error:', error);
    res.status(500).json({ message: error.message || 'Internal server error.' });
  }
};

module.exports = {
  getKpiTemplates,
  getKpiTemplateById,
  createKpiTemplate,
  updateKpiTemplate
};
