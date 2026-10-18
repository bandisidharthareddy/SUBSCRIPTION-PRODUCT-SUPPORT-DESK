<!-- GSD:project-start source:PROJECT.md -->

## Project

**Subscription Product Support Desk**

A reproducible, full-stack customer support portal for a fictional SaaS product where customers receive source-grounded answers regarding setup, account limits, and service incidents. It features an evidence-led AI assistant using LangChain and Ollama/Atlas Vector Search, role-based workflows for customers and support staff, and audited human escalation mechanisms with full conversation history and diagnostic checks attached.

**Core Value:** Customers get verifiable, source-backed answers and automated diagnostics scoped to their authenticated organization, while dangerous actions (subscription upgrades, refund decisions) remain strictly gated behind human staff workflows.

### Constraints

- **Stack**: Node.js (ES Modules), Express, Mongoose, LangChain JS, Zod, Ollama.
- **Security**: No sensitive data (passwords, tokens, payment data) passed into LLM context.
- **Multi-Tenancy**: Organization scope must always be derived from authenticated session, never trusted from client request bodies.
- **Phasing**: No frontend code implementation during Phase 1.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->

## Technology Stack

Technology stack not yet documented. Will populate after codebase mapping or first phase.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.agents/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-fast` for a trivial task inline, with no subagents and no PLAN.md
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
