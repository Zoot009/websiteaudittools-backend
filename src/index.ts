// IMPORTANT: Load environment variables FIRST
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import { auditQueue } from './queues/auditQueue.js';
import { auditWorker } from './workers/auditWorker.js';
import { linkGraphQueue } from './queues/linkGraphQueue.js';
import { linkGraphWorker } from './workers/linkGraphWorker.js';
import { prisma } from './lib/prisma.js';
import { redis, redisConnection } from './config/redis.js';
import { getCacheStats } from './services/crawler/crawlCache.js';
import { normalizeUrl } from './services/crawler/antibot.js';
import { captureScreenshots } from './services/screenshots/screenshotService.js';
import { generateLinkGraph, filterLinkGraphByDepth, exportToDOT, exportToCSV, findConnectedPages } from './services/linkGraph/linkGraphService.js';
import type { LinkGraphCrawlResult } from './services/linkGraph/linkGraphCrawler.js';
import { QueueEvents } from 'bullmq';
import { buildSiteContext } from './services/analyzer/siteContextBuilder.js';
import chatRoutes from './routes/chatRoutes.js';
import { requireAuth } from './middleware/requireAuth.js';
import {
  AUDIT_SINGLE_COST,
  LINK_GRAPH_BASE_COST,
  LINK_GRAPH_PER_100_PAGES,
  CHAT_MESSAGE_COST,
  SCREENSHOT_COST,
  calculateAuditCost,
  calculateLinkGraphCost,
} from './config/pricing.js';

const app = express();
const port = process.env.PORT || 3000;

const ANON_AUDIT_USER_EMAIL = process.env.ANON_AUDIT_USER_EMAIL || 'anonymous@system.local';
const ANON_AUDITS_PER_IP_PER_DAY = parseInt(process.env.ANON_AUDITS_PER_IP_PER_DAY || '3', 10);
const ANON_AUDITS_PER_DOMAIN_PER_HOUR = parseInt(process.env.ANON_AUDITS_PER_DOMAIN_PER_HOUR || '10', 10);
const ANON_URL_COOLDOWN_SECONDS = parseInt(process.env.ANON_URL_COOLDOWN_SECONDS || '900', 10);

let anonymousUserIdCache: string | null = null;

function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  if (Array.isArray(forwarded) && forwarded.length > 0 && forwarded[0]) {
    return forwarded[0];
  }
  return req.ip || 'unknown';
}

function getDayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function getHourKey(date: Date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}-${String(date.getUTCHours()).padStart(2, '0')}`;
}

function cleanUrlForDedup(input: string): string {
  const u = new URL(input);
  u.hash = '';
  return u.toString();
}

async function getAnonymousAuditUserId(): Promise<string> {
  if (anonymousUserIdCache) {
    return anonymousUserIdCache;
  }

  const user = await prisma.user.upsert({
    where: { email: ANON_AUDIT_USER_EMAIL },
    update: {},
    create: {
      email: ANON_AUDIT_USER_EMAIL,
      name: 'Anonymous Audit User',
      tier: 'FREE',
    },
    select: { id: true },
  });

  anonymousUserIdCache = user.id;
  return user.id;
}

async function enforceAnonymousLimits(ip: string, normalizedUrl: string): Promise<{ allowed: true } | { allowed: false; status: number; error: string; retryAfter?: number }> {
  const hostname = new URL(normalizedUrl).hostname.toLowerCase();
  const dayKey = getDayKey();
  const hourKey = getHourKey();

  const ipDailyKey = `anon:audits:ip:${ip}:${dayKey}`;
  const domainHourlyKey = `anon:audits:domain:${hostname}:${hourKey}`;
  const dedupeKey = `anon:audits:dedupe:${ip}:${cleanUrlForDedup(normalizedUrl)}`;

  const [ipCountRaw, domainCountRaw, dedupeJobId] = await Promise.all([
    redis.get(ipDailyKey),
    redis.get(domainHourlyKey),
    redis.get(dedupeKey),
  ]);

  const ipCount = ipCountRaw ? parseInt(ipCountRaw, 10) : 0;
  const domainCount = domainCountRaw ? parseInt(domainCountRaw, 10) : 0;

  if (ipCount >= ANON_AUDITS_PER_IP_PER_DAY) {
    return {
      allowed: false,
      status: 429,
      error: `Anonymous daily limit reached (${ANON_AUDITS_PER_IP_PER_DAY}/day). Please sign in for more audits.`,
      retryAfter: 86400,
    };
  }

  if (domainCount >= ANON_AUDITS_PER_DOMAIN_PER_HOUR) {
    return {
      allowed: false,
      status: 429,
      error: `Too many anonymous audits for this domain. Try again next hour or sign in.`,
      retryAfter: 3600,
    };
  }

  if (dedupeJobId) {
    return {
      allowed: false,
      status: 409,
      error: `An anonymous audit for this URL is already queued recently (job: ${dedupeJobId}).`,
      retryAfter: ANON_URL_COOLDOWN_SECONDS,
    };
  }

  await Promise.all([
    redis.multi().incr(ipDailyKey).expire(ipDailyKey, 86400).exec(),
    redis.multi().incr(domainHourlyKey).expire(domainHourlyKey, 3600).exec(),
  ]);

  return { allowed: true };
}

async function setAnonymousDedupe(ip: string, normalizedUrl: string, jobId: string): Promise<void> {
  const dedupeKey = `anon:audits:dedupe:${ip}:${cleanUrlForDedup(normalizedUrl)}`;
  await redis.set(dedupeKey, jobId, 'EX', ANON_URL_COOLDOWN_SECONDS);
}

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// ============================================
// AUDIT QUEUE ROUTES
// ============================================

// Create a new audit job (authenticated users only — anonymous users must use /api/audits/anonymous)
app.post('/api/audits', requireAuth, async (req, res) => {
  try {
    const { url, forceRecrawl = false } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const userId = req.user!.id;

    // Validate mode
    const mode = 'single' as const;
    
    const job = await auditQueue.add('audit-request', {
      url,
      userId,
      mode,
      options: {
        forceRecrawl,
      },
    });
    
    res.status(201).json({
      jobId: job.id,
      message: 'Audit job queued successfully',
      url,
      mode,
      forceRecrawl,
    });
  } catch (error: any) {
    console.error('Failed to queue audit job:', error);
    res.status(500).json({ error: 'Failed to queue audit job', details: error.message });
  }
});

// Create a new anonymous single-page audit job
app.post('/api/audits/anonymous', async (req, res) => {
  try {
    const { url, forceRecrawl = false } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (forceRecrawl) {
      return res.status(400).json({
        error: 'forceRecrawl is not available for anonymous audits',
      });
    }

    const normalizedUrl = normalizeUrl(url.trim());

    let validatedUrl: URL;
    try {
      validatedUrl = new URL(normalizedUrl);
      if (!validatedUrl.protocol.startsWith('http')) {
        return res.status(400).json({ error: 'URL must use HTTP or HTTPS protocol' });
      }
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const clientIp = getClientIp(req);
    const limits = await enforceAnonymousLimits(clientIp, validatedUrl.toString());

    if (!limits.allowed) {
      if (limits.retryAfter) {
        res.setHeader('Retry-After', String(limits.retryAfter));
      }
      return res.status(limits.status).json({ error: limits.error });
    }

    const anonymousUserId = await getAnonymousAuditUserId();

    const job = await auditQueue.add('audit-request', {
      url: validatedUrl.toString(),
      userId: anonymousUserId,
      mode: 'single',
      options: {
        forceRecrawl: false,
      },
    });

    await setAnonymousDedupe(clientIp, validatedUrl.toString(), String(job.id));

    res.status(201).json({
      jobId: job.id,
      message: 'Anonymous single-page audit job queued successfully',
      url: validatedUrl.toString(),
      mode: 'single',
      anonymous: true,
    });
  } catch (error: any) {
    console.error('Failed to queue anonymous audit job:', error);
    res.status(500).json({
      error: 'Failed to queue anonymous audit job',
      details: error.message,
    });
  }
});

// Check job status
app.get('/api/audits/jobs/:jobId', async (req, res) => {
  try {
    const job = await auditQueue.getJob(req.params.jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    const state = await job.getState();
    const progress = job.progress;
    
    res.json({
      id: job.id,
      state,
      progress,
      data: job.data,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get job status', details: error.message });
  }
});

// Get anonymous audit results with enhanced scoring
app.get('/api/audits/anonymous/:jobId/results', async (req, res) => {
  try {
    const job = await auditQueue.getJob(req.params.jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    const state = await job.getState();
    
    // Job not completed yet
    if (state !== 'completed') {
      return res.status(202).json({
        status: state,
        progress: job.progress,
        message: state === 'active' 
          ? 'Audit is in progress' 
          : state === 'waiting' 
            ? 'Audit is queued' 
            : `Audit status: ${state}`,
      });
    }
    
    // Job completed - fetch full report with enhanced scoring
    const returnvalue = job.returnvalue as any;
    
    if (!returnvalue?.auditReportId) {
      return res.status(500).json({ error: 'Audit completed but report ID not found' });
    }
    
    const report = await prisma.auditReport.findUnique({
      where: { id: returnvalue.auditReportId },
      include: {
        issues: {
          orderBy: { severity: 'asc' },
        },
        pages: {
          select: {
            id: true,
            url: true,
            title: true,
            description: true,
            statusCode: true,
            loadTime: true,
            lcp: true,
            cls: true,
            fid: true,
            wordCount: true,
            imageCount: true,
            linkCount: true,
            h1Count: true,
          },
        },
      },
    });
    
    if (!report) {
      return res.status(404).json({ error: 'Audit report not found' });
    }
    
    // Return enhanced audit results with scoring
    const checks = Array.isArray(returnvalue?.checks) ? returnvalue.checks : [];
    const sectionScores = Array.isArray(returnvalue?.sectionScores) ? returnvalue.sectionScores : [];
    const sections = ['seo', 'technology', 'performance', 'ui', 'links', 'geo'].map((section) => ({
      section,
      score: sectionScores.find((entry: any) => entry.section === section)?.score ?? null,
      checks: checks.filter((check: any) => check.section === section),
    }));

    res.json({
      id: report.id,
      jobId: report.jobId,
      url: report.url,
      status: report.status,
      pagesAnalyzed: report.pagesAnalyzed,

      // Seoptimer-style primary payload
      audit: {
        score: report.overallScore,
        grade: report.overallGrade,
        sections,
        checks,
      },
      
      // Enhanced scoring
      scoring: {
        overall: {
          score: report.overallScore,
          grade: report.overallGrade,
          tier: report.overallTier,
        },
        categories: {
          technical: {
            score: report.technicalScore,
            grade: report.technicalGrade,
            tier: report.technicalTier,
          },
          onPage: {
            score: report.onPageScore,
            grade: report.onPageGrade,
            tier: report.onPageTier,
          },
          performance: {
            score: report.performanceScore,
            grade: report.performanceGrade,
            tier: report.performanceTier,
          },
          accessibility: {
            score: report.accessibilityScore,
            grade: report.accessibilityGrade,
            tier: report.accessibilityTier,
          },
          links: {
            score: report.linkScore,
            grade: report.linkGrade,
            tier: report.linkTier,
          },
          structuredData: {
            score: report.structuredDataScore,
            grade: report.structuredDataGrade,
            tier: report.structuredDataTier,
          },
          security: {
            score: report.securityScore,
            grade: report.securityGrade,
            tier: report.securityTier,
          },
        },
      },
      
      // Summary from job returnvalue (includes insights and breakdowns)
      summary: returnvalue.scoreSummary || null,
      
      // Category details from returnvalue
      categoryDetails: returnvalue.categoryScores || [],

      // Canonical checks for normalized scoring model
      checks,
      sections,
      sectionScores,
      
      // Issues and positive findings
      issues: report.issues,
      passingChecks: report.passingChecks as any[] || [],
      
      // Pages analyzed
      pages: report.pages,
      
      // Metadata
      createdAt: report.createdAt,
      completedAt: report.completedAt,
    });
  } catch (error: any) {
    console.error('Failed to get anonymous audit results:', error);
    res.status(500).json({ 
      error: 'Failed to fetch audit results', 
      details: error.message 
    });
  }
});

// ============================================
// AUDIT REPORT ROUTES
// ============================================

// Get all audit reports (with pagination)
app.get('/api/reports', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const userId = req.query.userId as string;
    
    const skip = (page - 1) * limit;
    
    const where: any = {};
    if (status) where.status = status.toUpperCase();
    if (userId) where.userId = userId;
    
    const [reports, total] = await Promise.all([
      prisma.auditReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              issues: true,
              // TODO: Re-enable when recommendations are reimplemented
              // recommendations: true,
              pages: true,
            },
          },
        },
      }),
      prisma.auditReport.count({ where }),
    ]);
    
    res.json({
      data: reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch audit reports', details: error.message });
  }
});

// Get a specific audit report by ID
app.get('/api/reports/:id', async (req, res) => {
  try {
    const report = await prisma.auditReport.findUnique({
      where: { id: req.params.id },
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
        user: {
          select: {
            id: true,
            email: true,
            tier: true,
          },
        },
      },
    });
    
    if (!report) {
      return res.status(404).json({ error: 'Audit report not found' });
    }
    
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch audit report', details: error.message });
  }
});

// Get audit reports for a specific user
app.get('/api/users/:userId/reports', requireAuth, async (req, res) => {
  try {
    if (req.params.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    const [reports, total] = await Promise.all([
      prisma.auditReport.findMany({
        where: { userId: req.params.userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              issues: true,
              // TODO: Re-enable when recommendations are reimplemented
              // recommendations: true,
              pages: true,
            },
          },
        },
      }),
      prisma.auditReport.count({ where: { userId: req.params.userId } }),
    ]);
    
    res.json({
      data: reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch user audit reports', details: error.message });
  }
});

// Delete an audit report
app.delete('/api/reports/:id', async (req, res) => {
  try {
    const report = await prisma.auditReport.findUnique({
      where: { id: req.params.id },
    });
    
    if (!report) {
      return res.status(404).json({ error: 'Audit report not found' });
    }
    
    await prisma.auditReport.delete({
      where: { id: req.params.id },
    });
    
    res.json({ message: 'Audit report deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete audit report', details: error.message });
  }
});

// ============================================
// ISSUES ROUTES
// ============================================

// Get all issues for an audit report
app.get('/api/reports/:reportId/issues', async (req, res) => {
  try {
    const severity = req.query.severity as string;
    const category = req.query.category as string;
    
    const where: any = { auditReportId: req.params.reportId };
    if (severity) where.severity = severity.toUpperCase();
    if (category) where.category = category.toUpperCase();
    
    const issues = await prisma.seoIssue.findMany({
      where,
      orderBy: [
        { severity: 'asc' },
        { impactScore: 'desc' },
      ],
      include: {
        page: {
          select: {
            url: true,
            title: true,
          },
        },
      },
    });
    
    res.json(issues);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch issues', details: error.message });
  }
});

// Get issues by category
app.get('/api/reports/:reportId/issues/category/:category', async (req, res) => {
  try {
    const issues = await prisma.seoIssue.findMany({
      where: {
        auditReportId: req.params.reportId,
        category: req.params.category.toUpperCase() as any,
      },
      orderBy: { severity: 'asc' },
    });
    
    res.json(issues);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch issues by category', details: error.message });
  }
});

// ============================================
// RECOMMENDATIONS ROUTES (Temporarily disabled)
// ============================================

/*
// Get all recommendations for an audit report
app.get('/api/reports/:reportId/recommendations', async (req, res) => {
  try {
    const recommendations = await prisma.recommendation.findMany({
      where: { auditReportId: req.params.reportId },
      orderBy: { priority: 'asc' },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' },
        },
        issue: {
          select: {
            title: true,
            severity: true,
            category: true,
          },
        },
      },
    });
    
    res.json(recommendations);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch recommendations', details: error.message });
  }
});

// Get a specific recommendation with steps
app.get('/api/recommendations/:id', async (req, res) => {
  try {
    const recommendation = await prisma.recommendation.findUnique({
      where: { id: req.params.id },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' },
        },
        issue: true,
      },
    });
    
    if (!recommendation) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }
    
    res.json(recommendation);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch recommendation', details: error.message });
  }
});
*/

// ============================================
// PAGES ROUTES
// ============================================

// Get all pages for an audit report
app.get('/api/reports/:reportId/pages', async (req, res) => {
  try {
    const pages = await prisma.seoPage.findMany({
      where: { auditReportId: req.params.reportId },
      orderBy: { url: 'asc' },
      include: {
        _count: {
          select: { issues: true },
        },
      },
    });
    
    res.json(pages);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch pages', details: error.message });
  }
});

// Get a specific page with cached data
app.get('/api/pages/:id', async (req, res) => {
  try {
    const page = await prisma.seoPage.findUnique({
      where: { id: req.params.id },
      include: {
        issues: {
          orderBy: { severity: 'asc' },
        },
      },
    });
    
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    res.json(page);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch page', details: error.message });
  }
});

// ============================================
// USER ROUTES
// ============================================

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        tier: true,
        auditsUsedThisMonth: true,
        lastResetDate: true,
        createdAt: true,
        _count: {
          select: {
            auditReports: true,
          },
        },
      },
    });
    
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

// Get a specific user
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: {
            auditReports: true,
          },
        },
      },
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch user', details: error.message });
  }
});

// Create a new user
app.post('/api/users', async (req, res) => {
  try {
    const { email, name, tier = 'FREE' } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const user = await prisma.user.create({
      data: {
        email,
        name,
        tier: tier as any,
      },
    });
    
    res.status(201).json(user);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create user', details: error.message });
  }
});

// Update a user
app.patch('/api/users/:id', async (req, res) => {
  try {
    const { tier, auditsUsedThisMonth } = req.body;
    
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(tier && { tier }),
        ...(auditsUsedThisMonth !== undefined && { auditsUsedThisMonth }),
      },
    });
    
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update user', details: error.message });
  }
});

// Delete a user
app.delete('/api/users/:id', async (req, res) => {
  try {
    await prisma.user.delete({
      where: { id: req.params.id },
    });
    
    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete user', details: error.message });
  }
});

// ============================================
// STATISTICS & ANALYTICS
// ============================================

// Get overall statistics
app.get('/api/stats', async (req, res) => {
  try {
    const [
      totalReports,
      completedReports,
      failedReports,
      totalIssues,
      totalUsers,
      cacheStats,
    ] = await Promise.all([
      prisma.auditReport.count(),
      prisma.auditReport.count({ where: { status: 'COMPLETED' } }),
      prisma.auditReport.count({ where: { status: 'FAILED' } }),
      prisma.seoIssue.count(),
      prisma.user.count(),
      getCacheStats(),
    ]);
    
    const issuesByCategory = await prisma.seoIssue.groupBy({
      by: ['category'],
      _count: true,
    });
    
    const issuesBySeverity = await prisma.seoIssue.groupBy({
      by: ['severity'],
      _count: true,
    });
    
    res.json({
      reports: {
        total: totalReports,
        completed: completedReports,
        failed: failedReports,
        processing: totalReports - completedReports - failedReports,
      },
      issues: {
        total: totalIssues,
        byCategory: issuesByCategory,
        bySeverity: issuesBySeverity,
      },
      users: {
        total: totalUsers,
      },
      cache: cacheStats,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch statistics', details: error.message });
  }
});

// Get report statistics by date range
app.get('/api/stats/reports', async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
    
    const reports = await prisma.auditReport.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        createdAt: true,
        status: true,
        overallScore: true,
      },
    });
    
    res.json(reports);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch report statistics', details: error.message });
  }
});

// ============================================
// SCREENSHOT ROUTES
// ============================================

// Capture website screenshots (desktop + mobile)
app.post('/api/screenshots', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    console.log(`📸 Capturing screenshots for: ${url}`);
    
    const screenshots = await captureScreenshots({ 
      url,
      timeout: 15000 
    });
    
    res.json({
      url,
      screenshots: {
        desktop: screenshots.desktop,
        mobile: screenshots.mobile,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Screenshot capture failed:', error);
    res.status(500).json({ 
      error: 'Failed to capture screenshots', 
      details: error.message 
    });
  }
});

// ============================================
// LINK GRAPH ROUTES
// ============================================

// Get internal link graph for an audit report
app.get('/api/reports/:reportId/link-graph', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { maxDepth, format = 'json' } = req.query;
    
    // Fetch the audit report with all pages
    const report = await prisma.auditReport.findUnique({
      where: { id: reportId },
      include: {
        pages: true,
        issues: true,
      },
    });
    
    if (!report) {
      return res.status(404).json({ error: 'Audit report not found' });
    }
    
    if (report.status !== 'COMPLETED') {
      return res.status(400).json({ 
        error: 'Audit report is not completed yet',
        status: report.status 
      });
    }
    
    // Convert database pages to PageData format
    const pages = report.pages.map(page => ({
      url: page.url,
      title: page.title,
      description: page.description,
      statusCode: page.statusCode,
      loadTime: page.loadTime,
      html: '', // HTML not stored in database for link graph
      headings: page.headingsData as any,
      images: page.imagesData as any,
      links: page.linksData as any,
      wordCount: page.wordCount || 0,
      lcp: page.lcp,
      cls: page.cls,
      fid: page.fid,
      canonical: page.canonical,
      robots: page.robots,
      ogImage: page.ogImage,
      hasSchemaOrg: page.hasSchemaOrg,
    }));
    
    // Build site context (computes internalLinkGraph + inboundLinkCount from stored linksData)
    console.log(`🔗 Building link graph for ${pages.length} pages...`);
    const siteContext = await buildSiteContext(pages as any, report.url);
    
    // Generate link graph
    let linkGraph = generateLinkGraph(pages, siteContext);
    
    // Mark nodes with issues
    const pageIssueMap = new Map<string, boolean>();
    for (const issue of report.issues) {
      if (issue.pageUrl) {
        pageIssueMap.set(issue.pageUrl, true);
      }
    }
    
    linkGraph.nodes = linkGraph.nodes.map(node => ({
      ...node,
      hasIssues: pageIssueMap.has(node.url) || false,
    }));
    
    // Filter by depth if requested
    if (maxDepth) {
      const depth = parseInt(maxDepth as string);
      if (!isNaN(depth) && depth > 0) {
        linkGraph = filterLinkGraphByDepth(linkGraph, depth);
      }
    }
    
    // Return in requested format
    if (format === 'dot') {
      const dotContent = exportToDOT(linkGraph);
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="link-graph-${reportId}.dot"`);
      return res.send(dotContent);
    }
    
    if (format === 'csv') {
      const csvContent = exportToCSV(linkGraph);
      return res.json({
        nodes: csvContent.nodes,
        edges: csvContent.edges,
      });
    }
    
    // Default: JSON format
    res.json(linkGraph);
    
  } catch (error: any) {
    console.error('Failed to generate link graph:', error);
    res.status(500).json({ 
      error: 'Failed to generate link graph', 
      details: error.message 
    });
  }
});

