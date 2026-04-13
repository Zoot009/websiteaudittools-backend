/**
 * Check if Facebook page is linked
 */

import type { PageRule, PageData, SiteContext, RuleResult, Issue, PassingCheck } from '../../types.js';

export class FacebookLinkRule implements PageRule {
  code = 'FACEBOOK_LINK';
  category = 'STRUCTURED_DATA' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    const hasFacebook = page.socialLinks?.facebook || false;

    // Only check homepage for social links
    const url = new URL(page.url);
    const isHomepage = url.pathname === '/' || url.pathname === '';

    if (!isHomepage) {
      return { issues, passingChecks };
    }

    if (hasFacebook) {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'Facebook Page Linked',
        description: 'Site links to Facebook page',
        pageUrl: page.url,
        goodPractice: 'Social media presence can improve brand visibility and user engagement.',
      });
    }

    return { issues, passingChecks };
  }
}
