const crypto = require('crypto');

function generatePublicToken() {
  return crypto.randomBytes(32).toString('hex');
}

function successResponse(res, data, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({ success: true, message, data });
}

function errorResponse(res, message = 'An error occurred', statusCode = 500, errors = null) {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
}

module.exports = { generatePublicToken, successResponse, errorResponse };
