# Subscription Product Support Desk

## What This Is

A reproducible, full-stack customer support portal for a fictional SaaS product where customers receive source-grounded answers regarding setup, account limits, and service incidents. It features an evidence-led AI assistant using LangChain and Ollama/Atlas Vector Search, role-based workflows for customers and support staff, and audited human escalation mechanisms with full conversation history and diagnostic checks attached.

## Core Value

Customers get verifiable, source-backed answers and automated diagnostics scoped to their authenticated organization, while dangerous actions (subscription upgrades, refund decisions) remain strictly gated behind human staff workflows.

## Business Context

- **Customer**: B2B SaaS subscribers needing troubleshooting for account entitlements, report exports, and service incidents.
- **Revenue model**: Tiered subscription plans (e.g., Basic vs. Pro) with specific feature limits and entitlements.
- **Success metric**: 100% tenant data isolation, zero hallucinated refund/upgrade decisions, and clear escalation tracking with attached tool diagnostics.
- **Strategy notes**: Educational and reproducible demonstration for capstone review.

## Requirements

### Validated

- ✓ [Express starter with session and CSRF basics] — initial prototype
- ✓ [Basic Mongoose schemas for User, Org, Plan, HelpArticle, Incident, Ticket] — initial prototype
- ✓ [Prototype vector and keyword search fallback] — initial prototype

### Active

- [ ] **Phase 1: Backend Architecture & Domain Modeling** — Modularize Express backend into clean controllers, routes, middleware, and services; add formal Multi-Tenant `Membership` model and audit logs.
- [ ] **Phase 1: Robust Auth & Resource-Level RBAC** — Verified-email signup, login/logout, password recovery, session cookies, CSRF protection, login rate limits, and strict permission enforcement (Customer, Specialist, Knowledge Manager, Supervisor) with zero role self-assignment.
- [ ] **Phase 1: Version-Aware Help RAG** — Versioned help article retrieval with Atlas Vector Search & text fallback; conflict detection and source citation grounding.
- [ ] **Phase 1: Purposeful Support Agent & Tooling** — Agent loop executing `readEntitlements(authorizedOrg)`, `readServiceStatus(feature)`, and `searchHelp(error, version)` with tool timeout handling, incomplete check detection, and prevention of hallucinated actions.
- [ ] **Phase 1: Semantic Ticket Grouping & Incident Correlation** — Backend grouping of related issues and public incident associations while preserving cross-customer privacy.
- [ ] **Phase 1: Seeded Dataset & Acceptance/Security Test Suite** — Reproducible seed data and automated tests verifying tenant isolation, hallucinated refund prevention, tool timeout recovery, and RBAC guards.
- [ ] **Phase 2: Frontend & Client Integration** — Modular React screens for Help Center, Customer Ticket Timeline, Investigation Chat, Specialist Queue, and Knowledge Publication.

### Out of Scope

- Real billing payment gateways (Stripe/Paddle) — Seeded plans and entitlement dataset used for deterministic, offline testing.
- Autonomous refund/plan modification by AI — Subscriptions and refunds must remain explicit staff-controlled workflows.
- Real SMTP email service — Console-printed verification codes used for zero-dependency local demo.
- Direct customer access to other tenants' tickets or private notes — Strict multi-tenant isolation enforced at the database query layer.

## Context

- **Tech Stack**: Node.js, Express, Mongoose, MongoDB Atlas / Vector Search, Ollama, LangChain JS, Zod, React + Vite.
- **Phasing Strategy**: Phase 1 is exclusively focused on building a rock-solid, production-grade modular backend with automated acceptance tests. Phase 2 handles frontend UI and integration.
- **Demonstration Scenarios**: One customer encounters a plan limit (e.g., export limit) while another encounters an outage; identical queries yield different, verifiable explanations based on live tool results.

## Constraints

- **Stack**: Node.js (ES Modules), Express, Mongoose, LangChain JS, Zod, Ollama.
- **Security**: No sensitive data (passwords, tokens, payment data) passed into LLM context.
- **Multi-Tenancy**: Organization scope must always be derived from authenticated session, never trusted from client request bodies.
- **Phasing**: No frontend code implementation during Phase 1.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Two-Phase Delivery (Phase 1 Backend, Phase 2 Frontend) | User requirement: complete and verify backend logic, security, and tests before UI integration | — Pending |
| Modular MVC/Service backend architecture | Refactor monolithic `server/index.js` into standard routes, controllers, services, models, and middleware | — Pending |
| Deterministic AI Grounded Fallback | Allows the app and test suite to run reliably even if Ollama or Atlas Vector Search is offline | — Pending |
| Explicit Multi-Tenant Membership Schema | Separates user identity from organization memberships for clean permission checking | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-10-18 after initialization*
