/**
 * Check if Twitter Card tags are properly configured
 */

import type { PageRule, PageData, SiteContext, RuleResult, Issue, PassingCheck } from '../../types.js';

export class TwitterCardTagsRule implements PageRule {
  code = 'TWITTER_CARD_TAGS';
  category = 'STRUCTURED_DATA' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    const twitterTags = page.twitterTags;
    
    if (!twitterTags) {
      return { issues, passingChecks };
    }

    const missingTags: string[] = [];
    const presentTags: string[] = [];

    // Check required Twitter Card tags
    if (!twitterTags.card) {
      missingTags.push('twitter:card');
    } else {
      presentTags.push('twitter:card');
    }

    if (!twitterTags.title) {
      missingTags.push('twitter:title');
    } else {
      presentTags.push('twitter:title');
    }

    if (!twitterTags.description) {
      missingTags.push('twitter:description');
    } else {
      presentTags.push('twitter:description');
    }

    if (!twitterTags.image) {
      missingTags.push('twitter:image');
    } else {
      presentTags.push('twitter:image');
    }

    // Optional but recommended
    if (twitterTags.site) {
      presentTags.push('twitter:site');
    }

    // If any required tags are missing, create an issue
    if (missingTags.length > 0) {
      issues.push({
        category: this.category,
        type: this.code,
        severity: missingTags.length >= 2 ? 'HIGH' : 'MEDIUM',
        title: 'Missing Twitter Card Tags',
        description: `This page is missing ${missingTags.length} essential Twitter Card tag${missingTags.length > 1 ? 's' : ''}: ${missingTags.join(', ')}. Add twitter:card, twitter:title, twitter:description, and twitter:image to control how your content appears when shared on Twitter/X.`,
        impactScore: missingTags.length >= 2 ? 15 : 10,
        pageUrl: page.url,
      });
    }

    // If all required tags are present, add a passing check
    if (missingTags.length === 0 && presentTags.length >= 4) {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'Twitter Card Tags Present',
        description: `All essential Twitter Card tags are configured (${presentTags.join(', ')})`,
        pageUrl: page.url,
        goodPractice:
          'Twitter Card tags ensure your content displays beautifully when shared on Twitter/X with rich previews including images and descriptions.',
      });
    }

    return { issues, passingChecks };
  }
}
