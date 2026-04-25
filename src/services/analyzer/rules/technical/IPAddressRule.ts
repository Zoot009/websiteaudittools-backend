import type { SiteRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';
import { promises as dns } from 'dns';

export class IPAddressRule implements SiteRule {
  code = 'IP_ADDRESS';
  category = 'TECHNICAL' as const;
  level = 'site' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'IP_ADDRESS',
    name: 'IP Address',
    maxScore: 0,
    priority: 3,
    section: 'technology',
    informational: true,
    what: 'The IP address is the numerical label assigned to the server where your website is hosted. It\'s how the internet routes requests to your site.',
    why: 'Knowing the server IP helps verify DNS configuration and identify the hosting provider or CDN being used.',
    how: 'This is informational only. Your IP address is managed by your hosting provider or CDN.',
    time: '5 minutes',
  };

  async executeAsync(pages: PageData[], context: SiteContext): Promise<RuleResult> {
    const domain = new URL(context.baseUrl).hostname;

    try {
      const addresses = await dns.resolve4(domain);
      const ipAddress = addresses[0];

      const check: SEOAuditCheck = {
        ...this.checkDefinition,
        category: this.category,
        passed: null,
        score: 0,
        shortAnswer: `Server IP: ${ipAddress}`,
        answer: `Site resolves to IP address: ${ipAddress} (IPv4)`,
        recommendation: null,
        data: { domain, ipAddress, ipType: 'IPv4' },
        pageUrl: context.baseUrl,
      };

      return { check, issues: [], passingChecks: [] };
    } catch {
      try {
        const addresses = await dns.resolve6(domain);
        const ipAddress = addresses[0];

        const check: SEOAuditCheck = {
          ...this.checkDefinition,
          category: this.category,
          passed: null,
          score: 0,
          shortAnswer: `Server IP: ${ipAddress}`,
          answer: `Site resolves to IPv6 address: ${ipAddress}`,
          recommendation: null,
          data: { domain, ipAddress, ipType: 'IPv6' },
          pageUrl: context.baseUrl,
        };

        return { check, issues: [], passingChecks: [] };
      } catch {
        const check: SEOAuditCheck = {
          ...this.checkDefinition,
          category: this.category,
          passed: null,
          score: 0,
          shortAnswer: 'IP address could not be resolved.',
          answer: 'IP address resolution did not return a result.',
          recommendation: null,
          data: { domain },
          pageUrl: context.baseUrl,
        };

        return { check, issues: [], passingChecks: [] };
      }
    }
  }

  execute(_pages: PageData[], context: SiteContext): RuleResult {
    const stub: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed: null,
      score: 0,
      shortAnswer: 'IP address check pending (async DNS lookup).',
      answer: 'IP address check requires a DNS lookup and will be resolved asynchronously.',
      recommendation: null,
      pageUrl: context.baseUrl,
    };
    return { check: stub, issues: [], passingChecks: [] };
  }
}
