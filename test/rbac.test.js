import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { setupTestEnvironment, teardownTestEnvironment, createAuthenticatedAgent } from './helpers/setup.js';
import { User, Ticket } from '../server/models/index.js';

describe('Role-Based Access Control & Multi-Tenancy (RBAC-01..05)', () => {
  let app;

  before(async () => {
    app = await setupTestEnvironment();
  });

  after(async () => {
    await teardownTestEnvironment();
  });

  test('RBAC-01: Self-assignment of staff roles is rejected on signup', async () => {
    const email = `attacker_${Date.now()}@test.com`;
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Attacker User',
        email,
        password: 'Password1234!',
        organization: 'Attacker Org',
        role: 'supervisor' // Attacker attempting to claim supervisor role
      });

    assert.equal(res.status, 201);

    const user = await User.findOne({ email });
    assert.equal(user.role, 'customer', 'Role must remain strictly "customer" regardless of request payload');
  });

  test('RBAC-03 & RBAC-04: Staff routes enforce role restrictions', async () => {
    const customer = await createAuthenticatedAgent('customer@acme.test');
    const specialist = await createAuthenticatedAgent('specialist@support.test');
    const supervisor = await createAuthenticatedAgent('supervisor@support.test');

    // 1. Customer cannot view specialists list
    const custStaffRes = await customer.get('/api/specialists');
    assert.equal(custStaffRes.status, 403);

    // 2. Specialist cannot access supervisor assignment endpoint
    const sampleTicket = await Ticket.findOne({ subject: 'Team cannot export reports' });
    const specAssignRes = await specialist.post(`/api/tickets/${sampleTicket._id}/assignment`, {
      specialistId: specialist.user.id
    });
    assert.equal(specAssignRes.status, 403);

    // 3. Supervisor CAN view specialists and assign tickets
    const supListRes = await supervisor.get('/api/specialists');
    assert.equal(supListRes.status, 200);
    assert.ok(Array.isArray(supListRes.body.specialists));

    const supAssignRes = await supervisor.post(`/api/tickets/${sampleTicket._id}/assignment`, {
      specialistId: specialist.user.id
    });
    assert.equal(supAssignRes.status, 200);
    assert.equal(supAssignRes.body.ticket.assignedTo, specialist.user.id);
  });

  test('RBAC-05: Knowledge Manager can create and publish help article drafts', async () => {
    const customer = await createAuthenticatedAgent('customer@acme.test');
    const knowledgeMgr = await createAuthenticatedAgent('knowledge@support.test');

    // Customer cannot create help draft
    const custDraft = await customer.post('/api/help-drafts', {
      title: 'Customer Unauthorized Draft',
      slug: 'customer-unauthorized',
      productVersion: '1.0',
      body: 'This should be blocked by role guards.'
    });
    assert.equal(custDraft.status, 403);

    // Knowledge manager can create draft
    const kmDraft = await knowledgeMgr.post('/api/help-drafts', {
      title: 'Knowledge Base Article on Billing Limits',
      slug: 'billing-limits-guide',
      productVersion: '1.0',
      tags: ['billing', 'limits'],
      body: 'Detailed guide for resolving billing limit exceptions with support.'
    });
    assert.equal(kmDraft.status, 201);
    assert.equal(kmDraft.body.article.status, 'draft');

    // Publish draft
    const publishRes = await knowledgeMgr.post(`/api/help-drafts/${kmDraft.body.article._id}/publish`, {});
    assert.equal(publishRes.status, 200);
    assert.equal(publishRes.body.article.status, 'published');
  });
});
