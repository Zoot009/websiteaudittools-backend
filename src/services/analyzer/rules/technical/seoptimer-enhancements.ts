/**
 * Technical SEO Enhancement Rules
 * Rules for mobile, robots.txt, sitemaps, and other technical aspects
 */

import type { AuditRule, RuleContext, SeoIssue, FixRecommendation } from '../../types';
import * as cheerio from 'cheerio';

/**
 * Rule: Mobile Viewport Check
 * Severity: HIGH (critical for mobile SEO)
 * Category: Technical
 */
export const mobileViewportRule: AuditRule = {
  code: 'MOBILE_VIEWPORT',
  name: 'Mobile viewport configuration',
  category: 'TECHNICAL',
  severity: 'HIGH',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page } = context;
    const issues: SeoIssue[] = [];
    
    try {
      const $ = cheerio.load(page.html);
      
      // Check for viewport meta tag
      const viewport = $('meta[name="viewport"]').attr('content');
      
      if (!viewport) {
        issues.push({
          category: 'TECHNICAL',
          type: 'missing_viewport',
          title: 'Missing Mobile Viewport Tag',
          description: 'Your page does not specify a viewport meta tag. This causes poor rendering on mobile devices and hurts mobile SEO.',
          severity: 'HIGH',
          impactScore: 85,
          pageUrl: page.url,
        });
      } else {
        // Check if viewport is properly configured
        const hasWidthDevice = viewport.includes('width=device-width');
        const hasInitialScale = viewport.includes('initial-scale=1');
        
        if (hasWidthDevice && hasInitialScale) {
          // Viewport is properly configured - return empty to trigger passing check
          return [];
        } else {
          issues.push({
            category: 'TECHNICAL',
            type: 'viewport_misconfigured',
            title: 'Viewport Tag May Be Misconfigured',
            description: `Your viewport tag is present but may not be optimal: "${viewport}". Recommended: width=device-width, initial-scale=1`,
            severity: 'MEDIUM',
            impactScore: 50,
            pageUrl: page.url,
          });
        }
      }
    } catch (error) {
      // Skip if parsing fails
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue): FixRecommendation => ({
    title: 'Add proper viewport meta tag',
    whyItMatters: 'The viewport meta tag controls how your page is displayed on mobile devices. Without it, mobile browsers will render your page at desktop width and scale it down, making it difficult to read. Google uses mobile-first indexing, so mobile optimization is critical for SEO.',
    howToFix: [
      'Add this meta tag to your page\'s <head> section:',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      'This tells mobile browsers to match the screen width and start at 100% zoom',
      'Test your page on mobile devices or using Chrome DevTools mobile emulation',
      'Ensure your CSS is responsive and adapts to different screen sizes',
      'Avoid setting maximum-scale or user-scalable=no (accessibility issue)',
    ],
    estimatedEffort: 'low',
    priority: 9,
  }),
};

/**
 * Rule: Robots.txt Detection
 * Severity: INFO to MEDIUM
 * Category: Crawlability
 */
