#!/usr/bin/env node

// Read restaurants.json → generate markdown + HTML pages
// Usage: node scripts/generate-pages.js

import 'dotenv/config';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { marked } from 'marked';

const dataFile = join(process.cwd(), 'data', 'restaurants.json');
if (!existsSync(dataFile)) {
  console.error('Run fetch-restaurants.js first.');
  process.exit(1);
}

const restaurants = JSON.parse(readFileSync(dataFile, 'utf-8'));
const mdDir = join(process.cwd(), 'restaurants');
const distDir = join(process.cwd(), 'dist');
mkdirSync(mdDir, { recursive: true });
mkdirSync(distDir, { recursive: true });

function neighborhoodSlug(neighborhood) {
  return (neighborhood || 'other')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function slug(name) {
  return (name || 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function priceLabel(level) {
  const map = {
    PRICE_LEVEL_FREE: 'Free',
    PRICE_LEVEL_INEXPENSIVE: '$',
    PRICE_LEVEL_MODERATE: '$$',
    PRICE_LEVEL_EXPENSIVE: '$$$',
    PRICE_LEVEL_VERY_EXPENSIVE: '$$$$',
  };
  return map[level] || 'Unknown';
}

function formatHours(openingHours) {
  if (!openingHours?.weekdayDescriptions) return 'Contact restaurant for hours';
  return openingHours.weekdayDescriptions.join('\n');
}

function extractReviewHighlights(reviews) {
  if (!reviews || reviews.length === 0) return 'No reviews available yet.';
  return reviews
    .slice(0, 5)
    .map(r => {
      const text = r.text?.text || '';
      const stars = r.rating ? '★'.repeat(r.rating) : '';
      const author = r.authorAttribution?.displayName || 'A diner';
      const time = r.relativePublishTimeDescription || '';
      // Show more of the review — up to 300 chars
      const snippet = text.length > 300 ? text.slice(0, 300) + '...' : text;
      return `- ${stars} "${snippet}" — **${author}**${time ? ` (${time})` : ''}`;
    })
    .join('\n');
}

function cleanWebsiteUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    // Strip UTM and tracking params
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(p => u.searchParams.delete(p));
    return u.toString();
  } catch { return url; }
}

function buildServiceOptions(r) {
  const opts = [];
  if (r.dineIn) opts.push('Dine-in');
  if (r.takeout) opts.push('Takeout');
  if (r.delivery) opts.push('Delivery');
  if (r.curbsidePickup) opts.push('Curbside pickup');
  if (r.reservable) opts.push('Reservations accepted');
  return opts.length ? opts.join(' · ') : null;
}

function buildMealTypes(r) {
  const meals = [];
  if (r.servesBreakfast) meals.push('Breakfast');
  if (r.servesBrunch) meals.push('Brunch');
  if (r.servesLunch) meals.push('Lunch');
  if (r.servesDinner) meals.push('Dinner');
  return meals.length ? meals.join(' · ') : null;
}

function buildDrinkOptions(r) {
  const drinks = [];
  if (r.servesCocktails) drinks.push('Cocktails');
  if (r.servesWine) drinks.push('Wine');
  if (r.servesBeer) drinks.push('Beer');
  return drinks.length ? drinks.join(' · ') : null;
}

function buildAtmosphere(r) {
  const vibes = [];
  if (r.outdoorSeating) vibes.push('Outdoor seating');
  if (r.liveMusic) vibes.push('Live music');
  if (r.goodForGroups) vibes.push('Good for groups');
  if (r.goodForChildren) vibes.push('Good for kids');
  if (r.goodForWatchingSports) vibes.push('Good for watching sports');
  if (r.allowsDogs) vibes.push('Dog-friendly');
  if (r.restroom) vibes.push('Restroom available');
  return vibes.length ? vibes.join(' · ') : null;
}

function buildAccessibility(r) {
  const a = r.accessibilityOptions;
  if (!a) return null;
  const opts = [];
  if (a.wheelchairAccessibleEntrance) opts.push('Wheelchair accessible entrance');
  if (a.wheelchairAccessibleRestroom) opts.push('Wheelchair accessible restroom');
  if (a.wheelchairAccessibleSeating) opts.push('Wheelchair accessible seating');
  if (a.wheelchairAccessibleParking) opts.push('Wheelchair accessible parking');
  return opts.length ? opts.join(' · ') : null;
}

function buildPayment(r) {
  const p = r.paymentOptions;
  if (!p) return null;
  const opts = [];
  if (p.acceptsCreditCards) opts.push('Credit cards');
  if (p.acceptsDebitCards) opts.push('Debit cards');
  if (p.acceptsCashOnly) opts.push('Cash only');
  if (p.acceptsNfc) opts.push('NFC / contactless');
  return opts.length ? opts.join(' · ') : null;
}

function buildParking(r) {
  const p = r.parkingOptions;
  if (!p) return null;
  const opts = [];
  if (p.paidParkingLot) opts.push('Paid parking lot');
  if (p.freeParkingLot) opts.push('Free parking lot');
  if (p.paidStreetParking) opts.push('Paid street parking');
  if (p.freeStreetParking) opts.push('Free street parking');
  if (p.valetParking) opts.push('Valet parking');
  if (p.paidGarageParking) opts.push('Paid garage parking');
  if (p.freeGarageParking) opts.push('Free garage parking');
  return opts.length ? opts.join(' · ') : null;
}

function generateMarkdown(r, hoodSlug, hood) {
  const name = r.displayName?.text || 'Unknown Restaurant';
  const address = r.formattedAddress || '';
  const phone = r.nationalPhoneNumber || '';
  const website = cleanWebsiteUrl(r.websiteUri);
  const rating = r.rating || 'N/A';
  const reviewCount = r.userRatingCount || 0;
  const price = priceLabel(r.priceLevel);
  const summary = r.editorialSummary?.text || '';
  const hours = formatHours(r.regularOpeningHours);
  const reviews = extractReviewHighlights(r.reviews);
  const primaryType = r.primaryTypeDisplayName?.text || '';
  const types = (r.types || [])
    .filter(t => !['restaurant', 'food', 'point_of_interest', 'establishment'].includes(t))
    .map(t => t.replace(/_/g, ' '))
    .slice(0, 8)
    .join(', ');
  const mapsUrl = r.googleMapsUri || '';
  const lat = r.location?.latitude;
  const lng = r.location?.longitude;

  const serviceOptions = buildServiceOptions(r);
  const mealTypes = buildMealTypes(r);
  const drinkOptions = buildDrinkOptions(r);
  const atmosphere = buildAtmosphere(r);
  const accessibility = buildAccessibility(r);
  const payment = buildPayment(r);
  const parking = buildParking(r);
  const vegetarian = r.servesVegetarianFood ? 'Yes' : null;

  // Build sections conditionally
  const sections = [];

  sections.push(`[taste.md](../index.html) / [${hood}](index.html)\n`);
  sections.push(`# ${name}`);
  if (summary) sections.push(summary);

  sections.push(`\n## Cuisine\n${primaryType ? `**${primaryType}** — ` : ''}${types || 'Restaurant'}`);
  sections.push(`\n## Price Range\n${price}`);
  sections.push(`\n## Rating\n${rating} stars — ${reviewCount.toLocaleString()} reviews`);

  // Use "  \n" (two trailing spaces) for markdown line breaks within a block
  const BR = '  \n';

  // Service & dining info
  const dining = [];
  if (serviceOptions) dining.push(`**Service:** ${serviceOptions}`);
  if (mealTypes) dining.push(`**Meals:** ${mealTypes}`);
  if (drinkOptions) dining.push(`**Drinks:** ${drinkOptions}`);
  if (vegetarian) dining.push(`**Vegetarian options:** ${vegetarian}`);
  if (dining.length) sections.push(`\n## Dining Options\n\n${dining.join(BR)}`);

  // Atmosphere
  if (atmosphere) sections.push(`\n## Atmosphere\n\n${atmosphere}`);

  // Location & contact
  const contact = [address];
  if (phone) contact.push(`Phone: ${phone}`);
  if (website) contact.push(`Website: [${website}](${website})`);
  if (mapsUrl) contact.push(`[View on Google Maps](${mapsUrl})`);
  if (lat && lng) contact.push(`Coordinates: ${lat}, ${lng}`);
  sections.push(`\n## Location & Contact\n\n${contact.join(BR)}`);

  sections.push(`\n## Hours\n\n${hours.split('\n').join(BR)}`);

  // Practical info
  const practical = [];
  if (payment) practical.push(`**Payment:** ${payment}`);
  if (parking) practical.push(`**Parking:** ${parking}`);
  if (accessibility) practical.push(`**Accessibility:** ${accessibility}`);
  if (practical.length) sections.push(`\n## Practical Info\n\n${practical.join(BR)}`);

  sections.push(`\n## What Diners Say\n${reviews}`);

  sections.push(`\n---\n\n*This page is optimized for AI discovery. Data sourced from public listings. Contact the restaurant to confirm details.*`);

  return sections.join('\n') + '\n';
}

function generateSchemaJSON(r) {
  const name = r.displayName?.text || '';
  const address = r.formattedAddress || '';
  const parts = address.split(',').map(s => s.trim());
  const types = (r.types || [])
    .filter(t => !['restaurant', 'food', 'point_of_interest', 'establishment'].includes(t))
    .map(t => t.replace(/_/g, ' '));

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name,
    servesCuisine: types,
    address: {
      '@type': 'PostalAddress',
      streetAddress: parts[0] || '',
      addressLocality: parts[1] || '',
      addressRegion: parts[2] || '',
      addressCountry: 'US',
    },
    telephone: r.nationalPhoneNumber || undefined,
    url: cleanWebsiteUrl(r.websiteUri) || undefined,
    priceRange: priceLabel(r.priceLevel),
    aggregateRating: r.rating ? {
      '@type': 'AggregateRating',
      ratingValue: String(r.rating),
      reviewCount: String(r.userRatingCount || 0),
    } : undefined,
  };

  if (r.location) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: r.location.latitude,
      longitude: r.location.longitude,
    };
  }

  if (r.regularOpeningHours?.weekdayDescriptions) {
    schema.openingHours = r.regularOpeningHours.weekdayDescriptions;
  }

  if (r.servesVegetarianFood) schema.hasMenu = { '@type': 'Menu', hasMenuSection: { name: 'Vegetarian options available' } };
  if (r.acceptsReservations || r.reservable) schema.acceptsReservations = true;

  // Reviews for schema
  if (r.reviews?.length) {
    schema.review = r.reviews.slice(0, 3).map(rev => ({
      '@type': 'Review',
      reviewRating: { '@type': 'Rating', ratingValue: String(rev.rating || 5) },
      author: { '@type': 'Person', name: rev.authorAttribution?.displayName || 'A diner' },
      reviewBody: rev.text?.text?.slice(0, 200) || '',
    }));
  }

  return schema;
}

