import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class FriendlyURLRule implements PageRule {
  code = 'FRIENDLY_URL';
  category = 'ON_PAGE' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'FRIENDLY_URL',
    name: 'Friendly URL',
    maxScore: 2,
    priority: 3,
    section: 'seo',
    informational: false,
    what: 'Friendly URLs (clean URLs) are human-readable web addresses that clearly describe the page content. They avoid complex parameters, IDs, and special characters.',
    why: 'Friendly URLs improve user experience, are easier to remember and share, and help search engines understand page content. They\'re more likely to be clicked and earn better engagement.',
    how: 'Use descriptive words separated by hyphens, keep URLs short, include target keywords naturally, use lowercase letters, and avoid special characters. Most CMS platforms have permalink settings to create friendly URLs automatically.',
    time: '30 minutes',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    let problems: string[] = [];

    try {
      const url = new URL(page.url);
      const path = url.pathname;

      if (path.length > 100) {
        problems.push(`URL path is ${path.length} characters (recommended: <100)`);
      }
      if (url.search && /[?&](id|p|page|product)=\d+/.test(url.search)) {
        problems.push('Contains numeric IDs in query parameters');
      }
      if (/[_+%&=]/.test(path)) {
        problems.push('Contains special characters (use hyphens instead)');
      }
      if (path !== path.toLowerCase() && !/^\/[A-Z]/.test(path)) {
        problems.push('Contains uppercase characters (use lowercase)');
      }
      if (/--+/.test(path)) {
        problems.push('Contains consecutive hyphens');
      }
    } catch {
      // Invalid URL — skip check
    }

    const passed = problems.length === 0;

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score: passed ? this.checkDefinition.maxScore : 0,
      shortAnswer: passed
        ? 'URL is clean and friendly.'
        : `URL has ${problems.length} readability issue(s).`,
      answer: passed
        ? 'URL is readable, lowercase, and well-formatted for both users and search engines.'
        : `URL has readability issues: ${problems.join('; ')}. Use short, lowercase, hyphen-separated URLs with keywords.`,
      recommendation: passed ? null : 'Update the URL to use lowercase words separated by hyphens, without special characters or numeric IDs.',
      data: { problems },
      pageUrl: page.url,
    };

    const issues = !passed ? [{
      category: this.category,
      type: this.code,
      title: 'URL Not Optimized',
      description: check.answer,
      severity: 'LOW' as const,
      impactScore: 5,
      pageUrl: page.url,
    }] : [];

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: 'URL is Friendly',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'Clean, descriptive URLs are easier for users to remember and may provide SEO benefits.',
    }] : [];

    return { check, issues, passingChecks };
  }
}
