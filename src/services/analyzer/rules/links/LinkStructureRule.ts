/**
 * Check on-page link structure (internal vs external ratio, nofollow detection)
 * Enhanced with link ratios and nofollow percentage tracking
 */

import type { PageRule, PageData, SiteContext, RuleResult, Issue, PassingCheck } from '../../types.js';
import { getRecommendationContent } from '../../templates/checkContent.js';

interface LinkAnalysis {
  total: number;
  internal: number;
  external: number;
  internalRatio: number; // Percentage
  externalRatio: number; // Percentage
  nofollow: number;
  nofollowRatio: number; // Percentage
}

export class LinkStructureRule implements PageRule {
  code = 'LINK_STRUCTURE';
  category = 'LINKS' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    const links = page.links || [];

    if (links.length === 0) {
      const recommendationContent = getRecommendationContent(this.code);
      issues.push({
        category: this.category,
        type: 'NO_LINKS',
        title: 'No Links on Page',
        description: `Page "${page.url}" has no links. Pages should link to related content for better navigation and SEO.`,
        severity: 'MEDIUM' as const,
        impactScore: 15,
        pageUrl: page.url,
        recommendation: 'Add internal links to related content and external links to authoritative sources.',
        ...(recommendationContent ? { recommendationContent } : {}),
        data: { analysis: this.analyzeLinks(links) }
      });
      return { issues, passingChecks };
    }

    const analysis = this.analyzeLinks(links);
    const recommendationContent = getRecommendationContent(this.code) ||
      getRecommendationContent('ON_PAGE_LINKS');

    // Check for link imbalances
    if (analysis.internal === 0) {
      issues.push({
        category: this.category,
        type: 'NO_INTERNAL_LINKS',
        title: 'No Internal Links',
        description: `Page has ${analysis.external} external links but no internal links. Internal linking improves site navigation and SEO.`,
        severity: 'MEDIUM' as const,
        impactScore: 15,
        pageUrl: page.url,
        recommendation: 'Add internal links to related pages on your site to improve navigation and distribute PageRank.',
        ...(recommendationContent ? { recommendationContent } : {}),
        data: { analysis }
      });
    } else if (analysis.external === 0 && analysis.total > 10) {
      issues.push({
        category: this.category,
        type: 'NO_EXTERNAL_LINKS',
        title: 'No External Links',
        description: `Page has ${analysis.internal} internal links but no external links. Linking to authoritative sources can build trust.`,
        severity: 'LOW' as const,
        impactScore: 3,
        pageUrl: page.url,
        recommendation: 'Consider adding a few external links to high-quality, relevant sources to support your content.',
        ...(recommendationContent ? { recommendationContent } : {}),
        data: { analysis }
      });
    } else if (analysis.externalRatio > 50) {
      issues.push({
        category: this.category,
        type: 'TOO_MANY_EXTERNAL_LINKS',
        title: 'High External Link Ratio',
        description: `Page has ${analysis.externalRatio}% external links (${analysis.external} external, ${analysis.internal} internal). Too many external links can leak PageRank.`,
        severity: 'LOW' as const,
        impactScore: 8,
        pageUrl: page.url,
        recommendation: 'Aim for at least 70-80% internal links to keep users on your site and distribute PageRank effectively.',
        ...(recommendationContent ? { recommendationContent } : {}),
        data: { analysis }
      });
    } else if (analysis.nofollowRatio > 30) {
      issues.push({
        category: this.category,
        type: 'EXCESSIVE_NOFOLLOW',
        title: 'Excessive Nofollow Links',
        description: `Page has ${analysis.nofollowRatio}% nofollow links (${analysis.nofollow} of ${analysis.total}). Excessive nofollow usage wastes link equity.`,
        severity: 'LOW' as const,
        impactScore: 5,
        pageUrl: page.url,
        recommendation: 'Use nofollow only for untrusted content, sponsored links, or user-generated content. Let other links pass PageRank.',
        ...(recommendationContent ? { recommendationContent } : {}),
        data: { analysis }
      });
    } else if (analysis.total > 100) {
      issues.push({
        category: this.category,
        type: 'TOO_MANY_LINKS',
        title: 'Excessive Links',
        description: `Page has ${analysis.total} links (${analysis.internal} internal, ${analysis.external} external). Consider reducing to <100 links.`,
        severity: 'LOW' as const,
        impactScore: 5,
        pageUrl: page.url,
        recommendation: 'Reduce total links to under 100 to avoid diluting link equity and improve page quality.',
        ...(recommendationContent ? { recommendationContent } : {}),
        data: { analysis }
      });
    } else {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'Healthy Link Structure',
        description: `Page has ${analysis.total} links (${analysis.internalRatio}% internal, ${analysis.externalRatio}% external, ${analysis.nofollowRatio}% nofollow)`,
        pageUrl: page.url,
        goodPractice:
          'Balanced internal and external linking helps with navigation, user experience, and SEO.',
        ...(recommendationContent ? { recommendationContent } : {}),
        data: { analysis }
      });
    }

    return { issues, passingChecks };
  }

  private analyzeLinks(links: Array<{ href: string; text: string; isInternal: boolean }>): LinkAnalysis {
    const total = links.length;
    const internal = links.filter(l => l.isInternal).length;
    const external = total - internal;
    
    // Count nofollow links (detected by rel="nofollow" in the href or text)
    const nofollow = links.filter(l => {
      // This is a simplified check - in real implementation, we'd need the full link HTML
      return l.text.toLowerCase().includes('nofollow');
    }).length;

    return {
      total,
      internal,
      external,
      internalRatio: total > 0 ? Math.round((internal / total) * 100) : 0,
      externalRatio: total > 0 ? Math.round((external / total) * 100) : 0,
      nofollow,
      nofollowRatio: total > 0 ? Math.round((nofollow / total) * 100) : 0
    };
  }
}
