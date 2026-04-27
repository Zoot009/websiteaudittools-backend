import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck, Issue } from '../../types.js';

export class PageSpeedDesktopRule implements PageRule {
  code = 'PAGESPEED_DESKTOP';
  category = 'PERFORMANCE' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'PAGESPEED_DESKTOP',
    name: 'Desktop Performance',
    maxScore: 4,
    priority: 2,
    section: 'performance',
    informational: false,
    what: 'Desktop performance score from Google PageSpeed Insights measures how well your page performs on desktop browsers, including load times and rendering metrics.',
    why: 'A fast desktop experience reduces bounce rates, improves conversions, and provides a good user experience for desktop visitors. Desktop performance also contributes to overall performance assessment.',
    how: 'Optimize images, minify assets, reduce render-blocking resources, enable caching, reduce JavaScript execution time, and remove unused code. Review specific PageSpeed Insights recommendations.',
    time: '2-4 hours',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    const pageSpeed = page.pageSpeed?.desktop;

    if (!pageSpeed) {
      const stub: SEOAuditCheck = {
        ...this.checkDefinition,
        maxScore: 0,
        informational: true,
        category: this.category,
        passed: null,
        score: 0,
        shortAnswer: 'PageSpeed desktop data not available.',
        answer: 'Google PageSpeed Insights desktop data was not collected for this page.',
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
        ? `Excellent desktop performance score: ${psScore}/100.`
        : `Desktop performance score: ${psScore}/100 — needs improvement.`,
      answer: passed
        ? `Desktop PageSpeed Insights score is ${psScore}/100 — excellent performance for desktop users.`
        : psScore < 50
          ? `Desktop performance score is ${psScore}/100 — poor. Optimize assets, reduce JavaScript execution time, and minimize render-blocking resources.`
          : `Desktop performance score is ${psScore}/100. Consider implementing optimization suggestions to reach 90+.`,
      recommendation: passed ? null : 'Review PageSpeed Insights recommendations, optimize images, minify assets, and reduce render-blocking JavaScript.',
      value: psScore,
      data: { performanceScore: psScore, labData: pageSpeed.labData },
      pageUrl: page.url,
    };

    const issues: Issue[] = [];

    if (!passed) {
      issues.push({
        category: this.category,
        type: this.code,
        title: psScore < 50 ? 'Poor Desktop Performance Score' : 'Desktop Performance Needs Improvement',
        description: check.answer,
        severity: psScore < 50 ? 'HIGH' as const : 'MEDIUM' as const,
        impactScore: psScore < 50 ? 75 : 55,
        pageUrl: page.url,
      });
    }

    if (pageSpeed.labData) {
      const { fcp, lcp, tbt, cls } = pageSpeed.labData;

      if (lcp > 2500) {
        issues.push({
          category: this.category,
          type: 'pagespeed_desktop_lcp_slow',
          title: 'Slow Desktop LCP',
          description: `Desktop LCP is ${(lcp / 1000).toFixed(1)}s (should be <2.5s). Main content loads slowly.`,
          severity: 'HIGH' as const,
          impactScore: 70,
          pageUrl: page.url,
        });
      }

      if (tbt > 600) {
        issues.push({
          category: this.category,
          type: 'pagespeed_desktop_tbt_high',
          title: 'High Total Blocking Time',
          description: `Desktop TBT is ${tbt.toFixed(0)}ms. Long JavaScript tasks block user interaction. Break up long tasks and defer unused JavaScript.`,
          severity: 'MEDIUM' as const,
          impactScore: 65,
          pageUrl: page.url,
        });
      }

      if (cls > 0.1) {
        issues.push({
          category: this.category,
          type: 'pagespeed_desktop_cls_poor',
          title: 'Desktop Layout Instability (CLS)',
          description: `Desktop CLS is ${cls.toFixed(3)} (should be <0.1). Elements shift during page load. Reserve space for images and embeds.`,
          severity: 'MEDIUM' as const,
          impactScore: 55,
          pageUrl: page.url,
        });
      }
    }

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: 'Excellent Desktop Performance',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'High desktop performance scores reduce bounce rates and improve user experience for desktop visitors.',
    }] : [];

    return { check, issues, passingChecks };
  }
}
