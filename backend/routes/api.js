const express = require('express');
const router = express.Router();

const { verifyToken, authorizeRoles } = require('../middlewares/auth');

const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const cycleController = require('../controllers/cycleController');
const dashboardController = require('../controllers/dashboardController');
const reportController = require('../controllers/reportController');
const notificationController = require('../controllers/notificationController');
const auditController = require('../controllers/auditController');
const pipController = require('../controllers/pipController');
const promotionController = require('../controllers/promotionController');
const recognitionController = require('../controllers/recognitionController');
const { upload, verifyFileMagicBytes } = require('../middlewares/upload');
const {
  validateLogin,
  validateRegister,
  validateForgotPassword,
  validateResetPassword,
  validateRecognition,
  validateReviewCycle
} = require('../middlewares/validators');

const insightController = require('../controllers/insightController');
const feedbackController = require('../controllers/feedbackController');
const skillController = require('../controllers/skillController');
const certificationController = require('../controllers/certificationController');
const integrationController = require('../controllers/integrationController');
const workJournalController = require('../controllers/workJournalController');

const { authLimiter, publicLimiter, userActionLimiter } = require('../middlewares/rateLimiter');

// ==================== AUTH ROUTES ====================
router.post('/auth/login', authLimiter, validateLogin, authController.login);
router.post('/auth/refresh', authLimiter, authController.refresh);
router.post('/auth/logout', authController.logout);
router.post('/auth/register', authLimiter, validateRegister, authController.register);
router.post('/auth/forgot-password', authLimiter, validateForgotPassword, authController.forgotPassword);
router.post('/auth/verify-otp', authLimiter, authController.verifyOtp);
router.post('/auth/reset-password', authLimiter, validateResetPassword, authController.resetPassword);

// Public metadata routes
router.get('/auth/departments', publicLimiter, userController.getDepartments);
router.get('/auth/designations', publicLimiter, userController.getDesignations);
router.get('/auth/managers', publicLimiter, userController.getPublicManagers);

// ==================== PROTECTED ROUTES ====================
router.use(userActionLimiter);

router.get('/users', verifyToken, userController.getUsers);
router.get('/users/me', verifyToken, userController.getMyProfile);
router.patch('/users/me', verifyToken, userController.updateMyProfile);
router.patch('/users/me/profile-photo', verifyToken, upload.single('file'), verifyFileMagicBytes, userController.uploadProfilePhoto);
router.get('/users/:id', verifyToken, userController.getUserById);
router.post('/users', verifyToken, authorizeRoles('admin', 'hr', 'executive'), userController.createUser);
router.patch('/users/:id', verifyToken, authorizeRoles('admin', 'hr', 'executive'), userController.updateUser);
router.delete('/users/:id', verifyToken, authorizeRoles('admin', 'hr', 'executive'), userController.deleteUser);

// Department Management
router.get('/departments', verifyToken, userController.getDepartments);
router.post('/departments', verifyToken, authorizeRoles('admin', 'hr'), userController.createDepartment);
router.patch('/departments/:id', verifyToken, authorizeRoles('admin', 'hr'), userController.updateDepartment);
router.delete('/departments/:id', verifyToken, authorizeRoles('admin'), userController.deleteDepartment);

// Designation Management
router.get('/designations', verifyToken, userController.getDesignations);
router.post('/designations', verifyToken, authorizeRoles('admin', 'hr'), userController.createDesignation);
router.patch('/designations/:id', verifyToken, authorizeRoles('admin', 'hr'), userController.updateDesignation);

