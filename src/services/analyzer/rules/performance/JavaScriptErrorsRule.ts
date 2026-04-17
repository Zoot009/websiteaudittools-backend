/**
 * Check for JavaScript runtime errors on the page
 * JS errors can break functionality, harm user experience, and prevent proper indexing
 */

import type { PageRule, PageData, SiteContext, RuleResult, Issue, PassingCheck } from '../../types.js';

export class JavaScriptErrorsRule implements PageRule {
  code = 'JAVASCRIPT_ERRORS';
  category = 'TECHNICAL' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    // Check if jsErrors data is available
    if (!page.jsErrors || !Array.isArray(page.jsErrors)) {
      // No error data available (skip check)
      return { issues, passingChecks };
    }

    const errorCount = page.jsErrors.length;

    if (errorCount === 0) {
      // No JavaScript errors - good!
      passingChecks.push({
        category: 'TECHNICAL',
        code: 'no_javascript_errors',
        title: 'No JavaScript Errors Detected',
        description: 'Page loaded without JavaScript runtime errors, ensuring proper functionality.',
        pageUrl: page.url,
        goodPractice: 'Clean JavaScript execution prevents broken features and ensures proper rendering for search engines',
      });
    } else {
      // JavaScript errors found
      const severity = errorCount >= 5 ? 'CRITICAL' 
        : errorCount >= 3 ? 'HIGH' 
        : 'MEDIUM';
      
      const impactScore = errorCount >= 5 ? 90 
        : errorCount >= 3 ? 75 
        : 60;

      // Get unique error messages (avoid duplicates)
      const uniqueErrors = new Map<string, typeof page.jsErrors[0]>();
      for (const error of page.jsErrors) {
        if (!uniqueErrors.has(error.message)) {
          uniqueErrors.set(error.message, error);
        }
      }

      // Build error list for description
      const errorList = Array.from(uniqueErrors.values())
        .slice(0, 5) // Show max 5 errors
        .map(err => {
          const location = err.source ? ` (${err.source}:${err.line})` : '';
          return `• ${err.message}${location}`;
        })
        .join('\n');

      const moreErrors = uniqueErrors.size > 5 ? `\n...and ${uniqueErrors.size - 5} more` : '';

      issues.push({
        type: 'javascript_errors_detected',
        category: 'TECHNICAL',
        title: `${errorCount} JavaScript Error${errorCount === 1 ? '' : 's'} Detected`,
        description: `Found ${errorCount} JavaScript runtime error${errorCount === 1 ? '' : 's'} on this page. JavaScript errors can break critical functionality, prevent proper rendering, and harm both user experience and SEO. Search engines may not properly index content that fails to load due to JS errors.\n\nErrors found:\n${errorList}${moreErrors}`,
        severity,
        impactScore,
        pageUrl: page.url,
      });

      // If there are many errors, add a critical warning
      if (errorCount >= 10) {
        issues.push({
          type: 'excessive_javascript_errors',
          category: 'TECHNICAL',
          title: 'Excessive JavaScript Errors',
          description: `Page has ${errorCount} JavaScript errors, indicating serious code quality issues. This many errors suggest broken functionality that could prevent search engine crawlers from properly rendering and indexing your content.`,
          severity: 'CRITICAL',
          impactScore: 95,
          pageUrl: page.url,
        });
      }
    }

    return { issues, passingChecks };
  }
}
