import type { SiteRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';
import { promises as dns } from 'dns';

export class SPFRecordRule implements SiteRule {
  code = 'SPF_RECORD';
  category = 'TECHNICAL' as const;
  level = 'site' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'SPF_RECORD',
    name: 'SPF Record',
    maxScore: 3,
    priority: 2,
    section: 'technology',
    informational: false,
    what: 'SPF (Sender Policy Framework) is a DNS record that specifies which mail servers are authorized to send email on behalf of your domain, helping prevent email spoofing.',
    why: 'SPF records improve email deliverability and security. Without SPF, your emails are more likely to be marked as spam, and malicious actors can more easily send spoofed emails from your domain.',
    how: 'Add an SPF TXT record to your domain DNS. Format: "v=spf1 include:_spf.yourmailprovider.com ~all". Include all legitimate mail servers and test the record before enforcement to avoid blocking legitimate emails.',
    time: '30 minutes',
  };

  async executeAsync(pages: PageData[], context: SiteContext): Promise<RuleResult> {
    const domain = new URL(context.baseUrl).hostname.replace(/^www\./, '');

    try {
      const records = await dns.resolveTxt(domain);
      const spfRecord = records.flat().find(r => r.startsWith('v=spf1')) ?? null;
      const hasValidSyntax = spfRecord ? /v=spf1.*[~\-?+]all/.test(spfRecord) : false;
      const passed = spfRecord !== null && hasValidSyntax;
      const score = passed ? this.checkDefinition.maxScore : spfRecord ? 1 : 0;

      const check: SEOAuditCheck = {
        ...this.checkDefinition,
        category: this.category,
        passed,
        score,
        shortAnswer: passed
          ? 'Valid SPF record found.'
          : spfRecord
            ? 'SPF record found but may be invalid.'
            : 'No SPF record found.',
        answer: passed
          ? `SPF record is properly configured for ${domain}: ${spfRecord}`
          : spfRecord
            ? `SPF record exists but may be invalid: "${spfRecord}". It should start with "v=spf1" and end with an "all" mechanism.`
            : `No SPF record found for ${domain}. SPF helps prevent email spoofing and improves email deliverability.`,
        recommendation: passed ? null : 'Add an SPF TXT record to your domain DNS to authorize mail servers and improve deliverability.',
        data: { domain, spfRecord, hasValidSyntax },
        pageUrl: context.baseUrl,
      };

      const issues = !passed ? [{
        category: this.category,
        type: this.code,
        title: spfRecord ? 'Invalid SPF Record' : 'Missing SPF Record',
        description: check.answer,
        severity: 'MEDIUM' as const,
        impactScore: 15,
        pageUrl: context.baseUrl,
      }] : [];

      const passingChecks = passed ? [{
        category: this.category,
        code: this.code,
        title: 'Valid SPF Record',
        description: check.shortAnswer,
        pageUrl: context.baseUrl,
        goodPractice: 'SPF records prevent email spoofing and improve email deliverability.',
      }] : [];

      return { check, issues, passingChecks };
    } catch {
      const check: SEOAuditCheck = {
        ...this.checkDefinition,
        category: this.category,
        passed: false,
        score: 0,
        shortAnswer: 'No SPF record found.',
        answer: `No SPF record found for ${domain}. SPF helps prevent email spoofing and improves email deliverability.`,
        recommendation: 'Add an SPF TXT record to your domain DNS.',
        data: { domain, hasSPF: false },
        pageUrl: context.baseUrl,
      };
      return {
        check,
        issues: [{
          category: this.category,
          type: this.code,
          title: 'Missing SPF Record',
          description: check.answer,
          severity: 'MEDIUM' as const,
          impactScore: 15,
          pageUrl: context.baseUrl,
        }],
        passingChecks: [],
      };
    }
  }

  execute(_pages: PageData[], context: SiteContext): RuleResult {
    const stub: SEOAuditCheck = {
      ...this.checkDefinition,
      maxScore: 0,
      informational: true,
      category: this.category,
      passed: null,
      score: 0,
      shortAnswer: 'SPF check pending (async DNS lookup).',
      answer: 'SPF record check requires a DNS lookup and will be resolved asynchronously.',
      recommendation: null,
      pageUrl: context.baseUrl,
    };
    return { check: stub, issues: [], passingChecks: [] };
  }
}