// Review Cycles
router.get('/review-cycles', verifyToken, cycleController.getReviewCycles);
router.get('/review-cycles/:id', verifyToken, cycleController.getReviewCycleById);
router.post('/review-cycles', verifyToken, authorizeRoles('admin', 'hr', 'executive'), validateReviewCycle, cycleController.createReviewCycle);
router.patch('/review-cycles/:id', verifyToken, authorizeRoles('admin', 'hr', 'executive'), cycleController.updateReviewCycle);
router.delete('/review-cycles/:id', verifyToken, authorizeRoles('admin', 'hr', 'executive'), cycleController.deleteReviewCycle);
router.post('/review-cycles/:id/unlock-user', verifyToken, authorizeRoles('admin', 'hr', 'manager', 'executive'), cycleController.unlockUserForCycle);
router.post('/review-cycles/:id/relock-user', verifyToken, authorizeRoles('admin', 'hr', 'manager', 'executive'), cycleController.relockUserForCycle);

// Evidence Confirmation & Reviews
router.get('/self-assessments', verifyToken, cycleController.getSelfAssessments);
router.get('/self-assessments/:id', verifyToken, cycleController.getSelfAssessmentById);
router.post('/self-assessments', verifyToken, authorizeRoles('employee', 'manager', 'hr', 'executive'), cycleController.submitSelfAssessment);

router.get('/manager-reviews', verifyToken, cycleController.getManagerReviews);
router.get('/manager-reviews/:id', verifyToken, cycleController.getManagerReviewById);
router.post('/manager-reviews', verifyToken, authorizeRoles('manager', 'hr', 'admin', 'executive'), cycleController.submitManagerReview);

// Scores
router.get('/review-scores', verifyToken, cycleController.getReviewScores);
router.post('/review-scores/calculate', verifyToken, cycleController.calculateAggregateScores);

// Dashboards
router.get('/dashboard/stats', verifyToken, dashboardController.getDashboardData);
router.get('/dashboard/:role', verifyToken, dashboardController.getDashboardData);

// Reports
router.get('/reports/employee/:id', verifyToken, reportController.getEmployeeReport);
router.get('/reports/department/:id', verifyToken, authorizeRoles('admin', 'hr', 'manager', 'executive'), reportController.getDepartmentReport);
router.get('/reports/review-completion', verifyToken, authorizeRoles('admin', 'hr', 'manager', 'executive'), reportController.getReviewCompletionReport);

// Notifications
router.get('/notifications', verifyToken, notificationController.getNotifications);
router.patch('/notifications/:id/read', verifyToken, notificationController.markAsRead);

// Audit Logs
router.get('/audit-logs', verifyToken, authorizeRoles('admin', 'hr', 'executive'), auditController.getAuditLogs);

// PIP Routes
router.get('/pips/suggestions', verifyToken, authorizeRoles('admin', 'hr', 'manager', 'executive'), pipController.getPipSuggestions);
router.get('/pips', verifyToken, pipController.getPips);
router.post('/pips', verifyToken, authorizeRoles('admin', 'hr', 'executive'), pipController.createPip);
router.patch('/pips/:id', verifyToken, pipController.updatePip);

// Promotion Routes
router.get('/promotions', verifyToken, promotionController.getPromotions);
router.post('/promotions', verifyToken, authorizeRoles('admin', 'hr', 'manager', 'executive'), promotionController.createPromotion);
router.patch('/promotions/:id/approve', verifyToken, authorizeRoles('admin', 'hr', 'executive'), promotionController.approvePromotion);

// Recognition Routes
router.get('/recognitions', verifyToken, recognitionController.getRecognitions);
router.post('/recognitions', verifyToken, authorizeRoles('admin', 'hr', 'manager', 'executive'), validateRecognition, recognitionController.createRecognition);

// AI Insights Routes
router.get('/insights/:employeeId', verifyToken, authorizeRoles('admin', 'hr', 'manager', 'executive'), insightController.getEmployeeInsights);
router.get('/review-cycles/:cycleId/employees/:employeeId/insights', verifyToken, authorizeRoles('admin', 'hr', 'manager', 'executive'), insightController.getEmployeeCycleInsights);
router.post('/review-cycles/:cycleId/employees/:employeeId/insights/regenerate', verifyToken, authorizeRoles('admin', 'hr', 'manager', 'executive'), insightController.regenerateEmployeeCycleInsights);