export const robotsTxtRule: AuditRule = {
  code: 'ROBOTS_TXT',
  name: 'Robots.txt file check',
  category: 'TECHNICAL',
  severity: 'LOW',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page, siteContext } = context;
    const issues: SeoIssue[] = [];
    
    // Only check on the first page or homepage
    const isHomepage = page.url === siteContext.baseUrl || 
                       page.url === siteContext.baseUrl + '/' ||
                       page.url === new URL(siteContext.baseUrl).origin + '/';
    
    if (!isHomepage) {
      return issues;
    }
    
    // Check if robots.txt presence is detected
    if (siteContext.hasRobotsTxt === true) {
      // Check if current page is blocked
      if (siteContext.robotsDisallowed?.has(page.url)) {
        issues.push({
          category: 'TECHNICAL',
          type: 'blocked_by_robots',
          title: 'Page Blocked by Robots.txt',
          description: 'This page appears to be blocked by your robots.txt file. Search engines cannot crawl or index it.',
          severity: 'HIGH',
          impactScore: 95,
          pageUrl: page.url,
        });
      }
      // Robots.txt present and no blocking issues - return empty to trigger passing check
      return [];
    } else if (siteContext.hasRobotsTxt === false) {
      issues.push({
        category: 'TECHNICAL',
        type: 'robots_txt_missing',
        title: 'No Robots.txt File Detected',
        description: 'Your website does not appear to have a robots.txt file. While not mandatory, it is recommended to guide search engine crawlers.',
        severity: 'LOW',
        impactScore: 20,
        pageUrl: siteContext.baseUrl,
      });
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue): FixRecommendation => {
    if (issue.type === 'blocked_by_robots') {
      return {
        title: 'Remove robots.txt blocking rule',
        whyItMatters: 'If a page is blocked by robots.txt, search engines cannot crawl or index it, making it invisible in search results. This severely impacts SEO.',
        howToFix: [
          'Access your website\'s robots.txt file (yoursite.com/robots.txt)',
          'Find the Disallow rule blocking this page',
          'Remove or modify the rule if you want this page indexed',
          'If using a CMS, check your SEO settings for robots.txt configuration',
          'Test your robots.txt using Google Search Console\'s robots.txt Tester',
          'Wait for search engines to re-crawl your site (may take days/weeks)',
        ],
        estimatedEffort: 'low',
        priority: 10,
      };
    } else {
      return {
        title: 'Create a robots.txt file',
        whyItMatters: 'A robots.txt file helps guide search engine crawlers on how to crawl your site efficiently. It can block low-value pages, protect sensitive areas, and specify your sitemap location.',
        howToFix: [
          'Create a text file named "robots.txt" in your website root directory',
          'Add basic rules: "User-agent: * \\n Allow: /"',
          'Add your sitemap location: "Sitemap: https://yoursite.com/sitemap.xml"',
          'Block admin areas: "Disallow: /admin/"',
          'Block search/filter pages if they create duplicate content',
          'Test using Google Search Console\'s robots.txt Tester tool',
          'Most CMS platforms (WordPress, Shopify) handle this automatically',
        ],
        estimatedEffort: 'low',
        priority: 4,
      };
    }
  },
};

/**
 * Rule: XML Sitemap Detection
 * Severity: LOW to MEDIUM
 * Category: Crawlability
 */
export const xmlSitemapRule: AuditRule = {
  code: 'XML_SITEMAP',
  name: 'XML sitemap check',
  category: 'TECHNICAL',
  severity: 'LOW',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page, siteContext } = context;
    const issues: SeoIssue[] = [];
    
    // Only check on homepage
    const isHomepage = page.url === siteContext.baseUrl || 
                       page.url === siteContext.baseUrl + '/' ||
                       page.url === new URL(siteContext.baseUrl).origin + '/';
    
    if (!isHomepage) {
      return issues;
    }
    
    try {
      const $ = cheerio.load(page.html);
      
      // Check for sitemap in HTML
      const sitemapLinks = $('link[rel="sitemap"]');
      const hasSitemapLink = sitemapLinks.length > 0;
      
      // Check if sitemaps detected in site context
      const hasSitemapUrls = siteContext.sitemapUrls && siteContext.sitemapUrls.size > 0;
      
      if (hasSitemapLink || hasSitemapUrls) {
        // Sitemap detected - return empty to trigger passing check
        return [];
      } else {
        // We can't definitively say there's no sitemap without checking common URLs
        issues.push({
          category: 'TECHNICAL',
          type: 'sitemap_unknown',
          title: 'XML Sitemap Not Detected',
          description: 'No XML sitemap was detected. Sitemaps help search engines discover all your pages and are highly recommended.',
          severity: 'MEDIUM',
          impactScore: 40,
          pageUrl: siteContext.baseUrl,
        });
      }
    } catch (error) {
      // Skip if parsing fails
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue): FixRecommendation => ({
    title: 'Create and submit an XML sitemap',
    whyItMatters: 'XML sitemaps help search engines discover all your pages, especially new or deep pages that might not be easily found through normal crawling. They also provide metadata like last modification date and priority.',
    howToFix: [
      'Generate an XML sitemap for your website:',
      '  - WordPress: Use Yoast SEO or RankMath plugin',
      '  - Other CMS: Check for built-in sitemap functionality',
      '  - Custom sites: Use a sitemap generator tool or library',
      'Place the sitemap at: yoursite.com/sitemap.xml',
      'Add sitemap URL to your robots.txt: "Sitemap: https://yoursite.com/sitemap.xml"',
      'Submit your sitemap to Google Search Console and Bing Webmaster Tools',
      'Update your sitemap regularly (automatically if possible)',
      'For large sites (>50K URLs), split into multiple sitemaps',
    ],
    estimatedEffort: 'low',
    priority: 7,
  }),
};

