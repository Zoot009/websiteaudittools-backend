import type { SiteRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class MissingRobotsRule implements SiteRule {
  code = 'ROBOTS_TXT';
  category = 'TECHNICAL' as const;
  level = 'site' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'ROBOTS_TXT',
    name: 'Robots.txt',
    maxScore: 3,
    priority: 2,
    section: 'seo',
    informational: false,
    what: 'Robots.txt is a text file placed at your site\'s root that tells search engine crawlers which pages they should and shouldn\'t access.',
    why: 'A properly configured robots.txt helps search engines crawl your site efficiently, prevents crawling of duplicate or low-value pages, and helps with crawl budget optimization for larger sites.',
    how: 'Create a robots.txt file in your site\'s root directory. Start by allowing all: "User-agent: * / Allow: /". Add Disallow directives for admin areas, then include your sitemap URL: "Sitemap: https://yourdomain.com/sitemap.xml".',
    time: '30 minutes',
  };

  execute(pages: PageData[], context: SiteContext): RuleResult {
    const passed = context.hasRobotsTxt;

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score: passed ? this.checkDefinition.maxScore : 0,
      shortAnswer: passed ? 'Robots.txt file found.' : 'No robots.txt file found.',
      answer: passed
        ? 'A robots.txt file was found. Search engines can use it to understand crawling permissions for your site.'
        : `No robots.txt file found at "${context.baseUrl}/robots.txt". While not required, robots.txt helps control search engine crawling behavior.`,
      recommendation: passed ? null : 'Create a robots.txt file at your domain root. At minimum, include "User-agent: *", "Allow: /", and a Sitemap: reference.',
      data: { hasRobotsTxt: passed },
      pageUrl: context.baseUrl,
    };

    const issues = !passed ? [{
      category: this.category,
      type: this.code,
      title: 'Robots.txt Not Found',
      description: check.answer,
      severity: 'LOW' as const,
      impactScore: 10,
      pageUrl: context.baseUrl,
    }] : [];

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: 'Robots.txt Present',
      description: check.shortAnswer,
      pageUrl: context.baseUrl,
      goodPractice: 'Robots.txt helps manage search engine crawling and prevents indexing of sensitive areas.',
    }] : [];

    return { check, issues, passingChecks };
  }
}
