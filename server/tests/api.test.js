require('dotenv').config();
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../app');
const connectDB = require('../config/db');

describe('CertiTrust API Test Suite', () => {
  before(async () => {
    await connectDB();
  });

  after(async () => {
    await mongoose.connection.close();
  });

  it('GET / should serve homepage HTML with CertiTrust title', async () => {
    const res = await request(app).get('/');
    assert.equal(res.status, 200);
    assert.match(res.text, /CertiTrust/i);
  });

  it('POST /api/verification/verify should reject empty certificateId', async () => {
    const res = await request(app)
      .post('/api/verification/verify')
      .send({ certificateId: '' });

    assert.equal(res.status, 200);
    assert.equal(res.body.isValid, false);
    assert.equal(res.body.status, 'INVALID');
  });

  it('POST /api/verification/verify should return VALID for seeded active certificate CT2026000001', async () => {
    const res = await request(app)
      .post('/api/verification/verify')
      .send({ certificateId: 'CT2026000001' });

    assert.equal(res.status, 200);
    assert.equal(res.body.isValid, true);
    assert.equal(res.body.status, 'VALID');
    assert.equal(res.body.details.studentName, 'Alexander Wright');
  });

  it('POST /api/verification/verify should return REVOKED for revoked certificate CT2026000003', async () => {
    const res = await request(app)
      .post('/api/verification/verify')
      .send({ certificateId: 'CT2026000003' });

    assert.equal(res.status, 200);
    assert.equal(res.body.isValid, false);
    assert.equal(res.body.status, 'REVOKED');
    assert.match(res.body.revocationReason, /revocat/i);
  });

  it('POST /api/verification/verify should return EXPIRED for expired certificate CT2026000004', async () => {
    const res = await request(app)
      .post('/api/verification/verify')
      .send({ certificateId: 'CT2026000004' });

    assert.equal(res.status, 200);
    assert.equal(res.body.isValid, false);
    assert.equal(res.body.status, 'EXPIRED');
  });

  it('POST /api/verification/verify should return NOT_FOUND for non-existent certificate', async () => {
    const res = await request(app)
      .post('/api/verification/verify')
      .send({ certificateId: 'CT2099999999' });

    assert.equal(res.status, 200);
    assert.equal(res.body.isValid, false);
    assert.equal(res.body.status, 'NOT_FOUND');
  });

  it('POST /api/auth/login should authenticate seeded admin successfully', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@certitrust.io', password: 'Admin@123456' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.user.role, 'admin');
  });

  it('POST /api/auth/login should reject invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@certitrust.io', password: 'wrongpassword' });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it('GET /api/certificates should return public certificate list', async () => {
    const res = await request(app).get('/api/certificates');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert(Array.isArray(res.body.certificates));
    assert(res.body.total >= 4);
  });
});