// Queue a link graph crawl job
app.post('/api/link-graph/crawl', requireAuth, async (req, res) => {
  try {
    const { url, depth, options } = req.body;

    // Validate required fields
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!depth || typeof depth !== 'number') {
      return res.status(400).json({ error: 'Depth is required and must be a number' });
    }

    // Validate depth range
    if (depth < 1 || depth > 5) {
      return res.status(400).json({ 
        error: 'Depth must be between 1 and 5',
        provided: depth 
      });
    }

    // Validate URL format
    try {
      const urlObj = new URL(url);
      if (!urlObj.protocol.startsWith('http')) {
        return res.status(400).json({ 
          error: 'URL must use HTTP or HTTPS protocol',
          provided: url
        });
      }
    } catch (error) {
      return res.status(400).json({ 
        error: 'Invalid URL format',
        provided: url
      });
    }

    // Queue the link graph crawl job
    const job = await linkGraphQueue.add('link-graph-crawl', {
      url,
      depth,
      options: options || {},
    });

    res.status(202).json({
      jobId: job.id,
      message: 'Link graph crawl job queued successfully',
      url,
      depth,
      statusUrl: `/api/link-graph/jobs/${job.id}`,
      resultUrl: `/api/link-graph/jobs/${job.id}/result`,
    });

  } catch (error: any) {
    console.error('Failed to queue link graph job:', error);
    res.status(500).json({ 
      error: 'Failed to queue link graph job', 
      details: error.message 
    });
  }
});

