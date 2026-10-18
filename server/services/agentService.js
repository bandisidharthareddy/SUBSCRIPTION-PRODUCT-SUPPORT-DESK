import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { runCheck, readEntitlements, readServiceStatus, searchHelp, toolSummary } from './toolRunner.js';

export async function answerSupport(question, orgId, ticket = null, version = '1.0') {
  const checks = [];

  // Check 1: Organization Entitlements
  checks.push(await runCheck(ticket, orgId, 'readEntitlements', () => readEntitlements(orgId)));

  // Detect feature intent from question
  const lowerQ = question.toLowerCase();
  let feature = '';
  if (lowerQ.includes('export')) feature = 'export';
  else if (lowerQ.includes('login')) feature = 'login';
  else if (lowerQ.includes('report')) feature = 'reports';

  // Check 2: Service Status Incidents
  checks.push(await runCheck(ticket, orgId, 'readServiceStatus', () => readServiceStatus(feature)));

  // Check 3: Versioned Help Articles
  checks.push(await runCheck(ticket, orgId, 'searchHelp', () => searchHelp(question, version)));

  const entResult = checks[0].result;
  const incResult = checks[1].result;
  const artResult = checks[2].result;

  const grounded = [];

  if (checks[0].status === 'success' && entResult?.ok) {
    grounded.push(
      `Organization plan: ${entResult.plan}. Entitlements: ${
        entResult.entitlements.map(e =>
          `${e.feature}: ${e.allowed ? 'enabled' : 'not included'}${
            Number.isFinite(e.limit) ? ` (limit ${e.limit}, used ${e.used})` : ''
          }`
        ).join('; ') || 'No entitlement records found'
      }.`
    );
  } else {
    grounded.push('Organization entitlement check is incomplete; I cannot confirm plan access.');
  }

  if (checks[1].status === 'success' && incResult?.ok) {
    if (incResult.incidents.length > 0) {
      grounded.push(
        `Relevant active service incidents: ${incResult.incidents.map(i =>
          `${i.title} (${i.status}): ${i.summary}`
        ).join('; ')}.`
      );
    } else {
      grounded.push('No matching active public incident was found in the simulated status data.');
    }
  } else {
    grounded.push('Service status check is incomplete; I cannot confirm whether an incident is active.');
  }

  if (checks[2].status === 'success' && artResult?.length > 0) {
    grounded.push(
      `Help guidance:\n${artResult.slice(0, 3).map(a => `${a.title}: ${a.excerpt}`).join('\n')}`
    );
  } else {
    grounded.push('No matching published help article was found for this version.');
  }

  let response = grounded.join('\n\n');
  const citations = (artResult || []).slice(0, 3).map(a => ({
    title: a.title,
    slug: a.slug,
    version: a.version,
    productVersion: a.productVersion
  }));

  const canUseModel = process.env.OLLAMA_BASE_URL &&
    process.env.OLLAMA_MODEL &&
    checks.every(c => c.status === 'success');

  if (canUseModel) {
    try {
      const model = new ChatOllama({
        baseUrl: process.env.OLLAMA_BASE_URL,
        model: process.env.OLLAMA_MODEL,
        temperature: 0
      });
      const result = await model.invoke([
        new SystemMessage(
          'You are a careful SaaS support assistant. Answer only from the supplied evidence. Do not invent plan details, incidents, refunds, or upgrades. If evidence is missing or conflicting, say so and recommend human review. Keep customer data private.'
        ),
        new HumanMessage(
          `Customer question: ${question}\n\nVerified evidence:\n${response}\n\nHelp citations available: ${JSON.stringify(citations)}\n\nGive a concise source-grounded answer. Cite help titles in square brackets. Do not claim an action was taken.`
        )
      ]);
      response = String(result.content || response);
    } catch (err) {
      console.warn('Ollama invocation failed; using deterministic grounded fallback:', err.message);
    }
  }

  const needsHumanReview = checks.some(c => c.status !== 'success') || !artResult?.length;

  return {
    answer: response,
    citations,
    checks: checks.map(c => ({
      tool: c.tool,
      status: c.status,
      result: c.result ? { ok: c.result.ok, summary: toolSummary(c.tool, c.result) } : undefined,
      error: c.error
    })),
    needsHumanReview
  };
}
