/**
 * Check if YouTube channel is linked
 */

import type { PageRule, PageData, SiteContext, RuleResult, Issue, PassingCheck } from '../../types.js';

export class YouTubeLinkRule implements PageRule {
  code = 'YOUTUBE_LINK';
  category = 'STRUCTURED_DATA' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    const hasYouTube = page.socialLinks?.youtube || false;

    // Only check homepage
    const url = new URL(page.url);
    const isHomepage = url.pathname === '/' || url.pathname === '';

    if (!isHomepage) {
      return { issues, passingChecks };
    }

    if (hasYouTube) {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'YouTube Channel Linked',
        description: 'Site links to YouTube channel',
        pageUrl: page.url,
        goodPractice: 'Video content on YouTube can improve brand visibility and SEO.',
      });
    }

    return { issues, passingChecks };
  }
}
