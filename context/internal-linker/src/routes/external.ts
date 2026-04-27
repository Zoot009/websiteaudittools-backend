/**
 * Express route handlers for external/public analysis endpoint
 * This endpoint provides one-time analysis without database persistence
 */

import type { Request, Response } from 'express';
import { Crawler } from '../services/crawler.js';
import { analyzeLinkGraph } from '../services/linkAnalyzer.js';
import { getLinkGraphStats } from '../services/linkAnalyzer.js';
import { isValidUrl, normalizeUrl, getBaseUrl } from '../utils/url.js';
import type { CrawlerConfig } from '../types.js';

/**
 * External analysis endpoint - no database persistence
 * GET /api/external/analyze?url=<target-url>&maxPages=50&maxDepth=3
 * 
 * This endpoint is designed for external/public users who want one-time analysis
 * without the overhead of job management and database storage.
 */
export async function externalAnalyzeHandler(req: Request, res: Response): Promise<void> {
  try {
    // Extract parameters from query string
    const { 
      url, 
      token, 
      maxPages = '100',  // Lower default for external users
      maxDepth = '3',    // Lower default for external users
      rateLimit = '500',
      includeStats = 'true'
    } = req.query;

    // Validate required parameters
    if (!url || typeof url !== 'string') {
      res.status(400).json({
        error: 'Missing required parameter: url',
        message: 'Please provide a valid URL to analyze',
        example: '/api/external/analyze?url=https://example.com'
      });
      return;
    }

    // Validate URL format
    if (!isValidUrl(url)) {
      res.status(400).json({
        error: 'Invalid URL format',
        message: 'Please provide a valid HTTP or HTTPS URL',
      });
      return;
    }

    // Get scrape.do token from request or environment
    const scrapeDoToken = (token as string) || process.env.SCRAPE_DO_TOKEN;
    if (!scrapeDoToken) {
      res.status(400).json({
        error: 'Missing scrape.do token',
        message: 'Please provide a scrape.do token via the "token" parameter or SCRAPE_DO_TOKEN environment variable',
        note: 'For security, it is recommended to set SCRAPE_DO_TOKEN in environment variables on the server',
      });
      return;
    }

    // Parse and validate numeric parameters
    const parsedMaxPages = parseInt(maxPages as string, 10);
    const parsedMaxDepth = parseInt(maxDepth as string, 10);
    const parsedRateLimit = parseInt(rateLimit as string, 10);

    if (isNaN(parsedMaxPages) || parsedMaxPages <= 0 || parsedMaxPages > 500) {
      res.status(400).json({
        error: 'Invalid maxPages parameter',
        message: 'maxPages must be between 1 and 500',
      });
      return;
    }

    if (isNaN(parsedMaxDepth) || parsedMaxDepth < 0 || parsedMaxDepth > 10) {
      res.status(400).json({
        error: 'Invalid maxDepth parameter',
        message: 'maxDepth must be between 0 and 10',
      });
      return;
    }

    if (isNaN(parsedRateLimit) || parsedRateLimit < 0) {
      res.status(400).json({
        error: 'Invalid rateLimit parameter',
        message: 'rateLimit must be a non-negative integer',
      });
      return;
    }

    // Build crawler configuration
    const config: CrawlerConfig = {
      baseUrl: normalizeUrl(url, false),
      scrapeDoToken,
      maxPages: parsedMaxPages,
      maxDepth: parsedMaxDepth,
      delayMs: parsedRateLimit,
      // Note: No jobId - this is a one-time analysis without database tracking
    };

    console.log(`[External API] Starting analysis for: ${url}`);
    console.log(`[External API] Config: maxPages=${parsedMaxPages}, maxDepth=${parsedMaxDepth}, delayMs=${parsedRateLimit}`);

    // Create and run the crawler
    const crawler = new Crawler(config);
    const { linkMap, metadata, sitemapUrls } = await crawler.crawl();

    // Analyze the link graph
    const analysis = analyzeLinkGraph(linkMap, sitemapUrls, metadata);

    // Build response
    const response: any = {
      success: true,
      url: config.baseUrl,
      
      // Link analysis data
      internalLinks: Object.entries(analysis.linkGraph).map(([url, links]) => ({
        url,
        links,
        depth: 0, // Depth information available in metadata if needed
        inboundLinks: analysis.inboundLinksCount[url] || 0,
      })),
      
      orphanPages: analysis.orphanPages.map(url => ({
        url,
        source: 'sitemap',
        reason: 'Not linked from any crawled page'
      })),
      
      metadata: {
        totalPagesCrawled: metadata.totalPagesCrawled,
        totalPagesInSitemap: metadata.totalPagesInSitemap,
        maxDepthReached: metadata.maxDepthReached,
        errorsEncountered: metadata.errorsEncountered,
        crawlDuration: metadata.durationMs,
        startTime: metadata.startTime.toISOString(),
        endTime: metadata.endTime.toISOString(),
      }
    };

    // Note: Categorized links feature not yet implemented
    // Future enhancement: separate content vs navigation links

    // Include statistics if requested
    if (includeStats !== 'false') {
      const stats = getLinkGraphStats(analysis.linkGraph, analysis.inboundLinksCount);
      response.stats = stats;
    }

    // Return the analysis
    res.json(response);

    console.log(`[External API] Analysis complete for: ${url}`);
    console.log(`[External API] Pages crawled: ${metadata.totalPagesCrawled}, Orphans: ${analysis.orphanPages.length}`);
  } catch (error) {
    console.error('[External API] Error during analysis:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred during analysis',
    });
  }
}
