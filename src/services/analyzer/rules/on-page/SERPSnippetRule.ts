/**
 * Generate SERP snippet preview (this is informational, not a check)
 */

import type { PageRule, PageData, SiteContext, RuleResult } from '../../types.js';

export class SERPSnippetRule implements PageRule {
  code = 'SERP_SNIPPET';
  category = 'ON_PAGE' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues = [];
    const passingChecks = [];

    // This rule generates a preview, not issues
    // Only flag if both title and description are missing
    if ((!page.title || page.title.trim().length === 0) && 
        (!page.description || page.description.trim().length === 0)) {
      issues.push({
        category: this.category,
        type: this.code,
        title: 'Poor SERP Snippet',
        description: `Page "${page.url}" is missing both title and description. Search result snippet will be auto-generated and may not be compelling.`,
        severity: 'HIGH' as const,
        impactScore: 25,
        pageUrl: page.url,
      });
    } else {
      // Generate preview for informational purposes
      const title = page.title || 'Untitled Page';
      const description = page.description || 'No description available';
      
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'SERP Snippet Available',
        description: `Preview: ${title.substring(0, 60)}${title.length > 60 ? '...' : ''} | ${description.substring(0, 160)}${description.length > 160 ? '...' : ''}`,
        pageUrl: page.url,
        goodPractice: 'Well-crafted titles and descriptions create compelling search result snippets that improve CTR.',
      });
    }

    return { issues, passingChecks };
  }
}
