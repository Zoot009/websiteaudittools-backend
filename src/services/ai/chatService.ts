/**
 * AI Chat Service
 * 
 * Handles SEO audit report chat using DeepSeek AI
 */

import { deepseek, DEEPSEEK_MODELS, estimateCost } from '../../config/deepseek.js';
import { buildOptimalSystemPrompt } from './promptBuilder.js';
import {
  saveMessage,
  getFormattedHistory,
  type ConversationMessage,
} from './conversationMemory.js';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export interface ChatRequest {
  conversationId: string;
  message: string;
  reportData: any; // Full audit report from database
}

export interface ChatResponse {
  conversationId: string;
  message: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost?: number;
}

/**
 * Stream chat response from DeepSeek
 */
export async function* streamChatResponse(
  request: ChatRequest
): AsyncGenerator<string, ChatResponse, undefined> {
  const { conversationId, message, reportData } = request;
  
  // Build system prompt from report
  const systemPrompt = buildOptimalSystemPrompt(reportData);
  
  // Get conversation history
  const history = await getFormattedHistory(conversationId, 10); // Last 10 messages
  
  // Build messages array
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: message },
  ];
  
  // Save user message
  await saveMessage(conversationId, {
    role: 'user',
    content: message,
    timestamp: Date.now(),
  });
  
  try {
    // Call DeepSeek API with streaming
    const stream = await deepseek.chat.completions.create({
      model: DEEPSEEK_MODELS.CHAT,
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2000,
      top_p: 0.95,
    });
    
    let fullResponse = '';
    let tokenUsage: any = null;
    
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      
      if (delta?.content) {
        const content = delta.content;
        fullResponse += content;
        yield content; // Stream to client
      }
      
      // Capture usage data (only in last chunk)
      if (chunk.usage) {
        tokenUsage = chunk.usage;
      }
    }
    
    // Save assistant message
    await saveMessage(conversationId, {
      role: 'assistant',
      content: fullResponse,
      timestamp: Date.now(),
      tokenCount: tokenUsage?.completion_tokens,
    });
    
    // Calculate cost
    const cost = tokenUsage
      ? estimateCost(
          tokenUsage.prompt_tokens,
          tokenUsage.completion_tokens,
          false // Cache hit detection would require tracking
        )
      : undefined;
    
    return {
      conversationId,
      message: fullResponse,
      ...(tokenUsage && {
        tokenUsage: {
          promptTokens: tokenUsage.prompt_tokens,
          completionTokens: tokenUsage.completion_tokens,
          totalTokens: tokenUsage.total_tokens,
        },
      }),
      ...(cost !== undefined && { cost }),
    };
    
  } catch (error: any) {
    console.error('DeepSeek API error:', error);
    throw new Error(`AI service error: ${error.message}`);
  }
}

/**
 * Non-streaming chat (for testing or simple use cases)
 */
export async function sendChatMessage(
  request: ChatRequest
): Promise<ChatResponse> {
  const { conversationId, message, reportData } = request;
  
  const systemPrompt = buildOptimalSystemPrompt(reportData);
  const history = await getFormattedHistory(conversationId, 10);
  
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: message },
  ];
  
  // Save user message
  await saveMessage(conversationId, {
    role: 'user',
    content: message,
    timestamp: Date.now(),
  });
  
  try {
    const completion = await deepseek.chat.completions.create({
      model: DEEPSEEK_MODELS.CHAT,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
      top_p: 0.95,
    });
    
    const responseMessage = completion.choices[0]?.message?.content || '';
    
    // Save assistant message
    await saveMessage(conversationId, {
      role: 'assistant',
      content: responseMessage,
      timestamp: Date.now(),
      ...(completion.usage?.completion_tokens && { tokenCount: completion.usage.completion_tokens }),
    });
    
    const cost = completion.usage
      ? estimateCost(
          completion.usage.prompt_tokens,
          completion.usage.completion_tokens,
          false
        )
      : undefined;
    
    return {
      conversationId,
      message: responseMessage,
      ...(completion.usage && {
        tokenUsage: {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens,
        },
      }),
      ...(cost !== undefined && { cost }),
    };
    
  } catch (error: any) {
    console.error('DeepSeek API error:', error);
    throw new Error(`AI service error: ${error.message}`);
  }
}

/**
 * Validate chat message
 */
export function validateChatMessage(message: string): { valid: boolean; error?: string } {
  if (!message || message.trim().length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }
  
  if (message.length > 2000) {
    return { valid: false, error: 'Message too long (max 2000 characters)' };
  }
  
  return { valid: true };
}

/**
 * Generate suggested follow-up questions based on context
 */
export function generateSuggestedQuestions(reportData: any): string[] {
  const suggestions: string[] = [];
  
  // Based on scores
  if (reportData.overallScore < 60) {
    suggestions.push("What are my biggest SEO problems?");
  }
  
  if (reportData.performanceScore < 70) {
    suggestions.push("How can I improve my page speed?");
  }
  
  if (reportData.technicalScore < 70) {
    suggestions.push("What technical SEO issues should I fix first?");
  }
  
  // Based on issues
  const criticalIssues = reportData.issues?.filter((i: any) => i.severity === 'CRITICAL') || [];
  if (criticalIssues.length > 0) {
    suggestions.push("Which critical issues should I prioritize?");
  }
  
  // Generic helpful questions
  suggestions.push("What's the easiest way to improve my SEO score?");
  suggestions.push("How does my site compare to best practices?");
  
  return suggestions.slice(0, 4); // Return top 4
}
