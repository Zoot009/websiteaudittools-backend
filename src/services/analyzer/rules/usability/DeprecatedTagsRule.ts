/**
 * Check for deprecated HTML tags
 */

import type { PageRule, PageData, SiteContext, RuleResult } from '../../types.js';

export class DeprecatedTagsRule implements PageRule {
  code = 'DEPRECATED_TAGS';
  category = 'TECHNICAL' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues = [];
    const passingChecks = [];

    const deprecatedCount = page.deprecatedTagsCount || 0;

    if (deprecatedCount > 0) {
      issues.push({
        category: this.category,
        type: this.code,
        title: 'Deprecated HTML Tags',
        description: `Page uses ${deprecatedCount} deprecated HTML tag(s) (e.g., <font>, <center>, <marquee>). Use modern HTML5 and CSS instead.`,
        severity: 'MEDIUM' as const,
        impactScore: 10,
        pageUrl: page.url,
      });
    } else {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'No Deprecated Tags',
        description: 'Page uses modern HTML without deprecated tags',
        pageUrl: page.url,
        goodPractice:
          'Modern HTML ensures better browser compatibility and follows current web standards.',
      });
    }

    return { issues, passingChecks };
  }
}
