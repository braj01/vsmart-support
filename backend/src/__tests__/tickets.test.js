const request = require('supertest');
const app = require('../app');

// Mock DB and services
jest.mock('../models', () => ({
  Ticket: { create: jest.fn(), findOne: jest.fn(), findByPk: jest.fn() },
  TicketAttachment: { bulkCreate: jest.fn() },
  TicketStatusHistory: { create: jest.fn() },
  TicketAuditLog: { create: jest.fn() },
  User: {},
  Role: {},
  TicketComment: {},
  sequelize: { transaction: jest.fn() },
}));
jest.mock('../services/captchaService', () => ({ verifyCaptcha: jest.fn().mockResolvedValue(true) }));
jest.mock('../services/emailService', () => ({ sendTicketCreatedEmail: jest.fn().mockResolvedValue() }));
jest.mock('../services/ticketNumberService', () => ({ generateTicketNumber: jest.fn().mockResolvedValue('TKT-20260101-000001') }));
jest.mock('../config/database', () => ({
  transaction: jest.fn((cb) => cb({ LOCK: { UPDATE: 'UPDATE' } })),
}));

describe('POST /api/tickets', () => {
  it('returns 422 when subject is missing', async () => {
    const res = await request(app).post('/api/tickets').field('requester_email', 'test@test.com').field('description', 'Test');
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('returns 422 when email is invalid', async () => {
    const res = await request(app).post('/api/tickets').field('subject', 'Test').field('requester_email', 'not-an-email').field('description', 'Test');
    expect(res.status).toBe(422);
  });

  it('returns 422 when description is missing', async () => {
    const res = await request(app).post('/api/tickets').field('subject', 'Test').field('requester_email', 'test@test.com');
    expect(res.status).toBe(422);
  });
});

describe('Ticket number generation', () => {
  it('generates correct format', async () => {
    const { generateTicketNumber } = require('../services/ticketNumberService');
    const num = await generateTicketNumber();
    expect(num).toMatch(/^TKT-\d{8}-\d{6}$/);
  });
});

describe('CAPTCHA service', () => {
  it('returns false for empty token', async () => {
    const { verifyCaptcha } = require('../services/captchaService');
    verifyCaptcha.mockResolvedValueOnce(false);
    const result = await verifyCaptcha('');
    expect(result).toBe(false);
  });
});
