import { Hono } from 'hono';
import { layoutHTML } from '../lib/html-template';

type Env = {
  Bindings: {
    DB: D1Database;
  };
};

const search = new Hono<Env>();

// API: GET /search?q=italian — returns JSON for agents
search.get('/search', async (c) => {
  const q = c.req.query('q')?.trim();
  const format = c.req.query('format'); // ?format=json forces JSON

  if (!q) {
    if (format === 'json') return c.json({ results: [], query: '' });
    return c.html(layoutHTML('Search', searchPageHTML('', [])));
  }

  const results = await c.env.DB.prepare(
    `SELECT r.slug, r.neighborhood, r.name, r.cuisine, r.price, r.rating, r.review_count, r.snippet
     FROM restaurants_fts fts
     JOIN restaurants r ON fts.rowid = r.rowid
     WHERE restaurants_fts MATCH ?
     ORDER BY r.rating DESC
     LIMIT 20`
  ).bind(q + '*').all();

  // JSON response for agents
  if (format === 'json' || c.req.header('Accept')?.includes('application/json')) {
    return c.json({
      query: q,
      count: results.results.length,
      results: results.results.map((r: any) => ({
        name: r.name,
        neighborhood: r.neighborhood,
        cuisine: r.cuisine,
        price: r.price,
        rating: r.rating,
        review_count: r.review_count,
        url: `/${r.neighborhood}/${r.slug}`,
        md_url: `/restaurants/${r.neighborhood}/${r.slug}.md`,
      }))
    });
  }

  // HTML response for humans
  return c.html(layoutHTML('Search: ' + q, searchPageHTML(q, results.results as any[])));
});

function searchPageHTML(q: string, results: any[]) {
  const starsHtml = (rating: number | null) => {
    if (!rating) return '';
    const full = Math.floor(rating);
    const half = rating - full >= 0.3 ? 1 : 0;
    return '<span style="color:#FF3008;">' + '★'.repeat(full) + (half ? '½' : '') + '</span>';
  };

  const resultsHtml = results.length > 0
    ? `<p style="color:#666;margin-bottom:1rem;">${results.length} result${results.length > 1 ? 's' : ''}</p>
       <div class="grid">
         ${results.map((r: any) => {
           const hood = r.neighborhood.replace(/-/g, ' ').replace(/\b\w/g, (ch: string) => ch.toUpperCase());
           return `<a href="/${r.neighborhood}/${r.slug}" class="card" style="text-decoration:none;">
             <div class="card-title">${r.name}</div>
             <div class="card-meta" style="margin-top:4px;">
               ${r.rating ? starsHtml(r.rating) + ' <span style="color:#666;">' + r.rating + ' (' + (r.review_count || 0).toLocaleString() + ' reviews)</span>' : ''}
               ${r.price ? ' · <span style="color:#666;">' + r.price + '</span>' : ''}
             </div>
             ${r.cuisine ? '<div style="margin-top:4px;font-size:0.85rem;color:#999;">' + r.cuisine + ' · ' + hood + '</div>' : '<div style="margin-top:4px;font-size:0.85rem;color:#999;">' + hood + '</div>'}
             ${r.snippet ? '<div style="margin-top:6px;font-size:0.85rem;color:#666;">"' + r.snippet + '..."</div>' : ''}
           </a>`;
         }).join('\n')}
       </div>`
    : (q ? '<p style="color:#999;">No results found.</p>' : '');

  return `
    <h1>Search</h1>
    <form action="/search" method="get" style="margin-bottom:1.5rem;">
      <div style="display:flex;gap:8px;">
        <input type="text" name="q" value="${q}" placeholder="Search restaurants... (e.g. italian, sushi, mission)" style="flex:1;padding:10px 14px;border:1px solid #ddd;border-radius:6px;font-size:1rem;font-family:inherit;" autofocus />
        <button type="submit" style="padding:10px 20px;background:#FF3008;color:#fff;border:none;border-radius:6px;font-size:1rem;font-weight:600;cursor:pointer;">Search</button>
      </div>
    </form>
    ${resultsHtml}
  `;
}

export default search;
