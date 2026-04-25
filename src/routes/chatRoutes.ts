/**
 * Chat API Routes
 * 
 * RESTful endpoints for AI-powered SEO audit chat
 */

import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { streamChatResponse, sendChatMessage, validateChatMessage, generateSuggestedQuestions, type ChatResponse } from '../services/ai/chatService.js';
import {
  generateConversationId,
  createConversationMetadata,
  canUserSendMessage,
  incrementDailyMessageCount,
  getConversationMetadata,
  getConversationStats,
  deleteConversation,
  getUserConversations,
} from '../services/ai/conversationMemory.js';
import { SUGGESTED_QUESTIONS } from '../services/ai/promptBuilder.js';

const router = Router();

/**
 * POST /api/reports/:reportId/chat
 * 
 * Start or continue a chat conversation about an audit report
 * Supports streaming responses via Server-Sent Events
 */
router.post('/reports/:reportId/chat', requireAuth, async (req, res) => {
  try {
    const reportId = req.params['reportId'] as string;
    const { message, conversationId, stream = true } = req.body;
    const userId = req.user!.id;
    
    // Validate message
    const validation = validateChatMessage(message);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    
    // Load audit report
    const report = await prisma.auditReport.findUnique({
      where: { id: reportId },
      include: {
        pages: true,
        issues: {
          orderBy: { severity: 'asc' },
        },
        // TODO: Re-enable when recommendations are reimplemented
        // recommendations: {
        //   orderBy: { priority: 'asc' },
        //   include: {
        //     steps: {
        //       orderBy: { stepNumber: 'asc' },
        //     },
        //   },
        // },
      },
    });
    
    if (!report) {
      return res.status(404).json({ error: 'Audit report not found' });
    }

    // Verify the authenticated user owns this report
    if (report.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get or create conversation ID
    let activeConversationId = conversationId;
    if (!activeConversationId) {
      activeConversationId = generateConversationId();
      await createConversationMetadata(activeConversationId, reportId, userId);
    }
    
    // Check rate limiting
    const canSend = await canUserSendMessage(userId, activeConversationId);
    if (!canSend.allowed) {
      return res.status(429).json({ error: canSend.reason });
    }
    
    // Increment daily message count
    await incrementDailyMessageCount(userId);
    
    // Handle streaming response
    if (stream) {
      // Set headers for Server-Sent Events
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      try {
        const generator = streamChatResponse({
          conversationId: activeConversationId,
          message,
          reportData: report,
        });
        
        let finalResult: ChatResponse | undefined;
        
        for await (const chunk of generator) {
          if (typeof chunk === 'string') {
            // Send chunk as SSE event
            res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
          } else {
            // This is the final result
            finalResult = chunk;
          }
        }
        
        // Send completion event
        res.write(`data: ${JSON.stringify({ 
          done: true, 
          conversationId: activeConversationId,
          tokenUsage: finalResult?.tokenUsage,
          cost: finalResult?.cost,
        })}\n\n`);
        
        res.end();
        
      } catch (error: any) {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      }
      
    } else {
      // Non-streaming response
      const response = await sendChatMessage({
        conversationId: activeConversationId,
        message,
        reportData: report,
      });
      
      res.json({
        conversationId: activeConversationId,
        message: response.message,
        tokenUsage: response.tokenUsage,
        cost: response.cost,
      });
    }
    
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat message', details: error.message });
  }
});

/**
 * GET /api/reports/:reportId/chat/suggestions
 * 
 * Get suggested questions for a report
 */
router.get('/reports/:reportId/chat/suggestions', async (req, res) => {
  try {
    const { reportId } = req.params;
    
    const report = await prisma.auditReport.findUnique({
      where: { id: reportId },
      include: {
        issues: true,
      },
    });
    
    if (!report) {
      return res.status(404).json({ error: 'Audit report not found' });
    }
    
    const customSuggestions = generateSuggestedQuestions(report);
    
    res.json({
      suggestions: customSuggestions.length > 0 ? customSuggestions : SUGGESTED_QUESTIONS,
    });
    
  } catch (error: any) {
    console.error('Suggestions error:', error);
    res.status(500).json({ error: 'Failed to generate suggestions', details: error.message });
  }
});

/**
 * GET /api/chat/conversations/:conversationId
 * 
 * Get conversation metadata and stats
 */
router.get('/chat/conversations/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    const metadata = await getConversationMetadata(conversationId);
    if (!metadata) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    const stats = await getConversationStats(conversationId);
    
    res.json({
      ...metadata,
      stats,
    });
    
  } catch (error: any) {
    console.error('Conversation metadata error:', error);
    res.status(500).json({ error: 'Failed to get conversation', details: error.message });
  }
});

/**
 * DELETE /api/chat/conversations/:conversationId
 * 
 * Delete a conversation
 */
router.delete('/chat/conversations/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    await deleteConversation(conversationId);
    
    res.json({ message: 'Conversation deleted successfully' });
    
  } catch (error: any) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Failed to delete conversation', details: error.message });
  }
});

/**
 * GET /api/chat/users/:userId/conversations
 * 
 * Get all conversation IDs for a user
 */
router.get('/chat/users/:userId/conversations', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const conversationIds = await getUserConversations(userId);
    
    // Get metadata for each conversation
    const conversations = await Promise.all(
      conversationIds.map(async (id) => {
        const metadata = await getConversationMetadata(id);
        return metadata ? { conversationId: id, ...metadata } : null;
      })
    );
    
    res.json({
      conversations: conversations.filter(c => c !== null),
    });
    
  } catch (error: any) {
    console.error('User conversations error:', error);
    res.status(500).json({ error: 'Failed to get user conversations', details: error.message });
  }
});

export default router;
