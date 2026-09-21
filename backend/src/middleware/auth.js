const jwt = require('jsonwebtoken');
const { User, Role } = require('../models');
const { errorResponse } = require('../utils/helpers');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(res, 'Authentication required', 401);
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, { include: [{ model: Role, as: 'role' }] });
    if (!user || !user.is_active) return errorResponse(res, 'User not found or inactive', 401);
    req.user = user;
    next();
  } catch {
    return errorResponse(res, 'Invalid or expired token', 401);
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role.name)) {
      return errorResponse(res, 'Insufficient permissions', 403);
    }
    next();
  };
}

module.exports = { authenticate, authorize };
