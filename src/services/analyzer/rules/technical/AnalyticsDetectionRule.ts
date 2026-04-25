import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

interface AnalyticsDetection {
  googleAnalytics: boolean;
  googleTagManager: boolean;
  facebookPixel: boolean;
  hotjar: boolean;
  total: number;
  tools: string[];
}

export class AnalyticsDetectionRule implements PageRule {
  code = 'ANALYTICS_DETECTION';
  category = 'TECHNICAL' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'ANALYTICS_DETECTION',
    name: 'Analytics',
    maxScore: 2,
    priority: 3,
    section: 'technology',
    informational: false,
    what: 'Web analytics tools like Google Analytics, Google Tag Manager, or Facebook Pixel track user behavior on your site, providing crucial data about traffic, conversions, and user engagement.',
    why: 'Without analytics, you\'re flying blind. Analytics data is essential for measuring SEO success, understanding user behavior, making data-driven decisions, and tracking ROI of your SEO efforts.',
    how: 'Install Google Analytics 4 (GA4) by adding the tracking code to your site\'s <head> section. For WordPress, use plugins like MonsterInsights or Site Kit. For Shopify, enable Google Analytics in the store settings.',
    time: '30 minutes',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    const html = page.html.toLowerCase();
    const detection = this.detectAnalytics(html);
    const passed = detection.total > 0;

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score: passed ? this.checkDefinition.maxScore : 0,
      shortAnswer: passed
        ? `${detection.total} analytics tool(s) detected: ${detection.tools.join(', ')}.`
        : 'No analytics tools detected.',
      answer: passed
        ? `Found ${detection.total} analytics tool(s): ${detection.tools.join(', ')}. Your site is actively tracking visitor data.`
        : 'No analytics tools detected on this page. Analytics are essential for measuring SEO success and understanding user behavior.',
      recommendation: passed ? null : 'Install Google Analytics 4 or another analytics tool to track traffic and measure SEO performance.',
      data: detection,
      pageUrl: page.url,
    };

    const issues = !passed ? [{
      category: this.category,
      type: this.code,
      title: 'Analytics Tracking Missing',
      description: check.answer,
      severity: 'LOW' as const,
      impactScore: 5,
      pageUrl: page.url,
    }] : [];

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: 'Analytics Tools Detected',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'Analytics tools help measure SEO success, understand user behavior, and make data-driven decisions.',
    }] : [];

    return { check, issues, passingChecks };
  }

  private detectAnalytics(html: string): AnalyticsDetection {
    const detection: AnalyticsDetection = {
      googleAnalytics: false,
      googleTagManager: false,
      facebookPixel: false,
      hotjar: false,
      total: 0,
      tools: [],
    };

    if (
      html.includes('google-analytics.com/analytics.js') ||
      html.includes('googletagmanager.com/gtag/js') ||
      html.includes('gtag(')
    ) {
      detection.googleAnalytics = true;
      detection.tools.push('Google Analytics');
      detection.total++;
    }

    if (html.includes('googletagmanager.com/gtm.js') || html.includes('gtm.start')) {
      detection.googleTagManager = true;
      detection.tools.push('Google Tag Manager');
      detection.total++;
    }

    if (html.includes('connect.facebook.net') || html.includes('fbq(')) {
      detection.facebookPixel = true;
      detection.tools.push('Facebook Pixel');
      detection.total++;
    }

    if (html.includes('static.hotjar.com') || html.includes('hj(')) {
      detection.hotjar = true;
      detection.tools.push('Hotjar');
      detection.total++;
    }

    return detection;
  }
}
