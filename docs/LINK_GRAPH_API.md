# Link Graph API Documentation

## Overview

The Link Graph API provides endpoints for analyzing internal link structures of websites:

1. **On-Demand Crawler (Async)** - Queue a link graph crawl job and retrieve results when complete
   - `POST /api/link-graph/crawl` - Queue a new crawl job
   - `GET /api/link-graph/jobs/:jobId` - Check job status
   - `GET /api/link-graph/jobs/:jobId/result` - Get completed results
2. **Report-Based Graph** - Generate link graphs from stored audit reports
   - `GET /api/reports/:reportId/link-graph` - Generate from existing report

---

## On-Demand Link Graph Crawler

### Overview

Queue a link graph crawl job that runs in the background. The crawler uses **Breadth-First Search (BFS)** up to a specified depth limit and returns results when complete.

**Why Asynchronous?**
- ⏱️ Crawls can take 30-60+ seconds
- 🔄 Automatic retries on failure
- 📊 Progress tracking
- ⚡ Instant response (returns job ID)
- 🎯 No HTTP timeout issues

---

### 1. Queue a Crawl Job

### 1. Queue a Crawl Job

#### Endpoint

```
POST /api/link-graph/crawl
```

### Description

Queues a background job to crawl a website starting from a given URL using **Breadth-First Search (BFS)**. Returns immediately with a job ID that can be used to check status and retrieve results.

**Key Features:**
- **Asynchronous processing** - Returns job ID in <100ms
- **BFS with depth control** - Explores links evenly at each depth level
- **Background worker** - No HTTP timeout issues
- **Automatic retries** - 2 retry attempts with exponential backoff
- **Progress tracking** - Monitor crawl progress in real-time
- **URL normalization** - Removes fragments, optionally strips tracking parameters
- **Internal links only** - Filters to same-domain links
- **Safety limits** - Max pages (500), max time (60s), max depth (5)
- **Edge deduplication** - Multiple links between same pages counted once

### Request

#### Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | Starting URL to crawl (must be HTTP/HTTPS) |
| `depth` | number | Yes | Maximum BFS depth (1-5) |
| `options` | object | No | Crawl options (see below) |

#### Options Object

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `stripTracking` | boolean | `false` | Remove tracking parameters (`utm_*`, `gclid`, `fbclid`, etc.) |
| `maxPages` | number | `500` | Maximum pages to crawl |
| `maxTimeMs` | number | `60000` | Maximum crawl time in milliseconds (60s) |
| `timeout` | number | `30000` | Page navigation timeout in milliseconds (30s) |
| `seedFromSitemap` | boolean | `false` | **Seed from sitemap for orphan detection** - When enabled, parses sitemap.xml to discover all pages, enabling detection of orphan pages (pages with no inbound links). Without this, only pages discoverable via BFS are found. |

#### Example Request

```bash
curl -X POST http://localhost:3000/api/link-graph/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "depth": 2,
    "options": {
      "stripTracking": true,
      "maxPages": 100
    }
  }'
```

### Response

#### Success Response (202 Accepted)

The job is queued successfully and returns immediately:

```json
{
  "jobId": "12345",
  "message": "Link graph crawl job queued successfully",
  "url": "https://example.com",
  "depth": 2,
  "statusUrl": "/api/link-graph/jobs/12345",
  "resultUrl": "/api/link-graph/jobs/12345/result"
}
```

**Status Code:** `202 Accepted` (job queued, processing in background)

---

### 2. Check Job Status

#### Endpoint

```
GET /api/link-graph/jobs/:jobId
```

#### Example Request

```bash
curl http://localhost:3000/api/link-graph/jobs/12345
```

#### Response

```json
{
  "id": "12345",
  "state": "active",
  "progress": 0,
  "data": {
    "url": "https://example.com",
    "depth": 2
  },
  "finishedOn": null,
  "processedOn": 1712484123456,
  "failedReason": null
}
```

**Possible states:**
- `waiting` - Job queued, not yet started
- `active` - Currently crawling
- `completed` - Finished successfully
- `failed` - Job failed (see `failedReason`)

---

### 3. Get Job Result

#### Endpoint

```
GET /api/link-graph/jobs/:jobId/result
```

#### Example Request

```bash
curl http://localhost:3000/api/link-graph/jobs/12345/result
```

#### Response (when completed)

Returns the D3.js-compatible link graph:

```json
{
  "base_url": "https://example.com/",
  "depth": 2,
  "nodes": [
    { "id": "https://example.com/" },
    { "id": "https://example.com/about" },
    { "id": "https://example.com/contact" }
  ],
  "links": [
    { "source": "https://example.com/", "target": "https://example.com/about" },
    { "source": "https://example.com/", "target": "https://example.com/contact" },
    { "source": "https://example.com/about", "target": "https://example.com/" }
  ],
  "stats": {
    "pages_crawled": 3,
    "edges": 3,
    "truncated": false,
    "crawl_time_ms": 4523
  }
}
```

#### Response (when not completed)

If job is still processing or failed:

```json
{
  "error": "Job not completed yet",
  "state": "active",
  "message": "Job is currently active. Please check status endpoint."
}
```

#### Truncated Response

When limits are exceeded, `stats.truncated` is `true` and `stats.reason` explains why:

```json
{
  "base_url": "https://large-site.com/",
  "depth": 3,
  "nodes": [...],
  "links": [...],
  "stats": {
    "pages_crawled": 500,
    "edges": 1247,
    "truncated": true,
    "crawl_time_ms": 58234,
    "reason": "Page limit reached (500 pages)"
  }
}
```

#### Error Responses

**400 Bad Request** - Invalid input

```json
{
  "error": "Depth must be between 1 and 5",
  "provided": 10
}
```

```json
{
  "error": "URL is required"
}
```

```json
{
  "error": "Invalid URL format",
  "provided": "not-a-url"
}
```

**500 Internal Server Error** - Crawler failure

```json
{
  "error": "Failed to crawl link graph",
  "details": "Browser pool initialization failed"
}
```

### Response Schema

The response follows the D3.js force-directed graph format:

- **`base_url`** (string) - Normalized starting URL
- **`depth`** (number) - Maximum depth crawled
- **`nodes`** (array) - Array of unique URLs
  - Each node has an `id` field (the normalized URL)
  - Each node may have an `orphan` field (boolean) - `true` if page has no inbound links (only when `seedFromSitemap=true`)
- **`links`** (array) - Array of directed edges
  - Each edge has `source` and `target` fields (both are URLs)
  - All `source` and `target` URLs exist in the `nodes` array
- **`orphans`** (array, optional) - Array of orphan page URLs (only when `seedFromSitemap=true` and orphans exist)
- **`stats`** (object) - Crawl statistics
  - `pages_crawled` - Number of pages successfully crawled
  - `edges` - Number of unique internal links found
  - `orphan_pages` (optional) - Number of orphan pages found (only when `seedFromSitemap=true`)
  - `truncated` - Whether crawl was stopped due to limits
  - `crawl_time_ms` - Total crawl duration in milliseconds
  - `reason` (optional) - Truncation reason if applicable

### Orphan Page Detection

**What are orphan pages?**
Orphan pages are pages that exist on your website but have no inbound links from other pages. They are only accessible via direct URL, sitemap, or external links - visitors cannot navigate to them through your site's internal link structure.

**Why does BFS alone miss orphans?**
Pure Breadth-First Search (BFS) can only discover pages by following links. By definition, every URL found through BFS has at least one inbound link (the link that led to its discovery). This makes orphan detection impossible with BFS alone.

**The Solution: Sitemap Seeding**
When you enable `seedFromSitemap: true`, the crawler:

1. **Parses sitemap.xml** - Discovers all pages listed in your sitemap
2. **Seeds the queue** - Starts BFS from all sitemap URLs (not just the start URL)
3. **Tracks inbound links** - Counts how many internal links point to each page
4. **Identifies orphans** - Pages from the sitemap with zero inbound links

**Example with orphan detection:**

```bash
curl -X POST http://localhost:3000/api/link-graph/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "depth": 3,
    "options": {
      "seedFromSitemap": true,
      "maxPages": 200
    }
  }'
```

**Response with orphans:**

```json
{
  "base_url": "https://example.com/",
  "depth": 3,
  "nodes": [
    { "id": "https://example.com/" },
    { "id": "https://example.com/about" },
    { "id": "https://example.com/old-product", "orphan": true }
  ],
  "links": [
    { "source": "https://example.com/", "target": "https://example.com/about" }
  ],
  "orphans": [
    "https://example.com/old-product"
  ],
  "stats": {
    "pages_crawled": 3,
    "edges": 1,
    "orphan_pages": 1,
    "truncated": false,
    "crawl_time_ms": 4500
  }
}
```