function escapeHTML(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function generateHTML(md, schema, name, neighborhood) {
  const htmlBody = marked(md);
  const schemaTag = `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
  const escapedMd = escapeHTML(md);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} — ${neighborhood} — taste.md</title>
  <meta name="description" content="AI-optimized restaurant page for ${name} in ${neighborhood}, San Francisco. Find cuisine, hours, price, reviews, and location.">
  ${schemaTag}
  <style>
    body { max-width: 720px; margin: 2rem auto; padding: 0 1rem; font-family: system-ui, sans-serif; line-height: 1.8; color: #222; }
    h1 { font-size: 1.8rem; border-bottom: 2px solid #eee; padding-bottom: 0.5rem; margin-bottom: 0.5rem; }
    h1 + p { color: #555; margin-top: 0; margin-bottom: 1.5rem; }
    h2 { font-size: 1.15rem; color: #333; margin-top: 2.2rem; margin-bottom: 0.6rem; padding-bottom: 0.3rem; border-bottom: 1px solid #f0f0f0; }
    h2 + p, h2 + ul { margin-top: 0.4rem; }
    p { margin: 0.6rem 0; }
    ul { margin: 0.6rem 0; padding-left: 1.2rem; }
    li { margin-bottom: 0.8rem; }
    a { color: #0066cc; }
    hr { border: none; border-top: 1px solid #eee; margin: 2.5rem 0; }
    .footer { font-size: 0.8rem; color: #999; margin-top: 3rem; }
    .breadcrumb { font-size: 0.85rem; color: #666; margin-bottom: 1.5rem; }
    .breadcrumb a { color: #0066cc; }
    .view-toggle {
      position: fixed; top: 1rem; right: 1rem; z-index: 100;
      display: flex; background: #f5f5f5; border-radius: 8px; overflow: hidden;
      border: 1px solid #ddd; font-size: 0.85rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .view-toggle button {
      padding: 6px 14px; border: none; background: transparent;
      cursor: pointer; color: #666; font-family: system-ui, sans-serif; transition: all 0.2s;
    }
    .view-toggle button.active { background: #222; color: #fff; }
    #md-view {
      display: none; white-space: pre-wrap; word-break: break-all; overflow-x: auto;
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
      font-size: 0.9rem; line-height: 1.7; color: #333; background: #fafafa;
      border: 1px solid #eee; border-radius: 8px; padding: 1.5rem; margin-top: 0.5rem;
    }
  </style>
</head>
<body>
<div class="view-toggle">
  <button id="btn-html" class="active" onclick="switchView('html')">Page</button>
  <button id="btn-md" onclick="switchView('md')">Markdown</button>
</div>
<div id="html-view">
${htmlBody}
</div>
<pre id="md-view">${escapedMd}</pre>
<div class="footer">
  <p>taste.md — AI-optimized restaurant pages. Data from public listings.</p>
</div>
<script>
function switchView(mode) {
  var htmlView = document.getElementById('html-view');
  var mdView = document.getElementById('md-view');
  var btnHtml = document.getElementById('btn-html');
  var btnMd = document.getElementById('btn-md');
  if (mode === 'md') {
    htmlView.style.display = 'none';
    mdView.style.display = 'block';
    btnHtml.classList.remove('active');
    btnMd.classList.add('active');
    history.replaceState(null, '', '#md');
  } else {
    htmlView.style.display = 'block';
    mdView.style.display = 'none';
    btnHtml.classList.add('active');
    btnMd.classList.remove('active');
    history.replaceState(null, '', location.pathname);
  }
}
(function linkifyMd() {
  var el = document.getElementById('md-view');
  el.innerHTML = el.innerHTML.replace(/\\[([^\\]]+)\\]\\(((?:https?:\\/\\/[^)]+|[^)]+\\.html|[^)]+\\/))\\)/g, function(m, text, url) {
    var href = /^https?:\\/\\//.test(url) ? url : url + '#md';
    return '<a href="' + href + '">[' + text + '](' + url + ')</a>';
  });
})();
if (location.hash === '#md') switchView('md');
</script>
</body>
</html>`;
}

// Generate all pages, organized by neighborhood
let count = 0;
const neighborhoodMap = {}; // { neighborhood: [entries] }

for (const r of restaurants) {
  const name = r.displayName?.text || 'Unknown';
  const hood = r.neighborhood || 'Other';
  const hoodSlug = neighborhoodSlug(hood);
  const s = slug(name);

  // Create neighborhood subdirectories
  mkdirSync(join(mdDir, hoodSlug), { recursive: true });
  mkdirSync(join(distDir, hoodSlug), { recursive: true });

  const md = generateMarkdown(r, hoodSlug, hood);
  const schema = generateSchemaJSON(r);
  const html = generateHTML(md, schema, name, hood);

  writeFileSync(join(mdDir, hoodSlug, `${s}.md`), md);
  writeFileSync(join(distDir, hoodSlug, `${s}.html`), html);

  const entry = { name, slug: s, hoodSlug, neighborhood: hood, rating: r.rating, reviewCount: r.userRatingCount, address: r.formattedAddress };
  if (!neighborhoodMap[hood]) neighborhoodMap[hood] = [];
  neighborhoodMap[hood].push(entry);
  count++;
}

// Sort neighborhoods alphabetically, entries by rating
const sortedHoods = Object.keys(neighborhoodMap).sort();
const allEntries = [];
for (const hood of sortedHoods) {
  neighborhoodMap[hood].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  allEntries.push(...neighborhoodMap[hood]);
}

// Generate sitemap.xml
const DOMAIN = 'https://taste-md.pages.dev'; // change after deploy
const sitemapEntries = allEntries.map(e => `  <url><loc>${DOMAIN}/${e.hoodSlug}/${e.slug}.html</loc></url>`);
// Add neighborhood index pages
for (const hood of sortedHoods) {
  sitemapEntries.push(`  <url><loc>${DOMAIN}/${neighborhoodSlug(hood)}/</loc></url>`);
}
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${DOMAIN}/</loc></url>
${sitemapEntries.join('\n')}
</urlset>`;
writeFileSync(join(distDir, 'sitemap.xml'), sitemap);

// Generate robots.txt
const robots = `User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

Sitemap: ${DOMAIN}/sitemap.xml
`;
writeFileSync(join(distDir, 'robots.txt'), robots);


// --- Shared styles & script for toggle ---
const toggleStyles = `
    .view-toggle {
      position: fixed; top: 1rem; right: 1rem; z-index: 100;
      display: flex; background: #f5f5f5; border-radius: 8px; overflow: hidden;
      border: 1px solid #ddd; font-size: 0.85rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .view-toggle button {
      padding: 6px 14px; border: none; background: transparent;
      cursor: pointer; color: #666; font-family: system-ui, sans-serif; transition: all 0.2s;
    }
    .view-toggle button.active { background: #222; color: #fff; }
    #md-view {
      display: none; white-space: pre-wrap; word-break: break-all; overflow-x: auto;
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
      font-size: 0.9rem; line-height: 1.7; color: #333; background: #fafafa;
      border: 1px solid #eee; border-radius: 8px; padding: 1.5rem; margin-top: 0.5rem;
    }`;
const toggleScript = `
function switchView(mode) {
  var htmlView = document.getElementById('html-view');
  var mdView = document.getElementById('md-view');
  var btnHtml = document.getElementById('btn-html');
  var btnMd = document.getElementById('btn-md');
  if (mode === 'md') {
    htmlView.style.display = 'none';
    mdView.style.display = 'block';
    btnHtml.classList.remove('active');
    btnMd.classList.add('active');
    history.replaceState(null, '', '#md');
  } else {
    htmlView.style.display = 'block';
    mdView.style.display = 'none';
    btnHtml.classList.add('active');
    btnMd.classList.remove('active');
    history.replaceState(null, '', location.pathname);
  }
}
(function linkifyMd() {
  var el = document.getElementById('md-view');
  el.innerHTML = el.innerHTML.replace(/\\[([^\\]]+)\\]\\(((?:https?:\\/\\/[^)]+|[^)]+\\.html|[^)]+\\/))\\)/g, function(m, text, url) {
    var href = /^https?:\\/\\//.test(url) ? url : url + '#md';
    return '<a href="' + href + '">[' + text + '](' + url + ')</a>';
  });
})();
if (location.hash === '#md') switchView('md');`;
const toggleButtons = `<div class="view-toggle">
  <button id="btn-html" class="active" onclick="switchView('html')">Page</button>
  <button id="btn-md" onclick="switchView('md')">Markdown</button>
