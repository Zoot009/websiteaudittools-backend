import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class DeprecatedTagsRule implements PageRule {
  code = 'DEPRECATED_TAGS';
  category = 'TECHNICAL' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'DEPRECATED_TAGS',
    name: 'Deprecated HTML Tags',
    maxScore: 2,
    priority: 3,
    section: 'seo',
    informational: false,
    what: 'Deprecated HTML tags are elements that have been removed from the HTML specification, such as <font>, <center>, <marquee>, <strike>, and <blink>.',
    why: 'Using deprecated tags can cause rendering inconsistencies across browsers, signals poor code quality, and may cause issues as browser support is gradually dropped.',
    how: 'Replace deprecated tags with their modern HTML5 and CSS equivalents. For example, replace <font> with CSS font properties, <center> with CSS text-align, and <b> with <strong>.',
    time: '1-2 hours',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    const deprecatedCount = page.deprecatedTagsCount ?? 0;
    const passed = deprecatedCount === 0;
    const score = passed ? this.checkDefinition.maxScore : deprecatedCount > 5 ? 0 : 1;

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score,
      shortAnswer: passed
        ? 'No deprecated HTML tags found.'
        : `${deprecatedCount} deprecated HTML tag(s) detected.`,
      answer: passed
        ? 'Page uses modern HTML without deprecated tags, ensuring better browser compatibility and standards compliance.'
        : `Page uses ${deprecatedCount} deprecated HTML tag(s) such as <font>, <center>, or <marquee>. These have been removed from the HTML specification.`,
      recommendation: passed ? null : 'Replace deprecated tags with modern HTML5 elements and CSS. Use <strong> instead of <b>, CSS text-align instead of <center>, and CSS font properties instead of <font>.',
      value: deprecatedCount,
      data: { deprecatedCount },
      pageUrl: page.url,
    };

    const issues = !passed ? [{
      category: this.category,
      type: this.code,
      title: 'Deprecated HTML Tags Detected',
      description: check.answer,
      severity: 'MEDIUM' as const,
      impactScore: 10,
      pageUrl: page.url,
    }] : [];

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: 'No Deprecated HTML Tags',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'Modern HTML ensures better browser compatibility and follows current web standards.',
    }] : [];

    return { check, issues, passingChecks };
  }
}
