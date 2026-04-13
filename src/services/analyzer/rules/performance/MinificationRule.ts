/**
 * Check if CSS and JavaScript files are minified
 */

import type { PageRule, PageData, SiteContext, RuleResult, Issue, PassingCheck } from '../../types.js';

export class MinificationRule implements PageRule {
  code = 'MINIFICATION';
  category = 'PERFORMANCE' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    const minification = page.minification;
    const resourceCounts = page.resourceCounts;
    
    if (!minification || !resourceCounts) {
      return { issues, passingChecks };
    }

    const { unminifiedScripts, unminifiedStyles } = minification;
    const { scripts, stylesheets } = resourceCounts;

    const problems: string[] = [];
    
    if (unminifiedScripts > 0) {
      const percentage = ((unminifiedScripts / scripts) * 100).toFixed(0);
      problems.push(`${unminifiedScripts} JavaScript files (${percentage}%)`);
    }
    
    if (unminifiedStyles > 0) {
      const percentage = ((unminifiedStyles / stylesheets) * 100).toFixed(0);
      problems.push(`${unminifiedStyles} CSS files (${percentage}%)`);
    }

    if (problems.length > 0) {
      const severity = (unminifiedScripts > 5 || unminifiedStyles > 3) ? 'HIGH' : 'MEDIUM';
      
      issues.push({
        category: this.category,
        type: this.code,
        severity,
        title: 'Unminified CSS/JavaScript Files',
        description: `Found unminified resources: ${problems.join(', ')}. Minification reduces file size by 20-40%. Use build tools like Webpack or Vite to minify files before deploying to production.`,
        impactScore: severity === 'HIGH' ? 18 : 10,
        pageUrl: page.url,
      });
    } else {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'CSS/JavaScript Files Minified',
        description: 'All CSS and JavaScript files appear to be minified',
        pageUrl: page.url,
        goodPractice:
          'Minification reduces file sizes by 20-40%, improving load times and reducing bandwidth usage.',
      });
    }

    return { issues, passingChecks };
  }
}
