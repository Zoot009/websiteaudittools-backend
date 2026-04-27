# API Testing Guide

Complete guide for testing the Internal Linking Analysis API endpoints.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [API Endpoints Overview](#api-endpoints-overview)
- [Testing Workflows](#testing-workflows)
- [Detailed API Reference](#detailed-api-reference)
- [Testing Tools](#testing-tools)
- [Common Use Cases](#common-use-cases)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before testing the API, ensure you have:

1. **Services Running:**
   ```bash
   # Redis (in terminal 1)
   redis-server
   
   # PostgreSQL database configured
   # See DATABASE_SETUP.md for instructions
   
   # API Server + Worker (in terminal 2)
   npm run dev
   ```

2. **Environment Variables:**
   ```env
   # Required
   SCRAPE_DO_TOKEN=your_token_here
   REDIS_URL=redis://localhost:6379
   DATABASE_URL="postgresql://user:password@localhost:5432/internal_linking"
   
   # Optional
   PORT=3000
   WORKER_CONCURRENCY=2
   ```

3. **Testing Tools:**
   - **cURL** (command line)
   - **Postman** or **Insomnia** (GUI)
   - **HTTPie** (user-friendly CLI)
   - Or your preferred HTTP client

---

## Quick Start

The fastest way to test the API:

### 1. Check API is Running
```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-04-13T20:30:00.000Z"
}
```

### 2. Submit Your First Job
```bash
curl -X POST http://localhost:3000/api/jobs/submit \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "maxPages": 10
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Crawl job submitted successfully",
  "jobId": "crawl-1713039000000-abc123",
  "statusUrl": "/api/jobs/crawl-1713039000000-abc123/status",
  "resultUrl": "/api/jobs/crawl-1713039000000-abc123/result"
}
```

### 3. Check Job Status
```bash
curl http://localhost:3000/api/jobs/crawl-1713039000000-abc123/status
```

### 4. Get Results (when completed)
```bash
curl http://localhost:3000/api/jobs/crawl-1713039000000-abc123/result
```

---

## API Endpoints Overview

| Method | Endpoint | Description | Status |
|--------|----------|-------------|---------|
| GET | `/` | API information | Active |
| GET | `/health` | Health check | Active |
| POST | `/api/jobs/submit` | Submit crawl job | **Primary** |
| GET | `/api/jobs/submit` | Submit job via GET | Convenience |
| GET | `/api/jobs` | List all jobs | Active |
| GET | `/api/jobs/:jobId/status` | Get job status | Active |
| GET | `/api/jobs/:jobId/result` | Get job result | Active |
| GET | `/api/analyze` | Synchronous crawl | Legacy |

---

## Testing Workflows

### Workflow 1: Basic Job Submission and Monitoring

```bash
# Step 1: Submit job
JOB_RESPONSE=$(curl -s -X POST http://localhost:3000/api/jobs/submit \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "maxPages": 10
  }')

# Extract job ID
JOB_ID=$(echo $JOB_RESPONSE | jq -r '.jobId')
echo "Job ID: $JOB_ID"

# Step 2: Poll status until completed
while true; do
  STATUS=$(curl -s http://localhost:3000/api/jobs/$JOB_ID/status | jq -r '.state')
  echo "Status: $STATUS"
  
  if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
    break
  fi
  
  sleep 2
done

# Step 3: Get results
curl http://localhost:3000/api/jobs/$JOB_ID/result | jq .
```

### Workflow 2: Test Different Configurations

```bash
# Small website (quick test)
curl -X POST http://localhost:3000/api/jobs/submit \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "maxPages": 5,
    "maxDepth": 2,
    "rateLimit": 1000
  }'

# Medium website
curl -X POST http://localhost:3000/api/jobs/submit \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "maxPages": 50,
    "maxDepth": 3,
    "rateLimit": 500
  }'

# Large website (default limits)
curl -X POST http://localhost:3000/api/jobs/submit \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com"
  }'
```

### Workflow 3: Monitor Multiple Jobs

```bash
# Submit multiple jobs
for url in "https://site1.com" "https://site2.com" "https://site3.com"; do
  curl -X POST http://localhost:3000/api/jobs/submit \
    -H "Content-Type: application/json" \
    -d "{
      \"url\": \"$url\",
      \"maxPages\": 10
    }"
  sleep 1
done

# List all jobs
curl http://localhost:3000/api/jobs | jq '.jobs'

# List only completed jobs
curl http://localhost:3000/api/jobs?state=completed | jq '.jobs'

# List only failed jobs
curl http://localhost:3000/api/jobs?state=failed | jq '.jobs'
```

---

## Detailed API Reference

### 1. Health Check

**Endpoint:** `GET /health`

**Description:** Quick health check to verify the API is running.

**Request:**
```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-04-13T20:30:00.000Z"
}
```

**Use Case:** Monitoring, uptime checks, CI/CD health verification.

---

### 2. Submit Crawl Job (POST)

**Endpoint:** `POST /api/jobs/submit`

**Description:** Submit a new crawl job for background processing.

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "url": "https://example.com",           // Required: Website URL to crawl
  "maxPages": 50,                          // Optional: Max pages to crawl (default: 500)
  "maxDepth": 3,                           // Optional: Max link depth (default: 5)
  "rateLimit": 500                         // Optional: Delay between requests in ms (default: 500)
}
```

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `url` | string | ✅ Yes | - | Website URL to analyze |
| `maxPages` | number | No | 500 | Maximum pages to crawl |
| `maxDepth` | number | No | 5 | Maximum link depth |
| `rateLimit` | number | No | 500 | Delay between requests (ms) |

**Success Response (202 Accepted):**
```json
{
  "success": true,
  "message": "Crawl job submitted successfully",
  "jobId": "crawl-1713039000000-abc123",
  "statusUrl": "/api/jobs/crawl-1713039000000-abc123/status",
  "resultUrl": "/api/jobs/crawl-1713039000000-abc123/result"
}
```

**Error Responses:**

**400 Bad Request** - Missing URL:
```json
{
  "error": "Missing required parameter: url",
  "message": "Please provide a valid URL to analyze"
}
```

**400 Bad Request** - Invalid URL:
```json
{
  "error": "Invalid URL format",
  "message": "Please provide a valid HTTP or HTTPS URL"
}
```

**400 Bad Request** - Missing Token:
```json
{
  "error": "Missing scrape.do token",
  "message": "SCRAPE_DO_TOKEN environment variable is not set"
}
```

**Examples:**

```bash
# Using cURL with all parameters
curl -X POST http://localhost:3000/api/jobs/submit \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "maxPages": 25,
    "maxDepth": 3,
    "rateLimit": 1000
  }'

# Minimal request
curl -X POST http://localhost:3000/api/jobs/submit \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Using HTTPie
http POST localhost:3000/api/jobs/submit \
  url=https://example.com \
  maxPages:=10
```

---

### 3. Submit Crawl Job (GET)

**Endpoint:** `GET /api/jobs/submit`

**Description:** Submit a job using query parameters (convenience method).

**Request:**
```bash
curl "http://localhost:3000/api/jobs/submit?url=https://example.com&maxPages=10"
```

**Query Parameters:** Same as POST version

**Response:** Same as POST version

**Use Case:** Quick testing, browser-based submission, webhooks without POST support.

---

### 4. Get Job Status

**Endpoint:** `GET /api/jobs/:jobId/status`

**Description:** Get the current status and progress of a crawl job.

**Request:**
```bash
curl http://localhost:3000/api/jobs/crawl-1713039000000-abc123/status
```

**Response (Active Job):**
```json
{
  "jobId": "crawl-1713039000000-abc123",
  "state": "active",
  "createdAt": "2026-04-13T20:30:00.000Z",
  "processedAt": "2026-04-13T20:30:01.000Z",
  "data": {
    "url": "https://example.com",
    "maxPages": 50,
    "maxDepth": 5
  },
  "progress": {
    "pagesCrawled": 15,
    "depth": 2,
    "lastUrl": "https://example.com/about"
  }
}
```

**Response (Completed Job):**
```json
{
  "jobId": "crawl-1713039000000-abc123",
  "state": "completed",
  "createdAt": "2026-04-13T20:30:00.000Z",
  "processedAt": "2026-04-13T20:30:01.000Z",
  "finishedAt": "2026-04-13T20:32:45.000Z",
  "duration": 164000,
  "data": {
    "url": "https://example.com",
    "maxPages": 50,
    "maxDepth": 5
  },
  "resultSummary": {
    "success": true,
    "pagesCrawled": 48,
    "orphanPages": 3
  },
  "resultUrl": "/api/jobs/crawl-1713039000000-abc123/result"
}
```

**Response (Failed Job):**
```json
{
  "jobId": "crawl-1713039000000-abc123",
  "state": "failed",
  "createdAt": "2026-04-13T20:30:00.000Z",
  "processedAt": "2026-04-13T20:30:01.000Z",
  "finishedAt": "2026-04-13T20:30:05.000Z",
  "duration": 4000,
  "data": {
    "url": "https://example.com",
    "maxPages": 50,
    "maxDepth": 5
  },
  "error": "Failed to fetch sitemap: HTTP 404"
}
```

**Job States:**
- `waiting` - Job is queued, waiting to be processed
- `active` - Job is currently being processed
- `completed` - Job finished successfully
- `failed` - Job failed with an error
- `delayed` - Job is delayed (scheduled for future)

**Error Response (404):**
```json
{
  "error": "Job not found",
  "message": "No job found with ID: crawl-invalid-id"
}
```

---

### 5. Get Job Result

**Endpoint:** `GET /api/jobs/:jobId/result`

**Description:** Retrieve the complete analysis results for a completed job.

**Request:**
```bash
curl http://localhost:3000/api/jobs/crawl-1713039000000-abc123/result
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "internalLinks": [
      {
        "url": "https://example.com",
        "links": ["https://example.com/about", "https://example.com/contact"],
        "depth": 0,
        "inboundLinks": 5
      },
      {
        "url": "https://example.com/about",
        "links": ["https://example.com", "https://example.com/team"],
        "depth": 1,
        "inboundLinks": 2
      }
    ],
    "orphanPages": [
      {
        "url": "https://example.com/old-page",
        "source": "sitemap",
        "reason": "Not linked from any crawled page"
      }
    ],
    "metadata": {
      "totalPagesCrawled": 48,
      "maxDepthReached": 3,
      "totalInternalLinks": 245,
      "orphanPagesCount": 3,
      "crawlDuration": 164000,
      "creditsUsed": 48
    }
  },
  "timestamp": "2026-04-13T20:32:45.000Z"
}
```

**Error Response (Job Not Completed):**
```json
{
  "error": "Job not completed",
  "message": "Job is currently in 'active' state. Please check status endpoint.",
  "statusUrl": "/api/jobs/crawl-1713039000000-abc123/status"
}
```

**Error Response (404):**
```json
{
  "error": "Job not found",
  "message": "No job found with ID: crawl-invalid-id"
}
```

---

### 6. List Jobs

**Endpoint:** `GET /api/jobs`

**Description:** List recent jobs with optional filtering.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `state` | string | all | Filter by state: `completed`, `failed`, `active`, `waiting` |
| `limit` | number | 50 | Max jobs to return (max: 100) |

**Request:**
```bash
# All recent jobs
curl http://localhost:3000/api/jobs

# Only completed jobs
curl http://localhost:3000/api/jobs?state=completed

# Last 10 failed jobs
curl http://localhost:3000/api/jobs?state=failed&limit=10

# Active jobs
curl http://localhost:3000/api/jobs?state=active
```

**Response:**
```json
{
  "jobs": [
    {
      "jobId": "crawl-1713039000000-abc123",
      "state": "completed",
      "url": "https://example.com",
      "createdAt": "2026-04-13T20:30:00.000Z",
      "finishedAt": "2026-04-13T20:32:45.000Z"
    },
    {
      "jobId": "crawl-1713038900000-def456",
      "state": "active",
      "url": "https://site2.com",
      "createdAt": "2026-04-13T20:28:20.000Z",
      "finishedAt": null
    }
  ],
  "count": 2
}
```

---

## Testing Tools

### cURL Examples

**Basic submission:**
```bash
curl -X POST http://localhost:3000/api/jobs/submit \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "maxPages": 10
  }'
