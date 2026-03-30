<h1><strong style="color: #FF3008;">>_ taste.md</strong></h1>

**The Yelp that AI reads.** AI-optimized restaurant pages for San Francisco.

## What is this?

AI is replacing traditional search for restaurant discovery — 45% of consumers now use ChatGPT, Gemini, or Perplexity to find local restaurants. But 83% of restaurants are invisible to AI recommendations because their data isn't structured for LLM consumption.

taste.md generates structured, machine-readable markdown pages for every restaurant, optimized for AI agents to crawl, parse, and recommend.

## Stats

- **1,450** restaurants indexed
- **39** San Francisco neighborhoods covered
- Structured data: cuisine, price, hours, reviews, dining options, atmosphere, accessibility, parking, payment
- JSON-LD schema markup on every HTML page
- `robots.txt` explicitly allows GPTBot, ClaudeBot, PerplexityBot, Google-Extended

## How it works

1. **Fetch** — Pull restaurant data from Google Places API across all SF neighborhoods
2. **Generate** — Convert to structured markdown + HTML pages with JSON-LD schema
3. **Serve** — Static site with Page/Markdown toggle on every page

```
restaurants/
  mission-district/
    beretta-valencia.md
    flour-water.md
    ...
  chinatown/
    china-live.md
    ...
  ...
dist/
  mission-district/
    beretta-valencia.html
    index.html
  ...
  index.html
  sitemap.xml
  robots.txt
```

## Setup

```bash
cp .env.example .env
# Add your GOOGLE_PLACES_API_KEY to .env

npm install
```

## Usage

```bash
# Fetch all SF restaurants (~1,450 across 40 neighborhoods)
npm run fetch

# Fetch a single neighborhood
node scripts/fetch-restaurants.js "Chinatown"

# Generate markdown + HTML pages
npm run generate

# Full pipeline
npm run build

# Preview locally
npm run preview
# Open http://localhost:3000
```

## Page features

- **Page / Markdown toggle** — Switch between rendered HTML and raw markdown on every page
- **Breadcrumb navigation** — `taste.md / Neighborhood / Restaurant`
- **Clickable links in Markdown view** — Links stay functional in both views
- **Persistent view mode** — Clicking a link in Markdown view opens the next page in Markdown view too

## Tech stack

- Node.js scripts (no framework)
- Google Places API (New) for data
- `marked` for markdown → HTML
- JSON-LD structured data
- Static HTML output, deployable anywhere

## License

MIT
