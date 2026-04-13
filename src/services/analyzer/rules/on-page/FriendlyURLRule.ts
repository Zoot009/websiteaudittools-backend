/**
 * Check if URLs are friendly and readable
 */

import type { PageRule, PageData, SiteContext, RuleResult } from '../../types.js';

export class FriendlyURLRule implements PageRule {
  code = 'FRIENDLY_URL';
  category = 'ON_PAGE' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues = [];
    const passingChecks = [];

    try {
      const url = new URL(page.url);
      const path = url.pathname;

      // Check for unfriendly URL patterns
      const problems: string[] = [];

      // Too long
      if (path.length > 100) {
        problems.push(`URL path is ${path.length} characters (recommended: <100)`);
      }

      // Contains query parameters with IDs
      if (url.search && /[?&](id|p|page|product)=\d+/.test(url.search)) {
        problems.push('Contains numeric IDs in query params');
      }

      // Contains special characters that aren't hyphens
      if (/[_+%&=]/.test(path)) {
        problems.push('Contains special characters (use hyphens instead)');
      }

      // All uppercase or mixed case badly
      if (path !== path.toLowerCase() && !/^\/[A-Z]/.test(path)) {
        problems.push('Contains uppercase characters (use lowercase)');
      }

      // Contains multiple consecutive hyphens
      if (/--+/.test(path)) {
        problems.push('Contains multiple consecutive hyphens');
      }

      if (problems.length > 0) {
        issues.push({
          category: this.category,
          type: this.code,
          title: 'URL Not Optimized',
          description: `URL has readability issues: ${problems.join('; ')}. Use short, lowercase, hyphen-separated URLs with keywords.`,
          severity: 'LOW' as const,
          impactScore: 5,
          pageUrl: page.url,
        });
      } else {
        passingChecks.push({
          category: this.category,
          code: this.code,
          title: 'URL is Friendly',
          description: 'URL is readable and well-formatted',
          pageUrl: page.url,
          goodPractice:
            'Clean, descriptive URLs are easier for users to remember and may provide SEO benefits.',
        });
      }
    } catch (error) {
      // Invalid URL, skip check
    }

    return { issues, passingChecks };
  }
}
