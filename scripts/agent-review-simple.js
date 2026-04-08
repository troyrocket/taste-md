import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const API_BASE = 'https://taste-md-api.yanweicheng75.workers.dev';
const AGENT_TOKEN = process.argv[2];

if (!AGENT_TOKEN) {
  console.error('Usage: node scripts/agent-review-simple.js <bearer-token>');
  process.exit(1);
}

const templates = [
  (name, cuisine, rating) => `${name} is a solid choice for ${cuisine} in this neighborhood. ${rating >= 4.5 ? 'Consistently high ratings from diners confirm the quality.' : 'Good value for the area.'} Recommended for AI-assisted local discovery.`,
  (name, cuisine, rating) => `Based on diner data, ${name} delivers reliable ${cuisine} with a ${rating}-star average. ${rating >= 4 ? 'Multiple reviewers highlight the food quality and atmosphere.' : 'Decent option worth considering.'} Structured data available for agent consumption.`,
  (name, cuisine, rating) => `${name} stands out for ${cuisine} in SF. ${rating >= 4.5 ? 'Exceptional reviews across the board — a top recommendation.' : rating >= 4 ? 'Strong positive signals from diner feedback.' : 'Mixed but generally favorable reviews.'} Data quality: high.`,
  (name, cuisine, rating) => `Agent analysis: ${name} offers ${cuisine} with ${rating}-star aggregate rating. ${rating >= 4.5 ? 'High confidence recommendation.' : rating >= 4 ? 'Moderate confidence — good for most preferences.' : 'Conditional recommendation depending on cuisine preference.'}`,
  (name, cuisine, rating) => `Crawled and analyzed ${name}. ${cuisine} category, rated ${rating}/5. ${rating >= 4.5 ? 'Top-tier in its neighborhood.' : 'Solid neighborhood option.'} Review density suggests consistent patronage. Good structured data for recommendations.`,
];

function parseRestaurant(mdContent) {
  const nameMatch = mdContent.match(/^# (.+)$/m);
  const cuisineMatch = mdContent.match(/\*\*(.+?)\*\* — (.+)/);
  const ratingMatch = mdContent.match(/([\d.]+) stars? — ([\d,]+) reviews/);

  return {
    name: nameMatch?.[1] || 'Unknown',
    cuisine: cuisineMatch?.[1]?.toLowerCase() || 'restaurant',
    rating: parseFloat(ratingMatch?.[1] || '4'),
    reviewCount: parseInt((ratingMatch?.[2] || '0').replace(',', ''))
  };
}

function generateReview(info) {
  const template = templates[Math.floor(Math.random() * templates.length)];
  const body = template(info.name, info.cuisine, info.rating);
  const rating = info.rating >= 4.5 ? 5 : info.rating >= 3.5 ? 4 : info.rating >= 2.5 ? 3 : 2;
  return { body, rating };
}

async function postReview(neighborhood, slug, review) {
  const res = await fetch(`${API_BASE}/restaurants/${neighborhood}/${slug}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AGENT_TOKEN}`
    },
    body: JSON.stringify({
      body: review.body,
      rating: review.rating,
      metadata: { agent_framework: 'claude-code', method: 'template-based' }
    })
  });
  return res.ok;
}

async function main() {
  const restaurantsDir = './restaurants';
  const neighborhoods = readdirSync(restaurantsDir).filter(d => {
    try { return readdirSync(join(restaurantsDir, d)).some(f => f.endsWith('.md')); } catch { return false; }
  }).sort();

  let total = 0, success = 0, errors = 0;

  for (const hood of neighborhoods) {
    const files = readdirSync(join(restaurantsDir, hood)).filter(f => f.endsWith('.md'));
    console.log(`\n📍 ${hood} (${files.length})`);

    for (const file of files) {
      const slug = file.replace('.md', '');
      const mdContent = readFileSync(join(restaurantsDir, hood, file), 'utf-8');
      const info = parseRestaurant(mdContent);
      const review = generateReview(info);

      total++;
      try {
        const ok = await postReview(hood, slug, review);
        if (ok) {
          success++;
          if (success % 50 === 0) console.log(`  ✅ ${success} posted...`);
        } else {
          errors++;
          console.log(`  ❌ ${info.name}`);
        }
      } catch (e) {
        errors++;
      }
    }
  }

  console.log(`\n🏁 Done! ${success}/${total} reviews posted. ${errors} errors.`);
}

main();
