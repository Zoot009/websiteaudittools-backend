# API Authentication Guide

This document explains how to secure your Internal Linking Analysis API with authentication.

## Table of Contents
- [Overview](#overview)
- [API Key Authentication](#api-key-authentication)
- [Multiple API Keys](#multiple-api-keys)
- [IP Whitelisting](#ip-whitelisting)
- [Combining Authentication Methods](#combining-authentication-methods)
- [Disabling Authentication](#disabling-authentication)
- [Security Best Practices](#security-best-practices)

## Overview

The API supports multiple authentication methods to secure your endpoints:

1. **API Key Authentication** - Single key for all authenticated users
2. **Multiple API Keys** - Different keys for different users/applications
3. **IP Whitelisting** - Restrict access by IP address
4. **Combined** - Use multiple methods together for enhanced security

## API Key Authentication

### Setup

1. **Set API Key in Environment Variables**
   ```bash
   # .env file
   API_KEY=your_secret_api_key_here
   ```

2. **Generate a Secure API Key**
   ```bash
   # Generate a random secure key (Linux/Mac)
   openssl rand -hex 32
   
   # Or use Node.js
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

### Using the API Key

Clients can provide the API key in three different ways:

#### 1. Authorization Header (Recommended)
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:3000/api/external/analyze?url=https://example.com"
```

#### 2. X-API-Key Header
```bash
curl -H "X-API-Key: YOUR_API_KEY" \
  "http://localhost:3000/api/external/analyze?url=https://example.com"
```

#### 3. Query Parameter (Less secure, not recommended for production)
```bash
curl "http://localhost:3000/api/external/analyze?url=https://example.com&apiKey=YOUR_API_KEY"
```

### Responses

**Successful Authentication:**
```json
{
  "success": true,
  "url": "https://example.com",
  "internalLinks": [...]
}
```

**Missing API Key (401):**
```json
{
  "error": "Authentication required",
  "message": "Please provide an API key",
  "methods": [
    "Header: Authorization: Bearer YOUR_API_KEY",
    "Header: X-API-Key: YOUR_API_KEY",
    "Query: ?apiKey=YOUR_API_KEY"
  ]
}
```

**Invalid API Key (403):**
```json
{
  "error": "Invalid API key",
  "message": "The provided API key is not valid"
}
```

## Multiple API Keys

For organizations that need to issue different keys to different users or applications:

### Setup
```bash
# .env file
API_KEYS=key1_for_user_a,key2_for_user_b,key3_for_app_c
```

### Update Middleware
In `src/index.ts`, replace `requireApiKey` with `requireApiKeyMulti`:
```typescript
import { requireApiKeyMulti } from "./middleware/auth.js";

app.get("/api/external/analyze", requireApiKeyMulti, externalAnalyzeHandler);
app.get("/api/analyze", requireApiKeyMulti, analyzeHandler);
// ... apply to all protected routes
```

### Benefits
- Issue unique keys per user/application
- Revoke individual keys without affecting others
- Track usage per key (requires logging enhancement)
- Rotate keys on a per-user basis

## IP Whitelisting

Restrict API access to specific IP addresses or IP ranges.

### Setup
```bash
# .env file
ALLOWED_IPS=127.0.0.1,192.168.1.*,10.0.0.100
```

### Wildcard Support
- Exact IP: `192.168.1.100`
- IP range: `192.168.1.*` (matches 192.168.1.0 - 192.168.1.255)
- Multiple entries: Comma-separated

### Apply Middleware
```typescript
import { requireWhitelistedIp } from "./middleware/auth.js";

// Apply to specific routes
app.get("/api/external/analyze", requireWhitelistedIp, externalAnalyzeHandler);

// Or apply globally to all routes
app.use(requireWhitelistedIp);
```

### Behind a Proxy
If your API is behind a proxy (e.g., nginx, CloudFlare), ensure the proxy forwards the real client IP:

**Nginx configuration:**
```nginx
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Real-IP $remote_addr;
```

The middleware automatically checks these headers.

## Combining Authentication Methods

Use multiple authentication layers for enhanced security:

```typescript
// Require BOTH valid API key AND whitelisted IP
app.get(
  "/api/external/analyze", 
  requireWhitelistedIp,  // Check IP first
  requireApiKey,         // Then check API key
  externalAnalyzeHandler
);
```

**Example env configuration:**
```bash
API_KEY=your_secret_api_key
ALLOWED_IPS=192.168.1.*,10.0.0.*
```

## Disabling Authentication

### For Development
Leave the environment variables unset or empty:
```bash
# .env file
# API_KEY=    # Empty or commented out
```

The middleware will log a warning and allow all requests:
```
⚠️  Warning: API_KEY not set - authentication is disabled
```

### For Production
**Never run production without authentication!**

To explicitly allow unauthenticated access in production:
1. Remove the middleware from route definitions
2. Add rate limiting (see Rate Limiting section below)
3. Monitor usage carefully

## Security Best Practices

### 1. Use Strong API Keys
```bash
# Good: 64-character hex string
API_KEY=a1b2c3...64chars

# Bad: Short or predictable keys
API_KEY=12345
API_KEY=password
```

### 2. Use HTTPS in Production
API keys transmitted over HTTP can be intercepted. Always use HTTPS:
```bash
https://your-api.com/api/external/analyze
```

### 3. Rotate Keys Regularly
Change API keys periodically (e.g., every 90 days):
```bash
# Generate new key
NEW_KEY=$(openssl rand -hex 32)

# Update env and restart
API_KEY=$NEW_KEY
```

### 4. Use Environment Variables
Never hardcode keys in source code:
```typescript
// ❌ Bad
const API_KEY = "my_secret_key";

// ✅ Good
const API_KEY = process.env.API_KEY;
```

### 5. Add Rate Limiting
Install rate limiting to prevent abuse:
```bash
npm install express-rate-limit
```

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later'
});

// Apply to all routes
app.use('/api/', limiter);
```

### 6. Log Authentication Attempts
Monitor failed authentication attempts:
```typescript
// Enhance middleware to log failures
if (providedKey !== apiKey) {
  console.warn(`Failed auth attempt from IP: ${req.ip}`);
  // Consider implementing automatic IP blocking after X failures
}
```

### 7. Separate Keys for Different Environments
```bash
# .env.development
API_KEY=dev_key_for_testing

# .env.production
API_KEY=prod_key_super_secure_64_chars
```

### 8. Don't Expose Keys in URLs
Avoid query parameters in production logs:
```bash
# Configure nginx to not log query strings containing apiKey
log_format secure '$remote_addr - $remote_user [$time_local] "$request_method $uri" '
                   '$status $body_bytes_sent';
```

### 9. Implement Key Expiration
For enhanced security, implement key expiration:
```typescript
// Store keys with expiration dates
const API_KEYS = {
  'key1': { expires: '2026-12-31', user: 'alice' },
  'key2': { expires: '2026-06-30', user: 'bob' }
};
```

### 10. Monitor API Usage
Track which keys are being used and how often:
```typescript
// Log usage per key
console.log(`API call from key: ${providedKey.substring(0, 8)}...`);
```

## Protected Endpoints

With authentication enabled, the following endpoints are protected:

- `GET /api/external/analyze` - External analysis endpoint
- `GET /api/analyze` - Legacy synchronous analysis
- `POST /api/jobs/submit` - Submit analysis job
- `GET /api/jobs/submit` - Submit job (GET convenience)
- `GET /api/jobs` - List jobs
- `GET /api/jobs/:jobId/status` - Get job status
- `GET /api/jobs/:jobId/result` - Get job results

**Unprotected endpoints:**
- `GET /` - API info
- `GET /health` - Health check

To protect these as well:
```typescript
app.get("/", requireApiKey, (req, res) => { ... });
app.get("/health", requireApiKey, (req, res) => { ... });
```

## Testing Authentication

### Test with Valid API Key
```bash
# Set your API key
API_KEY="your_api_key_here"

# Test external endpoint
curl -H "Authorization: Bearer $API_KEY" \
  "http://localhost:3000/api/external/analyze?url=https://example.com"
```

### Test with Invalid API Key
```bash
curl -H "Authorization: Bearer invalid_key" \
  "http://localhost:3000/api/external/analyze?url=https://example.com"

# Expected: 403 Forbidden
```

### Test without API Key
```bash
curl "http://localhost:3000/api/external/analyze?url=https://example.com"

# Expected: 401 Unauthorized
```

## Troubleshooting

### Authentication Always Passes
**Problem:** No API key required even when `API_KEY` is set.

**Solution:** 
1. Check that `.env` file is loaded: `console.log(process.env.API_KEY)`
2. Restart the server after changing `.env`
3. Verify middleware is applied to routes

### 401 on Valid Requests
**Problem:** Getting 401 even with correct API key.

**Solution:**
1. Check for extra spaces in API key: `API_KEY="  key  "` ❌
2. Verify header format: `Authorization: Bearer YOUR_KEY`
3. Check if key matches exactly (case-sensitive)

### IP Whitelist Not Working Behind Proxy
**Problem:** All requests blocked when using IP whitelist behind proxy.

**Solution:**
Configure proxy to forward real IP:
```nginx
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Real-IP $remote_addr;
```

---

## Quick Start Summary

1. **Generate API key:**
   ```bash
   openssl rand -hex 32
   ```

2. **Add to .env:**
   ```bash
   API_KEY=generated_key_here
   ```

3. **Restart server:**
   ```bash
   npm run dev
   ```

4. **Test with curl:**
   ```bash
   curl -H "Authorization: Bearer YOUR_KEY" \
     "http://localhost:3000/api/external/analyze?url=https://example.com"
   ```

Done! Your API is now secured. 🔒
