import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class InstagramLinkRule implements PageRule {
  code = 'INSTAGRAM_LINK';
  category = 'STRUCTURED_DATA' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'INSTAGRAM_LINK',
    name: 'Instagram Profile',
    maxScore: 0,
    priority: 3,
    section: 'social',
    informational: true,
    what: 'Checks whether your website links to an Instagram profile, indicating a visual social media presence.',
    why: 'Instagram is particularly valuable for visual brands, e-commerce, and consumer products. Linking to your Instagram helps users discover your visual content and builds social proof.',
    how: 'Add an Instagram link in your website\'s header, footer, or social media section. Use the Instagram icon for easy recognition.',
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
        shortAnswer: 'Instagram link check applies to homepage only.',
        answer: 'Instagram link is evaluated on the homepage only.',
        recommendation: null,
        pageUrl: page.url,
      };
      return { check: stub, issues: [], passingChecks: [] };
    }

    const hasInstagram = page.socialLinks?.instagram ?? false;

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed: null,
      score: 0,
      shortAnswer: hasInstagram ? 'Instagram profile is linked.' : 'No Instagram link found.',
      answer: hasInstagram
        ? 'Site links to an Instagram profile, supporting visual brand presence and social media engagement.'
        : 'No Instagram link detected on the homepage.',
      recommendation: null,
      data: { hasInstagram },
      pageUrl: page.url,
    };

    const passingChecks = hasInstagram ? [{
      category: this.category,
      code: this.code,
      title: 'Instagram Linked',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'Instagram presence is valuable for visual brands and customer engagement.',
    }] : [];

    return { check, issues: [], passingChecks };
  }
}
