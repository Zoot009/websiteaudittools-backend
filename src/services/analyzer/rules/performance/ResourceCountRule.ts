import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class ResourceCountRule implements PageRule {
  code = 'TOO_MANY_RESOURCES';
  category = 'PERFORMANCE' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'TOO_MANY_RESOURCES',
    name: 'HTTP Requests',
    maxScore: 2,
    priority: 3,
    section: 'performance',
    informational: false,
    what: 'HTTP requests are made for every resource a page loads: HTML, CSS, JavaScript files, images, and fonts. More requests mean more round-trips to the server.',
    why: 'Each HTTP request adds latency. Pages with many requests take longer to load, especially on high-latency connections. HTTP/2 mitigates this, but reducing requests still improves performance.',
    how: 'Bundle JavaScript and CSS files, use CSS sprites or icon fonts, implement lazy loading for images, remove unused scripts, and consolidate third-party scripts using Google Tag Manager.',
    time: '2-4 hours',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    if (!page.resourceCounts) {
      const stub: SEOAuditCheck = {
        ...this.checkDefinition,
        maxScore: 0,
        informational: true,
        category: this.category,
        passed: null,
        score: 0,
        shortAnswer: 'Resource count data not available.',
        answer: 'HTTP request count could not be collected for this page.',
        recommendation: null,
        pageUrl: page.url,
      };
      return { check: stub, issues: [], passingChecks: [] };
    }

    const { scripts, stylesheets, images, fonts } = page.resourceCounts;
    const totalResources = scripts + stylesheets + images + fonts;
    const problems: string[] = [];

    if (scripts > 20) problems.push(`${scripts} JavaScript files`);
    if (stylesheets > 10) problems.push(`${stylesheets} CSS files`);
    if (images > 50) problems.push(`${images} images`);
    if (fonts > 6) problems.push(`${fonts} font files`);

    const passed = problems.length === 0;

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score: passed ? this.checkDefinition.maxScore : 0,
      shortAnswer: passed
        ? `Resource count is optimized (${totalResources} resources).`
        : `Too many HTTP requests (${totalResources} resources).`,
      answer: passed
        ? `Page loads ${totalResources} resources (${scripts} JS, ${stylesheets} CSS, ${images} images, ${fonts} fonts) — within recommended limits.`
        : `Page loads ${totalResources} resources with issues: ${problems.join(', ')}. Reduce requests by bundling files and implementing lazy loading.`,
      recommendation: passed ? null : 'Bundle JavaScript and CSS files, implement lazy loading for images, and consolidate third-party scripts.',
      data: { scripts, stylesheets, images, fonts, totalResources, problems },
      pageUrl: page.url,
    };

    const severity = problems.length >= 3 ? 'HIGH' as const : 'MEDIUM' as const;

    const issues = !passed ? [{
      category: this.category,
      type: this.code,
      title: 'Too Many HTTP Requests',
      description: check.answer,
      severity,
      impactScore: problems.length >= 3 ? 20 : 12,
      pageUrl: page.url,
    }] : [];

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: 'Resource Count Optimized',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'Limiting HTTP requests improves page load performance and reduces server load.',
    }] : [];

    return { check, issues, passingChecks };
  }
}
