# Screenshot Service

## Overview
The screenshot service provides on-demand website screenshots for both desktop and mobile views. This is designed to be lightweight and separate from the main audit process.

## Architecture Decision

**Why separate endpoint instead of including in audit?**
- ✅ Faster audits (screenshots take 2-4 seconds each)
- ✅ Lower memory usage (base64 images are large)
- ✅ On-demand loading (frontend can lazy load)
- ✅ Fresh screenshots anytime without re-running audit
- ✅ Better error handling (screenshot failures don't fail entire audit)

## API Endpoint

### POST `/api/screenshots`

Captures both desktop and mobile screenshots of a URL.

**Request:**
```json
{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "url": "https://example.com",
  "screenshots": {
    "desktop": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    "mobile": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  },
  "timestamp": "2026-04-06T10:30:00.000Z"
}
```

**Error Response:**
```json
{
  "error": "Failed to capture screenshots",
  "details": "Navigation timeout exceeded"
}
```

## Screenshot Specifications

### Desktop View
- **Viewport:** 1920x1080 (16:9 widescreen)
- **Format:** JPEG (quality: 85%)
- **Capture:** Viewport only (above the fold)
- **User Agent:** Randomized Chrome Desktop
- **Anti-Bot:** Full stealth mode with script injection

### Mobile View
- **Viewport:** 375x667 (iPhone 6/7/8)
- **Format:** JPEG (quality: 85%)
- **Capture:** Viewport only (no overflow)
- **User Agent:** Mobile Safari (iOS 16)
- **Touch:** Enabled
- **Anti-Bot:** Full stealth mode with script injection

## Frontend Usage Example

```javascript
// Lazy load screenshots when user clicks "View Screenshots" button
async function loadScreenshots(url) {
  try {
    const response = await fetch('http://localhost:3000/api/screenshots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    
    const data = await response.json();
    
    // Display images
    document.getElementById('desktop-img').src = 
      `data:image/jpeg;base64,${data.screenshots.desktop}`;
    document.getElementById('mobile-img').src = 
      `data:image/jpeg;base64,${data.screenshots.mobile}`;
      
  } catch (error) {
    console.error('Failed to load screenshots:', error);
  }
}
```

## Performance

- **Typical duration:** 3-5 seconds
- **Parallel capture:** Desktop and mobile are captured simultaneously
- **Timeout:** 20 seconds max per screenshot
- **Memory:** ~1-3MB per screenshot (base64 encoded)
- **Anti-bot overhead:** +1-2 seconds for stealth initialization

## Anti-Bot Features

✅ **Implemented:**
- Randomized user agents and browser fingerprints
- Anti-detection script injection (removes `navigator.webdriver`)
- Realistic timezone and locale randomization
- Custom HTTP headers mimicking real browsers
- Viewport-only capture (avoids suspicious scrolling)

✅ **Bypasses:**
- Basic bot detection systems
- JavaScript-based detection
- Browser fingerprinting checks
- Most Cloudflare protection (non-challenge pages)

⚠️ **Limitations:**
- Interactive Cloudflare challenges (CAPTCHA) may still block
- Sites with advanced behavioral analysis may detect
- Limited to publicly accessible URLs
- No authentication/cookies support (can be added if needed)

## Future Enhancements

- [ ] Add viewport size options
- [ ] Support custom viewport dimensions
- [ ] Add screenshot caching with TTL
- [ ] Support authenticated pages (cookie/header passing)
- [ ] Add PDF export option
- [ ] Thumbnail generation (smaller preview images)
