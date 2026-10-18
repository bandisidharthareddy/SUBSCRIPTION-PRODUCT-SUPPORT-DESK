import session from 'express-session';
import request from 'supertest';
import { createApp } from '../../server/app.js';
import { connectDB, disconnectDB } from '../../server/config/db.js';
import { runSeed } from '../../server/seed.js';

let appInstance = null;
const activeAgents = [];

export async function setupTestEnvironment() {
  await connectDB();
  await runSeed();
  if (!appInstance) {
    appInstance = createApp({ sessionStore: new session.MemoryStore() });
  }
  return appInstance;
}

export async function teardownTestEnvironment() {
  while (activeAgents.length > 0) {
    const a = activeAgents.pop();
    if (a?.app?.close) {
      try { a.app.close(); } catch (_) {}
    }
  }
  await disconnectDB();
}

export async function createAuthenticatedAgent(email, password = 'DemoPass!234') {
  const app = appInstance || createApp({ sessionStore: new session.MemoryStore() });
  const agent = request.agent(app);
  activeAgents.push(agent);

  // 1. Fetch initial CSRF token
  const csrfRes = await agent.get('/api/csrf');
  const csrfToken = csrfRes.body.token;

  // 2. Perform login
  const loginRes = await agent
    .post('/api/auth/login')
    .set('x-csrf-token', csrfToken)
    .send({ email, password });

  if (loginRes.status !== 200) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(loginRes.body)}`);
  }

  const user = loginRes.body.user;
  const sessionCsrf = loginRes.body.csrf;

  return {
    agent,
    user,
    csrfToken: sessionCsrf,
    get: (url) => agent.get(url),
    post: (url, body) => agent.post(url).set('x-csrf-token', sessionCsrf).send(body),
    patch: (url, body) => agent.patch(url).set('x-csrf-token', sessionCsrf).send(body),
    delete: (url) => agent.delete(url).set('x-csrf-token', sessionCsrf)
  };
}
