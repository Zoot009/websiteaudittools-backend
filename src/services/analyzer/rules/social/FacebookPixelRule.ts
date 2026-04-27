import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class FacebookPixelRule implements PageRule {
  code = 'FACEBOOK_PIXEL';
  category = 'STRUCTURED_DATA' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'FACEBOOK_PIXEL',
    name: 'Facebook Pixel',
    maxScore: 0,
    priority: 3,
    section: 'social',
    informational: true,
    what: 'The Facebook Pixel is a snippet of JavaScript code that tracks user activity on your website, enabling conversion tracking and retargeting for Facebook ad campaigns.',
    why: 'Facebook Pixel helps measure the effectiveness of your Facebook advertising by tracking actions users take after clicking your ads, enabling smarter ad targeting and better ROI measurement.',
    how: 'Create a Facebook Pixel in your Facebook Ads Manager, then add the base code to every page of your website. Use a tag manager like Google Tag Manager for easier deployment.',
    time: '1-2 hours',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    const url = new URL(page.url);
    const isHomepage = url.pathname === '/' || url.pathname === '';

    if (!isHomepage) {
      const stub: SEOAuditCheck = {
        ...this.checkDefinition,
        category: this.category,
        passed: null,
        score: 0,
        shortAnswer: 'Facebook Pixel check applies to homepage only.',
        answer: 'Facebook Pixel detection is evaluated on the homepage only.',
        recommendation: null,
        pageUrl: page.url,
      };
      return { check: stub, issues: [], passingChecks: [] };
    }

    const hasPixel = page.hasFacebookPixel ?? false;

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed: null,
      score: 0,
      shortAnswer: hasPixel ? 'Facebook Pixel is installed.' : 'No Facebook Pixel detected.',
      answer: hasPixel
        ? 'Facebook Pixel is installed, enabling conversion tracking and retargeting for Facebook ad campaigns.'
        : 'No Facebook Pixel detected. Install it if you run Facebook ad campaigns.',
      recommendation: null,
      data: { hasPixel },
      pageUrl: page.url,
    };

    const passingChecks = hasPixel ? [{
      category: this.category,
      code: this.code,
      title: 'Facebook Pixel Detected',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'Facebook Pixel enables conversion tracking and retargeting for Facebook ads.',
    }] : [];

    return { check, issues: [], passingChecks };
  }
}
