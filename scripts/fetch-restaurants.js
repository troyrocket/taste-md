#!/usr/bin/env node

// Fetch ALL restaurants across San Francisco neighborhoods via Google Places API (New)
// Usage:
//   node scripts/fetch-restaurants.js              # all SF neighborhoods
//   node scripts/fetch-restaurants.js "Chinatown"  # single neighborhood

import 'dotenv/config';
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY) {
  console.error('Set GOOGLE_PLACES_API_KEY in .env');
  process.exit(1);
}

const outDir = join(process.cwd(), 'data');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const BASE = 'https://places.googleapis.com/v1/places:searchText';

// Major SF neighborhoods for comprehensive coverage
const SF_NEIGHBORHOODS = [
  'Mission District',
  'SoMa',
  'Chinatown',
  'North Beach',
  'Marina District',
  'Hayes Valley',
  'Castro',
  'Noe Valley',
  'Pacific Heights',
  'Russian Hill',
  'Nob Hill',
  'Financial District',
  'Union Square',
  'Tenderloin',
  'Japantown',
  'Richmond District',
  'Sunset District',
  'Haight-Ashbury',
  'Potrero Hill',
  'Dogpatch',
  'Bernal Heights',
  'Inner Sunset',
  'Outer Sunset',
  'Inner Richmond',
  'Outer Richmond',
  'Cole Valley',
  'Glen Park',
  'Excelsior',
  'Bayview',
  'Visitacion Valley',
  'Fillmore',
  'Lower Haight',
  'Cow Hollow',
  'Presidio Heights',
  'West Portal',
  'Parkside',
  'Forest Hill',
  'Twin Peaks',
  'Diamond Heights',
  'Duboce Triangle',
];

// Extended field mask — pull everything useful
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.shortFormattedAddress',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.googleMapsUri',
  'places.regularOpeningHours',
  'places.priceLevel',
  'places.rating',
  'places.userRatingCount',
  'places.types',
  'places.primaryType',
  'places.primaryTypeDisplayName',
  'places.editorialSummary',
  'places.reviews',
  'places.photos',
  'places.location',
  'places.accessibilityOptions',
  'places.paymentOptions',
  'places.parkingOptions',
  'places.dineIn',
  'places.takeout',
  'places.delivery',
  'places.curbsidePickup',
  'places.reservable',
  'places.servesBreakfast',
  'places.servesLunch',
  'places.servesDinner',
  'places.servesBrunch',
  'places.servesBeer',
  'places.servesWine',
  'places.servesCocktails',
  'places.servesVegetarianFood',
  'places.outdoorSeating',
  'places.liveMusic',
  'places.goodForChildren',
  'places.goodForGroups',
  'places.goodForWatchingSports',
  'places.allowsDogs',
  'places.restroom',
  'nextPageToken',
].join(',');

async function fetchPage(textQuery, pageToken) {
  const body = {
    textQuery,
    includedType: 'restaurant',
    languageCode: 'en',
    maxResultCount: 20,
  };
  if (pageToken) body.pageToken = pageToken;

  const res = await fetch(BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`  API error ${res.status}: ${err}`);
    return { places: [], nextPageToken: null };
  }

  const data = await res.json();
  return { places: data.places || [], nextPageToken: data.nextPageToken || null };
}

async function fetchNeighborhood(neighborhood) {
  const query = `restaurants in ${neighborhood}, San Francisco`;
  console.log(`  Fetching: "${query}"...`);
  const results = [];
  let pageToken = null;

  do {
    const { places, nextPageToken } = await fetchPage(query, pageToken);
    // Tag each restaurant with the neighborhood it was found in
    for (const p of places) {
      if (!p.neighborhood) p.neighborhood = neighborhood;
    }
    results.push(...places);
    pageToken = nextPageToken;
    if (pageToken) await new Promise(r => setTimeout(r, 2000));
  } while (pageToken);

  console.log(`  → ${results.length} results`);
  return results;
}

function deduplicateById(restaurants) {
  const seen = new Map();
  for (const r of restaurants) {
    // Keep the first occurrence (preserves neighborhood from first search hit)
    if (!seen.has(r.id)) seen.set(r.id, r);
  }
  return Array.from(seen.values());
}

async function main() {
  const singleNeighborhood = process.argv[2];
  const neighborhoods = singleNeighborhood ? [singleNeighborhood] : SF_NEIGHBORHOODS;

  // Load existing data if present, for incremental updates
  const outFile = join(outDir, 'restaurants.json');
  let existing = [];
  if (existsSync(outFile)) {
    try { existing = JSON.parse(readFileSync(outFile, 'utf-8')); } catch {}
  }

  console.log(`Fetching restaurants from ${neighborhoods.length} neighborhood(s)...`);
  if (existing.length) console.log(`Existing data: ${existing.length} restaurants`);

  const allResults = [...existing];

  for (let i = 0; i < neighborhoods.length; i++) {
    const hood = neighborhoods[i];
    console.log(`\n[${i + 1}/${neighborhoods.length}] ${hood}`);
    try {
      const results = await fetchNeighborhood(hood);
      allResults.push(...results);
    } catch (err) {
      console.error(`  Error fetching ${hood}: ${err.message}`);
    }
    // Rate limit between neighborhoods
    if (i < neighborhoods.length - 1) await new Promise(r => setTimeout(r, 1000));
  }

  const deduplicated = deduplicateById(allResults);
  console.log(`\nTotal: ${allResults.length} raw → ${deduplicated.length} unique restaurants`);

  writeFileSync(outFile, JSON.stringify(deduplicated, null, 2));
  console.log(`Saved to ${outFile}`);
}

main().catch(console.error);
