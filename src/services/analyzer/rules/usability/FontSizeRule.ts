import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class FontSizeRule implements PageRule {
  code = 'FONT_SIZE_TOO_SMALL';
  category = 'ACCESSIBILITY' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'FONT_SIZE_TOO_SMALL',
    name: 'Font Size',
    maxScore: 2,
    priority: 3,
    section: 'ui',
    informational: false,
    what: 'Font size checks whether text elements on your page are large enough to be readable, particularly on mobile devices where small text requires zooming.',
    why: 'Text smaller than 12px is difficult to read on mobile devices, forcing users to pinch-zoom. Google\'s mobile-first indexing considers mobile readability a ranking factor, and small fonts hurt accessibility.',
    how: 'Ensure body text is at least 14-16px. Avoid using font sizes below 12px for any readable content. Use relative units (rem, em) instead of fixed pixels for better scalability across devices.',
    time: '1-2 hours',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    const smallFontCount = page.smallFontCount ?? 0;
    const passed = smallFontCount <= 5;
    const score = smallFontCount === 0
      ? this.checkDefinition.maxScore
      : smallFontCount <= 5
        ? 1
        : 0;

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score,
      shortAnswer: smallFontCount === 0
        ? 'All text uses readable font sizes.'
        : smallFontCount <= 5
          ? `${smallFontCount} element(s) with small fonts (acceptable).`
          : `${smallFontCount} element(s) with font sizes too small.`,
      answer: smallFontCount === 0
        ? 'All text elements use readable font sizes (12px or larger), ensuring good readability on all devices.'
        : smallFontCount <= 5
          ? `${smallFontCount} element(s) use font sizes below 12px, but this is within acceptable limits for decorative or non-critical text.`
          : `Found ${smallFontCount} elements with font size smaller than 12px, which can be difficult to read on mobile devices. This may hurt mobile usability scores.`,
      recommendation: smallFontCount > 5 ? 'Increase font sizes to at least 14-16px for body text. Avoid font sizes below 12px for any readable content.' : null,
      value: smallFontCount,
      data: { smallFontCount },
      pageUrl: page.url,
    };

    const issues = smallFontCount > 5 ? [{
      category: this.category,
      type: this.code,
      title: 'Text Too Small for Mobile',
      description: check.answer,
      severity: 'MEDIUM' as const,
      impactScore: 15,
      pageUrl: page.url,
    }] : [];

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: smallFontCount === 0 ? 'Readable Font Sizes' : 'Minimal Small Font Usage',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'Using readable font sizes improves accessibility and ensures content is readable on all devices.',
    }] : [];

    return { check, issues, passingChecks };
  }
}
