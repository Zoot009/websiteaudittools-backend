/**
 * Check if Twitter/X account is linked
 */

import type { PageRule, PageData, SiteContext, RuleResult, Issue, PassingCheck } from '../../types.js';

export class TwitterLinkRule implements PageRule {
  code = 'TWITTER_LINK';
  category = 'STRUCTURED_DATA' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    const hasTwitter = page.socialLinks?.twitter || false;

    // Only check homepage  
    const url = new URL(page.url);
    const isHomepage = url.pathname === '/' || url.pathname === '';

    if (!isHomepage) {
      return { issues, passingChecks };
    }

    if (hasTwitter) {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'Twitter/X Account Linked',
        description: 'Site links to Twitter/X account',
        pageUrl: page.url,
        goodPractice: 'Social media presence helps with brand awareness and customer engagement.',
      });
    }

    return { issues, passingChecks };
  }
}
