/**
 * Scrape.do API client for bypassing bot protection and fetching web pages
 */

import axios, { AxiosError } from 'axios';
import { trackCreditUsage } from './database.js';

const SCRAPE_DO_API_URL = 'https://api.scrape.do/';

export interface ScrapeDoResponse {
  html: string;
  statusCode: number;
  success: boolean;
  error?: string;
  creditsUsed?: number;
  responseTime?: number;
}

/**
 * Calculate credits based on request configuration
 * Based on https://scrape.do/documentation/api-response/request-costs/
 */
function calculateCredits(options: { render?: boolean; super?: boolean } = {}): number {
  const { render = false, super: useSuper = false } = options;
  
  if (useSuper && render) {
    return 25; // Residential & Mobile + Headless Browser
  } else if (useSuper) {
    return 10; // Residential & Mobile Request
  } else if (render) {
    return 5; // Datacenter + Headless Browser
  } else {
    return 1; // Normal Request (Datacenter)
  }
}

/**
 * Get request type string for tracking
 */
function getRequestType(options: { render?: boolean; super?: boolean } = {}): 'datacenter' | 'datacenter+render' | 'residential' | 'residential+render' {
  const { render = false, super: useSuper = false } = options;
  
  if (useSuper && render) {
    return 'residential+render';
  } else if (useSuper) {
    return 'residential';
  } else if (render) {
    return 'datacenter+render';
  } else {
    return 'datacenter';
  }
}

export interface ScrapeDoAccountInfo {
  IsActive: boolean;
  ConcurrentRequest: number;
  MaxMonthlyRequest: number;
  RemainingConcurrentRequest: number;
  RemainingMonthlyRequest: number;
}

/**
 * Fetch account info from scrape.do to check remaining credits
 */
export async function getScrapeDoAccountInfo(token: string): Promise<ScrapeDoAccountInfo | null> {
  try {
    const response = await axios.get('https://api.scrape.do/info', {
      params: { token },
      timeout: 10000,
      validateStatus: () => true,
    });

    if (response.status === 200 && response.data) {
      return response.data as ScrapeDoAccountInfo;
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch scrape.do account info:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * Check if scrape.do account has sufficient credits
 */
export async function hasSufficientCredits(token: string, requiredMinimum: number = 5): Promise<boolean> {
  const accountInfo = await getScrapeDoAccountInfo(token);
  
  if (!accountInfo) {
    console.warn('Could not fetch scrape.do account info, allowing job to proceed');
    return true;
  }

  if (!accountInfo.IsActive) {
    console.warn('Scrape.do account is not active');
    return false;
  }

  const hasEnoughCredits = accountInfo.RemainingMonthlyRequest >= requiredMinimum;
  
  if (!hasEnoughCredits) {
    console.warn(`Insufficient scrape.do credits. Remaining: ${accountInfo.RemainingMonthlyRequest}, Required: ${requiredMinimum}`);
  }

  return hasEnoughCredits;
}

/**
 * Fetch a URL using Scrape.do API
 */
export async function fetchWithScrapeDo(
  targetUrl: string,
  token: string,
  options: {
    render?: boolean;
    timeout?: number;
    super?: boolean;
  } = {},
  jobId?: string
): Promise<ScrapeDoResponse> {
  const startTime = Date.now();
  
  try {
    const params = new URLSearchParams({
      token,
      url: targetUrl,
    });

    // Add optional parameters
    if (options.render) {
      params.append('render', 'true');
    }
    
    if (options.super) {
      params.append('super', 'true');
    }
    
    if (options.timeout) {
      params.append('timeout', options.timeout.toString());
    }

    const response = await axios.get(`${SCRAPE_DO_API_URL}?${params.toString()}`, {
      timeout: options.timeout || 60000,
      validateStatus: () => true, // Accept any status code
    });

    const responseTime = Date.now() - startTime;
    const statusCode = response.status;
    
    // Determine if request was successful (charged) based on scrape.do billing rules
    // Charged for: 2xx, 400, 404, 410
    const isCharged = (statusCode >= 200 && statusCode < 300) || 
                      statusCode === 400 || 
                      statusCode === 404 || 
                      statusCode === 410;
    
    const creditsUsed = isCharged ? calculateCredits(options) : 0;
    const isSuccess = response.status >= 200 && response.status < 400;

    // Track credit usage asynchronously (don't await to avoid blocking)
    trackCreditUsage(jobId || null, {
      targetUrl,
      creditsUsed,
      requestType: getRequestType(options),
      statusCode,
      successful: isSuccess,
      responseTime,
    }).catch(err => console.error('Failed to track credit usage:', err));

    return {
      html: response.data,
      statusCode,
      success: isSuccess,
      creditsUsed,
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    if (error instanceof AxiosError) {
      const statusCode = error.response?.status || 500;
      const isCharged = (statusCode >= 200 && statusCode < 300) || 
                        statusCode === 400 || 
                        statusCode === 404 || 
                        statusCode === 410;
      const creditsUsed = isCharged ? calculateCredits(options) : 0;

      // Track failed request
      trackCreditUsage(jobId || null, {
        targetUrl,
        creditsUsed,
        requestType: getRequestType(options),
        statusCode,
        successful: false,
        responseTime,
        errorMessage: error.message,
      }).catch(err => console.error('Failed to track credit usage:', err));

      return {
        html: '',
        statusCode: error.response?.status || 500,
        success: false,
        error: error.message,
        creditsUsed,
        responseTime,
      };
    }
    
    // For non-axios errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    trackCreditUsage(jobId || null, {
      targetUrl,
      creditsUsed: 0,
      requestType: getRequestType(options),
      successful: false,
      responseTime,
      errorMessage,
    }).catch(err => console.error('Failed to track credit usage:', err));

    return {
      html: '',
      statusCode: 500,
      success: false,
      error: errorMessage,
      creditsUsed: 0,
      responseTime,
    };
  }
}

/**
 * Fetch multiple URLs with rate limiting
 */
export async function fetchMultipleWithScrapeDo(
  urls: string[],
  token: string,
  delayMs: number = 500,
  options: {
    render?: boolean;
    timeout?: number;
  } = {}
): Promise<Map<string, ScrapeDoResponse>> {
  const results = new Map<string, ScrapeDoResponse>();

  for (const url of urls) {
    const response = await fetchWithScrapeDo(url, token, options);
    results.set(url, response);

    // Rate limiting delay between requests
    if (urls.indexOf(url) < urls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
