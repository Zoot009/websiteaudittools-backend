/**
 * Check if title tag is present and properly sized
 */

import type { PageRule, PageData, SiteContext, RuleResult } from '../../types.js';

export class TitleTagRule implements PageRule {
  code = 'TITLE_TAG';
  category = 'ON_PAGE' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues = [];
    const passingChecks = [];

    if (!page.title || page.title.trim().length === 0) {
      issues.push({
        category: this.category,
        type: 'MISSING_TITLE',
        title: 'Missing Title Tag',
        description: `Page "${page.url}" has no title tag. Title tags are critical for SEO and appear  in search results.`,
        severity: 'CRITICAL' as const,
        impactScore: 40,
        pageUrl: page.url,
        elementSelector: 'title',
      });
    } else {
      const titleLength = page.title.length;

      if (titleLength < 40) {
        issues.push({
          category: this.category,
          type: 'TITLE_TOO_SHORT',
          title: 'Title Tag Too Short',
          description: `Title is only ${titleLength} characters. Recommended: 40-60 characters for optimal display in search results.`,
          severity: 'MEDIUM' as const,
          impactScore: 10,
          pageUrl: page.url,
          elementSelector: 'title',
        });
      } else if (titleLength > 60) {
        issues.push({
          category: this.category,
          type: 'TITLE_TOO_LONG',
          title: 'Title Tag Too Long',
          description: `Title is ${titleLength} characters (recommended: 40-60). Longer titles may be truncated in search results.`,
          severity: 'LOW' as const,
          impactScore: 5,
          pageUrl: page.url,
          elementSelector: 'title',
        });
      } else {
        passingChecks.push({
          category: this.category,
          code: this.code,
          title: 'Title Tag Optimized',
          description: `Title tag is well-sized at ${titleLength} characters`,
          pageUrl: page.url,
          goodPractice:
            'Title tags between 40-60 characters display well in search results and convey page content effectively.',
        });
      }
    }

    return { issues, passingChecks };
  }
}
