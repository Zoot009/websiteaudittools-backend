/**
 * Check if pages are served over HTTPS
 */

import type { PageRule, PageData, SiteContext, RuleResult } from '../../types.js';

export class HTTPSCheckRule implements PageRule {
  code = 'HTTPS_CHECK';
  category = 'TECHNICAL' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues = [];
    const passingChecks = [];

    const url = new URL(page.url);

    if (url.protocol !== 'https:') {
      issues.push({
        category: this.category,
        type: this.code,
        title: 'Page Not Served Over HTTPS',
        description: `Page "${page.url}" is served over HTTP instead of HTTPS. HTTPS is a ranking factor and provides security for users.`,
        severity: 'HIGH' as const,
        impactScore: 30,
        pageUrl: page.url,
      });
    } else {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'HTTPS Enabled',
        description: 'Page is served securely over HTTPS',
        pageUrl: page.url,
        goodPractice:
          'HTTPS encrypts data between users and your site, improving security and search rankings.',
      });
    }

    return { issues, passingChecks };
  }
}
