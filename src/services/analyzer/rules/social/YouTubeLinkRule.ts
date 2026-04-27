import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class YouTubeLinkRule implements PageRule {
  code = 'YOUTUBE_LINK';
  category = 'STRUCTURED_DATA' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'YOUTUBE_LINK',
    name: 'YouTube Channel',
    maxScore: 0,
    priority: 3,
    section: 'social',
    informational: true,
    what: 'Checks whether your website links to a YouTube channel, indicating a video content presence.',
    why: 'YouTube is the second-largest search engine. A YouTube channel linked from your site signals content investment, can drive referral traffic, and help your brand appear in both web and video search results.',
    how: 'Add a YouTube link in your website\'s header, footer, or social media section. Create a YouTube channel for your business if you haven\'t already and link it prominently.',
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
        shortAnswer: 'YouTube link check applies to homepage only.',
        answer: 'YouTube link is evaluated on the homepage only.',
        recommendation: null,
        pageUrl: page.url,
      };
      return { check: stub, issues: [], passingChecks: [] };
    }

    const hasYouTube = page.socialLinks?.youtube ?? false;

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed: null,
      score: 0,
      shortAnswer: hasYouTube ? 'YouTube channel is linked.' : 'No YouTube channel link found.',
      answer: hasYouTube
        ? 'Site links to a YouTube channel, supporting video content presence and brand discoverability.'
        : 'No YouTube channel link detected on the homepage.',
      recommendation: null,
      data: { hasYouTube },
      pageUrl: page.url,
    };

    const passingChecks = hasYouTube ? [{
      category: this.category,
      code: this.code,
      title: 'YouTube Channel Linked',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'Video content on YouTube can improve brand visibility and SEO through video search results.',
    }] : [];

    return { check, issues: [], passingChecks };
  }
}