```

**Pretty print with jq:**
```bash
curl -s http://localhost:3000/api/jobs | jq .
```

**Save response to file:**
```bash
curl http://localhost:3000/api/jobs/JOBID/result > result.json
```

### HTTPie Examples

```bash
# Submit job
http POST localhost:3000/api/jobs/submit \
  url=https://example.com

# Get status
http GET localhost:3000/api/jobs/JOBID/status

# List jobs
http GET localhost:3000/api/jobs state==completed
```

### Postman Collection

Create a Postman collection with these requests:

1. **Submit Job**
   - Method: POST
   - URL: `{{baseUrl}}/api/jobs/submit`
   - Body: JSON
   - Variables: `baseUrl=http://localhost:3000`

2. **Get Status**
   - Method: GET
   - URL: `{{baseUrl}}/api/jobs/{{jobId}}/status`

3. **Get Result**
   - Method: GET
   - URL: `{{baseUrl}}/api/jobs/{{jobId}}/result`

### JavaScript/Node.js Example

```javascript
const axios = require('axios');

async function testCrawl() {
  const baseUrl = 'http://localhost:3000';
  
  // 1. Submit job
  const submitResponse = await axios.post(`${baseUrl}/api/jobs/submit`, {
    url: 'https://example.com',
    token: process.env.SCRAPE_DO_TOKEN,
    maxPages: 10
  });
  
  const jobId = submitResponse.data.jobId;
  console.log('Job submitted:', jobId);
  
  // 2. Poll status
  let state = '';
  while (state !== 'completed' && state !== 'failed') {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const statusResponse = await axios.get(`${baseUrl}/api/jobs/${jobId}/status`);
    state = statusResponse.data.state;
    console.log('State:', state);
    
    if (statusResponse.data.progress) {
      console.log('Progress:', statusResponse.data.progress);
    }
  }
  
  // 3. Get results
  if (state === 'completed') {
    const resultResponse = await axios.get(`${baseUrl}/api/jobs/${jobId}/result`);
    console.log('Results:', JSON.stringify(resultResponse.data, null, 2));
  }
}

testCrawl().catch(console.error);
```

