const FeedbackRequest = require('../models/FeedbackRequest');
const FeedbackResponse = require('../models/FeedbackResponse');
const ReviewCycle = require('../models/ReviewCycle');
const User = require('../models/User');

const getFeedbackRequests = async (req, res) => {
  try {
    await ReviewCycle.autoCloseExpiredCycles();
    const { employeeId, reviewerId, cycleId, status, assignedToMe } = req.query;
    const filter = {};

    // If assignedToMe is requested (e.g. for "My Pending Reviews"), strictly filter reviewerId to logged-in user
    if (assignedToMe === 'true' || req.user.role === 'employee') {
      filter.reviewerId = req.user.id;
    } else if (req.user.role === 'manager' && !reviewerId && !employeeId) {
      // Managers monitoring direct reports
      const reports = await User.find({ managerId: req.user.id }).select('_id');
      const reportIds = reports.map(r => r._id.toString());
      filter.$or = [{ employeeId: { $in: reportIds } }, { reviewerId: req.user.id }];
    } else {
      if (employeeId) filter.employeeId = employeeId;
      if (reviewerId) filter.reviewerId = reviewerId;
    }

    if (cycleId) filter.cycleId = cycleId;
    if (status) filter.status = status;

    const requests = await FeedbackRequest.find(filter)
      .populate('cycleId')
      .populate({ path: 'employeeId', select: 'firstName lastName employeeCode role' })
      .populate({ path: 'reviewerId', select: 'firstName lastName employeeCode role' });

    res.json(requests);
  } catch (error) {
    console.error('getFeedbackRequests error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const createFeedbackRequest = async (req, res) => {
  try {
    await ReviewCycle.autoCloseExpiredCycles();
    const { employeeId, reviewerId, relationship, cycleId } = req.body;

    if (!employeeId || !reviewerId || !relationship || !cycleId) {
      return res.status(400).json({ message: 'employeeId, reviewerId, relationship, and cycleId are required.' });
    }

    // Verify cycle is active
    const cycle = await ReviewCycle.findById(cycleId);
    if (!cycle || cycle.status !== 'active') {
      return res.status(400).json({ message: 'Review cycle is not active.' });
    }

    // Check duplicate
    const existing = await FeedbackRequest.findOne({ employeeId, reviewerId, cycleId });
    if (existing) {
      return res.status(400).json({ message: 'Feedback request already exists for this reviewer in this cycle.' });
    }

    const request = await FeedbackRequest.create({
      employeeId,
      reviewerId,
      relationship,
      cycleId,
      status: 'pending'
    });

    res.status(201).json(request);
  } catch (error) {
    console.error('createFeedbackRequest error:', error);
    res.status(500).json({ message: error.message || 'Internal server error.' });
  }
};

const submitFeedbackResponse = async (req, res) => {
  try {
    const { requestId, ratings, comments } = req.body;

    if (!requestId || !ratings || !comments) {
      return res.status(400).json({ message: 'requestId, ratings, and comments are required.' });
    }

    const request = await FeedbackRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Feedback request not found.' });
    }

    if (request.reviewerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized. You are not the assigned reviewer.' });
    }

    if (request.status === 'submitted') {
      return res.status(400).json({ message: 'Feedback already submitted.' });
    }

    // 1. Save completely anonymized feedback response
    await FeedbackResponse.create({
      employeeId: request.employeeId,
      cycleId: request.cycleId,
      relationship: request.relationship,
      ratings,
      comments
    });

    // 2. Mark request as completed
    request.status = 'submitted';
    await request.save();

    res.json({ message: 'Feedback submitted anonymously and successfully!' });
  } catch (error) {
    console.error('submitFeedbackResponse error:', error);
    res.status(500).json({ message: error.message || 'Internal server error.' });
  }
};

const getFeedbackSummary = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { cycleId } = req.query;

    if (!employeeId || !cycleId) {
      return res.status(400).json({ message: 'employeeId and cycleId are required.' });
    }

    // Authorization: only the employee themselves, admin/hr/executive, or their direct manager may view this.
    const isSelf = req.user.id === employeeId;
    const isPrivileged = ['admin', 'hr', 'executive'].includes(req.user.role);

    let isDirectManager = false;
    if (req.user.role === 'manager') {
      const targetUser = await User.findById(employeeId);
      if (targetUser && targetUser.managerId && targetUser.managerId.toString() === req.user.id) {
        isDirectManager = true;
      }
    }

    if (!isSelf && !isPrivileged && !isDirectManager) {
      return res.status(403).json({ message: 'Access denied. You do not have permission to view this feedback summary.' });
    }

    // Fetch all submitted responses
    const responses = await FeedbackResponse.find({ employeeId, cycleId });

    // Aggregate averages grouped by relationship
    const summary = {
      manager: { count: 0, ratings: { workQuality: 0, productivity: 0, technical: 0, communication: 0, ownership: 0, learning: 0 } },
      peer: { count: 0, ratings: { workQuality: 0, productivity: 0, technical: 0, communication: 0, ownership: 0, learning: 0 } },
      subordinate: { count: 0, ratings: { workQuality: 0, productivity: 0, technical: 0, communication: 0, ownership: 0, learning: 0 } },
      comments: []
    };

    responses.forEach(resp => {
      const rel = resp.relationship;
      summary[rel].count += 1;
      
      Object.keys(resp.ratings).forEach(cat => {
        summary[rel].ratings[cat] += resp.ratings[cat];
      });

      if (resp.comments) {
        summary.comments.push({
          relationship: resp.relationship,
          text: resp.comments
        });
      }
    });

    // Compute averages
    ['manager', 'peer', 'subordinate'].forEach(rel => {
      if (summary[rel].count > 0) {
        Object.keys(summary[rel].ratings).forEach(cat => {
          summary[rel].ratings[cat] = +(summary[rel].ratings[cat] / summary[rel].count).toFixed(2);
        });
      }
    });

    res.json(summary);
  } catch (error) {
    console.error('getFeedbackSummary error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = {
  getFeedbackRequests,
  createFeedbackRequest,
  submitFeedbackResponse,
  getFeedbackSummary
};
