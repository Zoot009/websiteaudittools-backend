/**
 * Check if page has noindex directive (warn if indexable pages are blocked)
 */

import type { PageRule, PageData, SiteContext, RuleResult, Severity } from '../../types.js';

export class NoindexTagRule implements PageRule {
  code = 'NOINDEX_TAG';
  category = 'TECHNICAL' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues = [];
    const passingChecks = [];

    const hasNoindex = page.robots?.toLowerCase().includes('noindex');

    if (hasNoindex) {
      // Noindex on homepage or important pages is usually a problem
      const url = new URL(page.url);
      const isHomepage = url.pathname === '/' || url.pathname === '';

      const severity: Severity = isHomepage ? 'CRITICAL' : 'HIGH';
      const impactScore = isHomepage ? 50 : 30;

      issues.push({
        category: this.category,
        type: this.code,
        title: 'Page Has Noindex Directive',
        description: `Page "${page.url}" has a noindex meta tag, preventing it from being indexed by search engines. ${
          isHomepage ? 'This is critical as it affects your homepage!' : ''
        }`,
        severity,
        impactScore,
        pageUrl: page.url,
        elementSelector: 'meta[name="robots"]',
      });
    } else {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'Page is Indexable',
        description: 'Page does not have a noindex directive',
        pageUrl: page.url,
        goodPractice: 'Allowing search engines to index your important pages improves visibility.',
      });
    }

    return { issues, passingChecks };
  }
}
