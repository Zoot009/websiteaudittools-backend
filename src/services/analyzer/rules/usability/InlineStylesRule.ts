import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class InlineStylesRule implements PageRule {
  code = 'INLINE_STYLES';
  category = 'TECHNICAL' as const;
  level = 'page' as const;

  private readonly EXCESSIVE_THRESHOLD = 20;

  readonly checkDefinition: CheckDefinition = {
    id: 'INLINE_STYLES',
    name: 'Inline Styles',
    maxScore: 2,
    priority: 3,
    section: 'ui',
    informational: false,
    what: 'Inline styles are CSS declarations placed directly on HTML elements using the style attribute, rather than in external stylesheets.',
    why: 'Excessive inline styles increase HTML file size, cannot be cached by browsers, are harder to maintain, and can override external stylesheets making theming and responsive design difficult.',
    how: 'Move inline styles to external CSS files or <style> blocks. Use CSS classes for reusable styles. Keep inline styles only for truly dynamic values that must be set programmatically.',
    time: '2-4 hours',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    const inlineStylesCount = page.inlineStylesCount ?? 0;
    const passed = inlineStylesCount < this.EXCESSIVE_THRESHOLD;
    const score = inlineStylesCount === 0
      ? this.checkDefinition.maxScore
      : inlineStylesCount < this.EXCESSIVE_THRESHOLD
        ? 1
        : 0;

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score,
      shortAnswer: inlineStylesCount === 0
        ? 'No inline styles found.'
        : inlineStylesCount < this.EXCESSIVE_THRESHOLD
          ? `${inlineStylesCount} inline style(s) found (acceptable).`
          : `Excessive inline styles detected (${inlineStylesCount} total).`,
      answer: inlineStylesCount === 0
        ? 'Page uses no inline styles, keeping HTML clean and styles maintainable in external CSS.'
        : inlineStylesCount < this.EXCESSIVE_THRESHOLD
          ? `Page has ${inlineStylesCount} inline style attributes, which is within acceptable limits for dynamic or component-specific styling.`
          : `Page has ${inlineStylesCount} inline style attributes. Excessive inline styles increase HTML size, prevent CSS caching, and make maintenance difficult.`,
      recommendation: inlineStylesCount >= this.EXCESSIVE_THRESHOLD
        ? 'Move inline styles to external CSS files. Use CSS classes for reusable styles and keep inline styles only for truly dynamic values.'
        : null,
      value: inlineStylesCount,
      data: { inlineStylesCount },
      pageUrl: page.url,
    };

    const issues = !passed ? [{
      category: this.category,
      type: this.code,
      title: 'Excessive Inline Styles',
      description: check.answer,
      severity: 'LOW' as const,
      impactScore: 5,
      pageUrl: page.url,
    }] : [];

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: inlineStylesCount === 0 ? 'No Inline Styles' : 'Minimal Inline Styles',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'External CSS is cacheable, maintainable, and improves page load performance.',
    }] : [];

    return { check, issues, passingChecks };
  }
}
