#!/bin/bash

# Link Graph Crawler - Manual Test Script (Async Version)
# This script tests the asynchronous POST /api/link-graph/crawl endpoint

API_URL="http://localhost:3000"

echo "🧪 Testing Link Graph Crawler API (Async)"
echo "=========================================="
echo ""

# Test 1: Queue a simple depth-1 crawl
echo "Test 1: Queue depth-1 crawl job (example.com)"
echo "----------------------------------------------"
RESPONSE=$(curl -s -X POST "$API_URL/api/link-graph/crawl" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "depth": 1
  }')
echo "$RESPONSE" | jq '.'

JOB_ID=$(echo "$RESPONSE" | jq -r '.jobId')
echo ""
echo "📋 Job ID: $JOB_ID"
echo ""

if [ "$JOB_ID" != "null" ] && [ ! -z "$JOB_ID" ]; then
  echo "⏳ Waiting 5 seconds for job to process..."
  sleep 5
  
  echo ""
  echo "Test 1b: Check job status"
  echo "-------------------------"
  curl -s "$API_URL/api/link-graph/jobs/$JOB_ID" | jq '.'
  
  echo ""
  echo "Test 1c: Get job result (if completed)"
  echo "--------------------------------------"
  curl -s "$API_URL/api/link-graph/jobs/$JOB_ID/result" | jq '.stats // .'
fi

echo ""
echo ""

# Test 2: Queue depth-2 crawl with tracking stripping
echo "Test 2: Queue depth-2 crawl with tracking parameter removal"
echo "-----------------------------------------------------------"
curl -s -X POST "$API_URL/api/link-graph/crawl" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "depth": 2,
    "options": {
      "stripTracking": true,
      "maxPages": 50
    }
  }' | jq '.'
echo ""
echo ""

# Test 3: Invalid URL (should return 400)
echo "Test 3: Invalid URL format (expect 400 error)"
echo "----------------------------------------------"
curl -s -X POST "$API_URL/api/link-graph/crawl" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "not-a-valid-url",
    "depth": 1
  }' -w "\nHTTP Status: %{http_code}\n" | head -5
echo ""
echo ""

# Test 4: Invalid depth (should return 400)
echo "Test 4: Depth out of range (expect 400 error)"
echo "----------------------------------------------"
curl -s -X POST "$API_URL/api/link-graph/crawl" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "depth": 10
  }' | jq '.error'
echo ""
echo ""

# Test 5: Missing URL (should return 400)
echo "Test 5: Missing URL field (expect 400 error)"
echo "---------------------------------------------"
curl -s -X POST "$API_URL/api/link-graph/crawl" \
  -H "Content-Type: application/json" \
  -d '{
    "depth": 2
  }' | jq '.error'
echo ""
echo ""

# Test 6: Missing depth (should return 400)
echo "Test 6: Missing depth field (expect 400 error)"
echo "-----------------------------------------------"
curl -s -X POST "$API_URL/api/link-graph/crawl" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com"
  }' | jq '.error'
echo ""
echo ""

# Test 7: Check non-existent job (should return 404)
echo "Test 7: Check non-existent job (expect 404)"
echo "--------------------------------------------"
curl -s "$API_URL/api/link-graph/jobs/nonexistent" -w "\nHTTP Status: %{http_code}\n" | head -5
echo ""
echo ""

# Test 8: Queue crawl with orphan detection (sitemap seeding)
echo "Test 8: Queue crawl with orphan detection (seedFromSitemap)"
echo "-----------------------------------------------------------"
ORPHAN_RESPONSE=$(curl -s -X POST "$API_URL/api/link-graph/crawl" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "depth": 2,
    "options": {
      "seedFromSitemap": true,
      "maxPages": 100
    }
  }')
echo "$ORPHAN_RESPONSE" | jq '.'

ORPHAN_JOB_ID=$(echo "$ORPHAN_RESPONSE" | jq -r '.jobId')
echo ""
echo "📋 Job ID: $ORPHAN_JOB_ID"
echo ""

if [ "$ORPHAN_JOB_ID" != "null" ] && [ ! -z "$ORPHAN_JOB_ID" ]; then
  echo "⏳ Waiting 10 seconds for sitemap parsing and crawl..."
  sleep 10
  
  echo ""
  echo "Test 8b: Check orphan detection result"
  echo "--------------------------------------"
  ORPHAN_RESULT=$(curl -s "$API_URL/api/link-graph/jobs/$ORPHAN_JOB_ID/result")
  echo "$ORPHAN_RESULT" | jq '{
    orphan_count: .stats.orphan_pages,
    total_pages: .stats.pages_crawled,
    orphan_urls: .orphans,
    has_orphan_nodes: ([.nodes[] | select(.orphan == true)] | length > 0)
  }'
fi

echo ""
echo ""

echo "✅ Tests completed!"
echo ""
echo "📝 Verification Checklist:"
echo "  [ ] Test 1: Returns 202 status with jobId"
echo "  [ ] Test 1b: Status endpoint returns job state (waiting/active/completed)"
echo "  [ ] Test 1c: Result endpoint returns full graph when completed"
echo "  [ ] Test 2: Job queued with custom options"
echo "  [ ] Test 3-6: All validation errors return 400 status"
echo "  [ ] Test 7: Non-existent job returns 404"
echo "  [ ] Test 8: Orphan detection with sitemap seeding works"
echo "  [ ] Result has nodes and links arrays when completed"
echo "  [ ] Orphan nodes marked with 'orphan: true' flag"
echo "  [ ] All node IDs in links.source/target exist in nodes array"
echo "  [ ] No duplicate edges (same source->target pairs)"
echo "  [ ] All URLs are normalized (lowercase host, no fragments)"
echo ""
echo "💡 Tip: To manually check a job, use:"
echo "   curl $API_URL/api/link-graph/jobs/<jobId>"
echo "   curl $API_URL/api/link-graph/jobs/<jobId>/result"
