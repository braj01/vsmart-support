const router = require('express').Router();
const { submitTicket, getTicketByToken } = require('../controllers/ticketController');
const { upload, validateUploadedFiles } = require('../middleware/upload');
const { submitTicketRules } = require('../validators/ticketValidators');
const validate = require('../middleware/validate');

router.post('/', upload.array('attachments[]', 10), validateUploadedFiles, submitTicketRules, validate, submitTicket);
router.get('/:token', getTicketByToken);

module.exports = router;
