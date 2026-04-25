import type { SiteRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';
import { promises as dns } from 'dns';

export class DNSCheckRule implements SiteRule {
  code = 'DNS_CHECK';
  category = 'TECHNICAL' as const;
  level = 'site' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'DNS_CHECK',
    name: 'DNS Nameservers',
    maxScore: 0,
    priority: 3,
    section: 'technology',
    informational: true,
    what: 'DNS (Domain Name System) translates human-readable domain names into IP addresses. Your DNS nameservers are the authoritative servers that respond to DNS queries for your domain.',
    why: 'DNS configuration affects site accessibility, speed, and email deliverability. Properly configured DNS ensures your site is reachable and resolves quickly.',
    how: 'Verify your DNS nameservers are correctly configured through your domain registrar. Use a DNS service like Cloudflare for improved performance and reliability.',
    time: '15 minutes',
  };

  async executeAsync(pages: PageData[], context: SiteContext): Promise<RuleResult> {
    const domain = new URL(context.baseUrl).hostname.replace(/^www\./, '');

    try {
      const nameservers = await dns.resolveNs(domain);

      const check: SEOAuditCheck = {
        ...this.checkDefinition,
        category: this.category,
        passed: null,
        score: 0,
        shortAnswer: `${nameservers.length} nameserver(s) detected.`,
        answer: `Site uses ${nameservers.length} DNS nameserver(s): ${nameservers.slice(0, 3).join(', ')}${nameservers.length > 3 ? '...' : ''}`,
        recommendation: null,
        data: { domain, nameservers, count: nameservers.length },
        pageUrl: context.baseUrl,
      };

      return { check, issues: [], passingChecks: [] };
    } catch {
      const check: SEOAuditCheck = {
        ...this.checkDefinition,
        category: this.category,
        passed: null,
        score: 0,
        shortAnswer: 'DNS nameserver lookup completed.',
        answer: 'DNS nameserver information could not be retrieved.',
        recommendation: null,
        data: { domain },
        pageUrl: context.baseUrl,
      };

      return { check, issues: [], passingChecks: [] };
    }
  }

  execute(_pages: PageData[], context: SiteContext): RuleResult {
    const stub: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed: null,
      score: 0,
      shortAnswer: 'DNS check pending (async DNS lookup).',
      answer: 'DNS nameserver check requires a DNS lookup and will be resolved asynchronously.',
      recommendation: null,
      pageUrl: context.baseUrl,
    };
    return { check: stub, issues: [], passingChecks: [] };
  }
}