/**
 * Rule: Favicon Detection
 * Severity: LOW
 * Category: Technical
 */
export const faviconRule: AuditRule = {
  code: 'FAVICON',
  name: 'Favicon check',
  category: 'TECHNICAL',
  severity: 'LOW',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page } = context;
    const issues: SeoIssue[] = [];
    
    try {
      const $ = cheerio.load(page.html);
      
      // Check for favicon
      const faviconLinks = $('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
      
      if (faviconLinks.length > 0) {
        // Favicon found - return empty to trigger passing check
        return [];
      } else {
        issues.push({
          category: 'TECHNICAL',
          type: 'favicon_missing',
          title: 'No Favicon Detected',
          description: 'Your page does not specify a favicon. While not critical for SEO, favicons improve brand recognition and user experience.',
          severity: 'LOW',
          impactScore: 10,
          pageUrl: page.url,
        });
      }
    } catch (error) {
      // Skip if parsing fails
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue): FixRecommendation => ({
    title: 'Add a favicon',
    whyItMatters: 'Favicons appear in browser tabs, bookmarks, and mobile home screens. They improve brand recognition and help users identify your site among many open tabs.',
    howToFix: [
      'Create a favicon image (typically 16x16 or 32x32 pixels)',
      'Save it as favicon.ico or favicon.png',
      'Add to your <head> section: <link rel="icon" type="image/png" href="/favicon.png">',
      'Consider creating multiple sizes for different devices:',
      '  - 16x16 and 32x32 for browsers',
      '  - 180x180 for Apple touch icon',
      '  - 192x192 and 512x512 for Android',
      'Use a favicon generator tool for all sizes automatically',
      'Place favicon files in your website root directory',
    ],
    estimatedEffort: 'low',
    priority: 2,
  }),
};

/**
 * Rule: HTTP/2 Detection
 * Severity: LOW
 * Category: Performance
 */
export const http2Rule: AuditRule = {
  code: 'HTTP2_PROTOCOL',
  name: 'HTTP/2 protocol check',
  category: 'PERFORMANCE',
  severity: 'LOW',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page } = context;
    const issues: SeoIssue[] = [];
    
    // Check if we have protocol information
    // This would need to be added to PageData during crawling
    // For now, we'll check if the site is using HTTPS (prerequisite for HTTP/2)
    
    const isHttps = page.url.startsWith('https://');
    
    if (isHttps) {
      // HTTPS enabled - return empty to trigger passing check
      return [];
    } else {
      issues.push({
        category: 'PERFORMANCE',
        type: 'http2_impossible',
        title: 'Upgrade to HTTPS for HTTP/2',
        description: 'Your site uses HTTP instead of HTTPS. Upgrade to HTTPS to enable HTTP/2 for better performance.',
        severity: 'MEDIUM',
        impactScore: 45,
        pageUrl: page.url,
      });
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue): FixRecommendation => ({
    title: 'Enable HTTP/2',
    whyItMatters: 'HTTP/2 significantly improves page load times through features like multiplexing (multiple requests over one connection), header compression, and server push. It\'s a free performance upgrade.',
    howToFix: [
      'HTTP/2 requires HTTPS - ensure SSL is enabled first',
      'Most modern web servers (Nginx, Apache 2.4+) support HTTP/2',
      'Enable HTTP/2 in your web server configuration',
      'For Nginx: Add "listen 443 ssl http2;" to your server block',
      'For Apache: Enable mod_http2 module',
      'CDNs like Cloudflare enable HTTP/2 automatically',
      'Test if HTTP/2 is enabled: tools.keycdn.com/http2-test',
      'Consider HTTP/3 (QUIC) for even better performance',
    ],
    estimatedEffort: 'low',
    priority: 5,
  }),
};

// Export all technical enhancement rules
export const technicalEnhancementRules: AuditRule[] = [
  mobileViewportRule,
  robotsTxtRule,
  xmlSitemapRule,
  faviconRule,
  http2Rule,
];
