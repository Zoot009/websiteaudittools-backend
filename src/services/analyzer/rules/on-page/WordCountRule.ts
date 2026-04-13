/**
 * Check if page has sufficient content (thin content check)
 */

import type { PageRule, PageData, SiteContext, RuleResult } from '../../types.js';

export class WordCountRule implements PageRule {
  code = 'WORD_COUNT';
  category = 'ON_PAGE' as const;
  level = 'page' as const;

  private readonly THIN_CONTENT_THRESHOLD = 300;
  private readonly GOOD_CONTENT_THRESHOLD = 600;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues = [];
    const passingChecks = [];

    const wordCount = page.wordCount || 0;

    if (wordCount < this.THIN_CONTENT_THRESHOLD) {
      issues.push({
        category: this.category,
        type: 'THIN_CONTENT',
        title: 'Thin Content Detected',
        description: `Page has only ${wordCount} words. Pages with less than ${this.THIN_CONTENT_THRESHOLD} words may be considered thin content by search engines.`,
        severity: 'MEDIUM' as const,
        impactScore: 20,
        pageUrl: page.url,
      });
    } else if (wordCount >= this.GOOD_CONTENT_THRESHOLD) {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'Substantial Content',
        description: `Page has ${wordCount} words of content`,
        pageUrl: page.url,
        goodPractice:
          'Comprehensive content (600+ words) tends to rank better and provides more value to users.',
      });
    } else {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'Adequate Content',
        description: `Page has ${wordCount} words of content`,
        pageUrl: page.url,
        goodPractice: 'Pages with 300+ words generally avoid thin content penalties.',
      });
    }

    return { issues, passingChecks };
  }
}
