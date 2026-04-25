import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class HTTP2Rule implements PageRule {
  code = 'HTTP2_ENABLED';
  category = 'TECHNICAL' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'HTTP2_ENABLED',
    name: 'HTTP/2',
    maxScore: 2,
    priority: 3,
    section: 'technology',
    informational: false,
    what: 'HTTP/2 is the second major version of the HTTP protocol offering significant performance improvements over HTTP/1.1 through multiplexing, header compression, and server push.',
    why: 'HTTP/2 can dramatically improve page load times, especially for pages with many resources. Faster load times improve user experience and are a confirmed ranking factor.',
    how: 'Check if your hosting provider or CDN supports HTTP/2 (most modern hosts do). Ensure HTTPS is enabled first. For custom servers, upgrade to Apache 2.4.17+ or Nginx 1.9.5+ and enable HTTP/2 in configuration.',
    time: '1 hour',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    const url = new URL(page.url);
    const isHomepage = url.pathname === '/' || url.pathname === '';

    // HTTP/2 is a server-level setting — only evaluate on the homepage
    if (!isHomepage || page.isHTTP2 === undefined) {
      const stub: SEOAuditCheck = {
        ...this.checkDefinition,
        maxScore: 0,
        informational: true,
        category: this.category,
        passed: null,
        score: 0,
        shortAnswer: 'HTTP/2 check not applicable for this page.',
        answer: 'HTTP/2 is a server-level setting evaluated only on the homepage.',
        recommendation: null,
        pageUrl: page.url,
      };
      return { check: stub, issues: [], passingChecks: [] };
    }

    const passed = page.isHTTP2;

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score: passed ? this.checkDefinition.maxScore : 0,
      shortAnswer: passed ? 'HTTP/2 is enabled.' : 'HTTP/2 is not enabled.',
      answer: passed
        ? 'Your server uses HTTP/2, providing faster page loading through multiplexing and header compression.'
        : 'Server is using HTTP/1.1 instead of HTTP/2. Upgrading to HTTP/2 improves page load performance.',
      recommendation: passed ? null : 'Enable HTTP/2 on your server. Most modern hosting providers and CDNs support HTTP/2 by default.',
      data: { isHTTP2: page.isHTTP2 },
      pageUrl: page.url,
    };

    const issues = !passed ? [{
      category: this.category,
      type: this.code,
      title: 'HTTP/2 Not Enabled',
      description: check.answer,
      severity: 'MEDIUM' as const,
      impactScore: 12,
      pageUrl: page.url,
    }] : [];

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: 'HTTP/2 Enabled',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'HTTP/2 provides multiplexing and header compression, significantly improving page load performance.',
    }] : [];

    return { check, issues, passingChecks };
  }
}
