import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setupTestEnvironment, teardownTestEnvironment, createAuthenticatedAgent } from './helpers/setup.js';

describe('Multi-Tenant Isolation & Ticket Lifecycles (TICK-01..06, GROUP-01..03, TEST-01)', () => {
  let alexCustomer;
  let samCustomer;
  let specialist;

  before(async () => {
    await setupTestEnvironment();
    alexCustomer = await createAuthenticatedAgent('customer@acme.test');
    samCustomer = await createAuthenticatedAgent('customer@northstar.test');
    specialist = await createAuthenticatedAgent('specialist@support.test');
  });

  after(async () => {
    await teardownTestEnvironment();
  });

  test('TEST-01: Cross-tenant data isolation strictly enforced on tickets', async () => {
    // 1. Alex creates a ticket under Acme
    const createRes = await alexCustomer.post('/api/tickets', {
      subject: 'Confidential Acme Security Query',
      question: 'Sensitive details regarding our internal payroll export data.'
    });
    assert.equal(createRes.status, 201);
    const alexTicketId = createRes.body.ticket._id;

    // 2. Alex can read own ticket
    const alexRead = await alexCustomer.get(`/api/tickets/${alexTicketId}`);
    assert.equal(alexRead.status, 200);
    assert.equal(alexRead.body.ticket.subject, 'Confidential Acme Security Query');

    // 3. Sam (Northstar) attempts to access Alex's ticket directly -> MUST return 404 (not leak existence)
    const samAccess = await samCustomer.get(`/api/tickets/${alexTicketId}`);
    assert.equal(samAccess.status, 404, 'Must return 404 when querying ticket outside tenant scope');

    // 4. Sam listing tickets must NOT contain Alex's ticket
    const samList = await samCustomer.get('/api/tickets');
    assert.equal(samList.status, 200);
    const foundAlexTicket = samList.body.tickets.find(t => String(t._id) === String(alexTicketId));
    assert.equal(foundAlexTicket, undefined, 'Tenant ticket list must never contain another orgs tickets');
  });

  test('TICK-04 & TICK-05: Specialist resolution and customer escalation workflows', async () => {
    // Alex creates another ticket
    const createRes = await alexCustomer.post('/api/tickets', {
      subject: 'Issue with team member seat count',
      question: 'Unable to invite our 6th team member.'
    });
    const ticketId = createRes.body.ticket._id;

    // Alex escalates the ticket
    const escRes = await alexCustomer.post(`/api/tickets/${ticketId}/escalation`, {
      reason: 'Urgent deadline for onboarding new engineers today.'
    });
    assert.equal(escRes.status, 200);
    assert.equal(escRes.body.ticket.status, 'escalated');
    assert.equal(escRes.body.ticket.escalationReason, 'Urgent deadline for onboarding new engineers today.');

    // Specialist resolves ticket (needs assignment first in real lifecycle, let supervisor assign or test assignment)
    const supervisor = await createAuthenticatedAgent('supervisor@support.test');
    await supervisor.post(`/api/tickets/${ticketId}/assignment`, {
      specialistId: specialist.user.id
    });

    // Now assigned specialist resolves ticket
    const resRes = await specialist.post(`/api/tickets/${ticketId}/resolution`, {
      resolution: 'Verified that the Basic plan seat limit is 5. Suggested upgrading or removing inactive users.'
    });
    assert.equal(resRes.status, 200);
    assert.equal(resRes.body.ticket.status, 'resolved');
    assert.match(resRes.body.ticket.resolution, /Basic plan seat limit is 5/i);
  });

  test('GROUP-01 & GROUP-02: Semantic grouping preserves cross-customer privacy', async () => {
    const listRes = await alexCustomer.get('/api/tickets');
    const ticketId = listRes.body.tickets[0]._id;

    const relatedRes = await alexCustomer.get(`/api/tickets/${ticketId}/related`);
    assert.equal(relatedRes.status, 200);
    assert.ok(Array.isArray(relatedRes.body.incidents));
    assert.ok(Array.isArray(relatedRes.body.relatedTickets));

    // Ensure relatedTickets do NOT expose conversation text or customer PII
    for (const rel of relatedRes.body.relatedTickets) {
      assert.equal(rel.conversation, undefined, 'Conversation body must be stripped from related tickets');
      assert.equal(rel.createdBy, undefined, 'Customer identity must be stripped from related tickets');
      assert.equal(rel.orgId, undefined, 'Organization identity must be stripped from related tickets');
      assert.ok(rel.subject, 'Subject metadata is preserved for correlation');
    }
  });
});
