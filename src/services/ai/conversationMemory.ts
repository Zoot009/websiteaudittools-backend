/**
 * Conversation Memory Service
 * 
 * Manages chat conversation history using Redis for fast access
 */

import { redis } from '../../config/redis.js';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  tokenCount?: number;
}

export interface ConversationMetadata {
  reportId: string;
  userId: string;
  createdAt: number;
  lastMessageAt: number;
  messageCount: number;
  totalTokensUsed: number;
  totalCost: number;
}

const CONVERSATION_TTL = 86400; // 24 hours
const MAX_MESSAGES_PER_CONVERSATION = 50; // Limit to prevent abuse
const CONVERSATION_PREFIX = 'chat:conversation:';
const METADATA_PREFIX = 'chat:metadata:';
const USER_CONVERSATIONS_PREFIX = 'chat:user:';

/**
 * Generate a unique conversation ID
 */
export function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Save a message to conversation history
 */
export async function saveMessage(
  conversationId: string,
  message: ConversationMessage
): Promise<void> {
  const key = `${CONVERSATION_PREFIX}${conversationId}`;
  
  // Add message to list
  await redis.rpush(key, JSON.stringify(message));
  
  // Set expiry
  await redis.expire(key, CONVERSATION_TTL);
  
  // Update metadata
  await updateMetadata(conversationId, {
    lastMessageAt: message.timestamp,
    messageCount: 1, // Will be incremented
    tokenCount: message.tokenCount || 0,
  });
}

/**
 * Get conversation history
 */
export async function getConversationHistory(
  conversationId: string,
  limit: number = 20
): Promise<ConversationMessage[]> {
  const key = `${CONVERSATION_PREFIX}${conversationId}`;
  
  // Get last N messages
  const messages = await redis.lrange(key, -limit, -1);
  
  return messages.map((msg: string) => JSON.parse(msg));
}

/**
 * Get conversation history formatted for OpenAI API
 */
export async function getFormattedHistory(
  conversationId: string,
  limit: number = 20
): Promise<ChatCompletionMessageParam[]> {
  const history = await getConversationHistory(conversationId, limit);
  
  return history
    .filter(msg => msg.role !== 'system') // Don't include system prompts in history
    .map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
}

/**
 * Create conversation metadata
 */
export async function createConversationMetadata(
  conversationId: string,
  reportId: string,
  userId: string
): Promise<void> {
  const metadata: ConversationMetadata = {
    reportId,
    userId,
    createdAt: Date.now(),
    lastMessageAt: Date.now(),
    messageCount: 0,
    totalTokensUsed: 0,
    totalCost: 0,
  };
  
  const key = `${METADATA_PREFIX}${conversationId}`;
  await redis.set(key, JSON.stringify(metadata), 'EX', CONVERSATION_TTL);
  
  // Add to user's conversation list
  const userKey = `${USER_CONVERSATIONS_PREFIX}${userId}`;
  await redis.sadd(userKey, conversationId);
  await redis.expire(userKey, CONVERSATION_TTL);
}

/**
 * Update conversation metadata
 */
async function updateMetadata(
  conversationId: string,
  updates: {
    lastMessageAt?: number;
    messageCount?: number;
    tokenCount?: number;
    cost?: number;
  }
): Promise<void> {
  const key = `${METADATA_PREFIX}${conversationId}`;
  const existing = await redis.get(key);
  
  if (!existing) return;
  
  const metadata: ConversationMetadata = JSON.parse(existing);
  
  if (updates.lastMessageAt) metadata.lastMessageAt = updates.lastMessageAt;
  if (updates.messageCount) metadata.messageCount += updates.messageCount;
  if (updates.tokenCount) metadata.totalTokensUsed += updates.tokenCount;
  if (updates.cost) metadata.totalCost += updates.cost;
  
  await redis.set(key, JSON.stringify(metadata), 'EX', CONVERSATION_TTL);
}

/**
 * Get conversation metadata
 */
export async function getConversationMetadata(
  conversationId: string
): Promise<ConversationMetadata | null> {
  const key = `${METADATA_PREFIX}${conversationId}`;
  const data = await redis.get(key);
  
  return data ? JSON.parse(data) : null;
}

/**
 * Check if user can send more messages (rate limiting)
 */
export async function canUserSendMessage(
  userId: string,
  conversationId: string
): Promise<{ allowed: boolean; reason?: string }> {
  // Check conversation message limit
  const key = `${CONVERSATION_PREFIX}${conversationId}`;
  const messageCount = await redis.llen(key);
  
  if (messageCount >= MAX_MESSAGES_PER_CONVERSATION) {
    return {
      allowed: false,
      reason: `Maximum ${MAX_MESSAGES_PER_CONVERSATION} messages per conversation reached`,
    };
  }
  
  // Check daily user limit (you can customize this based on tier)
  const dailyKey = `chat:daily:${userId}:${new Date().toISOString().split('T')[0]}`;
  const dailyCount = await redis.get(dailyKey);
  const dailyLimit = 100; // Free tier limit, adjust based on user.tier
  
  if (dailyCount && parseInt(dailyCount) >= dailyLimit) {
    return {
      allowed: false,
      reason: `Daily message limit (${dailyLimit}) reached`,
    };
  }
  
  return { allowed: true };
}

/**
 * Increment daily message count
 */
export async function incrementDailyMessageCount(userId: string): Promise<void> {
  const dailyKey = `chat:daily:${userId}:${new Date().toISOString().split('T')[0]}`;
  await redis.incr(dailyKey);
  await redis.expire(dailyKey, 86400); // 24 hours
}

/**
 * Get user's conversation IDs
 */
export async function getUserConversations(userId: string): Promise<string[]> {
  const key = `${USER_CONVERSATIONS_PREFIX}${userId}`;
  return await redis.smembers(key);
}

/**
 * Delete a conversation
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  const conversationKey = `${CONVERSATION_PREFIX}${conversationId}`;
  const metadataKey = `${METADATA_PREFIX}${conversationId}`;
  
  await redis.del(conversationKey);
  await redis.del(metadataKey);
}

/**
 * Clear all conversations for a user
 */
export async function clearUserConversations(userId: string): Promise<void> {
  const conversations = await getUserConversations(userId);
  
  for (const conversationId of conversations) {
    await deleteConversation(conversationId);
  }
  
  const userKey = `${USER_CONVERSATIONS_PREFIX}${userId}`;
  await redis.del(userKey);
}

/**
 * Get conversation statistics
 */
export async function getConversationStats(
  conversationId: string
): Promise<{
  messageCount: number;
  totalTokens: number;
  totalCost: number;
  createdAt: Date;
  lastMessageAt: Date;
} | null> {
  const metadata = await getConversationMetadata(conversationId);
  
  if (!metadata) return null;
  
  return {
    messageCount: metadata.messageCount,
    totalTokens: metadata.totalTokensUsed,
    totalCost: metadata.totalCost,
    createdAt: new Date(metadata.createdAt),
    lastMessageAt: new Date(metadata.lastMessageAt),
  };
}
