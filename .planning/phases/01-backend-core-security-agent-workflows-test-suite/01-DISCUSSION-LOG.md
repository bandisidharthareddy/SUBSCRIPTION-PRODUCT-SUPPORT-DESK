# Phase 1: Backend Core, Security, Agent Workflows & Test Suite - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.  
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-18  
**Phase:** 1-Backend Core, Security, Agent Workflows & Test Suite  
**Areas discussed:** Domain Model & Multi-Tenancy, AI Agent Workflow & Fallback, Semantic Ticket Grouping, Acceptance Testing  

---

## 1. Domain Model: Multi-Tenancy Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit Membership collection | Separate User, Org, and Membership collections for strict multi-tenancy and auditability | ✓ |
| Embedded orgId on User | Keep orgId embedded on User schema, but enforce query-level session tenant filters | |

**User's choice:** Explicit Membership collection (User + Org + Membership) for strict multi-tenancy and auditability.  
**Notes:** Establishes a solid B2B foundation where users can be associated with organizations cleanly and roles within an organization are explicitly separated from user identity.

---

## 2. AI Agent Workflow: Model Execution and Fallback

| Option | Description | Selected |
|--------|-------------|----------|
| Hybrid fallback | Deterministic evidence aggregation fallback (offline-ready for tests) + LangChain Ollama when configured | ✓ |
| Strict Ollama-only | Require local Ollama running for all agent operations | |

**User's choice:** Hybrid: Deterministic evidence aggregation fallback (offline-ready for tests) + LangChain Ollama when configured.  
**Notes:** Ensures automated tests and demos can run in any environment with zero flaky external dependencies, while enhancing answers when local Ollama is active.

---

## 3. Semantic Ticket Grouping: Cross-Customer Privacy

| Option | Description | Selected |
|--------|-------------|----------|
| Feature & Incident tagging | Group by feature/incident IDs with sanitized subject keywords (zero PII exposure) | ✓ |
| Vector embeddings over raw text | Anonymize text before embedding and only return related incident IDs | |

**User's choice:** Feature & Incident tagging: Group by feature/incident IDs with sanitized subject keywords (zero PII exposure).  
**Notes:** Guarantees zero cross-customer data leakage while providing support staff with actionable incident context.

---

## 4. Acceptance Testing: Test Runner

| Option | Description | Selected |
|--------|-------------|----------|
| Node.js native test runner | `node:test` + `supertest` — lightweight, zero bloat, native ES Modules | ✓ |
| Vitest + supertest | Feature-rich modern test runner | |

**User's choice:** Node.js native test runner (node:test + supertest) — lightweight, zero bloat, native ES Modules.  
**Notes:** Keeps the backend dependency footprint clean and executes tests natively in modern Node.js 20+.
