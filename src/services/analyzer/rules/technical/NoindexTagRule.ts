import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class NoindexTagRule implements PageRule {
  code = 'NOINDEX_TAG';
  category = 'TECHNICAL' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'NOINDEX_TAG',
    name: 'Noindex Tag',
    maxScore: 4,
    priority: 2,
    section: 'seo',
    informational: false,
    what: 'The noindex meta tag tells search engines not to index a page, preventing it from appearing in search results.',
    why: 'Accidentally leaving noindex on important pages destroys their SEO potential. This is a critical issue that must be fixed immediately for any page you want to rank.',
    how: 'Remove <meta name="robots" content="noindex"> from the page\'s <head> section. In WordPress, ensure "Discourage search engines" is unchecked in Settings > Reading.',
    time: '15 minutes',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    const hasNoindex = page.robots?.toLowerCase().includes('noindex') ?? false;
    const passed = !hasNoindex;

    const isHomepage = (() => {
      try { const p = new URL(page.url).pathname; return p === '/' || p === ''; }
      catch { return false; }
    })();

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score: passed ? this.checkDefinition.maxScore : 0,
      shortAnswer: passed
        ? 'Your page is not using the Noindex Tag which prevents indexing.'
        : 'Page has a Noindex Tag — it cannot be indexed by search engines.',
      answer: passed
        ? 'Page does not have a noindex directive and can be indexed by search engines.'
        : `Page "${page.url}" has a noindex meta tag.${isHomepage ? ' This is critical as it affects your homepage!' : ''} This prevents it from appearing in search results.`,
      recommendation: passed ? null : 'Remove the noindex meta tag from this page if you want it to appear in search results.',
      data: { robots: page.robots },
      pageUrl: page.url,
    };

    const issues = !passed ? [{
      category: this.category,
      type: this.code,
      title: 'Page Has Noindex Directive',
      description: check.answer,
      severity: isHomepage ? 'CRITICAL' as const : 'HIGH' as const,
      impactScore: isHomepage ? 50 : 30,
      pageUrl: page.url,
      elementSelector: 'meta[name="robots"]',
    }] : [];

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: 'Page is Indexable',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'Allowing search engines to index your important pages improves visibility.',
    }] : [];

    return { check, issues, passingChecks };
  }
}
