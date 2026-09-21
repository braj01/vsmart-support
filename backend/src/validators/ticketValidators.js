const { body } = require('express-validator');

const submitTicketRules = [
  body('subject').trim().notEmpty().withMessage('Subject is required').isLength({ max: 500 }),
  body('requester_email').trim().notEmpty().withMessage('Requester email is required').isEmail().withMessage('Please enter a valid email address').normalizeEmail(),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).withMessage('Invalid priority'),
  body('description').trim().notEmpty().withMessage('Description is required'),
];

const loginRules = [
  body('email').trim().isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
];

const commentRules = [
  body('comment').trim().notEmpty().withMessage('Comment is required'),
  body('type').optional().isIn(['PUBLIC_REPLY', 'INTERNAL_NOTE']),
];

const statusRules = [
  body('status').isIn(['OPEN', 'ACKNOWLEDGED', 'CLOSED']).withMessage('Invalid status'),
];

const priorityRules = [
  body('priority').isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).withMessage('Invalid priority'),
];

module.exports = { submitTicketRules, loginRules, commentRules, statusRules, priorityRules };