</div>`;

// --- Generate per-neighborhood index pages ---
for (const hood of sortedHoods) {
  const entries = neighborhoodMap[hood];
  const hSlug = neighborhoodSlug(hood);

  const hoodMd = `[taste.md](../index.html)

# ${hood} — San Francisco Restaurants

${entries.length} restaurants in ${hood}.

${entries.map(e => `- [${e.name}](${e.slug}.html) — ${e.rating ? e.rating + '★' : ''} ${e.reviewCount ? '(' + e.reviewCount + ' reviews)' : ''}`).join('\n')}
`;

  const hoodIndexHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${hood} Restaurants — taste.md</title>
  <meta name="description" content="AI-optimized restaurant directory for ${hood}, San Francisco. ${entries.length} restaurants indexed.">
  <style>
    body { max-width: 720px; margin: 2rem auto; padding: 0 1rem; font-family: system-ui, sans-serif; line-height: 1.6; color: #222; }
    h1 { font-size: 2rem; }
    .breadcrumb { font-size: 0.85rem; color: #666; margin-bottom: 1rem; }
    .breadcrumb a { color: #0066cc; }
    .restaurant { border-bottom: 1px solid #eee; padding: 0.8rem 0; }
    .restaurant a { color: #0066cc; text-decoration: none; font-weight: 600; }
    .restaurant a:hover { text-decoration: underline; }
    .meta { font-size: 0.85rem; color: #666; }
    ${toggleStyles}
  </style>
</head>
<body>
${toggleButtons}
<div id="html-view">
<div class="breadcrumb"><a href="../index.html">taste.md</a> / ${hood}</div>
<h1>${hood}</h1>
<p>${entries.length} restaurants in ${hood}, San Francisco.</p>
${entries.map(e => `<div class="restaurant">
  <a href="${e.slug}.html">${e.name}</a>
  <div class="meta">${e.rating ? e.rating + '★' : ''} ${e.reviewCount ? '(' + e.reviewCount + ' reviews)' : ''} — ${e.address || ''}</div>
