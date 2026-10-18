# Requirements: Subscription Product Support Desk

**Defined:** 2026-10-18  
**Core Value:** Customers get verifiable, source-backed answers and automated diagnostics scoped to their authenticated organization, while dangerous actions (subscription upgrades, refund decisions) remain strictly gated behind human staff workflows.

## v1 Requirements (Phase 1: Backend Only)

### Authentication & Session Security
- [ ] **AUTH-01**: User can register with email verification code (logged in console for dev/demo) and cannot log in unverified.
- [ ] **AUTH-02**: User can log in with bcrypt-hashed credentials and receive an expiring server-side session stored in MongoDB with secure HTTP-only cookies.
- [ ] **AUTH-03**: User can log out, invalidating the server session and clearing cookies.
- [ ] **AUTH-04**: User can request password recovery and reset password via verification code.
- [ ] **AUTH-05**: All state-changing API endpoints enforce CSRF token validation and rate limiting on sensitive routes.

### Role-Based Access Control & Multi-Tenancy
- [ ] **RBAC-01**: Customer roles cannot self-assign staff roles (`specialist`, `knowledge_manager`, `supervisor`) during signup or profile updates.
- [ ] **RBAC-02**: Multi-tenant isolation ensures customer requests are strictly scoped to their authenticated organization ID derived from the session.
- [ ] **RBAC-03**: Support specialists can only view and update tickets explicitly assigned to them or their team.
- [ ] **RBAC-04**: Supervisors can assign tickets to specialists and approve restricted actions.
- [ ] **RBAC-05**: Knowledge managers can create, edit drafts, and publish versioned help articles.

### Ticket & Escalation Workflows
- [ ] **TICK-01**: Customer can create support tickets scoped to their organization (`POST /api/tickets`).
- [ ] **TICK-02**: Customer can view their organization's ticket history and detailed timelines (`GET /api/tickets`, `GET /api/tickets/:id`).
- [ ] **TICK-03**: Specialist/Supervisor can update ticket status and priority (`PATCH /api/tickets/:id`).
- [ ] **TICK-04**: Specialist can propose resolutions on assigned tickets (`POST /api/tickets/:id/resolution`).
- [ ] **TICK-05**: Customer or staff can escalate tickets with an explicit reason (`POST /api/tickets/:id/escalation`).
- [ ] **TICK-06**: Supervisor can assign tickets to specialists (`POST /api/tickets/:id/assignment`).

### Knowledge Management & Version-Aware RAG
- [ ] **KNOW-01**: Public endpoint allows browsing published help articles filtered by product version (`GET /api/help`).
- [ ] **KNOW-02**: Public endpoint allows viewing sanitized, active service incidents (`GET /api/status`).
- [ ] **KNOW-03**: Knowledge manager can manage drafts and publish articles (`POST /api/help-drafts`, `POST /api/help-drafts/:id/publish`), archiving prior versions for the same slug.
- [ ] **KNOW-04**: Retrieval pipeline queries Atlas Vector Search when available and gracefully falls back to deterministic keyword scoring.
- [ ] **KNOW-05**: Answers include explicit source citations with article titles, slugs, and versions.

### Purposeful Support Agent & Diagnostic Tooling
- [ ] **AGENT-01**: Support agent executes read-only tool `readEntitlements(authorizedOrg)` to inspect plan limits and feature flags.
- [ ] **AGENT-02**: Support agent executes read-only tool `readServiceStatus(feature)` to query active simulated outages.
- [ ] **AGENT-03**: Support agent executes `searchHelp(error, version)` to fetch relevant troubleshooting guidance.
- [ ] **AGENT-04**: Tool executions are logged in `ToolRun` and attached to tickets as audit checks.
- [ ] **AGENT-05**: Tool timeouts or failures surface explicitly as "incomplete check" rather than false success or hallucinated diagnosis.
- [ ] **AGENT-06**: Guardrails prevent AI from hallucinating refund approvals, subscription upgrades, or claiming incidents are resolved without evidence.

