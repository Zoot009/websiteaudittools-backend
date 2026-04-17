# PageSpeed Insights Integration

Google PageSpeed Insights integration for comprehensive performance analysis including Core Web Vitals, Lighthouse metrics, and optimization opportunities.

## Overview

The PageSpeed Insights integration provides:
- **Performance Scores** (0-100) for mobile and desktop
- **Core Web Vitals** (real user metrics from Chrome UX Report)
  - LCP (Largest Contentful Paint)
  - FID (First Input Delay) / INP (Interaction to Next Paint)
  - CLS (Cumulative Layout Shift)
- **Lighthouse Lab Metrics**
  - FCP (First Contentful Paint)
  - Speed Index
  - TTI (Time to Interactive)
  - TBT (Total Blocking Time)
- **Performance Opportunities** with estimated time savings
- **Diagnostics** for detailed insights

## Setup

### 1. Get API Key

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **PageSpeed Insights API**
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. (Optional but recommended) Restrict the key to PageSpeed Insights API only

### 2. Configure Environment

Add your API key to `.env`:

```bash
GOOGLE_PAGESPEED_API_KEY=your_api_key_here
```

### 3. Verify Setup

Test the integration:

```bash
ts-node src/services/performance/test-pagespeed.ts https://example.com
```

## API Limits

- **Free Tier**: 25,000 requests per day
- **Quota Reset**: Daily at midnight Pacific Time
- **Rate Limit**: No official limit, but recommended to stay under 10 requests/second

### Quota Management

For audit runs:
- **Single page mode**: 2 API calls (mobile + desktop)
- **Multi-page mode**: Only homepage is analyzed (to conserve quota)

With 25,000 daily requests, you can analyze:
- ~12,500 sites per day in single mode
- No additional quota needed for multi-page crawls

## Architecture

### Service Layer

**File**: `src/services/performance/pageSpeedService.ts`

```typescript
import { pageSpeedService } from './services/performance/pageSpeedService.js';

// Analyze a URL
const result = await pageSpeedService.analyze('https://example.com', {
  mobile: true,
  desktop: true,
});

// Check configuration
const isConfigured = pageSpeedService.isConfigured();
```

### Data Flow

```
Audit Worker
    ↓
SiteAuditCrawler.crawl()
    ↓
[Crawl pages]
    ↓
PageSpeedService.analyze() ← Called for homepage only
    ↓
[Attach pageSpeed data to PageData]
    ↓
SeoAnalyzer.analyze()
    ↓
[PageSpeedMobileRule + PageSpeedDesktopRule]
    ↓
[Generate issues/passing checks]
```

### Integration Points

1. **Audit Worker** (`auditWorker.ts`)
   - Calls PageSpeed API after crawling
   - Attaches results to homepage PageData
   - Continues gracefully if API fails

2. **PageData Interface** (added field)
   ```typescript
   pageSpeed?: {
     mobile?: PageSpeedMetrics;
     desktop?: PageSpeedMetrics;
     error?: string;
   }
   ```

3. **Analysis Rules**
   - `PageSpeedMobileRule` - Mobile performance + Core Web Vitals
   - `PageSpeedDesktopRule` - Desktop performance metrics

## Rules & Scoring

### PageSpeedMobileRule

**Category**: Performance  
**Code**: `PAGESPEED_MOBILE`  
**Level**: Page

Checks:
- **Performance Score**
  - < 50: CRITICAL (score 95)
  - 50-89: HIGH (score 75)
  - 90+: Passing check
- **Core Web Vitals (Field Data)**
  - LCP: SLOW/AVERAGE/FAST
  - FID/INP: SLOW/AVERAGE/FAST
  - CLS: SLOW (poor)/AVERAGE/FAST (good)
- **Optimization Opportunities**
  - Reports top 3 if savings > 1 second

### PageSpeedDesktopRule

**Category**: Performance  
**Code**: `PAGESPEED_DESKTOP`  
**Level**: Page

Checks:
- **Performance Score**
  - < 50: HIGH (score 75)
  - 50-89: MEDIUM (score 55)
  - 90+: Passing check
- **Lab Metrics Thresholds**
  - FCP > 3s: Slow
  - LCP > 2.5s: Slow
  - TBT > 600ms: High blocking time
  - CLS > 0.1: Poor layout stability

## Issue Examples

### Mobile Performance Issues

```typescript
{
  type: 'pagespeed_mobile_score_poor',
  category: 'PERFORMANCE',
  title: 'Poor Mobile Performance Score',
  description: 'Mobile performance score is 42/100...',
  severity: 'CRITICAL',
  impactScore: 95,
  pageUrl: 'https://example.com'
}

{
  type: 'core_web_vitals_lcp_slow',
  category: 'PERFORMANCE',
  title: 'Slow Largest Contentful Paint (LCP)',
  description: 'Mobile LCP is 4200ms (slow). LCP measures...',
  severity: 'CRITICAL',
  impactScore: 90,
  pageUrl: 'https://example.com'
}
```

### Passing Checks

```typescript
{
  category: 'PERFORMANCE',
  code: 'pagespeed_mobile_score_good',
  title: 'Excellent Mobile Performance Score',
  description: 'Mobile performance score is 96/100...',
  pageUrl: 'https://example.com',
  goodPractice: 'Meets best practice standards'
}
```

