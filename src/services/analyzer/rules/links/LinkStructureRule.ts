/**
 * Check on-page link structure (internal vs external ratio)
 */

import type { PageRule, PageData, SiteContext, RuleResult, Issue, PassingCheck } from '../../types.js';

export class LinkStructureRule implements PageRule {
  code = 'LINK_STRUCTURE';
  category = 'LINKS' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    const links = page.links || [];

    if (links.length === 0) {
      issues.push({
        category: this.category,
        type: 'NO_LINKS',
        title: 'No Links on Page',
        description: `Page "${page.url}" has no links. Pages should link to related content for better navigation and SEO.`,
        severity: 'MEDIUM' as const,
        impactScore: 15,
        pageUrl: page.url,
      });
      return { issues, passingChecks };
    }

    const internalLinks = links.filter((link) => link.isInternal);
    const externalLinks = links.filter((link) => !link.isInternal);

    const totalLinks = links.length;
    const internalRatio = internalLinks.length / totalLinks;

    // Check for link imbalances
    if (internalLinks.length === 0) {
      issues.push({
        category: this.category,
        type: 'NO_INTERNAL_LINKS',
        title: 'No Internal Links',
        description: `Page has ${externalLinks.length} external links but no internal links. Internal linking improves site navigation and SEO.`,
        severity: 'MEDIUM' as const,
        impactScore: 15,
        pageUrl: page.url,
      });
    } else if (externalLinks.length === 0 && totalLinks > 10) {
      // Having some external links (to authoritative sources) can be good
      issues.push({
        category: this.category,
        type: 'NO_EXTERNAL_LINKS',
        title: 'No External Links',
        description: `Page has ${internalLinks.length} internal links but no external links. Linking to authoritative sources can build trust.`,
        severity: 'LOW' as const,
        impactScore: 3,
        pageUrl: page.url,
      });
    } else if (totalLinks > 100) {
      // Too many links can dilute link equity
      issues.push({
        category: this.category,
        type: 'TOO_MANY_LINKS',
        title: 'Excessive Links',
        description: `Page has ${totalLinks} links (${internalLinks.length} internal, ${externalLinks.length} external). Consider reducing to <100 links.`,
        severity: 'LOW' as const,
        impactScore: 5,
        pageUrl: page.url,
      });
    } else {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'Healthy Link Structure',
        description: `Page has ${totalLinks} links (${internalLinks.length} internal, ${externalLinks.length} external)`,
        pageUrl: page.url,
        goodPractice:
          'Balanced internal and external linking helps with navigation, user experience, and SEO.',
      });
    }

    return { issues, passingChecks };
  }
}
