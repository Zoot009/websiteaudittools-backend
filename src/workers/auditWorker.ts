import { Worker, Job } from 'bullmq';
import type { AuditJobData } from '../queues/auditQueue.js';
import { redisConnection } from '../config/redis.js';
import { SeoAnalyzer } from '../services/analyzer/SeoAnalyzer.js';
// TODO: Re-implement recommendations
// import { RecommendationGenerator } from '../services/recommendations/RecommendatonGenerator.js';
import { prisma } from '../lib/prisma.js';
import { SiteAuditCrawler, type PageData } from '../services/crawler/SiteAuditCrawler.js';
import { pageSpeedService } from '../services/performance/pageSpeedService.js';
import { 
  shouldRecrawl, 
  loadCachedPageData,
  checkRecrawlNeeded,
  loadCachedPagesData 
} from '../services/crawler/crawlCache.js';
import type { TransactionClient } from '../generated/prisma/internal/prismaNamespace.js';

/**
 * Main audit processing function
 */
async function processAudit(job: Job<AuditJobData>) {
  console.log(`\n🚀 Starting audit job ${job.id} for ${job.data.url}\n`);

  try {
    // Update progress: 0-20% = Crawling/Loading
    await job.updateProgress(0);

    const forceRecrawl = job.data.options?.forceRecrawl || false;
    let pageData: PageData[];
    let baseUrl: string;
    let pagesAnalyzed: number;

    // Step 1: Check cache and crawl if needed
    if (job.data.mode === 'single') {
      // Single page mode
      const needsRecrawl = await shouldRecrawl(job.data.url, forceRecrawl);
      
      if (needsRecrawl) {
        console.log(`🕷 Crawling fresh (cache miss or stale)...`);
        const crawler = new SiteAuditCrawler();
        const crawlResult = await crawler.crawl(job.data.url, {
          mode: job.data.mode,
          pageLimit: job.data.pageLimit,
          timeout: job.data.options?.timeout,
        });
        pageData = crawlResult.pages;
        baseUrl = crawlResult.baseUrl;
        pagesAnalyzed = crawlResult.pagesAnalyzed;
      } else {
        console.log(`⚡ Using cached data...`);
        const cached = await loadCachedPageData(job.data.url);
        if (cached) {
          pageData = [cached];
          baseUrl = new URL(job.data.url).origin;
          pagesAnalyzed = 1;
        } else {
          // Fallback to crawl if cache load fails
          console.log(`⚠️ Cache load failed, crawling fresh...`);
          const crawler = new SiteAuditCrawler();
          const crawlResult = await crawler.crawl(job.data.url, {
            mode: job.data.mode,
            pageLimit: job.data.pageLimit,
            timeout: job.data.options?.timeout,
          });
          pageData = crawlResult.pages;
          baseUrl = crawlResult.baseUrl;
          pagesAnalyzed = crawlResult.pagesAnalyzed;
        }
      }
    } else {
      // Multi-page mode: always crawl to discover URLs first
      // (in future, could cache sitemap URL list too)
      console.log(`🕷 Crawling multi-page site...`);
      const crawler = new SiteAuditCrawler();
      const crawlResult = await crawler.crawl(job.data.url, {
        mode: job.data.mode,
        pageLimit: job.data.pageLimit,
        timeout: job.data.options?.timeout,
      });
      
      // For multi-page, we could selectively use cache for individual pages
      // but for now, just use fresh crawl results
      pageData = crawlResult.pages;
      baseUrl = crawlResult.baseUrl;
      pagesAnalyzed = crawlResult.pagesAnalyzed;
    }
    
    await job.updateProgress(20);
    console.log(`✅ ${forceRecrawl || pagesAnalyzed === pageData.length ? 'Crawled' : 'Loaded'} ${pagesAnalyzed} pages`);

    // Step 1.5: Fetch PageSpeed Insights for homepage (20-40% progress)
    if (pageSpeedService.isConfigured() && pageData.length > 0) {
      console.log(`📊 Fetching PageSpeed Insights for homepage...`);
      try {
        const homepageUrl = baseUrl;
        const pageSpeedResult = await pageSpeedService.analyze(homepageUrl, {
          mobile: true,
          desktop: true,
        });
        
        // Attach PageSpeed data to homepage
        const homepageIndex = pageData.findIndex(p => 
          new URL(p.url).origin === baseUrl && 
          (new URL(p.url).pathname === '/' || p.url === baseUrl)
        );
        
        if (homepageIndex >= 0 && pageData[homepageIndex]) {
          pageData[homepageIndex].pageSpeed = pageSpeedResult;
          console.log(`✅ PageSpeed data attached to homepage`);
        } else if (pageData[0]) {
          // If we can't find the exact homepage, attach to first page
          pageData[0].pageSpeed = pageSpeedResult;
          console.log(`✅ PageSpeed data attached to first page (${pageData[0].url})`);
        }
        
        await job.updateProgress(40);
      } catch (error) {
        console.error(`⚠️  PageSpeed Insights failed:`, error);
        // Continue without PageSpeed data - not a fatal error
        await job.updateProgress(40);
      }
    } else {
      if (!pageSpeedService.isConfigured()) {
        console.log(`ℹ️  PageSpeed Insights skipped (no API key configured)`);
      }
      await job.updateProgress(40);
    }

    // Step 2: Analyze SEO (40-60% progress)
    console.log(`🔍 Analyzing ${pageData.length} pages for SEO issues...`);
    const analyzer = new SeoAnalyzer();
    const analysisResult = await analyzer.analyze(pageData, baseUrl);
    
    await job.updateProgress(60);
    console.log(`✅ Analysis complete: ${analysisResult.totalIssues} issues found, overall score ${analysisResult.overallScore}/100`);

    // TODO: Step 3: Generate recommendations (60-80% progress)
    // const generator = new RecommendationGenerator();
    // const recommendations = await generator.generateRecommendations(analysisResult.issues);
    
    const recommendations: any[] = [];
    
    await job.updateProgress(80);
    console.log(`⚠️  Recommendations temporarily disabled - waiting for reimplementation`);

    // Step 4: Save everything to database (80-100% progress)
    const auditReport = await saveToDatabase(
      job,
      pageData,
      baseUrl,
      pagesAnalyzed,
      analysisResult,
      recommendations
    );
    
    await job.updateProgress(100);
    console.log(`✅ Audit saved to database with ID: ${auditReport.id}`);

    // Return result
    return {
      success: true,
      auditReportId: auditReport.id,
      overallScore: analysisResult.overallScore,
      issuesFound: analysisResult.totalIssues,
      pagesAnalyzed: pagesAnalyzed,
    };

  } catch (error: any) {
    console.error(`❌ Audit job ${job.id} failed:`, error);
    
    throw error; // Re-throw to mark job as failed
  }
}

