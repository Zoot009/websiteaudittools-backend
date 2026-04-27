import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck, Issue } from '../../types.js';

export class JavaScriptErrorsRule implements PageRule {
  code = 'JAVASCRIPT_ERRORS';
  category = 'TECHNICAL' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'JAVASCRIPT_ERRORS',
    name: 'JavaScript Errors',
    maxScore: 3,
    priority: 2,
    section: 'performance',
    informational: false,
    what: 'JavaScript runtime errors occur when scripts fail to execute correctly. They can break page functionality, prevent content from rendering, and harm user experience.',
    why: 'JavaScript errors can break critical features and prevent search engine crawlers from properly rendering and indexing your content. They signal poor code quality and can hurt rankings.',
    how: 'Use browser developer tools (Console tab) to identify and fix errors. Set up error monitoring with tools like Sentry or Rollbar to catch errors in production. Test pages after deployments.',
    time: '2-4 hours',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    if (!page.jsErrors || !Array.isArray(page.jsErrors)) {
      const stub: SEOAuditCheck = {
        ...this.checkDefinition,
        maxScore: 0,
        informational: true,
        category: this.category,
        passed: null,
        score: 0,
        shortAnswer: 'JavaScript error data not available.',
        answer: 'JavaScript error monitoring data was not collected for this page.',
        recommendation: null,
        pageUrl: page.url,
      };
      return { check: stub, issues: [], passingChecks: [] };
    }

    const errorCount = page.jsErrors.length;
    const passed = errorCount === 0;

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score: passed ? this.checkDefinition.maxScore : errorCount >= 5 ? 0 : 1,
      shortAnswer: passed
        ? 'No JavaScript errors detected.'
        : `${errorCount} JavaScript error(s) detected.`,
      answer: passed
        ? 'Page loaded without JavaScript runtime errors, ensuring proper functionality and content rendering.'
        : `Found ${errorCount} JavaScript runtime error(s) that can break functionality and prevent proper rendering by search engines.`,
      recommendation: passed ? null : 'Fix JavaScript errors using browser developer tools. Set up error monitoring (Sentry, Rollbar) to catch production errors.',
      value: errorCount,
      data: {
        errorCount,
        errors: page.jsErrors.slice(0, 5).map(e => ({ message: e.message, source: e.source, line: e.line })),
      },
      pageUrl: page.url,
    };

    const issues: Issue[] = [];

    if (!passed) {
      const severity = errorCount >= 5 ? 'CRITICAL' : errorCount >= 3 ? 'HIGH' : 'MEDIUM';
      const impactScore = errorCount >= 5 ? 90 : errorCount >= 3 ? 75 : 60;

      const uniqueErrors = [...new Map(page.jsErrors.map(e => [e.message, e])).values()];
      const errorList = uniqueErrors.slice(0, 5)
        .map(e => `• ${e.message}${e.source ? ` (${e.source}:${e.line})` : ''}`)
        .join('\n');

      issues.push({
        category: this.category,
        type: this.code,
        title: `${errorCount} JavaScript Error${errorCount === 1 ? '' : 's'} Detected`,
        description: `${check.answer}\n\nErrors found:\n${errorList}${uniqueErrors.length > 5 ? `\n...and ${uniqueErrors.length - 5} more` : ''}`,
        severity: severity as 'CRITICAL' | 'HIGH' | 'MEDIUM',
        impactScore,
        pageUrl: page.url,
      });
    }

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: 'No JavaScript Errors Detected',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'Clean JavaScript execution prevents broken features and ensures proper rendering for search engines.',
    }] : [];

    return { check, issues, passingChecks };
  }
}
