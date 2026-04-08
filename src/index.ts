import express from 'express';
import cors from 'cors';
import { auditQueue } from './queues/auditQueue.js';
import { auditWorker } from './workers/auditWorker.js';
import { linkGraphQueue } from './queues/linkGraphQueue.js';
import { linkGraphWorker } from './workers/linkGraphWorker.js';
import { prisma } from '../lib/prisma.js';
import { getCacheStats } from './services/crawler/crawlCache.js';
import { captureScreenshots } from './services/screenshots/screenshotService.js';
import { generateLinkGraph, filterLinkGraphByDepth, exportToDOT, exportToCSV } from './services/linkGraph/linkGraphService.js';
import { buildSiteContext } from './services/analyzer/siteContextBuilder.js';
import chatRoutes from './routes/chatRoutes.js';
import 'dotenv/config';

const app = express();
const port = process.env.PORT || 3000;

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

// Create a new audit job
app.post('/api/audits', async (req, res) => {
  try {
    let { url, userId, mode = 'single', pageLimit, forceRecrawl = false } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // If no userId provided, use the test dev user
    if (!userId) {
      const devUser = await prisma.user.findUnique({
        where: { email: 'dev@example.com' }
      });
      userId = devUser?.id;
      
      if (!userId) {
        return res.status(400).json({ 
          error: 'No userId provided and test user not found. Run: npx prisma db seed' 
        });
      }
    }
    
    // Validate mode
    if (mode !== 'single' && mode !== 'multi') {
      return res.status(400).json({ error: 'Mode must be "single" or "multi"' });
    }
    
    const job = await auditQueue.add('audit-request', {
      url,
      userId,
      clerkId: 'user_test_paid_001',
      mode,
      pageLimit: mode === 'multi' ? (pageLimit || 10) : undefined,
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
              recommendations: true,
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
        recommendations: {
          orderBy: { priority: 'asc' },
          include: {
            steps: {
              orderBy: { stepNumber: 'asc' },
            },
          },
        },
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
app.get('/api/users/:userId/reports', async (req, res) => {
  try {
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
              recommendations: true,
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
// RECOMMENDATIONS ROUTES
// ============================================

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
        clerkId: true,
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
    const { email, clerkId, tier = 'FREE' } = req.body;
    
    if (!email || !clerkId) {
      return res.status(400).json({ error: 'Email and clerkId are required' });
    }
    
    const user = await prisma.user.create({
      data: {
        email,
        clerkId,
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
    
    // Build site context
    console.log(`🔗 Building link graph for ${pages.length} pages...`);
    const siteContext = await buildSiteContext(pages, report.url);
    
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
app.post('/api/link-graph/crawl', async (req, res) => {
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

// ============================================
// AI CHAT ROUTES
// ============================================

app.use('/api', chatRoutes);

// ============================================
// HEALTH & INFO
// ============================================

app.get('/', (req, res) => {
  res.json({
    message: 'Website Audit Tools API',
    version: '1.0.0',
    endpoints: {
      audits: '/api/audits',
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
