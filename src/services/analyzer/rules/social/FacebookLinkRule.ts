import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class FacebookLinkRule implements PageRule {
  code = 'FACEBOOK_LINK';
  category = 'STRUCTURED_DATA' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'FACEBOOK_LINK',
    name: 'Facebook Page',
    maxScore: 0,
    priority: 3,
    section: 'social',
    informational: true,
    what: 'Checks whether your website links to a Facebook business page or profile, helping establish your social media presence.',
    why: 'A Facebook presence supports brand visibility, customer engagement, and can contribute to local SEO signals. Linking to your Facebook page from your website helps users find and follow you.',
    how: 'Add a link to your Facebook page in your website\'s header, footer, or contact section. Use recognizable social media icons for easy discovery.',
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
        shortAnswer: 'Facebook link check applies to homepage only.',
        answer: 'Facebook page link is evaluated on the homepage only.',
        recommendation: null,
        pageUrl: page.url,
      };
      return { check: stub, issues: [], passingChecks: [] };
    }

    const hasFacebook = page.socialLinks?.facebook ?? false;

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed: null,
      score: 0,
      shortAnswer: hasFacebook ? 'Facebook page is linked.' : 'No Facebook page link found.',
      answer: hasFacebook
        ? 'Site links to a Facebook page, supporting social media presence and brand visibility.'
        : 'No Facebook page link detected on the homepage.',
      recommendation: null,
      data: { hasFacebook },
      pageUrl: page.url,
    };

    const passingChecks = hasFacebook ? [{
      category: this.category,
      code: this.code,
      title: 'Facebook Page Linked',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'Social media presence can improve brand visibility and user engagement.',
    }] : [];

    return { check, issues: [], passingChecks };
  }
}