</div>`).join('\n')}
</div>
<pre id="md-view">${escapeHTML(hoodMd)}</pre>
<script>${toggleScript}</script>
</body>
</html>`;

  writeFileSync(join(distDir, hSlug, 'index.html'), hoodIndexHTML);
}

// --- Generate main index page ---
const mainIndexMd = `# >_ taste.md

AI-optimized restaurant directory for San Francisco. ${count} restaurants across ${sortedHoods.length} neighborhoods.

${sortedHoods.map(hood => {
  const entries = neighborhoodMap[hood];
  return `## [${hood}](${neighborhoodSlug(hood)}/) (${entries.length})\n${entries.slice(0, 5).map(e => `- [${e.name}](${neighborhoodSlug(hood)}/${e.slug}.html) — ${e.rating ? e.rating + '★' : ''}`).join('\n')}${entries.length > 5 ? `\n- ... and ${entries.length - 5} more → [See all](${neighborhoodSlug(hood)}/)` : ''}`;
}).join('\n\n')}
`;

const mainIndexHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>taste.md — AI-Optimized Restaurant Directory, San Francisco</title>
  <meta name="description" content="Machine-readable restaurant pages optimized for AI discovery. ${count} restaurants across ${sortedHoods.length} San Francisco neighborhoods.">
  <style>
    body { max-width: 720px; margin: 2rem auto; padding: 0 1rem; font-family: system-ui, sans-serif; line-height: 1.6; color: #222; }
    h1 { font-size: 2.8rem; color: #FF3008; }
    h2 { font-size: 1.3rem; margin-top: 2rem; border-bottom: 1px solid #eee; padding-bottom: 0.3rem; }
    h2 a { color: #222; text-decoration: none; }
    h2 a:hover { color: #0066cc; }
    .hood-count { font-weight: normal; color: #999; font-size: 0.9rem; }
    .restaurant { padding: 0.4rem 0; }
    .restaurant a { color: #222; text-decoration: none; font-weight: normal; }
    .restaurant a:hover { text-decoration: underline; }
    .meta { font-size: 0.85rem; color: #666; display: inline; }
    .see-all { font-size: 0.85rem; } .see-all a { color: #999; }
    ${toggleStyles}
  </style>
</head>
<body>
${toggleButtons}
<div id="html-view">
<h1>&gt;_ taste.md</h1>
<p>AI-optimized restaurant directory for San Francisco. <strong>${count}</strong> restaurants across <strong>${sortedHoods.length}</strong> neighborhoods.</p>
${sortedHoods.map(hood => {
  const entries = neighborhoodMap[hood];
  const hSlug = neighborhoodSlug(hood);
  return `<h2><a href="${hSlug}/">${hood}</a> <span class="hood-count">(${entries.length})</span></h2>
${entries.slice(0, 5).map(e => `<div class="restaurant">
  <a href="${hSlug}/${e.slug}.html">${e.name}</a>
  <span class="meta"> — ${e.rating ? e.rating + '★' : ''} ${e.reviewCount ? '(' + e.reviewCount + ')' : ''}</span>
</div>`).join('\n')}
${entries.length > 5 ? `<div class="see-all"><a href="${hSlug}/">See all ${entries.length} restaurants in ${hood} →</a></div>` : ''}`;
}).join('\n')}
</div>
<pre id="md-view">${escapeHTML(mainIndexMd)}</pre>
<script>${toggleScript}</script>
</body>
</html>`;
writeFileSync(join(distDir, 'index.html'), mainIndexHTML);

console.log(`Generated ${count} restaurant pages across ${sortedHoods.length} neighborhoods.`);
console.log(`Markdown: ./restaurants/<neighborhood>/`);
console.log(`HTML:     ./dist/<neighborhood>/`);
console.log(`Sitemap:  ./dist/sitemap.xml`);
console.log(`Robots:   ./dist/robots.txt`);
