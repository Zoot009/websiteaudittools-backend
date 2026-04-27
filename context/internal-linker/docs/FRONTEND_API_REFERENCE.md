# Frontend API Reference

Complete API documentation for building the Internal Linking Analyzer frontend.

---

## 📚 Table of Contents

1. [Overview](#overview)
2. [Base URL & Setup](#base-url--setup)
3. [Authentication](#authentication)
4. [API Endpoints](#api-endpoints)
5. [TypeScript Interfaces](#typescript-interfaces)
6. [Error Handling](#error-handling)
7. [Usage Examples](#usage-examples)
8. [Best Practices](#best-practices)
9. [Rate Limiting](#rate-limiting)
10. [WebSocket (Future)](#websocket-future)

---

## Overview

The Internal Linking Analyzer API is a RESTful API that performs asynchronous website crawling and link analysis. The workflow is:

1. **Submit a job** → Receive a `jobId`
2. **Poll job status** → Check if job is `waiting`, `active`, `completed`, or `failed`
3. **Retrieve results** → Get full analysis data when job completes

### API Architecture

- **Backend:** Node.js + Express + BullMQ
- **Queue:** Redis-backed job queue for async processing
- **Response Format:** JSON
- **API Version:** 2.0.0

---

## Base URL & Setup

### Development
```
http://localhost:3000
```

### Production
```
https://api.yourdomain.com
```

### Environment Variables (Frontend)

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_POLLING_INTERVAL=2000  # milliseconds
```

---

## Authentication

**Current Status:** No authentication required (v2.0.0)

**Future:** Will use API keys or JWT tokens. Include in headers:
```typescript
headers: {
  'Authorization': 'Bearer YOUR_API_KEY'
}
```

---

## API Endpoints

### 1. Health Check

Check if API is running.

**Endpoint:** `GET /health`

**Use Case:** Health monitoring, pre-flight checks

**Request:**
```bash
GET /health
```

**Response:** `200 OK`
```json
{
  "status": "healthy",
  "timestamp": "2026-04-14T10:30:00.000Z"
}
```

**TypeScript:**
```typescript
interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
}

async function checkHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`);
  return response.json();
}
```

---

### 2. Get API Info

Get API version and available endpoints.

**Endpoint:** `GET /`

**Request:**
```bash
GET /
```

**Response:** `200 OK`
```json
{
  "status": "running",
  "message": "Internal Linking Analysis API",
  "version": "2.0.0",
  "endpoints": {
    "analyze": "/api/analyze?url=<target-url>",
    "submitJob": "POST /api/jobs/submit",
    "listJobs": "GET /api/jobs",
    "jobStatus": "GET /api/jobs/:jobId/status",
    "jobResult": "GET /api/jobs/:jobId/result",
    "health": "/health"
  }
}
```

---

### 3. Submit Crawl Job

Start a new website analysis.

**Endpoint:** `POST /api/jobs/submit`

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "url": "https://example.com",
  "maxPages": 500,
  "maxDepth": 5,
  "rateLimit": 500
}
```

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `url` | string | ✅ Yes | - | Website URL to analyze (must include protocol) |
| `maxPages` | number | ❌ No | 500 | Maximum pages to crawl (1-1000) |
| `maxDepth` | number | number | ❌ No | 5 | Maximum depth from homepage (0-10) |
| `rateLimit` | number | ❌ No | 500 | Delay between requests in ms (0-5000) |

**Response:** `202 Accepted`
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

`400 Bad Request` - Invalid parameters
```json
{
  "error": "Invalid URL format",
  "message": "Please provide a valid HTTP or HTTPS URL"
}
```

`500 Internal Server Error` - Server error
```json
{
  "error": "Internal server error",
  "message": "Failed to submit job"
}
```

**TypeScript:**
```typescript
interface SubmitJobRequest {
  url: string;
  maxPages?: number;
  maxDepth?: number;
  rateLimit?: number;
}

interface SubmitJobResponse {
  success: true;
  message: string;
  jobId: string;
  statusUrl: string;
  resultUrl: string;
}

async function submitJob(params: SubmitJobRequest): Promise<SubmitJobResponse> {
  const response = await fetch(`${API_BASE_URL}/api/jobs/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to submit job');
  }
  
  return response.json();
}
```

---

### 4. Get Job Status

Check the status and progress of a crawl job.

**Endpoint:** `GET /api/jobs/:jobId/status`

**URL Parameters:**
- `jobId` - The job ID from submit response

**Request:**
```bash
GET /api/jobs/crawl-1713039000000-abc123/status
```

**Response:** `200 OK`

**When job is waiting:**
```json
{
  "jobId": "crawl-1713039000000-abc123",
  "state": "waiting",
  "createdAt": "2026-04-14T10:30:00.000Z",
  "data": {
    "url": "https://example.com",
    "maxPages": 500,
    "maxDepth": 5
  }
}
```

**When job is active:**
```json
{
  "jobId": "crawl-1713039000000-abc123",
  "state": "active",
  "createdAt": "2026-04-14T10:30:00.000Z",
  "processedAt": "2026-04-14T10:30:05.000Z",
  "data": {
    "url": "https://example.com",
    "maxPages": 500,
    "maxDepth": 5
  },
  "progress": {
    "percentage": 45,
    "current": 225,
    "total": 500,
    "currentUrl": "https://example.com/blog/page-45"
  }
}
```

**When job is completed:**
```json
{
  "jobId": "crawl-1713039000000-abc123",
  "state": "completed",
  "createdAt": "2026-04-14T10:30:00.000Z",
  "processedAt": "2026-04-14T10:30:05.000Z",
  "finishedAt": "2026-04-14T10:35:30.000Z",
  "duration": 325000,
  "data": {
    "url": "https://example.com",
    "maxPages": 500,
    "maxDepth": 5
  },
  "progress": {
    "percentage": 100,
    "current": 487,
    "total": 500
  },
  "resultSummary": {
    "success": true,
    "pagesCrawled": 487,
    "orphanPages": 12
  },
  "resultUrl": "/api/jobs/crawl-1713039000000-abc123/result"
}
```

**When job failed:**
```json
{
  "jobId": "crawl-1713039000000-abc123",
  "state": "failed",
  "createdAt": "2026-04-14T10:30:00.000Z",
  "processedAt": "2026-04-14T10:30:05.000Z",
  "finishedAt": "2026-04-14T10:32:00.000Z",
  "duration": 115000,
  "data": {
    "url": "https://example.com",
    "maxPages": 500,
    "maxDepth": 5
  },
  "error": "Failed to fetch sitemap: Network timeout"
}
```

**Error Responses:**

`404 Not Found` - Job doesn't exist
```json
{
  "error": "Job not found",
  "message": "No job found with ID: crawl-1713039000000-abc123"
}
```

**TypeScript:**
```typescript
type JobState = 'waiting' | 'active' | 'completed' | 'failed';

interface JobProgress {
  percentage: number;
  current: number;
  total: number;
  currentUrl?: string;
}

interface JobStatusResponse {
  jobId: string;
  state: JobState;
  createdAt: string;
  processedAt?: string;
  finishedAt?: string;
  duration?: number;
  data: {
    url: string;
    maxPages: number;
    maxDepth: number;
  };
  progress?: JobProgress;
  resultSummary?: {
    success: boolean;
    pagesCrawled: number;
    orphanPages: number;
  };
  resultUrl?: string;
  error?: string;
}

async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/status`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get job status');
  }
  
  return response.json();
}
```

---

### 5. Get Job Result

Retrieve the full analysis results (only when job is completed).

**Endpoint:** `GET /api/jobs/:jobId/result`

**URL Parameters:**
- `jobId` - The job ID from submit response

**Request:**
```bash
GET /api/jobs/crawl-1713039000000-abc123/result
```

**Response:** `200 OK`
```json
{
  "success": true,
  "jobId": "crawl-1713039000000-abc123",
  "data": {
    "url": "https://example.com",
    "linkGraph": {
      "https://example.com/": [
        "https://example.com/about",
        "https://example.com/blog",
        "https://example.com/contact"
      ],
      "https://example.com/about": [
        "https://example.com/",
        "https://example.com/team"
      ],
      "https://example.com/blog": [
        "https://example.com/",
        "https://example.com/blog/post-1",
        "https://example.com/blog/post-2"
      ]
    },
    "inboundLinksCount": {
      "https://example.com/": 15,
      "https://example.com/about": 8,
      "https://example.com/blog": 12,
      "https://example.com/blog/post-1": 3,
      "https://example.com/blog/post-2": 0
    },
    "orphanPages": [
      "https://example.com/blog/post-2",
      "https://example.com/old-page",
      "https://example.com/forgotten"
    ],
    "stats": {
      "totalPages": 487,
      "totalLinks": 3241,
      "avgOutboundLinks": 6.65,
      "avgInboundLinks": 6.65,
      "maxInboundLinks": 45,
      "pagesWithNoInbound": 12
    },
    "metadata": {
      "startTime": "2026-04-14T10:30:05.000Z",
      "endTime": "2026-04-14T10:35:30.000Z",
      "durationMs": 325000,
      "totalPagesCrawled": 487,
      "totalPagesInSitemap": 500,
      "maxDepthReached": 5,
      "errorsEncountered": 13,
      "errorDetails": [
        {
          "url": "https://example.com/broken-page",
          "error": "HTTP 404 Not Found",
          "timestamp": "2026-04-14T10:31:15.000Z"
        },
        {
          "url": "https://example.com/timeout-page",
          "error": "Request timeout",
          "timestamp": "2026-04-14T10:32:45.000Z"
        }
      ]
    }
  }
}
```

**Error Responses:**

`404 Not Found` - Job doesn't exist
```json
{
  "error": "Job not found",
  "message": "No job found with ID: crawl-1713039000000-abc123"
}
```

`400 Bad Request` - Job not completed
```json
{
  "error": "Job not completed",
  "message": "Job is currently in 'active' state. Please check status endpoint.",
  "statusUrl": "/api/jobs/crawl-1713039000000-abc123/status"
}
```

**TypeScript:**
```typescript
interface LinkGraph {
  [url: string]: string[];
}

interface InboundLinksCount {
  [url: string]: number;
}

interface CrawlError {
  url: string;
  error: string;
  timestamp: string;
}

interface CrawlMetadata {
  startTime: string;
  endTime: string;
  durationMs: number;
  totalPagesCrawled: number;
  totalPagesInSitemap: number;
  maxDepthReached: number;
  errorsEncountered: number;
  errorDetails: CrawlError[];
}

interface LinkGraphStats {
  totalPages: number;
  totalLinks: number;
  avgOutboundLinks: number;
  avgInboundLinks: number;
  maxInboundLinks: number;
  pagesWithNoInbound: number;
}

interface InternalLinkAnalysis {
  url: string;
  linkGraph: LinkGraph;
  inboundLinksCount: InboundLinksCount;
  orphanPages: string[];
  stats: LinkGraphStats;
  metadata: CrawlMetadata;
}

interface JobResultResponse {
  success: boolean;
  jobId: string;
  data: InternalLinkAnalysis;
}

async function getJobResult(jobId: string): Promise<JobResultResponse> {
  const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/result`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get job result');
  }
  
  return response.json();
}
```

---

### 6. List Jobs

Get a list of all jobs with optional filtering.

**Endpoint:** `GET /api/jobs`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `state` | string | ❌ No | all | Filter by state: `waiting`, `active`, `completed`, `failed` |
| `limit` | number | ❌ No | 50 | Max jobs to return (1-100) |

**Request:**
```bash
GET /api/jobs?state=completed&limit=20
```

**Response:** `200 OK`
```json
{
  "jobs": [
    {
      "jobId": "crawl-1713039000000-abc123",
      "state": "completed",
      "url": "https://example.com",
      "createdAt": "2026-04-14T10:30:00.000Z",
      "finishedAt": "2026-04-14T10:35:30.000Z"
    },
    {
      "jobId": "crawl-1713038000000-def456",
      "state": "active",
      "url": "https://another-site.com",
      "createdAt": "2026-04-14T09:45:00.000Z",
      "finishedAt": null
    }
  ],
  "count": 2
}
```

**TypeScript:**
```typescript
interface JobListItem {
  jobId: string;
  state: JobState;
  url: string;
  createdAt: string;
  finishedAt: string | null;
}

interface ListJobsResponse {
  jobs: JobListItem[];
  count: number;
}

async function listJobs(
  state?: JobState,
  limit = 50
): Promise<ListJobsResponse> {
  const params = new URLSearchParams();
  if (state) params.set('state', state);
  params.set('limit', limit.toString());
  
  const response = await fetch(
    `${API_BASE_URL}/api/jobs?${params.toString()}`
  );
  
  return response.json();
}
```

---

## TypeScript Interfaces

### Complete Type Definitions

```typescript
// API Configuration
export interface APIConfig {
  baseURL: string;
  timeout: number;
  pollingInterval: number;
}

// Request Types
export interface SubmitJobRequest {
  url: string;
  maxPages?: number;
  maxDepth?: number;
  rateLimit?: number;
}

// Response Types
export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
}

export interface SubmitJobResponse {
  success: true;
  message: string;
  jobId: string;
  statusUrl: string;
  resultUrl: string;
}

export type JobState = 'waiting' | 'active' | 'completed' | 'failed';

export interface JobProgress {
  percentage: number;
  current: number;
  total: number;
  currentUrl?: string;
}

export interface JobStatusResponse {
  jobId: string;
  state: JobState;
  createdAt: string;
  processedAt?: string;
  finishedAt?: string;
  duration?: number;
  data: {
    url: string;
    maxPages: number;
    maxDepth: number;
  };
  progress?: JobProgress;
  resultSummary?: {
    success: boolean;
    pagesCrawled: number;
    orphanPages: number;
  };
  resultUrl?: string;
  error?: string;
}

// Link Graph Types
export interface LinkGraph {
  [url: string]: string[];
}

export interface InboundLinksCount {
  [url: string]: number;
}

export interface CrawlError {
  url: string;
  error: string;
  timestamp: string;
}

export interface CrawlMetadata {
  startTime: string;
  endTime: string;
  durationMs: number;
  totalPagesCrawled: number;
  totalPagesInSitemap: number;
  maxDepthReached: number;
  errorsEncountered: number;
  errorDetails: CrawlError[];
}

export interface LinkGraphStats {
  totalPages: number;
  totalLinks: number;
  avgOutboundLinks: number;
  avgInboundLinks: number;
  maxInboundLinks: number;
  pagesWithNoInbound: number;
}

export interface InternalLinkAnalysis {
  url: string;
  linkGraph: LinkGraph;
  inboundLinksCount: InboundLinksCount;
  orphanPages: string[];
  stats: LinkGraphStats;
  metadata: CrawlMetadata;
}

export interface JobResultResponse {
  success: boolean;
  jobId: string;
  data: InternalLinkAnalysis;
}

export interface JobListItem {
  jobId: string;
  state: JobState;
  url: string;
  createdAt: string;
  finishedAt: string | null;
}

export interface ListJobsResponse {
  jobs: JobListItem[];
  count: number;
}

// Error Types
export interface APIError {
  error: string;
  message: string;
  statusUrl?: string;
}
```

---

## Error Handling

### Error Response Format

All errors follow this structure:

```json
{
  "error": "Error Type",
  "message": "Human-readable error description"
}
```

### HTTP Status Codes

| Code | Meaning | When it happens |
|------|---------|-----------------|
| `200` | OK | Request succeeded |
| `202` | Accepted | Job submitted successfully |
| `400` | Bad Request | Invalid parameters or job not ready |
| `404` | Not Found | Job or resource doesn't exist |
| `500` | Internal Server Error | Server-side error |

### Error Handling Example

```typescript
class APIClient {
  async submitJob(params: SubmitJobRequest): Promise<SubmitJobResponse> {
    try {
      const response = await fetch(`${this.baseURL}/api/jobs/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new APIError(
          data.error,
          data.message,
          response.status
        );
      }
      
      return data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      
      // Network error
      throw new APIError(
        'Network Error',
        'Failed to connect to API',
        0
      );
    }
  }
}

class APIError extends Error {
  constructor(
    public type: string,
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'APIError';
  }
}
```

---

## Usage Examples

### React Query Implementation

**Recommended approach for React applications.**

#### 1. Setup API Client

```typescript
// src/lib/api.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const api = {
  async submitJob(params: SubmitJobRequest): Promise<SubmitJobResponse> {
    const response = await fetch(`${API_BASE_URL}/api/jobs/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
    
    return response.json();
  },
  
  async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/status`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
    
    return response.json();
  },
  
  async getJobResult(jobId: string): Promise<JobResultResponse> {
    const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/result`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
    
    return response.json();
  },
  
  async listJobs(state?: JobState, limit = 50): Promise<ListJobsResponse> {
    const params = new URLSearchParams();
    if (state) params.set('state', state);
    params.set('limit', limit.toString());
    
    const response = await fetch(`${API_BASE_URL}/api/jobs?${params}`);
    return response.json();
  },
};
```

#### 2. React Query Hooks

```typescript
// src/hooks/useAnalysis.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Submit a new job
export function useSubmitJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.submitJob,
    onSuccess: (data) => {
      // Immediately start polling job status
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}

// Poll job status with automatic refetch
export function useJobStatus(jobId: string | undefined) {
  return useQuery({
    queryKey: ['jobStatus', jobId],
    queryFn: () => api.getJobStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (data) => {
      // Stop polling when job is complete or failed
      if (!data) return false;
      if (data.state === 'completed' || data.state === 'failed') {
        return false;
      }
      return 2000; // Poll every 2 seconds while active/waiting
    },
  });
}

// Get job result (only when completed)
export function useJobResult(jobId: string | undefined) {
  return useQuery({
    queryKey: ['jobResult', jobId],
    queryFn: () => api.getJobResult(jobId!),
    enabled: false, // Don't auto-fetch, call manually when needed
    staleTime: Infinity, // Results don't change once completed
  });
}

// List all jobs
export function useJobList(state?: JobState) {
  return useQuery({
    queryKey: ['jobs', state],
    queryFn: () => api.listJobs(state),
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}
```

#### 3. Component Usage

```typescript
// src/components/AnalysisForm.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubmitJob } from '@/hooks/useAnalysis';

export function AnalysisForm() {
  const [url, setUrl] = useState('');
  const navigate = useNavigate();
  const submitJob = useSubmitJob();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const result = await submitJob.mutateAsync({
        url,
        maxPages: 500,
        maxDepth: 5,
      });
      
      // Navigate to analysis page with jobId
      navigate(`/analysis/${result.jobId}`);
    } catch (error) {
      console.error('Failed to submit job:', error);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://example.com"
        required
      />
      <button type="submit" disabled={submitJob.isPending}>
        {submitJob.isPending ? 'Submitting...' : 'Analyze'}
      </button>
    </form>
  );
}
```

```typescript
// src/components/AnalysisDashboard.tsx
import { useParams } from 'react-router-dom';
import { useJobStatus, useJobResult } from '@/hooks/useAnalysis';

export function AnalysisDashboard() {
  const { jobId } = useParams();
  const { data: status, isLoading } = useJobStatus(jobId);
  const { data: result, refetch: fetchResult } = useJobResult(jobId);
  
  // Fetch result when job completes
  useEffect(() => {
    if (status?.state === 'completed' && !result) {
      fetchResult();
    }
  }, [status?.state, result, fetchResult]);
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (status?.state === 'failed') {
    return <div>Error: {status.error}</div>;
  }
  
  if (status?.state === 'active' || status?.state === 'waiting') {
    return (
      <div>
        <h2>Analyzing {status.data.url}...</h2>
        <progress value={status.progress?.percentage} max="100" />
        <p>{status.progress?.current} / {status.progress?.total} pages</p>
      </div>
    );
  }
  
  if (status?.state === 'completed' && result) {
    return (
      <div>
        <h2>Analysis Complete</h2>
        <Stats data={result.data.stats} />
        <GraphView data={result.data} />
        <IssuesList orphans={result.data.orphanPages} />
      </div>
    );
  }
  
  return null;
}
```

### Vanilla JavaScript Example

```javascript
// Simple polling implementation without React Query
class AnalysisClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }
  
  async submitJob(url, options = {}) {
    const response = await fetch(`${this.baseURL}/api/jobs/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        maxPages: options.maxPages || 500,
        maxDepth: options.maxDepth || 5,
        rateLimit: options.rateLimit || 500,
      }),
    });
    
    return response.json();
  }
  
  async getJobStatus(jobId) {
    const response = await fetch(`${this.baseURL}/api/jobs/${jobId}/status`);
    return response.json();
  }
  
  async getJobResult(jobId) {
    const response = await fetch(`${this.baseURL}/api/jobs/${jobId}/result`);
    return response.json();
  }
  
  // Poll job status until complete
  async pollJobUntilComplete(jobId, onProgress) {
    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          const status = await this.getJobStatus(jobId);
          
          if (onProgress) {
            onProgress(status);
          }
          
          if (status.state === 'completed') {
            clearInterval(interval);
            const result = await this.getJobResult(jobId);
            resolve(result);
          } else if (status.state === 'failed') {
            clearInterval(interval);
            reject(new Error(status.error));
          }
        } catch (error) {
          clearInterval(interval);
          reject(error);
        }
      }, 2000); // Poll every 2 seconds
    });
  }
}

