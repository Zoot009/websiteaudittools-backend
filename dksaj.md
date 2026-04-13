Here's a checklist of everything this SEO report tool checks for:

**On-Page SEO**
- [ ] Title Tag (presence + ideal length: 50–60 characters)
- [ ] Meta Description Tag (presence + ideal length: 120–160 characters)
- [ ] SERP Snippet Preview
- [ ] Hreflang Attributes
- [ ] Language / Lang Attribute
- [ ] H1 Header Tag
- [ ] H2–H6 Header Tags
- [ ] Keyword Consistency across title, meta, and heading tags
- [ ] Amount of Content / Word Count (thin content check)
- [ ] Image Alt Attributes
- [x] Canonical Tag
- [ ] Noindex Tag
- [ ] Noindex Header
- [ ] SSL Enabled
- [ ] HTTPS Redirect
- [ ] Robots.txt file
- [ ] Blocked by Robots.txt
- [ ] llms.txt file
- [ ] XML Sitemap
- [ ] Analytics tool (e.g. Google Analytics)
- [ ] Schema.org Structured Data
- [ ] Identity Schema (Organization/Person)
- [ ] Rendered Content / LLM Readability (rendering percentage)

**Links**
- [ ] Backlink Summary (total backlinks, referring domains, dofollow/nofollow, edu/gov links)
- [ ] Top Backlinks
- [ ] Top Pages by Backlinks
- [ ] Top Anchors / Anchor Text
- [ ] Referring Domain Geographies
- [ ] On-Page Link Structure (internal vs external, nofollow ratio)
- [ ] Friendly / Readable URLs

**Usability**
- [ ] Device Rendering (mobile/tablet/desktop)
- [ ] Google Core Web Vitals
- [ ] Mobile Viewport Meta Tag
- [ ] PageSpeed Insights — Mobile (FCP, Speed Index, LCP, TTI, TBT, CLS)
- [ ] PageSpeed Insights — Desktop
- [ ] Flash Usage
- [ ] iFrames Usage
- [ ] Favicon
- [ ] Email Privacy (plain text emails exposed)
- [ ] Legible Font Sizes
- [ ] Tap Target Sizing

**Performance**
- [ ] Website Load Speed (server response, full load, scripts complete)
- [ ] Page Download Size & Breakdown (HTML, CSS, JS, images)
- [ ] Compression (Gzip/Deflate/Brotli)
- [ ] Resources Breakdown (total objects, JS, CSS, images)
- [ ] Google AMP
- [ ] JavaScript Errors
- [ ] HTTP/2 Protocol Usage
- [ ] Image Optimization
- [ ] JS & CSS Minification
- [ ] Deprecated HTML Tags
- [ ] Inline Styles

**Social**
- [ ] Facebook Page Linked
- [ ] Facebook Open Graph Tags
- [ ] Facebook Pixel
- [ ] X (Twitter) Account Linked
- [ ] X Cards
- [ ] Instagram Linked
- [ ] LinkedIn Linked
- [ ] YouTube Channel Linked & Activity

**Local SEO**
- [ ] Address & Phone on Website
- [ ] Local Business Schema
- [ ] Google Business Profile

**Technology**
- [ ] Technology Stack Identified
- [ ] Server IP Address
- [ ] DNS Servers
- [ ] Web Server
- [ ] Charset
- [ ] DMARC Record
- [ ] SPF Record

That's roughly **70+ individual checks** across 6 categories.

----
## Plan: SEO Checks Implementation Strategy

I've analyzed all 70+ checks from your list against your current backend architecture. Here's how they break down:

**TL;DR:** 33 checks can use already-collected data (quick wins), 20 checks need enhanced crawling, and 17 checks require external APIs (with costs). I recommend a phased rollout starting with the 33 immediate checks.

### The Three Categories

**Category A: Already Collected Data (33 checks)** ✅
Can implement *today* using existing PageData - includes:
- Title tags, meta descriptions, H1-H6 headings, keyword consistency
- Image alt text, canonical tags, noindex detection, SSL
- Core Web Vitals (LCP, CLS, FID), load speed
- Link structure analysis (internal/external ratio)
- Social media detection (Facebook, Twitter, Instagram, LinkedIn, YouTube links + pixel)
- Local SEO (phone/address detection)
- Flash, iFrames, exposed emails, deprecated HTML tags, inline styles

