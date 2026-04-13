/**
 * Check if charset is UTF-8
 */

import type { PageRule, PageData, SiteContext, RuleResult } from '../../types.js';

export class CharsetRule implements PageRule {
  code = 'CHARSET_UTF8';
  category = 'TECHNICAL' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues = [];
    const passingChecks = [];

    const charset = page.charset?.toUpperCase();

    if (!charset) {
      issues.push({
        category: this.category,
        type: 'MISSING_CHARSET',
        title: 'Missing Charset Declaration',
        description: `Page "${page.url}" has no charset declaration. UTF-8 is recommended for proper character encoding.`,
        severity: 'LOW' as const,
        impactScore: 5,
        pageUrl: page.url,
        elementSelector: 'meta[charset]',
      });
    } else if (charset !== 'UTF-8') {
      issues.push({
        category: this.category,
        type: 'NON_UTF8_CHARSET',
        title: 'Non-UTF-8 Charset',
        description: `Page uses "${charset}" instead of UTF-8. UTF-8 is the recommended charset for web pages.`,
        severity: 'LOW' as const,
        impactScore: 3,
        pageUrl: page.url,
        elementSelector: 'meta[charset]',
      });
    } else {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'UTF-8 Charset Declared',
        description: 'Page uses UTF-8 character encoding',
        pageUrl: page.url,
        goodPractice: 'UTF-8 ensures proper display of international characters and special symbols.',
      });
    }

    return { issues, passingChecks };
  }
}