// Usage
const client = new AnalysisClient('http://localhost:3000');

// Submit and wait for completion
const job = await client.submitJob('https://example.com');
console.log('Job submitted:', job.jobId);

const result = await client.pollJobUntilComplete(
  job.jobId,
  (status) => {
    console.log(`Progress: ${status.progress?.percentage}%`);
  }
);

console.log('Analysis complete:', result.data);
```

---

## Best Practices

### 1. Polling Strategy

✅ **Do:**
- Use exponential backoff for long-running jobs
- Stop polling when job reaches terminal state (`completed` or `failed`)
- Cache completed results (they won't change)

❌ **Don't:**
- Poll faster than every 1 second (unnecessary server load)
- Continue polling after job completes
- Retry failed jobs automatically without user action

```typescript
// Good: Exponential backoff
export function useJobStatus(jobId: string) {
  const [pollInterval, setPollInterval] = useState(2000);
  
  return useQuery({
    queryKey: ['jobStatus', jobId],
    queryFn: () => api.getJobStatus(jobId),
    refetchInterval: (data, query) => {
      if (!data) return false;
      
      if (data.state === 'completed' || data.state === 'failed') {
        return false; // Stop polling
      }
      
      // Slow down polling for long-running jobs
      const runtime = Date.now() - new Date(data.createdAt).getTime();
      if (runtime > 60000) return 5000; // 5s after 1 min
      if (runtime > 30000) return 3000; // 3s after 30s
      
      return 2000; // 2s default
    },
  });
}
```

### 2. Error Recovery

```typescript
// Retry with exponential backoff
const { data, error } = useQuery({
  queryKey: ['jobStatus', jobId],
  queryFn: () => api.getJobStatus(jobId),
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
});
```

### 3. Caching

```typescript
// Cache completed results indefinitely
const { data } = useQuery({
  queryKey: ['jobResult', jobId],
  queryFn: () => api.getJobResult(jobId),
  staleTime: Infinity, // Never refetch
  cacheTime: Infinity, // Keep in cache forever
});
```

### 4. URL Management

Store `jobId` in URL for shareability:

```typescript
// Navigate with jobId
navigate(`/analysis/${jobId}`);

