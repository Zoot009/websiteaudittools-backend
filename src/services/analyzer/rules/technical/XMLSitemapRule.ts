import type { SiteRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class XMLSitemapRule implements SiteRule {
  code = 'XML_SITEMAP';
  category = 'TECHNICAL' as const;
  level = 'site' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'XML_SITEMAP',
    name: 'XML Sitemap',
    maxScore: 4,
    priority: 2,
    section: 'seo',
    informational: false,
    what: 'An XML sitemap is a file that lists all important pages on your website, helping search engines discover and crawl your content more efficiently.',
    why: 'Sitemaps help search engines find and index all your important pages, especially for new sites, large sites, or sites with pages that aren\'t well-linked internally. Proper indexation is fundamental to SEO success.',
    how: 'Generate an XML sitemap using your CMS (WordPress: Yoast/RankMath, Shopify: automatic) or a sitemap generator. Save it as sitemap.xml in your root directory and submit it to Google Search Console.',
    time: '30 minutes',
  };

  execute(pages: PageData[], context: SiteContext): RuleResult {
    const passed = context.hasSitemap;
    const urlCount = context.sitemapUrls?.size ?? 0;

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score: passed ? this.checkDefinition.maxScore : 0,
      shortAnswer: passed
        ? `XML sitemap found with ${urlCount} URLs.`
        : 'No XML sitemap found.',
      answer: passed
        ? `XML sitemap discovered for this site containing ${urlCount} URLs. Search engines can efficiently discover and index your content.`
        : `No XML sitemap was found for "${context.baseUrl}". Sitemaps help search engines discover and crawl your pages efficiently.`,
      recommendation: passed ? null : 'Create and submit an XML sitemap. Use your CMS\'s built-in sitemap feature or generate one with a sitemap tool, then submit it in Google Search Console.',
      data: { hasSitemap: passed, urlCount },
      pageUrl: context.baseUrl,
    };

    const issues = !passed ? [{
      category: this.category,
      type: this.code,
      title: 'XML Sitemap Not Found',
      description: check.answer,
      severity: 'MEDIUM' as const,
      impactScore: 20,
      pageUrl: context.baseUrl,
    }] : [];

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: 'XML Sitemap Present',
      description: check.shortAnswer,
      pageUrl: context.baseUrl,
      goodPractice: 'XML sitemaps help search engines discover all your pages and understand your site structure.',
    }] : [];

    return { check, issues, passingChecks };
  }
}
