const router = require('express').Router();
const { login, me, logout, updateProfile, changePassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { loginRules } = require('../validators/ticketValidators');
const validate = require('../middleware/validate');

router.post('/login', loginRules, validate, login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);

module.exports = router;
