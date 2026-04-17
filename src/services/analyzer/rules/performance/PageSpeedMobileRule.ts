/**
 * PageSpeed Mobile Performance Rule
 * Checks mobile performance score and Core Web Vitals
 */

import type { PageRule, PageData, SiteContext, RuleResult, Issue, PassingCheck } from '../../types.js';

export class PageSpeedMobileRule implements PageRule {
  code = 'PAGESPEED_MOBILE';
  category = 'PERFORMANCE' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    const pageSpeed = page.pageSpeed?.mobile;

    // Check if PageSpeed data is available
    if (!pageSpeed) {
      // Don't report as issue if API is not configured
      return { issues, passingChecks };
    }

    // Check performance score
    const score = pageSpeed.performanceScore;
    
    if (score < 50) {
      issues.push({
        type: 'pagespeed_mobile_score_poor',
        category: 'PERFORMANCE',
        title: 'Poor Mobile Performance Score',
        description: `Mobile performance score is ${score}/100, which is in the poor range. This affects user experience and search rankings. Focus on improving Core Web Vitals and following the optimization suggestions.`,
        severity: 'CRITICAL' as const,
        impactScore: 95,
        pageUrl: page.url,
      });
    } else if (score < 90) {
      issues.push({
        type: 'pagespeed_mobile_score_needs_improvement',
        category: 'PERFORMANCE',
        title: 'Mobile Performance Needs Improvement',
        description: `Mobile performance score is ${score}/100. While functional, there's room for improvement. Aim for a score above 90 for optimal user experience.`,
        severity: 'HIGH' as const,
        impactScore: 75,
        pageUrl: page.url,
      });
    } else {
      passingChecks.push({
        category: 'PERFORMANCE',
        code: 'pagespeed_mobile_score_good',
        title: 'Excellent Mobile Performance Score',
        description: `Mobile performance score is ${score}/100, indicating excellent performance.`,
        pageUrl: page.url,
        goodPractice: 'Meets best practice standards',
      });
    }

    // Check Core Web Vitals (Field Data - Real User Metrics)
    if (pageSpeed.fieldData) {
      const { lcp, fid, cls, inp } = pageSpeed.fieldData;

      // Largest Contentful Paint (LCP)
      if (lcp) {
        if (lcp.category === 'SLOW') {
          issues.push({
            type: 'core_web_vitals_lcp_slow',
            category: 'PERFORMANCE',
            title: 'Slow Largest Contentful Paint (LCP)',
            description: `Mobile LCP is ${Math.round(lcp.value)}ms (slow). LCP measures loading performance and should be under 2.5 seconds. This is a Core Web Vital that directly impacts search rankings.`,
            severity: 'CRITICAL' as const,
            impactScore: 90,
            pageUrl: page.url,
          });
        } else if (lcp.category === 'AVERAGE') {
          issues.push({
            type: 'core_web_vitals_lcp_average',
            category: 'PERFORMANCE',
            title: 'Average Largest Contentful Paint (LCP)',
            description: `Mobile LCP is ${Math.round(lcp.value)}ms (average). Aim for under 2.5 seconds for a good rating.`,
            severity: 'HIGH' as const,
            impactScore: 70,
            pageUrl: page.url,
          });
        } else {
          passingChecks.push({
            category: 'PERFORMANCE',
            code: 'core_web_vitals_lcp_good',
            title: 'Good Largest Contentful Paint (LCP)',
            description: `Mobile LCP is ${Math.round(lcp.value)}ms (fast), meeting Core Web Vitals standards.`,
            pageUrl: page.url,
            goodPractice: 'Meets best practice standards',
          });
        }
      }

      // First Input Delay / Interaction to Next Paint
      const interactionMetric = inp || fid;
      if (interactionMetric) {
        const metricName = inp ? 'INP' : 'FID';
        if (interactionMetric.category === 'SLOW') {
          issues.push({
            type: 'core_web_vitals_interaction_slow',
            category: 'PERFORMANCE',
            title: `Slow ${metricName} - Poor Interactivity`,
            description: `Mobile ${metricName} is ${Math.round(interactionMetric.value)}ms (slow). This measures responsiveness and should be under ${inp ? '200ms' : '100ms'}. Slow interactivity frustrates users and hurts rankings.`,
            severity: 'CRITICAL' as const,
            impactScore: 85,
            pageUrl: page.url,
          });
        } else if (interactionMetric.category === 'AVERAGE') {
          issues.push({
            type: 'core_web_vitals_interaction_average',
            category: 'PERFORMANCE',
            title: `Average ${metricName} - Interactivity Needs Improvement`,
            description: `Mobile ${metricName} is ${Math.round(interactionMetric.value)}ms (average). Reduce JavaScript blocking time for better interactivity.`,
            severity: 'HIGH' as const,
            impactScore: 65,
            pageUrl: page.url,
          });
        } else {
          passingChecks.push({
            category: 'PERFORMANCE',
            code: 'core_web_vitals_interaction_good',
            title: `Good ${metricName} - Responsive Page`,
            description: `Mobile ${metricName} is ${Math.round(interactionMetric.value)}ms (fast), providing excellent interactivity.`,
            pageUrl: page.url,
            goodPractice: 'Meets best practice standards',
          });
        }
      }

      // Cumulative Layout Shift (CLS)
      if (cls) {
        if (cls.category === 'SLOW') {
          issues.push({
            type: 'core_web_vitals_cls_poor',
            category: 'PERFORMANCE',
            title: 'Poor Cumulative Layout Shift (CLS)',
            description: `Mobile CLS is ${(cls.value / 100).toFixed(3)} (poor). CLS measures visual stability and should be under 0.1. Unexpected layout shifts create a frustrating user experience.`,
            severity: 'HIGH' as const,
            impactScore: 80,
            pageUrl: page.url,
          });
        } else if (cls.category === 'AVERAGE') {
          issues.push({
            type: 'core_web_vitals_cls_average',
            category: 'PERFORMANCE',
            title: 'Average Cumulative Layout Shift (CLS)',
            description: `Mobile CLS is ${(cls.value / 100).toFixed(3)} (average). Reduce unexpected layout shifts by reserving space for images and ads.`,
            severity: 'MEDIUM' as const,
            impactScore: 60,
            pageUrl: page.url,
          });
        } else {
          passingChecks.push({
            category: 'PERFORMANCE',
            code: 'core_web_vitals_cls_good',
            title: 'Good Cumulative Layout Shift (CLS)',
            description: `Mobile CLS is ${(cls.value / 100).toFixed(3)} (good), providing a stable visual experience.`,
            pageUrl: page.url,
            goodPractice: 'Meets best practice standards',
          });
        }
      }
    }

    // Report top optimization opportunities
    if (pageSpeed.opportunities && pageSpeed.opportunities.length > 0) {
      const topOpportunities = pageSpeed.opportunities.slice(0, 3);
      
      if (topOpportunities.some((opp: any) => opp.potentialSavings > 1000)) {
        const opportunityList = topOpportunities
          .map((opp: any) => `• ${opp.title} (save ${(opp.potentialSavings / 1000).toFixed(1)}s)`)
          .join('\n');

        issues.push({
          type: 'pagespeed_optimization_opportunities',
          category: 'PERFORMANCE',
          title: 'Major Performance Optimization Opportunities',
          description: `PageSpeed Insights identified significant optimization opportunities on mobile:\n${opportunityList}`,
          severity: 'MEDIUM' as const,
          impactScore: 70,
          pageUrl: page.url,
        });
      }
    }

    return { issues, passingChecks };
  }
}
