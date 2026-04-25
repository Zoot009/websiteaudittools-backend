import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class WordCountRule implements PageRule {
  code = 'WORD_COUNT';
  category = 'ON_PAGE' as const;
  level = 'page' as const;

  private readonly CRITICAL_THRESHOLD = 100;
  private readonly THIN_THRESHOLD = 300;
  private readonly ADEQUATE_THRESHOLD = 500;
  private readonly GOOD_THRESHOLD = 1000;

  private readonly SPECIAL_PAGE_PATTERNS = [
    /\/contact/i, /\/login/i, /\/signup/i, /\/register/i,
    /\/cart/i, /\/checkout/i, /\/thank-you/i, /\/404/i, /\/error/i,
  ];

  readonly checkDefinition: CheckDefinition = {
    id: 'WORD_COUNT',
    name: 'Word Count',
    maxScore: 3,
    priority: 2,
    section: 'seo',
    informational: false,
    what: 'Word count refers to the total amount of text content on a page. While quality matters more than quantity, research shows a correlation between longer, comprehensive content and higher rankings.',
    why: 'Longer content (typically 500+ words, ideally 1000+) tends to rank better because it covers topics more comprehensively, naturally includes more keywords, and provides more value to users.',
    how: 'Aim for at least 500 words on important pages, 1000-2000+ for blog posts and cornerstone content. Focus on creating comprehensive, valuable content that fully addresses user intent.',
    time: '2-4 hours',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    const wordCount = page.wordCount ?? 0;
    const isSpecialPage = this.SPECIAL_PAGE_PATTERNS.some(p => p.test(page.url));

    if (isSpecialPage) {
      const check: SEOAuditCheck = {
        ...this.checkDefinition,
        maxScore: 0,
        informational: true,
        category: this.category,
        passed: null,
        score: 0,
        shortAnswer: `${wordCount} words (utility page — no minimum required).`,
        answer: `Page has ${wordCount} words. Utility pages like contact or login don't require extensive content.`,
        recommendation: null,
        value: wordCount,
        data: { wordCount, pageType: 'special' },
        pageUrl: page.url,
      };
      return { check, issues: [], passingChecks: [] };
    }

    let score: number;
    let passed: boolean;
    let shortAnswer: string;
    let answer: string;
    let recommendation: string | null;
    let severity: 'HIGH' | 'MEDIUM' | 'LOW' | null = null;
    let impactScore = 0;
    let issueType = '';

    if (wordCount < this.CRITICAL_THRESHOLD) {
      passed = false; score = 0;
      shortAnswer = `Very thin content (${wordCount} words).`;
      answer = `Page has only ${wordCount} words. This is very thin content that may face ranking penalties.`;
      recommendation = `Expand content to at least ${this.ADEQUATE_THRESHOLD} words with valuable, relevant information.`;
      severity = 'HIGH'; impactScore = 30; issueType = 'VERY_THIN_CONTENT';
    } else if (wordCount < this.THIN_THRESHOLD) {
      passed = false; score = 1;
      shortAnswer = `Thin content (${wordCount} words).`;
      answer = `Page has only ${wordCount} words. Pages with fewer than ${this.THIN_THRESHOLD} words may be considered thin content.`;
      recommendation = `Increase content to at least ${this.ADEQUATE_THRESHOLD} words for better SEO performance.`;
      severity = 'MEDIUM'; impactScore = 20; issueType = 'THIN_CONTENT';
    } else {
      passed = true;
      score = wordCount >= this.GOOD_THRESHOLD ? this.checkDefinition.maxScore : 2;
      shortAnswer = wordCount >= this.GOOD_THRESHOLD
        ? `Comprehensive content (${wordCount} words).`
        : `Adequate content (${wordCount} words).`;
      answer = wordCount >= this.GOOD_THRESHOLD
        ? `Page has ${wordCount} words of comprehensive content. This depth tends to rank well and provides great value.`
        : `Page has ${wordCount} words of content — adequate for SEO. Consider expanding to 1000+ words for even better performance.`;
      recommendation = null;
    }

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score,
      shortAnswer,
      answer,
      recommendation,
      value: wordCount,
      data: { wordCount, threshold: this.ADEQUATE_THRESHOLD },
      pageUrl: page.url,
    };

    const issues = !passed && severity ? [{
      category: this.category,
      type: issueType,
      title: severity === 'HIGH' ? 'Very Thin Content' : 'Thin Content Detected',
      description: answer,
      severity,
      impactScore,
      pageUrl: page.url,
    }] : [];

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: wordCount >= this.GOOD_THRESHOLD ? 'Comprehensive Content' : 'Adequate Content',
      description: shortAnswer,
      pageUrl: page.url,
      goodPractice: 'Substantial content provides depth, covers user intent, and tends to rank well in search.',
      data: { wordCount },
    }] : [];

    return { check, issues, passingChecks };
  }
}