**Category B: Enhanced Crawling (20 checks)** 🔧
Need to *extend the crawler* to collect more data:
- Detailed Schema.org parsing (currently just boolean)
- HTTP headers (X-Robots-Tag, Content-Encoding, Server, compression)
- Site-level files (robots.txt, llms.txt, HTTPS redirect test)
- Open Graph & Twitter Card tags
- Analytics detection (Google Analytics, Tag Manager)
- Page weight/resources breakdown
- JavaScript errors capture
- Favicon, viewport meta tag
- Technology stack detection (Wappalyzer-style)

**Category C: External APIs (17 checks)** 🌐
*Require third-party services:*
- **Backlinks** (5 checks): Moz/Ahrefs/SEMrush - **$99-599/month per API**
- **PageSpeed Insights** (2 checks): Google API - **free (25k/day quota)**
- **DNS & Security** (4 checks): Node.js built-in - **free**
- **YouTube activity** (1 check): YouTube Data API - **free (10k units/day)**
- **Google Business Profile** (1 check): Complex API - **may skip**

---

### Recommended Phases

**Phase 1: Quick Wins (33 checks) — 1-2 weeks**
1. Create analyzer rule classes in `src/services/analyzer/rules/`
2. Implement checks using existing PageData fields
3. Generate issues + passing checks
4. No crawler changes needed

**Phase 2: Enhanced Crawling (20 checks) — 2-3 weeks** *(parallel with Phase 1)*
1. Extend extractPageData.js for new fields
2. Update Prisma schema (add ~15 new fields to SeoPage + site-level fields to AuditReport)
3. Add site-level fetches (robots.txt, llms.txt, HTTPS redirect test)
4. Integrate Wappalyzer for tech stack detection

**Phase 3: External APIs (17 checks) — 2-4 weeks**
1. DNS checks (easy, built-in Node.js)
2. PageSpeed Insights integration (moderate, free but slow)
3. Backlink analysis (hard, requires budget decision)
4. YouTube activity check (moderate, free API)

---

### Relevant Files

**Analyzer Implementation:**
- Create: `src/services/analyzer/rules/` folder for rule classes
- Create: `src/services/analyzer/TechnicalAnalyzer.ts`, `OnPageAnalyzer.ts`, etc. (category analyzers)
- Modify: auditWorker.ts to uncomment analyzer execution

**Crawler Enhancements:**
- Modify: extractPageData.js for additional DOM extraction
- Modify: SiteAuditCrawler.ts for site-level checks (robots.txt, etc.)

**Schema Updates:**
- Modify: schema.prisma - add ~15 fields to SeoPage, ~10 to AuditReport

**New Services:**
- Create: `src/services/backlinks/backlinkService.ts` (if proceeding with paid APIs)
- Create: `src/services/performance/pageSpeedService.ts`
- Create: `src/services/dns/dnsService.ts`
- Create: `src/services/technology/technologyDetector.ts`

---

### Verification

**Phase 1:** Unit tests for each rule + test against known good/bad SEO sites
**Phase 2:** Performance benchmarks (crawl time impact), schema extraction accuracy tests
**Phase 3:** API rate limit testing, cost monitoring, cache validation

---

### Critical Decisions Needed

1. **API Budget:** What's the monthly budget for backlink APIs?
   - **Option A:** Skip backlinks (save $99-599/month per provider)
   - **Option B:** Use free alternatives like OpenPageRank (limited data)
   - **Option C:** Budget for Moz/Ahrefs (comprehensive data)

2. **Performance Threshold:** What's the max acceptable crawl time per page?
   - Current: 2-5 seconds
   - With Category B (all): 5-8 seconds  
   - With PageSpeed API: 10-15 seconds

3. **Feature Tiering:** Should advanced checks be premium-only?
   - Free: Category A (33 checks)
   - Pro: Category A + B (53 checks)
   - Enterprise: All checks (70 checks)

What are your thoughts on these decisions? Should we start with Phase 1 (the 33 immediate checks) or do you want to tackle a different priority?