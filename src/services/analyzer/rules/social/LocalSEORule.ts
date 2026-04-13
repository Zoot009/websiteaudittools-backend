/**
 * Check for local SEO signals (phone and address)
 */

import type { PageRule, PageData, SiteContext, RuleResult, Issue, PassingCheck } from '../../types.js';

export class LocalSEORule implements PageRule {
  code = 'LOCAL_SEO';
  category = 'STRUCTURED_DATA' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    const localSeo = page.localSeo;

    if (!localSeo) {
      return { issues, passingChecks };
    }

    // Only check homepage and contact pages
    const url = new URL(page.url);
    const path = url.pathname.toLowerCase();
    const isRelevantPage = 
      path === '/' || 
      path === '' || 
      path.includes('contact') || 
      path.includes('about');

    if (!isRelevantPage) {
      return { issues, passingChecks };
    }

    const hasPhone = localSeo.phone?.found || false;
    const hasAddress = localSeo.address?.found || false;

    if (hasPhone && hasAddress) {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'Local SEO Signals Present',
        description: `Page displays phone number${localSeo.phone.number ? ` (${localSeo.phone.number})` : ''} and address`,
        pageUrl: page.url,
        goodPractice:
          'Displaying contact information helps with local SEO and builds trust with visitors.',
      });
    } else if (hasPhone || hasAddress) {
      const missing = !hasPhone ? 'address' : 'phone number';
      issues.push({
        category: this.category,
        type: 'INCOMPLETE_LOCAL_SEO',
        title: 'Incomplete Local SEO',
        description: `Page has ${hasPhone ? 'phone number' : 'address'} but missing ${missing}. Include both for better local SEO.`,
        severity: 'LOW' as const,
        impactScore: 5,
        pageUrl: page.url,
      });
    }

    return { issues, passingChecks };
  }
}
