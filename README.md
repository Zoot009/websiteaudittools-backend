# websiteaudittools-backend

A comprehensive SEO audit and website analysis backend built with Express.js, Playwright, and Prisma.

## Features

- **Full-Site SEO Audits** - Crawl websites and analyze 25+ SEO rules
- **Link Graph Analysis** - Generate internal link structure visualizations
- **On-Demand Crawler** - Quick link graph crawling without database storage
- **Screenshot Service** - Capture website screenshots
- **Anti-Bot Protection** - Cloudflare bypass, human behavior simulation
- **Browser Pooling** - Efficient concurrent crawling with Playwright
- **Queue System** - Background job processing with Bull/Redis

## Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL
- Redis (for job queue)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp env.example .env

# Run database migrations
npx prisma migrate dev

# Seed test data
npx prisma db seed

# Start server
npm run dev
```

The server will start on `http://localhost:3000`.

## API Endpoints

### Audits

- `POST /api/audits` - Create a new SEO audit job
- `GET /api/audits/jobs/:jobId` - Check audit job status

### Link Graph

#### On-Demand Crawler (Asynchronous)

**Queue a crawl job:**
```bash
POST /api/link-graph/crawl
```

Crawl a website in the background and return an internal link graph compatible with D3.js force-directed visualizations.

**Request:**
```json
{
  "url": "https://example.com",
  "depth": 2,
  "options": {
    "stripTracking": true,
    "maxPages": 100
  }
}
```

**Response (202 Accepted):**
```json
{
  "jobId": "12345",
  "message": "Link graph crawl job queued successfully",
  "url": "https://example.com/",
  "depth": 2,
  "statusUrl": "/api/link-graph/jobs/12345",
  "resultUrl": "/api/link-graph/jobs/12345/result"
}
```

**Check job status:**
```bash
GET /api/link-graph/jobs/:jobId
```

**Get results:**
```bash
GET /api/link-graph/jobs/:jobId/result
```

Returns D3.js-compatible graph when completed:
```json
{
  "base_url": "https://example.com/",
  "depth": 2,
  "nodes": [
    { "id": "https://example.com/" },
    { "id": "https://example.com/about" }
  ],
  "links": [
    { "source": "https://example.com/", "target": "https://example.com/about" }
  ],
  "stats": {
    "pages_crawled": 15,
    "edges": 42,
    "truncated": false,
    "crawl_time_ms": 12453
  }
}
```

**Features:**
- ⚡ Asynchronous processing (returns job ID in <100ms)
- 🔄 Automatic retries on failure
- ✅ Breadth-First Search (BFS) with depth control
- ✅ URL normalization (removes fragments, optional tracking param stripping)
- ✅ Internal links only (same domain)
- ✅ Edge deduplication
- ✅ Safety limits (max 500 pages, 60s timeout, depth 1-5)
- ✅ D3.js compatible format

**Full Documentation:** See [docs/LINK_GRAPH_API.md](docs/LINK_GRAPH_API.md)

#### Report-Based Graph

```bash
GET /api/reports/:reportId/link-graph?maxDepth=3&format=json
```

Generate a link graph from a stored audit report (includes SEO metrics, node classifications, anchor text).

### Reports

- `GET /api/reports` - List all audit reports
- `GET /api/reports/:id` - Get specific report  
- `GET /api/reports/:reportId/issues` - Get SEO issues
- `GET /api/reports/:reportId/recommendations` - Get fix recommendations
- `GET /api/reports/:reportId/pages` - Get crawled pages

### Screenshots

- `POST /api/screenshots` - Generate website screenshots

### Users & Statistics

- `GET /api/users` - List users
- `GET /api/users/:userId/reports` - User's audit reports
- `GET /api/stats` - System statistics

## Testing the Link Graph Crawler

Run the test script to verify the endpoint:

```bash
chmod +x test-link-graph.sh
./test-link-graph.sh
```

