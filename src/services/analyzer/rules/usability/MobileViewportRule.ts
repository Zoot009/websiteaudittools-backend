/**
 * Check if mobile viewport meta tag is configured
 */

import type { PageRule, PageData, SiteContext, RuleResult, Issue, PassingCheck } from '../../types.js';

export class MobileViewportRule implements PageRule {
  code = 'MOBILE_VIEWPORT';
  category = 'ACCESSIBILITY' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    const viewport = page.viewport;
    
    if (!viewport) {
      return { issues, passingChecks };
    }

    if (!viewport.hasViewport) {
      issues.push({
        category: this.category,
        type: this.code,
        severity: 'HIGH',
        title: 'Missing Mobile Viewport Tag',
        description: 'This page does not have a viewport meta tag configured for mobile devices. Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> to ensure your site displays correctly on mobile devices.',
        impactScore: 25,
        pageUrl: page.url,
      });
    } else {
      // Check if viewport is properly configured
      const content = viewport.content || '';
      const hasWidthDevice = content.includes('width=device-width');
      const hasInitialScale = content.includes('initial-scale=1');

      if (!hasWidthDevice || !hasInitialScale) {
        issues.push({
          category: this.category,
          type: this.code,
          severity: 'MEDIUM',
          title: 'Viewport Tag Needs Optimization',
          description: `Viewport tag is present but may not be optimally configured: "${content}". Update to include both width=device-width and initial-scale=1 for best mobile experience.`,
          impactScore: 15,
          pageUrl: page.url,
        });
      } else {
        passingChecks.push({
          category: this.category,
          code: this.code,
          title: 'Mobile Viewport Configured',
          description: `Viewport meta tag is properly configured: "${content}"`,
          pageUrl: page.url,
          goodPractice:
            'Proper viewport configuration ensures your site is mobile-friendly and provides a good user experience on all devices.',
        });
      }
    }

    return { issues, passingChecks };
  }
}
