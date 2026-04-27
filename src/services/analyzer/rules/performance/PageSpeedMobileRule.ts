import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck, Issue } from '../../types.js';

export class PageSpeedMobileRule implements PageRule {
  code = 'PAGESPEED_MOBILE';
  category = 'PERFORMANCE' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'PAGESPEED_MOBILE',
    name: 'Mobile Performance',
    maxScore: 5,
    priority: 1,
    section: 'performance',
    informational: false,
    what: 'Mobile performance score from Google PageSpeed Insights measures how well your page performs on mobile devices, including Core Web Vitals and other performance metrics.',
    why: 'Mobile-first indexing means Google primarily uses the mobile version of your site for ranking. A poor mobile score directly impacts rankings and frustrates the majority of users who browse on mobile.',
    how: 'Focus on improving Core Web Vitals (LCP, INP, CLS), optimize images for mobile, minimize JavaScript, use responsive design, and leverage browser caching. Review the specific recommendations in PageSpeed Insights.',
    time: '4-8 hours',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    const pageSpeed = page.pageSpeed?.mobile;

    if (!pageSpeed) {
      const stub: SEOAuditCheck = {
        ...this.checkDefinition,
        maxScore: 0,
        informational: true,
        category: this.category,
        passed: null,
        score: 0,
        shortAnswer: 'PageSpeed mobile data not available.',
        answer: 'Google PageSpeed Insights mobile data was not collected for this page.',
        recommendation: null,
        pageUrl: page.url,
      };
      return { check: stub, issues: [], passingChecks: [] };
    }

    const psScore: number = pageSpeed.performanceScore;
    const passed = psScore >= 90;
    const score = Math.round((psScore / 100) * this.checkDefinition.maxScore);

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score,
      shortAnswer: passed
        ? `Excellent mobile performance score: ${psScore}/100.`
        : `Mobile performance score: ${psScore}/100 — needs improvement.`,
      answer: passed
        ? `Mobile PageSpeed Insights score is ${psScore}/100 — excellent performance for mobile users.`
        : psScore < 50
          ? `Mobile performance score is ${psScore}/100 — poor. This affects user experience and search rankings on mobile devices.`
          : `Mobile performance score is ${psScore}/100. Aim for 90+ for optimal user experience.`,
      recommendation: passed ? null : 'Improve Core Web Vitals (LCP, INP, CLS), optimize images, and minimize JavaScript to improve the mobile performance score.',
      value: psScore,
      data: { performanceScore: psScore, fieldData: pageSpeed.fieldData, opportunities: pageSpeed.opportunities },
      pageUrl: page.url,
    };

    const issues: Issue[] = [];

    if (!passed) {
      issues.push({
        category: this.category,
        type: this.code,
        title: psScore < 50 ? 'Poor Mobile Performance Score' : 'Mobile Performance Needs Improvement',
        description: check.answer,
        severity: psScore < 50 ? 'CRITICAL' as const : 'HIGH' as const,
        impactScore: psScore < 50 ? 95 : 75,
        pageUrl: page.url,
      });
    }

    // Add field data issues
    if (pageSpeed.fieldData) {
      const { lcp, fid, cls, inp } = pageSpeed.fieldData;
      const interactionMetric = inp ?? fid;
      const metricName = inp ? 'INP' : 'FID';

      if (lcp?.category === 'SLOW') {
        issues.push({
          category: this.category,
          type: 'core_web_vitals_lcp_slow',
          title: 'Slow LCP on Mobile',
          description: `Mobile LCP is ${Math.round(lcp.value)}ms (should be <2500ms). This is a Core Web Vital that directly impacts search rankings.`,
          severity: 'CRITICAL' as const,
          impactScore: 90,
          pageUrl: page.url,
        });
      }

      if (interactionMetric?.category === 'SLOW') {
        issues.push({
          category: this.category,
          type: 'core_web_vitals_interaction_slow',
          title: `Slow ${metricName} on Mobile`,
          description: `Mobile ${metricName} is ${Math.round(interactionMetric.value)}ms (should be <${inp ? '200ms' : '100ms'}). Poor interactivity frustrates users.`,
          severity: 'CRITICAL' as const,
          impactScore: 85,
          pageUrl: page.url,
        });
      }

      if (cls?.category === 'SLOW') {
        issues.push({
          category: this.category,
          type: 'core_web_vitals_cls_poor',
          title: 'Poor CLS on Mobile',
          description: `Mobile CLS is ${(cls.value / 100).toFixed(3)} (should be <0.1). Layout shifts create a frustrating experience.`,
          severity: 'HIGH' as const,
          impactScore: 80,
          pageUrl: page.url,
        });
      }
    }

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: 'Excellent Mobile Performance',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'High mobile performance scores improve rankings and provide excellent user experience for mobile visitors.',
    }] : [];

    return { check, issues, passingChecks };
  }
}
