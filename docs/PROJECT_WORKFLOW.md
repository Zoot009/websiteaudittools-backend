# Website Audit Tools Backend - Project Workflow Documentation

## 📋 Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [SEO Audit Pipeline](#seo-audit-pipeline)
4. [Rule Engine Architecture](#rule-engine-architecture)
5. [File Structure & Purpose](#file-structure--purpose)
6. [Complete Audit Workflow](#complete-audit-workflow)
7. [Technical Components](#technical-components)
8. [Database Schema](#database-schema)
9. [API Endpoints](#api-endpoints)

---

## Overview

This project is a **production-grade SEO audit system** that combines:
- **Background Job Processing**: Non-blocking queue system for handling long-running audits
- **Intelligent Web Crawling**: Playwright-based crawler with browser pooling
- **Modular Rule Engine**: 25+ independent SEO audit rules with actionable recommendations
- **PostgreSQL Database**: Persistent storage for audit reports, issues, and recommendations

### Key Concepts

- **Queue (BullMQ)**: Manages audit job scheduling and execution
- **Worker**: Processes audit jobs through a 4-stage pipeline
- **Crawler**: Extracts page data (HTML, meta tags, performance metrics)
- **Rule Engine**: Applies SEO best practices checks to crawled pages
- **Recommendations**: Actionable fix guides with step-by-step instructions
- **Redis**: Fast in-memory storage for queue state
- **PostgreSQL**: Persistent database for audit results

---

## Architecture

```
┌─────────────────┐
│  Client/Frontend│
└────────┬────────┘
         │ HTTP POST /api/audit
         ▼
┌────────────────────────────────────────┐
│        Express API Server              │
│         (src/index.ts)                 │
└────────┬───────────────────────────────┘
         │ Creates Audit Job
         ▼
┌────────────────────────────────────────┐
│        Audit Queue (BullMQ)            │
│      (src/queues/auditQueue.ts)        │
│                                        │
│    Stored in Redis (In-Memory)        │
└────────┬───────────────────────────────┘
         │ Job Picked Up
         ▼
┌────────────────────────────────────────┐
│       Audit Worker (5 concurrent)      │
│     (src/workers/auditWorker.ts)       │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  Stage 1: Crawl Website          │ │
│  │  (SiteAuditCrawler + Playwright) │ │
│  └────────────┬─────────────────────┘ │
│               │ Pages Data            │
│               ▼                       │
│  ┌──────────────────────────────────┐ │
│  │  Stage 2: Analyze SEO            │ │
│  │  (Rule Engine - 25+ Rules)       │ │
│  └────────────┬─────────────────────┘ │
│               │ Issues Found          │
│               ▼                       │
│  ┌──────────────────────────────────┐ │
│  │  Stage 3: Generate Fix Steps     │ │
│  │  (RecommendationGenerator)       │ │
│  └────────────┬─────────────────────┘ │
│               │ Recommendations       │
│               ▼                       │
│  ┌──────────────────────────────────┐ │
│  │  Stage 4: Save to Database       │ │
│  │  (Prisma + PostgreSQL)           │ │
│  └──────────────────────────────────┘ │
└────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│         PostgreSQL Database            │
│  ┌──────────────────────────────────┐ │
│  │ - AuditReports (scores, status)  │ │
│  │ - SeoPages (page metrics)        │ │
│  │ - SeoIssues (problems found)     │ │
│  │ - Recommendations (fix guides)   │ │
│  │ - FixSteps (step-by-step)        │ │
│  └──────────────────────────────────┘ │
└────────────────────────────────────────┘
```

---

## SEO Audit Pipeline

The audit system follows a **4-stage pipeline** that transforms a URL into actionable SEO recommendations:

### Pipeline Overview

```
URL Input
   ↓
┌─────────────────────────────────────────┐
│ STAGE 1: Web Crawling (0-20%)           │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ • Launch Playwright browser             │
│ • Single-page or multi-page crawl       │
│ • Extract HTML, meta tags, headings     │
│ • Measure Core Web Vitals (LCP, CLS)   │
│ • Follow internal links (if multi-mode) │
│ • Build page data structures            │
└─────────────────────────────────────────┘
   ↓ PageData[]
┌─────────────────────────────────────────┐
│ STAGE 2: SEO Analysis (20-60%)          │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ • Build site-wide context               │
│ • Run 25+ modular SEO rules             │
│ • Detect duplicates cross-page          │
│ • Calculate impact scores               │
│ • Categorize by severity                │
│ • Generate category scores              │
└─────────────────────────────────────────┘
   ↓ SeoIssue[]
┌─────────────────────────────────────────┐
│ STAGE 3: Recommendations (60-80%)       │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ • Match issues to fix templates         │
│ • Generate actionable steps             │
│ • Estimate time & difficulty            │
│ • Prioritize by impact                  │
│ • Create code examples                  │
└─────────────────────────────────────────┘
   ↓ Recommendation[]
┌─────────────────────────────────────────┐
│ STAGE 4: Database Storage (80-100%)     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ • Save audit report                     │
│ • Store page metrics                    │
│ • Record all issues                     │
│ • Link recommendations to issues        │
│ • Mark audit as COMPLETED               │
└─────────────────────────────────────────┘
   ↓
Audit Report Ready
```

### Stage Details

#### Stage 1: Web Crawling (0-20% Progress)

**Component**: `SiteAuditCrawler` (`src/services/crawler/SiteAuditCrawler.ts`)

**Responsibilities**:
- Launch Playwright browser from pool
- Navigate to target URL(s)
- Extract comprehensive page data
- Measure Core Web Vitals
- Follow internal links (multi-page mode)

**Data Extracted**:
- Title, description, canonical
- All headings (H1-H6) with text
- All images with src and alt
- All links with href and text
- Meta robots tags
- Open Graph tags
- Schema.org structured data (detection)
- HTML content and word count
- Load time, LCP, CLS, FID

**Modes**:
- **SINGLE**: Analyze one page only
- **MULTI**: Crawl up to pageLimit pages

**Output**: `PageData[]`

---

#### Stage 2: SEO Analysis (20-60% Progress)

**Component**: `SeoAnalyzer` + `RuleEngine` (`src/services/analyzer/`)

**Sub-components**:
1. **Site Context Builder** - Creates cross-page analysis maps
2. **Rule Registry** - Manages 25+ audit rules
3. **Rule Engine** - Executes all rules

**Process**:
1. Build site context (title maps, link graph)
2. For each page, run all rules
3. Collect issues from all rules
4. Calculate category scores
5. Calculate weighted overall score

**Rules by Category**:
- Crawlability & Indexability (5)
- Title Tags (4)
- Meta Descriptions (4)
- Headings (3)
- Content Quality (1)
- Internal Linking (1)
- Images (1)
- Technical & Mobile (3)
- Structured Data (2)
- Security (1)

**Scoring**:
```
Category Score = 100 - (avg impact of issues)
Overall Score = weighted average:
  - On-Page: 25%
  - Technical: 20%
  - Performance: 20%
  - Accessibility: 15%
  - Links: 10%
  - Structured Data: 5%
  - Security: 5%
```

**Output**: `AnalysisResult` with issues and scores

---

#### Stage 3: Recommendations (60-80% Progress)

**Component**: `RecommendationGenerator` (`src/services/recommendations/`)

**Process**:
1. For each issue, check for fix template in DB
2. Generate or use template recommendations
3. Calculate priority (1-10)
4. Estimate time and difficulty
5. Create step-by-step fix instructions

**Priority Algorithm**:
```
Base weight by severity:
  CRITICAL: 1-2
  HIGH: 3-5
  MEDIUM: 6-8
  LOW: 9-10

Adjusted by impact score
```

**Output**: `Recommendation[]` with detailed steps

---

#### Stage 4: Database Storage (80-100% Progress)

**Component**: `auditWorker.ts` database save function

**Saves to PostgreSQL via Prisma**:
- AuditReport (main record)
- SeoPage[] (all pages crawled)
- SeoIssue[] (all problems found)
- Recommendation[] (fix guides)
- FixStep[] (ordered instructions)

**Transaction**: Uses Prisma transaction for atomicity

---

## Rule Engine Architecture

### Design Principles

#### 1. **Modular Rules**
Each rule is independent and follows this structure:

```typescript
interface AuditRule {
  code: string;              // "TITLE_MISSING"
  name: string;              // "Missing title"
  category: IssueCategory;   // "ON_PAGE"
  severity: Severity;        // "HIGH"
  
  // Detection logic
  run: (context: RuleContext) => SeoIssue[];
  
  // Optional fix recommendations
  getRecommendation?: (issue, context) => FixRecommendation;
}
```

#### 2. **Site-Wide Context**
Rules have access to both individual page data and aggregate site data:

```typescript
interface RuleContext {
  page: PageData;           // Current page
  siteContext: SiteContext; // All pages + analysis maps
}
```

This enables:
- Duplicate title/description detection
- Broken internal link identification  
- Canonical conflict detection
- Orphan page discovery

#### 3. **Separation of Detection and Recommendation**
- **Detection**: Pure logic, returns issues
- **Recommendation**: Human-friendly fix steps

### Rule Organization

```
src/services/analyzer/
├── types.ts                    # Core interfaces
├── SeoAnalyzer.ts             # Main API
├── ruleEngine.ts              # Executes rules
├── ruleRegistry.ts            # Manages rules
├── siteContextBuilder.ts      # Builds context
└── rules/
    ├── crawlability/          # 5 rules
    ├── titles/                # 4 rules
    ├── meta-descriptions/     # 4 rules
    ├── headings/              # 3 rules
    ├── content/               # 1 rule
    ├── links/                 # 1 rule
    ├── images/                # 1 rule
    ├── technical/             # 3 rules
    ├── structured-data/       # 2 rules
    └── security/              # 1 rule
```

### Example Rule Implementation

```typescript
// rules/titles/index.ts
export const titleMissingRule: AuditRule = {
  code: 'TITLE_MISSING',
  name: 'Missing title',
  category: 'ON_PAGE',
  severity: 'HIGH',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page } = context;
    const issues: SeoIssue[] = [];
    
    if (!page.title || page.title.trim().length === 0) {
      issues.push({
        category: 'ON_PAGE',
        type: 'title_missing',
        title: 'Missing Page Title',
        description: 'This page does not have a title tag',
        severity: 'HIGH',
        impactScore: 95,
        pageUrl: page.url,
      });
    }
    
    return issues;
  },
  
  getRecommendation: (issue): FixRecommendation => ({
    title: 'Add a page title',
    whyItMatters: 'Title tags are critical for SEO and CTR',
    howToFix: [
      'Write a unique, descriptive title',
      'Include main keyword naturally',
      'Keep it 50-60 characters',
    ],
    estimatedEffort: 'low',
    priority: 10,
  }),
};
```

### Severity Classification

**CRITICAL** (Fix immediately):
- Prevents indexing
- Major security issues
- Widespread failures
- Examples: noindex, no HTTPS, 5xx errors

**HIGH** (Affects ranking):
- Missing critical elements
- Major UX problems
- Direct ranking factors
- Examples: no title, broken links, no H1

**MEDIUM** (Should fix):
- Reduces effectiveness
- Missed opportunities
- Minor structural issues
- Examples: missing description, thin content

**LOW** (Nice to have):
- Polish and completeness
- Advanced optimizations
- Social enhancements
- Examples: missing OG tags, structured data

---

## File Structure & Purpose

### 📄 `package.json`
**Purpose**: Project configuration file

**What it does**:
- Defines project name: `website-audit-tools-backend`
- Lists all dependencies (libraries) the project needs
- Contains scripts to run, build, and test the application

**Key Dependencies**:
- `express`: Web server framework
- `bullmq`: Queue management library
- `ioredis`: Redis database client
- `typescript`: TypeScript compiler
- `dotenv`: Loads environment variables

**Scripts**:
- `npm run dev`: Runs the development server
- `npm run build`: Compiles TypeScript to JavaScript
- `npm start`: Runs the compiled production server

---

### 📄 `tsconfig.json`
**Purpose**: TypeScript compiler configuration

**What it does**:
- Tells TypeScript how to compile `.ts` files into `.js` files
- Defines which files to include/exclude
- Sets compiler options (ES modules, target version, etc.)

---

### 📄 `src/index.ts`
**Purpose**: Main application entry point

**What it does**:
1. **Starts Express Server**: Creates a web server that listens for HTTP requests
2. **Imports Queue and Worker**: Brings in the audit queue and worker components
3. **Defines API Routes**: 
   - POST `/api/audit`: Receives audit requests
   - GET `/api/audit/:jobId`: Checks job status
   - GET `/`: Simple health check endpoint
4. **Handles Graceful Shutdown**: Properly closes connections when the app stops

**How it works step by step**:

```typescript
// 1. Import dependencies
import express from 'express';
import { auditQueue } from './queues/auditQueue.js';
import { auditWorker } from './workers/auditWorker.js';

// 2. Create Express app
const app = express();
const port = process.env.PORT || 3000;

// 3. Enable JSON parsing
app.use(express.json());

// 4. POST /api/audit - Add new audit job
// When someone sends a POST request with a URL to audit:
app.post('/api/audit', async (req, res) => {
  const { url, userId } = req.body;
  
  // Add job to queue (not processed immediately!)
  const job = await auditQueue.add('audit-request', { url, userId });
  
  // Immediately respond with job ID (fast response!)
  res.json({ jobId: job.id, message: 'Audit job queued successfully' });
});

// 5. GET /api/audit/:jobId - Check job status
// When someone wants to check if their audit is complete:
app.get('/api/audit/:jobId', async (req, res) => {
  const job = await auditQueue.getJob(req.params.jobId);
  const state = await job.getState(); // 'waiting', 'active', 'completed', 'failed'
  
  res.json({ id: job.id, state, progress: job.progress, data: job.data });
});

// 6. Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
```

---

### 📄 `src/config/redis.ts`
**Purpose**: Redis connection configuration

**What it does**:
1. **Defines Connection Settings**: Host, port, password from environment variables
2. **Creates Redis Client**: A connection to the Redis database
3. **Health Check Function**: Tests if Redis is working
4. **Event Listeners**: Logs connection status

**Why Redis?**
Redis is used as a **fast, in-memory database** that stores:
- Job queue data
- Job status and progress
- Results when jobs complete

**Environment Variables**:
```bash
# Option 1: Use REDIS_URL (recommended for cloud Redis)
REDIS_URL=redis://default:password@host:port/db

# Option 2: Use individual parameters (fallback if REDIS_URL not set)
REDIS_HOST=localhost      # Where Redis is running
REDIS_PORT=6379           # Redis port
REDIS_PASSWORD=optional   # Password if needed
```

**How it works**:
- If `REDIS_URL` is set, the system parses it to extract host, port, password, and database
- If `REDIS_URL` is not set, it falls back to individual parameters
- This supports both local development (localhost) and cloud Redis deployments

---

### 📄 `src/queues/auditQueue.ts`
**Purpose**: Defines the audit job queue

**What it does**:
1. **Creates a Queue**: Named `website-audit`
2. **Configures Job Options**:
   - **Attempts**: 3 (retries up to 3 times if it fails)
   - **Backoff**: Exponential delay between retries (1s, 2s, 4s...)
   - **Auto-cleanup**: Removes old completed/failed jobs automatically

**Job Data Structure**:
```typescript
interface AuditJobData {
  url: string;           // Website URL to audit
  userId: string;        // Who requested the audit
  options?: any;         // Additional options (optional)
}
```

**Why Use a Queue?**
- **Non-blocking**: API responds immediately, job processes later
- **Scalability**: Can handle many requests without overwhelming the server
- **Reliability**: Jobs are retried if they fail
- **Persistence**: Jobs survive server restarts (stored in Redis)

---

### 📄 `src/workers/auditWorker.ts`
**Purpose**: Processes audit jobs from the queue

**What it does**:
1. **Defines Processing Logic**: The `processAudit` function that does the actual work
2. **Creates Worker**: Connects to the queue and starts processing jobs
3. **Handles Events**: Logs when jobs complete or fail

**How Processing Works**:

```typescript
async function processAudit(job: Job<AuditJobData>) {
  // 1. Log start
  console.log(`Processing audit for URL: ${job.data.url}`);
  
  // 2. Update progress (10%)
  await job.updateProgress(10);
  
  // 3. Do the actual audit work
  // This is where you would:
  // - Fetch the website
  // - Analyze HTML, CSS, JavaScript
  // - Check performance, SEO, accessibility
  // - Generate a report
  
  const result = {
    url: job.data.url,
    score: 85,
    issues: [],
    timestamp: new Date(),
  };
  
  // 4. Update progress (100%)
  await job.updateProgress(100);
  
  // 5. Return result (saved in Redis, available via API)
  return result;
}
```

**Worker Configuration**:
- **Concurrency**: 5 (processes 5 jobs simultaneously)
- **Auto-start**: Starts processing as soon as jobs are added

---

## Complete Audit Workflow

### Scenario: User Requests a Website Audit

#### Step 1: User Sends Request
```bash
POST http://localhost:3000/api/audit
{
  "url": "https://example.com",
  "userId": "user123",
  "pageLimit": 50  // optional, for multi-page crawl
}
```

#### Step 2: Express Server Receives Request
- [src/index.ts](src/index.ts) handles the POST request
- Extracts `url`, `userId`, and optional `pageLimit` from request body

#### Step 3: Job Added to Queue
- Calls `auditQueue.add()` from [src/queues/auditQueue.ts](src/queues/auditQueue.ts)
- Creates a job with unique ID
- Stores job in Redis
- **Immediately responds** to user with job ID:
```json
{
  "jobId": "1",
  "message": "Audit job queued successfully"
}
```

#### Step 4: Worker Picks Up Job
- `auditWorker` from [src/workers/auditWorker.ts](src/workers/auditWorker.ts) monitors the queue
- Sees new job available
- Starts processing it in the background

---

#### Step 5: Job Processing - 4-Stage Pipeline

**Stage 1: Crawling (0-20% progress)**

Component: [src/services/crawler/SiteAuditCrawler.ts](src/services/crawler/SiteAuditCrawler.ts)

```typescript
const crawler = new SiteAuditCrawler(browserPool);
const pages = await crawler.auditSite(job.data.url, {
  mode: job.data.pageLimit ? 'MULTI' : 'SINGLE',
  maxPages: job.data.pageLimit ?? 1,
});
// Returns: PageData[] - all pages with extracted data
```

What happens:
- Launch Playwright browser from pool
- Navigate to target URL
- Extract titles, descriptions, headings, images, links
- Measure Core Web Vitals (LCP, CLS, FID)
- If multi-page mode: follow internal links up to pageLimit
- Return structured page data

**Stage 2: Analysis (20-60% progress)**

Component: [src/services/analyzer/SeoAnalyzer.ts](src/services/analyzer/SeoAnalyzer.ts) + Rule Engine

```typescript
const analyzer = new SeoAnalyzer();
const result = await analyzer.analyze(pages, job.data.url);
// Returns: AnalysisResult with issues[] and scores
```

What happens:
- Build site-wide context (title maps, link graph)
- Execute all 25+ registered rules
- Each rule checks pages for specific SEO issues
- Detect duplicates across pages
- Calculate impact scores
- Generate category scores (On-Page, Technical, etc.)
- Calculate weighted overall score

**Stage 3: Recommendations (60-80% progress)**

Component: [src/services/recommendations/RecommendatonGenerator.ts](src/services/recommendations/RecommendatonGenerator.ts)

```typescript
const recGen = new RecommendationGenerator(prisma);
const recommendations = await recGen.generateRecommendations(result.issues);
// Returns: Recommendation[] with actionable fix steps
```

What happens:
- For each issue, look up fix template in database
- If no template exists, generate generic recommendations
- Calculate priority (1-10) based on severity and impact
- Estimate time and difficulty
- Create step-by-step fix instructions

**Stage 4: Database Storage (80-100% progress)**

Component: [src/workers/auditWorker.ts](src/workers/auditWorker.ts) + Prisma

```typescript
const auditReport = await prisma.auditReport.create({
  data: {
    url: job.data.url,
    status: 'COMPLETED',
    overallScore: result.overallScore,
    categoryScores: result.categoryScores,
    pagesAnalyzed: pages.length,
    userId: job.data.userId,
    seoPages: { /* ... */ },
    seoIssues: { /* ... */ },
    recommendations: { /* ... */ },
  },
});
```

What happens:
- Create AuditReport record
- Save all SeoPage records (one per page)
- Save all SeoIssue records (all problems found)
- Save all Recommendation records
- Save all FixStep records (ordered instructions)
- Link everything together with foreign keys
- Mark audit as COMPLETED

---

#### Step 6: User Checks Status
```bash
GET http://localhost:3000/api/audit/1
```

Response while processing (Stage 2):
```json
{
  "id": "1",
  "state": "active",
  "progress": 45,
  "data": { 
    "url": "https://example.com", 
    "userId": "user123",
    "pageLimit": 50
  }
}
```

Response when complete:
```json
{
  "id": "1",
  "state": "completed",
  "progress": 100,
  "returnvalue": {
    "reportId": "550e8400-e29b-41d4-a716-446655440000",
    "url": "https://example.com",
    "overallScore": 76,
    "categoryScores": {
      "ON_PAGE": 72,
      "TECHNICAL": 85,
      "PERFORMANCE": 68
    },
    "pagesAnalyzed": 47,
    "issuesFound": 23,
    "timestamp": "2026-03-20T12:00:00.000Z"
  }
}
```

---

## Detailed Processing Flow

### 1. Application Startup

```
1. Load environment variables (dotenv)
   ↓
2. Connect to PostgreSQL via Prisma
   ↓
3. Initialize BrowserPool (Playwright browsers)
   ↓
4. Register all SEO rules in RuleRegistry
   ↓  
5. Import auditQueue and start auditWorker
   ↓
6. Start Express server on port 3000
   ↓
7. auditWorker connects to Redis and starts listening
   ↓
8. Ready to accept requests! ✓
```

### 2. End-to-End Processing Flow

```
Client HTTP Request
    ↓
[Express Server] (index.ts)
    ↓
validate request data
    ↓
[Audit Queue] (auditQueue.ts)
    ↓
add job to Redis with retry config
    ↓
respond 200 OK with jobId ⚡ FAST
    ↓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    ↓ (async background processing)
[Audit Worker] (auditWorker.ts)
    ↓
detect new job in queue
    ↓
[Browser Pool] (BrowserPool.ts)
    ↓
acquire Playwright browser
    ↓
[Site Crawler] (SiteAuditCrawler.ts)
    ↓
navigate to URL(s) → extract data
    ↓
PageData[] (title, meta, headings, links, etc.)
    ↓
[Site Context Builder] (siteContextBuilder.ts)
    ↓
build title/desc maps, link graph
    ↓
SiteContext (cross-page analysis data)
    ↓
[Rule Engine] (ruleEngine.ts)
    ↓
execute 25+ rules from registry
    ↓
SeoIssue[] + category scores
    ↓
[Recommendation Generator] (RecommendatonGenerator.ts)
    ↓
match issues to fix templates
    ↓
Recommendation[] with steps
    ↓
[Database] (Prisma)
    ↓
transaction: save report, pages, issues, fixes
    ↓
mark audit as COMPLETED
    ↓
store report ID in job result
    ↓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    ↓
Client polls GET /api/audit/:jobId
    ↓
fetch job from Redis
    ↓
return state + result
```

### 3. Error Handling

**If a job fails:**
1. Worker logs the error with stack trace
2. Job is automatically retried (up to 3 times)
3. Exponential backoff: waits 1s, then 2s, then 4s between retries
4. After 3 failures, job is marked as "failed"
5. Failed jobs are kept for 24 hours for debugging
6. If crawling fails: browser pool releases browser, returns error
7. If analysis fails: partial results are logged, issue saved
8. If save fails: Prisma transaction rolls back, no partial data

### 4. Graceful Shutdown

When you stop the app (Ctrl+C):
```typescript
process.on('SIGTERM', async () => {
  await browserPool.closeAll();  // Close all Playwright browsers
  await auditQueue.close();      // Stop accepting new jobs
  await auditWorker.close();     // Finish current jobs
  await prisma.$disconnect();    // Close database connection
  process.exit(0);               // Exit cleanly
});
```

---

## Database Schema

The system uses PostgreSQL with Prisma ORM. Schema defined in [prisma/schema.prisma](prisma/schema.prisma).

### Entity Relationship Diagram

```
┌──────────────┐
│     User     │
└──────┬───────┘
       │ 1
       │
       │ N
┌──────┴───────────────┐
│   AuditReport        │  (Main audit record)
│  ─────────────────   │
│  id (uuid)           │
│  url                 │
│  status              │
│  overallScore        │
│  categoryScores      │
│  pagesAnalyzed       │
│  createdAt           │
└──────┬───────────────┘
       │ 1
       ├─────────────────┬──────────────┬─────────────────┐
       │ N               │ N            │ N               │
┌──────┴────────┐ ┌─────┴──────┐ ┌────┴────────────┐ ┌──┴────────────┐
│   SeoPage     │ │  SeoIssue  │ │ Recommendation  │ │ ServiceRequest│
│  ───────────  │ │  ────────  │ │  ─────────────  │ └───────────────┘
│  url          │ │  type      │ │  title          │
│  title        │ │  title     │ │  description    │
│  description  │ │  severity  │ │  priority       │
│  h1           │ │  category  │ │  estimatedTime  │
│  wordCount    │ │  pageUrl   │ │  difficulty     │
│  loadTime     │ │  impact    │ │  whyItMatters   │
│  lcpScore     │ └────┬───────┘ └────┬────────────┘
│  clsScore     │      │ 1            │ 1
└───────────────┘      │              │
                       │ N            │ N
                 ┌─────┴──────┐ ┌─────┴──────┐
                 │  FixGuide  │ │  FixStep   │ (ordered)
                 │  ─────────  │ │  ────────  │
                 │  title     │ │  stepOrder │
                 │  steps     │ │  title     │
                 └────────────┘ │  description│
                                │  codeExample│
                                └────────────┘
```

### Key Models

**AuditReport**
- Primary audit record
- Contains overall score and category breakdowns
- Status: PENDING, IN_PROGRESS, COMPLETED, FAILED
- Links to all pages, issues, and recommendations

**SeoPage**
- One record per page crawled
- Stores all extracted metadata
- Includes performance metrics (LCP, CLS, FID)
- Links to specific issues found on that page

**SeoIssue**
- One record per problem found
- Categorized by type (ON_PAGE, TECHNICAL, etc.)
- Severity: CRITICAL, HIGH, MEDIUM, LOW
- Includes impact score (0-100)
- Links to the page where it was found

**Recommendation**
- Actionable fix for one or more issues
- Priority (1-10), effort estimate, difficulty
- Links to detailed fix steps

**FixStep**
- Ordered step-by-step instructions
- Optional code examples
- Numbered for clear workflow

**FixGuide** (Template)
- Master fix templates stored in database
- Reusable across multiple audits
- Created by admins or auto-generated

### Example Data Flow

For URL `https://example.com`:

```sql
-- 1. Create audit report
INSERT INTO AuditReport (id, url, status, userId)
VALUES ('550e...', 'example.com', 'IN_PROGRESS', 'user123');

-- 2. Save crawled page
INSERT INTO SeoPage (auditReportId, url, title, h1, wordCount)
VALUES ('550e...', 'example.com', 'Example Site', 'Welcome', 450);

-- 3. Save issue found by rule
INSERT INTO SeoIssue (auditReportId, pageUrl, type, severity, title)
VALUES ('550e...', 'example.com', 'TITLE_TOO_SHORT', 'HIGH', 'Title Too Short');

-- 4. Save recommendation
INSERT INTO Recommendation (auditReportId, title, priority, difficulty)
VALUES ('550e...', 'Expand Page Title', 8, 'easy');

-- 5. Save fix steps
INSERT INTO FixStep (recommendationId, stepOrder, title, description)
VALUES ('rec123', 1, 'Identify keyword', 'Research main keyword...');
```

---

## Technical Components

### Playwright + Browser Pool
- **What**: Headless browser automation library
- **Why**: Executes JavaScript, measures real performance, handles modern SPAs
- **Features**: Multiple contexts, network interception, performance metrics
- **Pool**: Manages 5 browser instances, reuses them across jobs

### BullMQ + Redis
- **What**: Robust job queue system built on Redis
- **Why**: Reliable, fast, distributed queue management
- **Features**: Retries, priorities, rate limiting, scheduled jobs, progress tracking
- **Redis**: In-memory storage for queue state and job results

### PostgreSQL + Prisma
- **What**: Relational database with type-safe ORM
- **Why**: Durable storage, complex queries, transactions
- **Prisma**: Auto-generated TypeScript client, migrations, type safety

### Express
- **What**: Minimal web framework for Node.js
- **Why**: Simple, widely-used for building REST APIs
- **Provides**: Routing, middleware, HTTP utilities

### TypeScript
- **What**: JavaScript with static type checking
- **Why**: Catches errors at compile time, better IDE support, maintainable
- **Benefits**: Type safety, interfaces, refactoring confidence

### Cheerio
- **What**: Fast, lightweight HTML parsing (jQuery-like API)
- **Why**: Extract data from HTML, analyze DOM structure
- **Use Case**: Parse HTML content during crawl, extract structured data

### SEO Rule Engine
- **What**: Modular, extensible SEO analysis framework
- **Why**: Maintainable, testable, production-grade audit system
- **Features**: 25+ rules, category weights, site-wide context, custom rules

---

## API Endpoints

### POST `/api/audit`
**Purpose**: Submit a new audit job

**Request Body**:
```json
{
  "url": "https://example.com",
  "userId": "user123",
  "pageLimit": 50  // optional, defaults to 1 (single page)
}
```

**Response** (200 OK):
```json
{
  "jobId": "1",
  "message": "Audit job queued successfully"
}
```

**Response** (400 Bad Request):
```json
{
  "error": "Missing required field: url"
}
```

**Response** (500 Error):
```json
{
  "error": "Failed to queue audit job"
}
```

---

### GET `/api/audit/:jobId`
**Purpose**: Check the status of an audit job

**Parameters**:
- `jobId`: The job ID returned when you submitted the audit

**Response - Job In Progress** (200 OK):
```json
{
  "id": "1",
  "state": "active",
  "progress": 45,
  "data": {
    "url": "https://example.com",
    "userId": "user123",
    "pageLimit": 50
  }
}
```

**Response - Job Completed** (200 OK):
```json
{
  "id": "1",
  "state": "completed",
  "progress": 100,
  "data": {
    "url": "https://example.com",
    "userId": "user123",
    "pageLimit": 50
  },
  "returnvalue": {
    "reportId": "550e8400-e29b-41d4-a716-446655440000",
    "url": "https://example.com",
    "overallScore": 76,
    "categoryScores": {
      "ON_PAGE": 72,
      "TECHNICAL": 85,
      "PERFORMANCE": 68,
      "ACCESSIBILITY": 80,
      "LINKS": 90,
      "STRUCTURED_DATA": 45,
      "SECURITY": 100
    },
    "pagesAnalyzed": 47,
    "issuesFound": 23,
    "issuesBySeverity": {
      "CRITICAL": 2,
      "HIGH": 8,
      "MEDIUM": 10,
      "LOW": 3
    },
    "timestamp": "2026-03-20T12:00:00.000Z"
  }
}
```

**Possible States**:
- `waiting`: Job is in queue, not started yet
- `active`: Job is currently being processed (check `progress` 0-100)
- `completed`: Job finished successfully, `returnvalue` contains results
- `failed`: Job failed after all retries, `failedReason` contains error

**Response - Job Failed** (200 OK):
```json
{
  "id": "1",
  "state": "failed",
  "progress": 15,
  "failedReason": "Timeout: unable to load page after 30s",
  "data": {
    "url": "https://example.com",
    "userId": "user123"
  }
}
```

**Response** (404 Not Found):
```json
{
  "error": "Job not found"
}
```

---

### GET `/api/report/:reportId` (future)
**Purpose**: Fetch full audit report from database

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "url": "https://example.com",
  "status": "COMPLETED",
  "overallScore": 76,
  "categoryScores": { /* ... */ },
  "createdAt": "2026-03-20T12:00:00.000Z",
  "pages": [
    {
      "url": "https://example.com",
      "title": "Example Domain",
      "description": "Example site",
      "h1": "Welcome",
      "wordCount": 450,
      "loadTime": 1234,
      "lcpScore": 2.5,
      "clsScore": 0.05
    }
  ],
  "issues": [
    {
      "type": "TITLE_TOO_SHORT",
      "title": "Title is too short",
      "description": "Title has only 12 characters, minimum is 50",
      "severity": "HIGH",
      "category": "ON_PAGE",
      "impactScore": 75,
      "pageUrl": "https://example.com"
    }
  ],
  "recommendations": [
    {
      "title": "Expand page title to 50-60 characters",
      "description": "Short titles reduce click-through rates...",
      "priority": 8,
      "estimatedTime": "5 minutes",
      "difficulty": "easy",
      "steps": [
        {
          "order": 1,
          "title": "Identify main keyword",
          "description": "Research the primary keyword...",
          "codeExample": null
        }
      ]
    }
  ]
}
```

---

### GET `/`
**Purpose**: Simple health check

**Response** (200 OK):
```
Hello from TypeScript backend!
```

---

## Getting Started

### Prerequisites
1. Node.js installed
2. Redis server running (locally or remote)

### Environment Setup
Create a `.env` file:
```env
PORT=3000

# Redis - Option 1: Use REDIS_URL (recommended)
REDIS_URL=redis://default:password@host:port/db

# Redis - Option 2: Individual parameters (fallback)
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_PASSWORD=yourpassword
```

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

---

## Project Summary

This is a **production-grade SEO audit system** that analyzes websites and generates actionable improvement recommendations.

### Architecture Highlights

**4-Stage Pipeline**:
1. **Crawl** → Playwright extracts page data with performance metrics
2. **Analyze** → 25+ modular rules detect SEO issues
3. **Recommend** → AI-powered fix generation with step-by-step guides
4. **Save** → PostgreSQL stores complete audit history

**Key Features**:
- ✅ **Async Job Queue**: Fast API responses, background processing via BullMQ
- ✅ **Modular Rule Engine**: 25+ independent SEO rules, easily extensible
- ✅ **Site-Wide Analysis**: Detects duplicates and issues across multiple pages
- ✅ **Smart Scoring**: Category-weighted scores (On-Page 25%, Technical 20%, etc.)
- ✅ **Actionable Recommendations**: Priority-ranked fixes with time estimates
- ✅ **Scalable**: Handles concurrent audits with browser pooling
- ✅ **Reliable**: Automatic retries, graceful failure handling
- ✅ **Type-Safe**: Full TypeScript coverage with Prisma ORM

### System Benefits

**For Users**:
- Get comprehensive SEO analysis in minutes
- Receive prioritized, actionable fixes
- Track improvements over time

**For Developers**:
- Easy to add new rules (modular design)
- Type-safe throughout (TypeScript + Prisma)
- Well-documented codebase
- Testable components

**For Operations**:
- Handles high load (5 concurrent workers)
- Automatic retry on failures
- Browser resource pooling
- Persistent storage in PostgreSQL

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **API** | Express + TypeScript | REST endpoints, request handling |
| **Queue** | BullMQ + Redis | Job management, progress tracking |
| **Crawler** | Playwright + Pool | Headless browsing, data extraction |
| **Analysis** | Rule Engine | Modular SEO rule execution |
| **Recommendations** | AI Generator | Fix step generation |
| **Database** | PostgreSQL + Prisma | Audit storage, reporting |

### File Structure Summary

```
backend/
├── src/
│   ├── index.ts                    # Express server + API routes
│   ├── config/
│   │   └── redis.ts                # Redis connection
│   ├── queues/
│   │   └── auditQueue.ts           # BullMQ queue setup
│   ├── workers/
│   │   └── auditWorker.ts          # 4-stage pipeline processor
│   ├── services/
│   │   ├── crawler/
│   │   │   ├── BrowserPool.ts      # Playwright pool manager
│   │   │   └── SiteAuditCrawler.ts # Web crawling logic
│   │   ├── analyzer/
│   │   │   ├── types.ts            # Rule engine types
│   │   │   ├── ruleEngine.ts       # Rule executor
│   │   │   ├── ruleRegistry.ts     # Rule manager
│   │   │   ├── siteContextBuilder.ts # Cross-page context
│   │   │   ├── SeoAnalyzer.ts      # Main API
│   │   │   └── rules/              # 25+ rule modules
│   │   │       ├── crawlability/
│   │   │       ├── titles/
│   │   │       ├── meta-descriptions/
│   │   │       ├── headings/
│   │   │       ├── content/
│   │   │       ├── links/
│   │   │       ├── images/
│   │   │       ├── technical/
│   │   │       ├── structured-data/
│   │   │       └── security/
│   │   └── recommendations/
│   │       └── RecommendatonGenerator.ts
│   └── generated/
│       └── prisma/                 # Auto-generated Prisma client
├── prisma/
│   ├── schema.prisma               # Database schema
│   └── migrations/                 # DB version history
├── lib/
│   └── prisma.ts                   # Prisma client instance
└── test/                           # Test files
```

### Quick Start Reference

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database and Redis credentials

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev

# Server runs on http://localhost:3000
```

### API Usage Example

```bash
# 1. Submit audit job
curl -X POST http://localhost:3000/api/audit \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","userId":"user123","pageLimit":10}'

# Response: {"jobId":"1","message":"Audit job queued successfully"}

# 2. Check status (poll every 2-5 seconds)
curl http://localhost:3000/api/audit/1

# 3. When state is "completed", get reportId from returnvalue
# 4. Fetch full report from database (future endpoint)
curl http://localhost:3000/api/report/{reportId}
```

---

## Next Steps for Development

### Completed ✅
- [x] 4-stage audit pipeline
- [x] Playwright browser pool
- [x] Multi-page crawling
- [x] 25+ production SEO rules
- [x] Site-wide duplicate detection
- [x] Weighted scoring algorithm
- [x] Recommendation generator
- [x] Database persistence
- [x] BullMQ job queue
- [x] TypeScript throughout

### TODO 🔨
- [ ] Add GET `/api/report/:reportId` endpoint
- [ ] Implement caching for repeated audits
- [ ] Add webhook notifications on completion
- [ ] Build admin panel for viewing reports
- [ ] Add custom rule configuration via UI
- [ ] Implement scheduled recurring audits
- [ ] Add competitor analysis features
- [ ] Export reports as PDF/CSV
- [ ] Add authentication & rate limiting
- [ ] Deploy to production (Docker + Kubernetes)

---

## Troubleshooting

### Job stays in "waiting" state
- **Cause**: Worker not running or Redis disconnected
- **Fix**: Check `auditWorker.ts` logs, verify Redis connection

### Browser pool exhausted
- **Cause**: Too many concurrent jobs
- **Fix**: Increase pool size in `BrowserPool.ts` or reduce worker concurrency

### Database connection errors
- **Cause**: PostgreSQL not running or wrong credentials
- **Fix**: Check `.env` file, run `npx prisma studio` to test connection

### Crawl timeout errors
- **Cause**: Target site is slow or blocking requests
- **Fix**: Increase timeout in `SiteAuditCrawler.ts`, add retries

### Missing issues in report
- **Cause**: Rule not registered or disabled
- **Fix**: Check `ruleRegistry.ts`, ensure `registerDefaultRules()` is called

---

## Performance Considerations

**Browser Pool Size**: 5 browsers (configurable)
- Each browser uses ~100-200MB RAM
- Total: ~1GB for browser pool

**Worker Concurrency**: 5 jobs (configurable)
- Balanced for typical server resources
- Increase if you have more CPU/RAM

**Multi-Page Limits**:
- Default: 50 pages per audit
- Recommended max: 100 pages
- Beyond 100: consider splitting into multiple audits

**Database Growth**:
- Average audit: ~10-50 pages
- ~20-100 issues per audit
- ~30-150 recommendations per audit
- Plan for ~1MB per complete audit report

**Redis Memory**:
- Active job data: ~10KB per job
- Results cached: ~100KB per completed audit
- Auto-cleanup after 7 days

---