// 360 Feedback Routes
router.get('/feedback/requests', verifyToken, feedbackController.getFeedbackRequests);
router.post('/feedback/requests', verifyToken, authorizeRoles('admin', 'hr', 'manager', 'executive'), feedbackController.createFeedbackRequest);
router.post('/feedback/responses', verifyToken, feedbackController.submitFeedbackResponse);
router.get('/feedback/summary/:employeeId', verifyToken, feedbackController.getFeedbackSummary);
router.get('/feedback/available-summaries', verifyToken, feedbackController.getAvailableSummaries);

// Skill Matrix Routes
router.get('/skills', verifyToken, skillController.getSkills);
router.post('/skills', verifyToken, authorizeRoles('admin', 'hr'), skillController.createSkill);
router.patch('/skills/:id', verifyToken, authorizeRoles('admin', 'hr'), skillController.updateSkill);
router.delete('/skills/:id', verifyToken, authorizeRoles('admin', 'hr'), skillController.deleteSkill);
router.get('/employee-skills', verifyToken, skillController.getEmployeeSkills);
router.post('/employee-skills', verifyToken, skillController.updateEmployeeSkill);

// Certification Routes
router.get('/certifications', verifyToken, certificationController.getCertifications);
router.post('/certifications/upload', verifyToken, upload.single('file'), verifyFileMagicBytes, certificationController.uploadCertification);
router.patch('/certifications/:id', verifyToken, upload.single('file'), verifyFileMagicBytes, certificationController.updateCertification);

// Ecosystem Integration Routes
router.get('/integrations/attendance', verifyToken, integrationController.getAttendance);
router.post('/integrations/attendance/sync', verifyToken, authorizeRoles('admin', 'hr'), integrationController.syncAttendance);
router.post('/integrations/attendance/batch-sync', verifyToken, authorizeRoles('admin', 'hr'), integrationController.batchSyncAttendance);
router.post('/integrations/teams/webhook', verifyToken, authorizeRoles('admin', 'hr', 'manager'), integrationController.sendTeamsWebhook);
router.get('/integrations/logs', verifyToken, authorizeRoles('admin', 'hr'), integrationController.getIntegrationLogs);

// Daily Work Log & Continuous Performance Routes
router.get('/work-journal', verifyToken, workJournalController.getWorkJournalItems);
router.post('/work-journal', verifyToken, upload.single('file'), verifyFileMagicBytes, workJournalController.createWorkJournalItem);
router.patch('/work-journal/:id', verifyToken, upload.single('file'), verifyFileMagicBytes, workJournalController.updateWorkJournalItem);
router.delete('/work-journal/:id', verifyToken, workJournalController.deleteWorkJournalItem);
router.get('/work-journal/pending-manager', verifyToken, authorizeRoles('admin', 'hr', 'manager', 'executive'), workJournalController.getPendingManagerItems);
router.patch('/work-journal/:id/review', verifyToken, authorizeRoles('admin', 'hr', 'manager', 'executive'), workJournalController.reviewWorkJournalItem);
router.post('/work-journal/batch-review', verifyToken, authorizeRoles('admin', 'hr', 'manager', 'executive'), workJournalController.batchReviewWorkJournalItems);
router.get('/work-journal/stats', verifyToken, workJournalController.getWorkJournalStats);
router.get('/work-journal/timeline', verifyToken, workJournalController.getWorkJournalTimeline);

// Work Journal Department Template Routes
const workJournalTemplateController = require('../controllers/workJournalTemplateController');
router.get('/work-journal-templates', verifyToken, workJournalTemplateController.getAllTemplates);
router.get('/work-journal-templates/department/:departmentId', verifyToken, workJournalTemplateController.getTemplateByDepartment);
router.post('/work-journal-templates', verifyToken, authorizeRoles('admin', 'hr', 'executive'), workJournalTemplateController.saveTemplate);
router.delete('/work-journal-templates/:id', verifyToken, authorizeRoles('admin', 'hr', 'executive'), workJournalTemplateController.deleteTemplate);

module.exports = router;
