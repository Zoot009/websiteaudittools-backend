/**
 * Test AI Chat Service
 * 
 * Simple test to verify the chat implementation works
 * Run: npx tsx src/services/ai/test-chat.ts
 */

import { prisma } from '../../lib/prisma.js';
import { sendChatMessage } from './chatService.js';
import { generateConversationId, createConversationMetadata } from './conversationMemory.js';

async function testChat() {
  console.log('🧪 Testing AI Chat Service\n');
  
  try {
    // 1. Find a completed audit report
    console.log('📊 Finding a completed audit report...');
    const report = await prisma.auditReport.findFirst({
      where: { status: 'COMPLETED' },
      include: {
        pages: true,
        issues: {
          orderBy: { severity: 'asc' },
        },
        recommendations: {
          orderBy: { priority: 'asc' },
          include: {
            steps: {
              orderBy: { stepNumber: 'asc' },
            },
          },
        },
      },
    });
    
    if (!report) {
      console.error('❌ No completed audit reports found. Run an audit first.');
      process.exit(1);
    }
    
    console.log(`✅ Found report for: ${report.url}`);
    console.log(`   Overall Score: ${report.overallScore}/100`);
    console.log(`   Issues: ${report.issues.length}`);
    console.log(`   Recommendations: ${report.recommendations.length}\n`);
    
    // 2. Create a conversation
    console.log('💬 Creating conversation...');
    const conversationId = generateConversationId();
    await createConversationMetadata(conversationId, report.id, 'test_user_123');
    console.log(`✅ Conversation ID: ${conversationId}\n`);
    
    // 3. Send a test message
    const testMessage = "What are the top 3 SEO issues I should fix first?";
    console.log(`📝 Sending message: "${testMessage}"\n`);
    console.log('🤖 AI Response:');
    console.log('─'.repeat(60));
    
    const response = await sendChatMessage({
      conversationId,
      message: testMessage,
      reportData: report,
    });
    
    console.log(response.message);
    console.log('─'.repeat(60));
    console.log('');
    
    // 4. Show usage stats
    if (response.tokenUsage) {
      console.log('📊 Token Usage:');
      console.log(`   Prompt tokens: ${response.tokenUsage.promptTokens.toLocaleString()}`);
      console.log(`   Completion tokens: ${response.tokenUsage.completionTokens.toLocaleString()}`);
      console.log(`   Total tokens: ${response.tokenUsage.totalTokens.toLocaleString()}`);
    }
    
    if (response.cost) {
      console.log(`   Cost: $${response.cost.toFixed(4)}`);
    }
    
    console.log('');
    
    // 5. Follow-up question
    const followUpMessage = "How long will it take to implement these fixes?";
    console.log(`📝 Follow-up: "${followUpMessage}"\n`);
    console.log('🤖 AI Response:');
    console.log('─'.repeat(60));
    
    const followUpResponse = await sendChatMessage({
      conversationId,
      message: followUpMessage,
      reportData: report,
    });
    
    console.log(followUpResponse.message);
    console.log('─'.repeat(60));
    console.log('');
    
    if (followUpResponse.tokenUsage && followUpResponse.cost) {
      console.log('📊 Follow-up Stats:');
      console.log(`   Total tokens: ${followUpResponse.tokenUsage.totalTokens.toLocaleString()}`);
      console.log(`   Cost: $${followUpResponse.cost.toFixed(4)}`);
    }
    
    console.log('\n✅ Test completed successfully!\n');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('API Error:', error.response.data);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testChat()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
