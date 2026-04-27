# Background Job Processing with BullMQ

The Internal Linking Analysis API now supports background job processing using BullMQ and Redis. This allows long-running crawl operations to be processed asynchronously, freeing up the API to handle more requests.

## Prerequisites

### Install Redis

Redis is required for BullMQ to work. Install it based on your operating system:

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

**macOS (with Homebrew):**
```bash
brew install redis
brew services start redis
```

**Docker:**
```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

### Verify Redis is Running

```bash
redis-cli ping
# Should return: PONG
```

## Configuration

Update your `.env` file with Redis configuration:

```env
# Redis Configuration
# Option 1: Use Redis URL (recommended)
REDIS_URL=redis://localhost:6379
# For Redis with password: redis://:password@localhost:6379
# For TLS: rediss://localhost:6380

# Option 2: Use individual fields (if REDIS_URL is not set)
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_PASSWORD=

# Worker Configuration (optional)
WORKER_CONCURRENCY=2  # Number of jobs to process simultaneously
```

## API Endpoints

### 1. Submit a Crawl Job

Submit a new crawl job to the queue for background processing.

**Endpoint:** `POST /api/jobs/submit` or `GET /api/jobs/submit`

**Parameters (query or body):**
- `url` (required): The website URL to crawl
- `maxPages` (optional): Maximum pages to crawl (default: 500)
- `maxDepth` (optional): Maximum depth to crawl (default: 5)
- `rateLimit` (optional): Delay between requests in ms (default: 500)

**Note:** The Scrape.do API token must be configured in the `SCRAPE_DO_TOKEN` environment variable.

**Example:**
```bash
# Using GET
curl "http://localhost:3000/api/jobs/submit?url=https://example.com"

# Using POST with JSON
curl -X POST http://localhost:3000/api/jobs/submit \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "maxPages": 100}'
```

**Response:**
```json
{
  "success": true,
  "message": "Crawl job submitted successfully",
  "jobId": "crawl-1234567890-abc123",
  "statusUrl": "/api/jobs/crawl-1234567890-abc123/status",
  "resultUrl": "/api/jobs/crawl-1234567890-abc123/result"
}
```

### 2. Check Job Status

Get the current status and progress of a job.

**Endpoint:** `GET /api/jobs/:jobId/status`

**Example:**
```bash
curl "http://localhost:3000/api/jobs/crawl-1234567890-abc123/status"
```

**Response (Active Job):**
```json
{
  "jobId": "crawl-1234567890-abc123",
  "state": "active",
  "createdAt": "2026-04-13T19:30:00.000Z",
  "processedAt": "2026-04-13T19:30:01.000Z",
  "data": {
    "url": "https://example.com",
    "maxPages": 500,
    "maxDepth": 5
  },
  "progress": {
    "phase": "crawling",
    "pagesCrawled": 45,
    "pagesQueued": 12,
    "currentDepth": 3,
    "message": "Crawling pages..."
  }
}
```

**Response (Completed Job):**
```json
{
  "jobId": "crawl-1234567890-abc123",
  "state": "completed",
  "createdAt": "2026-04-13T19:30:00.000Z",
  "processedAt": "2026-04-13T19:30:01.000Z",
  "finishedAt": "2026-04-13T19:32:15.000Z",
  "duration": 134000,
  "resultSummary": {
    "success": true,
    "pagesCrawled": 87,
    "orphanPages": 3
  },
  "resultUrl": "/api/jobs/crawl-1234567890-abc123/result"
}
```

**Job States:**
- `waiting`: Job is in the queue, not yet started
- `active`: Job is currently being processed
- `completed`: Job finished successfully
- `failed`: Job encountered an error

### 3. Get Job Results

Retrieve the full crawl results for a completed job.

**Endpoint:** `GET /api/jobs/:jobId/result`

**Example:**
```bash
curl "http://localhost:3000/api/jobs/crawl-1234567890-abc123/result"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://example.com",
    "linkGraph": {
      "https://example.com/": ["https://example.com/about", "https://example.com/contact"],
      "https://example.com/about": ["https://example.com/"],
      ...
    },
    "inboundLinksCount": {
      "https://example.com/": 5,
      "https://example.com/about": 3,
      ...
    },
    "orphanPages": [
      "https://example.com/forgotten-page"
    ],
    "metadata": {
      "totalPagesCrawled": 87,
      "totalPagesInSitemap": 100,
      "maxDepthReached": 5,
      "errorsEncountered": 2,
      "durationMs": 134000
    },
    "stats": {
      "totalPages": 87,
      "totalLinks": 342,
      "avgOutboundLinks": 3.93,
      "avgInboundLinks": 3.93,
      "maxInboundLinks": 15,
      "pagesWithNoInbound": 3
    }
  },
  "startedAt": "2026-04-13T19:30:01.000Z",
  "completedAt": "2026-04-13T19:32:15.000Z",
  "duration": 134000
}
```

### 4. List Jobs

Get a list of recent jobs with optional filtering.

**Endpoint:** `GET /api/jobs`

**Parameters:**
- `state` (optional): Filter by state (`waiting`, `active`, `completed`, `failed`)
- `limit` (optional): Maximum number of jobs to return (default: 50, max: 100)

**Example:**
```bash
# Get all recent jobs
curl "http://localhost:3000/api/jobs"

