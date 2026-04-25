import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class SSLEnabledRule implements PageRule {
  code = 'SSL_ENABLED';
  category = 'TECHNICAL' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'SSL_ENABLED',
    name: 'SSL Certificate',
    maxScore: 4,
    priority: 2,
    section: 'seo',
    informational: false,
    what: 'An SSL certificate creates an encrypted link between your web server and a visitor\'s browser, enabling HTTPS.',
    why: 'SSL is essential for protecting user data and building trust. Browsers warn users when visiting non-SSL sites. Google has made SSL a ranking factor.',
    how: 'Obtain an SSL certificate from your hosting provider or use Let\'s Encrypt (free). Most modern hosts offer one-click SSL. After installation, ensure all pages redirect from HTTP to HTTPS.',
    time: '2 hours',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    const url = new URL(page.url);
    const isHttps = url.protocol === 'https:';
    const isSuccessful = page.statusCode >= 200 && page.statusCode < 300;
    const passed = isHttps && isSuccessful;

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed: isHttps ? (isSuccessful ? true : false) : null,
      score: passed ? this.checkDefinition.maxScore : 0,
      shortAnswer: passed
        ? 'Your website has SSL enabled.'
        : isHttps && !isSuccessful
          ? 'SSL certificate may have an issue.'
          : 'No SSL detected.',
      answer: passed
        ? 'Page has a valid SSL certificate and loaded successfully over HTTPS.'
        : isHttps && !isSuccessful
          ? `Page returned status ${page.statusCode}, which may indicate SSL certificate problems.`
          : 'Page is not served over HTTPS.',
      recommendation: passed ? null : 'Install a valid SSL certificate and ensure the site loads correctly over HTTPS.',
      data: { protocol: url.protocol, statusCode: page.statusCode },
      pageUrl: page.url,
    };

    const issues = !passed && isHttps ? [{
      category: this.category,
      type: 'SSL_ERROR',
      title: 'SSL Certificate Issue',
      description: check.answer,
      severity: 'HIGH' as const,
      impactScore: 25,
      pageUrl: page.url,
    }] : [];

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: 'Valid SSL Certificate',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'Valid SSL certificates ensure encrypted connections and build user trust.',
    }] : [];

    return { check, issues, passingChecks };
  }
}
