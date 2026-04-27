# Database Persistence Implementation Summary

## Overview

Successfully implemented complete database persistence for the Internal Linking Analysis API using Prisma ORM and PostgreSQL. All crawl results, link maps, orphan pages, and scrape.do credit usage are now tracked and stored for historical analysis.

## What Was Implemented

### ✅ Database Schema (Prisma)

Created 4 new models in `prisma/schema.prisma`:

1. **CrawlJob** - Tracks each crawl operation
   - BullMQ job ID reference
   - Target URL and configuration
   - Status tracking (pending → processing → completed/failed)
   - Metadata: pages crawled, depth, errors, duration
   - Total credits consumed
   - Timestamps (started, completed)

2. **InternalLink** - Stores the link graph
   - Source URL
   - Array of target URLs (outgoing links)
   - Inbound link count
   - Crawl depth
   - Linked to CrawlJob (cascade delete)

3. **OrphanPage** - Tracks orphaned pages
   - Page URL
   - Source (sitemap/discovered)
   - Discovery method
   - Linked to CrawlJob (cascade delete)

4. **CreditUsage** - Detailed API cost tracking
   - Target URL
   - Credits consumed
   - Request type (datacenter/residential/render combinations)
   - HTTP status code
   - Response time
   - Success/failure status
   - Error messages
   - Linked to CrawlJob (set null on delete)

### ✅ Database Service (`src/services/database.ts`)

Created comprehensive database operations:

- `createCrawlJob()` - Initialize a crawl job record
- `updateCrawlJobStatus()` - Update job status (processing/completed/failed)
- `saveCrawlResults()` - Save complete crawl results (batch inserts)
- `trackCreditUsage()` - Track individual API calls and costs
- `getCrawlJobByJobId()` - Retrieve full job with relations
- `getRecentCrawlJobs()` - List recent crawls
- `getCreditUsageStats()` - Aggregate credit analytics
- `getCrawlJobCredits()` - Get credits for specific job
- `closePrisma()` - Graceful shutdown

**Features:**
- Batch inserts for performance (100 records at a time)
- Automatic error handling and logging
- Non-blocking credit tracking (async fire-and-forget)
- Proper type safety with Prisma client

### ✅ Credit Tracking (`src/services/scrapeDoClient.ts`)

Enhanced scrape.do client with automatic credit tracking:

**Credit Calculation** (based on official pricing):
- Normal Request (Datacenter): **1 credit**
- Datacenter + Headless Browser: **5 credits**
- Residential & Mobile: **10 credits**
- Residential + Headless Browser: **25 credits**

**Billing Logic:**
- Only charges for successful responses (2xx) and specific error codes (400, 404, 410)
- Failed requests (5xx, timeouts) = 0 credits
- Tracks response time, status codes, errors

**Each request automatically:**
- Calculates credits based on options (render, super)
- Logs to database with full details
- Links to job ID if provided
- Captures response time and errors

### ✅ Worker Integration (`src/queue/worker.ts`)

Updated BullMQ worker to persist all data:

**Flow:**
1. Create CrawlJob record (status: processing)
2. Pass jobId to crawler for credit tracking
3. Execute crawl with automatic credit logging
4. Calculate total credits from database
5. Save complete results (links, orphans, metadata)
6. Update status to completed
7. On error: update status to failed with error message

### ✅ Crawler Updates (`src/services/crawler.ts`)

- Added optional `jobId` to CrawlerConfig
- Passes jobId to all scrape.do API calls
- Enables per-request credit tracking

### ✅ Type Safety (`src/types.ts`)

- Added `jobId?: string` to CrawlerConfig
- Maintains type safety throughout the stack

### ✅ Server Shutdown (`src/index.ts`)

Added graceful database cleanup:
- Closes Prisma connection on SIGTERM/SIGINT
- Ensures no dangling connections

### ✅ Configuration (`.env.example`)

Added PostgreSQL configuration:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/internal_linking?schema=public"
```

### ✅ Documentation

Created comprehensive guides:
- **DATABASE_SETUP.md** - Complete setup guide with troubleshooting
- Instructions for PostgreSQL installation
- Database creation and user setup
- Migration commands
- Common operations and queries
- Backup/restore procedures
- Production deployment tips

## Data Flow

### Crawl Job Lifecycle

```
1. User submits job → BullMQ queue
2. Worker picks up job → createCrawlJob() [DB: status=processing]
3. Crawler starts → passes jobId to all requests
4. Each page request → trackCreditUsage() [DB: CreditUsage record]
5. Links extracted → stored in memory
6. Crawl completes → analyzeLinkGraph()
7. Save to DB → saveCrawlResults()
   - InternalLink records (batch)
   - OrphanPage records (batch)
   - Update CrawlJob (status=completed, stats)
8. Return results to user
```

### Credit Tracking Flow

```
API Request → fetchWithScrapeDo()
  ↓
Calculate credits (based on render/super options)
  ↓
Make HTTP request
  ↓
Check status code (2xx, 400, 404, 410 = charged)
  ↓
trackCreditUsage() [Async, non-blocking]
  ↓
Find CrawlJob by jobId
  ↓
Insert CreditUsage record
  ↓
Link to CrawlJob if found
```

## Database Queries

### View All Crawl Jobs
```typescript
import { prisma } from './services/database.js';

