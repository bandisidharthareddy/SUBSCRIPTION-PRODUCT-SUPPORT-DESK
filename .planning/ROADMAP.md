# Roadmap: Subscription Product Support Desk

## Overview

This roadmap defines the implementation journey for the Subscription Product Support Desk. Per user requirements, the scope is divided strictly into two major phases: **Phase 1 builds and validates the complete, modular, secure backend** (domain modeling, multi-tenant RBAC, version-aware RAG, purposeful support agent tools, ticket workflows, and automated security/acceptance test suites) with zero frontend work; **Phase 2 builds the modular React frontend and client interfaces**.

## Phases

- [ ] **Phase 1: Backend Core, Security, Agent Workflows & Test Suite** - Modular Express architecture, multi-tenant RBAC, version-aware RAG, evidence-led AI tools, ticket lifecycles, and automated acceptance tests.
- [ ] **Phase 2: Frontend React Portal & Client-Side Workflows** - Modular React UI components for Help Center, Ticket Timeline, Investigation Chat, Specialist Queue, and Knowledge Operations.

---

## Phase Details

### Phase 1: Backend Core, Security, Agent Workflows & Test Suite
**Goal**: Build a complete, production-grade, modular Node.js/Express backend that fulfills all multi-tenant domain models, secure authentication, role-based workflows, version-aware help RAG, purposeful support agent tooling, and comprehensive automated test suites.
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, RBAC-01, RBAC-02, RBAC-03, RBAC-04, RBAC-05, TICK-01, TICK-02, TICK-03, TICK-04, TICK-05, TICK-06, KNOW-01, KNOW-02, KNOW-03, KNOW-04, KNOW-05, AGENT-01, AGENT-02, AGENT-03, AGENT-04, AGENT-05, AGENT-06, GROUP-01, GROUP-02, GROUP-03, TEST-01, TEST-02, TEST-03, TEST-04, TEST-05
**Success Criteria** (what must be TRUE):
  1. Server is modularized into standard controllers, routes, models, middleware, and services (decoupling monolithic `index.js`).
  2. Multi-tenant isolation and strict RBAC prevent unauthorized cross-tenant data access and block staff role self-assignment.
  3. Version-aware RAG and support agent tools (`readEntitlements`, `readServiceStatus`, `searchHelp`) execute with timeout protection, audit logging, and incomplete check reporting without hallucinated refunds/upgrades.
  4. Ticket lifecycle endpoints support customer creation/viewing, specialist resolution, supervisor assignment, and incident correlation without leaking PII.
  5. Automated test suite passes for tenant isolation, tool timeouts, hallucination guardrails, and role permissions using reproducible seeded data.
**Plans**: 5 plans

Plans:
- [ ] 01-01: Modular Architecture, Domain Models & Multi-Tenant Membership Schema
- [ ] 01-02: Authentication, Session Management, CSRF & Role-Based Access Control
- [ ] 01-03: Version-Aware Knowledge Base, Atlas/Keyword RAG & Purposeful Agent Tools
- [ ] 01-04: Ticket Lifecycles, Staff Escalation Workflows & Semantic Grouping
- [ ] 01-05: Reproducible Seed Dataset & Automated Acceptance/Security Test Suite

---

### Phase 2: Frontend React Portal & Client-Side Workflows
**Goal**: Build a modular, responsive React interface consuming the Phase 1 backend APIs for all user roles.
**Depends on**: Phase 1
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06
**Success Criteria** (what must be TRUE):
  1. Customer can browse version-filtered help articles and view live service incidents.
  2. Customer can manage tickets, view interactive timelines, and run investigation chat with live tool status badges and citations.
  3. Support specialist can review assigned tickets and submit resolutions in a dedicated queue.
  4. Knowledge manager can draft and publish versioned articles.
**Plans**: TBD (planned when Phase 1 completes)

---

## Progress

**Execution Order:**
Phase 1 → Phase 2

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Backend Core, Security, Agent Workflows & Test Suite | 0/5 | Not started | - |
| 2. Frontend React Portal & Client-Side Workflows | 0/4 | Not started | - |
