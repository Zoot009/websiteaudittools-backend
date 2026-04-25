import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class CanonicalTagRule implements PageRule {
  code = 'CANONICAL_TAG';
  category = 'TECHNICAL' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'CANONICAL_TAG',
    name: 'Canonical Tag',
    maxScore: 3,
    priority: 1,
    section: 'seo',
    informational: false,
    what: 'The Canonical Tag tells search engines which URL is the primary version of a page, preventing duplicate content issues.',
    why: 'Without canonical tags, search engines may index multiple URL variations of the same page, diluting ranking power. Google recommends all pages specify a canonical.',
    how: 'Add <link rel="canonical" href="URL"> in the <head> of each page pointing to the preferred URL. Most CMS platforms (WordPress, Shopify) handle this automatically via SEO plugins.',
    time: '15 minutes',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    let passed: boolean;
    let score: number;
    let shortAnswer: string;
    let answer: string;
    let recommendation: string | null;

    if (!page.canonical) {
      passed = false;
      score = 0;
      shortAnswer = 'Canonical Tag not used';
      answer = `Page "${page.url}" has no canonical tag. The Canonical Tag tells Search Engines the primary URL of a page. Google recommends all pages specify a Canonical.`;
      recommendation = 'Add a self-referencing canonical tag to prevent duplicate content issues.';
    } else {
      const normalizedPage = this.normalizeUrl(page.url);
      const normalizedCanonical = this.normalizeUrl(page.canonical);

      if (normalizedCanonical === normalizedPage) {
        passed = true;
        score = this.checkDefinition.maxScore;
        shortAnswer = 'Canonical Tag is set correctly.';
        answer = `Page has a correctly configured self-referencing canonical tag pointing to ${page.canonical}.`;
        recommendation = null;
      } else {
        passed = false;
        score = 1;
        shortAnswer = 'Canonical points to a different URL';
        answer = `Page canonical "${page.canonical}" differs from page URL "${page.url}". This may indicate duplicate content.`;
        recommendation = 'Verify the canonical URL is correct. It should match the preferred version of this page.';
      }
    }

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score,
      shortAnswer,
      answer,
      recommendation,
      data: { canonical: page.canonical, pageUrl: page.url },
      pageUrl: page.url,
    };

    const issues = !passed ? [{
      category: this.category,
      type: this.code,
      title: shortAnswer,
      description: answer,
      severity: score === 0 ? 'MEDIUM' as const : 'MEDIUM' as const,
      impactScore: score === 0 ? 15 : 10,
      pageUrl: page.url,
      elementSelector: 'link[rel="canonical"]',
    }] : [];

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: 'Canonical Tag Present',
      description: shortAnswer,
      pageUrl: page.url,
      goodPractice: 'Self-referencing canonical tags prevent duplicate content issues and consolidate ranking signals.',
    }] : [];

    return { check, issues, passingChecks };
  }

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.origin + parsed.pathname.replace(/\/$/, '') + parsed.search;
    } catch {
      return url;
    }
  }
}
