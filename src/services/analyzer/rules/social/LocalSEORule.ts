import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class LocalSEORule implements PageRule {
  code = 'LOCAL_SEO';
  category = 'STRUCTURED_DATA' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'LOCAL_SEO',
    name: 'Local SEO Signals',
    maxScore: 2,
    priority: 2,
    section: 'geo',
    informational: false,
    what: 'Local SEO signals include displaying your business phone number and physical address on key pages, which helps search engines associate your site with a specific geographic location.',
    why: 'For local businesses, displaying NAP (Name, Address, Phone) information is critical for ranking in local search results and Google Maps. Consistent contact details help verify your business identity with search engines.',
    how: 'Display your phone number and full address prominently on your homepage, about page, and contact page. Keep this information consistent with your Google Business Profile listing.',
    time: '30 minutes',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    const localSeo = page.localSeo;

    if (!localSeo) {
      const stub: SEOAuditCheck = {
        ...this.checkDefinition,
        maxScore: 0,
        informational: true,
        category: this.category,
        passed: null,
        score: 0,
        shortAnswer: 'Local SEO data not available.',
        answer: 'Local SEO signals (phone, address) could not be detected for this page.',
        recommendation: null,
        pageUrl: page.url,
      };
      return { check: stub, issues: [], passingChecks: [] };
    }

    const url = new URL(page.url);
    const path = url.pathname.toLowerCase();
    const isRelevantPage =
      path === '/' ||
      path === '' ||
      path.includes('contact') ||
      path.includes('about');

    if (!isRelevantPage) {
      const stub: SEOAuditCheck = {
        ...this.checkDefinition,
        maxScore: 0,
        informational: true,
        category: this.category,
        passed: null,
        score: 0,
        shortAnswer: 'Local SEO check applies to homepage and contact pages.',
        answer: 'Local SEO signals are evaluated on homepage, contact, and about pages.',
        recommendation: null,
        pageUrl: page.url,
      };
      return { check: stub, issues: [], passingChecks: [] };
    }

    const hasPhone = localSeo.phone?.found ?? false;
    const hasAddress = localSeo.address?.found ?? false;
    const passed = hasPhone && hasAddress;
    const score = passed ? this.checkDefinition.maxScore : (hasPhone || hasAddress) ? 1 : 0;

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score,
      shortAnswer: passed
        ? 'Phone number and address are present.'
        : hasPhone
          ? 'Phone number found but address is missing.'
          : hasAddress
            ? 'Address found but phone number is missing.'
            : 'No phone number or address found.',
      answer: passed
        ? `Page displays phone number${localSeo.phone?.number ? ` (${localSeo.phone.number})` : ''} and address, supporting local SEO and user trust.`
        : hasPhone || hasAddress
          ? `Page has ${hasPhone ? 'phone number' : 'address'} but is missing the ${!hasPhone ? 'phone number' : 'address'}. Include both for better local SEO signals.`
          : 'No phone number or physical address found on this page. Adding contact details improves local SEO and builds visitor trust.',
      recommendation: !passed ? 'Add both a phone number and physical address to your homepage and contact page. Keep this information consistent with your Google Business Profile.' : null,
      data: { hasPhone, hasAddress, phone: localSeo.phone?.number },
      pageUrl: page.url,
    };

    const issues = !passed ? [{
      category: this.category,
      type: score === 0 ? 'MISSING_LOCAL_SEO' : 'INCOMPLETE_LOCAL_SEO',
      title: score === 0 ? 'No Local SEO Signals' : 'Incomplete Local SEO',
      description: check.answer,
      severity: 'LOW' as const,
      impactScore: 5,
      pageUrl: page.url,
    }] : [];

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: 'Local SEO Signals Present',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'Displaying contact information helps with local SEO and builds trust with visitors.',
    }] : [];

    return { check, issues, passingChecks };
  }
}
