/**
 * Check for excessive inline styles
 */

import type { PageRule, PageData, SiteContext, RuleResult } from '../../types.js';

export class InlineStylesRule implements PageRule {
  code = 'INLINE_STYLES';
  category = 'TECHNICAL' as const;
  level = 'page' as const;

  private readonly EXCESSIVE_THRESHOLD = 20;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues = [];
    const passingChecks = [];

    const inlineStylesCount = page.inlineStylesCount || 0;

    if (inlineStylesCount >= this.EXCESSIVE_THRESHOLD) {
      issues.push({
        category: this.category,
        type: this.code,
        title: 'Excessive Inline Styles',
        description: `Page has ${inlineStylesCount} inline style attributes. Move styles to external CSS for better performance and maintainability.`,
        severity: 'LOW' as const,
        impactScore: 5,
        pageUrl: page.url,
        elementSelector: '[style]',
      });
    } else if (inlineStylesCount === 0) {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'No Inline Styles',
        description: 'Page does not use inline styles',
        pageUrl: page.url,
        goodPractice: 'External CSS is cacheable, maintainable, and improves page load performance.',
      });
    } else {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'Minimal Inline Styles',
        description: `Page has ${inlineStylesCount} inline styles (within acceptable limits)`,
        pageUrl: page.url,
        goodPractice: 'Limited inline styles are acceptable for dynamic or component-specific styling.',
      });
    }

    return { issues, passingChecks };
  }
}
