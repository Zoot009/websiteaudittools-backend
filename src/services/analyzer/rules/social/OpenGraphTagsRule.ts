/**
 * Check if Open Graph tags are properly configured
 */

import type { PageRule, PageData, SiteContext, RuleResult, Issue, PassingCheck } from '../../types.js';

export class OpenGraphTagsRule implements PageRule {
  code = 'OPEN_GRAPH_TAGS';
  category = 'STRUCTURED_DATA' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    const ogTags = page.ogTags;
    
    if (!ogTags) {
      return { issues, passingChecks };
    }

    const missingTags: string[] = [];
    const presentTags: string[] = [];

    // Check required Open Graph tags
    if (!ogTags.title) {
      missingTags.push('og:title');
    } else {
      presentTags.push('og:title');
    }

    if (!ogTags.description) {
      missingTags.push('og:description');
    } else {
      presentTags.push('og:description');
    }

    if (!ogTags.image) {
      missingTags.push('og:image');
    } else {
      presentTags.push('og:image');
    }

    // Optional but recommended tags
    if (ogTags.type) {
      presentTags.push('og:type');
    }
    if (ogTags.url) {
      presentTags.push('og:url');
    }
    if (ogTags.siteName) {
      presentTags.push('og:site_name');
    }

    // If any required tags are missing, create an issue
    if (missingTags.length > 0) {
      issues.push({
        category: this.category,
        type: this.code,
        severity: missingTags.length >= 2 ? 'HIGH' : 'MEDIUM',
        title: 'Missing Open Graph Tags',
        description: `This page is missing ${missingTags.length} essential Open Graph tag${missingTags.length > 1 ? 's' : ''}: ${missingTags.join(', ')}. Add og:title, og:description, and og:image to improve how your content appears when shared on Facebook, LinkedIn, and other social platforms.`,
        impactScore: missingTags.length >= 2 ? 15 : 10,
        pageUrl: page.url,
      });
    }

    // If all required tags are present, add a passing check
    if (missingTags.length === 0 && presentTags.length >= 3) {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'Open Graph Tags Present',
        description: `All essential Open Graph tags are configured (${presentTags.join(', ')})`,
        pageUrl: page.url,
        goodPractice:
          'Open Graph tags ensure your content looks great when shared on social media platforms like Facebook, LinkedIn, and other social networks.',
      });
    }

    return { issues, passingChecks };
  }
}
