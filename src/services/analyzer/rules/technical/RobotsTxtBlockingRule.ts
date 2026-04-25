import type { SiteRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';
import { RobotsTxtParser } from '../../../crawler/robotsTxtParser.js';

export class RobotsTxtBlockingRule implements SiteRule {
  code = 'ROBOTS_TXT_BLOCKING';
  category = 'TECHNICAL' as const;
  level = 'site' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'ROBOTS_TXT_BLOCKING',
    name: 'Robots.txt Blocking',
    maxScore: 4,
    priority: 1,
    section: 'seo',
    informational: false,
    what: 'Checks whether your robots.txt file is accidentally blocking important pages or your entire site from search engine crawling.',
    why: 'A misconfigured robots.txt with "Disallow: /" blocks search engines from crawling your entire site, making it impossible to rank. Even partial blocks on important content can severely damage SEO.',
    how: 'Review your robots.txt file at yourdomain.com/robots.txt. Remove any unintentional "Disallow: /" or directives blocking important pages. Use Google Search Console\'s robots.txt Tester to validate your configuration.',
    time: '15 minutes',
  };

  execute(pages: PageData[], context: SiteContext): RuleResult {
    if (!context.robotsTxt) {
      const check: SEOAuditCheck = {
        ...this.checkDefinition,
        category: this.category,
        passed: true,
        score: this.checkDefinition.maxScore,
        shortAnswer: 'No robots.txt blocking rules found.',
        answer: 'No robots.txt file means no crawl blocks — all pages are accessible to search engines by default.',
        recommendation: null,
        data: { blockedPages: 0, totalPages: pages.length },
        pageUrl: context.baseUrl,
      };
      return {
        check,
        issues: [],
        passingChecks: [{
          category: this.category,
          code: this.code,
          title: 'No Robots.txt Blocking',
          description: check.shortAnswer,
          pageUrl: context.baseUrl,
          goodPractice: 'All pages are accessible to search engine crawlers.',
        }],
      };
    }

    const parser = new RobotsTxtParser();
    parser.parse(context.robotsTxt);

    if (parser.blocksEntireSite()) {
      const check: SEOAuditCheck = {
        ...this.checkDefinition,
        category: this.category,
        passed: false,
        score: 0,
        shortAnswer: 'Robots.txt is blocking the entire site!',
        answer: 'Your robots.txt file contains "Disallow: /" which blocks search engines from crawling your entire website. This prevents all content from being indexed.',
        recommendation: 'Remove "Disallow: /" from your robots.txt immediately to restore search engine access.',
        data: { blocksEntireSite: true, blockedPages: pages.length, totalPages: pages.length },
        pageUrl: context.baseUrl,
      };
      return {
        check,
        issues: [{
          category: this.category,
          type: this.code,
          title: 'Robots.txt Blocks Entire Site',
          description: check.answer,
          severity: 'CRITICAL' as const,
          impactScore: 100,
          pageUrl: context.baseUrl,
        }],
        passingChecks: [],
      };
    }

    const blockedPages = pages.filter(p => !parser.isAllowed(p.url, 'Googlebot'));
    const passed = blockedPages.length === 0;
    const blockedRatio = blockedPages.length / Math.max(pages.length, 1);
    const score = passed
      ? this.checkDefinition.maxScore
      : Math.max(0, Math.round(this.checkDefinition.maxScore * (1 - blockedRatio)));

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score,
      shortAnswer: passed
        ? `Robots.txt allows crawling of all ${pages.length} pages.`
        : `Robots.txt is blocking ${blockedPages.length} of ${pages.length} pages.`,
      answer: passed
        ? `Your robots.txt file allows search engines to crawl all ${pages.length} discovered pages.`
        : `Your robots.txt is blocking ${blockedPages.length} of ${pages.length} pages from being indexed: ${blockedPages.slice(0, 3).map(p => p.url).join(', ')}${blockedPages.length > 3 ? '...' : ''}`,
      recommendation: passed ? null : 'Review your robots.txt file and remove Disallow directives for pages you want indexed.',
      data: {
        blockedPages: blockedPages.length,
        totalPages: pages.length,
        blockedUrls: blockedPages.slice(0, 10).map(p => p.url),
      },
      pageUrl: context.baseUrl,
    };

    const issues = !passed ? [{
      category: this.category,
      type: this.code,
      title: `${blockedPages.length} Page${blockedPages.length === 1 ? '' : 's'} Blocked by Robots.txt`,
      description: check.answer,
      severity: (blockedPages.length === pages.length ? 'CRITICAL' : 'HIGH') as const,
      impactScore: blockedPages.length === pages.length ? 100 : 85,
      pageUrl: context.baseUrl,
    }] : [];

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: 'Robots.txt Allows Crawling',
      description: check.shortAnswer,
      pageUrl: context.baseUrl,
      goodPractice: 'Robots.txt is properly configured to allow important pages to be crawled.',
    }] : [];

    return { check, issues, passingChecks };
  }
}
