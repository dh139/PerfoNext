const express = require('express');
const router = express.Router();

const { verifyToken, authorizeRoles } = require('../middlewares/auth');

const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const kpiController = require('../controllers/kpiController');
const cycleController = require('../controllers/cycleController');
const dashboardController = require('../controllers/dashboardController');
const reportController = require('../controllers/reportController');
const notificationController = require('../controllers/notificationController');
const auditController = require('../controllers/auditController');
const pipController = require('../controllers/pipController');
const promotionController = require('../controllers/promotionController');
const recognitionController = require('../controllers/recognitionController');
const documentController = require('../controllers/documentController');
const upload = require('../middlewares/upload');
const insightController = require('../controllers/insightController');
const feedbackController = require('../controllers/feedbackController');
const skillController = require('../controllers/skillController');
const certificationController = require('../controllers/certificationController');
const integrationController = require('../controllers/integrationController');

// ==================== AUTH ROUTES ====================
router.post('/auth/login', authController.login);
router.post('/auth/refresh', authController.refresh);
router.post('/auth/logout', authController.logout);
router.post('/auth/register', authController.register);
router.post('/auth/forgot-password', authController.forgotPassword);
router.post('/auth/verify-otp', authController.verifyOtp);
router.post('/auth/reset-password', authController.resetPassword);

// Public metadata routes for registration
router.get('/auth/departments', userController.getDepartments);
router.get('/auth/designations', userController.getDesignations);
router.get('/auth/managers', userController.getPublicManagers);

// ==================== PROTECTED ROUTES ====================

router.get('/users', verifyToken, userController.getUsers);
router.get('/users/me', verifyToken, userController.getMyProfile);
router.patch('/users/me', verifyToken, userController.updateMyProfile);
router.patch('/users/me/profile-photo', verifyToken, upload.single('file'), userController.uploadProfilePhoto);
router.get('/users/:id', verifyToken, userController.getUserById);
router.post('/users', verifyToken, authorizeRoles('admin', 'hr'), userController.createUser);
router.patch('/users/:id', verifyToken, authorizeRoles('admin', 'hr'), userController.updateUser);
router.delete('/users/:id', verifyToken, authorizeRoles('admin', 'hr'), userController.deleteUser);

// Department Management
router.get('/departments', verifyToken, userController.getDepartments);
router.post('/departments', verifyToken, authorizeRoles('admin', 'hr'), userController.createDepartment);
router.patch('/departments/:id', verifyToken, authorizeRoles('admin', 'hr'), userController.updateDepartment);
router.delete('/departments/:id', verifyToken, authorizeRoles('admin'), userController.deleteDepartment);

// Designation Management
router.get('/designations', verifyToken, userController.getDesignations);
router.post('/designations', verifyToken, authorizeRoles('admin', 'hr'), userController.createDesignation);
router.patch('/designations/:id', verifyToken, authorizeRoles('admin', 'hr'), userController.updateDesignation);

// KPI Templates
router.get('/kpi-templates', verifyToken, kpiController.getKpiTemplates);
router.get('/kpi-templates/:id', verifyToken, kpiController.getKpiTemplateById);
router.post('/kpi-templates', verifyToken, authorizeRoles('admin', 'hr'), kpiController.createKpiTemplate);
router.patch('/kpi-templates/:id', verifyToken, authorizeRoles('admin', 'hr'), kpiController.updateKpiTemplate);

// Review Cycles
router.get('/review-cycles', verifyToken, cycleController.getReviewCycles);
router.get('/review-cycles/:id', verifyToken, cycleController.getReviewCycleById);
router.post('/review-cycles', verifyToken, authorizeRoles('admin', 'hr', 'executive'), cycleController.createReviewCycle);
router.patch('/review-cycles/:id', verifyToken, authorizeRoles('admin', 'hr', 'executive'), cycleController.updateReviewCycle);

// Assessments & Reviews
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
router.get('/dashboard/:role', verifyToken, dashboardController.getDashboardData); // For matching /api/dashboard/:role in PRD

// Reports
router.get('/reports/employee/:id', verifyToken, reportController.getEmployeeReport);
router.get('/reports/department/:id', verifyToken, authorizeRoles('admin', 'hr', 'manager', 'executive'), reportController.getDepartmentReport);
router.get('/reports/review-completion', verifyToken, authorizeRoles('admin', 'hr', 'manager', 'executive'), reportController.getReviewCompletionReport);

// Notifications
router.get('/notifications', verifyToken, notificationController.getNotifications);
router.patch('/notifications/:id/read', verifyToken, notificationController.markAsRead);

// Audit Logs
router.get('/audit-logs', verifyToken, authorizeRoles('admin', 'hr', 'executive'), auditController.getAuditLogs);

// ==================== PHASE 2 ROUTES ====================

// PIP Routes
router.get('/pips/suggestions', verifyToken, authorizeRoles('admin', 'hr', 'manager'), pipController.getPipSuggestions);
router.get('/pips', verifyToken, pipController.getPips);
router.post('/pips', verifyToken, authorizeRoles('admin', 'hr'), pipController.createPip);
router.patch('/pips/:id', verifyToken, pipController.updatePip);

// Promotion Routes
router.get('/promotions', verifyToken, promotionController.getPromotions);
router.post('/promotions', verifyToken, authorizeRoles('admin', 'hr', 'manager'), promotionController.createPromotion);
router.patch('/promotions/:id/approve', verifyToken, authorizeRoles('admin', 'hr'), promotionController.approvePromotion);

// Recognition Routes
router.get('/recognitions', verifyToken, recognitionController.getRecognitions);
router.post('/recognitions', verifyToken, authorizeRoles('admin', 'hr', 'manager'), recognitionController.createRecognition);

// Document Routes
router.get('/documents', verifyToken, documentController.getDocuments);
router.post('/documents/upload', verifyToken, upload.single('file'), documentController.uploadDocument);

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
router.post('/certifications/upload', verifyToken, upload.single('file'), certificationController.uploadCertification);

// Ecosystem Integration Routes
router.get('/integrations/attendance', verifyToken, integrationController.getAttendance);
router.post('/integrations/attendance/sync', verifyToken, authorizeRoles('admin', 'hr'), integrationController.syncAttendance);
router.post('/integrations/attendance/batch-sync', verifyToken, authorizeRoles('admin', 'hr'), integrationController.batchSyncAttendance);
router.post('/integrations/teams/webhook', verifyToken, authorizeRoles('admin', 'hr', 'manager'), integrationController.sendTeamsWebhook);
router.get('/integrations/lms', verifyToken, integrationController.getLmsRecords);
router.post('/integrations/lms/sync', verifyToken, authorizeRoles('admin', 'hr'), integrationController.syncLmsRecord);
router.get('/integrations/logs', verifyToken, authorizeRoles('admin', 'hr'), integrationController.getIntegrationLogs);

module.exports = router;