**When to use seedFromSitemap:**
- ✅ SEO audits - identify pages that need internal linking
- ✅ Content cleanup - find forgotten or disconnected pages
- ✅ Navigation analysis - ensure all important pages are linked
- ❌ Quick link structure checks - BFS alone is faster
- ❌ Sites without sitemaps - feature won't work

### Usage with D3.js

The async API pattern requires queuing a job, polling for completion, and then using the result:

```javascript
// Step 1: Queue the crawl job
const queueResponse = await fetch('http://localhost:3000/api/link-graph/crawl', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://example.com', depth: 2 })
});

const { jobId, resultUrl } = await queueResponse.json();

// Step 2: Poll for completion
async function waitForResult(jobId) {
  while (true) {
    const statusResponse = await fetch(`http://localhost:3000/api/link-graph/jobs/${jobId}`);
    const status = await statusResponse.json();
    
    if (status.state === 'completed') {
      // Job finished, fetch result
      const resultResponse = await fetch(`http://localhost:3000/api/link-graph/jobs/${jobId}/result`);
      return await resultResponse.json();
    } else if (status.state === 'failed') {
      throw new Error(`Crawl failed: ${status.failedReason}`);
    }
    
    // Wait 2 seconds before polling again
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Step 3: Get result and create D3 visualization
const data = await waitForResult(jobId);

// Create D3 force simulation
const simulation = d3.forceSimulation(data.nodes)
  .force('link', d3.forceLink(data.links).id(d => d.id))
  .force('charge', d3.forceManyBody().strength(-100))
  .force('center', d3.forceCenter(width / 2, height / 2));

// Render graph
const link = svg.selectAll('.link')
  .data(data.links)
  .enter().append('line')
  .attr('class', 'link');

const node = svg.selectAll('.node')
  .data(data.nodes)
  .enter().append('circle')
  .attr('class', 'node')
  .attr('r', 5);
```

---

## Report-Based Link Graph

### Endpoint

```
GET /api/reports/:reportId/link-graph?maxDepth=3&format=json
```

### Description

Generates a link graph from an existing completed audit report stored in the database. This endpoint provides richer node data including SEO metrics, page classifications, and issue markers.

### Key Differences from On-Demand Crawler

| Feature | On-Demand Crawler | Report-Based Graph |
|---------|------------------|-------------------|
| **Data Source** | Live crawl | Stored audit report |
| **Storage** | No persistence | Reads from database |
| **Node Data** | URL only | SEO metrics, titles, classifications |
| **Speed** | Slower (crawls live) | Faster (pre-crawled data) |
| **Use Case** | Quick analysis | Full SEO audit integration |

### Request

#### Path Parameters

- `reportId` (string) - Audit report ID from database

#### Query Parameters

- `maxDepth` (number, optional) - Filter graph to maximum depth
- `format` (string, optional) - Output format: `json` (default), `dot`, `csv`

### Example Request

```bash
curl http://localhost:3000/api/reports/clx123abc/link-graph?maxDepth=3&format=json
```

### Response

Returns a richer `LinkGraph` object with node classifications:

```json
{
  "nodes": [
    {
      "id": "https://example.com/",
      "label": "Homepage",
      "url": "https://example.com/",
      "type": "page",
      "title": "Example Site - Homepage",
      "inboundCount": 5,
      "outboundCount": 12,
      "depth": 0,
      "statusCode": 200,
      "loadTime": 823,
      "wordCount": 456,
      "hasIssues": false,
      "isOrphan": false,
      "isHub": true,
      "isAuthority": true
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "https://example.com/",
      "target": "https://example.com/about",
      "anchorText": "About Us",
      "strength": 1
    }
  ],
  "metadata": {
    "totalPages": 47,
    "totalLinks": 234,
    "maxDepth": 4,
    "orphanPages": 2,
    "hubPages": 3,
    "authorityPages": 5,
    "averageLinksPerPage": 4.98,
    "generatedAt": "2026-04-07T12:34:56.789Z"
  }
}
```

---

## How Crawling Works

### Breadth-First Search (BFS)

The crawler uses BFS to explore pages evenly at each depth level:

```
Depth 0: [homepage]
         ↓ crawl + extract links
Depth 1: [about, products, blog]
         ↓ crawl each + extract links
Depth 2: [team, contact, widget-a, widget-b, post-1, post-2]
         ↓ crawl each + extract links
