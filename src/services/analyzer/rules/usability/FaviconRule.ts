import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class FaviconRule implements PageRule {
  code = 'FAVICON_PRESENT';
  category = 'ON_PAGE' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'FAVICON_PRESENT',
    name: 'Favicon',
    maxScore: 1,
    priority: 3,
    section: 'seo',
    informational: false,
    what: 'A favicon is the small icon displayed in browser tabs, bookmarks, and mobile home screens that represents your website visually.',
    why: 'Favicons improve brand recognition and help users quickly identify your site among multiple open tabs and bookmarks. They also appear in search results on some browsers and devices.',
    how: 'Create a favicon.ico file (or PNG variants at 16x16, 32x32, and 192x192px) and add the appropriate <link rel="icon"> tags to your HTML <head>. Use a tool like RealFaviconGenerator for comprehensive cross-device support.',
    time: '30 minutes',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    const favicon = page.favicon;

    if (!favicon) {
      const stub: SEOAuditCheck = {
        ...this.checkDefinition,
        maxScore: 0,
        informational: true,
        category: this.category,
        passed: null,
        score: 0,
        shortAnswer: 'Favicon data not available.',
        answer: 'Favicon status could not be determined for this page.',
        recommendation: null,
        pageUrl: page.url,
      };
      return { check: stub, issues: [], passingChecks: [] };
    }

    const url = new URL(page.url);
    const isHomepage = url.pathname === '/' || url.pathname === '';

    if (!isHomepage) {
      const stub: SEOAuditCheck = {
        ...this.checkDefinition,
        maxScore: 0,
        informational: true,
        category: this.category,
        passed: null,
        score: 0,
        shortAnswer: 'Favicon check applies to homepage only.',
        answer: 'Favicon is evaluated on the homepage only.',
        recommendation: null,
        pageUrl: page.url,
      };
      return { check: stub, issues: [], passingChecks: [] };
    }

    const passed = favicon.hasFavicon;

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score: passed ? this.checkDefinition.maxScore : 0,
      shortAnswer: passed
        ? 'Favicon is configured.'
        : 'No favicon detected.',
      answer: passed
        ? `Favicon is present${favicon.url ? ` (${favicon.url})` : ''}, improving brand recognition in browser tabs and bookmarks.`
        : 'No favicon detected. A favicon helps users identify your site in browser tabs and bookmarks.',
      recommendation: passed ? null : 'Add a favicon.ico and <link rel="icon"> tags to your HTML <head> for better brand recognition.',
      data: { hasFavicon: favicon.hasFavicon, url: favicon.url },
      pageUrl: page.url,
    };

    const issues = !passed ? [{
      category: this.category,
      type: this.code,
      title: 'Missing Favicon',
      description: check.answer,
      severity: 'LOW' as const,
      impactScore: 5,
      pageUrl: page.url,
    }] : [];

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: 'Favicon Present',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'Favicons help users identify your site in browser tabs, bookmarks, and mobile home screens, improving brand recognition.',
    }] : [];

    return { check, issues, passingChecks };
  }
}
