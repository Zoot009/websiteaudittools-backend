/**
 * Check if pages are blocked by robots.txt
 * CRITICAL: Prevents Google from crawling important pages
 */

import type { SiteRule, PageData, SiteContext, RuleResult, Issue, PassingCheck } from '../../types.js';
import { RobotsTxtParser } from '../../../crawler/robotsTxtParser.js';

export class RobotsTxtBlockingRule implements SiteRule {
  code = 'ROBOTS_TXT_BLOCKING';
  category = 'TECHNICAL' as const;
  level = 'site' as const;

  execute(pages: PageData[], context: SiteContext): RuleResult {
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    const baseUrl = context.baseUrl;

    // Check if robots.txt exists in context
    if (!context.robotsTxt) {
      // No robots.txt - this is fine, nothing is blocked
      passingChecks.push({
        category: 'TECHNICAL',
        code: 'no_robots_txt',
        title: 'No robots.txt File',
        description: 'No robots.txt file found. All pages are allowed for crawling by default.',
        pageUrl: baseUrl,
        goodPractice: 'No robots.txt means no unintentional crawl blocks',
      });
      return { issues, passingChecks };
    }

    // Parse robots.txt
    const parser = new RobotsTxtParser();
    parser.parse(context.robotsTxt);

    // Check if entire site is blocked
    if (parser.blocksEntireSite()) {
      issues.push({
        type: 'robots_txt_blocks_entire_site',
        category: 'TECHNICAL',
        title: 'Robots.txt Blocks Entire Site',
        description: 'Your robots.txt file contains "Disallow: /" which blocks search engines from crawling your entire website. This prevents all content from being indexed. Remove this directive unless intentional.',
        severity: 'CRITICAL',
        impactScore: 100,
        pageUrl: baseUrl,
      });
      return { issues, passingChecks };
    }

    // Check each crawled page
    const blockedPages: string[] = [];
    const allowedPages: string[] = [];

    for (const page of pages) {
      const isAllowed = parser.isAllowed(page.url, 'Googlebot');
      
      if (!isAllowed) {
        blockedPages.push(page.url);
      } else {
        allowedPages.push(page.url);
      }
    }

    // Report blocked pages
    if (blockedPages.length > 0) {
      const pageList = blockedPages
        .slice(0, 10)
        .map(url => `• ${url}`)
        .join('\n');
      const morePages = blockedPages.length > 10 ? `\n...and ${blockedPages.length - 10} more` : '';

      issues.push({
        type: 'robots_txt_blocks_pages',
        category: 'TECHNICAL',
        title: `${blockedPages.length} Page${blockedPages.length === 1 ? '' : 's'} Blocked by robots.txt`,
        description: `Your robots.txt file is blocking ${blockedPages.length} of ${pages.length} crawled pages from search engines. Blocked pages cannot be indexed and won't appear in search results.\n\nBlocked pages:\n${pageList}${morePages}\n\nReview your robots.txt file to ensure important pages are not accidentally blocked.`,
        severity: blockedPages.length === pages.length ? 'CRITICAL' : 'HIGH',
        impactScore: blockedPages.length === pages.length ? 100 : 85,
        pageUrl: baseUrl,
      });
    } else {
      // All pages allowed
      passingChecks.push({
        category: 'TECHNICAL',
        code: 'robots_txt_allows_crawling',
        title: 'robots.txt Allows Crawling',
        description: `robots.txt file exists and allows all ${pages.length} crawled pages to be indexed.`,
        pageUrl: baseUrl,
        goodPractice: 'robots.txt is properly configured to allow important pages',
      });
    }

    // Check for common problematic patterns
    const disallowedPatterns = parser.getDisallowedPatterns('Googlebot');
    const problematicPatterns = [
      { pattern: '/wp-admin', severity: 'LOW', message: '/wp-admin is blocked (this is normal for WordPress)' },
      { pattern: '/wp-includes', severity: 'LOW', message: '/wp-includes is blocked (this is normal for WordPress)' },
      { pattern: '/admin', severity: 'LOW', message: '/admin is blocked (this is normal for admin areas)' },
      { pattern: '/wp-content/uploads', severity: 'MEDIUM', message: '/wp-content/uploads is blocked - this blocks images from indexing' },
      { pattern: '/blog', severity: 'HIGH', message: '/blog is blocked - this prevents blog content from being indexed' },
      { pattern: '/products', severity: 'HIGH', message: '/products is blocked - this prevents product pages from being indexed' },
      { pattern: '/category', severity: 'MEDIUM', message: '/category is blocked - category pages won\'t be indexed' },
    ];

    for (const check of problematicPatterns) {
      if (disallowedPatterns.some(p => p.startsWith(check.pattern))) {
        if (check.severity === 'HIGH' || check.severity === 'MEDIUM') {
          issues.push({
            type: 'robots_txt_blocks_important_content',
            category: 'TECHNICAL',
            title: 'robots.txt Blocks Important Content',
            description: check.message,
            severity: check.severity as 'HIGH' | 'MEDIUM',
            impactScore: check.severity === 'HIGH' ? 80 : 60,
            pageUrl: baseUrl,
          });
        }
      }
    }

    return { issues, passingChecks };
  }
}
