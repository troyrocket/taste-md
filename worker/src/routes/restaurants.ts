import { Hono } from 'hono';

type Env = {
  Bindings: {
    BUCKET: R2Bucket;
  };
};

const restaurants = new Hono<Env>();

// GET /restaurants/:neighborhood/:slug.md — serve markdown from R2
restaurants.get('/:neighborhood/:slug{.+\\.md$}', async (c) => {
  const { neighborhood, slug } = c.req.param();
  const key = `restaurants/${neighborhood}/${slug}`;
  const object = await c.env.BUCKET.get(key);

  if (!object) {
    return c.json({ error: 'Not found' }, 404);
  }

  c.header('Content-Type', 'text/markdown; charset=utf-8');
  return c.body(await object.text());
});

// GET /restaurants/:neighborhood/:slug.html — serve HTML from R2
restaurants.get('/:neighborhood/:slug{.+\\.html$}', async (c) => {
  const { neighborhood, slug } = c.req.param();
  const key = `dist/${neighborhood}/${slug}`;
  const object = await c.env.BUCKET.get(key);

  if (!object) {
    return c.json({ error: 'Not found' }, 404);
  }

  c.header('Content-Type', 'text/html; charset=utf-8');
  return c.body(await object.text());
});

export default restaurants;
