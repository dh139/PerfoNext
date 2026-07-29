const { body, param, query, validationResult } = require('express-validator');

// Helper to check validation results and reject bad input
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstMsg = errors.array()[0].msg;
    return res.status(400).json({
      message: firstMsg || 'Invalid request payload provided.',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }
  next();
};

const validateLogin = [
  body('email').isEmail().withMessage('Valid email address is required.').normalizeEmail(),
  body('password').isString().notEmpty().withMessage('Password is required.'),
  handleValidationErrors
];

const validateRegister = [
  body('email').isEmail().withMessage('Valid email address is required.').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  body('firstName').isString().trim().notEmpty().withMessage('First name is required.'),
  body('lastName').isString().trim().notEmpty().withMessage('Last name is required.'),
  handleValidationErrors
];

const validateForgotPassword = [
  body('email').isEmail().withMessage('Valid email address is required.').normalizeEmail(),
  handleValidationErrors
];

const validateResetPassword = [
  body('email').isEmail().withMessage('Valid email address is required.').normalizeEmail(),
  body('otp').isString().isLength({ min: 6, max: 6 }).withMessage('OTP must be a 6-digit code.'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters.'),
  handleValidationErrors
];

const validateRecognition = [
  body('employeeId').isMongoId().withMessage('Invalid employee ID format.'),
  body('category').isString().trim().notEmpty().withMessage('Award category is required.'),
  body('comments').isString().trim().notEmpty().withMessage('Comments are required.'),
  body('awardedAt').optional().isISO8601().withMessage('Invalid awardedAt date format.'),
  handleValidationErrors
];

const validateReviewCycle = [
  body('reviewMonth').isString().trim().notEmpty().withMessage('Review month/period is required.'),
  body('startDate').isISO8601().withMessage('Start date must be a valid ISO date.'),
  body('endDate').isISO8601().withMessage('End date must be a valid ISO date.'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateLogin,
  validateRegister,
  validateForgotPassword,
  validateResetPassword,
  validateRecognition,
  validateReviewCycle
};