### Semantic Ticket Grouping & Incident Correlation
- [ ] **GROUP-01**: Backend correlates tickets with related simulated incidents based on affected features.
- [ ] **GROUP-02**: Support staff can query related tickets/issues without exposing private ticket text or PII across customer organizations.
- [ ] **GROUP-03**: Recurring unanswered questions can be aggregated for knowledge manager review.

### Acceptance & Security Test Suite
- [ ] **TEST-01**: Automated test suite verifies cross-tenant data isolation (Customer A cannot access Customer B's tickets or entitlements).
- [ ] **TEST-02**: Automated test verifies hallucinated refund prevention and tool timeout handling (incomplete check status).
- [ ] **TEST-03**: Automated test verifies demonstration scenario: plan limit hit vs. service outage for identical user queries.
- [ ] **TEST-04**: Automated test verifies RBAC route protection across Customer, Specialist, Knowledge Manager, and Supervisor roles.
- [ ] **TEST-05**: Comprehensive seed script provides reproducible demo data for all accounts, plans, entitlements, articles, and incidents.

---

## v2 Requirements (Phase 2: Frontend & Client Integration)

### User Interface & Client Experience
- **UI-01**: Customer Help Center screen with version selector and article viewer.
- **UI-02**: Customer Ticket Timeline with message history and attached diagnostic check badges.
- **UI-03**: Investigation Chat interface with live tool execution status indicators and source citations.
- **UI-04**: Specialist Queue screen with assignment filtering and resolution editor.
- **UI-05**: Knowledge Operations publication dashboard for draft authoring and version publishing.
- **UI-06**: Service Status dashboard displaying live simulated incidents.

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Live payment processor (Stripe) | Educational demonstration uses deterministic seeded plans and entitlement records |
| Production SMTP mail server | Verification codes printed to API console for friction-free local evaluation |
| Autonomous AI billing/refund writes | Safety constraint: billing changes require authorized human staff intervention |
| Unrestricted LLM tool access | Tools derive tenant scope exclusively from the server session |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Pending |
| RBAC-01 | Phase 1 | Pending |
| RBAC-02 | Phase 1 | Pending |
| RBAC-03 | Phase 1 | Pending |
| RBAC-04 | Phase 1 | Pending |
| RBAC-05 | Phase 1 | Pending |
| TICK-01 | Phase 1 | Pending |
| TICK-02 | Phase 1 | Pending |
| TICK-03 | Phase 1 | Pending |
| TICK-04 | Phase 1 | Pending |
| TICK-05 | Phase 1 | Pending |
| TICK-06 | Phase 1 | Pending |
| KNOW-01 | Phase 1 | Pending |
| KNOW-02 | Phase 1 | Pending |
| KNOW-03 | Phase 1 | Pending |
| KNOW-04 | Phase 1 | Pending |
| KNOW-05 | Phase 1 | Pending |
| AGENT-01 | Phase 1 | Pending |
| AGENT-02 | Phase 1 | Pending |
| AGENT-03 | Phase 1 | Pending |
| AGENT-04 | Phase 1 | Pending |
| AGENT-05 | Phase 1 | Pending |
| AGENT-06 | Phase 1 | Pending |
| GROUP-01 | Phase 1 | Pending |
| GROUP-02 | Phase 1 | Pending |
| GROUP-03 | Phase 1 | Pending |
| TEST-01 | Phase 1 | Pending |
| TEST-02 | Phase 1 | Pending |
| TEST-03 | Phase 1 | Pending |
| TEST-04 | Phase 1 | Pending |
| TEST-05 | Phase 1 | Pending |
| UI-01 | Phase 2 | Deferred |
| UI-02 | Phase 2 | Deferred |
| UI-03 | Phase 2 | Deferred |
| UI-04 | Phase 2 | Deferred |
| UI-05 | Phase 2 | Deferred |
| UI-06 | Phase 2 | Deferred |

**Coverage:**
- v1 requirements: 35 total
- Mapped to Phase 1: 35 (100% covered)
- Phase 2 requirements: 6 (deferred to frontend milestone)
- Unmapped: 0 ✓

---
*Requirements defined: 2026-10-18*
