import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class TwitterCardTagsRule implements PageRule {
  code = 'TWITTER_CARD_TAGS';
  category = 'STRUCTURED_DATA' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'TWITTER_CARD_TAGS',
    name: 'Twitter Card Tags',
    maxScore: 2,
    priority: 3,
    section: 'social',
    informational: false,
    what: 'Twitter Card meta tags control how your content appears when shared on Twitter/X, enabling rich previews with images, titles, and descriptions.',
    why: 'Without Twitter Card tags, shared links appear as plain text URLs. With them, links display as rich cards with images and descriptions, significantly improving click-through rates and engagement.',
    how: 'Add twitter:card, twitter:title, twitter:description, and twitter:image to your page\'s <head>. Use twitter:card="summary_large_image" for the best visual impact. Twitter falls back to OG tags if Twitter-specific tags are absent.',
    time: '30 minutes',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    const twitterTags = page.twitterTags;

    if (!twitterTags) {
      const stub: SEOAuditCheck = {
        ...this.checkDefinition,
        maxScore: 0,
        informational: true,
        category: this.category,
        passed: null,
        score: 0,
        shortAnswer: 'Twitter Card tag data not available.',
        answer: 'Twitter Card tags could not be detected for this page.',
        recommendation: null,
        pageUrl: page.url,
      };
      return { check: stub, issues: [], passingChecks: [] };
    }

    const missingTags: string[] = [];
    const presentTags: string[] = [];

    if (!twitterTags.card) missingTags.push('twitter:card'); else presentTags.push('twitter:card');
    if (!twitterTags.title) missingTags.push('twitter:title'); else presentTags.push('twitter:title');
    if (!twitterTags.description) missingTags.push('twitter:description'); else presentTags.push('twitter:description');
    if (!twitterTags.image) missingTags.push('twitter:image'); else presentTags.push('twitter:image');
    if (twitterTags.site) presentTags.push('twitter:site');

    const passed = missingTags.length === 0;
    const score = passed
      ? this.checkDefinition.maxScore
      : missingTags.length <= 2
        ? 1
        : 0;

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score,
      shortAnswer: passed
        ? `Twitter Card tags fully configured (${presentTags.length} tags).`
        : `Missing ${missingTags.length} Twitter Card tag(s): ${missingTags.join(', ')}.`,
      answer: passed
        ? `All essential Twitter Card tags are configured (${presentTags.join(', ')}), enabling rich link previews on Twitter/X.`
        : `Page is missing ${missingTags.length} Twitter Card tag(s): ${missingTags.join(', ')}. Shared links will display as plain text without rich previews.`,
      recommendation: passed ? null : `Add the missing Twitter Card tags: ${missingTags.join(', ')}. Use twitter:card="summary_large_image" for the best visual impact.`,
      data: { missingTags, presentTags, twitterTags },
      pageUrl: page.url,
    };

    const issues = !passed ? [{
      category: this.category,
      type: this.code,
      title: 'Missing Twitter Card Tags',
      description: check.answer,
      severity: (missingTags.length >= 2 ? 'HIGH' : 'MEDIUM') as 'HIGH' | 'MEDIUM',
      impactScore: missingTags.length >= 2 ? 15 : 10,
      pageUrl: page.url,
    }] : [];

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: 'Twitter Card Tags Present',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'Twitter Card tags ensure your content displays beautifully when shared on Twitter/X with rich previews including images and descriptions.',
    }] : [];

    return { check, issues, passingChecks };
  }
}
