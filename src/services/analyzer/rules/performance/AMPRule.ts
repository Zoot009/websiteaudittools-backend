/**
 * Check if Google AMP (Accelerated Mobile Pages) is implemented
 * AMP can improve mobile performance and visibility in Google search features
 */

import type { PageRule, PageData, SiteContext, RuleResult, Issue, PassingCheck } from '../../types.js';

export class AMPRule implements PageRule {
  code = 'AMP';
  category = 'PERFORMANCE' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    // Check if AMP data is available
    if (page.isAMP === undefined || page.isAMP === null) {
      // No AMP data available (skip check)
      return { issues, passingChecks };
    }

    if (page.isAMP) {
      // AMP is implemented
      passingChecks.push({
        category: 'PERFORMANCE',
        code: 'amp_implemented',
        title: 'Google AMP Implemented',
        description: 'Page is using Google AMP (Accelerated Mobile Pages), which can improve mobile load times and visibility in Google search features like Top Stories carousel.',
        pageUrl: page.url,
        goodPractice: 'AMP pages load nearly instantly on mobile devices and can appear in special Google search features',
      });
    } else {
      // AMP not implemented - this is informational, not necessarily a problem
      // Only flag as issue for news/blog sites where AMP provides significant benefits
      if (this.isNewsOrBlogSite(page, context)) {
        issues.push({
          type: 'amp_not_implemented',
          category: 'PERFORMANCE',
          title: 'Consider Implementing Google AMP',
          description: 'This appears to be a news or blog site. Implementing Google AMP can significantly improve mobile performance and increase visibility in Google\'s Top Stories carousel and other mobile search features. AMP pages typically load in under 1 second on mobile devices.',
          severity: 'LOW',
          impactScore: 40,
          pageUrl: page.url,
        });
      }
    }

    return { issues, passingChecks };
  }

  /**
   * Heuristic to detect if site is news/blog oriented
   */
  private isNewsOrBlogSite(page: PageData, context: SiteContext): boolean {
    const url = page.url.toLowerCase();
    const title = (page.title || '').toLowerCase();
    const html = page.html.toLowerCase();

    // Check URL patterns
    const newsUrlPatterns = [
      '/blog/',
      '/news/',
      '/article/',
      '/post/',
      '/story/',
      '202', // Years in URL (common in blog posts)
    ];
    
    if (newsUrlPatterns.some(pattern => url.includes(pattern))) {
      return true;
    }

    // Check for blog/news indicators in title or content
    const blogIndicators = [
      'blog',
      'news',
      'article',
      'story',
      'post',
      'writer',
      'author:',
      'published:',
      'posted on',
    ];

    if (blogIndicators.some(indicator => title.includes(indicator) || html.includes(indicator))) {
      return true;
    }

    // Check for article schema markup
    if (html.includes('"@type":"article"') || html.includes('"@type":"newsarticle"')) {
      return true;
    }

    return false;
  }
}
