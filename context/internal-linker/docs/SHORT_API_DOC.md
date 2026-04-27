# Testing API Endpoints in Postman

Quick guide to test the Internal Linking Analysis API using Postman.

## Setup

### 1. Configure Base URL
- Set a collection variable: `base_url` = `http://localhost:3000`
- Use `{{base_url}}` in all requests

### 2. Configure Authentication

**Method A: Collection-level (recommended)**
1. Open your Postman collection settings
2. Go to **Authorization** tab
3. Select **Type**: `Bearer Token`
4. Enter your API key in the **Token** field
5. All requests inherit this authentication

**Method B: Environment Variable**
1. Create a variable: `api_key` = `your_api_key_here`
2. In each request, set Authorization header:
   - Header: `Authorization`
   - Value: `Bearer {{api_key}}`

**Method C: Per Request**
- Header: `X-API-Key` = `your_api_key_here`

---

## Testing Endpoints

### 1. Health Check (No Auth Required)

**Request:**
```
GET {{base_url}}/health
```

**Expected Response:** `200 OK`
```json
{
  "status": "healthy",
  "timestamp": "2026-04-16T10:30:00.000Z",
  "redis": true,
  "database": true
}
```

---

### 2. Submit Crawl Job

**Request:**
```
POST {{base_url}}/api/jobs/submit
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "url": "https://example.com"
}
```

**Optional Parameters:**
```json
{
  "url": "https://example.com",
  "useCredits": 150,
  "forceRefresh": true
}
```

**Expected Response:** `200 OK`
```json
{
  "jobId": "crawl-1776344473487-7m8fkm",
  "status": "waiting",
  "message": "Job queued successfully"
}
```

**Save jobId** for subsequent requests (Tests tab):
```javascript
pm.test("Job created", function() {
    pm.response.to.have.status(200);
    const jsonData = pm.response.json();
    pm.collectionVariables.set("jobId", jsonData.jobId);
});
```

---

### 3. Check Job Status

**Request:**
```
GET {{base_url}}/api/jobs/{{jobId}}/status
```

**Expected Response:** `200 OK`
```json
{
  "jobId": "crawl-1776344473487-7m8fkm",
  "status": "active",
  "progress": 45,
  "data": {
    "progress": 45,
    "stage": "crawling",
    "pagesAnalyzed": 45,
    "creditsUsed": 45
  }
}
```

**Status Values:**
- `waiting` - Job queued
- `active` - Currently processing
- `completed` - Finished successfully
- `failed` - Job failed

---

### 4. Get Job Results

**Request:**
```
GET {{base_url}}/api/jobs/{{jobId}}/result
```

**Wait until status is `completed`** before calling this.

**Expected Response:** `200 OK`
```json
{
  "url": "https://example.com",
  "linkGraph": [
    {
      "source": "https://example.com/page1",
      "target": "https://example.com/page2",
      "anchorText": "Click here"
    }
  ],
  "orphanPages": [
    "https://example.com/orphan-page"
  ],
  "crawlMetadata": {
    "totalPages": 150,
    "creditsUsed": 150,
    "startTime": "2026-04-16T10:30:00.000Z",
    "endTime": "2026-04-16T10:35:00.000Z"
  }
}
```

---

### 5. List All Jobs

**Request:**
```
GET {{base_url}}/api/jobs
```

**Query Parameters (optional):**
- `status` - Filter by status: `waiting`, `active`, `completed`, `failed`
- `limit` - Max results (default: 50)

**Examples:**
```
GET {{base_url}}/api/jobs?status=completed
GET {{base_url}}/api/jobs?status=failed&limit=10
```

**Expected Response:** `200 OK`
```json
{
  "jobs": [
    {
      "id": "crawl-1776344473487-7m8fkm",
      "status": "completed",
      "progress": 100,
      "timestamp": "2026-04-16T10:30:00.000Z"
    }
  ]
}
```

---

### 6. External Analysis (Legacy, No Database)

**Request:**
```
GET {{base_url}}/api/external/analyze?url=https://example.com
```

**Query Parameters:**
- `url` (required) - Target website URL
- `useCredits` (optional) - Credits to use (default: 100)
- `forceRefresh` (optional) - Skip cache: `true` or `false`

**Example with all parameters:**
```
GET {{base_url}}/api/external/analyze?url=https://example.com&useCredits=200&forceRefresh=true
```

**Expected Response:** `200 OK` (similar to job result)

---

## Testing Workflow

### Automated Test Collection

Create a collection with this sequence:

1. **Submit Job** → Save `jobId` to variable
2. **Poll Status** (repeat every 5s) → Check if `status === "completed"`
3. **Get Results** → Validate response structure

**Use Postman's "Run Collection" feature:**
- Set delays between requests (5000ms)
- Add iterations for polling
- View test results

### Sample Tests Script

Add to **Tests** tab of "Check Job Status" request:

```javascript
pm.test("Status is valid", function() {
    const status = pm.response.json().status;
    pm.expect(["waiting", "active", "completed", "failed"]).to.include(status);
});

// Auto-retry if not completed
if (pm.response.json().status === "active" || pm.response.json().status === "waiting") {
    setTimeout(function() {}, 5000); // Wait 5 seconds
}
```

---

## Common Issues

### 401 Unauthorized
- **Cause:** Missing or incorrect API key
- **Fix:** Check Authorization header contains `Bearer YOUR_API_KEY`

### 404 Not Found
- **Cause:** Invalid jobId or URL path
- **Fix:** Verify `{{jobId}}` variable is set correctly

### 422 Unprocessable Entity
- **Cause:** Invalid URL format
- **Fix:** Ensure URL includes protocol (`https://`)

### 500 Internal Server Error
- **Cause:** Server error (check logs)
- **Fix:** Verify Redis and database are running

---

## Tips

1. **Use Pre-request Scripts** to generate timestamps or tokens
2. **Use Tests** to validate responses and set variables automatically
3. **Use Environments** to switch between dev/staging/production
4. **Save Examples** of successful responses for documentation
5. **Use Monitors** to schedule automatic API health checks

---

## Quick Reference

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/health` | GET | No | Check API health |
| `/api/jobs/submit` | POST | Yes | Start new crawl |
| `/api/jobs/:jobId/status` | GET | Yes | Check progress |
| `/api/jobs/:jobId/result` | GET | Yes | Get results |
| `/api/jobs` | GET | Yes | List all jobs |
| `/api/external/analyze` | GET | Yes | One-time analysis |

---

**Need more details?** See [API_DOC.md](./API_DOC.md) for complete API specification.
