import type { AuditRule, RuleContext, SeoIssue, FixRecommendation } from '../../types';

/**
 * Rule: Broken internal links
 * Severity: HIGH
 * Category: Links
 */
export const brokenInternalLinksRule: AuditRule = {
  code: 'BROKEN_INTERNAL_LINKS',
  name: 'Broken internal links',
  category: 'LINKS',
  severity: 'HIGH',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page, siteContext } = context;
    const issues: SeoIssue[] = [];
    
    // Check if any internal links point to pages with errors
    const brokenLinks = page.links.filter(link => {
      if (!link.isInternal) return false;
      
      // Find the linked page in the site context
      const linkedPage = siteContext.allPages.find(p => {
        try {
          const linkUrl = new URL(link.href, page.url);
          const linkedUrl = new URL(p.url);
          return linkUrl.href === linkedUrl.href;
        } catch {
          return false;
        }
      });
      
      // Check if linked page has error status
      return linkedPage && linkedPage.statusCode >= 400;
    });
    
    if (brokenLinks.length > 0) {
      issues.push({
        category: 'LINKS',
        type: 'broken_internal_links',
        title: 'Broken Internal Links',
        description: `This page has ${brokenLinks.length} broken internal links pointing to error pages. This wastes crawl budget and hurts user experience.`,
        severity: 'HIGH',
        impactScore: 80,
        pageUrl: page.url,
      });
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue): FixRecommendation => ({
    title: 'Fix broken links',
    whyItMatters: 'Broken internal links waste crawl budget, create poor user experience, and represent lost link equity flow through your site.',
    howToFix: [
      'Identify all broken links on this page.',
      'Update links to point to working pages or remove them.',
      'If the destination page is permanently gone, redirect it or find an alternative page.',
      'Implement automated link checking to catch broken links early.',
    ],
    estimatedEffort: 'low',
    priority: 8,
  }),
};
