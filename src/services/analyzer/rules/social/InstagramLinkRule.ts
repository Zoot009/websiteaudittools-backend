/**
 * Check if Instagram is linked
 */

import type { PageRule, PageData, SiteContext, RuleResult, Issue, PassingCheck } from '../../types.js';

export class InstagramLinkRule implements PageRule {
  code = 'INSTAGRAM_LINK';
  category = 'STRUCTURED_DATA' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    const hasInstagram = page.socialLinks?.instagram || false;

    // Only check homepage
    const url = new URL(page.url);
    const isHomepage = url.pathname === '/' || url.pathname === '';

    if (!isHomepage) {
      return { issues, passingChecks };
    }

    if (hasInstagram) {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'Instagram Linked',
        description: 'Site links to Instagram profile',
        pageUrl: page.url,
        goodPractice: 'Instagram presence is valuable for visual brands and customer engagement.',
      });
    }

    return { issues, passingChecks };
  }
}
