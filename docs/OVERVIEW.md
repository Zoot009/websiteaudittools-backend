## **Website Audit Tools Backend - Detailed Overview**

This is a **production-grade SEO audit platform** that crawls websites, analyzes them against 25+ SEO best practices, and generates actionable recommendations with step-by-step fix guides.

---

## **🎯 Core Purpose**

The backend provides an **asynchronous job-based system** that:
1. Accepts website URLs via REST API
2. Crawls pages using advanced browser automation (Playwright)
3. Analyzes content against comprehensive SEO rules
4. Generates scored reports with prioritized recommendations
5. Stores results in PostgreSQL for retrieval and historical tracking

---

## **🏗️ Architecture Stack**

**Queue & Workers**
- **BullMQ** + **Redis**: Job queue for handling long-running audits (5 concurrent workers)
- Supports both single-page and multi-page (sitemap-based) audits
- Built-in retry logic and progress tracking

**Web Crawling**
- **Playwright** with browser pooling (reusable browser contexts)
- **Anti-bot features**: Cloudflare bypass, human behavior simulation, stealth mode
- **Smart caching**: Stores crawled data in database to avoid re-crawling unchanged pages
- **Sitemap parsing**: Auto-discovers pages via sitemap.xml for multi-page audits
- **Local SEO detection**: Extracts phone numbers and addresses

**Database**
- **PostgreSQL** via **Prisma ORM**
- **Clerk**: User authentication integration (OAuth/JWT)
- Tier-based usage limits (FREE/PAID tiers)

**API**
- **Express.js** REST API
- Endpoints for creating audits, checking job status, retrieving reports

---

## **📊 Four-Stage Processing Pipeline**

Each audit job flows through these stages:

### **Stage 1: Crawling (0-20%)**
```
Input: URL + mode (single/multi) + options
Process: 
  - Check cache: If page was crawled recently, use cached data
  - Otherwise: Launch Playwright browser
  - Handle Cloudflare/bot detection with stealth techniques
  - Extract: HTML, headings, images, links, meta tags, structured data
  - Measure: Load time, Core Web Vitals (LCP, CLS)
  - For multi-page: Parse sitemap, crawl up to pageLimit
Output: PageData[] array (all crawled pages)
```

**Key Features:**
- Browser pooling for performance
- Human behavior simulation (random delays, mouse movements)
- Rate limiting (2-5 sec between requests)
- Local SEO data extraction (phone/address detection)

### **Stage 2: Analysis (20-60%)**
```
Input: PageData[], baseUrl
Process: 
  - Run 25+ SEO rules via modular rule engine
  - Rules organized by category:
    * Crawlability (5xx errors, redirects, noindex)
    * Titles (missing, length, duplicates)
    * Meta descriptions (missing, length, duplicates)
    * Headings (H1 missing/multiple/generic)
    * Content quality (thin content)
    * Images (missing alt text)
    * Links (broken internal links)
    * Technical (performance, mobile-friendliness)
    * Structured data (schema.org)
    * Security (HTTPS)
    * Local SEO (NAP consistency)
  - Calculate scores per category (0-100)
  - Aggregate overall site score
Output: AnalysisResult with SeoIssue[]
```

**Score Breakdown:**
- Overall Score (weighted average)
- Technical Score
- On-Page Score
- Performance Score
- Accessibility Score
- Link Score
- Structured Data Score
- Security Score

### **Stage 3: Recommendations (60-80%)**
```
Input: SeoIssue[]
Process:
  - Group issues by type
  - Generate fix guides with:
    * Priority (Critical, High, Medium, Low)
    * Estimated impact
    * Step-by-step instructions
    * Code examples
    * Affected URLs
Output: Recommendation[] with FixStep[]
```

### **Stage 4: Database Persistence (80-100%)**
```
Process:
  - Save AuditReport (scores, status, metadata)
  - Save SeoPage[] (each page with cached crawl data)
  - Save SeoIssue[] (all detected problems)
  - Save Recommendation[] with nested FixStep[]
  - All in single transaction for consistency
Output: Audit report ID returned to client
```

---

## **🗄️ Database Schema**

**User** - Customer accounts (synced from Clerk)
- Tier-based limits (FREE/PAID)
- Monthly audit quota tracking

**AuditReport** - Main audit record
- Stores all 8 score metrics
- Links to user, pages, issues, recommendations
- Status: PROCESSING → COMPLETED/FAILED

**SeoPage** - Individual pages analyzed
- Cached crawl data (JSONB): headings, images, links
- Performance metrics: loadTime, LCP, CLS, FID
- Content metrics: wordCount, imageCount, linkCount
- Local SEO data (structured JSON)

**SeoIssue** - Problems detected
- Category (Technical, OnPage, Performance, etc.)
- Severity (Critical, High, Medium, Low)
- Impact score
- Affected page reference

**Recommendation** - Fix guides
- Priority-sorted actionable advice
- Estimated impact
- Step-by-step instructions via FixStep[]

