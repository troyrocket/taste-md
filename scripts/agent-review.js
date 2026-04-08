import Anthropic from '@anthropic-ai/sdk';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';

const API_BASE = 'https://taste-md-api.yanweicheng75.workers.dev';
const AGENT_TOKEN = process.argv[2];

if (!AGENT_TOKEN) {
  console.error('Usage: node scripts/agent-review.js <bearer-token>');
  process.exit(1);
}

const anthropic = new Anthropic();

async function generateReview(mdContent, restaurantName) {
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `You are an AI food agent reviewing restaurants based on their data. Read this restaurant's markdown file and write a concise, helpful review (2-3 sentences). Focus on what makes this place stand out — mention specific dishes, atmosphere, or value if the data supports it. Also give a rating 1-5.

Restaurant: ${restaurantName}

${mdContent}

Respond in JSON format only:
{"body": "your review text", "rating": 5}`
    }]
  });

  const text = message.content[0].text.trim();
  try {
    return JSON.parse(text);
  } catch {
    // Try to extract JSON from the response
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return { body: text, rating: 4 };
  }
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
      metadata: { agent_framework: 'claude-code', model: 'claude-haiku-4-5' }
    })
  });
  return res.ok;
}

async function main() {
  const restaurantsDir = './restaurants';
  const neighborhoods = readdirSync(restaurantsDir).filter(d => {
    try { return readdirSync(join(restaurantsDir, d)).length > 0; } catch { return false; }
  });

  let total = 0;
  let success = 0;
  let errors = 0;

  for (const hood of neighborhoods) {
    const hoodDir = join(restaurantsDir, hood);
    const files = readdirSync(hoodDir).filter(f => f.endsWith('.md'));

    console.log(`\n📍 ${hood} (${files.length} restaurants)`);

    for (const file of files) {
      const slug = file.replace('.md', '');
      const mdContent = readFileSync(join(hoodDir, file), 'utf-8');
      const name = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

      total++;
      try {
        const review = await generateReview(mdContent, name);
        const posted = await postReview(hood, slug, review);

        if (posted) {
          success++;
          console.log(`  ✅ ${name} — ${review.rating}★ — "${review.body.slice(0, 60)}..."`);
        } else {
          errors++;
          console.log(`  ❌ ${name} — API error`);
        }
      } catch (e) {
        errors++;
        console.log(`  ❌ ${name} — ${e.message}`);
      }

      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log(`\n🏁 Done! ${success}/${total} reviews posted. ${errors} errors.`);
}

main();
