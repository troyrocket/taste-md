import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const RESTAURANTS_DIR = './restaurants';
const UPLOAD_TO_R2 = process.argv.includes('--upload');

function rewriteMd(content) {
  // Parse into sections
  const lines = content.split('\n');
  let title = '';
  let subtitle = '';
  const sections = {};
  let currentSection = '';
  let currentLines = [];

  for (const line of lines) {
    if (line.startsWith('# ') && !line.startsWith('## ')) {
      title = line.replace('# ', '');
    } else if (line.startsWith('## ')) {
      if (currentSection) {
        sections[currentSection] = currentLines.join('\n').trim();
      }
      currentSection = line.replace('## ', '');
      currentLines = [];
    } else if (!title && !currentSection) {
      // skip breadcrumb line
    } else if (!currentSection && title && !subtitle && line.trim() && !line.startsWith('[')) {
      subtitle = line.trim();
    } else {
      currentLines.push(line);
    }
  }
  if (currentSection) {
    sections[currentSection] = currentLines.join('\n').trim();
  }

  // Clean up Location & Contact: remove Coordinates line
  if (sections['Location & Contact']) {
    sections['Location & Contact'] = sections['Location & Contact']
      .split('\n')
      .filter(l => !l.startsWith('Coordinates:'))
      .join('\n')
      .trim();
  }

  // Build new .md in correct order
  const output = [];
  output.push(`# ${title}`);
  if (subtitle) output.push(subtitle);
  output.push('');

  // Ordered sections
  const order = [
    'Cuisine',
    'Price Range',
    'Rating',
    'Dining Options',
    'Atmosphere',
    'Location & Contact',
    'Hours',
    'Practical Info',
    'Frequently Asked Questions',
    'What Diners Say',
  ];

  for (const name of order) {
    if (sections[name]) {
      output.push(`## ${name}`);
      output.push('');
      output.push(sections[name]);
      output.push('');
    }
  }

  // Any remaining sections not in order
  for (const [name, content] of Object.entries(sections)) {
    if (!order.includes(name) && name !== 'Agent Reviews') {
      output.push(`## ${name}`);
      output.push('');
      output.push(content);
      output.push('');
    }
  }

  return output.join('\n').trim() + '\n';
}

// Process all files
const hoods = readdirSync(RESTAURANTS_DIR).filter(d => {
  try { return readdirSync(join(RESTAURANTS_DIR, d)).some(f => f.endsWith('.md')); } catch { return false; }
}).sort();

let total = 0;
let uploaded = 0;

for (const hood of hoods) {
  const files = readdirSync(join(RESTAURANTS_DIR, hood)).filter(f => f.endsWith('.md'));
  console.log(`${hood} (${files.length})`);

  for (const file of files) {
    const filePath = join(RESTAURANTS_DIR, hood, file);
    const content = readFileSync(filePath, 'utf-8');
    const rewritten = rewriteMd(content);

    // Write locally
    writeFileSync(filePath, rewritten);
    total++;

    // Upload to R2
    if (UPLOAD_TO_R2) {
      try {
        execSync(`wrangler r2 object put "taste-md-content/${filePath}" --file="${filePath}" --content-type="text/markdown" --remote`, {
          stdio: 'pipe',
          cwd: './worker'
        });
        uploaded++;
      } catch {}
    }

    if (total % 100 === 0) console.log(`  ${total} processed...`);
  }
}

console.log(`\nDone! ${total} files rewritten locally.${UPLOAD_TO_R2 ? ` ${uploaded} uploaded to R2.` : ' Run with --upload to push to R2.'}`);