Depth 3: [...] (not crawled if maxDepth = 2)
```

**Behavior:**
- Pages at `depth < maxDepth` are crawled and their links extracted
- Pages at `depth == maxDepth` are crawled but their links are **not** expanded
- Pages at `depth > maxDepth` are never visited

### URL Normalization

All URLs are normalized for consistency:

1. **Resolve relative URLs** - Convert `../about` to `https://example.com/about`
2. **Lowercase hostname** - `EXAMPLE.COM` → `example.com`
3. **Remove fragments** - `page.html#section` → `page.html`
4. **Strip tracking params** (optional) - `?utm_source=twitter` → `` (if `stripTracking: true`)

**Tracked Parameters Removed:**
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`
- `gclid` (Google Ads)
- `fbclid` (Facebook)
- `msclkid` (Microsoft Ads)
- `ref`, `source`

### Internal Link Detection

Links are considered internal if:
- ✅ Hostname exactly matches the starting URL's hostname (case-insensitive)
- ✅ Protocol is `http://` or `https://`
- ❌ Excluded: `mailto:`, `tel:`, `javascript:`, `data:` schemes

**Example:**

Starting URL: `https://example.com`

| Link | Internal? | Reason |
|------|-----------|--------|
| `https://example.com/about` | ✅ Yes | Same hostname |
| `https://www.example.com/page` | ❌ No | Different hostname (`www.` subdomain) |
| `https://blog.example.com/post` | ❌ No | Different subdomain |
| `mailto:info@example.com` | ❌ No | Non-HTTP scheme |
| `/products/widget` | ✅ Yes | Relative URL → resolves to same domain |

### Safety Limits

The crawler enforces multiple safety limits to prevent runaway crawls:

| Limit | Default | Max | Description |
|-------|---------|-----|-------------|
| **Depth** | (user specified) | 5 | Maximum BFS depth |
| **Pages** | 500 | Configurable | Maximum pages to crawl |
| **Time** | 60,000 ms (60s) | Configurable | Maximum crawl duration |
| **Page Timeout** | 30,000 ms (30s) | Configurable | Per-page navigation timeout |

**When limits are exceeded:**
- Crawl stops immediately
- Partial results are returned
- `stats.truncated` is set to `true`
- `stats.reason` explains which limit was hit

### Edge Deduplication

If page A links to page B multiple times (e.g., navigation menu + footer link), only **one edge** is created:

```json
{
  "source": "https://example.com/page-a",
  "target": "https://example.com/page-b"
}
```

### Content-Type Filtering

Only HTML pages are processed:
- ✅ `text/html`
- ✅ `application/xhtml+xml`
- ❌ `application/pdf`
- ❌ `image/jpeg`
- ❌ `application/json`

Non-HTML responses are logged and skipped.

### Error Handling

**Graceful degradation:**
- Navigation failures (404, 500, timeouts) → Log warning, continue to next URL
- Invalid URLs in links → Skip silently
- Browser crashes → Release browser, continue with new instance
- Non-HTML content → Skip link extraction

**Fatal errors:**
- Invalid starting URL → Return 400 error
- Browser pool initialization failure → Return 500 error

---

## Configuration Options

### Environment Variables

The crawler respects existing environment variables:

- `STEALTH_MODE` - Enhanced anti-bot detection (not used by default in link graph crawler)
- `HUMAN_BEHAVIOR` - Simulate human interactions (not used by default in link graph crawler)

### Rate Limiting

The crawler automatically applies **2-5 second delays** between requests to:
- Avoid overwhelming target servers
- Reduce detection risk
- Respect server resources

**Browser Pooling:**
- Maximum 3 concurrent browsers
- Browsers are reused across pages for efficiency
- Isolated contexts prevent cookie/state leakage

---

## Examples

### Example 1: Complete Async Workflow

Queue a job, poll for status, and get results:

```bash
# Step 1: Queue the crawl job
curl -X POST http://localhost:3000/api/link-graph/crawl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "depth": 1}'

# Response:
# {
#   "jobId": "12345",
#   "message": "Link graph crawl job queued successfully",
#   "statusUrl": "/api/link-graph/jobs/12345",
#   "resultUrl": "/api/link-graph/jobs/12345/result"
# }

# Step 2: Check job status (poll every 2-5 seconds)
curl http://localhost:3000/api/link-graph/jobs/12345

# Response while running:
# { "state": "active", "progress": 0, ... }

# Step 3: Get result when completed
curl http://localhost:3000/api/link-graph/jobs/12345/result

# Response: Full link graph JSON
```

**Expected result:**
- Job queued in <100ms
- Crawl runs in background (15-30s for small sites)
- Result includes homepage + direct links
- Links from those pages **not** crawled (depth limit)

