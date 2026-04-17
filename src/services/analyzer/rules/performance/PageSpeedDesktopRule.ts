/**
 * PageSpeed Desktop Performance Rule
 * Checks desktop performance score
 */

import type { PageRule, PageData, SiteContext, RuleResult, Issue, PassingCheck } from '../../types.js';

export class PageSpeedDesktopRule implements PageRule {
  code = 'PAGESPEED_DESKTOP';
  category = 'PERFORMANCE' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    const pageSpeed = page.pageSpeed?.desktop;

    // Check if PageSpeed data is available
    if (!pageSpeed) {
      return { issues, passingChecks };
    }

    // Check performance score
    const score = pageSpeed.performanceScore;
    
    if (score < 50) {
      issues.push({
        type: 'pagespeed_desktop_score_poor',
        category: 'PERFORMANCE',
        title: 'Poor Desktop Performance Score',
        description: `Desktop performance score is ${score}/100, which is in the poor range. Optimize assets, reduce JavaScript execution time, and minimize render-blocking resources.`,
        severity: 'HIGH' as const,
        impactScore: 75,
        pageUrl: page.url,
      });
    } else if (score < 90) {
      issues.push({
        type: 'pagespeed_desktop_score_needs_improvement',
        category: 'PERFORMANCE',
        title: 'Desktop Performance Needs Improvement',
        description: `Desktop performance score is ${score}/100. Consider implementing the optimization suggestions to reach 90+.`,
        severity: 'MEDIUM' as const,
        impactScore: 55,
        pageUrl: page.url,
      });
    } else {
      passingChecks.push({
        category: 'PERFORMANCE',
        code: 'pagespeed_desktop_score_good',
        title: 'Excellent Desktop Performance Score',
        description: `Desktop performance score is ${score}/100, indicating excellent performance.`,
        pageUrl: page.url,
        goodPractice: 'Meets best practice standards',
      });
    }

    // Check lab data metrics for desktop
    if (pageSpeed.labData) {
      const { fcp, lcp, tbt, cls } = pageSpeed.labData;

      // First Contentful Paint
      if (fcp > 3000) {
        issues.push({
          type: 'pagespeed_desktop_fcp_slow',
          category: 'PERFORMANCE',
          title: 'Slow First Contentful Paint',
          description: `Desktop FCP is ${(fcp / 1000).toFixed(1)}s. Users see content slowly, creating a poor first impression. Optimize server response time and reduce render-blocking resources.`,
          severity: 'MEDIUM' as const,
          impactScore: 60,
          pageUrl: page.url,
        });
      }

      // Largest Contentful Paint
      if (lcp > 2500) {
        issues.push({
          type: 'pagespeed_desktop_lcp_slow',
          category: 'PERFORMANCE',
          title: 'Slow Desktop LCP',
          description: `Desktop LCP is ${(lcp / 1000).toFixed(1)}s. Main content loads slowly. Optimize images, preload key resources, and improve server response time.`,
          severity: 'HIGH' as const,
          impactScore: 70,
          pageUrl: page.url,
        });
      }

      // Total Blocking Time
      if (tbt > 600) {
        issues.push({
          type: 'pagespeed_desktop_tbt_high',
          category: 'PERFORMANCE',
          title: 'High Total Blocking Time',
          description: `Desktop TBT is ${tbt.toFixed(0)}ms. Long JavaScript tasks block user interaction. Break up long tasks, defer unused JavaScript, and minimize third-party scripts.`,
          severity: 'MEDIUM' as const,
          impactScore: 65,
          pageUrl: page.url,
        });
      }

      // Cumulative Layout Shift
      if (cls > 0.1) {
        issues.push({
          type: 'pagespeed_desktop_cls_poor',
          category: 'PERFORMANCE',
          title: 'Desktop Layout Instability',
          description: `Desktop CLS is ${cls.toFixed(3)}. Elements shift during page load, creating a jarring experience. Reserve space for images, ads, and embeds.`,
          severity: 'MEDIUM' as const,
          impactScore: 55,
          pageUrl: page.url,
        });
      }
    }

    return { issues, passingChecks };
  }
}
