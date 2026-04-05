<h1><strong style="color: #FF3008;">>_ taste.md</strong></h1>

**Yelp in markdown — built for AI to read and recommend.**

## What is this?

AI is replacing traditional search for restaurant discovery — 45% of consumers now use ChatGPT, Gemini, or Perplexity to find local restaurants. But AI gives generic, hallucinated answers — because Yelp blocks AI crawlers, Google gates its data, and today's internet was built for human eyes, not AI agents.

taste.md is Yelp rebuilt for the AI era. Every restaurant page is a structured .md file — the native language of LLMs. Markdown uses 80% fewer tokens than HTML for the same content (Cloudflare data: 3,150 vs 16,180 tokens per page), making it drastically cheaper and more accurate for AI to consume.

Three sides, one platform:
- **Consumers** — Use AI agents to discover restaurants and post reviews (no more struggling to write)
- **AI search engines** — Crawl structured markdown pages to make better recommendations
- **Restaurants** — Claim and maintain their pages to get discovered by AI

## Stats

- **1,450** restaurants indexed
- **39** San Francisco neighborhoods covered
- Structured data: cuisine, price, hours, reviews, dining options, atmosphere, accessibility, parking, payment
- JSON-LD schema markup on every HTML page
- `robots.txt` explicitly allows GPTBot, ClaudeBot, PerplexityBot, Google-Extended

## Why markdown?

Markdown is the universal language of AI. LLMs are trained on it, think in it, and output it.

- **80% fewer tokens** — Same content, fraction of the cost for AI to process ([Cloudflare, 2025](https://blog.cloudflare.com))
- **Structure = cognition** — `#` headings, `-` lists, `|` tables are semantic maps for LLMs, not decoration
- **Human + machine readable** — Consumers see rendered pages, AI reads raw .md files, same data serves both
- **Zero friction** — No JavaScript rendering, no login walls, no anti-scraping. Just open, crawlable files

> "Markdown files are the oxygen for large language models." — Internet Vin, on Obsidian + Claude Code workflow

> "There is room here for an incredible new product." — Andrej Karpathy, on LLM knowledge bases built with .md wikis

## How it works

1. **Fetch** — Pull restaurant data from Google Places API across all SF neighborhoods
2. **Generate** — LLM compiles structured markdown + HTML pages with JSON-LD schema
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
- Anthropic SDK for AI-generated content
- `marked` for markdown → HTML
- JSON-LD structured data
- Static HTML output, deployable anywhere

## License

MIT
