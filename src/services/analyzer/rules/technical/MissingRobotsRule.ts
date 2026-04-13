/**
 * Check if robots.txt file exists (site-level check)
 */

import type { SiteRule, PageData, SiteContext, RuleResult } from '../../types.js';

export class MissingRobotsRule implements SiteRule {
  code = 'ROBOTS_TXT';
  category = 'TECHNICAL' as const;
  level = 'site' as const;

  execute(pages: PageData[], context: SiteContext): RuleResult {
    const issues = [];
    const passingChecks = [];

    if (!context.hasRobotsTxt) {
      issues.push({
        category: this.category,
        type: this.code,
        title: 'Robots.txt Not Found',
        description: `No robots.txt file found at "${context.baseUrl}/robots.txt". While not required, robots.txt helps control search engine crawling.`,
        severity: 'LOW' as const,
        impactScore: 10,
        pageUrl: context.baseUrl,
      });
    } else {
      // Check if any pages are blocked
      const blockedPages = pages.filter((page) => context.robotsDisallowed.has(page.url));

      if (blockedPages.length > 0) {
        issues.push({
          category: this.category,
          type: 'ROBOTS_BLOCKING_PAGES',
          title: 'Robots.txt Blocking Pages',
          description: `Robots.txt is blocking ${blockedPages.length} page(s) from being crawled: ${blockedPages
            .slice(0, 3)
            .map((p) => p.url)
            .join(', ')}${blockedPages.length > 3 ? '...' : ''}`,
          severity: 'MEDIUM' as const,
          impactScore: 15,
          pageUrl: context.baseUrl,
        });
      } else {
        passingChecks.push({
          category: this.category,
          code: this.code,
          title: 'Robots.txt Present',
          description: 'Robots.txt file is configured and not blocking important pages',
          pageUrl: context.baseUrl,
          goodPractice: 'Robots.txt helps manage search engine crawling and can prevent indexing of sensitive areas.',
        });
      }
    }

    return { issues, passingChecks };
  }
}
