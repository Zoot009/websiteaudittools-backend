/**
 * Check if XML sitemap was discovered (site-level check)
 */

import type { SiteRule, PageData, SiteContext, RuleResult } from '../../types.js';

export class XMLSitemapRule implements SiteRule {
  code = 'XML_SITEMAP';
  category = 'TECHNICAL' as const;
  level = 'site' as const;

  execute(pages: PageData[], context: SiteContext): RuleResult {
    const issues = [];
    const passingChecks = [];

    if (!context.hasSitemap) {
      issues.push({
        category: this.category,
        type: this.code,
        title: 'XML Sitemap Not Found',
        description: `No XML sitemap was found for "${context.baseUrl}". Sitemaps help search engines discover and crawl your pages efficiently.`,
        severity: 'MEDIUM' as const,
        impactScore: 20,
        pageUrl: context.baseUrl,
      });
    } else {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'XML Sitemap Present',
        description: `XML sitemap discovered with ${context.sitemapUrls?.size || 0} URLs`,
        pageUrl: context.baseUrl,
        goodPractice:
          'XML sitemaps help search engines discover all your pages and understand your site structure.',
      });
    }

    return { issues, passingChecks };
  }
}