# Get only completed jobs
curl "http://localhost:3000/api/jobs?state=completed&limit=20"
```

**Response:**
```json
{
  "jobs": [
    {
      "jobId": "crawl-1234567890-abc123",
      "state": "completed",
      "url": "https://example.com",
      "createdAt": "2026-04-13T19:30:00.000Z",
      "finishedAt": "2026-04-13T19:32:15.000Z"
    },
    ...
  ],
  "count": 15
}
```

## Job Progress Phases

During execution, jobs go through these phases (tracked in the `progress` field):

1. **crawling**: Crawling web pages from the starting URL
2. **sitemap**: Processing sitemap URLs
3. **analysis**: Analyzing the link graph and identifying orphans
4. **complete**: Job finished successfully

## Worker Management

The worker processes jobs in the background with configurable concurrency:

- **Concurrency**: Set via `WORKER_CONCURRENCY` env variable (default: 2)
- **Rate Limiting**: Worker respects the rate limit per job
- **Graceful Shutdown**: Worker stops gracefully on SIGTERM/SIGINT signals

## Legacy Synchronous Endpoint

The original synchronous endpoint is still available for backward compatibility:

**Endpoint:** `GET /api/analyze`

**Example:**
```bash
curl "http://localhost:3000/api/analyze?url=https://example.com"
```

**Note:** This endpoint blocks until the crawl is complete. For large sites, use the job-based endpoints instead.

## Monitoring

### Redis CLI

Monitor job queue in real-time:

```bash
# Connect to Redis
redis-cli

# Monitor all commands
MONITOR

# Check queue keys
KEYS bull:internal-linking-crawl:*

# Get job count
LLEN bull:internal-linking-crawl:waiting
```

### Worker Logs

The worker logs important events to the console:

```
🔧 Worker ready (concurrency: 2)
⚙️  Processing job crawl-1234567890-abc123...
[Job crawl-1234567890-abc123] Starting crawl for: https://example.com
✅ Job crawl-1234567890-abc123 completed successfully
```

## Troubleshooting

### Redis Connection Errors

If you see connection errors:

1. Verify Redis is running: `redis-cli ping`
2. Check `.env` file has correct `REDIS_URL` (or `REDIS_HOST` and `REDIS_PORT` if using individual fields)
3. If using password auth, include it in the URL: `redis://:password@localhost:6379`

### Jobs Stuck in Queue

If jobs aren't being processed:

1. Check if the worker is running (look for "Worker ready" in logs)
2. Restart the server to restart the worker
3. Check Redis for errors: `redis-cli INFO`

### Job Cleanup

Completed jobs are automatically cleaned up after 24 hours. Failed jobs are kept for 7 days.

## Best Practices

1. **Use job-based endpoints for large sites** (>100 pages)
2. **Poll status endpoint** every 2-5 seconds while job is active
3. **Store jobId** on the client side to retrieve results later
4. **Configure rate limits** appropriately to avoid overwhelming target servers
5. **Monitor Redis memory** usage if processing many large jobs
