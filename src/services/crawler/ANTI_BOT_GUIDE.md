# Anti-Bot Detection & Human Behavior Simulation

This guide explains how to avoid bot detection when crawling websites.

## 🎯 Key Anti-Detection Features

### 1. **Browser Fingerprinting Protection**
- Randomized user agents (5+ modern browsers)
- Random viewport sizes (6+ common resolutions)
- Random timezones & locales
- Canvas fingerprinting noise injection
- WebGL vendor/renderer randomization
- Navigator.webdriver override
- Plugin spoofing
- Hardware concurrency randomization

### 2. **Human Behavior Simulation**
- **Mouse movements**: Random cursor movements on page
- **Scrolling**: Realistic scroll patterns (2-4 scrolls per page)
- **Reading delays**: Time spent based on word count (2-5 seconds)
- **Rate limiting**: 2-5 seconds between requests
- **Referer headers**: Proper navigation chain tracking

### 3. **Network-Level Protection**
- Realistic HTTP headers (Accept, Accept-Language, DNT, Sec-Fetch-*)
- Proper referer chains (mimics clicking links)
- Connection keep-alive
- Cookie and localStorage persistence

## 🚀 Usage

### Environment Variables

Add these to your `.env` file:

```bash
# Enable stealth mode (recommended for aggressive anti-bot sites)
STEALTH_MODE=true

# Enable human behavior simulation
HUMAN_BEHAVIOR=true

# Browser pool configuration
BROWSER_COUNT=3
HEADLESS=true
```

### Levels of Protection

#### **Level 1: Basic (Default)**
```bash
# No special config needed - already has:
# - User agent rotation
# - Basic anti-webdriver scripts
```

#### **Level 2: Stealth Mode**
```bash
STEALTH_MODE=true
# Adds:
# - Random viewports, timezones, locales
# - Enhanced fingerprinting protection
# - Realistic headers
```

#### **Level 3: Full Human Simulation**
```bash
STEALTH_MODE=true
HUMAN_BEHAVIOR=true
# Adds:
# - Mouse movements
# - Realistic scrolling
# - Reading delays
# - Rate limiting between pages
```

## 🛡️ What It Protects Against

### ✅ Cloudflare Challenges
- JavaScript challenges
- Browser verification checks
- CAPTCHA triggers (reduces likelihood)

### ✅ Bot Detection Services
- Cloudflare Bot Management
- DataDome
- PerimeterX
- Akamai Bot Manager

### ✅ Fingerprinting Techniques
- Canvas fingerprinting
- WebGL fingerprinting
- Audio fingerprinting (partial)
- Font fingerprinting
- Navigator API fingerprinting

### ⚠️ Limitations
- **Cannot bypass**: Hard CAPTCHAs, IP-based rate limits
- **Slower crawling**: Human simulation adds 2-5 seconds per page
- **Not 100% foolproof**: Advanced bot detection can still detect patterns

## 📊 Performance Impact

| Feature | Time Added (per page) | Detection Risk Reduction |
|---------|----------------------|-------------------------|
| Basic | 0s | Low |
| Stealth Mode | 0-1s | Medium |
| Human Behavior | 2-5s | High |
| Rate Limiting | 2-5s (between pages) | Very High |

**Total crawl time example:**
- 10 pages without simulation: ~30 seconds
- 10 pages with full simulation: ~2-3 minutes

## 🔧 Advanced Configuration

### Custom Rate Limiting

Modify in `SiteAuditCrawler.ts`:

```typescript
constructor() {
  // Adjust min/max delay (in milliseconds)
  this.rateLimiter = new RateLimiter(3000, 7000); // 3-7 seconds
}
```

### Disable Human Behavior for Specific Sites

```typescript
// In crawlPage method, conditionally enable:
if (isAggressiveSite(url)) {
  await simulateHumanInteraction(page, { ... });
}
```

### Session Persistence

For sites that track sessions:

```typescript
import { saveSessionData, restoreSessionData } from './humanBehavior';

// Save after first page
const session = await saveSessionData(page);

// Restore on subsequent pages
await restoreSessionData(page, session);
```

## 🧪 Testing Detection

### Test if you're detected:

```typescript
// Check for Cloudflare block
const response = await page.goto(url);
const html = await page.content();

if (html.includes('Just a moment') || html.includes('Checking your browser')) {
  console.log('❌ Detected by Cloudflare');
} else {
  console.log('✅ Successfully bypassed detection');
}
```

### Test your fingerprint:

Visit these sites in headless mode to check detection:
- https://bot.sannysoft.com/
- https://arh.antoinevastel.com/bots/areyouheadless
- https://pixelscan.net/

## 💡 Best Practices

1. **Always use rate limiting** - Don't crawl too fast
2. **Rotate IPs if possible** - Use proxy rotation for high-volume crawling
3. **Respect robots.txt** - Check allowed paths before crawling
4. **Use realistic user agents** - Keep them updated and matching your Playwright version
5. **Monitor for 403/503 errors** - Signs you're being blocked
6. **Start slow** - Test with 1-2 pages before scaling up
7. **Cache aggressively** - Avoid re-crawling the same content

## 🚨 Troubleshooting

### "Still getting blocked by Cloudflare"
- Enable both `STEALTH_MODE` and `HUMAN_BEHAVIOR`
- Increase rate limiting delays (5-10 seconds)
- Check if your IP is already blocked
- Try residential proxies

### "Crawling is too slow"
- Disable `HUMAN_BEHAVIOR` for trusted sites
- Reduce rate limiting delays
- Increase `BROWSER_COUNT` for parallel crawling
- Use cached data when available

### "Getting inconsistent results"
- Randomization can cause variation
- Save sessions for consistency
- Use fixed user agent for testing

## 📚 Related Files

- `humanBehavior.ts` - Core simulation logic
- `antibot.ts` - Detection utilities
- `BrowserPool.ts` - Browser management with stealth
- `SiteAuditCrawler.ts` - Main crawler with behavior integration

## 🔗 Resources

- [Playwright Stealth Plugin](https://github.com/berstend/puppeteer-extra/tree/master/packages/puppeteer-extra-plugin-stealth)
- [Bot Detection Research](https://antoinevastel.com/bot%20detection/2018/01/17/detect-chrome-headless-v2.html)
- [Cloudflare Bot Management](https://www.cloudflare.com/products/bot-management/)