### Manual Testing

```bash
# Test 1: Simple crawl
curl -X POST http://localhost:3000/api/link-graph/crawl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "depth": 1}'

# Test 2: With options
curl -X POST http://localhost:3000/api/link-graph/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "depth": 2,
    "options": {
      "stripTracking": true,
      "maxPages": 50,
      "maxTimeMs": 30000
    }
  }'
```

### Verification Checklist

✅ Response has `base_url`, `depth`, `nodes`, `links`, `stats`  
✅ All nodes have `id` field with complete URL  
✅ All `links.source` and `links.target` exist in `nodes`  
✅ No duplicate edges (same source→target)  
✅ All URLs normalized (lowercase host, no fragments)  
✅ Depth limiting works (pages at max depth not expanded)  
✅ Truncation reported when hitting limits  
✅ Validation errors return 400 status  

## Architecture

### Services

- **`services/crawler/`** - Website crawling with Playwright
  - `SiteAuditCrawler.ts` - Full-featured SEO crawler
  - `BrowserPool.ts` - Managed browser pool (3 concurrent max)
  - `humanBehavior.ts` - Rate limiting, human simulation
  - `cloudflareBypass.ts` - Anti-bot protection
  - `crawlCache.ts` - 7-day crawl caching

- **`services/linkGraph/`** - Link graph generation
  - `linkGraphService.ts` - Generate graphs from stored reports
  - `linkGraphCrawler.ts` - On-demand BFS crawler (NEW)

- **`services/analyzer/`** - SEO rule engine
  - `SeoAnalyzer.ts` - Main analysis engine
  - `ruleEngine.ts` - Rule evaluation
  - `rules/` - 25+ SEO rules

- **`services/recommendations/`** - Fix generation
  - `RecommendationGenerator.ts` - Generate actionable fixes

### Key Technologies

- **Express.js** - REST API framework
- **Playwright** - Browser automation & rendering
- **Prisma** - Type-safe database ORM
- **Bull** - Redis-based job queue
- **PostgreSQL** - Primary database
- **Redis** - Job queue & caching

## Environment Variables

```bash
# Server
PORT=3000
CORS_ORIGIN=*

# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/db"

# Redis (for queue)
REDIS_HOST=localhost
REDIS_PORT=6379

# Crawler Options
STEALTH_MODE=true
HUMAN_BEHAVIOR=true

# External Services (optional)
SCRAPE_DO_API_KEY=your_key_here
```

## Development

```bash
# TypeScript compilation check
npx tsc --noEmit

# Run in development mode
npm run dev

# Run database migrations
npx prisma migrate dev

# View database
npx prisma studio

# Generate Prisma client
npx prisma generate
```

## Project Structure

```
backend/
├── src/
│   ├── index.ts                 # Express app & API routes
│   ├── config/                  # Configuration files
│   ├── queues/                  # Bull queue definitions
│   ├── workers/                 # Background job processors
│   └── services/
│       ├── crawler/             # Web crawling services
│       ├── analyzer/            # SEO analysis engine
│       ├── linkGraph/           # Link graph generation
│       ├── recommendations/     # Fix generation
│       └── screenshots/         # Screenshot service
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/             # Database migrations
├── docs/                       # Documentation
│   ├── LINK_GRAPH_API.md      # Link graph API docs
│   ├── API_DOCUMENTATION.md    # Full API reference
│   └── ...
└── test-link-graph.sh         # Test script
```

## Documentation

- **[Link Graph API](docs/LINK_GRAPH_API.md)** - Complete guide to link graph endpoints
- **[API Documentation](docs/API_DOCUMENTATION.md)** - Full API reference
- **[Crawler Guide](docs/SiteAuditCrawler.md)** - Detailed crawler documentation
- **[Cloudflare Bypass](docs/CLOUDFLARE_BYPASS_GUIDE.md)** - Anti-bot strategies

## License

MIT

