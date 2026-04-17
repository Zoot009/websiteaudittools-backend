/**
 * Check for Noindex HTTP Header (X-Robots-Tag)
 * CRITICAL: This can block entire site from indexing
 */

import type { PageRule, PageData, SiteContext, RuleResult, Issue, PassingCheck } from '../../types.js';

export class NoindexHeaderRule implements PageRule {
  code = 'NOINDEX_HEADER';
  category = 'TECHNICAL' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    // Check if HTTP headers are available
    if (!page.httpHeaders) {
      return { issues, passingChecks };
    }

    // Check for X-Robots-Tag header
    const xRobotsTag = page.httpHeaders['x-robots-tag'];
    
    if (xRobotsTag) {
      const value = xRobotsTag.toLowerCase();
      
      // Check for noindex directive
      if (value.includes('noindex')) {
        issues.push({
          type: 'noindex_http_header',
          category: 'TECHNICAL',
          title: 'Page Blocked from Indexing via HTTP Header',
          description: `The X-Robots-Tag HTTP header contains "noindex" (value: "${xRobotsTag}"). This prevents search engines from indexing this page. If this is unintentional, remove the X-Robots-Tag header from your server configuration.`,
          severity: 'CRITICAL',
          impactScore: 100,
          pageUrl: page.url,
        });
      }

      // Check for nofollow directive
      if (value.includes('nofollow')) {
        issues.push({
          type: 'nofollow_http_header',
          category: 'TECHNICAL',
          title: 'Links Blocked from Following via HTTP Header',
          description: `The X-Robots-Tag HTTP header contains "nofollow" (value: "${xRobotsTag}"). This prevents search engines from following links on this page, limiting crawl coverage and link equity distribution.`,
          severity: 'HIGH',
          impactScore: 75,
          pageUrl: page.url,
        });
      }

      // Check for none directive (equivalent to noindex, nofollow)
      if (value.includes('none')) {
        issues.push({
          type: 'none_http_header',
          category: 'TECHNICAL',
          title: 'Page Fully Blocked via HTTP Header',
          description: `The X-Robots-Tag HTTP header contains "none" (value: "${xRobotsTag}"), which is equivalent to both noindex and nofollow. This completely blocks search engine indexing and link following for this page.`,
          severity: 'CRITICAL',
          impactScore: 100,
          pageUrl: page.url,
        });
      }

      // If header exists but doesn't contain blocking directives, it's okay
      if (!value.includes('noindex') && !value.includes('nofollow') && !value.includes('none')) {
        passingChecks.push({
          category: 'TECHNICAL',
          code: 'xrobotstag_allows_indexing',
          title: 'X-Robots-Tag Allows Indexing',
          description: `X-Robots-Tag header present but allows indexing (value: "${xRobotsTag}").`,
          pageUrl: page.url,
          goodPractice: 'X-Robots-Tag header exists but does not block indexing',
        });
      }
    } else {
      // No X-Robots-Tag header - this is good (most common case)
      passingChecks.push({
        category: 'TECHNICAL',
        code: 'no_blocking_http_headers',
        title: 'No Blocking HTTP Headers',
        description: 'No X-Robots-Tag header found, allowing normal indexing.',
        pageUrl: page.url,
        goodPractice: 'Pages are not blocked from indexing at the HTTP level',
      });
    }

    return { issues, passingChecks };
  }
}
