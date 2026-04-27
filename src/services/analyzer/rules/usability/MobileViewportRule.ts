import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class MobileViewportRule implements PageRule {
  code = 'MOBILE_VIEWPORT';
  category = 'ACCESSIBILITY' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'MOBILE_VIEWPORT',
    name: 'Mobile Viewport',
    maxScore: 3,
    priority: 2,
    section: 'ui',
    informational: false,
    what: 'The viewport meta tag controls how a page is displayed on mobile devices, setting the visible area and initial zoom level.',
    why: 'Without a proper viewport tag, mobile browsers render pages at desktop width and scale them down, making text tiny and requiring users to pinch-zoom. Google uses mobile-first indexing and penalizes non-mobile-friendly pages.',
    how: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> to your HTML <head>. Ensure you don\'t use user-scalable=no as it prevents users from zooming for accessibility.',
    time: '15 minutes',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    const viewport = page.viewport;

    if (!viewport) {
      const stub: SEOAuditCheck = {
        ...this.checkDefinition,
        maxScore: 0,
        informational: true,
        category: this.category,
        passed: null,
        score: 0,
        shortAnswer: 'Viewport data not available.',
        answer: 'Viewport meta tag status could not be determined for this page.',
        recommendation: null,
        pageUrl: page.url,
      };
      return { check: stub, issues: [], passingChecks: [] };
    }

    if (!viewport.hasViewport) {
      const check: SEOAuditCheck = {
        ...this.checkDefinition,
        category: this.category,
        passed: false,
        score: 0,
        shortAnswer: 'Missing mobile viewport tag.',
        answer: 'Page does not have a viewport meta tag. Mobile browsers will render the page at desktop width, requiring users to zoom in to read content.',
        recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> to your HTML <head>.',
        data: { hasViewport: false },
        pageUrl: page.url,
      };
      return {
        check,
        issues: [{
          category: this.category,
          type: this.code,
          title: 'Missing Mobile Viewport Tag',
          description: check.answer,
          severity: 'HIGH' as const,
          impactScore: 25,
          pageUrl: page.url,
        }],
        passingChecks: [],
      };
    }

    const content = viewport.content ?? '';
    const hasWidthDevice = content.includes('width=device-width');
    const hasInitialScale = content.includes('initial-scale=1');
    const fullyOptimized = hasWidthDevice && hasInitialScale;
    const passed = true;
    const score = fullyOptimized ? this.checkDefinition.maxScore : 2;

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score,
      shortAnswer: fullyOptimized
        ? 'Mobile viewport is properly configured.'
        : 'Viewport tag present but not fully optimized.',
      answer: fullyOptimized
        ? `Viewport meta tag is properly configured: "${content}". Page is optimized for mobile devices.`
        : `Viewport tag is present but may not be optimally configured: "${content}". Missing ${!hasWidthDevice ? 'width=device-width' : 'initial-scale=1'}.`,
      recommendation: fullyOptimized ? null : 'Update viewport tag to include both width=device-width and initial-scale=1 for best mobile experience.',
      data: { hasViewport: true, content, hasWidthDevice, hasInitialScale },
      pageUrl: page.url,
    };

    const issues = !fullyOptimized ? [{
      category: this.category,
      type: this.code,
      title: 'Viewport Tag Needs Optimization',
      description: check.answer,
      severity: 'MEDIUM' as const,
      impactScore: 15,
      pageUrl: page.url,
    }] : [];

    const passingChecks = [{
      category: this.category,
      code: this.code,
      title: fullyOptimized ? 'Mobile Viewport Configured' : 'Viewport Tag Present',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'Proper viewport configuration ensures your site is mobile-friendly and provides a good user experience on all devices.',
    }];

    return { check, issues, passingChecks };
  }
}
