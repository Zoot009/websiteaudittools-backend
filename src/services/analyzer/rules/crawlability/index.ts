import type { AuditRule, RuleContext, SeoIssue, FixRecommendation } from '../../types';

/**
 * Rule: Page returns non-200 status code
 * Severity: HIGH
 * Category: Crawlability
 */
export const pageNon200StatusRule: AuditRule = {
  code: 'PAGE_NON_200_STATUS',
  name: 'Page returns non-200 status',
  category: 'TECHNICAL',
  severity: 'HIGH',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page } = context;
    const issues: SeoIssue[] = [];
    
    if (page.statusCode >= 400) {
      issues.push({
        category: 'TECHNICAL',
        type: 'page_non_200_status',
        title: `Page Returns ${page.statusCode} Error`,
        description: `This page returns a ${page.statusCode} status code. ${
          page.statusCode >= 500 
            ? 'Server errors prevent indexing and harm user experience.' 
            : 'Client errors indicate broken pages that cannot be indexed.'
        }`,
        severity: 'HIGH',
        impactScore: 95,
        pageUrl: page.url,
      });
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue, context: RuleContext): FixRecommendation => {
    const statusCode = context.page.statusCode;
    
    return {
      title: 'Fix broken page',
      whyItMatters: 'Broken pages cannot rank in search engines and waste crawl budget while hurting user experience.',
      howToFix: [
        statusCode === 404 
          ? 'Restore the page or set up a 301 redirect to a relevant alternative page.'
          : statusCode >= 500
          ? 'Investigate server errors in your application logs and fix the underlying issue.'
          : 'Check why this page returns an error and either fix it or redirect it.',
        'Remove internal links pointing to this broken page.',
        'If the page is intentionally removed, ensure proper redirects are in place.',
      ],
      estimatedEffort: 'medium',
      priority: 10,
    };
  },
};

/**
 * Rule: Important page redirects
 * Severity: MEDIUM to HIGH
 * Category: Crawlability
 */
export const pageRedirectsRule: AuditRule = {
  code: 'PAGE_REDIRECTS',
  name: 'Important page redirects',
  category: 'TECHNICAL',
  severity: 'MEDIUM',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page } = context;
    const issues: SeoIssue[] = [];
    
    if (page.statusCode >= 300 && page.statusCode < 400) {
      issues.push({
        category: 'TECHNICAL',
        type: 'page_redirects',
        title: 'Page Is Redirecting',
        description: `This page returns a ${page.statusCode} redirect. Redirects slow crawling and dilute link signals.`,
        severity: 'MEDIUM',
        impactScore: 65,
        pageUrl: page.url,
      });
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue): FixRecommendation => ({
    title: 'Remove or update redirects',
    whyItMatters: 'Too many redirects slow crawling, dilute ranking signals, and hurt user experience. Redirect chains are messy SEO hygiene.',
    howToFix: [
      'Update internal links to point directly to the final destination URL.',
      'If this is an intentional redirect, ensure it\'s a 301 (permanent) for SEO purposes.',
      'Avoid redirect chains - ensure redirects go directly to the final URL.',
      'Remove this redirect entirely if the content can be served directly.',
    ],
    estimatedEffort: 'low',
    priority: 7,
  }),
};

/**
 * Rule: Page marked noindex
 * Severity: HIGH
 * Category: Crawlability
 */
export const pageNoindexRule: AuditRule = {
  code: 'PAGE_NOINDEX',
  name: 'Page marked noindex',
  category: 'TECHNICAL',
  severity: 'HIGH',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page } = context;
    const issues: SeoIssue[] = [];
    
    if (page.robots?.toLowerCase().includes('noindex')) {
      issues.push({
        category: 'TECHNICAL',
        type: 'page_noindex',
        title: 'Page Is Marked Noindex',
        description: `The robots meta tag contains "noindex", which prevents search engines from indexing this page.`,
        severity: 'HIGH',
        impactScore: 90,
        pageUrl: page.url,
        elementSelector: 'meta[name="robots"]',
      });
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue): FixRecommendation => ({
    title: 'Remove noindex directive',
    whyItMatters: 'Pages with noindex will not appear in search results, completely preventing organic traffic to this content.',
    howToFix: [
      'Remove the noindex directive from the robots meta tag if this page should be indexed.',
      'Check server-side rendering or CMS settings that may be adding this tag.',
      'If this page should not be indexed, consider if it should exist at all or be behind authentication.',
    ],
    estimatedEffort: 'low',
    priority: 9,
  }),
};

/**
 * Rule: Canonical points elsewhere
 * Severity: HIGH
 * Category: Crawlability
 */
export const canonicalPointsElsewhereRule: AuditRule = {
  code: 'CANONICAL_POINTS_ELSEWHERE',
  name: 'Canonical points elsewhere',
  category: 'TECHNICAL',
  severity: 'HIGH',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page } = context;
    const issues: SeoIssue[] = [];
    
    if (page.canonical && page.canonical !== page.url) {
      // Normalize URLs for comparison (remove trailing slashes, etc.)
      const normalizeUrl = (url: string) => {
        try {
          const parsed = new URL(url);
          return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, '');
        } catch {
          return url.replace(/\/$/, '');
        }
      };
      
      const normalizedPageUrl = normalizeUrl(page.url);
      const normalizedCanonical = normalizeUrl(page.canonical);
      
      if (normalizedPageUrl !== normalizedCanonical) {
        issues.push({
          category: 'TECHNICAL',
          type: 'canonical_points_elsewhere',
          title: 'Canonical URL Points to Different Page',
          description: `This page's canonical tag points to ${page.canonical} instead of itself. Search engines may treat the other page as the preferred version.`,
          severity: 'HIGH',
          impactScore: 85,
          pageUrl: page.url,
          elementSelector: 'link[rel="canonical"]',
        });
      }
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue, context: RuleContext): FixRecommendation => ({
    title: 'Fix canonical URL',
    whyItMatters: 'When canonical points elsewhere, search engines may not index this page and will treat another page as the preferred version, consolidating ranking signals there.',
    howToFix: [
      `Update the canonical tag to point to this page's own URL if it should be indexed.`,
      'If this is intentionally a duplicate page, ensure the canonical URL is correct and intentional.',
      'Check for dynamic canonical generation logic that may be incorrectly setting this value.',
    ],
    estimatedEffort: 'low',
    priority: 9,
  }),
};

/**
 * Rule: Canonical missing
 * Severity: MEDIUM
 * Category: Crawlability
 */
export const canonicalMissingRule: AuditRule = {
  code: 'CANONICAL_MISSING',
  name: 'Canonical missing',
  category: 'TECHNICAL',
  severity: 'MEDIUM',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page } = context;
    const issues: SeoIssue[] = [];
    
    if (!page.canonical) {
      issues.push({
        category: 'TECHNICAL',
        type: 'canonical_missing',
        title: 'Missing Canonical Tag',
        description: 'This page does not have a canonical URL specified, which can cause duplicate content issues.',
        severity: 'MEDIUM',
        impactScore: 60,
        pageUrl: page.url,
        elementSelector: 'link[rel="canonical"]',
      });
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue): FixRecommendation => ({
    title: 'Add canonical tag',
    whyItMatters: 'Canonical tags help search engines understand which version of a page is the preferred one, preventing duplicate content issues.',
    howToFix: [
      'Add a self-referencing canonical tag to this page.',
      'Ensure all pages have canonical tags pointing to their own URL or the preferred version.',
      'Use consistent URL formatting (with or without trailing slashes, www or non-www).',
    ],
    estimatedEffort: 'low',
    priority: 6,
  }),
};