// Get link graph job status
app.get('/api/link-graph/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await linkGraphQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const state = await job.getState();
    const progress = job.progress;

    res.json({
      id: job.id,
      state,
      progress,
      data: {
        url: job.data.url,
        depth: job.data.depth,
      },
      finishedOn: job.finishedOn,
      processedOn: job.processedOn,
      failedReason: job.failedReason,
    });
  } catch (error: any) {
    console.error('Failed to get link graph job status:', error);
    res.status(500).json({ 
      error: 'Failed to get job status', 
      details: error.message 
    });
  }
});

// Get link graph job result
app.get('/api/link-graph/jobs/:jobId/result', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await linkGraphQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const state = await job.getState();

    if (state !== 'completed') {
      return res.status(400).json({ 
        error: 'Job not completed yet',
        state,
        message: state === 'failed' 
          ? `Job failed: ${job.failedReason}` 
          : `Job is currently ${state}. Please check status endpoint.`
      });
    }

    // Return the link graph result
    res.json(job.returnvalue);

  } catch (error: any) {
    console.error('Failed to get link graph job result:', error);
    res.status(500).json({ 
      error: 'Failed to get job result', 
      details: error.message 
    });
  }
});

// Stream real-time progress for a link graph job via SSE
app.get('/api/link-graph/jobs/:jobId/stream', async (req, res) => {
  const { jobId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (type: string, data: object) =>
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);

  // Check current state first so clients joining late get immediate feedback
  const job = await linkGraphQueue.getJob(jobId);
  if (!job) {
    sendEvent('error', { message: 'Job not found' });
    return res.end();
  }

  const currentState = await job.getState();
  sendEvent('state', { state: currentState, progress: job.progress });

  if (currentState === 'completed' || currentState === 'failed') {
    return res.end();
  }

  const queueEvents = new QueueEvents('link-graph-crawl', { connection: redisConnection });

  queueEvents.on('progress', ({ jobId: id, data }: { jobId: string; data: unknown }) => {
    if (id === jobId) sendEvent('progress', { data });
  });

  queueEvents.on('completed', ({ jobId: id }: { jobId: string }) => {
    if (id === jobId) {
      sendEvent('completed', {});
      res.end();
      queueEvents.close();
    }
  });

  queueEvents.on('failed', ({ jobId: id, failedReason }: { jobId: string; failedReason: string }) => {
    if (id === jobId) {
      sendEvent('failed', { reason: failedReason });
      res.end();
      queueEvents.close();
    }
  });

  req.on('close', () => queueEvents.close());
});