// URL: /analysis/crawl-1713039000000-abc123
// Users can bookmark and share this URL
```

### 5. Loading States

```typescript
function AnalysisView({ jobId }: { jobId: string }) {
  const { data: status, isLoading, error } = useJobStatus(jobId);
  
  if (isLoading) {
    return <Skeleton />;
  }
  
  if (error) {
    return <ErrorMessage error={error} />;
  }
  
  if (status.state === 'waiting') {
    return <WaitingState />;
  }
  
  if (status.state === 'active') {
    return <ProgressBar progress={status.progress} />;
  }
  
  if (status.state === 'completed') {
    return <ResultsView jobId={jobId} />;
  }
  
  if (status.state === 'failed') {
    return <ErrorState error={status.error} />;
  }
}
```

---

## Rate Limiting

**Current Status:** No rate limiting implemented

**Future:** API may implement rate limits:
- **Tier 1 (Free):** 10 jobs/hour
- **Tier 2 (Pro):** 100 jobs/hour
- **Tier 3 (Enterprise):** Unlimited

Rate limit info will be in response headers:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1713042600
```

---

## WebSocket (Future)

Future enhancement: Real-time job updates via WebSocket instead of polling.

```typescript
// Future API
const socket = new WebSocket('ws://localhost:3000/ws');

socket.addEventListener('message', (event) => {
  const update = JSON.parse(event.data);
  
  if (update.type === 'job:progress') {
    console.log('Progress:', update.data);
  }
  
  if (update.type === 'job:completed') {
    console.log('Job done:', update.data);
  }
});

// Subscribe to job updates
socket.send(JSON.stringify({
  type: 'subscribe',
  jobId: 'crawl-1713039000000-abc123',
}));
```

