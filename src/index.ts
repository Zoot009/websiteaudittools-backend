import express from 'express';
import { auditQueue } from './queues/auditQueue.js';
import { auditWorker } from './workers/auditWorker.js';
import { prisma } from '../lib/prisma.js';
import { getCacheStats } from './services/crawler/crawlCache.js';
import 'dotenv/config';

const app = express();
const port = process.env.PORT || 3000;

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
