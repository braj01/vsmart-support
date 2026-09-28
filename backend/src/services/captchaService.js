const axios = require('axios');
const logger = require('../utils/logger');

const MIN_SCORE = parseFloat(process.env.RECAPTCHA_MIN_SCORE) || 0.5;

async function verifyCaptcha(token) {
  if (process.env.RECAPTCHA_BYPASS === 'true') return true;
  if (!token) return false;
  try {
    const { data } = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      { params: { secret: process.env.RECAPTCHA_SECRET_KEY, response: token } }
    );
    logger.info(`reCAPTCHA v3 response: success=${data.success}, score=${data.score}, action=${data.action}`);
    if (!data.success) return false;
    // v3 returns a score 0.0–1.0 (1.0 = human, 0.0 = bot)
    return data.score >= MIN_SCORE;
  } catch (err) {
    logger.error(`CAPTCHA verification failed: ${err.message}`);
    return false;
  }
}

module.exports = { verifyCaptcha };