### Python Example

```python
import requests
import time
import os

def test_crawl():
    base_url = 'http://localhost:3000'
    
    # 1. Submit job
    response = requests.post(f'{base_url}/api/jobs/submit', json={
        'url': 'https://example.com',
        'token': os.getenv('SCRAPE_DO_TOKEN'),
        'maxPages': 10
    })
    
    job_id = response.json()['jobId']
    print(f'Job submitted: {job_id}')
    
    # 2. Poll status
    state = ''
    while state not in ['completed', 'failed']:
        time.sleep(2)
        
        status_response = requests.get(f'{base_url}/api/jobs/{job_id}/status')
        data = status_response.json()
        state = data['state']
        print(f'State: {state}')
        
        if 'progress' in data:
            print(f'Progress: {data["progress"]}')
    
    # 3. Get results
    if state == 'completed':
        result_response = requests.get(f'{base_url}/api/jobs/{job_id}/result')
        print('Results:', result_response.json())

if __name__ == '__main__':
    test_crawl()
```

---

## Common Use Cases

### Use Case 1: Quick Website Analysis

**Scenario:** Test a small website quickly (5 pages max)

```bash
curl -X POST http://localhost:3000/api/jobs/submit \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "maxPages": 5,
    "maxDepth": 1,
    "rateLimit": 1000
  }'
```

