/**
 * Check for Flash usage (deprecated technology)
 */

import type { PageRule, PageData, SiteContext, RuleResult } from '../../types.js';

export class FlashUsageRule implements PageRule {
  code = 'FLASH_USAGE';
  category = 'PERFORMANCE' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues = [];
    const passingChecks = [];

    const flashCount = page.flashCount || 0;

    if (flashCount > 0) {
      issues.push({
        category: this.category,
        type: this.code,
        title: 'Flash Content Detected',
        description: `Page contains ${flashCount} Flash object(s). Flash is deprecated and not supported by modern browsers. Replace with HTML5.`,
        severity: 'CRITICAL' as const,
        impactScore: 40,
        pageUrl: page.url,
        elementSelector: 'object[type*="flash"], embed[type*="flash"]',
      });
    } else {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'No Flash Content',
        description: 'Page does not use deprecated Flash technology',
        pageUrl: page.url,
        goodPractice:
          'Avoiding Flash ensures compatibility with modern browsers and mobile devices.',
      });
    }

    return { issues, passingChecks };
  }
}
