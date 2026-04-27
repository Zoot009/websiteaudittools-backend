# API Testing Quick Reference

Simple guide for testing the Internal Linking Analysis API with Postman.

## 🚀 Getting Started

1. **Start Redis** - Open terminal and run `redis-server`
2. **Start API Server** - Open another terminal and run `npm run dev`
3. **Open Postman** - Create a new collection for testing
4. **Set Base URL** - Use `http://localhost:3000` for all requests

---

## 📋 API Endpoints

### 1. Health Check
**Purpose:** Verify the API is running

- **URL:** `GET http://localhost:3000/health`
- **What it does:** Returns the current status of the API
- **When to use:** Before starting tests, or to check if the server is up

**Response Example:**
```json
{
  "status": "healthy",
  "timestamp": "2026-04-14T10:30:00.000Z"
}
```

---

### 2. Submit Crawl Job
**Purpose:** Start analyzing a website's internal links

- **URL:** `POST http://localhost:3000/api/jobs/submit`
- **Content-Type:** `application/json`
- **What it does:** Creates a background job to crawl a website and analyze its links
- **When to use:** When you want to analyze a website's internal linking structure

**Body (JSON):**
```json
{
  "url": "https://example.com",
  "maxPages": 50,
  "maxDepth": 3,
  "rateLimit": 500
}
```

**Parameters Explained:**
- `url` (required) - The website you want to analyze
- `maxPages` (optional) - Maximum number of pages to crawl (default: 500)
- `maxDepth` (optional) - How many clicks deep to go from homepage (default: 5)
- `rateLimit` (optional) - Delay between requests in milliseconds (default: 500)

**Response Example:**
```json
{
  "success": true,
  "jobId": "crawl-1713039000000-abc123",
  "statusUrl": "/api/jobs/crawl-1713039000000-abc123/status",
  "resultUrl": "/api/jobs/crawl-1713039000000-abc123/result"
}
```

**Important:** Save the `jobId` - you'll need it to check status and get results!

---

### 3. Check Job Status
**Purpose:** See if your crawl job is finished

- **URL:** `GET http://localhost:3000/api/jobs/{jobId}/status`
- **What it does:** Shows the current progress of your crawl job
- **When to use:** After submitting a job, to check if it's done

**Replace `{jobId}`** with the job ID from step 2

**Response Example:**
```json
{
  "jobId": "crawl-1713039000000-abc123",
  "state": "completed",
  "createdAt": "2026-04-14T10:30:00.000Z",
  "processedAt": "2026-04-14T10:30:05.000Z",
  "finishedAt": "2026-04-14T10:35:00.000Z",
  "duration": 295000,
  "progress": {
    "current": 48,
    "total": 50
  },
  "resultSummary": {
    "success": true,
    "pagesCrawled": 48,
    "orphanPages": 3
  }
}
```

---

### 4. Submit Connected Pages Job
**Purpose:** Find which pages link to a specific internal URL

- **URL:** `POST http://localhost:3000/api/jobs/connected-pages/submit`
- **Content-Type:** `application/json`
- **What it does:** Crawls website pages (including sitemap coverage) and returns inbound pages linking to `targetUrl`
- **When to use:** When you want all pages connected to one internal page by inbound links

**Body (JSON):**
```json
{
  "siteUrl": "https://example.com",
  "targetUrl": "https://example.com/about-us",
  "maxPages": 50,
  "maxDepth": 3,
  "rateLimit": 500
}
```

**Parameters Explained:**
- `siteUrl` (required) - Website to crawl
- `targetUrl` (required) - Internal URL to look for in anchor links
- `maxPages` (optional) - Maximum number of pages to crawl (default: 500)
- `maxDepth` (optional) - Crawl depth from homepage (default: 5)
- `rateLimit` (optional) - Delay between requests in milliseconds (default: 500)

**Result shape from `GET /api/jobs/{jobId}/result`:**
```json
{
  "success": true,
  "data": {
    "jobType": "connected-pages",
    "siteUrl": "https://example.com",
    "targetUrl": "https://example.com/about-us",
    "connectedPages": [
      "https://example.com",
      "https://example.com/contact"
    ],
    "connectedPagesCount": 2,
    "targetFound": true
  }
}
```

---

### 5. Stream Job Progress (Real-Time)
**Purpose:** Get live updates as a job runs without polling

- **URL:** `GET http://localhost:3000/api/jobs/{jobId}/stream`
- **Content-Type:** `text/event-stream` (Server-Sent Events)
- **What it does:** Streams real-time progress updates as crawling happens
- **When to use:** Show live progress to users instead of polling

**JavaScript Client:**
```javascript
const eventSource = new EventSource(`/api/jobs/${jobId}/stream?apiKey=YOUR_KEY`);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(`${data.message}`);
  console.log(`Pages: ${data.pagesCrawled}, Connected: ${data.connectedPagesFound || 0}`);
};

eventSource.onerror = () => {
  console.log('Stream closed');
  eventSource.close();
};
```

**Live Event Example:**
```json
{
  "phase": "crawling",
  "pagesCrawled": 42,
  "currentDepth": 2,
  "message": "Crawling pages...",
  "connectedPagesFound": 5,
  "timestamp": "2026-04-21T10:30:05.000Z"
}
```

---

### 5. Get Job Results
**Purpose:** Get the complete analysis report

