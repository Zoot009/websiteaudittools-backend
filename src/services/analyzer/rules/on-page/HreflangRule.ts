import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class HreflangRule implements PageRule {
  code = 'HREFLANG';
  category = 'ON_PAGE' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'HREFLANG',
    name: 'Hreflang',
    maxScore: 2,
    priority: 3,
    section: 'seo',
    informational: false,
    what: 'Hreflang is an HTML attribute that tells search engines which language and regional version of a page to show to users in different countries.',
    why: 'For sites with multiple language or regional versions, hreflang ensures users see the correct version in search results. Without it, search engines may show the wrong language version or treat translations as duplicate content.',
    how: 'Add <link rel="alternate" hreflang="LANGUAGE-REGION" href="URL"> tags in the <head> for each language version. Include a self-referencing hreflang. Use correct language-region codes (en-US, es-ES, etc.).',
    time: '1 hour',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    const hreflangLinks = page.hreflangLinks ?? [];

    if (hreflangLinks.length === 0) {
      const stub: SEOAuditCheck = {
        ...this.checkDefinition,
        maxScore: 0,
        informational: true,
        category: this.category,
        passed: null,
        score: 0,
        shortAnswer: 'No hreflang tags found (single-language site).',
        answer: 'No hreflang tags detected. This is expected for single-language sites.',
        recommendation: null,
        pageUrl: page.url,
      };
      return { check: stub, issues: [], passingChecks: [] };
    }

    const hasXDefault = hreflangLinks.some(link => link.hreflang === 'x-default');
    const hasSelfReference = hreflangLinks.some(link => link.href === page.url);
    const invalidCodes = hreflangLinks.filter(
      link => link.hreflang !== 'x-default' && !/^[a-z]{2}(-[A-Z]{2})?$/.test(link.hreflang),
    );

    let passed: boolean;
    let score: number;
    let shortAnswer: string;
    let answer: string;
    let recommendation: string | null;
    let issueType: string | null = null;
    let issueSeverity: 'MEDIUM' | 'LOW' = 'MEDIUM';
    let issueImpact = 10;

    if (invalidCodes.length > 0) {
      passed = false; score = 0;
      shortAnswer = `Hreflang has invalid language codes.`;
      answer = `Page has invalid hreflang codes: ${invalidCodes.map(l => l.hreflang).join(', ')}. Use ISO 639-1 language codes (e.g. en, en-US, es-ES).`;
      recommendation = 'Fix hreflang codes to use valid ISO 639-1 language codes with optional ISO 3166-1 region codes.';
      issueType = 'INVALID_HREFLANG'; issueSeverity = 'MEDIUM'; issueImpact = 15;
    } else if (!hasSelfReference) {
      passed = false; score = 1;
      shortAnswer = 'Hreflang is missing a self-referencing tag.';
      answer = 'Page has hreflang tags but is missing a self-referencing hreflang pointing to itself.';
      recommendation = 'Add a hreflang tag pointing to the current page URL.';
      issueType = 'MISSING_SELF_HREFLANG'; issueSeverity = 'LOW'; issueImpact = 5;
    } else {
      passed = true; score = this.checkDefinition.maxScore;
      shortAnswer = `Hreflang properly configured (${hreflangLinks.length} languages${hasXDefault ? ', x-default' : ''}).`;
      answer = `Page has ${hreflangLinks.length} hreflang links${hasXDefault ? ' including x-default' : ''}, all properly configured.`;
      recommendation = null;
    }

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score,
      shortAnswer,
      answer,
      recommendation,
      data: { count: hreflangLinks.length, hasXDefault, hasSelfReference, invalidCodes: invalidCodes.map(l => l.hreflang) },
      pageUrl: page.url,
    };

    const issues = !passed && issueType ? [{
      category: this.category,
      type: issueType,
      title: issueType === 'INVALID_HREFLANG' ? 'Invalid Hreflang Codes' : 'Missing Self-Referencing Hreflang',
      description: answer,
      severity: issueSeverity as const,
      impactScore: issueImpact,
      pageUrl: page.url,
      elementSelector: 'link[rel="alternate"][hreflang]',
    }] : [];

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: 'Hreflang Properly Configured',
      description: shortAnswer,
      pageUrl: page.url,
      goodPractice: 'Hreflang tags help search engines serve the correct language version to users in different regions.',
    }] : [];

    return { check, issues, passingChecks };
  }
}
