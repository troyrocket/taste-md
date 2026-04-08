import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const restaurantsDir = './restaurants';

function parseRestaurant(mdContent, slug, neighborhood) {
  const nameMatch = mdContent.match(/^# (.+)$/m);
  const cuisineMatch = mdContent.match(/\*\*(.+?)\*\* — (.+)/);
  const priceMatch = mdContent.match(/## Price Range\n+(\$+)/);
  const ratingMatch = mdContent.match(/([\d.]+) stars? — ([\d,]+) reviews/);
  const snippetMatch = mdContent.match(/"(.{20,80})/);

  return {
    slug,
    neighborhood,
    name: nameMatch?.[1] || slug.replace(/-/g, ' '),
    cuisine: cuisineMatch?.[1] || null,
    price: priceMatch?.[1] || null,
    rating: ratingMatch?.[1] ? parseFloat(ratingMatch[1]) : null,
    review_count: ratingMatch?.[2] ? parseInt(ratingMatch[2].replace(',', '')) : null,
    snippet: snippetMatch?.[1]?.replace(/"/g, '').slice(0, 80) || null,
  };
}

const neighborhoods = readdirSync(restaurantsDir).filter(d => {
  try { return readdirSync(join(restaurantsDir, d)).some(f => f.endsWith('.md')); } catch { return false; }
}).sort();

let total = 0;
const batchSize = 50;
let batch = [];

function flushBatch() {
  if (batch.length === 0) return;
  const values = batch.map(r => {
    const esc = (s) => s ? s.replace(/'/g, "''") : '';
    return `('${esc(r.slug)}','${esc(r.neighborhood)}','${esc(r.name)}','${esc(r.cuisine || '')}','${esc(r.price || '')}',${r.rating || 'NULL'},${r.review_count || 'NULL'},'${esc(r.snippet || '')}')`;
  }).join(',');
  const sql = `INSERT OR REPLACE INTO restaurants (slug,neighborhood,name,cuisine,price,rating,review_count,snippet) VALUES ${values};`;
  try {
    execSync(`wrangler d1 execute taste-md --remote --command "${sql.replace(/"/g, '\\"')}"`, { stdio: 'pipe', cwd: './worker' });
  } catch (e) {
    console.error(`  Batch error, trying one by one...`);
    for (const r of batch) {
      const esc = (s) => s ? s.replace(/'/g, "''") : '';
      const singleSql = `INSERT OR REPLACE INTO restaurants (slug,neighborhood,name,cuisine,price,rating,review_count,snippet) VALUES ('${esc(r.slug)}','${esc(r.neighborhood)}','${esc(r.name)}','${esc(r.cuisine || '')}','${esc(r.price || '')}',${r.rating || 'NULL'},${r.review_count || 'NULL'},'${esc(r.snippet || '')}');`;
      try {
        execSync(`wrangler d1 execute taste-md --remote --command "${singleSql.replace(/"/g, '\\"')}"`, { stdio: 'pipe', cwd: './worker' });
      } catch { console.error(`    Failed: ${r.name}`); }
    }
  }
  batch = [];
}

for (const hood of neighborhoods) {
  const files = readdirSync(join(restaurantsDir, hood)).filter(f => f.endsWith('.md'));
  console.log(`${hood} (${files.length})`);

  for (const file of files) {
    const slug = file.replace('.md', '');
    const md = readFileSync(join(restaurantsDir, hood, file), 'utf-8');
    const info = parseRestaurant(md, slug, hood);
    batch.push(info);
    total++;

    if (batch.length >= batchSize) {
      flushBatch();
      console.log(`  ${total} inserted...`);
    }
  }
}
flushBatch();
console.log(`\nDone! ${total} restaurants inserted.`);
