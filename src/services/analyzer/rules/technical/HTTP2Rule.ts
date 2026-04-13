/**
 * Check if server is using HTTP/2
 */

import type { PageRule, PageData, SiteContext, RuleResult, Issue, PassingCheck } from '../../types.js';

export class HTTP2Rule implements PageRule {
  code = 'HTTP2_ENABLED';
  category = 'TECHNICAL' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    const isHTTP2 = page.isHTTP2;
    
    if (isHTTP2 === undefined) {
      return { issues, passingChecks };
    }

    // Only check homepage (HTTP/2 is server-level)
    const url = new URL(page.url);
    const isHomepage = url.pathname === '/' || url.pathname === '';

    if (!isHomepage) {
      return { issues, passingChecks };
    }

    if (!isHTTP2) {
      issues.push({
        category: this.category,
        type: this.code,
        severity: 'MEDIUM',
        title: 'HTTP/2 Not Enabled',
        description: 'The server is using HTTP/1.1 instead of the faster HTTP/2 protocol. Upgrade to HTTP/2 for faster page loads through multiplexing and header compression.',
        impactScore: 12,
        pageUrl: page.url,
      });
    } else {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'HTTP/2 Enabled',
        description: 'Server is using HTTP/2 protocol',
        pageUrl: page.url,
        goodPractice:
          'HTTP/2 provides multiplexing (parallel requests), header compression, and server push, significantly improving page load performance.',
      });
    }

    return { issues, passingChecks };
  }
}