const jobs = await prisma.crawlJob.findMany({
  orderBy: { createdAt: 'desc' },
  take: 20,
});
```

### Get Complete Job with Relations
```typescript
const job = await prisma.crawlJob.findUnique({
  where: { jobId: 'crawl-123' },
  include: {
    internalLinks: true,
    orphanPages: true,
    creditUsages: true,
  },
});
```

### Credit Analytics
```typescript
// Total credits today
const today = new Date();
today.setHours(0, 0, 0, 0);

const stats = await prisma.creditUsage.aggregate({
  where: { timestamp: { gte: today } },
  _sum: { creditsUsed: true },
  _count: true,
});

// By request type
const byType = await prisma.creditUsage.groupBy({
  by: ['requestType'],
  _sum: { creditsUsed: true },
});
```

### Find Orphan Pages Across All Crawls
```typescript
const orphans = await prisma.orphanPage.findMany({
  where: { source: 'sitemap' },
  include: {
    crawlJob: {
      select: { targetUrl: true, createdAt: true },
    },
  },
});
```

## Performance Optimizations

### Indexes Created
- **CrawlJob**: `jobId`, `targetUrl`, `status`, `createdAt`
- **InternalLink**: `crawlJobId`, `sourceUrl`
- **OrphanPage**: `crawlJobId`, `url`, `source`
- **CreditUsage**: `crawlJobId`, `targetUrl`, `timestamp`

### Batch Operations
- Internal links: 100 records per batch
- Orphan pages: 100 records per batch
- Reduces database round-trips by 99%+

### Async Credit Tracking
- Non-blocking fire-and-forget
- Won't slow down crawling
- Errors logged but don't fail the request

## Testing the Implementation

### 1. Setup Database
```bash
# Create PostgreSQL database
createdb internal_linking

# Update .env with DATABASE_URL
echo 'DATABASE_URL="postgresql://user:password@localhost:5432/internal_linking"' >> .env

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name initial_setup
```

### 2. Start Services
```bash
# Terminal 1: Redis
redis-server

# Terminal 2: API + Worker
npm run dev
```

### 3. Submit Test Job
```bash
curl -X POST http://localhost:3000/api/jobs/submit \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "maxPages": 10
  }'

# Response: {"jobId": "crawl-123...", ...}
```

### 4. Check Database
```bash
# Open Prisma Studio
npx prisma studio

# View tables:
# - CrawlJob (see the job)
# - InternalLink (see link graph)
# - OrphanPage (see orphans)
# - CreditUsage (see API costs)
```

### 5. Verify Data
```sql
-- Connect to database
psql postgresql://localhost:5432/internal_linking

-- Check crawl job
SELECT * FROM "CrawlJob" ORDER BY "createdAt" DESC LIMIT 1;

-- Check credits used
SELECT SUM("creditsUsed") FROM "CreditUsage";

-- Check internal links count
SELECT COUNT(*) FROM "InternalLink";

-- Check orphans
SELECT * FROM "OrphanPage";
```

## Benefits

✅ **Historical Data** - Track all crawls over time  
✅ **Cost Tracking** - Monitor scrape.do credit usage  
✅ **Analytics** - Analyze link patterns across sites  
✅ **Audit Trail** - Complete record of all operations  
✅ **Debugging** - Detailed error tracking per request  
✅ **Reporting** - Generate cost and performance reports  
✅ **Scalability** - Batch operations for large crawls  
✅ **Type Safety** - Full TypeScript + Prisma types  

## Next Steps

1. **Set up PostgreSQL** (see DATABASE_SETUP.md)
2. **Configure DATABASE_URL** in .env
3. **Run migrations**: `npx prisma migrate dev`
4. **Start crawling** and watch data populate
5. **Explore data** with Prisma Studio
6. **Build reports** using the database service functions

## Future Enhancements

Potential additions:
- [ ] API endpoints to query historical data
- [ ] Credit usage dashboard
- [ ] Cost prediction based on site size
- [ ] Scheduled re-crawls for tracking changes
- [ ] Export reports (PDF/CSV)
- [ ] Cost alerts and limits
- [ ] Performance analytics
- [ ] Link change detection

## Files Modified/Created

### New Files
- `src/services/database.ts` - Database operations
- `DATABASE_SETUP.md` - Setup documentation

### Modified Files
- `prisma/schema.prisma` - Added 4 new models
- `src/services/scrapeDoClient.ts` - Credit tracking
- `src/queue/worker.ts` - Database persistence
- `src/services/crawler.ts` - JobId passing
- `src/types.ts` - Added jobId to config
- `src/index.ts` - Database cleanup
- `.env.example` - Database URL
- `tsconfig.json` - Include pattern fix

### Dependencies
All required dependencies already installed:
- `@prisma/client` - Prisma ORM
- `@prisma/adapter-pg` - PostgreSQL adapter
- `pg` - PostgreSQL driver
- `prisma` (dev) - Prisma CLI

## Summary

The internal linking analysis API now has complete database persistence with:
- Full crawl history tracking
- Detailed credit usage monitoring
- Link graph storage
- Orphan page detection
- Performance optimizations
- Type-safe operations
- Comprehensive documentation

All data is automatically saved and can be queried for analytics, reporting, and historical analysis.
