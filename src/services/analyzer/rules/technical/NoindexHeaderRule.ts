import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class NoindexHeaderRule implements PageRule {
  code = 'NOINDEX_HEADER';
  category = 'TECHNICAL' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'NOINDEX_HEADER',
    name: 'Noindex HTTP Header',
    maxScore: 4,
    priority: 2,
    section: 'seo',
    informational: false,
    what: 'The X-Robots-Tag HTTP header can instruct search engines not to index a page at the server level, overriding any meta robots tags in the HTML.',
    why: 'A noindex directive in the X-Robots-Tag header will silently prevent search engines from indexing the page even if the HTML looks correct. This can block entire sections of a site from appearing in search results.',
    how: 'Check your server or CDN configuration for X-Robots-Tag headers. In Nginx, look for "add_header X-Robots-Tag". In Apache, look for Header directives. Remove any noindex/none directives for pages you want indexed.',
    time: '30 minutes',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    const xRobotsTag = page.httpHeaders?.['x-robots-tag'] ?? null;
    const value = xRobotsTag?.toLowerCase() ?? '';
    const isBlocking = value.includes('noindex') || value.includes('none');
    const passed = !isBlocking;

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score: passed ? this.checkDefinition.maxScore : 0,
      shortAnswer: passed
        ? 'No blocking X-Robots-Tag header detected.'
        : `X-Robots-Tag header is blocking indexing: "${xRobotsTag}".`,
      answer: passed
        ? 'No X-Robots-Tag header with noindex or none directive found. Page can be indexed normally.'
        : `Page has an X-Robots-Tag HTTP header with value "${xRobotsTag}" which prevents search engine indexing.`,
      recommendation: passed ? null : 'Remove the noindex or none directive from the X-Robots-Tag header in your server configuration.',
      data: { xRobotsTag },
      pageUrl: page.url,
    };

    const issues = !passed ? [{
      category: this.category,
      type: this.code,
      title: 'Page Blocked via X-Robots-Tag Header',
      description: check.answer,
      severity: 'CRITICAL' as const,
      impactScore: 50,
      pageUrl: page.url,
    }] : [];

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: 'No Blocking HTTP Robots Header',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'Keeping the X-Robots-Tag header free of noindex directives ensures search engines can index your pages.',
    }] : [];

    return { check, issues, passingChecks };
  }
}
