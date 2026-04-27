import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class LinkedInLinkRule implements PageRule {
  code = 'LINKEDIN_LINK';
  category = 'STRUCTURED_DATA' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'LINKEDIN_LINK',
    name: 'LinkedIn Profile',
    maxScore: 0,
    priority: 3,
    section: 'social',
    informational: true,
    what: 'Checks whether your website links to a LinkedIn company page or profile.',
    why: 'LinkedIn is essential for B2B companies and professional services. A LinkedIn presence builds professional credibility and helps with B2B lead generation and brand awareness.',
    how: 'Add a LinkedIn link in your website\'s header, footer, or about section. Create a LinkedIn Company Page for your business if you haven\'t already.',
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
        shortAnswer: 'LinkedIn link check applies to homepage only.',
        answer: 'LinkedIn link is evaluated on the homepage only.',
        recommendation: null,
        pageUrl: page.url,
      };
      return { check: stub, issues: [], passingChecks: [] };
    }

    const hasLinkedIn = page.socialLinks?.linkedin ?? false;

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed: null,
      score: 0,
      shortAnswer: hasLinkedIn ? 'LinkedIn profile is linked.' : 'No LinkedIn link found.',
      answer: hasLinkedIn
        ? 'Site links to a LinkedIn profile, supporting professional brand visibility and B2B presence.'
        : 'No LinkedIn link detected on the homepage.',
      recommendation: null,
      data: { hasLinkedIn },
      pageUrl: page.url,
    };

    const passingChecks = hasLinkedIn ? [{
      category: this.category,
      code: this.code,
      title: 'LinkedIn Linked',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'LinkedIn presence is valuable for B2B businesses and professional networking.',
    }] : [];

    return { check, issues: [], passingChecks };
  }
}
