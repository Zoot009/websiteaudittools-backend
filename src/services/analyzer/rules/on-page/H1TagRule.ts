import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class H1TagRule implements PageRule {
  code = 'H1_TAG';
  category = 'ON_PAGE' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'H1_TAG',
    name: 'H1 Tag',
    maxScore: 4,
    priority: 1,
    section: 'seo',
    informational: false,
    what: 'The H1 tag is the main heading element on a page. It should clearly describe the page\'s primary topic and is one of the most important on-page SEO elements.',
    why: 'H1 tags help search engines understand your page\'s main topic and keyword focus. Each page should have exactly one H1 that includes your primary target keyword.',
    how: 'Wrap your main page heading in <h1> tags. Use only one H1 per page. Include your primary keyword naturally. Make it descriptive and compelling, typically placed as the first visible heading.',
    time: '30 minutes',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    const h1Tags = page.headings.filter(h => h.level === 1);
    const h1Count = h1Tags.length;

    if (h1Count === 0) {
      const check: SEOAuditCheck = {
        ...this.checkDefinition,
        category: this.category,
        passed: false,
        score: 0,
        shortAnswer: 'H1 tag is missing.',
        answer: `Page "${page.url}" has no H1 tag. H1 tags help search engines understand your page's main topic.`,
        recommendation: 'Add a single H1 tag that includes your primary keyword and clearly describes the page topic.',
        data: { h1Count: 0 },
        pageUrl: page.url,
      };
      return {
        check,
        issues: [{
          category: this.category,
          type: 'MISSING_H1',
          title: 'Missing H1 Tag',
          description: check.answer,
          severity: 'HIGH' as const,
          impactScore: 25,
          pageUrl: page.url,
          elementSelector: 'h1',
        }],
        passingChecks: [],
      };
    }

    if (h1Count > 1) {
      const h1Texts = h1Tags.map(h => `"${h.text}"`).join(', ');
      const check: SEOAuditCheck = {
        ...this.checkDefinition,
        category: this.category,
        passed: false,
        score: 2,
        shortAnswer: `Multiple H1 tags found (${h1Count}).`,
        answer: `Page has ${h1Count} H1 tags: ${h1Texts}. Best practice is to use exactly one H1 per page.`,
        recommendation: 'Keep only one H1 tag — your main page heading. Convert other H1s to H2 or H3 tags.',
        data: { h1Count, h1Texts: h1Tags.map(h => h.text) },
        pageUrl: page.url,
      };
      return {
        check,
        issues: [{
          category: this.category,
          type: 'MULTIPLE_H1',
          title: 'Multiple H1 Tags',
          description: check.answer,
          severity: 'MEDIUM' as const,
          impactScore: 15,
          pageUrl: page.url,
          elementSelector: 'h1',
        }],
        passingChecks: [],
      };
    }

    const h1Text = h1Tags[0]!.text;
    const h1Length = h1Text.length;

    if (h1Length < 20) {
      const check: SEOAuditCheck = {
        ...this.checkDefinition,
        category: this.category,
        passed: false,
        score: 3,
        shortAnswer: `H1 tag is too short (${h1Length} chars).`,
        answer: `H1 "${h1Text}" is only ${h1Length} characters. Consider making it more descriptive to include your target keyword.`,
        recommendation: 'Expand your H1 tag to at least 20 characters with a descriptive heading that includes your primary keyword.',
        value: h1Length,
        data: { h1Text, h1Length },
        pageUrl: page.url,
      };
      return {
        check,
        issues: [{
          category: this.category,
          type: 'H1_TOO_SHORT',
          title: 'H1 Tag Too Short',
          description: check.answer,
          severity: 'LOW' as const,
          impactScore: 5,
          pageUrl: page.url,
          elementSelector: 'h1',
        }],
        passingChecks: [],
      };
    }

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed: true,
      score: this.checkDefinition.maxScore,
      shortAnswer: 'H1 tag is present and well-sized.',
      answer: `Page has one well-sized H1: "${h1Text.substring(0, 60)}${h1Length > 60 ? '...' : ''}"`,
      recommendation: null,
      value: h1Length,
      data: { h1Text, h1Length },
      pageUrl: page.url,
    };
    return {
      check,
      issues: [],
      passingChecks: [{
        category: this.category,
        code: this.code,
        title: 'H1 Tag Optimized',
        description: check.shortAnswer,
        pageUrl: page.url,
        goodPractice: 'A single, descriptive H1 tag helps search engines understand your page topic.',
      }],
    };
  }
}
