/**
 * Check for exposed email addresses (privacy/spam concern)
 */

import type { PageRule, PageData, SiteContext, RuleResult } from '../../types.js';

export class EmailPrivacyRule implements PageRule {
  code = 'EMAIL_PRIVACY';
  category = 'SECURITY' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues = [];
    const passingChecks = [];

    const exposedEmails = page.exposedEmails || [];

    if (exposedEmails.length > 0) {
      issues.push({
        category: this.category,
        type: this.code,
        title: 'Exposed Email Addresses',
        description: `Page contains ${exposedEmails.length} plain-text email address(es): ${exposedEmails.join(', ')}. Use contact forms or obfuscation to prevent spam.`,
        severity: 'LOW' as const,
        impactScore: 5,
        pageUrl: page.url,
      });
    } else {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'No Exposed Emails',
        description: 'Page does not expose email addresses in plain text',
        pageUrl: page.url,
        goodPractice:
          'Protecting email addresses from crawlers reduces spam and improves privacy.',
      });
    }

    return { issues, passingChecks };
  }
}
