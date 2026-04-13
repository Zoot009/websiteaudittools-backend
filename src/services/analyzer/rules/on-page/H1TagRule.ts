/**
 * Check if page has exactly one H1 tag
 */

import type { PageRule, PageData, SiteContext, RuleResult } from '../../types.js';

export class H1TagRule implements PageRule {
  code = 'H1_TAG';
  category = 'ON_PAGE' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues = [];
    const passingChecks = [];

    const h1Tags = page.headings.filter((h) => h.level === 1);
    const h1Count = h1Tags.length;

    if (h1Count === 0) {
      issues.push({
        category: this.category,
        type: 'MISSING_H1',
        title: 'Missing H1 Tag',
        description: `Page "${page.url}" has no H1 tag. H1 tags help search engines understand your page's main topic.`,
        severity: 'HIGH' as const,
        impactScore: 25,
        pageUrl: page.url,
        elementSelector: 'h1',
      });
    } else if (h1Count > 1) {
      const h1Texts = h1Tags.map((h) => h.text).join('", "');
      issues.push({
        category: this.category,
        type: 'MULTIPLE_H1',
        title: 'Multiple H1 Tags',
        description: `Page has ${h1Count} H1 tags: "${h1Texts}". Best practice is to use exactly one H1 per page.`,
        severity: 'MEDIUM' as const,
        impactScore: 15,
        pageUrl: page.url,
        elementSelector: 'h1',
      });
    } else {
      // Exactly one H1 tag exists
      const h1Text = h1Tags[0]!.text;
      const h1Length = h1Text.length;

      if (h1Length < 20) {
        issues.push({
          category: this.category,
          type: 'H1_TOO_SHORT',
          title: 'H1 Tag Too Short',
          description: `H1 "${h1Text}" is only ${h1Length} characters. Consider making it more descriptive.`,
          severity: 'LOW' as const,
          impactScore: 5,
          pageUrl: page.url,
          elementSelector: 'h1',
        });
      } else {
        passingChecks.push({
          category: this.category,
          code: this.code,
          title: 'H1 Tag Optimized',
          description: `Page has one well-sized H1: "${h1Text.substring(0, 60)}${h1Length > 60 ? '...' : ''}"`,
          pageUrl: page.url,
          goodPractice: 'A single, descriptive H1 tag helps search engines understand your page topic.',
        });
      }
    }

    return { issues, passingChecks };
  }
}
