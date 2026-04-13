/**
 * Check if LinkedIn is linked
 */

import type { PageRule, PageData, SiteContext, RuleResult, Issue, PassingCheck } from '../../types.js';

export class LinkedInLinkRule implements PageRule {
  code = 'LINKEDIN_LINK';
  category = 'STRUCTURED_DATA' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    const hasLinkedIn = page.socialLinks?.linkedin || false;

    // Only check homepage
    const url = new URL(page.url);
    const isHomepage = url.pathname === '/' || url.pathname === '';

    if (!isHomepage) {
      return { issues, passingChecks };
    }

    if (hasLinkedIn) {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'LinkedIn Linked',
        description: 'Site links to LinkedIn profile/page',
        pageUrl: page.url,
        goodPractice: 'LinkedIn presence is valuable for B2B businesses and professional networking.',
      });
    }

    return { issues, passingChecks };
  }
}
