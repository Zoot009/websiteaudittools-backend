/**
 * Check if page loads too many resources
 */

import type { PageRule, PageData, SiteContext, RuleResult, Issue, PassingCheck } from '../../types.js';

export class ResourceCountRule implements PageRule {
  code = 'TOO_MANY_RESOURCES';
  category = 'PERFORMANCE' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    const resourceCounts = page.resourceCounts;
    
    if (!resourceCounts) {
      return { issues, passingChecks };
    }

    const { scripts, stylesheets, images, fonts } = resourceCounts;
    const totalResources = scripts + stylesheets + images + fonts;

    const problems: string[] = [];
    
    if (scripts > 20) problems.push(`${scripts} JavaScript files`);
    if (stylesheets > 10) problems.push(`${stylesheets} CSS files`);
    if (images > 50) problems.push(`${images} images`);
    if (fonts > 6) problems.push(`${fonts} font files`);

    if (problems.length > 0) {
      issues.push({
        category: this.category,
        type: this.code,
        severity: problems.length >= 3 ? 'HIGH' : 'MEDIUM',
        title: 'Too Many HTTP Requests',
        description: `This page loads ${totalResources} resources, which may slow down page load. Issues: ${problems.join(', ')}. Reduce requests by bundling files and implementing lazy loading.`,
        impactScore: problems.length >= 3 ? 20 : 12,
        pageUrl: page.url,
      });
    } else {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'Resource Count Optimized',
        description: `Page loads ${totalResources} resources (${scripts} JS, ${stylesheets} CSS, ${images} images, ${fonts} fonts)`,
        pageUrl: page.url,
        goodPractice:
          'Limiting HTTP requests improves page load performance and reduces server load.',
      });
    }

    return { issues, passingChecks };
  }
}