- **URL:** `GET http://localhost:3000/api/jobs/{jobId}/result`
- **What it does:** Returns all the internal linking data and orphan pages found
- **When to use:** After job status shows "completed"

**Replace `{jobId}`** with the job ID from step 2

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "internalLinks": [
      {
        "url": "https://example.com/about",
        "inboundLinks": 5,
        "outboundLinks": 3
      }
    ],
    "orphanPages": [
      {
        "url": "https://example.com/hidden-page",
        "source": "sitemap"
      }
    ],
    "metadata": {
      "targetUrl": "https://example.com",
      "totalPagesCrawled": 48,
      "orphanPagesCount": 3,
      "creditsUsed": 48,
      "crawlDuration": 295000
    }
  }
}
```

---

### 6. List All Jobs
**Purpose:** See all crawl jobs you've submitted

- **URL:** `GET http://localhost:3000/api/jobs`
- **What it does:** Returns a list of all jobs with their current status
- **When to use:** To find old job IDs or see all crawl history

**Optional Query Parameters:**
- Add `?state=completed` to see only finished jobs
- Add `?state=failed` to see only failed jobs
- Add `?state=active` to see currently running jobs

---

## 📊 Understanding Job States

When you check job status, you'll see one of these states:

- **waiting** - Job is queued, waiting to start
- **active** - Job is currently running and crawling pages
- **completed** - ✅ Job finished successfully, results are ready
- **failed** - ❌ Job encountered an error and stopped

---

## 🧪 Testing Scenarios in Postman

### Quick Test (3-5 minutes)
Use this to quickly test the API:
```json
{
  "url": "https://example.com",
  "maxPages": 5,
  "maxDepth": 1
}
```

### Medium Test (10-15 minutes)
For a more thorough analysis:
```json
{
  "url": "https://example.com",
  "maxPages": 25,
  "maxDepth": 3
}
```

### Full Crawl (30+ minutes)
For complete website analysis:
```json
{
  "url": "https://example.com"
}
```
*Uses default limits: 500 pages, depth 5*

---

## 🔍 Understanding the Results

### Internal Links
Shows each page and how many other pages link to it:
- **url** - The page URL
- **inboundLinks** - How many pages link TO this page (higher is better)
- **outboundLinks** - How many pages this page links TO

**Why it matters:** Pages with low inbound links might need more internal linking.

### Orphan Pages
Pages found in your sitemap but NOT reachable by clicking through your site:
- **url** - The orphaned page
- **source** - Where it was found (usually "sitemap")

**Why it matters:** These pages might not get crawled by Google unless you fix the internal linking.

### Metadata
Summary information:
- **totalPagesCrawled** - How many pages were analyzed
- **orphanPagesCount** - Total orphan pages found
- **creditsUsed** - Scrape.do API credits consumed
- **crawlDuration** - How long the crawl took (milliseconds)

---

## 🐛 Common Issues

### "Connection refused"
**Problem:** Can't reach the API
**Solution:** Make sure server is running with `npm run dev`

### "Job not found"
**Problem:** Invalid job ID
**Solution:** Check the job ID you saved, or use "List All Jobs" to find it

### "Missing scrape.do token"
**Problem:** Environment variable not set
**Solution:** Add `SCRAPE_DO_TOKEN=your_token_here` to your `.env` file and restart the server

### "Missing scrape.do token"
**Problem:** Environment variable not set
**Solution:** Add `SCRAPE_DO_TOKEN=your_token_here` to your `.env` file and restart the server

### Jobs stuck in "waiting" state
**Problem:** Worker not processing jobs
**Solution:** Check that Redis is running with `redis-cli ping`

### Empty results or no pages crawled
**Problem:** Website might be blocking requests or requires JavaScript
**Solution:** Check the job status for error details

---

## 📦 Postman Setup Tips

### Create Environment Variables
1. Create a new environment in Postman
2. Add these variables:
   - `baseUrl` = `http://localhost:3000`
   - `jobId` = (leave empty, you'll set this after submitting a job)

### Save Job ID Automatically
In the "Submit Crawl Job" request:
1. Go to the "Tests" tab
2. Add this script:
```javascript
var jsonData = pm.response.json();
pm.environment.set("jobId", jsonData.jobId);
```

Now you can use `{{jobId}}` in other requests!

### Create Request Collection
Organize your requests in this order:
1. Health Check
2. Submit Crawl Job
3. Check Job Status (use `{{jobId}}`)
4. Get Job Results (use `{{jobId}}`)
5. List All Jobs

---

## ⚡ Required Environment Variables

Make sure your `.env` file contains:
```
SCRAPE_DO_TOKEN=your_token_here
REDIS_URL=redis://localhost:6379
DATABASE_URL="postgresql://user:pass@localhost:5432/internal_linking"
PORT=3000
WORKER_CONCURRENCY=2
```

**Note:** The Scrape.do token is required. Get yours at [scrape.do](https://scrape.do)

---

## 📚 Need More Help?

- **Full API Documentation:** See [API_TESTING_GUIDE.md](./API_TESTING_GUIDE.md)
- **Database Setup:** See [DATABASE_SETUP.md](./DATABASE_SETUP.md)
- **Quick Start:** See [QUICKSTART.md](./QUICKSTART.md)
- **BullMQ Details:** See [BULLMQ_GUIDE.md](./BULLMQ_GUIDE.md)
