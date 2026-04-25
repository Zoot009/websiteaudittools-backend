import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class HeadingHierarchyRule implements PageRule {
  code = 'HEADING_HIERARCHY';
  category = 'ON_PAGE' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'HEADING_HIERARCHY',
    name: 'Heading Hierarchy',
    maxScore: 3,
    priority: 2,
    section: 'seo',
    informational: false,
    what: 'Heading hierarchy refers to the proper use of HTML heading tags (H1-H6) in a logical, nested structure. It creates a content outline that search engines and assistive technologies use to understand page structure.',
    why: 'Proper heading hierarchy helps search engines understand your content organization and improves accessibility for screen reader users. Skipping heading levels (e.g., H1 → H3) creates a confusing structure.',
    how: 'Use headings in order: H1 for main title, H2 for major sections, H3 for subsections under H2. Never skip levels. Include relevant keywords in headings naturally.',
    time: '30 minutes',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    if (page.headings.length === 0) {
      const stub: SEOAuditCheck = {
        ...this.checkDefinition,
        maxScore: 0,
        informational: true,
        category: this.category,
        passed: null,
        score: 0,
        shortAnswer: 'No headings found to evaluate hierarchy.',
        answer: 'Page has no headings. Heading hierarchy cannot be evaluated.',
        recommendation: null,
        pageUrl: page.url,
      };
      return { check: stub, issues: [], passingChecks: [] };
    }

    const violations: string[] = [];
    let previousLevel = 0;

    for (const heading of page.headings) {
      if (previousLevel > 0 && heading.level > previousLevel + 1) {
        violations.push(`Skipped from H${previousLevel} to H${heading.level}: "${heading.text.substring(0, 50)}"`);
      }
      previousLevel = heading.level;
    }

    const passed = violations.length === 0;

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score: passed ? this.checkDefinition.maxScore : 0,
      shortAnswer: passed
        ? `Heading hierarchy is valid (${page.headings.length} headings).`
        : `Heading hierarchy has ${violations.length} issue(s).`,
      answer: passed
        ? `Page has ${page.headings.length} headings in logical order without skipping levels.`
        : `Page has heading hierarchy problems: ${violations.join('; ')}.`,
      recommendation: passed ? null : 'Fix heading levels to maintain logical order (H1→H2→H3). Never skip heading levels.',
      data: { headingCount: page.headings.length, violations },
      pageUrl: page.url,
    };

    const issues = !passed ? [{
      category: this.category,
      type: this.code,
      title: 'Heading Hierarchy Issues',
      description: check.answer,
      severity: 'LOW' as const,
      impactScore: 8,
      pageUrl: page.url,
      elementSelector: 'h1, h2, h3, h4, h5, h6',
    }] : [];

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: 'Heading Hierarchy Valid',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'Logical heading hierarchy improves accessibility and helps search engines understand content structure.',
    }] : [];

    return { check, issues, passingChecks };
  }
}
