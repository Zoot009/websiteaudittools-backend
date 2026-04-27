import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class EmailPrivacyRule implements PageRule {
  code = 'EMAIL_PRIVACY';
  category = 'SECURITY' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'EMAIL_PRIVACY',
    name: 'Email Privacy',
    maxScore: 2,
    priority: 3,
    section: 'seo',
    informational: false,
    what: 'Email privacy checks whether your page exposes email addresses in plain text, which can be harvested by spam bots and lead to unwanted contact.',
    why: 'Plain-text email addresses on web pages are easily harvested by automated spam bots, leading to increased spam, phishing attempts, and potential security risks.',
    how: 'Replace plain-text emails with a contact form, use JavaScript-based obfuscation, encode email addresses as HTML entities, or use CSS techniques to hide them from bots.',
    time: '30 minutes',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    const exposedEmails = page.exposedEmails ?? [];
    const passed = exposedEmails.length === 0;

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score: passed ? this.checkDefinition.maxScore : 0,
      shortAnswer: passed
        ? 'No exposed email addresses found.'
        : `${exposedEmails.length} email address(es) exposed in plain text.`,
      answer: passed
        ? 'Page does not expose email addresses in plain text, protecting against spam harvesting.'
        : `Page contains ${exposedEmails.length} plain-text email address(es) that can be harvested by spam bots: ${exposedEmails.slice(0, 3).join(', ')}${exposedEmails.length > 3 ? '...' : ''}.`,
      recommendation: passed ? null : 'Replace plain-text email addresses with a contact form or use JavaScript/CSS obfuscation to prevent spam harvesting.',
      value: exposedEmails.length,
      data: { exposedCount: exposedEmails.length, emails: exposedEmails.slice(0, 5) },
      pageUrl: page.url,
    };

    const issues = !passed ? [{
      category: this.category,
      type: this.code,
      title: 'Exposed Email Addresses',
      description: check.answer,
      severity: 'LOW' as const,
      impactScore: 5,
      pageUrl: page.url,
    }] : [];

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: 'No Exposed Email Addresses',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'Protecting email addresses from crawlers reduces spam and improves privacy.',
    }] : [];

    return { check, issues, passingChecks };
  }
}
