/**
 * Check if canonical tag is present and properly configured
 */

import type { PageRule, PageData, SiteContext, RuleResult } from '../../types.js';

export class CanonicalTagRule implements PageRule {
  code = 'CANONICAL_TAG';
  category = 'TECHNICAL' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues = [];
    const passingChecks = [];

    if (!page.canonical) {
      issues.push({
        category: this.category,
        type: 'MISSING_CANONICAL',
        title: 'Missing Canonical Tag',
        description: `Page "${page.url}" has no canonical tag. Canonical tags help prevent duplicate content issues.`,
        severity: 'MEDIUM' as const,
        impactScore: 15,
        pageUrl: page.url,
        elementSelector: 'link[rel="canonical"]',
      });
    } else {
      // Check if canonical is self-referencing (best practice)
      const normalizedPageUrl = this.normalizeUrl(page.url);
      const normalizedCanonical = this.normalizeUrl(page.canonical);

      if (normalizedCanonical === normalizedPageUrl) {
        passingChecks.push({
          category: this.category,
          code: this.code,
          title: 'Canonical Tag Present',
          description: 'Page has a self-referencing canonical tag',
          pageUrl: page.url,
          goodPractice:
            'Self-referencing canonical tags prevent duplicate content issues and consolidate ranking signals.',
        });
      } else {
        issues.push({
          category: this.category,
          type: 'NON_SELF_CANONICAL',
          title: 'Canonical Points to Different URL',
          description: `Page canonical "${page.canonical}" differs from page URL "${page.url}". This may indicate duplicate content.`,
          severity: 'MEDIUM' as const,
          impactScore: 10,
          pageUrl: page.url,
          elementSelector: 'link[rel="canonical"]',
        });
      }
    }

    return { issues, passingChecks };
  }

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove trailing slash, hash, and normalize to lowercase
      return parsed.origin + parsed.pathname.replace(/\/$/, '') + parsed.search;
    } catch {
      return url;
    }
  }
}