### Example 2: Deep Crawl with Tracking Removal

```bash
curl -X POST http://localhost:3000/api/link-graph/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://marketing-site.com?utm_source=email",
    "depth": 3,
    "options": {
      "stripTracking": true,
      "maxPages": 200,
      "maxTimeMs": 120000
    }
  }'
```

**Features:**
- Removes all `utm_*` parameters from discovered URLs
- Crawls up to depth 3
- Limits to 200 pages max
- Allows 2 minutes instead of default 60s
- Job runs asynchronously in background

### Example 3: Compare Against Stored Report

```bash
# On-demand crawl
curl -X POST http://localhost:3000/api/link-graph/crawl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "depth": 2}'

# Report-based graph (from previous audit)
curl http://localhost:3000/api/reports/clx123abc/link-graph?maxDepth=2
```

**Use cases:**
- Compare current link structure vs. historical
- Validate changes after site migration
- Quick check without full SEO audit

---

## Troubleshooting

### "Depth must be between 1 and 5"

**Problem:** Requested depth is out of range

**Solution:** Use depth between 1-5:
```json
{"url": "https://example.com", "depth": 3}
```

### "Page limit reached (500 pages)" with truncated: true

**Problem:** Site has more pages than default limit

**Solution:** Increase `maxPages` if needed:
```json
{
  "url": "https://large-site.com",
  "depth": 2,
  "options": { "maxPages": 1000 }
}
```

**Warning:** Higher limits increase crawl time and server load.

### "Time limit exceeded (60000ms)"

**Problem:** Crawl took longer than allowed

**Solution:**
1. Reduce depth: `"depth": 2` instead of `3`
2. Increase time limit: `"options": { "maxTimeMs": 120000 }`
3. Reduce page limit: `"options": { "maxPages": 100 }`

### Empty nodes/links arrays

**Problem:** No internal links found

**Possible causes:**
1. Site uses JavaScript navigation (SPA) - Check if links are in rendered DOM
2. Site has no internal links (single page)
3. Site blocks crawlers (403/bot detection)
4. Invalid starting URL

**Solution:**
- Verify URL is accessible in a browser
- Check `stats.pages_crawled` - if 0, authentication or blocking may be the issue

### All source/target URLs are identical

**Problem:** URL normalization might be too aggressive

**Solution:**
- Disable tracking stripping: `"options": { "stripTracking": false }`
- Check if fragments are essential: fragments are always removed (by design)

---

## Performance Considerations

### Crawl Time Estimates

Approximate times based on site structure:

| Pages | Depth | Avg Time | Notes |
|-------|-------|----------|-------|
| 5-10 | 1 | 15-30s | Small sites |
| 20-50 | 2 | 40-90s | Medium sites (may hit time limit) |
| 100+ | 2 | 60s+ | Will likely truncate |
| 500 | 3 | N/A | Will hit page limit |

**Factors affecting speed:**
- Server response time
- Page complexity (JS-heavy sites slower)
- Network latency
- Rate limiting delays (2-5s between requests)

### Resource Usage

- **Memory:** ~50-100MB per browser instance (max 3)
- **CPU:** Moderate (Playwright rendering)
- **Network:** 1-5 requests/second (rate limited)

---

## API Comparison Summary

| Feature | `POST /api/link-graph/crawl` | `GET /api/reports/:id/link-graph` |
|---------|------------------------------|-----------------------------------|
| **Use Case** | Quick on-demand analysis | Full SEO audit integration |
| **Pattern** | Async (queue + poll) | Synchronous |
| **Response Time** | <100ms (returns job ID) | <1 sec (immediate result) |
| **Data Source** | Live crawl (background) | Database (pre-crawled) |
| **Crawl Time** | 30-60s (background) | N/A (already crawled) |
| **Node Data** | URL only | SEO metrics, classifications |
| **Edge Data** | Source/target only | Includes anchor text |
| **Persistence** | None (job result cached 1hr) | Stored in database |
| **Depth Control** | During crawl (BFS) | Post-processing filter |
| **Customization** | Tracking params, limits | Export formats (JSON/DOT/CSV) |
| **Best For** | Link audits, quick checks | Comprehensive SEO reports |
| **Retry Logic** | Automatic (2 retries) | N/A |

---

## Support

For issues or questions, check:
- [Project README](../README.md)
- [Crawler Implementation](../src/services/linkGraph/linkGraphCrawler.ts)
- [API Source Code](../src/index.ts)
