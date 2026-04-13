/**
 * Check if heading hierarchy is logical (H1 → H2 → H3, etc.)
 */

import type { PageRule, PageData, SiteContext, RuleResult, Issue, PassingCheck } from '../../types.js';

export class HeadingHierarchyRule implements PageRule {
  code = 'HEADING_HIERARCHY';
  category = 'ON_PAGE' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    if (page.headings.length === 0) {
      // No headings at all - already flagged by H1TagRule
      return { issues, passingChecks };
    }

    const violations: string[] = [];
    let previousLevel = 0;

    for (let i = 0; i < page.headings.length; i++) {
      const current = page.headings[i]!;

      // Check if skipping levels (e.g., H1 → H3, skipping H2)
      if (previousLevel > 0 && current.level > previousLevel + 1) {
        violations.push(
          `Skipped from H${previousLevel} to H${current.level}: "${current.text.substring(0, 50)}"`
        );
      }

      previousLevel = current.level;
    }

    if (violations.length > 0) {
      issues.push({
        category: this.category,
        type: this.code,
        title: 'Heading Hierarchy Issues',
        description: `Page has heading hierarchy problems: ${violations.join('; ')}. Maintain logical order (H1→H2→H3) for better accessibility and SEO.`,
        severity: 'LOW' as const,
        impactScore: 8,
        pageUrl: page.url,
        elementSelector: 'h1, h2, h3, h4, h5, h6',
      });
    } else {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'Heading Hierarchy Valid',
        description: `Page has ${page.headings.length} headings in logical order`,
        pageUrl: page.url,
        goodPractice:
          'Logical heading hierarchy improves accessibility and helps search engines understand content structure.',
      });
    }

    return { issues, passingChecks };
  }
}
