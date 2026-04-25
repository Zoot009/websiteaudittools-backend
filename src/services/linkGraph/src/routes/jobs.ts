/**
 * Express route handlers for job-based internal link analysis
 */

import type { Request, Response } from 'express';
import { crawlQueue } from '../queue/config.js';
import { isValidUrl, normalizeUrl } from '../utils/url.js';
import type { CrawlJobData } from '../queue/types.js';
import 'dotenv/config'

/**
 * Submit a new crawl job to the queue
 * POST /api/jobs/submit
 */
export async function submitJobHandler(req: Request, res: Response): Promise<void> {
  try {
    // Extract parameters from body or query
    const { url, maxPages, maxDepth, rateLimit } = {
      ...req.query,
      ...req.body,
    };

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

    // Prepare job data
    const jobData: CrawlJobData = {
      url: normalizeUrl(url, false),
      scrapeDoToken,
      maxPages: maxPages ? parseInt(maxPages as string, 10) : 500,
      maxDepth: maxDepth ? parseInt(maxDepth as string, 10) : 5,
      rateLimit: rateLimit ? parseInt(rateLimit as string, 10) : 500,
    };

    // Validate numeric parameters
    if (isNaN(jobData.maxPages!) || jobData.maxPages! <= 0) {
      res.status(400).json({
        error: 'Invalid maxPages parameter',
        message: 'maxPages must be a positive integer',
      });
      return;
    }

    if (isNaN(jobData.maxDepth!) || jobData.maxDepth! < 0) {
      res.status(400).json({
        error: 'Invalid maxDepth parameter',
        message: 'maxDepth must be a non-negative integer',
      });
      return;
    }

    if (isNaN(jobData.rateLimit!) || jobData.rateLimit! < 0) {
      res.status(400).json({
        error: 'Invalid rateLimit parameter',
        message: 'rateLimit must be a non-negative integer',
      });
      return;
    }

    // Add job to queue
    const job = await crawlQueue.add('crawl', jobData, {
      jobId: `crawl-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    });

    console.log(`📥 Job ${job.id} submitted for URL: ${url}`);

    res.status(202).json({
      success: true,
      message: 'Crawl job submitted successfully',
      jobId: job.id,
      statusUrl: `/api/jobs/${job.id}/status`,
      resultUrl: `/api/jobs/${job.id}/result`,
    });
  } catch (error) {
    console.error('Error submitting job:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to submit job',
    });
  }
}

/**
 * Get job status
 * GET /api/jobs/:jobId/status
 */
export async function getJobStatusHandler(req: Request, res: Response): Promise<void> {
  try {
    const { jobId } = req.params;

    if (!jobId || typeof jobId !== 'string') {
      res.status(400).json({
        error: 'Missing required parameter: jobId',
      });
      return;
    }

    // Get job from queue
    const job = await crawlQueue.getJob(jobId);

    if (!job) {
      res.status(404).json({
        error: 'Job not found',
        message: `No job found with ID: ${jobId}`,
      });
      return;
    }

    // Get job state and progress
    const state = await job.getState();
    const progress = job.progress;
    const returnvalue = job.returnvalue;

    // Build response based on state
    const response: any = {
      jobId: job.id,
      state,
      createdAt: new Date(job.timestamp).toISOString(),
      data: {
        url: job.data.url,
        maxPages: job.data.maxPages,
        maxDepth: job.data.maxDepth,
      },
    };

    // Add progress if available
    if (progress) {
      response.progress = progress;
    }

    // Add timestamps for different states
    if (job.processedOn) {
      response.processedAt = new Date(job.processedOn).toISOString();
    }

    if (job.finishedOn) {
      response.finishedAt = new Date(job.finishedOn).toISOString();
      response.duration = job.finishedOn - (job.processedOn || job.timestamp);
    }

    // Add error information if failed
    if (state === 'failed' && job.failedReason) {
      response.error = job.failedReason;
    }

    // Add short result info if completed
    if (state === 'completed' && returnvalue) {
      response.resultSummary = returnvalue.summary || {
        success: returnvalue.success,
      };
      response.resultUrl = `/api/jobs/${jobId}/result`;
    }

    res.json(response);
  } catch (error) {
    console.error('Error getting job status:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to get job status',
    });
  }
}

/**
 * Get job result
 * GET /api/jobs/:jobId/result
 */
export async function getJobResultHandler(req: Request, res: Response): Promise<void> {
  try {
    const { jobId } = req.params;

    if (!jobId || typeof jobId !== 'string') {
      res.status(400).json({
        error: 'Missing required parameter: jobId',
      });
      return;
    }

    // Get job from queue
    const job = await crawlQueue.getJob(jobId);

    if (!job) {
      res.status(404).json({
        error: 'Job not found',
        message: `No job found with ID: ${jobId}`,
      });
      return;
    }

    // Get job state
    const state = await job.getState();

    // Check if job is completed
    if (state !== 'completed') {
      res.status(400).json({
        error: 'Job not completed',
        message: `Job is currently in '${state}' state. Please check status endpoint.`,
        statusUrl: `/api/jobs/${jobId}/status`,
      });
      return;
    }

    // Get the result summary from job
    const resultSummary = job.returnvalue;

    if (!resultSummary || !resultSummary.success) {
      res.status(404).json({
        error: 'Result not found',
        message: 'Job completed but result data is not available',
      });
      return;
    }

    // Fetch full results from database
    const { getCrawlJobByJobId } = await import('../services/database.js');
    const dbResult = await getCrawlJobByJobId(jobId);

    if (!dbResult) {
      res.status(404).json({
        error: 'Result not found in database',
        message: 'Job completed but result data could not be retrieved from database',
      });
      return;
    }

    // Build full response from database data
    const linkGraph: Record<string, string[]> = {};
    for (const link of dbResult.internalLinks) {
      linkGraph[link.sourceUrl] = link.targetUrls as string[];
    }

    const inboundLinksCount: Record<string, number> = {};
    for (const link of dbResult.internalLinks) {
      inboundLinksCount[link.sourceUrl] = link.inboundCount;
    }

    const orphanPages = dbResult.orphanPages.map((op: { url: string }) => op.url);

    // Return full result with data from database
    res.json({
      success: true,
      data: {
        url: dbResult.targetUrl,
        linkGraph,
        inboundLinksCount,
        orphanPages,
        metadata: {
          startTime: dbResult.startedAt,
          endTime: dbResult.completedAt,
          durationMs: dbResult.durationMs,
          totalPagesCrawled: dbResult.totalPagesCrawled,
          totalPagesInSitemap: dbResult.totalPagesInSitemap,
          maxDepthReached: dbResult.maxDepthReached,
          errorsEncountered: dbResult.errorsEncountered,
        },
        stats: resultSummary.summary?.stats || {},
      },
      startedAt: resultSummary.startedAt,
      completedAt: resultSummary.completedAt,
      duration: resultSummary.duration,
    });
  } catch (error) {
    console.error('Error getting job result:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to get job result',
    });
  }
}

/**
 * List all jobs with optional filtering
 * GET /api/jobs
 */
export async function listJobsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { state, limit = '50' } = req.query;
    const maxLimit = Math.min(parseInt(limit as string, 10) || 50, 100);

    // Get jobs based on state filter
    let jobs;
    if (state === 'completed') {
      jobs = await crawlQueue.getCompleted(0, maxLimit - 1);
    } else if (state === 'failed') {
      jobs = await crawlQueue.getFailed(0, maxLimit - 1);
    } else if (state === 'active') {
      jobs = await crawlQueue.getActive(0, maxLimit - 1);
    } else if (state === 'waiting') {
      jobs = await crawlQueue.getWaiting(0, maxLimit - 1);
    } else {
      // Get all recent jobs
      const [completed, failed, active, waiting] = await Promise.all([
        crawlQueue.getCompleted(0, 10),
        crawlQueue.getFailed(0, 10),
        crawlQueue.getActive(0, 10),
        crawlQueue.getWaiting(0, 10),
      ]);
      jobs = [...active, ...waiting, ...completed, ...failed].slice(0, maxLimit);
    }

    // Format job list
    const jobList = await Promise.all(
      jobs.map(async (job) => {
        const state = await job.getState();
        return {
          jobId: job.id,
          state,
          url: job.data.url,
          createdAt: new Date(job.timestamp).toISOString(),
          finishedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
        };
      })
    );

    res.json({
      jobs: jobList,
      count: jobList.length,
    });
  } catch (error) {
    console.error('Error listing jobs:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to list jobs',
    });
  }
}