// Find all pages in a completed link graph crawl that link to a given target URL
app.get('/api/link-graph/jobs/:jobId/connected-pages', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { targetUrl } = req.query;

    if (!targetUrl || typeof targetUrl !== 'string') {
      return res.status(400).json({ error: 'targetUrl query param is required' });
    }

    const job = await linkGraphQueue.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const state = await job.getState();
    if (state !== 'completed') {
      return res.status(400).json({
        error: 'Job not completed yet',
        state,
        message: state === 'failed'
          ? `Job failed: ${job.failedReason}`
          : `Job is currently ${state}. Please check status endpoint.`,
      });
    }

    const result = job.returnvalue as LinkGraphCrawlResult;
    const connected = findConnectedPages(result.links, targetUrl);
    res.json(connected);
  } catch (error: any) {
    console.error('Failed to get connected pages:', error);
    res.status(500).json({ error: 'Failed to get connected pages', details: error.message });
  }
});

// ============================================
// AI CHAT ROUTES
// ============================================

app.use('/api', chatRoutes);

// ============================================
// PRICING
// ============================================

// Returns the public pricing table — frontend uses this to display costs
// before the user submits a job.
app.get('/api/pricing', (_req, res) => {
  res.json({
    credits: {
      audit: {
        single: AUDIT_SINGLE_COST,
        example: calculateAuditCost('single'),
      },
      linkGraph: {
        base: LINK_GRAPH_BASE_COST,
        per100Pages: LINK_GRAPH_PER_100_PAGES,
        examples: {
          pages100: calculateLinkGraphCost(100),
          pages500: calculateLinkGraphCost(500),
          pages1000: calculateLinkGraphCost(1000),
        },
      },
      chatMessage: CHAT_MESSAGE_COST,
      screenshot: SCREENSHOT_COST,
    },
  });
});

// ============================================
// HEALTH & INFO
// ============================================

app.get('/', (req, res) => {
  res.json({
    message: 'Website Audit Tools API',
    version: '1.0.0',
    endpoints: {
      audits: '/api/audits',
      anonymousAudits: '/api/audits/anonymous',
      reports: '/api/reports',
      users: '/api/users',
      stats: '/api/stats',
      screenshots: '/api/screenshots',
      chat: '/api/reports/:reportId/chat',
    },
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await auditQueue.close();
  await auditWorker.close();
  process.exit(0);
});
