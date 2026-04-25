import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class TitleTagRule implements PageRule {
  code = 'TITLE_TAG';
  category = 'ON_PAGE' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'TITLE_TAG',
    name: 'Title Tag',
    maxScore: 5,
    priority: 1,
    section: 'seo',
    informational: false,
    what: 'The Title Tag is an HTML element that specifies the title of a web page. It appears in search engine results, browser tabs, and when pages are shared on social media.',
    why: 'Title tags are a primary ranking factor. They tell search engines and users what your page is about. Well-optimized titles with target keywords can significantly improve click-through rates from search results.',
    how: 'Add a <title> tag in your page\'s <head> section. Keep it between 40-60 characters to avoid truncation. Include your primary keyword naturally, preferably near the beginning. Format: "Primary Keyword - Secondary Keyword | Brand Name".',
    time: '15 minutes',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    if (!page.title || page.title.trim().length === 0) {
      const check: SEOAuditCheck = {
        ...this.checkDefinition,
        category: this.category,
        passed: false,
        score: 0,
        shortAnswer: 'Title tag is missing.',
        answer: `Page "${page.url}" has no title tag. Title tags are critical for SEO and appear in search results.`,
        recommendation: 'Add a descriptive title tag between 40-60 characters that includes your primary keyword.',
        data: { titleLength: 0 },
        pageUrl: page.url,
      };
      return {
        check,
        issues: [{
          category: this.category,
          type: 'MISSING_TITLE',
          title: 'Missing Title Tag',
          description: check.answer,
          severity: 'CRITICAL' as const,
          impactScore: 40,
          pageUrl: page.url,
          elementSelector: 'title',
        }],
        passingChecks: [],
      };
    }

    const titleLength = page.title.length;

    if (titleLength < 40) {
      const check: SEOAuditCheck = {
        ...this.checkDefinition,
        category: this.category,
        passed: false,
        score: 2,
        shortAnswer: `Title tag is too short (${titleLength} chars).`,
        answer: `Title "${page.title}" is only ${titleLength} characters. Recommended: 40-60 characters for optimal display in search results.`,
        recommendation: 'Expand your title tag to 40-60 characters by adding your primary keyword and brand name.',
        value: titleLength,
        data: { title: page.title, titleLength },
        pageUrl: page.url,
      };
      return {
        check,
        issues: [{
          category: this.category,
          type: 'TITLE_TOO_SHORT',
          title: 'Title Tag Too Short',
          description: check.answer,
          severity: 'MEDIUM' as const,
          impactScore: 10,
          pageUrl: page.url,
          elementSelector: 'title',
        }],
        passingChecks: [],
      };
    }

    if (titleLength > 60) {
      const check: SEOAuditCheck = {
        ...this.checkDefinition,
        category: this.category,
        passed: false,
        score: 3,
        shortAnswer: `Title tag is too long (${titleLength} chars).`,
        answer: `Title is ${titleLength} characters (recommended: 40-60). Longer titles may be truncated in search results.`,
        recommendation: 'Shorten your title tag to 60 characters or fewer to prevent truncation in search results.',
        value: titleLength,
        data: { title: page.title, titleLength },
        pageUrl: page.url,
      };
      return {
        check,
        issues: [{
          category: this.category,
          type: 'TITLE_TOO_LONG',
          title: 'Title Tag Too Long',
          description: check.answer,
          severity: 'LOW' as const,
          impactScore: 5,
          pageUrl: page.url,
          elementSelector: 'title',
        }],
        passingChecks: [],
      };
    }

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed: true,
      score: this.checkDefinition.maxScore,
      shortAnswer: `Title tag is well-optimized (${titleLength} chars).`,
      answer: `Title tag "${page.title}" is ${titleLength} characters — within the optimal 40-60 character range.`,
      recommendation: null,
      value: titleLength,
      data: { title: page.title, titleLength },
      pageUrl: page.url,
    };
    return {
      check,
      issues: [],
      passingChecks: [{
        category: this.category,
        code: this.code,
        title: 'Title Tag Optimized',
        description: check.shortAnswer,
        pageUrl: page.url,
        goodPractice: 'Title tags between 40-60 characters display well in search results and convey page content effectively.',
      }],
    };
  }
}
