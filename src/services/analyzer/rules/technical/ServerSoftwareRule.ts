import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class ServerSoftwareRule implements PageRule {
  code = 'SERVER_SOFTWARE';
  category = 'TECHNICAL' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'SERVER_SOFTWARE',
    name: 'Web Server',
    maxScore: 0,
    priority: 3,
    section: 'technology',
    informational: true,
    what: 'The web server software (e.g. Apache, Nginx, Cloudflare) that handles HTTP requests for this website.',
    why: 'Knowing the server software helps identify the hosting technology stack and any server-specific optimizations or security considerations.',
    how: 'This is informational only. If your server header is exposed, consider hiding it for security by removing the Server header in your web server configuration.',
    time: '15 minutes',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    const serverHeader = page.httpHeaders?.['server'] ?? page.httpHeaders?.['Server'] ?? null;

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed: null,
      score: 0,
      shortAnswer: serverHeader ? `Web server: ${serverHeader}` : 'Server information not exposed.',
      answer: serverHeader
        ? `Server software detected: ${serverHeader}`
        : 'No Server header exposed. Hiding server information is a security best practice that reduces targeted attacks.',
      recommendation: null,
      data: { server: serverHeader, detected: serverHeader !== null },
      pageUrl: page.url,
    };

    return { check, issues: [], passingChecks: [] };
  }
}