---

## Common Integration Patterns

### Pattern 1: Simple One-Time Analysis

```typescript
async function analyzeWebsite(url: string) {
  // 1. Submit job
  const { jobId } = await api.submitJob({ url });
  
  // 2. Poll until complete
  let status;
  do {
    await new Promise(resolve => setTimeout(resolve, 2000));
    status = await api.getJobStatus(jobId);
  } while (status.state === 'waiting' || status.state === 'active');
  
  // 3. Get result
  if (status.state === 'completed') {
    return await api.getJobResult(jobId);
  }
  
  throw new Error(status.error);
}
```

### Pattern 2: Background Job with Notification

```typescript
// Submit job and navigate away
const { jobId } = await submitJob.mutateAsync({ url });
localStorage.setItem('activeJobId', jobId);

// On app mount, check for active job
useEffect(() => {
  const activeJobId = localStorage.getItem('activeJobId');
  if (activeJobId) {
    checkJobAndNotify(activeJobId);
  }
}, []);

async function checkJobAndNotify(jobId: string) {
  const status = await api.getJobStatus(jobId);
  
  if (status.state === 'completed') {
    showNotification('Analysis complete!');
    localStorage.removeItem('activeJobId');
  }
}
```

### Pattern 3: Batch Processing

```typescript
async function analyzeMultipleSites(urls: string[]) {
  // Submit all jobs
  const jobs = await Promise.all(
    urls.map(url => api.submitJob({ url, maxPages: 100 }))
  );
  
  // Poll all jobs
  const results = await Promise.all(
    jobs.map(({ jobId }) => pollUntilComplete(jobId))
  );
  
  return results;
}
```

