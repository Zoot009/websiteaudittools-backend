/**
 * Check for excessive iframe usage
 */

import type { PageRule, PageData, SiteContext, RuleResult } from '../../types.js';

export class IFrameUsageRule implements PageRule {
  code = 'IFRAME_USAGE';
  category = 'ACCESSIBILITY' as const;
  level = 'page' as const;

  private readonly EXCESSIVE_THRESHOLD = 3;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues = [];
    const passingChecks = [];

    const iframeCount = page.iframeCount || 0;

    if (iframeCount >= this.EXCESSIVE_THRESHOLD) {
      issues.push({
        category: this.category,
        type: this.code,
        title: 'Excessive IFrame Usage',
        description: `Page has ${iframeCount} iframes. Excessive iframes can slow page load and hurt SEO. Consider alternatives.`,
        severity: 'LOW' as const,
        impactScore: 8,
        pageUrl: page.url,
        elementSelector: 'iframe',
      });
    } else if (iframeCount === 0) {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'No IFrames',
        description: 'Page does not use iframes',
        pageUrl: page.url,
        goodPractice: 'Avoiding iframes improves page performance and search engine crawlability.',
      });
    } else {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'Minimal IFrame Usage',
        description: `Page has ${iframeCount} iframe(s) (reasonable amount)`,
        pageUrl: page.url,
        goodPractice: 'Limited iframe usage is acceptable for embedded content like videos or maps.',
      });
    }

    return { issues, passingChecks };
  }
}
