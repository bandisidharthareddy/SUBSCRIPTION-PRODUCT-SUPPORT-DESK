# Phase 1: Backend Core, Security, Agent Workflows & Test Suite - Context

**Gathered:** 2026-10-18  
**Status:** Ready for planning  

<domain>
## Phase Boundary

Phase 1 delivers the complete, production-grade, modular Node.js/Express backend for the Subscription Product Support Desk. It covers domain data modeling (including multi-tenant `Membership`), secure session authentication with CSRF and rate limits, role-based access control, version-aware help article retrieval (RAG), a purposeful support agent with read-only tools and timeout handling, ticket lifecycles and semantic incident correlation, and a comprehensive automated acceptance test suite. Frontend code is strictly deferred to Phase 2.
</domain>

<decisions>
## Implementation Decisions

### 1. Domain Modeling & Multi-Tenancy Architecture
- **D-01:** Implement an explicit `Membership` collection (`userId`, `orgId`, `role: ['member', 'admin']`, `status`) connecting `User` and `Organization`. — **Reversibility:** one-way — changing this later requires migrating tenant access logic and query filters across all controllers.
- **D-02:** Organization scope is strictly derived from the authenticated user's session and validated against their `Membership` record; client-provided `orgId` parameters in request bodies are ignored.
- **D-03:** Refactor the single `server/index.js` file into a modular structure:
  - `server/models/`: User, Organization, Membership, Plan, Entitlement, HelpArticle, Incident, Ticket, Assignment, ToolRun.
  - `server/routes/`: auth, tickets, help, status, staff, agent.
  - `server/controllers/`: request/response handlers with Zod schema validation.
  - `server/middleware/`: auth, role guards, CSRF, rate-limiting, error handling.
  - `server/services/`: business logic, agent workflows, tool execution.

### 2. AI Support Agent Workflow & Fallback
- **D-04:** Implement a hybrid support agent: deterministic evidence aggregation serves as the default fallback (guaranteeing offline testability and 100% reproducible demo outputs), while `@langchain/ollama` (`ChatOllama`) is dynamically engaged when `OLLAMA_BASE_URL` is configured and online. — **Reversibility:** reversible — modular service wrapper isolates model invocation.
- **D-05:** Guardrails strictly enforce that tools (`readEntitlements`, `readServiceStatus`, `searchHelp`) are read-only. The AI cannot perform subscription changes or approve refunds.
- **D-06:** Tool execution status must be transparent: tool timeouts or errors surface explicitly as "incomplete check" rather than a successful diagnosis.

### 3. Semantic Ticket Grouping & Privacy
- **D-07:** Correlate tickets with active incidents and related issues using affected feature tags and sanitized subject keywords, ensuring zero customer conversation text or PII is leaked across organization boundaries. — **Reversibility:** reversible — grouping logic runs at query time.

### 4. Acceptance & Security Test Suite
- **D-08:** Use Node.js built-in `node:test` + `supertest` for integration testing. This maintains native ES module compatibility with zero external framework dependencies or configuration bloat. — **Reversibility:** costly — test helper conventions and test files adhere to the native runner.
- **D-09:** Tests must verify:
  1. Cross-tenant data isolation (Customer A cannot access Customer B's tickets/entitlements).
  2. Hallucinated refund prevention & tool timeout handling (incomplete check status).
  3. Demonstration scenario: Plan limit hit vs. service outage for identical queries.
  4. Role protection (Customer vs. Specialist vs. Knowledge Manager vs. Supervisor).

### the agent's Discretion
- Code file naming and modular directory layout under `server/`.
- Exact Zod schema validation rules and error message formatting.
- Specific seed dataset records (Acme vs. Northstar plans, entitlements, and articles).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Specifications
- `.planning/PROJECT.md` — Core values, tenant isolation boundaries, and business constraints.
- `.planning/REQUIREMENTS.md` § v1 Requirements — The 35 checkable acceptance criteria covering AUTH, RBAC, TICK, KNOW, AGENT, GROUP, and TEST.
- `.planning/ROADMAP.md` § Phase 1 — Phase 1 scope and success criteria.

### Existing Prototype References
- `server/index.js` — Initial prototype schemas, routes, and baseline agent tool methods to be modularized.
- `server/seed.js` — Seed data patterns for demo accounts, plans, entitlements, and incidents.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Baseline Mongoose schemas for User, Organization, Plan, Entitlement, HelpArticle, Incident, Ticket, Assignment, ToolRun in `server/index.js`.
- CSRF token HMAC generation and timing-safe comparison helper.
- Vector search and keyword fallback logic from prototype `searchHelp`.

### Established Patterns
- Express 4.x with ES Modules (`type: module`).
- Zod schema parsing for request input validation.
- Bcrypt password hashing (salt rounds: 12).
- MongoStore session persistence with secure HTTP-only cookies.

### Integration Points
- `server/index.js` as the clean application entry point loading routes, middleware, and database connection.
- `server/seed.js` script to populate reproducible accounts and demo scenarios.
- `test/` directory housing the `node:test` integration suites.
</code_context>

<specifics>
## Specific Ideas
- Demonstration scenario must show: Alex (Acme, Basic Plan) asks "Why can’t my team export this report?" and is told their plan does not permit exports; Sam (Northstar, Pro Plan) asks the identical question and is informed of the active intermittent export outage incident.
</specifics>

<deferred>
## Deferred Ideas
- Phase 2: React frontend screens (Help center, Ticket timeline, Investigation chat, Specialist queue, Knowledge publication).
- Production SMTP provider and Stripe billing integrations (out of scope for educational demo).
</deferred>

---
*Phase: 01-backend-core-security-agent-workflows-test-suite*  
*Context gathered: 2026-10-18*
