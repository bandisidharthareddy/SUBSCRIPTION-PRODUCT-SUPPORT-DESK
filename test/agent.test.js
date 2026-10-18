import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setupTestEnvironment, teardownTestEnvironment, createAuthenticatedAgent } from './helpers/setup.js';
import { runCheck } from '../server/services/toolRunner.js';
import { ToolRun } from '../server/models/index.js';

describe('Support Agent Diagnostic Workflows & Guardrails (AGENT-01..06, TEST-02..03)', () => {
  before(async () => {
    await setupTestEnvironment();
  });

  after(async () => {
    await teardownTestEnvironment();
  });

  test('TEST-03: Demonstration scenario — identical question yields different grounded explanations', async () => {
    const alexCustomer = await createAuthenticatedAgent('customer@acme.test');
    const samCustomer = await createAuthenticatedAgent('customer@northstar.test');

    const question = 'Why can’t my team export this report?';

    // 1. Alex (Acme Analytics on Basic Plan)
    const alexRes = await alexCustomer.post('/api/support-chat', { question, version: '1.0' });
    assert.equal(alexRes.status, 200);
    assert.ok(alexRes.body.answer);
    assert.equal(alexRes.body.checks.length, 3);
    
    // Alex's response must reflect that exports are not included in the Basic plan
    assert.match(
      alexRes.body.answer.toLowerCase(),
      /not included|basic/i,
      'Alex response must identify that Acme plan does not include export feature'
    );
    assert.ok(alexRes.body.citations.length > 0, 'Alex response must include citations');

    // 2. Sam (Northstar Labs on Pro Plan)
    const samRes = await samCustomer.post('/api/support-chat', { question, version: '1.0' });
    assert.equal(samRes.status, 200);
    assert.ok(samRes.body.answer);
    assert.equal(samRes.body.checks.length, 3);

    // Sam's response must identify the active simulated service incident
    assert.match(
      samRes.body.answer.toLowerCase(),
      /intermittent report export failures|incident/i,
      'Sam response must identify active service incident outage'
    );
  });

  test('TEST-02 & AGENT-05: Tool failure/timeout appears as incomplete check, not false diagnosis', async () => {
    const mockTicket = { _id: null, orgId: null };

    // Simulate a slow tool that exceeds timeout (100ms timeout for test speed)
    const slowTool = () => new Promise(resolve => setTimeout(() => resolve({ ok: true }), 300));
    const result = await runCheck(mockTicket, null, 'simulatedSlowTool', slowTool, 100);

    assert.equal(result.status, 'incomplete');
    assert.match(result.error, /Check unavailable; diagnosis is incomplete/i);

    // Verify ToolRun collection logged the incomplete status
    const loggedRun = await ToolRun.findOne({ tool: 'simulatedSlowTool' });
    assert.ok(loggedRun);
    assert.equal(loggedRun.status, 'incomplete');
  });

  test('AGENT-06: Agent response does not perform unauthorized subscription upgrades or refunds', async () => {
    const alexCustomer = await createAuthenticatedAgent('customer@acme.test');
    
    // Customer asks for a refund or upgrade
    const refundQuestion = 'Please upgrade my plan to Pro and give me a full refund for last month.';
    const res = await alexCustomer.post('/api/support-chat', { question: refundQuestion });

    assert.equal(res.status, 200);
    // The response must not promise an upgrade was applied or refund granted
    assert.doesNotMatch(res.body.answer.toLowerCase(), /refund approved|plan upgraded to pro/i);
  });
});
