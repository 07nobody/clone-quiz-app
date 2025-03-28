const { body, validationResult } = require('express-validator');
const xss = require('xss');

const validateExam = [
  body('name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Exam name must be between 2 and 100 characters'),
  body('duration')
    .isInt({ min: 1, max: 180 })
    .withMessage('Duration must be between 1 and 180 minutes'),
  body('category')
    .isLength({ min: 2, max: 50 })
    .withMessage('Category must be between 2 and 50 characters'),
  body('totalMarks')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Total marks must be between 1 and 1000'),
  body('passingMarks')
    .isInt({ min: 0 })
    .custom((value, { req }) => {
      if (value > req.body.totalMarks) {
        throw new Error('Passing marks cannot exceed total marks');
      }
      return true;
    }),
  body('maxAttempts')
    .isInt({ min: 1, max: 10 })
    .withMessage('Maximum attempts must be between 1 and 10'),
  body('startDate')
    .isISO8601()
    .withMessage('Invalid start date format'),
  body('endDate')
    .isISO8601()
    .withMessage('Invalid end date format')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('accessCode')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Access code must be at least 6 characters'),
];

const validateQuestion = [
  body('name')
    .isLength({ min: 3, max: 1000 })
    .withMessage('Question must be between 3 and 1000 characters'),
  body('correctOption')
    .notEmpty()
    .withMessage('Correct option is required')
    .custom((value, { req }) => {
      if (!req.body.options[value]) {
        throw new Error('Correct option must be one of the provided options');
      }
      return true;
    }),
  body('options')
    .custom((value) => {
      const optionsCount = Object.keys(value).length;
      if (optionsCount < 2) {
        throw new Error('At least 2 options are required');
      }
      if (optionsCount > 6) {
        throw new Error('Maximum 6 options are allowed');
      }
      
      // Validate each option's text
      Object.values(value).forEach(option => {
        if (!option.text || option.text.trim().length === 0) {
          throw new Error('Option text cannot be empty');
        }
        if (option.text.length > 500) {
          throw new Error('Option text cannot exceed 500 characters');
        }
      });
      return true;
    }),
  body('marks')
    .isInt({ min: 0, max: 100 })
    .withMessage('Marks must be between 0 and 100'),
  body('explanation')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Explanation cannot exceed 1000 characters'),
  body('difficulty')
    .isIn(['Easy', 'Medium', 'Hard'])
    .withMessage('Invalid difficulty level'),
];

const validateReport = [
  body('exam')
    .notEmpty()
    .withMessage('Exam ID is required'),
  body('user')
    .notEmpty()
    .withMessage('User ID is required'),
  body('result')
    .isObject()
    .withMessage('Result must be an object'),
  body('timeTaken')
    .isInt({ min: 0 })
    .withMessage('Time taken must be a positive number'),
  body('answers')
    .isArray()
    .withMessage('Answers must be an array'),
];

const validate = (req, res, next) => {
  console.log("validate: Executing");
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

// Add sanitization middleware
const sanitizeData = (req, res, next) => {
  console.log("sanitizeData: Executing");
  if (req.body) {
    for (let key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = xss(req.body[key].trim());
      }
    }
  }
  next();
};

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

const userValidation = {
  name: {
    isLength: {
      options: { min: 2, max: 50 },
      errorMessage: 'Name must be between 2 and 50 characters',
    },
  },
  email: {
    isEmail: {
      errorMessage: 'Invalid email format',
    },
  },
  password: {
    isLength: {
      options: { min: 6 },
      errorMessage: 'Password must be at least 6 characters long',
    },
  },
};

module.exports = {
  validateExam,
  validateQuestion,
  validateReport,
  validate,
  sanitizeData,
  validateRequest,
  userValidation,
};