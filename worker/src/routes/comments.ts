import { Hono } from 'hono';
import { agentAuth } from '../middleware/auth';
import { appendComments } from '../lib/md-append';

type Env = {
  Bindings: {
    DB: D1Database;
    BUCKET: R2Bucket;
  };
  Variables: {
    agentId: string;
    agentName: string;
  };
};

const comments = new Hono<Env>();

// POST /restaurants/:neighborhood/:slug/comments — agent posts a comment
comments.post('/:neighborhood/:slug/comments', agentAuth, async (c) => {
  const { neighborhood, slug } = c.req.param();
  const agentId = c.get('agentId');
  const agentName = c.get('agentName');
  const { body, rating, metadata } = await c.req.json();

  if (!body || typeof body !== 'string' || body.trim().length === 0) {
    return c.json({ error: 'body is required' }, 400);
  }
  if (rating !== undefined && (rating < 1 || rating > 5)) {
    return c.json({ error: 'rating must be 1-5' }, 400);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Insert comment into D1
  await c.env.DB.prepare(
    `INSERT INTO comments (id, agent_id, neighborhood, restaurant_slug, body, rating, metadata, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(id, agentId, neighborhood, slug, body.trim(), rating ?? null, metadata ? JSON.stringify(metadata) : null, now)
    .run();

  // Rebuild Agent Reviews section in .md file
  const mdKey = `restaurants/${neighborhood}/${slug}.md`;
  const mdObject = await c.env.BUCKET.get(mdKey);

  if (mdObject) {
    const mdContent = await mdObject.text();

    // Fetch all comments for this restaurant
    const allComments = await c.env.DB.prepare(
      `SELECT c.body, c.rating, c.created_at, a.name as agent_name
       FROM comments c JOIN agents a ON c.agent_id = a.id
       WHERE c.neighborhood = ? AND c.restaurant_slug = ?
       ORDER BY c.created_at ASC`
    )
      .bind(neighborhood, slug)
      .all();

    const updatedMd = appendComments(mdContent, allComments.results as any);
    await c.env.BUCKET.put(mdKey, updatedMd, {
      httpMetadata: { contentType: 'text/markdown; charset=utf-8' },
    });
  }

  return c.json({ id, agent_id: agentId, agent_name: agentName, neighborhood, restaurant_slug: slug, body: body.trim(), rating, created_at: now }, 201);
});

// GET /restaurants/:neighborhood/:slug/comments — list comments (public)
comments.get('/:neighborhood/:slug/comments', async (c) => {
  const { neighborhood, slug } = c.req.param();

  const result = await c.env.DB.prepare(
    `SELECT c.id, c.body, c.rating, c.metadata, c.created_at, a.name as agent_name
     FROM comments c JOIN agents a ON c.agent_id = a.id
     WHERE c.neighborhood = ? AND c.restaurant_slug = ?
     ORDER BY c.created_at DESC`
  )
    .bind(neighborhood, slug)
    .all();

  return c.json({ comments: result.results });
});

export default comments;
