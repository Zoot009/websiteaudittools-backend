import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class AMPRule implements PageRule {
  code = 'AMP';
  category = 'PERFORMANCE' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'AMP',
    name: 'Google AMP',
    maxScore: 0,
    priority: 3,
    section: 'performance',
    informational: true,
    what: 'Google AMP (Accelerated Mobile Pages) is a framework for creating fast-loading mobile web pages. AMP pages load nearly instantly on mobile devices.',
    why: 'AMP can improve mobile load times and increase visibility in Google\'s Top Stories carousel and mobile search features. However, it\'s optional and Google has reduced its special treatment since 2021.',
    how: 'For news and blog sites, implement AMP versions of your articles. Use the AMP framework or an AMP plugin for WordPress. Validate using Google\'s AMP Test tool.',
    time: '4-8 hours',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    if (page.isAMP === undefined || page.isAMP === null) {
      const stub: SEOAuditCheck = {
        ...this.checkDefinition,
        category: this.category,
        passed: null,
        score: 0,
        shortAnswer: 'AMP detection data not available.',
        answer: 'AMP implementation status could not be determined for this page.',
        recommendation: null,
        pageUrl: page.url,
      };
      return { check: stub, issues: [], passingChecks: [] };
    }

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed: null,
      score: 0,
      shortAnswer: page.isAMP ? 'Google AMP is implemented.' : 'Google AMP is not implemented.',
      answer: page.isAMP
        ? 'Page is using Google AMP (Accelerated Mobile Pages), which can improve mobile load times and visibility.'
        : 'Page does not use Google AMP. AMP is optional and most sites benefit more from Core Web Vitals optimization.',
      recommendation: null,
      data: { isAMP: page.isAMP },
      pageUrl: page.url,
    };

    return { check, issues: [], passingChecks: [] };
  }
}
