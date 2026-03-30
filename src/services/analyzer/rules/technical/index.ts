import type { AuditRule, RuleContext, SeoIssue, FixRecommendation } from '../../types';
import * as cheerio from 'cheerio';

/**
 * Rule: Missing viewport meta tag
 * Severity: HIGH
 * Category: Technical
 */
export const missingViewportRule: AuditRule = {
  code: 'MISSING_VIEWPORT',
  name: 'Missing viewport meta tag',
  category: 'TECHNICAL',
  severity: 'HIGH',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page } = context;
    const issues: SeoIssue[] = [];
    
    // Parse HTML to check for viewport tag
    try {
      const $ = cheerio.load(page.html);
      const viewportTag = $('meta[name="viewport"]');
      
      if (viewportTag.length === 0) {
        issues.push({
          category: 'TECHNICAL',
          type: 'missing_viewport',
          title: 'Missing Viewport Meta Tag',
          description: 'This page does not have a viewport meta tag, which is critical for mobile usability and mobile-first indexing.',
          severity: 'HIGH',
          impactScore: 85,
          pageUrl: page.url,
          elementSelector: 'meta[name="viewport"]',
        });
      }
    } catch (error) {
      // If HTML parsing fails, skip this check
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue): FixRecommendation => ({
    title: 'Add viewport meta tag',
    whyItMatters: 'The viewport tag controls how your page is displayed on mobile devices. Without it, mobile users see a desktop layout that is hard to use, directly impacting mobile rankings.',
    howToFix: [
      'Add this meta tag to the <head> section: <meta name="viewport" content="width=device-width, initial-scale=1">',
      'Test the page on mobile devices after adding.',
      'Ensure your CSS is responsive and adapts to different screen sizes.',
    ],
    estimatedEffort: 'low',
    priority: 9,
  }),
};

/**
 * Rule: Page too heavy
 * Severity: MEDIUM
 * Category: Performance
 */
export const pageTooHeavyRule: AuditRule = {
  code: 'PAGE_TOO_HEAVY',
  name: 'Page too heavy',
  category: 'PERFORMANCE',
  severity: 'MEDIUM',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page } = context;
    const issues: SeoIssue[] = [];
    
    // Check HTML size (threshold: 1MB)
    const htmlSizeKB = Buffer.byteLength(page.html, 'utf8') / 1024;
    
    if (htmlSizeKB > 1024) {
      issues.push({
        category: 'PERFORMANCE',
        type: 'page_too_heavy',
        title: 'Page HTML Too Large',
        description: `The page HTML is ${htmlSizeKB.toFixed(0)}KB, which may slow down loading. Optimize to reduce page weight.`,
        severity: 'MEDIUM',
        impactScore: 60,
        pageUrl: page.url,
      });
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue, context: RuleContext): FixRecommendation => {
    const htmlSizeKB = Buffer.byteLength(context.page.html, 'utf8') / 1024;
    
    return {
      title: 'Reduce page weight',
      whyItMatters: 'Large pages take longer to load, negatively impacting Core Web Vitals, user experience, and mobile performance.',
      howToFix: [
        `Reduce HTML size from ${htmlSizeKB.toFixed(0)}KB.`,
        'Minify HTML, CSS, and JavaScript.',
        'Remove unnecessary inline styles or scripts.',
        'Defer or lazy-load non-critical resources.',
        'Consider server-side rendering or static generation.',
      ],
      estimatedEffort: 'medium',
      priority: 6,
    };
  },
};

/**
 * Rule: Slow load time
 * Severity: MEDIUM to HIGH
 * Category: Performance
 */
export const slowLoadTimeRule: AuditRule = {
  code: 'SLOW_LOAD_TIME',
  name: 'Very slow server response',
  category: 'PERFORMANCE',
  severity: 'MEDIUM',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page } = context;
    const issues: SeoIssue[] = [];
    
    // Threshold: 3 seconds for medium, 5 seconds for high severity
    if (page.loadTime > 3000) {
      const severity = page.loadTime > 5000 ? 'HIGH' : 'MEDIUM';
      
      issues.push({
        category: 'PERFORMANCE',
        type: 'slow_load_time',
        title: 'Slow Page Load Time',
        description: `This page took ${(page.loadTime / 1000).toFixed(2)} seconds to load. Pages should load in under 3 seconds for good user experience.`,
        severity: severity as 'HIGH' | 'MEDIUM',
        impactScore: page.loadTime > 5000 ? 75 : 60,
        pageUrl: page.url,
      });
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue, context: RuleContext): FixRecommendation => ({
    title: 'Improve page speed',
    whyItMatters: 'Slow load times directly impact Core Web Vitals, SEO rankings, and user satisfaction. Pages that load slowly have higher bounce rates.',
    howToFix: [
      `Reduce load time from ${(context.page.loadTime / 1000).toFixed(2)} seconds to under 3 seconds.`,
      'Optimize images and use modern formats (WebP, AVIF).',
      'Enable server-side caching and compression (gzip/brotli).',
      'Minimize and defer JavaScript execution.',
      'Use a CDN to serve static assets.',
      'Implement lazy loading for images and videos.',
    ],
    estimatedEffort: 'high',
    priority: 8,
  }),
};

/**
 * Rule: Missing robots.txt
 * Severity: MEDIUM
 * Category: Technical
 */
