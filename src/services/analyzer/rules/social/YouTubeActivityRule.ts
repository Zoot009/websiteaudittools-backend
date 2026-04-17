/**
 * Check if YouTube channel has recent activity
 * Active YouTube presence supports content marketing and brand visibility
 * 
 * Note: This is a simplified check. Full implementation would require YouTube Data API
 * to verify actual upload frequency and engagement metrics.
 */

import type { PageRule, PageData, SiteContext, RuleResult, Issue, PassingCheck } from '../../types.js';

export class YouTubeActivityRule implements PageRule {
  code = 'YOUTUBE_ACTIVITY';
  category = 'STRUCTURED_DATA' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    const hasYouTube = page.socialLinks?.youtube || false;

    // Only check homepage
    const url = new URL(page.url);
    const isHomepage = url.pathname === '/' || url.pathname === '';

    if (!isHomepage) {
      return { issues, passingChecks };
    }

    if (!hasYouTube) {
      // No YouTube link - not an error, just skip this check
      return { issues, passingChecks };
    }

    // YouTube link exists - provide informational guidance
    // Note: Without YouTube API integration, we can't verify actual activity
    // This is a placeholder that encourages best practices

    issues.push({
      type: 'youtube_activity_unknown',
      category: 'STRUCTURED_DATA',
      title: 'YouTube Channel Activity Check',
      description: 'YouTube channel link detected. To maximize SEO benefits from your YouTube presence:\n\n• Upload videos regularly (at least monthly)\n• Use keyword-rich titles and descriptions\n• Add video transcripts for accessibility\n• Create video sitemaps linking to your website\n• Embed relevant videos on your website pages\n\nNote: Full activity verification requires YouTube Data API integration. Consider implementing this for detailed channel metrics (subscriber count, upload frequency, engagement rates).',
      severity: 'LOW',
      impactScore: 30,
      pageUrl: page.url,
    });

    return { issues, passingChecks };
  }
}
