# Connected Pages Endpoint

This document covers only the connected-pages endpoint flow.

## Purpose

Find all pages on a website that contain an internal link to a target URL.

Example goal:
- siteUrl: https://example.com
- targetUrl: https://example.com/about-us
- Result: all pages that link to https://example.com/about-us

## Endpoint Summary

Submission endpoint:
- Method: POST
- Path: /api/jobs/connected-pages/submit

Alternative submission endpoint:
- Method: GET
- Path: /api/jobs/connected-pages/submit

Result retrieval endpoint:
- Method: GET
- Path: /api/jobs/:jobId/result

Status endpoint:
- Method: GET
- Path: /api/jobs/:jobId/status

## Authentication

API key is required.

Supported methods:
- Authorization header with Bearer token
- X-API-Key header
- apiKey query parameter

## Request Parameters

For POST body (JSON) or GET query parameters:

- siteUrl (required)
  - Website URL to crawl
  - Must be a valid HTTP/HTTPS URL

- targetUrl (required)
  - URL to find inbound links for
  - Must be a valid HTTP/HTTPS URL
  - Must be on the same domain as siteUrl

- maxPages (optional)
  - Default: 500
  - Must be a positive integer

- maxDepth (optional)
  - Default: 5
  - Must be a non-negative integer

- rateLimit (optional)
  - Default: 500
  - Delay between requests in milliseconds
  - Must be a non-negative integer

## Example Request (POST)

Path:
- /api/jobs/connected-pages/submit

Body:
{
  "siteUrl": "https://example.com",
  "targetUrl": "https://example.com/about-us",
  "maxPages": 200,
  "maxDepth": 5,
  "rateLimit": 500
}

## Submit Response

HTTP status: 202 Accepted

Response:
{
  "success": true,
  "message": "Connected-pages job submitted successfully",
  "jobId": "connected-pages-1713039000000-abc123",
  "siteUrl": "https://example.com",
  "targetUrl": "https://example.com/about-us",
  "statusUrl": "/api/jobs/connected-pages-1713039000000-abc123/status",
  "resultUrl": "/api/jobs/connected-pages-1713039000000-abc123/result"
}

## Status Response

Use the status endpoint until state becomes completed.

Typical states:
- waiting
- active
- completed
- failed

## Real-Time Progress Streaming (Server-Sent Events)

Get live progress updates as the job runs without polling.

**Endpoint:** GET /api/jobs/:jobId/stream

**Authentication:** Required - API Key

**Response Format:** Server-Sent Events (SSE)

**Usage (JavaScript):**
```javascript
const eventSource = new EventSource(`/api/jobs/${jobId}/stream?apiKey=YOUR_API_KEY`);

// Or with Authorization header (requires custom header setup)
const eventSource = new EventSource(`/api/jobs/${jobId}/stream`);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(`Phase: ${data.phase}, Pages: ${data.pagesCrawled}, Connected: ${data.connectedPagesFound || 0}`);
};

eventSource.onerror = () => {
  console.log('Stream ended');
  eventSource.close();
};
```

**Live Event Format:**
```json
{
  "phase": "crawling",
  "pagesCrawled": 42,
  "currentDepth": 3,
  "message": "Crawling pages...",
  "connectedPagesFound": 5,
  "jobId": "connected-pages-...",
  "timestamp": "2026-04-21T10:30:05.000Z"
}
```

**Event Phases:**
- connected: Initial connection established
- crawling: Depth-based crawl phase
- sitemap: Sitemap URL processing phase
- analysis: Link graph analysis phase
- connected-pages: Finding inbound links phase
- complete: Job finished

**Real-time Fields:**
- phase: Current processing phase
- pagesCrawled: Total pages crawled so far
- currentDepth: Current depth level reached
- message: Human-readable status message
- connectedPagesFound: Count of pages linking to target (connected-pages jobs only)

---

## Final Result Response

When job is completed, call:
- /api/jobs/:jobId/result

Result shape for connected-pages jobs:
{
  "success": true,
  "data": {
    "jobType": "connected-pages",
    "siteUrl": "https://example.com",
    "targetUrl": "https://example.com/about-us",
    "connectedPages": [
      "https://example.com/",
      "https://example.com/contact"
    ],
    "connectedPagesCount": 2,
    "targetFound": true,
    "metadata": {
      "totalPagesChecked": 120,
      "totalPagesCrawled": 120,
      "totalPagesInSitemap": 140,
      "maxDepthReached": 5,
      "errorsEncountered": 0,
      "durationMs": 295000,
      "totalCreditsUsed": 120,
      "startTime": "2026-04-21T10:30:00.000Z",
      "endTime": "2026-04-21T10:34:55.000Z"
    }
  },
  "startedAt": "2026-04-21T10:30:00.000Z",
  "completedAt": "2026-04-21T10:34:55.000Z",
  "duration": 295000
}

## Field Meanings

- connectedPages
  - List of page URLs that link to targetUrl

- connectedPagesCount
  - Number of URLs in connectedPages

- targetFound
  - True if at least one page links to targetUrl

- totalPagesChecked
  - Number of crawled pages examined for links

## Validation Errors

Possible HTTP 400 responses:
- Missing required parameter: siteUrl
- Missing required parameter: targetUrl
- Invalid URL format
- Domain mismatch (targetUrl must belong to same domain as siteUrl)
- Invalid maxPages parameter
- Invalid maxDepth parameter
- Invalid rateLimit parameter
- Missing scrape.do token

Possible HTTP 500 response:
- Internal server error

## Notes

- This is an asynchronous endpoint. Submission returns a jobId first.
- Final connected pages are returned by the result endpoint.
- Output includes both URL list and count.
