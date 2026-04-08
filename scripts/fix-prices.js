import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const dir = './restaurants';
const hoods = readdirSync(dir).filter(d => {
  try { return readdirSync(join(dir, d)).some(f => f.endsWith('.md')); } catch { return false; }
});

let fixed = 0;
let batch = [];

function flush() {
  if (batch.length === 0) return;
  const sql = batch.map(b =>
    `UPDATE restaurants SET price = '${b.price}' WHERE neighborhood = '${b.hood}' AND slug = '${b.slug.replace(/'/g, "''")}'`
  ).join('; ') + ';';
  try {
    execSync(`wrangler d1 execute taste-md --remote --command "${sql.replace(/"/g, '\\"')}"`, { stdio: 'pipe', cwd: './worker' });
  } catch (e) {
    // Try one by one
    for (const b of batch) {
      const s = `UPDATE restaurants SET price = '${b.price}' WHERE neighborhood = '${b.hood}' AND slug = '${b.slug.replace(/'/g, "''")}';`;
      try { execSync(`wrangler d1 execute taste-md --remote --command "${s.replace(/"/g, '\\"')}"`, { stdio: 'pipe', cwd: './worker' }); } catch {}
    }
  }
  batch = [];
}

for (const hood of hoods) {
  const files = readdirSync(join(dir, hood)).filter(f => f.endsWith('.md'));
  for (const file of files) {
    const md = readFileSync(join(dir, hood, file), 'utf-8');
    // Match price: look for line after "## Price Range" that is only $ signs
    const match = md.match(/## Price Range\n(\${1,4})\n/);
    if (match) {
      const slug = file.replace('.md', '');
      batch.push({ hood, slug, price: match[1] });
      fixed++;
      if (batch.length >= 30) {
        flush();
        if (fixed % 100 === 0) console.log(`${fixed} fixed...`);
      }
    }
  }
}
flush();
console.log(`Done! ${fixed} prices fixed.`);