export const missingRobotsTxtRule: AuditRule = {
  code: 'MISSING_ROBOTS_TXT',
  name: 'Missing robots.txt file',
  category: 'TECHNICAL',
  severity: 'MEDIUM',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { siteContext } = context;
    const issues: SeoIssue[] = [];
    
    // Only check on first page (site-wide issue)
    if (context.page.url === siteContext.baseUrl && !siteContext.hasRobotsTxt) {
      issues.push({
        category: 'TECHNICAL',
        type: 'missing_robots_txt',
        title: 'Missing robots.txt File',
        description: 'Your website does not have a robots.txt file. This file helps search engines understand which pages to crawl and where to find your sitemap.',
        severity: 'MEDIUM',
        impactScore: 45,
        pageUrl: siteContext.baseUrl,
      });
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue, context: RuleContext): FixRecommendation => ({
    title: 'Create a robots.txt file',
    whyItMatters: 'The robots.txt file tells search engines which pages they can crawl. It also points to your XML sitemap, helping search engines discover all your pages.',
    howToFix: [
      'Create a robots.txt file at the root of your domain: /robots.txt',
      'Add basic directives: User-agent: * and Allow: /',
      'Include your sitemap location: Sitemap: https://yourdomain.com/sitemap.xml',
      'Block admin/private pages if needed (e.g., Disallow: /admin/)',
      'Test with Google Search Console Robots Testing Tool',
    ],
    estimatedEffort: 'low',
    priority: 5,
  }),
};

/**
 * Rule: Missing XML sitemap
 * Severity: MEDIUM
 * Category: Technical
 */
export const missingXmlSitemapRule: AuditRule = {
  code: 'MISSING_XML_SITEMAP',
  name: 'Missing XML sitemap',
  category: 'TECHNICAL',
  severity: 'MEDIUM',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { siteContext } = context;
    const issues: SeoIssue[] = [];
    
    // Only check on first page (site-wide issue)
    if (context.page.url === siteContext.baseUrl) {
      const hasSitemap = siteContext.sitemapUrls && siteContext.sitemapUrls.size > 0;
      
      if (!hasSitemap) {
        issues.push({
          category: 'TECHNICAL',
          type: 'missing_xml_sitemap',
          title: 'Missing XML Sitemap',
          description: 'No XML sitemap was found for this website. Sitemaps help search engines discover and index all your pages efficiently.',
          severity: 'MEDIUM',
          impactScore: 55,
          pageUrl: siteContext.baseUrl,
        });
      }
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue, context: RuleContext): FixRecommendation => ({
    title: 'Create and submit an XML sitemap',
    whyItMatters: 'XML sitemaps help search engines discover all your important pages, especially on larger sites. They improve indexing speed and ensure nothing gets missed.',
    howToFix: [
      'Generate an XML sitemap (use your CMS plugin or online generator)',
      'Upload it to your root directory: /sitemap.xml',
      'Add the sitemap location to robots.txt: Sitemap: https://yourdomain.com/sitemap.xml',
      'Submit your sitemap to Google Search Console and Bing Webmaster Tools',
      'Keep the sitemap updated automatically (ideally after content changes)',
      'Include only canonical URLs (avoid redirects and blocked pages)',
    ],
    estimatedEffort: 'low',
    priority: 6,
  }),
};

/**
 * Rule: Missing HTTP/2
 * Severity: LOW
 * Category: Performance
 */
export const missingHttp2Rule: AuditRule = {
  code: 'MISSING_HTTP2',
  name: 'Not using HTTP/2 protocol',
  category: 'PERFORMANCE',
  severity: 'LOW',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page } = context;
    const issues: SeoIssue[] = [];
    
    // Check if URL uses HTTPS (prerequisite for HTTP/2)
    const isHttps = page.url.startsWith('https://');
    
    // If not HTTPS, definitely not HTTP/2
    if (!isHttps) {
      issues.push({
        category: 'PERFORMANCE',
        type: 'missing_http2',
        title: 'Not Using HTTP/2 Protocol',
        description: 'Your site is not using HTTP/2, which provides faster loading through multiplexing and header compression. Upgrade to HTTP/2 for better performance.',
        severity: 'LOW',
        impactScore: 30,
        pageUrl: page.url,
      });
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue): FixRecommendation => ({
    title: 'Enable HTTP/2 protocol',
    whyItMatters: 'HTTP/2 significantly improves page load speed through multiplexing (parallel requests), header compression, and server push. This leads to better Core Web Vitals scores.',
    howToFix: [
      'Ensure your site uses HTTPS (HTTP/2 requires SSL/TLS)',
      'Check if your web server supports HTTP/2 (Apache 2.4.17+, Nginx 1.9.5+, IIS 10+)',
      'Enable HTTP/2 in your server configuration',
      'For Apache: mod_http2 module',
      'For Nginx: listen 443 ssl http2;',
      'Test with online tools to verify HTTP/2 is active',
    ],
    estimatedEffort: 'medium',
    priority: 3,
  }),
};

// Export all technical rules
export const technicalRules = [
  missingViewportRule,
  pageTooHeavyRule,
  slowLoadTimeRule,
  missingRobotsTxtRule,
  missingXmlSitemapRule,
  missingHttp2Rule,
];
