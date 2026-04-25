import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class HTTPSCheckRule implements PageRule {
  code = 'HTTPS_CHECK';
  category = 'TECHNICAL' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'HTTPS_CHECK',
    name: 'HTTPS Redirect',
    maxScore: 4,
    priority: 2,
    section: 'seo',
    informational: false,
    what: 'HTTPS encrypts data between your website and visitors. It\'s essential for security and is a confirmed Google ranking signal.',
    why: 'Sites without HTTPS are marked "Not Secure" in browsers, eroding trust and increasing bounce rates. Google has used HTTPS as a ranking signal since 2014.',
    how: 'Purchase an SSL certificate or use a free one from Let\'s Encrypt. Configure your server to redirect all HTTP traffic to HTTPS. Most modern hosting platforms (Vercel, Netlify, Cloudflare) provide automatic HTTPS.',
    time: '2 hours',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    const isHttps = new URL(page.url).protocol === 'https:';

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed: isHttps,
      score: isHttps ? this.checkDefinition.maxScore : 0,
      shortAnswer: isHttps
        ? 'Your page successfully redirects to a HTTPS (SSL secure) version.'
        : 'Your page is not using HTTPS.',
      answer: isHttps
        ? 'Your page is served securely over HTTPS.'
        : `Page "${page.url}" is served over HTTP instead of HTTPS. This is a ranking and security issue.`,
      recommendation: isHttps ? null : 'Enable HTTPS and redirect all HTTP traffic to HTTPS.',
      data: { protocol: new URL(page.url).protocol },
      pageUrl: page.url,
    };

    const issues = isHttps ? [] : [{
      category: this.category,
      type: this.code,
      title: 'Page Not Served Over HTTPS',
      description: check.answer,
      severity: 'HIGH' as const,
      impactScore: 30,
      pageUrl: page.url,
    }];

    const passingChecks = isHttps ? [{
      category: this.category,
      code: this.code,
      title: 'HTTPS Enabled',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'HTTPS encrypts data between users and your site, improving security and rankings.',
    }] : [];

    return { check, issues, passingChecks };
  }
}
