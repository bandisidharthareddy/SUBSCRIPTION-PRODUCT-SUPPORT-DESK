import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { setupTestEnvironment, teardownTestEnvironment, createAuthenticatedAgent } from './helpers/setup.js';
import { User } from '../server/models/index.js';

describe('Authentication & Session Security (AUTH-01..05)', () => {
  let app;

  before(async () => {
    app = await setupTestEnvironment();
  });

  after(async () => {
    await teardownTestEnvironment();
  });

  test('AUTH-01: User registration requires email verification code', async () => {
    const email = `newuser_${Date.now()}@test.com`;
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'New Registrant',
        email,
        password: 'Password1234!',
        organization: 'New Org Inc'
      });

    assert.equal(res.status, 201);
    assert.ok(res.body.userId);

    // Unverified login should be rejected with 403
    const loginFail = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'Password1234!' });

    assert.equal(loginFail.status, 403);
    assert.match(loginFail.body.error, /Verify your email/i);

    // Verify email with code
    const user = await User.findOne({ email });
    assert.ok(user.verificationCodeHash);

    // Simulate verification
    user.emailVerified = true;
    await user.save();

    // Now login succeeds
    const loginSuccess = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'Password1234!' });

    assert.equal(loginSuccess.status, 200);
    assert.equal(loginSuccess.body.user.email, email);
    assert.equal(loginSuccess.body.user.role, 'customer');
  });

  test('AUTH-02 & AUTH-03: Session cookies and logout destruction', async () => {
    const client = await createAuthenticatedAgent('customer@acme.test');
    
    // Check /api/me
    const meRes = await client.get('/api/me');
    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.user.email, 'customer@acme.test');

    // Logout
    const logoutRes = await client.post('/api/auth/logout', {});
    assert.equal(logoutRes.status, 200);

    // Re-check /api/me should be null
    const meAfter = await client.get('/api/me');
    assert.equal(meAfter.body.user, null);
  });

  test('AUTH-05: CSRF token validation protects mutating requests', async () => {
    const client = request.agent(app);
    
    // Log in
    const loginRes = await client
      .post('/api/auth/login')
      .send({ email: 'customer@acme.test', password: 'DemoPass!234' });
    assert.equal(loginRes.status, 200);

    // Mutating request without CSRF token must fail with 403
    const noCsrf = await client
      .post('/api/tickets')
      .send({ subject: 'No CSRF subject', question: 'No CSRF question description' });
    assert.equal(noCsrf.status, 403);
    assert.match(noCsrf.body.error, /CSRF validation failed/i);

    // Mutating request WITH valid CSRF token succeeds
    const validCsrf = await client
      .post('/api/tickets')
      .set('x-csrf-token', loginRes.body.csrf)
      .send({ subject: 'Valid CSRF subject', question: 'Valid CSRF question description' });
    assert.equal(validCsrf.status, 201);
  });
});
