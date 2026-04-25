# Website Audit Tools Backend - Complete Documentation

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [Directory Structure](#directory-structure)
4. [Database Schema](#database-schema)
5. [Core Services](#core-services)
6. [API Endpoints](#api-endpoints)
7. [Processing Pipeline](#processing-pipeline)
8. [Queue System](#queue-system)
9. [Key Features](#key-features)
10. [Setup & Deployment](#setup--deployment)

---

## Project Overview

**Website Audit Tools Backend** is a production-grade SEO audit platform that crawls websites, analyzes them against 25+ SEO best practices, and generates actionable recommendations.

### Core Capabilities
- **Full-Site SEO Audits** - Crawl websites and analyze against comprehensive rules
- **Link Graph Analysis** - Generate internal link structure visualizations compatible with D3.js
- **On-Demand Crawler** - Quick link graph crawling with background job processing
- **Screenshot Service** - Capture website screenshots
- **Anti-Bot Protection** - Cloudflare bypass, human behavior simulation, stealth mode
- **Browser Pooling** - Efficient concurrent crawling with Playwright
- **Smart Caching** - Avoid re-crawling unchanged pages
- **Queue System** - Background job processing with Bull/Redis

---

## Architecture & Tech Stack

### Backend Framework
- **Express.js v5.2.1** - RESTful API server
- **TypeScript v5.9.3** - Type-safe development
- **Node.js 18+** - Runtime environment

### Database Layer
- **PostgreSQL** - Primary data store
- **Prisma ORM v7.5.0** - Database access and migrations
- **Prisma Adapter for PostgreSQL** - Native PostgreSQL support

### Web Crawling & Browser Automation
- **Playwright v1.58.2** - Browser automation and crawling
- **Playwright Extra v4.3.6** - Additional plugins and extensions
- **Puppeteer Extra Stealth Plugin v2.11.2** - Anti-detection capabilities
- **Cheerio v1.2.0** - HTML parsing and scraping

### Background Job Processing
- **BullMQ v5.71.0** - Task queue and job management
- **Redis/IORedis v5.10.1** - In-memory data store and pub/sub

### AI & External Services
- **OpenAI v6.33.0** - Chat and analysis AI integration
- **Clerk Backend v3.2.2** - User authentication (OAuth/JWT)
- **Axios v1.13.6** - HTTP client for external APIs

### Utilities
- **xml2js v0.6.2** - XML parsing for sitemaps
- **dotenv v17.3.1** - Environment variable management
- **CORS v2.8.6** - Cross-origin request handling
- **pg v8.20.0** - PostgreSQL driver

---

## Directory Structure

```
backend/
├── src/                           # Source code
│   ├── index.ts                  # Main server entry point
│   ├── config/                   # Configuration modules
│   │   ├── deepseek.ts          # DeepSeek AI configuration
│   │   └── redis.ts             # Redis connection setup
│   ├── generated/                # Auto-generated Prisma types
│   │   └── prisma/
│   │       ├── browser.ts       # Generated types
│   │       ├── client.ts        # Prisma client types
│   │       ├── enums.ts         # Database enums
│   │       └── models.ts        # Database model types
│   ├── lib/                      # Shared libraries
│   │   └── prisma.ts            # Prisma client singleton
│   ├── routes/                   # API route handlers
│   │   └── chatRoutes.ts        # Chat API endpoints
│   ├── queues/                   # BullMQ queue definitions
│   │   ├── auditQueue.ts        # SEO audit job queue
│   │   └── linkGraphQueue.ts    # Link graph crawl job queue
│   ├── workers/                  # BullMQ job processors
│   │   ├── auditWorker.ts       # SEO audit processor
│   │   └── linkGraphWorker.ts   # Link graph processor
│   └── services/                 # Business logic services
│       ├── ai/                   # AI/Chat services
│       │   ├── chatService.ts            # Chat API integration
│       │   ├── conversationMemory.ts     # Conversation context management
│       │   ├── promptBuilder.ts         # Prompt generation
│       │   └── test-chat.ts             # Chat testing utilities
│       ├── analyzer/             # SEO rule engine
│       │   ├── RuleEngine.ts            # Rule execution
│       │   ├── RuleRegistry.ts          # Rule registration
│       │   ├── SeoAnalyzer.ts           # Main analyzer orchestrator
│       │   ├── siteContextBuilder.ts    # Context aggregation
│       │   ├── types.ts                 # Rule and issue types
│       │   └── rules/                   # SEO rules by category
│       │       ├── technical/           # Technical SEO (crawlability, redirects)
│       │       ├── on-page/            # On-page SEO (titles, meta, headers)
│       │       ├── performance/        # Performance metrics (Core Web Vitals)
│       │       ├── links/              # Link analysis (broken links)
│       │       ├── structured-data/    # Schema.org validation
│       │       ├── social/             # Social media optimization
│       │       └── usability/          # Accessibility and UX
│       ├── crawler/              # Website crawling service
│       │   ├── SiteAuditCrawler.ts          # Main crawler orchestrator
│       │   ├── BrowserPool.ts               # Browser pooling & reuse
│       │   ├── antibot.ts                   # Bot detection evasion
│       │   ├── cloudflareBypass.ts         # Cloudflare handling
│       │   ├── crawlCache.ts               # Response caching
│       │   ├── humanBehavior.ts            # Human behavior simulation
│       │   ├── robotsTxtParser.ts          # robots.txt parsing
│       │   ├── sitemapParser.ts            # sitemap.xml parsing
│       │   ├── localSeoDetection.ts        # Phone/address extraction
│       │   ├── extractPageData.js          # HTML extraction logic
│       │   ├── scrapeDoFallback.ts         # Fallback scraper
│       │   └── test-crawler.ts             # Crawler testing
│       ├── linkGraph/            # Link graph generation
│       │   ├── linkGraphCrawler.ts         # Link graph crawling
│       │   ├── linkGraphPageFetcher.ts     # Page fetching
│       │   ├── linkGraphService.ts         # Graph operations
│       │   └── [visualization files]      # Graph utilities
│       ├── performance/          # Performance measurement
│       ├── screenshots/          # Screenshot service
│       │   └── screenshotService.ts    # Screenshot capture
│       └── ai/                   # AI integration services
├── prisma/                        # Database configuration
│   ├── schema.prisma             # Prisma schema definition
│   ├── seed.ts                   # Database seeding script
│   └── migrations/               # Database migrations
│       ├── migration_lock.toml
│       └── [dated migrations]/
├── docs/                         # Project documentation
│   ├── OVERVIEW.md               # System overview
│   ├── API_DOCUMENTATION.md      # API reference
│   ├── IMPLEMENTATION_GUIDE.md    # Implementation details
│   ├── PROJECT_WORKFLOW.md        # Workflow diagrams
│   ├── QUICK_REFERENCE.md        # Quick reference guide
│   ├── SiteAuditCrawler.md       # Crawler documentation
│   ├── BrowserPoolEX.md          # Browser pooling details
│   ├── LINK_GRAPH_API.md         # Link graph API
│   ├── LINK_GRAPH_VISUALIZATION.md # Graph visualization
│   ├── CLOUDFLARE_BYPASS_GUIDE.md  # Bot detection evasion
│   ├── ANTI_BOT_GUIDE.md         # Anti-bot techniques
│   ├── HUMAN_BEHAVIOR_SUMMARY.md # Human behavior sim
│   ├── AI_CHAT_GUIDE.md          # Chat AI integration
│   └── [additional docs]
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies and scripts
└── README.md                     # Quick start guide
```

---

## Database Schema

### Core Models

#### **User**
Represents authenticated users with plan tiers.
- `id` - Unique identifier (CUID)
- `email` - Unique email address
- `name` - User's name
- `passwordHash` - Bcrypt hash for credentials auth (oauth users: null)
- `tier` - Plan tier (FREE/PAID)
- `auditsUsedThisMonth` - Usage tracking
- `lastResetDate` - Monthly reset date
- Relations: `auditReports`, `serviceRequests`, `accounts`, `sessions`

#### **Account** (OAuth)
NextAuth.js OAuth account links.
- Stores provider account IDs (Google, GitHub, etc.)
- Linked to User via `userId`

#### **Session** (OAuth)
NextAuth.js active sessions.
- `sessionToken` - Unique session identifier
- `expires` - Session expiration date

#### **AuditReport**
Main SEO audit result container.
- `id` - Unique identifier
- `jobId` - BullMQ job ID reference
- `url` - Website URL audited
- `mode` - Audit type (SINGLE, MULTI)
- `pagesAnalyzed` - Count of analyzed pages
- **Score Fields** (0-100):
  - `overallScore` - Aggregate score
  - `technicalScore` - Technical SEO
  - `onPageScore` - On-page optimization
  - `performanceScore` - Core Web Vitals
  - `accessibilityScore` - WCAG compliance
  - `linkScore` - Internal linking quality
  - `structuredDataScore` - Schema.org validation
  - `securityScore` - HTTPS and security measures
- `passingChecks` - JSON array of checks that passed
- `status` - PROCESSING/COMPLETED/FAILED
- `errorMessage` - Failure reason if applicable
- Relations: `user`, `pages[]`, `issues[]`, `recommendations[]`
- Timestamps: `createdAt`, `completedAt`

#### **SeoPage**
Individual pages within an audit.
- `id` - Unique identifier
- `url` - Full page URL
- `title` - Page title tag (extracted)
- `description` - Meta description (extracted)
- `statusCode` - HTTP response code
- `loadTime` - Page load time in milliseconds
- **SEO Analysis Fields**:
  - `h1Count` - H1 heading count
  - `imageCount` - Total images on page
  - `linkCount` - Total links on page
  - `wordCount` - Text content word count
  - `flashCount` - Deprecated Flash elements
  - `iframeCount` - iframe elements
- **Cached Data** (JSON):
  - `headings` - All headings (h1-h6) with text
  - `images` - Image elements with src and alt text
  - `links` - All links with href, text, and internal flag
  - `exposedEmails` - Found email addresses
  - `localSeo` - Phone numbers and addresses (if detected)
- **WEB Vitals**:
  - `lcp` - Largest Contentful Paint (milliseconds)
  - `cls` - Cumulative Layout Shift (score)
  - `fid` - First Input Delay (milliseconds)
- Relations: `auditReport`, `issues[]`

#### **SeoIssue**
Individual SEO problems found during analysis.
- `id` - Unique identifier
- `type` - Issue code (e.g., "missing_h1")
- `category` - IssueCategory enum
- `severity` - CRITICAL/HIGH/MEDIUM/LOW
- `title` - Human-readable issue title
- `description` - Detailed explanation
- `impactScore` - SEO impact (0-100)
- `pageUrl` - URL of affected page
- `elementSelector` - CSS selector (for HTML element issues)
- `lineNumber` - Code line number (for code issues)
- `recommendation` - How to fix it
- Relations: `auditReport`, `page`

#### **Recommendation**
Specific fix recommendations linked to issues.
- `id` - Unique identifier
- `title` - Recommendation title
- `description` - Detailed explanation
- `steps` - JSON array of fix steps
- `priority` - Priority level
- `estimatedFix Time` - Estimated time to fix (minutes)
- Relations: `auditReport`

### Enums

**AuditMode**
- `SINGLE` - Single page audit
- `MULTI` - Full-site/multi-page audit (via sitemap)

**AuditStatus**
- `PROCESSING` - Job in progress
- `COMPLETED` - Successfully completed
- `FAILED` - Execution error

**IssueCategory**
- TECHNICAL - Crawlability, redirects, indexing
- ON_PAGE - Titles, meta, headings, content
- PERFORMANCE - Core Web Vitals, load time
- ACCESSIBILITY - WCAG, screen reader compatibility
- LINKS - Internal linking structure, broken links
- STRUCTURED_DATA - Schema.org, JSON-LD validation
- SOCIAL - OG tags, Twitter cards, social signals
- SECURITY - HTTPS, security headers

**IssueSeverity**
- CRITICAL - Severe SEO impact (e.g., noindex = 100)
- HIGH - Major impact (e.g., missing H1 = 50)
- MEDIUM - Moderate impact (e.g., duplicate titles = 30)
- LOW - Minor impact (e.g., suboptimal practices = 10)

**UserTier**
- FREE - Limited audits per month
- PAID - Unlimited audits

---

## Core Services

### 1. **Crawler Service** (`services/crawler/`)
Handles website crawling with advanced anti-bot protection.

**Main Components:**

#### `SiteAuditCrawler.ts`
Orchestrates the crawling process.
- Supports two modes:
  - **SINGLE** - Crawl a single URL
  - **MULTI** - Crawl entire site via sitemap (up to `pageLimit`)
- Manages rate limiting (2-5 second delays)
- Handles file downloads and data extraction
- Returns: `CrawlResult` with pages array

#### `BrowserPool.ts`
Manages reusable browser instances.
- Pools up to 3 browsers (configurable)
- Context recycling for performance
- Features:
  - Stealth mode enabled by default
  - Random browser context (viewport, timezone, locale, user agent)
  - Navigation timeout (30 seconds)
  - Request/response interception for caching
  - Automatic context cleanup

#### `antibot.ts`
Anti-detection and URL filtering utilities.
- **URL Functions:**
  - `normalizeUrl()` - Ensures protocol (defaults to https://)
  - `cleanUrl()` - Removes fragments for deduplication
  - `getDomain()` - Extracts domain from URL
  - `isPageUrl()` - Filters assets (images, CSS, JS, etc.)
  - `isSitemapUrl()` - Detects sitemap XML files
- **Bot Detection Evasion:**
  - navigator.webdriver override
  - Plugin mocking
  - Automation detection patching

#### `cloudflareBypass.ts`
Handles Cloudflare protection and bot detection blocks.
- Detects 403 errors and blocked states
- Implements retry logic with exponential backoff
- Falls back to scrape.do if blocked

#### `humanBehavior.ts`
Simulates realistic user behavior.
- Random viewport sizes (6 variants)
- Random timezones (8 variants)
- Random user agents (5 variants)
- Realistic HTTP headers with Referer
- Page scroll simulation (20-60% of page)
- Mouse movement paths
- Reading delays based on word count

#### `crawlCache.ts`
Caches crawl results to avoid re-crawling.
- Stores HTML and metadata in database
- Checks cache before making requests
- Configurable cache duration
- Provides cache statistics

#### `sitemapParser.ts`
Parses sitemap.xml files for multi-page discovery.
- Extracts URL list from XML structure
- Supports sitemap indexes
- Returns sorted unique URLs

#### `robotsTxtParser.ts`
Parses robots.txt for crawl rules.
- Respects User-agent directives
- Checks Disallow/Allow rules
- Identifies crawl delays

#### `extractPageData.js`
Extracts structured data from HTML.
- Meta tags (title, description, canonical)
- Headings (h1-h6)
- Images with alt text
- Internal/external links
- Content word count
- Schema.org structured data
- Local SEO data (phone, address)

#### `localSeoDetection.ts`
Extracts local business information.
- Phone number detection and validation
- Address extraction
- Local schema.org detection

### 2. **SEO Analyzer Service** (`services/analyzer/`)
Runs 25+ SEO rules and generates scores.

**Components:**

#### `SeoAnalyzer.ts` (Main Orchestrator)
Coordinates analysis workflow.
- Initializes rule engine
- Executes rules against crawled pages
- Aggregates scores across categories
- Returns: `AnalysisResult` with issues and scores

#### `RuleEngine.ts`
Executes rules in sequence.
- Loads registered rules
- Runs against each page
- Collects issues and passing checks
- Manages rule context and state

#### `RuleRegistry.ts`
Manages rule registration and lifecycle.
- Loads rule files from `rules/` directory
- Stores rule metadata
- Provides rule query interface

#### `siteContextBuilder.ts`
Builds site-wide context for analysis.
- Aggregates data across all pages
- Detects duplicates (titles, descriptions)
- Identifies orphan pages
- Builds internal link structure
- Calculates site-wide metrics

#### `types.ts`
Type definitions for rules and analysis.
```typescript
interface Rule {
  code: string;
  category: IssueCategory;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  run(page: PageData, siteContext: SiteContext): Promise<Issue[]>;
}

interface Issue {
  code: string;
  title: string;
  description: string;
  severity: string;
  impactScore: number;
  recommendation: string;
}

interface AnalysisResult {
  overallScore: number;
  categoryScores: { category: string; score: number }[];
  issues: Issue[];
  passingChecks: PassingCheck[];
  totalIssues: number;
}
```

#### Rules Directory Structure (`rules/`)
Organized by SEO category:

- **`technical/`** - Crawlability and indexing
  - HTTP status codes
  - Redirects (chains, loops)
  - noindex/nofollow detection
  - Robots.txt compliance
  - SSL/TLS verification

- **`on-page/`** - Content optimization
  - Missing/duplicate title tags
  - Missing/duplicate meta descriptions
  - H1 tag analysis (missing, multiple, generic)
  - Content quality (thin content, keyword density)
  - Mobile-friendliness checks
  - Page load speed

- **`performance/`** - Web Vitals and speed
  - Largest Contentful Paint (LCP)
  - Cumulative Layout Shift (CLS)
  - First Input Delay (FID)
  - Time To First Byte (TTFB)
  - JavaScript execution time

- **`links/`** - Link analysis
  - Broken internal links (404s)
  - Missing anchor text
  - External links blocked
  - Link diversity
  - Orphaned pages

- **`structured-data/`** - Schema.org validation
  - Missing schema.org markup
  - Invalid JSON-LD
  - Missing Organization schema
  - Missing BreadcrumbList
  - Article schema completeness

- **`social/`** - Social optimization
  - Open Graph tags (og:title, og:image, etc.)
  - Twitter Card tags
  - Social media links
  - Social sharing buttons

- **`usability/`** - Accessibility and UX
  - Missing alt text on images
  - Form labels
  - ARIA attributes
  - Color contrast
  - Keyboard navigation

### 3. **Link Graph Service** (`services/linkGraph/`)
Generates visualizations of internal link structure.

#### `linkGraphCrawler.ts`
Crawls website structure for link analysis.
- Similar to SiteAuditCrawler but focuses on link discovery
- Tracks parent-child relationships
- Measures page depth via BFS

#### `linkGraphService.ts`
Graph operations and exports.
- **`generateLinkGraph()`** - Creates nodes with metadata
  - Inbound/outbound link counts
  - Page depth (via BFS from root)
  - Node classification: orphan, hub, authority
  - URL normalization
- **`filterLinkGraphByDepth()`** - Limits visualization by depth
- **`exportToDOT()`** - GraphViz DOT format (for analysis tools)
- **`exportToCSV()`** - CSV export for spreadsheet analysis
- **Metadata computation:**
  - Total nodes and edges
  - Orphan page count
  - Hub pages (many outbound links)
  - Authority pages (many inbound links)

### 4. **AI Chat Service** (`services/ai/`)
Integrates AI for SEO recommendations and chat.

#### `chatService.ts`
Main chat API interface.
- Sends messages to OpenAI/DeepSeek
- Maintains conversation context
- Generates SEO insights and recommendations
- Context-aware responses

#### `conversationMemory.ts`
Manages conversation state.
- Stores message history
- Provides context to AI
- Implements memory limits (token count)

#### `promptBuilder.ts`
Builds system and user prompts.
- Formats audit reports for AI consumption
- Creates SEO-specific prompt templates
- Injects conversation context

### 5. **Screenshot Service** (`services/screenshots/`)
Captures website screenshots.

#### `screenshotService.ts`
Screenshot capture and storage.
- Takes full-page screenshots
- Handles dynamic content
- Returns image path/URL
- Supports multiple viewport sizes

---

## API Endpoints

### Audit Management

#### Create SEO Audit
```http
POST /api/audits
Content-Type: application/json

{
  "url": "https://example.com",
  "userId": "user_123",
  "forceRecrawl": false
}
```

**Response (201 Created):**
```json
{
  "jobId": "123e4567-e89b-12d3-a456-426614174000",
  "message": "Audit job queued successfully",
  "url": "https://example.com",
  "mode": "single",
  "forceRecrawl": false
}
```

#### Create Anonymous Audit
```http
POST /api/audits/anonymous
Content-Type: application/json

{
  "url": "https://example.com"
}
```

**Rate Limits (per IP):**
- 3 audits per day
- 10 audits per domain per hour
- 15-minute cooldown between same-URL audits

#### Check Audit Status
```http
GET /api/audits/jobs/:jobId
```

**Response:**
```json
{
  "jobId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "PROCESSING|COMPLETED|FAILED",
  "progress": 45,
  "url": "https://example.com",
  "mode": "single"
}
```

#### Get Audit Results
```http
GET /api/audits/jobs/:jobId/result
```

**Response:**
```json
{
  "report": {
    "id": "report_123",
    "url": "https://example.com",
    "status": "COMPLETED",
    "pagesAnalyzed": 1,
    "overallScore": 78,
    "technicalScore": 85,
    "onPageScore": 72,
    "performanceScore": 68,
    "accessibilityScore": 82,
    "linkScore": 75,
    "structuredDataScore": 60,
    "securityScore": 95,
    "pages": [...],
    "issues": [...],
    "passingChecks": [...],
    "completedAt": "2024-04-22T10:30:00Z"
  }
}
```

### Link Graph

#### Queue Link Graph Crawl
```http
POST /api/link-graph/crawl
Content-Type: application/json

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
  "jobId": "graph_123",
  "message": "Link graph crawl job queued successfully",
  "url": "https://example.com/",
  "depth": 2,
  "statusUrl": "/api/link-graph/jobs/graph_123",
  "resultUrl": "/api/link-graph/jobs/graph_123/result"
}
```

#### Check Graph Job Status
```http
GET /api/link-graph/jobs/:jobId
```

#### Get Link Graph Results
```http
GET /api/link-graph/jobs/:jobId/result
```

**Response:** D3.js force-directed graph format
```json
{
  "base_url": "https://example.com/",
  "depth": 2,
  "nodes": [
    {
      "id": "https://example.com/",
      "label": "/",
      "group": 1,
      "inbound": 5,
      "outbound": 12,
      "depth": 0,
      "classification": "hub"
    }
  ],
  "links": [
    {
      "source": "https://example.com/",
      "target": "https://example.com/about/",
      "value": 1
    }
  ],
  "metadata": {
    "totalNodes": 45,
    "totalEdges": 120,
    "orphanCount": 2,
    "hubCount": 5,
    "authorityCount": 3,
    "avgDepth": 2.1,
    "crawlTime": 45000
  }
}
```

### Chat API

#### Send Chat Message
```http
POST /api/chat
Content-Type: application/json

{
  "message": "What's the issue with my site?",
  "auditReportId": "report_123",
  "conversationId": "conversation_123"
}
```

**Response:**
```json
{
  "conversationId": "conversation_123",
  "response": "Based on your audit, the main issues are...",
  "relatedIssues": [...]
}
```

---

## Processing Pipeline

### Audit Processing Flow

```
REQUEST
  ↓
[1] VALIDATION
  - Validate URL format
  - Check rate limits (anonymous users)
  - Check user tier limits
  ↓
[2] JOB QUEUING
  - Create BullMQ job
  - Store job metadata
  - Return jobId to client
  ↓
[3] WORKER PICKUP (auditWorker.ts)
  - Dequeue job
  - Update status → PROCESSING
  ↓
[4] CRAWLING (0-20% progress)
  - Initialize BrowserPool
  - Check cache for existing crawl
  - Crawl URL (or download from cache)
  - For multi-page: parse sitemap, crawl up to pageLimit
  - Extract: meta tags, headings, images, links, Web Vitals
  - Store cache data in database
  ↓
[5] ANALYSIS (20-60% progress)
  - Initialize SeoAnalyzer
  - Load all registered rules
  - Execute rules against each page
  - Generate SeoIssue[] list
  - Calculate category scores (0-100)
  - Aggregate overall score
  ↓
[6] DATA PERSISTENCE (60-80% progress)
  - Create AuditReport record
  - Create SeoPage records (one per crawled page)
  - Create SeoIssue records (one per issue found)
  - Create Recommendation records
  ↓
[7] COMPLETION (80-100% progress)
  - Update report status → COMPLETED
  - Store completedAt timestamp
  - Trigger cleanup/notification
  ↓
RESPONSE (Client polls jobId)
  - GET /api/audits/jobs/:jobId/result
  - Return full AuditReport with all relationships
```

### Score Calculation Logic

**Per-Category Scoring:**
1. Sum impact scores of all issues in category
2. Apply severity multipliers:
   - CRITICAL = 4x weight
   - HIGH = 2x weight
   - MEDIUM = 1x weight
   - LOW = 0.5x weight
3. Divide by maximum possible points for category
4. Convert to 0-100 scale
5. Weight by page count (multi-page audits averaged across pages)

**Overall Score:**
- Weighted average of all category scores:
  - Technical: 25%
  - On-Page: 25%
  - Performance: 20%
  - Accessibility: 10%
  - Links: 10%
  - Structured Data: 5%
  - Security: 5%

---

## Queue System

### BullMQ Architecture

Uses BullMQ with Redis for background job processing.

#### Audit Queue (`queues/auditQueue.ts`)
```typescript
interface AuditJobData {
  url: string;
  userId: string;
  mode: 'single' | 'multi';
  options: {
    forceRecrawl?: boolean;
    pageLimit?: number;
  };
}
```

**Configuration:**
- 5 concurrent workers
- 3 retry attempts with exponential backoff
- Auto-cleanup: 1 hour (completed), 24 hours (failed)
- Default timeout: 5 minutes (crawl) + 10 minutes (analysis)

#### Link Graph Queue (`queues/linkGraphQueue.ts`)
```typescript
interface LinkGraphJobData {
  url: string;
  depth: number;
  options: {
    stripTracking?: boolean;
    maxPages?: number;
  };
}
```

**Configuration:**
- Dedicated workers for link graph processing
- Timeout: 10 minutes (crawling can be slow)
- Result caching for visualization

#### Worker Processing

**auditWorker.ts:**
1. Receives AuditJobData
2. Calls SiteAuditCrawler.crawl()
3. Passes results to SeoAnalyzer.analyze()
4. Stores results in database
5. Reports success/failure

**linkGraphWorker.ts:**
1. Receives LinkGraphJobData
2. Calls linkGraphCrawler.crawl()
3. Calls generateLinkGraph()
4. Caches result in Redis
5. Makes result available via GET endpoint

---

## Key Features

### 1. Browser Pooling
- **3 reusable browser instances** per crawl request
- Context recycling instead of browser creation
- Reduces memory footprint and improves speed
- Stealth mode enabled for anti-detection

### 2. Anti-Bot Protection
- **Cloudflare bypass** with fallback to scrape.do
- **Human behavior simulation:**
  - Random delays (2-5 seconds between requests)
  - Realistic user agents and HTTP headers
  - Scroll simulation
  - Mouse movement
  - Reading delays based on content volume
- **Detection evasion:**
  - navigator.webdriver override
  - Plugin mocking
  - Viewport randomization
  - Timezone and locale randomization

### 3. Smart Caching
- **Response caching** in database
- **Cache validity checks** before recrawling
- **Manual override** with `forceRecrawl` flag
- Reduces API calls and downstream requests

### 4. Sitemap Auto-Discovery
- **Automatic sitemap detection** at `/sitemap.xml`
- **Multi-page crawling** via MULTI mode
- **URL extraction and deduplication**
- **Configurable page limits** (default: 50 pages)

### 5. Web Vitals Measurement
- **LCP** - Largest Contentful Paint
- **CLS** - Cumulative Layout Shift
- **FID** - First Input Delay
- Real RUM data from Playwright navigation

### 6. Local SEO Detection
- **Phone number extraction** with validation
- **Address detection** and standardization
- **Local schema.org** detection
- Supports multiple formats and variations

### 7. Link Graph Visualization
- **Internal link structure** mapping
- **Page classification:**
  - **Hub:** High outbound link count
  - **Authority:** High inbound link count
  - **Orphan:** No inbound links
  - **Regular:** Normal page
- **Depth tracking** via BFS from root
- **D3.js compatible** graph format
- Exports: DOT, CSV formats

### 8. Rate Limiting (Anonymous Users)
- **3 audits per IP per day**
- **10 audits per domain per hour**
- **15-minute cooldown** between identical URLs
- Prevents abuse and resource exhaustion

### 9. Multi-User Support
- **Clerk OAuth integration** for auth
- **User tier system** (FREE/PAID)
- **Usage tracking** per user
- **Monthly reset** of audit limits

### 10. AI Chat Integration
- **OpenAI/DeepSeek** API integration
- **Audit context awareness** with prompt injection
- **Conversation memory** for multi-turn dialogs
- **SEO-specific** response generation

---

## Setup & Deployment

### Prerequisites
- **Node.js 18+**
- **PostgreSQL 14+** (with pg_trgm extension for text search)
- **Redis 6+** (for queues and caching)
- **Cloudflare account** (optional, for bypass testing)
- **Clerk account** (for OAuth/authentication)
- **OpenAI/DeepSeek API key** (for AI features)

### Initial Setup

#### 1. Install Dependencies
```bash
npm install
```

#### 2. Environment Variables
Create `.env` file in root:
```bash
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/audit_tools"

# Redis
REDIS_URL="redis://localhost:6379"

# Authentication
CLERK_SECRET_KEY="your_clerk_secret"

# AI Services
OPENAI_API_KEY="sk-..."
DEEPSEEK_API_KEY="sk-..."

# CORS
CORS_ORIGIN="http://localhost:3000,http://localhost:3001"

# Anonymous Audit Limits
ANON_AUDIT_USER_EMAIL="anonymous@system.local"
ANON_AUDITS_PER_IP_PER_DAY=3
ANON_AUDITS_PER_DOMAIN_PER_HOUR=10
ANON_URL_COOLDOWN_SECONDS=900

# Optional: Browser configuration
BROWSER_POOL_SIZE=3
HEADLESS_BROWSER=true
```

#### 3. Database Setup
```bash
# Create PostgreSQL database
createdb audit_tools

# Run migrations
npx prisma migrate dev

# Seed test data
npx prisma db seed
```

#### 4. Start Server
```bash
# Development (with hot reload)
npm run dev

# Production
npm run build
npm run start
```

Server will be available at `http://localhost:3000`.

### Testing

#### Test Audit Job
```bash
curl -X POST http://localhost:3000/api/audits \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

#### Test Link Graph
```bash
curl -X POST http://localhost:3000/api/link-graph/crawl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "depth": 2}'
```

#### Prisma Studio
```bash
# Visual database editor
npx prisma studio
```

### Deployment Considerations

1. **Database**
   - Use managed PostgreSQL (AWS RDS, Heroku, etc.)
   - Enable connection pooling (PgBouncer)
   - Regular backups

2. **Redis**
   - Use managed Redis (AWS ElastiCache, Heroku, etc.)
   - Configure persistence (RDB/AOF)
   - Monitor memory usage

3. **Environment**
   - Use environment variables (not hardcoded)
   - Rotate API keys regularly
   - Enable logging and monitoring

4. **Scaling**
   - Increase worker count in production
   - Use load balancer for multiple instances
   - Monitor queue depth and worker utilization

5. **Monitoring**
   - Log job failures and error messages
   - Track audit completion times
   - Monitor API response times
   - Alert on queue backlog

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT REQUESTS                       │
└────────────┬────────────────────────────────────┬────────────┘
             │                                    │
      ┌──────▼──────┐                      ┌──────▼──────┐
      │POST /audits │                      │POST /graph  │
      └──────┬──────┘                      └──────┬──────┘
             │                                    │
      ┌──────▼────────────────────────────────────▼───────┐
      │         EXPRESS.JS API SERVER (index.ts)        │
      │  - Route handlers                               │
      │  - Rate limiting                                │
      │  - Input validation                             │
      └──────┬────────────────────────────────┬──────────┘
             │                                │
      ┌──────▼──────────────────┐    ┌──────▼──────────────────┐
      │   AUDIT QUEUE (Redis)    │    │ GRAPH QUEUE (Redis)    │
      │   BullMQ Job Store       │    │ BullMQ Job Store       │
      └──────┬──────────────────┘    └──────┬──────────────────┘
             │                                │
      ┌──────▼──────────────────┐    ┌──────▼──────────────────┐
      │  AUDIT WORKER (×5)      │    │  GRAPH WORKER (×N)     │
      │  auditWorker.ts         │    │  linkGraphWorker.ts    │
      └──────┬──────────────────┘    └──────┬──────────────────┘
             │                                │
      ┌──────▼──────────────────┐    ┌──────▼──────────────────┐
      │  SiteAuditCrawler       │    │  linkGraphCrawler      │
      │  ├─ BrowserPool ×3      │    │  ├─ BrowserPool ×3     │
      │  ├─ antibot.ts          │    │  └─ antibot.ts         │
      │  ├─ humanBehavior.ts    │    └──────┬──────────────────┘
      │  ├─ crawlCache.ts       │           │
      │  └─ extractPageData.js  │      ┌────▼────────────────┐
      └──────┬──────────────────┘      │linkGraphService.ts │
             │                         │- generateLinkGraph │
      ┌──────▼──────────────────┐     │- filterByDepth     │
      │   SeoAnalyzer.ts        │     │- export (DOT/CSV) │
      │  ├─ RuleEngine          │     └────┬────────────────┘
      │  ├─ RuleRegistry        │          │
      │  ├─ rules/ (25+ rules)  │     ┌────▼────────────────┐
      │  └─ siteContextBuilder  │     │  Redis Caching     │
      └──────┬──────────────────┘     └────────────────────┘
             │
      ┌──────▼──────────────────┐
      │  POSTGRESQL DATABASE     │
      │  ├─ AuditReport         │
      │  ├─ SeoPage             │
      │  ├─ SeoIssue            │
      │  ├─ CrawlCache          │
      │  └─ User/Auth models    │
      └──────────────────────────┘
```

---

## Common Tasks

### Add a New SEO Rule

1. Create file in `src/services/analyzer/rules/category/new-rule.ts:`
```typescript
import { Rule, PageData, SiteContext, Issue } from '../types';

export const newRule: Rule = {
  code: 'new_rule_code',
  category: 'ON_PAGE',
  title: 'New Rule Title',
  description: 'What this rule checks',
  severity: 'HIGH',
  
  async run(page: PageData, context: SiteContext): Promise<Issue[]> {
    const issues: Issue[] = [];
    
    if (/* condition */) {
      issues.push({
        code: this.code,
        title: this.title,
        description: `Details for this page`,
        severity: this.severity,
        impactScore: 40,
        recommendation: 'How to fix it',
      });
    }
    
    return issues;
  },
};
```

2. Register in `RuleRegistry.ts`
3. Restart worker process

### Modify Crawling Behavior

Edit `src/services/crawler/SiteAuditCrawler.ts`:
- Change `pageLimit` for multi-page audits
- Modify rate limiting delays (currently 2-5 seconds)
- Adjust timeout values
- Add new extraction logic

### Customize Anti-Bot Protection

Edit `src/services/crawler/BrowserPool.ts`:
- Add/modify user agents in `randomUserAgent()`
- Change viewport sizes array
- Adjust stealth plugin configuration
- Modify request/response interception

### Extend Link Graph Analysis

Edit `src/services/linkGraph/linkGraphService.ts`:
- Modify node classification logic
- Add new metadata calculations
- Implement new export formats
- Change depth calculation algorithm

---

## Performance Notes

- **Crawling:** Single page takes 3-8 seconds (varies by site)
- **Multi-page:** 2-3 seconds per page (with pooling)
- **Analysis:** Typically < 500ms for single page, ~2s for 10 pages
- **Memory:** ~300MB baseline + ~50MB per browser instance
- **Database:** Index on `url`, `status`, `createdAt`, `userId`

---

## Troubleshooting

### Queue Jobs Not Processing
1. Check Redis is running: `redis-cli ping`
2. Check worker logs: `npm run dev` (in separate terminal)
3. Verify database connectivity
4. Check for worker exceptions

### Browser Pool Issues
- Increase timeout in `SiteAuditCrawler.ts`
- Reduce `BROWSER_POOL_SIZE` if OOM
- Check Cloudflare blocking: see logs for 403 responses

### Slow Crawls
- Check network issues
- Inspect rate limiting delays
- Review site response times
- Consider enabling crawl cache

### Analysis Misses Issues
- Verify rule is registered in RuleRegistry
- Check rule conditions and thresholds
- Review rule test output
- Add logging to rule execution

---

## References

- **Playwright Docs:** https://playwright.dev
- **BullMQ Docs:** https://docs.bullmq.io
- **Prisma Docs:** https://www.prisma.io/docs
- **Express Docs:** https://expressjs.com
- **SEO Best Practices:** https://developers.google.com/search

---

**Last Updated:** April 22, 2026  
**Documentation Version:** 1.0.0  
**Backend Version:** 1.0.0