**Expected Time:** 10-20 seconds

---

### Use Case 2: Find Orphan Pages

**Scenario:** Identify pages in sitemap not linked in site structure

```bash
# 1. Submit job
curl -X POST http://localhost:3000/api/jobs/submit \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "maxPages": 100,
    "maxDepth": 5
  }'

# 2. Get results (after completion)
curl http://localhost:3000/api/jobs/JOBID/result | jq '.data.orphanPages'
```

**What to look for:**
- Pages marked with `"source": "sitemap"`
- These are in your sitemap but not discoverable via internal links

---

### Use Case 3: Analyze Link Graph

**Scenario:** Understand internal linking structure

```bash
# Get results
curl http://localhost:3000/api/jobs/JOBID/result | jq '.data.internalLinks[] | select(.inboundLinks > 5)'
```

**What to look for:**
- Pages with high `inboundLinks` are authority pages
- Pages with low/zero `inboundLinks` may be orphans
- Check `depth` to see how deep pages are in site structure

---

### Use Case 4: Monitor Credit Usage

**Scenario:** Track scrape.do API costs

```bash
# Check metadata for credits
curl http://localhost:3000/api/jobs/JOBID/result | jq '.data.metadata.creditsUsed'
```

**Alternatively:** Query the database directly
```bash
# Using Prisma Studio
npx prisma studio
# Navigate to CreditUsage table
```

