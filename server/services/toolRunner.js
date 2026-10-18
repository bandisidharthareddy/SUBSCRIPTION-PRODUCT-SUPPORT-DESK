import { Organization, Entitlement, Incident, ToolRun } from '../models/index.js';
import { searchHelp } from './helpService.js';

export function toolSummary(tool, r) {
  if (r?.ok === false) return r.error || 'Data unavailable';
  if (tool === 'readEntitlements') return `Read ${r.entitlements?.length || 0} organization entitlements`;
  if (tool === 'readServiceStatus') return `${r.incidents?.length || 0} matching active incidents`;
  if (tool === 'searchHelp') return `Retrieved ${r?.length || 0} help articles`;
  return 'Tool check completed';
}

export async function runCheck(ticket, orgId, tool, fn, timeoutMs = 4000) {
  const started = Date.now();
  const ticketId = ticket?._id || null;
  const targetOrgId = orgId || ticket?.orgId;

  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Tool execution timeout')), timeoutMs)
    );

    const result = await Promise.race([fn(), timeoutPromise]);
    const durationMs = Date.now() - started;

    if (result?.ok === false) {
      await ToolRun.create({
        ticketId,
        orgId: targetOrgId,
        tool,
        status: 'incomplete',
        summary: toolSummary(tool, result),
        durationMs
      });
      return { tool, status: 'incomplete', error: result.error || 'Data unavailable' };
    }

    await ToolRun.create({
      ticketId,
      orgId: targetOrgId,
      tool,
      status: 'success',
      summary: toolSummary(tool, result),
      durationMs
    });
    return { tool, status: 'success', result };
  } catch (err) {
    const durationMs = Date.now() - started;
    await ToolRun.create({
      ticketId,
      orgId: targetOrgId,
      tool,
      status: 'incomplete',
      summary: 'Tool failed or timed out; diagnosis is incomplete.',
      durationMs
    });
    return {
      tool,
      status: 'incomplete',
      error: 'Check unavailable; diagnosis is incomplete.'
    };
  }
}

export async function readEntitlements(orgId) {
  const [org, entitlements] = await Promise.all([
    Organization.findById(orgId).populate('planId'),
    Entitlement.find({ orgId })
  ]);

  if (!org) {
    return { ok: false, error: 'Organization record unavailable' };
  }

  return {
    ok: true,
    organization: org.name,
    plan: org.planId?.name || 'Unassigned',
    entitlements: entitlements.map(e => ({
      feature: e.feature,
      allowed: e.allowed,
      limit: e.limit,
      used: e.used
    }))
  };
}

export async function readServiceStatus(feature) {
  const query = {
    public: true,
    status: { $in: ['investigating', 'identified', 'monitoring'] }
  };
  if (feature) {
    query.feature = new RegExp(feature, 'i');
  }

  const incidents = await Incident.find(query)
    .select('title feature status severity summary updatedAt');

  return { ok: true, incidents };
}

export { searchHelp };
