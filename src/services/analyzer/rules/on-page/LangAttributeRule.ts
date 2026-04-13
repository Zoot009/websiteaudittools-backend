/**
 * Check if lang attribute is present on <html> tag
 */

import type { PageRule, PageData, SiteContext, RuleResult } from '../../types.js';

export class LangAttributeRule implements PageRule {
  code = 'LANG_ATTRIBUTE';
  category = 'ON_PAGE' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues = [];
    const passingChecks = [];

    if (!page.langAttr || page.langAttr.trim().length === 0) {
      issues.push({
        category: this.category,
        type: this.code,
        title: 'Missing Lang Attribute',
        description: `Page "${page.url}" is missing a lang attribute on the <html> tag. This helps browsers and assistive technologies.`,
        severity: 'LOW' as const,
        impactScore: 5,
        pageUrl: page.url,
        elementSelector: 'html',
      });
    } else {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'Lang Attribute Present',
        description: `Page declares language as "${page.langAttr}"`,
        pageUrl: page.url,
        goodPractice:
          'The lang attribute helps screen readers pronounce content correctly and aids browser translation features.',
      });
    }

    return { issues, passingChecks };
  }
}
