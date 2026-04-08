import { execSync } from 'child_process';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const BUCKET = 'taste-md-content';
const RESTAURANTS_DIR = './restaurants';
const DIST_DIR = './dist';

function getAllFiles(dir, base = dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...getAllFiles(full, base));
    } else {
      files.push({ path: full, key: relative('.', full) });
    }
  }
  return files;
}

async function main() {
  // Upload .md files from restaurants/
  const mdFiles = getAllFiles(RESTAURANTS_DIR).filter(f => f.path.endsWith('.md'));
  console.log(`Found ${mdFiles.length} .md files to upload`);

  let uploaded = 0;
  for (const file of mdFiles) {
    try {
      execSync(`wrangler r2 object put "${BUCKET}/${file.key}" --file="${file.path}" --content-type="text/markdown; charset=utf-8" --remote`, {
        stdio: 'pipe',
        cwd: './worker'
      });
      uploaded++;
      if (uploaded % 50 === 0) {
        console.log(`  Uploaded ${uploaded}/${mdFiles.length} .md files`);
      }
    } catch (e) {
      console.error(`  Failed: ${file.key}`);
    }
  }
  console.log(`Uploaded ${uploaded}/${mdFiles.length} .md files`);

  // Upload key dist files (index, sitemap, robots)
  const distTopFiles = ['index.html', 'sitemap.xml', 'robots.txt'].filter(f => {
    try { statSync(join(DIST_DIR, f)); return true; } catch { return false; }
  });

  for (const f of distTopFiles) {
    const contentType = f.endsWith('.html') ? 'text/html; charset=utf-8'
      : f.endsWith('.xml') ? 'application/xml'
      : 'text/plain';
    try {
      execSync(`wrangler r2 object put "${BUCKET}/dist/${f}" --file="${DIST_DIR}/${f}" --content-type="${contentType}" --remote`, {
        stdio: 'pipe',
        cwd: './worker'
      });
      console.log(`Uploaded dist/${f}`);
    } catch (e) {
      console.error(`Failed: dist/${f}`);
    }
  }

  // Upload dist HTML files (neighborhood indexes + restaurant pages)
  const htmlFiles = getAllFiles(DIST_DIR).filter(f => f.path.endsWith('.html') && f.key !== 'dist/index.html');
  console.log(`Found ${htmlFiles.length} .html files to upload`);

  let htmlUploaded = 0;
  for (const file of htmlFiles) {
    try {
      execSync(`wrangler r2 object put "${BUCKET}/${file.key}" --file="${file.path}" --content-type="text/html; charset=utf-8" --remote`, {
        stdio: 'pipe',
        cwd: './worker'
      });
      htmlUploaded++;
      if (htmlUploaded % 100 === 0) {
        console.log(`  Uploaded ${htmlUploaded}/${htmlFiles.length} .html files`);
      }
    } catch (e) {
      console.error(`  Failed: ${file.key}`);
    }
  }
  console.log(`Uploaded ${htmlUploaded}/${htmlFiles.length} .html files`);

  console.log('\nDone! All files uploaded to R2.');
}

main();
