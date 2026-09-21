const request = require('supertest');
const app = require('../app');

jest.mock('../models', () => ({
  User: { findOne: jest.fn() },
  Role: {},
  Ticket: {},
  TicketComment: {},
  TicketAttachment: {},
  TicketStatusHistory: {},
  TicketAuditLog: {},
  sequelize: {},
}));

describe('POST /api/auth/login', () => {
  it('returns 422 for missing credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(422);
  });

  it('returns 401 for invalid credentials', async () => {
    const { User } = require('../models');
    User.findOne.mockResolvedValue(null);
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });
});
