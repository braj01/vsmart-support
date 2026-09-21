const axios = require('axios');
const logger = require('../utils/logger');

async function verifyCaptcha(token) {
  if (process.env.RECAPTCHA_BYPASS === 'true') return true;
  if (!token) return false;
  try {
    const { data } = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify`,
      null,
      { params: { secret: process.env.RECAPTCHA_SECRET_KEY, response: token } }
    );
    return data.success === true;
  } catch (err) {
    logger.error(`CAPTCHA verification failed: ${err.message}`);
    return false;
  }
}

module.exports = { verifyCaptcha };
