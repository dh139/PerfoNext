const { getAiInsights } = require('../services/insightService');

const getEmployeeInsights = async (req, res) => {
  try {
    const { employeeId } = req.params;
    if (!employeeId) {
      return res.status(400).json({ message: 'Employee ID is required.' });
    }

    const insights = await getAiInsights(employeeId);
    res.json(insights);
  } catch (error) {
    console.error('getEmployeeInsights controller error:', error);
    res.status(500).json({ message: error.message || 'Failed to compile AI insights.' });
  }
};

module.exports = {
  getEmployeeInsights
};
