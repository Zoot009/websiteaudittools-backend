import type { SiteRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

const GBP_PATTERNS: RegExp[] = [
  /g\.page\/[a-zA-Z0-9_%-]+/i,
  /maps\.google\.[a-z.]+\/maps\?[^'"]*cid=/i,
  /google\.[a-z.]+\/maps\/place\//i,
  /business\.google\.com/i,
  /goo\.gl\/maps\//i,
  /maps\.app\.goo\.gl\//i,
];

const GBP_SAMEAS_PATTERNS: RegExp[] = [
  /g\.page\//i,
  /maps\.google\.[a-z.]+\/maps\?[^"]*cid=/i,
  /google\.[a-z.]+\/maps\/place\//i,
  /goo\.gl\/maps\//i,
  /maps\.app\.goo\.gl\//i,
];

function hasGbpPattern(html: string): { found: boolean; url: string | null } {
  for (const pattern of GBP_PATTERNS) {
    const match = html.match(pattern);
    if (match) {
      const idx = html.search(pattern);
      const snippet = html.slice(Math.max(0, idx - 20), idx + match[0].length + 40);
      const urlMatch = snippet.match(/https?:\/\/[^\s'"<>]+/);
      return { found: true, url: urlMatch ? urlMatch[0] : match[0] };
    }
  }
  return { found: false, url: null };
}

function extractGbpFromSchemas(pages: PageData[]): string | null {
  for (const page of pages) {
    if (!page.schemas) continue;
    for (const schema of page.schemas) {
      const sameAs: unknown = schema.data?.sameAs;
      const urls: string[] = Array.isArray(sameAs)
        ? sameAs.filter((s): s is string => typeof s === 'string')
        : typeof sameAs === 'string'
        ? [sameAs]
        : [];
      for (const url of urls) {
        if (GBP_SAMEAS_PATTERNS.some((p) => p.test(url))) return url;
      }
    }
  }
  return null;
}

export class GoogleBusinessProfileRule implements SiteRule {
  code = 'GOOGLE_BUSINESS_PROFILE';
  category = 'STRUCTURED_DATA' as const;
  level = 'site' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'GOOGLE_BUSINESS_PROFILE',
    name: 'Google Business Profile',
    maxScore: 3,
    priority: 2,
    section: 'geo',
    informational: false,
    what: 'Google Business Profile (GBP) is a free listing that displays your business information in Google Search and Maps, including address, hours, phone, and reviews.',
    why: 'A verified Google Business Profile is the single most important factor for local search visibility. It enables your business to appear in Google Maps and the Local Pack, which drives significant foot traffic and calls.',
    how: 'Create or claim your GBP at business.google.com, verify your listing, and link to it from your website. Add the GBP URL to your Organization or LocalBusiness schema\'s sameAs property for the strongest signal.',
    time: '1-2 hours',
  };

  execute(pages: PageData[], context: SiteContext): RuleResult {
    const hasLocalSignals = pages.some(
      (p) => p.localSeo?.phone?.found || p.localSeo?.address?.found
    );

    if (!hasLocalSignals) {
      const stub: SEOAuditCheck = {
        ...this.checkDefinition,
        maxScore: 0,
        informational: true,
        category: this.category,
        passed: null,
        score: 0,
        shortAnswer: 'Google Business Profile check applies to local businesses.',
        answer: 'No local business signals (phone/address) detected. Google Business Profile check is skipped for non-local sites.',
        recommendation: null,
        pageUrl: context.baseUrl,
      };
      return { check: stub, issues: [], passingChecks: [] };
    }

    const gbpFromSchema = extractGbpFromSchemas(pages);
    if (gbpFromSchema) {
      const check: SEOAuditCheck = {
        ...this.checkDefinition,
        category: this.category,
        passed: true,
        score: this.checkDefinition.maxScore,
        shortAnswer: 'Google Business Profile linked in schema sameAs.',
        answer: `Schema markup references a Google Business Profile URL in sameAs (${gbpFromSchema}), explicitly connecting your website to your GBP listing.`,
        recommendation: null,
        data: { gbpUrl: gbpFromSchema, source: 'schema' },
        pageUrl: context.baseUrl,
      };
      return {
        check,
        issues: [],
        passingChecks: [{
          category: this.category,
          code: this.code,
          title: 'Google Business Profile Linked in Schema',
          description: check.shortAnswer,
          goodPractice: 'Linking your GBP in schema sameAs tells Google your website and listing belong to the same business.',
        }],
      };
    }

    const priorityPages = pages.filter((p) => {
      const path = new URL(p.url).pathname.toLowerCase();
      return path === '/' || path === '' || path.includes('contact') || path.includes('about');
    });
    const remainingPages = pages.filter((p) => !priorityPages.includes(p));

    let gbpUrl: string | null = null;
    let foundOnPage: string | null = null;

    for (const page of [...priorityPages, ...remainingPages]) {
      const result = hasGbpPattern(page.html);
      if (result.found) {
        gbpUrl = result.url;
        foundOnPage = page.url;
        break;
      }
    }

    if (gbpUrl) {
      const hasAnySchema = pages.some((p) => p.schemas && p.schemas.length > 0);
      const check: SEOAuditCheck = {
        ...this.checkDefinition,
        category: this.category,
        passed: true,
        score: 2,
        shortAnswer: 'Google Business Profile link detected on site.',
        answer: `A Google Business Profile link or map embed was found (${gbpUrl}). For maximum SEO benefit, add this URL to your schema sameAs property.`,
        recommendation: hasAnySchema ? 'Add your GBP URL to the sameAs array in your Organization or LocalBusiness schema.' : null,
        data: { gbpUrl, source: 'html', foundOnPage },
        pageUrl: foundOnPage ?? context.baseUrl,
      };

      const issues = hasAnySchema ? [{
        category: this.category,
        type: 'GBP_NOT_IN_SCHEMA_SAMEAS',
        title: 'Google Business Profile Not Referenced in Schema sameAs',
        description: 'Your site links to a Google Business Profile but it is not included in your schema sameAs property. Add your GBP URL to the sameAs array in your Organization or LocalBusiness schema.',
        severity: 'LOW' as const,
        impactScore: 8,
        pageUrl: foundOnPage ?? context.baseUrl,
      }] : [];

      return {
        check,
        issues,
        passingChecks: [{
          category: this.category,
          code: this.code,
          title: 'Google Business Profile Link Detected',
          description: check.shortAnswer,
          pageUrl: foundOnPage ?? context.baseUrl,
          goodPractice: 'Linking your Google Business Profile helps users find your location and improves local search visibility.',
        }],
      };
    }

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed: false,
      score: 0,
      shortAnswer: 'No Google Business Profile link detected.',
      answer: 'Your site appears to be a local business but no Google Business Profile link was found. A GBP listing is the single most important factor for local search visibility.',
      recommendation: 'Create or claim your Google Business Profile at business.google.com. Link to it from your website and include it in your LocalBusiness schema sameAs property.',
      data: { gbpUrl: null },
      pageUrl: context.baseUrl,
    };

    return {
      check,
      issues: [{
        category: this.category,
        type: this.code,
        title: 'No Google Business Profile Link Detected',
        description: check.answer,
        severity: 'HIGH' as const,
        impactScore: 35,
      }],
      passingChecks: [],
    };
  }
}