---

### Use Case 5: Batch Testing Multiple Sites

**Scenario:** Test multiple websites and compare

```bash
#!/bin/bash
SITES=("https://site1.com" "https://site2.com" "https://site3.com")

for site in "${SITES[@]}"; do
  echo "Processing $site..."
  curl -s -X POST http://localhost:3000/api/jobs/submit \
    -H "Content-Type: application/json" \
    -d "{
      \"url\": \"$site\",
      \"token\": \"$SCRAPE_TOKEN\",
      \"maxPages\": 20
    }" | jq -r '.jobId' >> jobs.txt
  sleep 1
done

echo "Submitted jobs:"
cat jobs.txt
```

---

## Troubleshooting

### Problem: Job Stuck in "waiting" State

**Possible Causes:**
- Worker not started
- Redis connection issue

**Solution:**
```bash
# Check if worker is running (look for "Worker ready" in logs)
# Check Redis
redis-cli ping

# Restart the server
npm run dev
```

---

### Problem: "Job not found" Error

**Possible Causes:**
- Job expired (removed from Redis after TTL)
- Incorrect job ID

**Solution:**
```bash
# List recent jobs
curl http://localhost:3000/api/jobs

# Check if job exists in database
npx prisma studio
# Navigate to CrawlJob table
```

---

### Problem: "Missing scrape.do token" Error

**Possible Causes:**
- Token not in `.env` file
- Token not passed in request

**Solution:**
```bash
# Add to .env file
echo 'SCRAPE_DO_TOKEN=your_token_here' >> .env

# Restart the server to load the new token
npm run dev
```

---

### Problem: Jobs Completing Too Fast (No Pages Crawled)

**Possible Causes:**
- Website blocking scrape.do
- Invalid URL
- Website requires JavaScript (use render option)

**Solution:**
Check the error in job status:
```bash
curl http://localhost:3000/api/jobs/JOBID/status | jq '.error'
```

---

### Problem: High Credit Usage

**Explanation:**
- Each page request costs credits (1-25 based on type)
- Default uses datacenter proxies (1 credit per page)

**To Reduce Costs:**
```bash
# Reduce maxPages
curl -X POST http://localhost:3000/api/jobs/submit \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "maxPages": 10,
    "maxDepth": 2
  }'
```

---

## Database Queries for Testing

### Check Job Records
```sql
-- Recent crawl jobs
SELECT "jobId", "targetUrl", status, "totalCreditsUsed", "createdAt"
FROM "CrawlJob"
ORDER BY "createdAt" DESC
LIMIT 10;
```

### Check Credit Usage
```sql
-- Total credits by request type
SELECT "requestType", SUM("creditsUsed") as total_credits, COUNT(*) as requests
FROM "CreditUsage"
GROUP BY "requestType"
ORDER BY total_credits DESC;
```

### Check Orphan Pages
```sql
-- Orphan pages across all crawls
SELECT cp."jobId", cp."targetUrl", op.url, op.source
FROM "OrphanPage" op
JOIN "CrawlJob" cp ON op."crawlJobId" = cp.id
ORDER BY cp."createdAt" DESC;
```

---

## Summary

**Quick Testing Steps:**
1. ✅ Start Redis and PostgreSQL
2. ✅ Start the API server (`npm run dev`)
3. ✅ Check health: `curl http://localhost:3000/health`
4. ✅ Submit job with small limits for testing
5. ✅ Monitor status until completed
6. ✅ Retrieve and analyze results
7. ✅ Check database for persisted data

**Key Endpoints to Remember:**
- **Submit:** `POST /api/jobs/submit`
- **Status:** `GET /api/jobs/:jobId/status`
- **Result:** `GET /api/jobs/:jobId/result`
- **List:** `GET /api/jobs`

**Best Practices:**
- Start with small `maxPages` (5-10) for testing
- Use `jq` for pretty JSON formatting
- Monitor credit usage with database queries
- Check job status before requesting results
- Use Prisma Studio for visual database inspection

For production deployment, see the main README and deployment documentation.
