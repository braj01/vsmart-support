const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, Role } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

async function login(req, res) {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ where: { email }, include: [{ model: Role, as: 'role' }] });
    if (!user || !user.is_active) return errorResponse(res, 'Invalid credentials', 401);
    const valid = await user.validatePassword(password);
    if (!valid) {
      logger.warn(`Failed login attempt for ${email}`);
      return errorResponse(res, 'Invalid credentials', 401);
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role.name }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
    logger.info(`Admin login: ${email}`);
    return successResponse(res, { token, user: { id: user.id, name: user.name, email: user.email, role: user.role.name } }, 'Login successful');
  } catch (err) {
    return errorResponse(res, err.message);
  }
}

async function me(req, res) {
  return successResponse(res, { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role.name });
}

async function logout(req, res) {
  return successResponse(res, null, 'Logged out successfully');
}

async function updateProfile(req, res) {
  const { name, email } = req.body;
  if (!name?.trim() || !email?.trim()) return errorResponse(res, 'Name and email are required', 400);
  try {
    const existing = await User.findOne({ where: { email } });
    if (existing && existing.id !== req.user.id) return errorResponse(res, 'Email already in use', 400);
    await req.user.update({ name: name.trim(), email: email.trim() });
    return successResponse(res, { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role.name }, 'Profile updated');
  } catch (err) {
    return errorResponse(res, err.message);
  }
}

async function changePassword(req, res) {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return errorResponse(res, 'Both fields are required', 400);
  if (new_password.length < 8) return errorResponse(res, 'New password must be at least 8 characters', 400);
  try {
    const valid = await req.user.validatePassword(current_password);
    if (!valid) return errorResponse(res, 'Current password is incorrect', 400);
    const hash = await bcrypt.hash(new_password, 12);
    await req.user.update({ password_hash: hash });
    return successResponse(res, null, 'Password changed successfully');
  } catch (err) {
    return errorResponse(res, err.message);
  }
}

module.exports = { login, me, logout, updateProfile, changePassword };