/**
 * Save audit results to database
 */
async function saveToDatabase(
  job: Job<AuditJobData>,
  pageData: PageData[],
  baseUrl: string,
  pagesAnalyzed: number,
  analysisResult: any,
  recommendations: any[]
) {
  console.log('💾 Saving to database with userId:', job.data.userId);
  
  // Create audit report with all related data in a transaction
  // Increase timeout to 15 seconds for large audits with many recommendations
  const auditReport = await prisma.$transaction(async (tx:TransactionClient) => {
    // Delete existing report if it exists (handles retries)
    await tx.auditReport.deleteMany({
      where: { jobId: job.id as string },
    });
    
    const report = await tx.auditReport.create({
      data: {
        jobId: job.id as string,
        url: job.data.url,
        mode: (job.data.mode?.toUpperCase() || 'SINGLE') as 'SINGLE' | 'MULTI',
        pageLimit: job.data.pageLimit ?? null,
        pagesAnalyzed: pagesAnalyzed,
        
        // Scores
        overallScore: analysisResult.overallScore,
        technicalScore: analysisResult.categoryScores.find((c: any) => c.category === 'TECHNICAL')?.score || 0,
        onPageScore: analysisResult.categoryScores.find((c: any) => c.category === 'ON_PAGE')?.score || 0,
        performanceScore: analysisResult.categoryScores.find((c: any) => c.category === 'PERFORMANCE')?.score || 0,
        accessibilityScore: analysisResult.categoryScores.find((c: any) => c.category === 'ACCESSIBILITY')?.score || 0,
        linkScore: analysisResult.categoryScores.find((c: any) => c.category === 'LINKS')?.score || null,
        structuredDataScore: analysisResult.categoryScores.find((c: any) => c.category === 'STRUCTURED_DATA')?.score || null,
        securityScore: analysisResult.categoryScores.find((c: any) => c.category === 'SECURITY')?.score || 0,
        
        // Passing checks (what's working well) ✨
        passingChecks: analysisResult.passingChecks || [],
        
        status: 'COMPLETED',
        userId: job.data.userId,
        completedAt: new Date(),
        
        // Create pages with cached JSONB data
        pages: {
          create: pageData.map((page: PageData) => ({
            url: page.url,
            title: page.title,
            description: page.description,
            statusCode: page.statusCode,
            loadTime: page.loadTime,
            lcp: page.lcp,
            fid: page.fid,
            cls: page.cls,
            wordCount: page.wordCount,
            imageCount: page.images.length,
            linkCount: page.links.length,
            h1Count: page.headings.filter((h: any) => h.level === 1).length,
            
            // Store structured data in JSONB for caching
            headingsData: page.headings,
            imagesData: page.images,
            linksData: page.links,
            
            // Meta data
            canonical: page.canonical,
            robots: page.robots,
            ogImage: page.ogImage,
            hasSchemaOrg: page.hasSchemaOrg,
            
            // Local SEO data - conditionally include
            ...(page.localSeo && { localSeoData: page.localSeo }),
            
            crawledAt: new Date(),
          })),
        },
        
        // Create issues
        issues: {
          create: analysisResult.issues.map((issue: any, index: number) => ({
            category: issue.category,
            type: issue.type,
            title: issue.title,
            description: issue.description,
            severity: issue.severity,
            impactScore: issue.impactScore,
            pageUrl: issue.pageUrl,
            elementSelector: issue.elementSelector,
            lineNumber: issue.lineNumber,
          })),
        },
      },
      include: {
        issues: true,
        pages: true,
      },
    });

    // Create a mapping of issues for faster lookup
    // Match by category + type + pageUrl for accurate pairing
    const issueMap = new Map<string, any>();
    report.issues.forEach((issue: any) => {
      const key = `${issue.category}_${issue.type}_${issue.pageUrl || 'global'}`;
      if (!issueMap.has(key)) {
        issueMap.set(key, []);
      }
      issueMap.get(key)!.push(issue);
    });

    // Create recommendations with proper issue associations
    // Use Promise.all for parallel creation to speed up the process
    await Promise.all(recommendations.map(async (rec) => {
      // Try to find matching issue using a composite key
      const searchKey = `${rec.category}_${rec.issueType || rec.type}_${rec.pageUrl || 'global'}`;
      const matchingIssues = issueMap.get(searchKey) || [];
      
      // Use the first matching issue (or undefined if no match)
      const matchingIssue = matchingIssues.shift();

      return tx.recommendation.create({
        data: {
          title: rec.title,
          description: rec.description,
          priority: rec.priority,
          estimatedTimeMinutes: rec.estimatedTimeMinutes,
          difficulty: rec.difficulty,
          category: rec.category,
          auditReportId: report.id, // Direct field assignment
          // Conditionally connect relations if they exist
          ...(rec.fixGuideId && {
            fixGuideId: rec.fixGuideId
          }),
          ...(matchingIssue?.id && {
            issueId: matchingIssue.id
          }),
          
          // Create fix steps
          steps: {
            create: (rec.steps || []).map((step: any, index: number) => ({
              stepNumber: index + 1,
              instruction: step.instruction,
              codeExample: step.codeExample || null,
              toolsNeeded: step.toolsNeeded || [],
            })),
          },
        },
      });
    }));

    return report;
  }, {
    maxWait: 20000, // Maximum wait time to start transaction (20s)
    timeout: 30000,  // Transaction timeout (30s) for large audits
  });

  return auditReport;
}

