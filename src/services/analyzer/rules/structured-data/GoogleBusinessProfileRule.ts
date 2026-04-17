/**
 * Check for Google Business Profile (GBP) signals
 * Detects links, embeds, or schema references that connect to a Google Business Profile listing.
 * A verified GBP listing is one of the strongest local SEO signals.
 */

import type { SiteRule, PageData, SiteContext, RuleResult, Issue, PassingCheck } from '../../types.js';

/**
 * Patterns that indicate a Google Business Profile link or embed.
 * - g.page/<slug>  — GBP short link
 * - maps.google.com/maps?cid=  — Business listing by CID
 * - google.com/maps/place/      — Maps place URL
 * - business.google.com         — GBP management URL (sometimes linked publicly)
 * - maps.google.com/maps/embed  — Embedded map (often pointing to business)
 * - goo.gl/maps/                — Legacy short links
 */
const GBP_PATTERNS: RegExp[] = [
  /g\.page\/[a-zA-Z0-9_%-]+/i,
  /maps\.google\.[a-z.]+\/maps\?[^'"]*cid=/i,
  /google\.[a-z.]+\/maps\/place\//i,
  /business\.google\.com/i,
  /goo\.gl\/maps\//i,
  /maps\.app\.goo\.gl\//i,
];

/**
 * Patterns for schema sameAs values that indicate GBP
 */
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
      // Try to extract the full URL around the match
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
        if (GBP_SAMEAS_PATTERNS.some((p) => p.test(url))) {
          return url;
        }
      }
    }
  }
  return null;
}

export class GoogleBusinessProfileRule implements SiteRule {
  code = 'GOOGLE_BUSINESS_PROFILE';
  category = 'STRUCTURED_DATA' as const;
  level = 'site' as const;

  execute(pages: PageData[], _context: SiteContext): RuleResult {
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    // Only run on sites that show local business signals
    const hasLocalSignals = pages.some(
      (p) => p.localSeo?.phone?.found || p.localSeo?.address?.found
    );

    if (!hasLocalSignals) {
      return { issues, passingChecks };
    }

    // 1. Check schema sameAs references (strongest signal — explicitly set)
    const gbpFromSchema = extractGbpFromSchemas(pages);
    if (gbpFromSchema) {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'Google Business Profile Linked in Schema',
        description:
          `Your schema markup references a Google Business Profile URL in sameAs: ${gbpFromSchema}. ` +
          'This explicitly connects your website to your GBP listing, which strengthens local SEO signals.',
        goodPractice:
          'Linking your GBP in schema sameAs tells Google your website and listing belong to the same business.',
      });
      return { issues, passingChecks };
    }

    // 2. Scan page HTML for GBP links / embeds
    // Check homepage and contact pages first, then any page
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
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'Google Business Profile Link Detected',
        description:
          `A Google Business Profile link or map embed was found on your site (${gbpUrl}). ` +
          'For maximum SEO benefit, also add this URL to your Organization or LocalBusiness schema sameAs property.',
        pageUrl: foundOnPage!,
        goodPractice:
          'Linking your Google Business Profile helps users find your location and improves local search visibility.',
      });

      // Suggest adding to schema sameAs if not already there
      const hasAnySchema = pages.some((p) => p.schemas && p.schemas.length > 0);
      if (hasAnySchema) {
        issues.push({
          category: this.category,
          type: 'GBP_NOT_IN_SCHEMA_SAMEAS',
          title: 'Google Business Profile Not Referenced in Schema sameAs',
          description:
            `Your site links to a Google Business Profile but it is not included in your schema's sameAs property. ` +
            'Add your GBP URL to the sameAs array in your Organization or LocalBusiness schema to strengthen the connection.',
          severity: 'LOW' as const,
          impactScore: 8,
          pageUrl: foundOnPage!,
        });
      }

      return { issues, passingChecks };
    }

    // 3. No GBP signals found — flag as missing for local businesses
    issues.push({
      category: this.category,
      type: this.code,
      title: 'No Google Business Profile Link Detected',
      description:
        'Your site appears to be a local business but no Google Business Profile link was found. ' +
        'Create or claim your Google Business Profile at business.google.com, then link to it from your website ' +
        'and include it in your LocalBusiness schema sameAs property. ' +
        'A GBP listing is the single most important factor for local search visibility.',
      severity: 'HIGH' as const,
      impactScore: 35,
    });

    return { issues, passingChecks };
  }
}
