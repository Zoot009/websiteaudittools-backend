# AI Chat Assistant - Testing Guide

## Quick Start

The AI chat assistant allows users to ask questions about their SEO audit reports using DeepSeek AI.

## API Endpoints

### 1. Start/Continue Chat Conversation

**Endpoint:** `POST /api/reports/:reportId/chat`

**Request Body:**
```json
{
  "message": "What should I fix first to improve my SEO score?",
  "userId": "user_123",
  "conversationId": "conv_optional_123",
  "stream": true
}
```

**Response (Streaming):**
Server-Sent Events stream with chunks:
```
data: {"chunk":"I recommend"}
data: {"chunk":" starting with"}
data: {"chunk":" the critical issues..."}
data: {"done":true,"conversationId":"conv_123","tokenUsage":{"promptTokens":1500,"completionTokens":300},"cost":0.00042}
```

**Response (Non-Streaming):**
```json
{
  "conversationId": "conv_123",
  "message": "I recommend starting with the critical issues...",
  "tokenUsage": {
    "promptTokens": 1500,
    "completionTokens": 300,
    "totalTokens": 1800
  },
  "cost": 0.00042
}
```

### 2. Get Suggested Questions

**Endpoint:** `GET /api/reports/:reportId/chat/suggestions`

**Response:**
```json
{
  "suggestions": [
    "What should I fix first to improve my SEO score?",
    "Why is my performance score low?",
    "How can I improve my technical SEO?",
    "What are the easiest wins I can implement today?"
  ]
}
```

### 3. Get Conversation Stats

**Endpoint:** `GET /api/chat/conversations/:conversationId`

**Response:**
```json
{
  "reportId": "report_123",
  "userId": "user_123",
  "createdAt": 1704067200000,
  "lastMessageAt": 1704070800000,
  "messageCount": 5,
  "totalTokensUsed": 8000,
  "totalCost": 0.0024,
  "stats": {
    "messageCount": 5,
    "totalTokens": 8000,
    "totalCost": 0.0024,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastMessageAt": "2024-01-01T01:00:00.000Z"
  }
}
```

### 4. Delete Conversation

**Endpoint:** `DELETE /api/chat/conversations/:conversationId`

**Response:**
```json
{
  "message": "Conversation deleted successfully"
}
```

### 5. Get User's Conversations

**Endpoint:** `GET /api/chat/users/:userId/conversations`

**Response:**
```json
{
  "conversations": [
    {
      "conversationId": "conv_123",
      "reportId": "report_123",
      "userId": "user_123",
      "createdAt": 1704067200000,
      "lastMessageAt": 1704070800000,
      "messageCount": 5,
      "totalTokensUsed": 8000,
      "totalCost": 0.0024
    }
  ]
}
```

---

## Testing with cURL

### 1. Start a new conversation (streaming)
```bash
curl -X POST http://localhost:3999/api/reports/YOUR_REPORT_ID/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the most critical SEO issues I should fix?",
    "userId": "user_123",
    "stream": true
  }' \
  --no-buffer
```

### 2. Continue conversation (non-streaming)
```bash
curl -X POST http://localhost:3999/api/reports/YOUR_REPORT_ID/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How do I fix the missing meta descriptions?",
    "userId": "user_123",
    "conversationId": "conv_YOUR_CONVERSATION_ID",
    "stream": false
  }'
```

### 3. Get suggested questions
```bash
curl http://localhost:3999/api/reports/YOUR_REPORT_ID/chat/suggestions
```

### 4. Get conversation stats
```bash
curl http://localhost:3999/api/chat/conversations/conv_YOUR_CONVERSATION_ID
```

---

## Testing with JavaScript/Fetch

### Streaming Chat
```javascript
const reportId = 'your_report_id';
const userId = 'user_123';

const response = await fetch(`http://localhost:3999/api/reports/${reportId}/chat`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: 'What should I fix first?',
    userId,
    stream: true,
  }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      
      if (data.chunk) {
        console.log(data.chunk); // Stream the response
      } else if (data.done) {
        console.log('Conversation ID:', data.conversationId);
        console.log('Cost:', data.cost);
      }
    }
  }
}
```

### Non-Streaming Chat
```javascript
const response = await fetch(`http://localhost:3999/api/reports/${reportId}/chat`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: 'How can I improve my page speed?',
    userId,
    stream: false,
  }),
});

const result = await response.json();
console.log('AI:', result.message);
console.log('Tokens used:', result.tokenUsage.totalTokens);
console.log('Cost: $' + result.cost.toFixed(4));
```

---

## Cost Estimation

**DeepSeek Pricing:**
- Input (cache miss): $0.28 per 1M tokens
- Input (cache hit): $0.028 per 1M tokens (10x cheaper!)
- Output: $0.42 per 1M tokens

**Typical Conversation Costs:**
- First message: ~$0.006 (20K input + 500 output tokens)
- Follow-up messages: ~$0.001 (with caching)
- 100 conversations/day: ~$0.60/day
- 1,000 conversations/day: ~$6/day

---

## Rate Limits

**Default Limits:**
- Max 50 messages per conversation
- Max 100 messages per user per day (free tier)
- Conversations expire after 24 hours

**To Customize:**
Edit `/src/services/ai/conversationMemory.ts`:
```typescript
const MAX_MESSAGES_PER_CONVERSATION = 50;
const dailyLimit = 100; // Adjust per user tier
```

---

## Example Questions Users Can Ask

- "What should I fix first to improve my SEO score?"
- "Why is my performance score low?"
- "How can I improve my technical SEO?"
- "What are the most critical issues I should address?"
- "Can you explain the meta description issues?"
- "How do I improve my page load time?"
- "What are the easiest wins I can implement today?"
- "How does my site compare to SEO best practices?"
- "Which issues will have the biggest impact on rankings?"
- "How long will it take to fix these issues?"

---

## Troubleshooting

### Error: "DEEPSEEK_API_KEY not found"
- Make sure `DEEPSEEK_API_KEY` is set in your `.env` file
- The key is already configured: `sk-aba7a9cbd01f4a2fa626337ce7a21027`

### Error: "Conversation not found"
- Conversations expire after 24 hours in Redis
- Start a new conversation by omitting `conversationId`

### Error: "Daily message limit reached"
- Default limit is 100 messages/day for free tier
- Adjust in `conversationMemory.ts` or implement tier-based limits

### Slow Responses
- First message is slower (cache miss)
- Follow-up messages are faster (cache hit)
- Large reports (100+ pages) use condensed prompts automatically

---

## Next Steps

### Frontend Integration
1. Create a chat UI component
2. Implement Server-Sent Events listener
3. Display streaming responses in real-time
4. Show suggested questions as quick actions
5. Track conversation history

### Production Enhancements
1. Add authentication middleware
2. Implement tier-based rate limiting
3. Store conversations in PostgreSQL for history
4. Add conversation export/sharing features
5. Monitor costs per user tier
6. A/B test with different models (Claude vs DeepSeek)

### Analytics
1. Track popular questions
2. Monitor AI response quality
3. Measure user satisfaction
4. Optimize prompts based on feedback
