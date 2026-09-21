const { validationResult } = require('express-validator');
const { errorResponse } = require('../utils/helpers');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const grouped = {};
    errors.array().forEach(({ path, msg }) => {
      if (!grouped[path]) grouped[path] = [];
      grouped[path].push(msg);
    });
    return errorResponse(res, 'Validation failed', 422, grouped);
  }
  next();
}

module.exports = validate;
