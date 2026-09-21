const router = require('express').Router();
const ctrl = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { commentRules, statusRules, priorityRules } = require('../validators/ticketValidators');
const validate = require('../middleware/validate');

router.use(authenticate);

router.get('/dashboard', ctrl.getDashboard);
router.get('/agents', ctrl.listAgents);
router.get('/audit-logs', authorize('SUPER_ADMIN'), ctrl.getAuditLogs);

router.get('/tickets', ctrl.listTickets);
router.get('/tickets/:id', ctrl.getTicket);
router.patch('/tickets/:id', ctrl.updateTicket);
router.patch('/tickets/:id/status', statusRules, validate, ctrl.changeStatus);
router.patch('/tickets/:id/priority', priorityRules, validate, ctrl.changePriority);
router.patch('/tickets/:id/assignment', ctrl.assignTicket);
router.post('/tickets/:id/comments', commentRules, validate, ctrl.addComment);
router.post('/tickets/:id/attachments', upload.array('attachments[]', 10), ctrl.uploadAttachment);
router.get('/tickets/:id/attachments/:attachmentId', ctrl.downloadAttachment);

module.exports = router;
