/**
 * Check Core Web Vitals (LCP, CLS, FID)
 */

import type { PageRule, PageData, SiteContext, RuleResult, Issue, PassingCheck, Severity } from '../../types.js';

export class CoreWebVitalsRule implements PageRule {
  code = 'CORE_WEB_VITALS';
  category = 'PERFORMANCE' as const;
  level = 'page' as const;

  // Google's thresholds
  private readonly LCP_GOOD = 2500; // ms
  private readonly LCP_POOR = 4000; // ms
  private readonly CLS_GOOD = 0.1;
  private readonly CLS_POOR = 0.25;
  private readonly FID_GOOD = 100; // ms
  private readonly FID_POOR = 300; // ms

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    let vitalsCount = 0;
    let goodCount = 0;
    const problems: string[] = [];

    // Check LCP (Largest Contentful Paint)
    if (page.lcp !== null && page.lcp !== undefined) {
      vitalsCount++;
      if (page.lcp <= this.LCP_GOOD) {
        goodCount++;
      } else if (page.lcp >= this.LCP_POOR) {
        problems.push(`LCP is ${Math.round(page.lcp)}ms (should be <2.5s)`);
      } else {
        problems.push(`LCP is ${Math.round(page.lcp)}ms (needs improvement)`);
      }
    }

    // Check CLS (Cumulative Layout Shift)
    if (page.cls !== null && page.cls !== undefined) {
      vitalsCount++;
      if (page.cls <= this.CLS_GOOD) {
        goodCount++;
      } else if (page.cls >= this.CLS_POOR) {
        problems.push(`CLS is ${page.cls.toFixed(3)} (should be <0.1)`);
      } else {
        problems.push(`CLS is ${page.cls.toFixed(3)} (needs improvement)`);
      }
    }

    // Check FID (First Input Delay)
    if (page.fid !== null && page.fid !== undefined) {
      vitalsCount++;
      if (page.fid <= this.FID_GOOD) {
        goodCount++;
      } else if (page.fid >= this.FID_POOR) {
        problems.push(`FID is ${Math.round(page.fid)}ms (should be <100ms)`);
      } else {
        problems.push(`FID is ${Math.round(page.fid)}ms (needs improvement)`);
      }
    }

    if (vitalsCount === 0) {
      // No metrics collected
      issues.push({
        category: this.category,
        type: 'MISSING_WEB_VITALS',
        title: 'Core Web Vitals Not Measured',
        description: 'No Core Web Vitals metrics were collected for this page.',
        severity: 'LOW' as const,
        impactScore: 5,
        pageUrl: page.url,
      });
    } else if (problems.length > 0) {
      const severity: Severity = problems.length >= 2 ? 'HIGH' : 'MEDIUM';
      const impactScore = problems.length * 15;

      issues.push({
        category: this.category,
        type: this.code,
        title: 'Poor Core Web Vitals',
        description: `Page has Core Web Vitals issues: ${problems.join('; ')}. These are Google ranking factors.`,
        severity,
        impactScore,
        pageUrl: page.url,
      });
    } else {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'Good Core Web Vitals',
        description: `All ${vitalsCount} Core Web Vitals metrics pass Google's thresholds`,
        pageUrl: page.url,
        goodPractice:
          'Good Core Web Vitals (LCP, CLS, FID) improve user experience and are Google ranking factors.',
      });
    }

    return { issues, passingChecks };
  }
}
