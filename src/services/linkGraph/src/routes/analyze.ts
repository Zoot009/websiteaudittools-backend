/**
 * Express route handler for internal link analysis endpoint
 */

import type { Request, Response } from 'express';
import { Crawler } from '../services/crawler.js';
import { analyzeLinkGraph, getLinkGraphStats } from '../services/linkAnalyzer.js';
import { isValidUrl, normalizeUrl } from '../utils/url.js';
import type { CrawlerConfig } from '../types.js';
import 'dotenv/config'


/**
 * Default crawler configuration
 */
const DEFAULT_CONFIG = {
  maxPages: 500,
  maxDepth: 5,
  delayMs: 500,
};

/**
 * Handle the /api/analyze endpoint
 */
export async function analyzeHandler(req: Request, res: Response): Promise<void> {
  try {
    // Extract query parameters
    const { url, maxPages, maxDepth, delayMs } = req.query;

    // Validate required parameters
    if (!url || typeof url !== 'string') {
      res.status(400).json({
        error: 'Missing required parameter: url',
        message: 'Please provide a valid URL to analyze',
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

    // Get scrape.do token from environment
    const scrapeDoToken = process.env.SCRAPE_DO_TOKEN;
    if (!scrapeDoToken) {
      res.status(400).json({
        error: 'Missing scrape.do token',
        message: 'SCRAPE_DO_TOKEN environment variable is not set',
      });
      return;
    }

    // Parse optional configuration parameters
    const config: CrawlerConfig = {
      baseUrl: normalizeUrl(url, false),
      scrapeDoToken,
      maxPages: maxPages ? parseInt(maxPages as string, 10) : DEFAULT_CONFIG.maxPages,
      maxDepth: maxDepth ? parseInt(maxDepth as string, 10) : DEFAULT_CONFIG.maxDepth,
      delayMs: delayMs ? parseInt(delayMs as string, 10) : DEFAULT_CONFIG.delayMs,
    };

    // Validate numeric parameters
    if (isNaN(config.maxPages) || config.maxPages <= 0) {
      res.status(400).json({
        error: 'Invalid maxPages parameter',
        message: 'maxPages must be a positive integer',
      });
      return;
    }

    if (isNaN(config.maxDepth) || config.maxDepth < 0) {
      res.status(400).json({
        error: 'Invalid maxDepth parameter',
        message: 'maxDepth must be a non-negative integer',
      });
      return;
    }

    if (isNaN(config.delayMs) || config.delayMs < 0) {
      res.status(400).json({
        error: 'Invalid delayMs parameter',
        message: 'delayMs must be a non-negative integer',
      });
      return;
    }

    // Log the analysis start
    console.log(`Starting analysis for: ${url}`);
    console.log(`Config: maxPages=${config.maxPages}, maxDepth=${config.maxDepth}, delayMs=${config.delayMs}`);

    // Create and run the crawler
    const crawler = new Crawler(config);
    const { linkMap, metadata, sitemapUrls } = await crawler.crawl();

    // Analyze the link graph
    const analysis = analyzeLinkGraph(linkMap, sitemapUrls, metadata);

    // Get additional statistics
    const stats = getLinkGraphStats(analysis.linkGraph, analysis.inboundLinksCount);

    // Return the complete analysis
    res.json({
      success: true,
      url: config.baseUrl,
      analysis: {
        linkGraph: analysis.linkGraph,
        inboundLinksCount: analysis.inboundLinksCount,
        orphanPages: analysis.orphanPages,
        metadata: {
          ...analysis.metadata,
          stats,
        },
      },
    });

    console.log(`Analysis complete for: ${url}`);
    console.log(`Pages crawled: ${metadata.totalPagesCrawled}, Orphans found: ${analysis.orphanPages.length}`);
  } catch (error) {
    console.error('Error during analysis:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
}