**FixStep** - Individual fix instructions
- Ordered steps with code examples
- Tool/file references

---

## **🔧 Key API Endpoints**

```
POST /api/audits
  Body: { url, userId?, mode: 'single'|'multi', pageLimit?, forceRecrawl? }
  Response: { jobId, message, url, mode }

GET /api/audits/jobs/:jobId
  Response: { id, state, progress, data, returnvalue, failedReason }

GET /api/reports
  Query: ?page=1&limit=10&userId=xyz
  Response: List of audit reports with pagination

GET /api/reports/:id
  Response: Full audit report with pages, issues, recommendations

GET /api/cache/stats
  Response: Cache hit rate and statistics
```

---

## **🚀 Advanced Features**

**1. Intelligent Caching**
- Stores complete crawl data in database
- Avoids re-crawling if page unchanged (configurable TTL)
- Reduces crawl time by 80%+ for repeat audits
- Cache stats tracking

**2. Anti-Bot Evasion**
- Cloudflare challenge detection and bypass
- Stealth mode (masked automation signatures)
- Random user agents and viewports
- Human behavior simulation (mouse movements, scrolling)
- Rate limiting with jitter

**3. Rule Engine Architecture**
- **Modular**: Each rule is independent and testable
- **Contextual**: Rules access site-wide context (all pages)
- **Extensible**: Easy to add new rules
- **Categorized**: 12 rule categories (titles, meta, headings, etc.)

**4. Browser Pooling**
- Reuses browser contexts across crawls
- Reduces overhead from launching browsers
- Memory-efficient with automatic cleanup
- Timeout handling

---

## **📁 File Structure**

```
src/
├── index.ts                 # Express API server
├── config/
│   └── redis.ts            # Redis connection config
├── queues/
│   └── auditQueue.ts       # BullMQ job queue definition
├── workers/
│   └── auditWorker.ts      # 4-stage pipeline processor
├── services/
│   ├── crawler/
│   │   ├── SiteAuditCrawler.ts      # Main crawler
│   │   ├── BrowserPool.ts            # Browser reuse
│   │   ├── cloudflareBypass.ts       # Anti-bot
│   │   ├── humanBehavior.ts          # Stealth
│   │   ├── crawlCache.ts             # Smart caching
│   │   ├── sitemapParser.ts          # Sitemap discovery
│   │   └── localSeoDetection.ts      # NAP extraction
│   ├── analyzer/
│   │   ├── SeoAnalyzer.ts            # Analysis orchestrator
│   │   ├── ruleEngine.ts             # Rule execution engine
│   │   ├── ruleRegistry.ts           # All 25+ rules registered
│   │   ├── siteContextBuilder.ts     # Cross-page analysis
│   │   └── rules/                    # 12 rule categories
│   │       ├── titles/
│   │       ├── meta-descriptions/
│   │       ├── headings/
│   │       ├── content/
│   │       ├── links/
│   │       ├── images/
│   │       ├── crawlability/
│   │       ├── technical/
│   │       ├── security/
│   │       ├── structured-data/
│   │       ├── local-seo/
│   │       └── on-page/
│   └── recommendations/
│       └── RecommendationGenerator.ts  # Fix guide creation

prisma/
├── schema.prisma           # Database models (7 tables)
└── migrations/             # Version-controlled DB changes
```

---

## **💡 Example Workflow**

```
1. Client: POST /api/audits { url: "example.com", mode: "multi", pageLimit: 50 }
   ↓
2. API: Creates BullMQ job → Returns jobId
   ↓
3. Worker picks up job:
   a. Parses sitemap → finds 200 URLs
   b. Crawls top 50 pages (respecting pageLimit)
   c. Checks cache, crawls only if needed
   d. Extracts structured data from each page
   ↓
4. Analyzer runs 25+ rules:
   - Finds 12 pages missing H1
   - Finds 8 meta descriptions too short
   - Finds 3 broken internal links
   - Detects 5 images without alt text
   ↓
5. RecommendationGenerator creates fix guides:
   - "Add H1 headings to 12 pages" (High priority)
   - "Extend 8 meta descriptions to 155 chars" (Medium)
   - Provides step-by-step instructions
   ↓
6. Database saves:
   - AuditReport (overallScore: 78/100)
   - 50 SeoPage records
   - 28 SeoIssue records
   - 5 Recommendation records with 23 FixStep records
   ↓
7. Client: GET /api/audits/jobs/{jobId} → See progress
   Client: GET /api/reports/{reportId} → View full report
```

---

## **🎯 Success Metrics**

- **Performance**: Handles 5 concurrent audits
- **Efficiency**: 80%+ cache hit rate on repeat audits
- **Accuracy**: 25+ SEO rules covering industry standards
- **Scalability**: Queue-based architecture supports horizontal scaling
- **Robustness**: Anti-bot evasion handles protected sites

This backend is ready for production deployment and can scale to handle thousands of audits per day.