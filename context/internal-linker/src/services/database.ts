/**
 * Database service for persisting crawl results using Prisma
 */

import { prisma } from '../utils/prisma.js';
import type { LinkMap, InboundLinksCount, CrawlMetadata } from '../types.js';

export interface CreditUsageData {
  targetUrl: string;
  creditsUsed: number;
  requestType: 'datacenter' | 'datacenter+render' | 'residential' | 'residential+render';
  statusCode?: number;
  successful: boolean;
  responseTime?: number;
  errorMessage?: string;
}

/**
 * Create a new crawl job record in the database
 * Uses upsert to handle retries gracefully
 */
export async function createCrawlJob(jobId: string, targetUrl: string, config: any) {
  try {
    return await prisma.crawlJob.upsert({
      where: { jobId },
      update: {
        // On retry, reset status to processing
        status: 'processing',
        startedAt: new Date(),
      },
      create: {
        jobId,
        targetUrl,
        status: 'processing',
        crawlConfig: config,
        startedAt: new Date(),
      },
    });
  } catch (error) {
    console.error(`Failed to create crawl job ${jobId}:`, error);
    throw error;
  }
}

/**
 * Update crawl job status
 */
export async function updateCrawlJobStatus(
  jobId: string,
  status: 'processing' | 'completed' | 'failed',
  errorMessage?: string
) {
  try {
    const updateData: any = {
      status,
    };
    
    if (errorMessage !== undefined) {
      updateData.errorMessage = errorMessage;
    }
    
    if (status === 'completed' || status === 'failed') {
      updateData.completedAt = new Date();
    }

    return await prisma.crawlJob.update({
      where: { jobId },
      data: updateData,
    });
  } catch (error) {
    console.error(`Failed to update crawl job ${jobId}:`, error);
    throw error;
  }
}

/**
 * Save crawl results to database
 */
export async function saveCrawlResults(
  jobId: string,
  linkMap: LinkMap,
  inboundLinksCount: InboundLinksCount,
  orphanPages: string[],
  metadata: CrawlMetadata,
  totalCreditsUsed: number
) {
  try {
    console.log(`💾 Saving crawl results for job ${jobId} to database...`);

    // Update the crawl job with final metadata
    const crawlJob = await prisma.crawlJob.update({
      where: { jobId },
      data: {
        status: 'completed',
        totalPagesCrawled: metadata.totalPagesCrawled,
        totalPagesInSitemap: metadata.totalPagesInSitemap,
        maxDepthReached: metadata.maxDepthReached,
        errorsEncountered: metadata.errorsEncountered,
        durationMs: metadata.durationMs,
        totalCreditsUsed,
        completedAt: new Date(),
      },
    });

    // Save internal links in batches to avoid overwhelming the database
    const linkEntries = Object.entries(linkMap);
    const batchSize = 100;
    
    for (let i = 0; i < linkEntries.length; i += batchSize) {
      const batch = linkEntries.slice(i, i + batchSize);
      await prisma.internalLink.createMany({
        data: batch.map(([sourceUrl, targetUrls]) => ({
          crawlJobId: crawlJob.id,
          sourceUrl,
          targetUrls,
          inboundCount: inboundLinksCount[sourceUrl] || 0,
        })),
      });
    }

    // Save orphan pages in batches
    if (orphanPages.length > 0) {
      for (let i = 0; i < orphanPages.length; i += batchSize) {
        const batch = orphanPages.slice(i, i + batchSize);
        await prisma.orphanPage.createMany({
          data: batch.map((url) => ({
            crawlJobId: crawlJob.id,
            url,
            source: 'sitemap',
            discoveredVia: 'sitemap.xml',
          })),
        });
      }
    }

    console.log(`✅ Saved crawl results for job ${jobId} to database`);
    console.log(`   - ${Object.keys(linkMap).length} internal links`);
    console.log(`   - ${orphanPages.length} orphan pages`);
    console.log(`   - ${totalCreditsUsed} total credits used`);

    return crawlJob;
  } catch (error) {
    console.error(`❌ Failed to save crawl results for job ${jobId}:`, error);
    
    // Try to update job status to failed
    try {
      await updateCrawlJobStatus(jobId, 'failed', `Database save error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } catch (updateError) {
      console.error(`Failed to update job status:`, updateError);
    }
    
    throw error;
  }
}

/**
 * Track credit usage for a scrape.do API call
 */
export async function trackCreditUsage(jobId: string | null, usageData: CreditUsageData) {
  try {
    // Find the crawl job if jobId is provided
    let crawlJobRecord = null;
    if (jobId) {
      crawlJobRecord = await prisma.crawlJob.findUnique({
        where: { jobId },
        select: { id: true },
      });
    }

    const createData: any = {
      targetUrl: usageData.targetUrl,
      creditsUsed: usageData.creditsUsed,
      requestType: usageData.requestType,
      successful: usageData.successful,
    };

    if (crawlJobRecord?.id) {
      createData.crawlJobId = crawlJobRecord.id;
    }

    if (usageData.statusCode !== undefined) {
      createData.statusCode = usageData.statusCode;
    }

    if (usageData.responseTime !== undefined) {
      createData.responseTime = usageData.responseTime;
    }

    if (usageData.errorMessage !== undefined) {
      createData.errorMessage = usageData.errorMessage;
    }

    await prisma.creditUsage.create({
      data: createData,
    });
  } catch (error) {
    console.error('Failed to track credit usage:', error);
    // Don't throw - credit tracking shouldn't break the main flow
  }
}

/**
 * Get crawl job by jobId (BullMQ job ID)
 */
export async function getCrawlJobByJobId(jobId: string) {
  return await prisma.crawlJob.findUnique({
    where: { jobId },
    include: {
      internalLinks: true,
      orphanPages: true,
      creditUsages: true,
    },
  });
}

/**
 * Get recent crawl jobs
 */
export async function getRecentCrawlJobs(limit = 50) {
  return await prisma.crawlJob.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      jobId: true,
      targetUrl: true,
      status: true,
      totalPagesCrawled: true,
      totalCreditsUsed: true,
      createdAt: true,
      completedAt: true,
      durationMs: true,
    },
  });
}

/**
 * Get total credit usage statistics
 */
export async function getCreditUsageStats(startDate?: Date, endDate?: Date) {
  const where: any = {};
  
  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = startDate;
    if (endDate) where.timestamp.lte = endDate;
  }

  const stats = await prisma.creditUsage.aggregate({
    where,
    _sum: { creditsUsed: true },
    _count: true,
  });

  const byType = await prisma.creditUsage.groupBy({
    by: ['requestType'],
    where,
    _sum: { creditsUsed: true },
    _count: true,
  });

  return {
    totalCredits: stats._sum.creditsUsed || 0,
    totalRequests: stats._count,
    byRequestType: byType,
  };
}

/**
 * Get credit usage for a specific crawl job
 */
export async function getCrawlJobCredits(jobId: string) {
  const crawlJob = await prisma.crawlJob.findUnique({
    where: { jobId },
    select: { id: true },
  });

  if (!crawlJob) {
    return null;
  }

  const credits = await prisma.creditUsage.findMany({
    where: { crawlJobId: crawlJob.id },
    orderBy: { timestamp: 'asc' },
  });

  const total = credits.reduce((sum: number, c) => sum + c.creditsUsed, 0);

  return {
    totalCredits: total,
    usages: credits,
  };
}

/**
 * Close Prisma connection (for graceful shutdown)
 */
export async function closePrisma() {
  await prisma.$disconnect();
  console.log('✅ Prisma connection closed');
}

export { prisma };
