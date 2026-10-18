# Subscription Product Support Desk

A reproducible full-stack capstone starter using React, Vite, Node.js, Express, Mongoose, MongoDB Atlas, Atlas Vector Search, Ollama, LangChain JS, and Zod.

## Features
- Verified-email signup flow (demo verification code), login/logout, password recovery, hashed passwords, expiring server-side Mongo sessions, HTTP-only cookies, CSRF tokens and login rate limiting.
- Customer, specialist, knowledge-manager and supervisor roles with server-side authorization and organization/ticket scoping.
- Seeded organizations, plans, entitlements, help article versions, simulated incidents and demo accounts.
- Public help/status routes; protected tickets, support chat/agent, assignment, resolution, escalation and help publication routes.
- Retrieval-backed answers with source citations. Ollama/LangChain is used when configured; deterministic grounded fallback works without a local model.
- Tool execution status makes incomplete checks explicit; no subscription upgrades/refunds are performed by the AI.
- React screens for help center, customer tickets, investigation chat, specialist queue and knowledge publication.

## Requirements
- Node.js 20+
- MongoDB local or MongoDB Atlas
- Optional: Ollama installed with a model pulled (example `ollama pull llama3.2`)

## Setup
1. Copy `.env.example` to `.env` and set `MONGODB_URI`, `SESSION_SECRET`, and `CSRF_SECRET`.
2. Install dependencies from the repository root:
   ```bash
   npm install
   ```
3. Seed the database:
   ```bash
   npm run seed
   ```
4. Start API and frontend:
   ```bash
   npm run dev
   ```
   Frontend: http://localhost:5173, API: http://localhost:4000

For first-run demo, signup shows a development verification code in the API console. In seeded data, demo users are already verified.

## Demo accounts
All seeded accounts use password `DemoPass!234`:
- `customer@acme.test` — customer, organization Acme
- `customer@northstar.test` — customer, organization Northstar
- `specialist@support.test` — specialist assigned tickets only
- `knowledge@support.test` — knowledge manager
- `supervisor@support.test` — supervisor

The seed script resets only the collections used by this demo. Do not run against production data.

## Atlas Vector Search
Create a vector search index on `helparticles` named `help_vector_index`, using the `embedding` field as a 768-dimensional vector field with cosine similarity. The starter attempts vector retrieval when the index and embeddings are available, and falls back to text retrieval if not.
Set `EMBEDDING_MODEL` to an Ollama embedding model that produces 768 dimensions (for example `nomic-embed-text`) and pull it with Ollama. The seeded vectors are optional; text retrieval still works without embeddings.

## Security notes
- This is an educational demo, not a production-ready identity system. Replace console-based email verification and password recovery with a real mail provider before deployment.
- Use HTTPS in production, set `COOKIE_SECURE=true`, configure trusted proxy settings intentionally, and rotate secrets.
- Never pass passwords, session tokens, payment details or raw secrets into model context.
- AI tools only derive organization scope from the authenticated session. Customer-supplied organization IDs are ignored.
- Staff permissions are resource-specific. Specialists see tickets assigned to them or explicitly assigned to their team; supervisors can assign and approve restricted workflows.
