/**
 * Check if SSL certificate is valid (basic check via HTTPS)
 */

import type { PageRule, PageData, SiteContext, RuleResult } from '../../types.js';

export class SSLEnabledRule implements PageRule {
  code = 'SSL_ENABLED';
  category = 'TECHNICAL' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues = [];
    const passingChecks = [];

    // If we successfully crawled the page with HTTPS and got a 200, SSL is valid
    const url = new URL(page.url);
    const isHttps = url.protocol === 'https:';
    const isSuccessful = page.statusCode >= 200 && page.statusCode < 300;

    if (isHttps && isSuccessful) {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'Valid SSL Certificate',
        description: 'Page has a valid SSL certificate',
        pageUrl: page.url,
        goodPractice: 'Valid SSL certificates ensure encrypted connections and build user trust.',
      });
    } else if (isHttps && !isSuccessful) {
      issues.push({
        category: this.category,
        type: 'SSL_ERROR',
        title: 'SSL Certificate Issue',
        description: `Page returned status ${page.statusCode}, which may indicate SSL certificate problems.`,
        severity: 'HIGH' as const,
        impactScore: 25,
        pageUrl: page.url,
      });
    }

    return { issues, passingChecks };
  }
}
