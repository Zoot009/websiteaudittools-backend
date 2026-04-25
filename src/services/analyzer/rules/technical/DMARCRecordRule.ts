import type { SiteRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';
import { promises as dns } from 'dns';

export class DMARCRecordRule implements SiteRule {
  code = 'DMARC_RECORD';
  category = 'TECHNICAL' as const;
  level = 'site' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'DMARC_RECORD',
    name: 'DMARC Record',
    maxScore: 3,
    priority: 2,
    section: 'technology',
    informational: false,
    what: 'DMARC (Domain-based Message Authentication, Reporting, and Conformance) is an email authentication protocol that helps prevent email spoofing and phishing attacks from your domain.',
    why: 'Major email providers like Gmail and Outlook now require or strongly recommend DMARC for email deliverability. Without it, your legitimate emails may be marked as spam and your domain can be used for phishing.',
    how: 'Add a DMARC TXT record to your domain DNS at "_dmarc.yourdomain.com" with value "v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com". Start with p=none for monitoring, then tighten to p=quarantine or p=reject.',
    time: '30 minutes',
  };

  async executeAsync(pages: PageData[], context: SiteContext): Promise<RuleResult> {
    const domain = new URL(context.baseUrl).hostname.replace(/^www\./, '');

    try {
      const records = await dns.resolveTxt(`_dmarc.${domain}`);
      const dmarcRecord = records.flat().find(r => r.startsWith('v=DMARC1')) ?? null;
      const hasValidPolicy = dmarcRecord ? /p=(none|quarantine|reject)/.test(dmarcRecord) : false;
      const passed = dmarcRecord !== null && hasValidPolicy;
      const score = passed ? this.checkDefinition.maxScore : dmarcRecord ? 1 : 0;

      const check: SEOAuditCheck = {
        ...this.checkDefinition,
        category: this.category,
        passed,
        score,
        shortAnswer: passed
          ? 'Valid DMARC record found.'
          : dmarcRecord
            ? 'DMARC record found but may be invalid.'
            : 'No DMARC record found.',
        answer: passed
          ? `DMARC record is properly configured for ${domain}: ${dmarcRecord}`
          : dmarcRecord
            ? `DMARC record exists but appears invalid: "${dmarcRecord}". It should include a policy (p=none, p=quarantine, or p=reject).`
            : `No DMARC record found for ${domain}. DMARC helps prevent email spoofing and improves email deliverability.`,
        recommendation: passed ? null : 'Add a DMARC TXT record to your domain DNS to improve email security and deliverability.',
        data: { domain, dmarcRecord, hasValidPolicy },
        pageUrl: context.baseUrl,
      };

      const issues = !passed ? [{
        category: this.category,
        type: this.code,
        title: dmarcRecord ? 'Invalid DMARC Record' : 'Missing DMARC Record',
        description: check.answer,
        severity: 'MEDIUM' as const,
        impactScore: 15,
        pageUrl: context.baseUrl,
      }] : [];

      const passingChecks = passed ? [{
        category: this.category,
        code: this.code,
        title: 'Valid DMARC Record',
        description: check.shortAnswer,
        pageUrl: context.baseUrl,
        goodPractice: 'DMARC protects your domain from email spoofing and improves deliverability with major email providers.',
      }] : [];

      return { check, issues, passingChecks };
    } catch {
      const check: SEOAuditCheck = {
        ...this.checkDefinition,
        category: this.category,
        passed: false,
        score: 0,
        shortAnswer: 'No DMARC record found.',
        answer: `No DMARC record found for ${domain}. DMARC helps prevent email spoofing and improves email deliverability.`,
        recommendation: 'Add a DMARC TXT record to your domain DNS.',
        data: { domain, hasDMARC: false },
        pageUrl: context.baseUrl,
      };
      return {
        check,
        issues: [{
          category: this.category,
          type: this.code,
          title: 'Missing DMARC Record',
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
      shortAnswer: 'DMARC check pending (async DNS lookup).',
      answer: 'DMARC record check requires a DNS lookup and will be resolved asynchronously.',
      recommendation: null,
      pageUrl: context.baseUrl,
    };
    return { check: stub, issues: [], passingChecks: [] };
  }
}