---

## Testing

### Mock API for Development

```typescript
// src/lib/mockApi.ts
export const mockApi = {
  async submitJob(params: SubmitJobRequest): Promise<SubmitJobResponse> {
    await delay(500);
    
    return {
      success: true,
      message: 'Job submitted',
      jobId: `mock-job-${Date.now()}`,
      statusUrl: '/api/jobs/mock-job/status',
      resultUrl: '/api/jobs/mock-job/result',
    };
  },
  
  async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    await delay(300);
    
    // Simulate progressing job
    const progress = Math.min((Date.now() % 10000) / 100, 100);
    
    return {
      jobId,
      state: progress >= 100 ? 'completed' : 'active',
      createdAt: new Date().toISOString(),
      data: {
        url: 'https://example.com',
        maxPages: 500,
        maxDepth: 5,
      },
      progress: {
        percentage: progress,
        current: Math.floor(progress * 5),
        total: 500,
      },
    };
  },
  
  async getJobResult(jobId: string): Promise<JobResultResponse> {
    await delay(500);
    
    return {
      success: true,
      jobId,
      data: mockAnalysisData,
    };
  },
};

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Unit Test Example

```typescript
// api.test.ts
import { describe, it, expect, vi } from 'vitest';
import { api } from './api';

describe('API Client', () => {
  it('should submit job successfully', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        jobId: 'test-job-123',
        statusUrl: '/api/jobs/test-job-123/status',
        resultUrl: '/api/jobs/test-job-123/result',
      }),
    });
    
    const result = await api.submitJob({ url: 'https://example.com' });
    
    expect(result.success).toBe(true);
    expect(result.jobId).toBe('test-job-123');
  });
  
  it('should handle API errors', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'Invalid URL',
        message: 'URL must start with http:// or https://',
      }),
    });
    
    await expect(api.submitJob({ url: 'invalid' })).rejects.toThrow();
  });
});
```

---

## FAQ

### Q: How long does a typical crawl take?

**A:** Depends on site size and rate limit:
- 100 pages @ 500ms delay: ~1-2 minutes
- 500 pages @ 500ms delay: ~5-10 minutes
- 1000 pages @ 500ms delay: ~10-20 minutes

### Q: What happens if my frontend loses connection during a crawl?

**A:** The job continues running on the backend. Simply poll the job status again with the same `jobId` to resume tracking.

### Q: Can I cancel a running job?

**A:** Not currently supported. Will be added in future version.

### Q: How long are results stored?

**A:** Results are stored in Redis with a TTL (Time To Live). Currently no expiration, but this may change.

### Q: Can I download results as JSON/CSV?

**A:** Yes, fetch the result from `/api/jobs/:jobId/result` and export client-side using the data.

### Q: Why use polling instead of WebSocket?

**A:** Simplicity and compatibility. WebSocket support planned for v3.0.

---

## Changelog

### v2.0.0 (Current)
- Job-based async API with BullMQ
- Real-time progress tracking
- Improved error handling
- Stats calculation

### v1.0.0 (Legacy)
- Synchronous `/api/analyze` endpoint
- No progress tracking
- Limited error handling

---

## Support

- **Documentation:** [/docs](/docs)
- **Issues:** GitHub Issues
- **API Status:** Check `/health` endpoint

---

**Built with ❤️ for SEO professionals**