/**
 * Save failed audit to database
 */
async function saveFailedAudit(job: Job<AuditJobData>, errorMessage: string) {
  try {
    await prisma.auditReport.upsert({
      where: { jobId: job.id as string },
      create: {
        jobId: job.id as string,
        url: job.data.url,
        mode: (job.data.mode?.toUpperCase() || 'SINGLE') as 'SINGLE' | 'MULTI',
        pageLimit: job.data.pageLimit ?? null,
        pagesAnalyzed: 0,
        overallScore: 0,
        technicalScore: 0,
        onPageScore: 0,
        performanceScore: 0,
        accessibilityScore: 0,
        securityScore: 0,
        status: 'FAILED',
        errorMessage,
        userId: job.data.userId,
      },
      update: {
        status: 'FAILED',
        errorMessage,
      },
    });
  } catch (error) {
    console.error('Failed to save failed audit to database:', error);
  }
}

// Create the worker
export const auditWorker = new Worker<AuditJobData>(
  'website-audit',
  processAudit,
  {
    connection: redisConnection,
    concurrency: 5, // Process 5 jobs simultaneously
  }
);

// Event listeners
auditWorker.on('completed', (job, returnvalue) => {
  console.log(`\n✅ Job ${job.id} completed successfully!`);
  console.log(`   Audit Report ID: ${returnvalue.auditReportId}`);
  console.log(`   Overall Score: ${returnvalue.overallScore}/100`);
  console.log(`   Issues Found: ${returnvalue.issuesFound}\n`);
});

auditWorker.on('failed', (job, err) => {
  console.error(`\n❌ Job ${job?.id} failed:`, err.message, '\n');
});

auditWorker.on('error', (err) => {
  console.error('Worker error:', err);
});

console.log('👷 Audit worker started and ready to process jobs!');