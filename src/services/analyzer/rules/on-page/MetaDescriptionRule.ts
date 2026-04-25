import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class MetaDescriptionRule implements PageRule {
  code = 'META_DESCRIPTION';
  category = 'ON_PAGE' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'META_DESCRIPTION',
    name: 'Meta Description',
    maxScore: 4,
    priority: 1,
    section: 'seo',
    informational: false,
    what: 'Meta Description is an HTML attribute that provides a brief summary of a web page\'s content. It appears in search results and heavily influences click-through rates.',
    why: 'A compelling meta description can significantly improve your click-through rate from search results. It\'s your chance to advertise your content directly in search results and persuade users to click.',
    how: 'Add a <meta name="description" content="..."> tag in your page\'s <head>. Keep it between 120-160 characters to avoid truncation. Include target keywords naturally and write compelling copy that encourages clicks.',
    time: '30 minutes',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    if (!page.description || page.description.trim().length === 0) {
      const check: SEOAuditCheck = {
        ...this.checkDefinition,
        category: this.category,
        passed: false,
        score: 0,
        shortAnswer: 'Meta description is missing.',
        answer: `Page "${page.url}" has no meta description. Meta descriptions improve click-through rates from search results.`,
        recommendation: 'Add a meta description between 120-160 characters that summarizes the page and includes your target keyword.',
        data: { descriptionLength: 0 },
        pageUrl: page.url,
      };
      return {
        check,
        issues: [{
          category: this.category,
          type: 'MISSING_META_DESCRIPTION',
          title: 'Missing Meta Description',
          description: check.answer,
          severity: 'HIGH' as const,
          impactScore: 25,
          pageUrl: page.url,
          elementSelector: 'meta[name="description"]',
        }],
        passingChecks: [],
      };
    }

    const descLength = page.description.length;

    if (descLength < 70) {
      const check: SEOAuditCheck = {
        ...this.checkDefinition,
        category: this.category,
        passed: false,
        score: 2,
        shortAnswer: `Meta description is too short (${descLength} chars).`,
        answer: `Meta description is only ${descLength} characters. Recommended: 120-160 characters for optimal display in search results.`,
        recommendation: 'Expand your meta description to 120-160 characters with a compelling summary that includes your target keyword.',
        value: descLength,
        data: { description: page.description, descriptionLength: descLength },
        pageUrl: page.url,
      };
      return {
        check,
        issues: [{
          category: this.category,
          type: 'META_DESCRIPTION_TOO_SHORT',
          title: 'Meta Description Too Short',
          description: check.answer,
          severity: 'MEDIUM' as const,
          impactScore: 10,
          pageUrl: page.url,
          elementSelector: 'meta[name="description"]',
        }],
        passingChecks: [],
      };
    }

    if (descLength > 160) {
      const check: SEOAuditCheck = {
        ...this.checkDefinition,
        category: this.category,
        passed: false,
        score: 3,
        shortAnswer: `Meta description is too long (${descLength} chars).`,
        answer: `Meta description is ${descLength} characters (recommended: 120-160). Longer descriptions may be truncated in search results.`,
        recommendation: 'Shorten your meta description to 160 characters or fewer to prevent truncation.',
        value: descLength,
        data: { description: page.description, descriptionLength: descLength },
        pageUrl: page.url,
      };
      return {
        check,
        issues: [{
          category: this.category,
          type: 'META_DESCRIPTION_TOO_LONG',
          title: 'Meta Description Too Long',
          description: check.answer,
          severity: 'LOW' as const,
          impactScore: 5,
          pageUrl: page.url,
          elementSelector: 'meta[name="description"]',
        }],
        passingChecks: [],
      };
    }

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed: true,
      score: this.checkDefinition.maxScore,
      shortAnswer: `Meta description is well-optimized (${descLength} chars).`,
      answer: `Meta description is ${descLength} characters — within the optimal 120-160 character range.`,
      recommendation: null,
      value: descLength,
      data: { description: page.description, descriptionLength: descLength },
      pageUrl: page.url,
    };
    return {
      check,
      issues: [],
      passingChecks: [{
        category: this.category,
        code: this.code,
        title: 'Meta Description Optimized',
        description: check.shortAnswer,
        pageUrl: page.url,
        goodPractice: 'Meta descriptions between 120-160 characters provide good previews in search results and can improve CTR.',
      }],
    };
  }
}
