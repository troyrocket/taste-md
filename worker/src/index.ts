import { Hono } from 'hono';
import { cors } from 'hono/cors';
import agents from './routes/agents';
import comments from './routes/comments';
import restaurants from './routes/restaurants';
import search from './routes/search';
import skill from './routes/skill';
import pages from './routes/pages';

type Env = {
  Bindings: {
    DB: D1Database;
    BUCKET: R2Bucket;
    ADMIN_SECRET: string;
  };
};

const app = new Hono<Env>();

app.use('/agents/*', cors());
app.use('/restaurants/*/comments', cors());
app.use('/search*', cors());

app.get('/health', (c) => c.json({ status: 'ok', service: 'taste-md-api' }));

// API routes
app.route('/agents', agents);
app.route('/restaurants', comments);
app.route('/restaurants', restaurants);

// Search (humans + agents)
app.route('', search);

// Skill file for AI agents
app.route('', skill);

// Frontend pages (humans browse, agents post via API)
app.route('', pages);

export default app;
