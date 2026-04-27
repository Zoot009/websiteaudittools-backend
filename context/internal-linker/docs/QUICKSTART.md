# Quick Start Guide - BullMQ Job Processing

## What Changed?

The Internal Linking Analysis API now supports **background job processing** with BullMQ and Redis. This allows you to submit crawl jobs and retrieve results asynchronously, perfect for large websites.

## Quick Setup

### 1. Install Redis

**Ubuntu/Debian:**
```bash
sudo apt install redis-server
sudo systemctl start redis
```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Docker:**
```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update:

```env
SCRAPE_DO_TOKEN=your_token_here
# Redis URL (recommended)
REDIS_URL=redis://localhost:6379
# Or use individual fields:
# REDIS_HOST=localhost
# REDIS_PORT=6379
```

### 3. Start the Server

```bash
npm install
npm run dev
```

## Quick Examples

### Submit a Job

```bash
curl -X POST http://localhost:3000/api/jobs/submit \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

Response:
```json
{
  "success": true,
  "jobId": "crawl-1234567890-abc123",
  "statusUrl": "/api/jobs/crawl-1234567890-abc123/status"
}
```

### Check Status

```bash
curl http://localhost:3000/api/jobs/crawl-1234567890-abc123/status
```

### Get Results

```bash
curl http://localhost:3000/api/jobs/crawl-1234567890-abc123/result
```

## Architecture

```
Client Request → Express API → BullMQ Queue → Redis
                                     ↓
                              Worker Process
                                     ↓
                            Crawl Website → Results
```

**Components:**
- **Express API**: Handles HTTP requests, queues jobs
- **BullMQ Queue**: Manages job queue in Redis
- **Worker**: Processes crawl jobs in background (2 concurrent by default)
- **Redis**: Stores job data and state

## Benefits

✅ **Non-blocking**: API responds immediately with job ID  
✅ **Scalable**: Process multiple crawls concurrently  
✅ **Resilient**: Jobs persist in Redis, survives restarts  
✅ **Progress tracking**: Monitor crawl progress in real-time  
✅ **Backward compatible**: Legacy `/api/analyze` endpoint still works  

## Full Documentation

See [BULLMQ_GUIDE.md](BULLMQ_GUIDE.md) for complete API reference and advanced usage.
