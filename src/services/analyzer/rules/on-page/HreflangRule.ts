/**
 * Check if hreflang attributes are properly configured
 */

import type { PageRule, PageData, SiteContext, RuleResult, Issue, PassingCheck } from '../../types.js';

export class HreflangRule implements PageRule {
  code = 'HREFLANG';
  category = 'ON_PAGE' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    const hreflangLinks = page.hreflangLinks || [];

    if (hreflangLinks.length === 0) {
      // Most single-language sites don't need hreflang, so this is not an issue
      return { issues, passingChecks };
    }

    // Check for common hreflang mistakes
    const hasXDefault = hreflangLinks.some((link) => link.hreflang === 'x-default');
    const hasSelfReference = hreflangLinks.some((link) => link.href === page.url);
    const invalidCodes = hreflangLinks.filter(
      (link) =>
        link.hreflang !== 'x-default' && !/^[a-z]{2}(-[A-Z]{2})?$/.test(link.hreflang)
    );

    if (invalidCodes.length > 0) {
      issues.push({
        category: this.category,
        type: 'INVALID_HREFLANG',
        title: 'Invalid Hreflang Codes',
        description: `Page has invalid hreflang codes: ${invalidCodes.map((l) => l.hreflang).join(', ')}. Use ISO 639-1 language codes.`,
        severity: 'MEDIUM' as const,
        impactScore: 15,
        pageUrl: page.url,
        elementSelector: 'link[rel="alternate"][hreflang]',
      });
    } else if (!hasSelfReference) {
      issues.push({
        category: this.category,
        type: 'MISSING_SELF_HREFLANG',
        title: 'Missing Self-Referencing Hreflang',
        description: 'Page should include a hreflang tag pointing to itself.',
        severity: 'LOW' as const,
        impactScore: 5,
        pageUrl: page.url,
        elementSelector: 'link[rel="alternate"][hreflang]',
      });
    } else {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'Hreflang Properly Configured',
        description: `Page has ${hreflangLinks.length} hreflang links${hasXDefault ? ' including x-default' : ''}`,
        pageUrl: page.url,
        goodPractice:
          'Hreflang tags help search engines serve the correct language version to users.',
      });
    }

    return { issues, passingChecks };
  }
}
