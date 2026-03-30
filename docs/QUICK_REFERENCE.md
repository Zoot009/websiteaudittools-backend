# 🤖 Human Behavior Simulation - Quick Reference

## ⚡ Quick Start

```bash
# 1. Configure environment
echo "STEALTH_MODE=true" >> .env
echo "HUMAN_BEHAVIOR=true" >> .env

# 2. Test it works
npx tsx src/services/crawler/test-comparison.ts

# 3. Use in your app (automatic)
# Just crawl normally - features activate based on .env
```

## 🎚️ Configuration Levels

```bash
# Level 1: Basic (No config) - Fast, Medium Detection Risk
# (Default - no changes needed)

# Level 2: Stealth - Normal Speed, Low Risk
STEALTH_MODE=true

# Level 3: Full Human - Slow, Very Low Risk
STEALTH_MODE=true
HUMAN_BEHAVIOR=true
```

## 📋 Features Matrix

| Feature | Basic | Stealth | Full Human |
|---------|-------|---------|------------|
| Random User Agent | ✅ | ✅ | ✅ |
| Hide Webdriver Flag | ❌ | ✅ | ✅ |
| Random Viewport | ❌ | ✅ | ✅ |
| Realistic Headers | ❌ | ✅ | ✅ |
| Fingerprint Protection | ❌ | ✅ | ✅ |
| Mouse Movement | ❌ | ❌ | ✅ |
| Page Scrolling | ❌ | ❌ | ✅ |
| Reading Delays | ❌ | ❌ | ✅ |
| Rate Limiting | ❌ | ❌ | ✅ |

## ⏱️ Time Impact

```
10 pages:
• Basic:       ~30 seconds
• Stealth:     ~35 seconds  (+17%)
• Full Human:  ~2-3 minutes (+400%)

100 pages:
• Basic:       ~5 minutes
• Stealth:     ~6 minutes   (+20%)
• Full Human:  ~30-40 min   (+700%)
```

## 🎯 When to Use What

```typescript
// Trusted sites (your own, partners)
// → Use Basic (default)

// Sites with basic protection
STEALTH_MODE=true

// Cloudflare, aggressive bot detection
STEALTH_MODE=true
HUMAN_BEHAVIOR=true
```

## 🧪 Testing Commands

```bash
# Run full comparison test
npx tsx src/services/crawler/test-comparison.ts

# Test specific site
npx tsx src/services/crawler/test-comparison.ts https://example.com

# Test human behavior features
npx tsx src/services/crawler/test-human-behavior.ts

# Check your fingerprint
# Visit in headless mode: https://bot.sannysoft.com/
```

## 🚨 Quick Troubleshooting

```bash
# Problem: Still getting blocked
# Solution:
STEALTH_MODE=true
HUMAN_BEHAVIOR=true
# + Use residential proxy

# Problem: Too slow
# Solution:
HUMAN_BEHAVIOR=false  # Keep stealth only
# + Increase BROWSER_COUNT=5
# + Use cached data aggressively

# Problem: Can't access .env
# Solution:
# Pass options directly:
export STEALTH_MODE=true
export HUMAN_BEHAVIOR=true
```

## 🔧 Advanced: Programmatic Control

```typescript
// Override env vars per crawl
process.env.STEALTH_MODE = 'true';
process.env.HUMAN_BEHAVIOR = 'true';

const crawler = new SiteAuditCrawler();
await crawler.crawl(url, { mode: 'single' });
```

## 📊 Detection Check

```typescript
// After crawling, check response
if (page.html.includes('Just a moment') || 
    page.html.includes('Checking your browser')) {
  console.log('❌ Challenge detected - enable stealth!');
}
```

## 💡 Pro Tips

1. **Start conservative**: Test with stealth only first
2. **Cache aggressively**: Re-use crawled data (7-day TTL)
3. **Monitor errors**: Watch for 403/503 codes
4. **Rate limit globally**: Don't hammer the same domain
5. **Rotate IPs**: Use proxies for production scale

## 🔗 Key Files

```
humanBehavior.ts      - Core simulation logic
BrowserPool.ts        - Browser setup with stealth
SiteAuditCrawler.ts   - Main crawler (auto-enabled)
crawlCache.ts         - Caching (reduces recrawls)
antibot.ts            - Detection utilities
```

## 📚 Documentation

- Full guide: `ANTI_BOT_GUIDE.md`
- Summary: `HUMAN_BEHAVIOR_SUMMARY.md`
- This file: `QUICK_REFERENCE.md`

## ⚙️ Environment Variables

```bash
STEALTH_MODE=true       # Enable fingerprint protection
HUMAN_BEHAVIOR=true     # Enable behavior simulation
BROWSER_COUNT=3         # Concurrent browsers
HEADLESS=true           # Hide browser UI
```

## 🎓 Learn More

```bash
# Read the full guide
cat src/services/crawler/ANTI_BOT_GUIDE.md

# See implementation summary
cat HUMAN_BEHAVIOR_SUMMARY.md

# Check examples
ls src/services/crawler/test-*.ts
```

---

**TL;DR**: Add these to `.env` and you're protected:
```bash
STEALTH_MODE=true
HUMAN_BEHAVIOR=true
```

**Cost**: Crawling becomes ~4x slower but much more reliable.
