import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class YouTubeActivityRule implements PageRule {
  code = 'YOUTUBE_ACTIVITY';
  category = 'STRUCTURED_DATA' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'YOUTUBE_ACTIVITY',
    name: 'YouTube Activity',
    maxScore: 0,
    priority: 3,
    section: 'social',
    informational: true,
    what: 'YouTube activity checks whether your linked YouTube channel shows recent content activity, which supports content marketing and brand visibility.',
    why: 'An active YouTube channel with regular uploads improves brand visibility, drives traffic to your website through video descriptions, and can appear in Google search results alongside your website.',
    how: 'Upload videos regularly (at least monthly), use keyword-rich titles and descriptions, add video transcripts, create video sitemaps, and embed relevant videos on your website pages.',
    time: 'Ongoing',
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
        shortAnswer: 'YouTube activity check applies to homepage only.',
        answer: 'YouTube activity is evaluated on the homepage only.',
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
        ? 'YouTube channel link detected. Full activity metrics (upload frequency, engagement) require YouTube Data API integration.'
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
      goodPractice: 'An active YouTube channel with regular video uploads improves brand visibility and can drive traffic from video search results.',
    }] : [];

    return { check, issues: [], passingChecks };
  }
}