## Testing

### Test Single URL

```bash
ts-node src/services/performance/test-pagespeed.ts https://example.com
```

### Test in Audit Flow

Run a full audit to see PageSpeed integrated:

```bash
# Add test code to trigger audit or use API
curl -X POST http://localhost:3000/api/audit \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "mode": "single"
  }'
```

### Expected Output

```
🧪 Testing PageSpeed Insights for: https://example.com

📊 API Status: ✅ Configured
📊 PageSpeed Insights API: 25,000 requests/day (free tier)

⏳ Fetching PageSpeed data (this may take 30-60 seconds)...

📱 MOBILE RESULTS
============================================================
Performance Score: 78/100

📊 Field Data (Real User Metrics from CrUX):
  FCP: 1823ms (FAST)
  LCP: 2941ms (AVERAGE)
  CLS: 0.082 (FAST)

🔬 Lab Data (Lighthouse Metrics):
  FCP: 1.8s
  Speed Index: 3.2s
  LCP: 2.9s
  TTI: 4.1s
  TBT: 320ms
  CLS: 0.082

💡 Top Performance Opportunities:
  1. Eliminate render-blocking resources (save 1.2s)
  2. Properly size images (save 0.8s)
  3. Remove unused JavaScript (save 0.6s)

💻 DESKTOP RESULTS
============================================================
Performance Score: 95/100
...
```

## Error Handling

### API Key Missing

```
ℹ️  PageSpeed Insights skipped (no API key configured)
```

The audit continues without PageSpeed data. No issues created for missing PageSpeed checks.

### API Errors

```bash
# Rate Limit (429)
⚠️  PageSpeed Insights failed: PageSpeed API rate limit exceeded.

# Invalid URL (400)
⚠️  PageSpeed Insights failed: Invalid URL or API request

# Network Error
⚠️  PageSpeed Insights failed: Request timeout
```

All errors are logged but don't fail the audit. The audit continues with other checks.

### Graceful Degradation

```typescript
if (!pageSpeedService.isConfigured()) {
  console.log('PageSpeed skipped - no API key');
  return { issues: [], passingChecks: [] };
}
```

Rules return empty arrays if PageSpeed data is unavailable.

## Performance Considerations

### API Call Timing

- Average response time: **30-60 seconds**
- Runs in parallel for mobile + desktop
- Only called for homepage (conserves quota)

### Workflow Impact

```
Total Audit Time = Crawl + PageSpeed + Analysis

Single page:  2-5s   + 30-60s + 1-2s   = 33-67s
Multi-page:   10-30s + 30-60s + 2-5s   = 42-95s
```

PageSpeed is the slowest component but provides critical Core Web Vitals data.

### Optimization Strategies

1. **Cache Results**: Consider caching PageSpeed data for 24 hours
2. **Background Processing**: Queue PageSpeed calls separately
3. **Selective Analysis**: Only run for homepage or important pages
4. **Progressive Enhancement**: Display audit results while PageSpeed is loading

## Troubleshooting

### "API key not found"

**Cause**: Missing or incorrect environment variable  
**Fix**:
```bash
# Check .env file
cat .env | grep GOOGLE_PAGESPEED_API_KEY

# Restart server after adding key
```

### "Rate limit exceeded"

**Cause**: Over 25,000 requests in 24 hours  
**Fix**:
- Wait for quota reset (midnight PT)
- Implement request throttling
- Use paid tier for higher limits

### "Field data not available"

**Cause**: URL doesn't have enough real user traffic in Chrome UX Report  
**Effect**: Only Lab Data (Lighthouse) is available  
**Solution**: This is normal for low-traffic sites

### PageSpeed data not appearing in results

**Check**:
1. API key configured: `pageSpeedService.isConfigured()`
2. Homepage detection working
3. No errors in logs
4. Rules registered in SeoAnalyzer

## API Documentation

Official Google PageSpeed Insights API v5:
- [Get Started](https://developers.google.com/speed/docs/insights/v5/get-started)
- [API Reference](https://developers.google.com/speed/docs/insights/v5/reference/pagespeedapi/runpagespeed)
- [Lighthouse Metrics](https://developer.chrome.com/docs/lighthouse/performance/)
- [Core Web Vitals](https://web.dev/vitals/)

## Future Enhancements

### Already Implemented ✅
- Mobile + Desktop analysis
- Core Web Vitals (LCP, FID/INP, CLS)
- Performance scoring
- Opportunities extraction
- Graceful error handling

### Potential Additions
- [ ] Cache PageSpeed results (24h TTL)
- [ ] Historical trend tracking
- [ ] Compare before/after scores
- [ ] Multi-page PageSpeed (with quota management)
- [ ] Screenshot capture from Lighthouse
- [ ] Accessibility score integration
- [ ] Best practices score
- [ ] SEO score from Lighthouse
- [ ] PWA checks

## Summary

**Status**: ✅ Fully Implemented  
**Files**: 4 new/modified files  
**Rules**: 2 new rules (46 total)  
**Priority**: 🔴 CRITICAL (Core Web Vitals ranking factor)  
**Impact**: Major - Core Web Vitals directly affect rankings  
**Cost**: Free (25k requests/day)  
**Completion**: 46/70 checks (66%)
