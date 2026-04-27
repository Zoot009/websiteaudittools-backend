import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class TwitterLinkRule implements PageRule {
  code = 'TWITTER_LINK';
  category = 'STRUCTURED_DATA' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'TWITTER_LINK',
    name: 'Twitter/X Account',
    maxScore: 0,
    priority: 3,
    section: 'social',
    informational: true,
    what: 'Checks whether your website links to a Twitter/X account, indicating a social media presence on the platform.',
    why: 'Twitter/X links help users discover your social presence and connect with your brand. A verified Twitter presence can also contribute to E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) signals.',
    how: 'Add a Twitter/X link in your website\'s header, footer, or social media section. Use the Twitter/X bird icon for easy recognition.',
    time: '15 minutes',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    const url = new URL(page.url);
    const isHomepage = url.pathname === '/' || url.pathname === '';

    if (!isHomepage) {
      const stub: SEOAuditCheck = {
        ...this.checkDefinition,
        category: this.category,
        passed: null,
        score: 0,
        shortAnswer: 'Twitter/X link check applies to homepage only.',
        answer: 'Twitter/X link is evaluated on the homepage only.',
        recommendation: null,
        pageUrl: page.url,
      };
      return { check: stub, issues: [], passingChecks: [] };
    }

    const hasTwitter = page.socialLinks?.twitter ?? false;

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed: null,
      score: 0,
      shortAnswer: hasTwitter ? 'Twitter/X account is linked.' : 'No Twitter/X link found.',
      answer: hasTwitter
        ? 'Site links to a Twitter/X account, supporting social media presence and brand awareness.'
        : 'No Twitter/X link detected on the homepage.',
      recommendation: null,
      data: { hasTwitter },
      pageUrl: page.url,
    };

    const passingChecks = hasTwitter ? [{
      category: this.category,
      code: this.code,
      title: 'Twitter/X Account Linked',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'Social media presence helps with brand awareness and customer engagement.',
    }] : [];

    return { check, issues: [], passingChecks };
  }
}
