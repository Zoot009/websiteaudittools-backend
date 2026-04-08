#!/bin/bash

# Quick test script for AI Chat
# Usage: ./test-chat.sh

echo "🧪 Testing AI Chat Implementation"
echo "=================================="
echo ""

# Check if server is running
if ! curl -s http://localhost:3999 > /dev/null; then
    echo "❌ Server is not running on port 3999"
    echo "Start it with: npm run dev"
    exit 1
fi

echo "✅ Server is running"
echo ""

# Get a report ID (first completed report)
REPORT_ID=$(curl -s http://localhost:3999/api/reports?limit=1&status=COMPLETED | jq -r '.data[0].id')

if [ "$REPORT_ID" = "null" ] || [ -z "$REPORT_ID" ]; then
    echo "❌ No completed audit reports found"
    echo "Run an audit first: curl -X POST http://localhost:3999/api/audits -H 'Content-Type: application/json' -d '{\"url\":\"https://example.com\",\"userId\":\"test_user\"}'"
    exit 1
fi

echo "✅ Found report: $REPORT_ID"
echo ""

# Test 1: Get suggested questions
echo "📝 Test 1: Get Suggested Questions"
echo "-----------------------------------"
curl -s "http://localhost:3999/api/reports/$REPORT_ID/chat/suggestions" | jq '.'
echo ""
echo ""

# Test 2: Send a chat message (non-streaming)
echo "💬 Test 2: Send Chat Message (Non-Streaming)"
echo "---------------------------------------------"
RESPONSE=$(curl -s -X POST "http://localhost:3999/api/reports/$REPORT_ID/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the top 3 SEO issues I should fix first?",
    "userId": "test_user_123",
    "stream": false
  }')

CONVERSATION_ID=$(echo "$RESPONSE" | jq -r '.conversationId')
MESSAGE=$(echo "$RESPONSE" | jq -r '.message')
TOKENS=$(echo "$RESPONSE" | jq -r '.tokenUsage.totalTokens')
COST=$(echo "$RESPONSE" | jq -r '.cost')

echo "Conversation ID: $CONVERSATION_ID"
echo ""
echo "AI Response:"
echo "$MESSAGE"
echo ""
echo "Tokens Used: $TOKENS"
echo "Cost: \$$COST"
echo ""
echo ""

# Test 3: Follow-up question
echo "💬 Test 3: Follow-up Question"
echo "------------------------------"
FOLLOWUP=$(curl -s -X POST "http://localhost:3999/api/reports/$REPORT_ID/chat" \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"How long will it take to fix these?\",
    \"userId\": \"test_user_123\",
    \"conversationId\": \"$CONVERSATION_ID\",
    \"stream\": false
  }")

FOLLOWUP_MESSAGE=$(echo "$FOLLOWUP" | jq -r '.message')
FOLLOWUP_COST=$(echo "$FOLLOWUP" | jq -r '.cost')

echo "AI Response:"
echo "$FOLLOWUP_MESSAGE"
echo ""
echo "Cost: \$$FOLLOWUP_COST"
echo ""
echo ""

# Test 4: Get conversation stats
echo "📊 Test 4: Get Conversation Stats"
echo "----------------------------------"
curl -s "http://localhost:3999/api/chat/conversations/$CONVERSATION_ID" | jq '.'
echo ""
echo ""

# Test 5: Streaming test
echo "🌊 Test 5: Streaming Response"
echo "-----------------------------"
echo "Sending message..."
curl -s -X POST "http://localhost:3999/api/reports/$REPORT_ID/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Give me a quick summary of my audit.",
    "userId": "test_user_123",
    "stream": true
  }' \
  --no-buffer

echo ""
echo ""
echo "✅ All tests completed!"
