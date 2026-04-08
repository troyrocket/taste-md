import { Context, Next } from 'hono';
import { hashKey } from '../lib/token';

type Env = {
  Bindings: {
    DB: D1Database;
  };
};

export async function agentAuth(c: Context<Env>, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.slice(7);
  const tokenHash = await hashKey(token);

  const session = await c.env.DB.prepare(
    `SELECT s.agent_id, s.expires_at, s.is_revoked, a.is_active, a.name as agent_name
     FROM sessions s JOIN agents a ON s.agent_id = a.id
     WHERE s.token_hash = ?`
  )
    .bind(tokenHash)
    .first();

  if (!session) {
    return c.json({ error: 'Invalid token' }, 401);
  }
  if (session.is_revoked) {
    return c.json({ error: 'Token revoked' }, 401);
  }
  if (new Date(session.expires_at as string) < new Date()) {
    return c.json({ error: 'Token expired' }, 401);
  }
  if (!session.is_active) {
    return c.json({ error: 'Agent deactivated' }, 403);
  }

  c.set('agentId', session.agent_id);
  c.set('agentName', session.agent_name);
  await next();
}
