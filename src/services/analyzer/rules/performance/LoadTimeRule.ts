/**
 * Check page load time
 */

import type { PageRule, PageData, SiteContext, RuleResult } from '../../types.js';

export class LoadTimeRule implements PageRule {
  code = 'LOAD_TIME';
  category = 'PERFORMANCE' as const;
  level = 'page' as const;

  private readonly GOOD_THRESHOLD = 2000; // 2 seconds
  private readonly POOR_THRESHOLD = 4000; // 4 seconds

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues = [];
    const passingChecks = [];

    const loadTime = page.loadTime;

    if (loadTime >= this.POOR_THRESHOLD) {
      issues.push({
        category: this.category,
        type: 'SLOW_LOAD_TIME',
        title: 'Slow Page Load Time',
        description: `Page took ${(loadTime / 1000).toFixed(2)}s to load (should be <2s). Slow pages frustrate users and hurt SEO.`,
        severity: 'HIGH' as const,
        impactScore: 25,
        pageUrl: page.url,
      });
    } else if (loadTime >= this.GOOD_THRESHOLD) {
      issues.push({
        category: this.category,
        type: 'MODERATE_LOAD_TIME',
        title: 'Moderate Page Load Time',
        description: `Page took ${(loadTime / 1000).toFixed(2)}s to load. Consider optimizing to reach <2s.`,
        severity: 'MEDIUM' as const,
        impactScore: 10,
        pageUrl: page.url,
      });
    } else {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'Fast Page Load',
        description: `Page loaded in ${(loadTime / 1000).toFixed(2)}s`,
        pageUrl: page.url,
        goodPractice: 'Fast-loading pages (<2s) provide better user experience and improved SEO.',
      });
    }

    return { issues, passingChecks };
  }
}
