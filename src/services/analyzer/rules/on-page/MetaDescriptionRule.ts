/**
 * Check if meta description is present and properly sized
 */

import type { PageRule, PageData, SiteContext, RuleResult } from '../../types.js';

export class MetaDescriptionRule implements PageRule {
  code = 'META_DESCRIPTION';
  category = 'ON_PAGE' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues = [];
    const passingChecks = [];

    if (!page.description || page.description.trim().length === 0) {
      issues.push({
        category: this.category,
        type: 'MISSING_META_DESCRIPTION',
        title: 'Missing Meta Description',
        description: `Page "${page.url}" has no meta description. Meta descriptions improve click-through rates from search results.`,
        severity: 'HIGH' as const,
        impactScore: 25,
        pageUrl: page.url,
        elementSelector: 'meta[name="description"]',
      });
    } else {
      const descLength = page.description.length;

      if (descLength < 70) {
        issues.push({
          category: this.category,
          type: 'META_DESCRIPTION_TOO_SHORT',
          title: 'Meta Description Too Short',
          description: `Meta description is only ${descLength} characters. Recommended: 120-160 characters for optimal display.`,
          severity: 'MEDIUM' as const,
          impactScore: 10,
          pageUrl: page.url,
          elementSelector: 'meta[name="description"]',
        });
      } else if (descLength > 160) {
        issues.push({
          category: this.category,
          type: 'META_DESCRIPTION_TOO_LONG',
          title: 'Meta Description Too Long',
          description: `Meta description is ${descLength} characters (recommended: 120-160). Longer descriptions may be truncated.`,
          severity: 'LOW' as const,
          impactScore: 5,
          pageUrl: page.url,
          elementSelector: 'meta[name="description"]',
        });
      } else {
        passingChecks.push({
          category: this.category,
          code: this.code,
          title: 'Meta Description Optimized',
          description: `Meta description is well-sized at ${descLength} characters`,
          pageUrl: page.url,
          goodPractice:
            'Meta descriptions between 120-160 characters provide good previews in search results and can improve CTR.',
        });
      }
    }

    return { issues, passingChecks };
  }
}
