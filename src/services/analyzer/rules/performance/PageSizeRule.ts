/**
 * Check if page size is too large
 */

import type { PageRule, PageData, SiteContext, RuleResult, Issue, PassingCheck } from '../../types.js';

export class PageSizeRule implements PageRule {
  code = 'PAGE_SIZE_TOO_LARGE';
  category = 'PERFORMANCE' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    const pageSizes = page.pageSizes;
    
    if (!pageSizes) {
      return { issues, passingChecks };
    }

    const totalSizeMB = pageSizes.total / (1024 * 1024);
    const htmlSizeKB = pageSizes.html / 1024;
    const cssSizeKB = pageSizes.css / 1024;
    const jsSizeKB = pageSizes.js / 1024;
    const imagesSizeKB = pageSizes.images / 1024;

    // Check if total page size exceeds 3MB (Google recommendation)
    if (totalSizeMB > 3) {
      const breakdown: string[] = [];
      if (imagesSizeKB > 1024) breakdown.push(`Images: ${(imagesSizeKB / 1024).toFixed(2)}MB`);
      if (jsSizeKB > 512) breakdown.push(`JavaScript: ${(jsSizeKB / 1024).toFixed(2)}MB`);
      if (cssSizeKB > 256) breakdown.push(`CSS: ${(cssSizeKB / 1024).toFixed(2)}MB`);
      
      issues.push({
        category: this.category,
        type: this.code,
        severity: totalSizeMB > 5 ? 'HIGH' : 'MEDIUM',
        title: 'Page Size Too Large',
        description: `Total page size is ${totalSizeMB.toFixed(2)}MB, which exceeds the recommended 3MB limit. ${breakdown.length > 0 ? 'Largest contributors: ' + breakdown.join(', ') + '.' : ''} Reduce page size by optimizing images, minifying CSS/JS, and enabling compression.`,
        impactScore: totalSizeMB > 5 ? 25 : 15,
        pageUrl: page.url,
      });
    } else if (totalSizeMB > 1.5) {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'Page Size Acceptable',
        description: `Total page size is ${totalSizeMB.toFixed(2)}MB (within recommended limits)`,
        pageUrl: page.url,
        goodPractice:
          'Moderate page sizes improve load times and reduce bandwidth costs, especially for mobile users.',
      });
    } else {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'Page Size Optimized',
        description: `Total page size is ${totalSizeMB.toFixed(2)}MB (excellent)`,
        pageUrl: page.url,
        goodPractice:
          'Small page sizes lead to faster load times, better user experience, and lower bandwidth costs.',
      });
    }

    return { issues, passingChecks };
  }
}
