/**
 * Check if Facebook Pixel is detected
 */

import type { PageRule, PageData, SiteContext, RuleResult, Issue, PassingCheck } from '../../types.js';

export class FacebookPixelRule implements PageRule {
  code = 'FACEBOOK_PIXEL';
  category = 'STRUCTURED_DATA' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    const hasPixel = page.hasFacebookPixel || false;

    // Only check homepage
    const url = new URL(page.url);
    const isHomepage = url.pathname === '/' || url.pathname === '';

    if (!isHomepage) {
      return { issues, passingChecks };
    }

    if (hasPixel) {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'Facebook Pixel Detected',
        description: 'Facebook Pixel is installed for tracking',
        pageUrl: page.url,
        goodPractice:
          'Facebook Pixel enables conversion tracking and retargeting for Facebook ads.',
      });
    }

    return { issues, passingChecks };
  }
}
