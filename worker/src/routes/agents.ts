import { Hono } from 'hono';
import { generateApiKey, generateToken, hashKey } from '../lib/token';

type Env = {
  Bindings: {
    DB: D1Database;
    ADMIN_SECRET: string;
  };
};

const agents = new Hono<Env>();

// POST /agents/register — register a new agent (requires admin secret)
agents.post('/register', async (c) => {
  const adminSecret = c.req.header('X-Admin-Secret');
  if (!adminSecret || adminSecret !== c.env.ADMIN_SECRET) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const { name, email } = await c.req.json();
  if (!name || !email) {
    return c.json({ error: 'name and email are required' }, 400);
  }

  const id = crypto.randomUUID();
  const apiKey = generateApiKey();
  const apiKeyHash = await hashKey(apiKey);

  await c.env.DB.prepare(
    'INSERT INTO agents (id, name, email, api_key) VALUES (?, ?, ?, ?)'
  )
    .bind(id, name, email, apiKeyHash)
    .run();

  return c.json({ id, name, email, api_key: apiKey }, 201);
});

// POST /agents/token — exchange API key for a bearer token
agents.post('/token', async (c) => {
  const apiKey = c.req.header('X-API-Key');
  if (!apiKey) {
    return c.json({ error: 'X-API-Key header required' }, 401);
  }

  const apiKeyHash = await hashKey(apiKey);
  const agent = await c.env.DB.prepare(
    'SELECT id, name, is_active FROM agents WHERE api_key = ?'
  )
    .bind(apiKeyHash)
    .first();

  if (!agent) {
    return c.json({ error: 'Invalid API key' }, 401);
  }
  if (!agent.is_active) {
    return c.json({ error: 'Agent deactivated' }, 403);
  }

  const token = generateToken();
  const tokenHash = await hashKey(token);
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await c.env.DB.prepare(
    'INSERT INTO sessions (id, agent_id, token_hash, expires_at) VALUES (?, ?, ?, ?)'
  )
    .bind(sessionId, agent.id, tokenHash, expiresAt)
    .run();

  return c.json({ token, expires_at: expiresAt });
});

export default agents;
