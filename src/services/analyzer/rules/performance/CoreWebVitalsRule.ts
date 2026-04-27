import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck, Severity } from '../../types.js';

export class CoreWebVitalsRule implements PageRule {
  code = 'CORE_WEB_VITALS';
  category = 'PERFORMANCE' as const;
  level = 'page' as const;

  private readonly LCP_GOOD = 2500;
  private readonly LCP_POOR = 4000;
  private readonly CLS_GOOD = 0.1;
  private readonly CLS_POOR = 0.25;
  private readonly FID_GOOD = 100;
  private readonly FID_POOR = 300;

  readonly checkDefinition: CheckDefinition = {
    id: 'CORE_WEB_VITALS',
    name: 'Core Web Vitals',
    maxScore: 5,
    priority: 1,
    section: 'performance',
    informational: false,
    what: 'Core Web Vitals are Google\'s user experience metrics: LCP (loading performance), FID/INP (interactivity), and CLS (visual stability). They are confirmed ranking factors.',
    why: 'Core Web Vitals directly impact rankings and user experience. Pages with poor vitals may rank lower, lose traffic, and experience higher bounce rates.',
    how: 'Improve LCP by optimizing images, removing render-blocking resources, and using a CDN. Reduce CLS by specifying image/video dimensions. Improve FID by minimizing JavaScript. Use Google PageSpeed Insights to identify specific issues.',
    time: '4-8 hours',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    let vitalsCount = 0;
    let goodCount = 0;
    const problems: string[] = [];

    if (page.lcp !== null && page.lcp !== undefined) {
      vitalsCount++;
      if (page.lcp <= this.LCP_GOOD) goodCount++;
      else problems.push(`LCP is ${Math.round(page.lcp)}ms (should be <2.5s)`);
    }

    if (page.cls !== null && page.cls !== undefined) {
      vitalsCount++;
      if (page.cls <= this.CLS_GOOD) goodCount++;
      else problems.push(`CLS is ${page.cls.toFixed(3)} (should be <0.1)`);
    }

    if (page.fid !== null && page.fid !== undefined) {
      vitalsCount++;
      if (page.fid <= this.FID_GOOD) goodCount++;
      else problems.push(`FID is ${Math.round(page.fid)}ms (should be <100ms)`);
    }

    if (vitalsCount === 0) {
      const stub: SEOAuditCheck = {
        ...this.checkDefinition,
        maxScore: 0,
        informational: true,
        category: this.category,
        passed: null,
        score: 0,
        shortAnswer: 'Core Web Vitals not measured.',
        answer: 'No Core Web Vitals data was collected for this page.',
        recommendation: null,
        pageUrl: page.url,
      };
      return { check: stub, issues: [], passingChecks: [] };
    }

    const passed = problems.length === 0;
    const score = Math.round((goodCount / vitalsCount) * this.checkDefinition.maxScore);

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score,
      shortAnswer: passed
        ? `All ${vitalsCount} Core Web Vitals pass Google's thresholds.`
        : `${problems.length} Core Web Vital(s) need improvement.`,
      answer: passed
        ? `All ${vitalsCount} measured Core Web Vitals (LCP, CLS, FID) pass Google's thresholds. Good user experience is expected.`
        : `Core Web Vitals issues: ${problems.join('; ')}. These are Google ranking factors.`,
      recommendation: passed ? null : 'Address Core Web Vitals issues to improve rankings and user experience. Use Google PageSpeed Insights for detailed recommendations.',
      data: { lcp: page.lcp, cls: page.cls, fid: page.fid, goodCount, vitalsCount, problems },
      pageUrl: page.url,
    };

    const severity: Severity = problems.length >= 2 ? 'HIGH' : 'MEDIUM';

    const issues = !passed ? [{
      category: this.category,
      type: this.code,
      title: 'Poor Core Web Vitals',
      description: check.answer,
      severity,
      impactScore: problems.length * 15,
      pageUrl: page.url,
    }] : [];

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: 'Good Core Web Vitals',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'Good Core Web Vitals (LCP, CLS, FID) improve user experience and are Google ranking factors.',
    }] : [];

    return { check, issues, passingChecks };
  }
}
