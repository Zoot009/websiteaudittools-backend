/**
 * DeepSeek AI Configuration
 * 
 * DeepSeek uses OpenAI-compatible API
 * Documentation: https://api.deepseek.com
 */

import OpenAI from 'openai';

if (!process.env.DEEPSEEK_API_KEY) {
  console.warn('⚠️  DEEPSEEK_API_KEY not found in environment variables');
}

export const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// DeepSeek models
export const DEEPSEEK_MODELS = {
  CHAT: 'deepseek-chat', // DeepSeek-V3.2 (128K context, optimized for chat)
  REASONER: 'deepseek-reasoner', // DeepSeek-V3.2 (Thinking mode, 32-64K output)
} as const;

// Token limits
export const TOKEN_LIMITS = {
  MAX_CONTEXT: 128000, // 128K tokens
  MAX_OUTPUT: 8000, // 8K tokens for chat mode
  RECOMMENDED_OUTPUT: 2000, // Recommended for cost optimization
} as const;

// Cost estimation (per 1M tokens)
export const COSTS = {
  INPUT_CACHE_MISS: 0.28,
  INPUT_CACHE_HIT: 0.028,
  OUTPUT: 0.42,
} as const;

/**
 * Calculate estimated cost for a conversation
 */
export function estimateCost(inputTokens: number, outputTokens: number, cacheHit = false): number {
  const inputCost = (inputTokens / 1000000) * (cacheHit ? COSTS.INPUT_CACHE_HIT : COSTS.INPUT_CACHE_MISS);
  const outputCost = (outputTokens / 1000000) * COSTS.OUTPUT;
  return inputCost + outputCost;
}
