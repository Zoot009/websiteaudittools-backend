/**
 * Check if favicon is present
 */

import type { PageRule, PageData, SiteContext, RuleResult, Issue, PassingCheck } from '../../types.js';

export class FaviconRule implements PageRule {
  code = 'FAVICON_PRESENT';
  category = 'ON_PAGE' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    const favicon = page.favicon;
    
    if (!favicon) {
      return { issues, passingChecks };
    }

    // Only check homepage
    const url = new URL(page.url);
    const isHomepage = url.pathname === '/' || url.pathname === '';

    if (!isHomepage) {
      return { issues, passingChecks };
    }

    if (!favicon.hasFavicon) {
      issues.push({
        category: this.category,
        type: this.code,
        severity: 'LOW',
        title: 'Missing Favicon',
        description: 'No favicon detected on this page. Add a favicon to improve brand recognition and help users identify your site in browser tabs and bookmarks.',
        impactScore: 5,
        pageUrl: page.url,
      });
    } else {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'Favicon Present',
        description: `Favicon is configured${favicon.url ? `: ${favicon.url}` : ''}`,
        pageUrl: page.url,
        goodPractice:
          'Favicons help users identify your site in browser tabs, bookmarks, and mobile home screens, improving brand recognition.',
      });
    }

    return { issues, passingChecks };
  }
}
