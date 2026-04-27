import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class MinificationRule implements PageRule {
  code = 'MINIFICATION';
  category = 'PERFORMANCE' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'MINIFICATION',
    name: 'Minification',
    maxScore: 2,
    priority: 3,
    section: 'performance',
    informational: false,
    what: 'Minification removes unnecessary characters from code (whitespace, comments, formatting) without changing functionality, reducing CSS and JavaScript file sizes.',
    why: 'Minified files load faster, reducing page load time and improving Core Web Vitals. Minification typically reduces file sizes by 20-40%, which is an easy performance win.',
    how: 'Use build tools (Webpack, Vite, Rollup) that automatically minify during production builds. For WordPress, use caching plugins like WP Rocket or Autoptimize. For Shopify, enable asset minification in theme settings.',
    time: '1 hour',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    if (!page.minification || !page.resourceCounts) {
      const stub: SEOAuditCheck = {
        ...this.checkDefinition,
        maxScore: 0,
        informational: true,
        category: this.category,
        passed: null,
        score: 0,
        shortAnswer: 'Minification data not available.',
        answer: 'Minification analysis could not be collected for this page.',
        recommendation: null,
        pageUrl: page.url,
      };
      return { check: stub, issues: [], passingChecks: [] };
    }

    const { unminifiedScripts, unminifiedStyles } = page.minification;
    const { scripts, stylesheets } = page.resourceCounts;
    const problems: string[] = [];

    if (unminifiedScripts > 0 && scripts > 0) {
      const pct = Math.round((unminifiedScripts / scripts) * 100);
      problems.push(`${unminifiedScripts} JavaScript file(s) (${pct}% unminified)`);
    }
    if (unminifiedStyles > 0 && stylesheets > 0) {
      const pct = Math.round((unminifiedStyles / stylesheets) * 100);
      problems.push(`${unminifiedStyles} CSS file(s) (${pct}% unminified)`);
    }

    const passed = problems.length === 0;
    const isSevere = unminifiedScripts > 5 || unminifiedStyles > 3;

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score: passed ? this.checkDefinition.maxScore : 0,
      shortAnswer: passed
        ? 'All CSS and JavaScript files are minified.'
        : `Unminified resources found: ${problems.join(', ')}.`,
      answer: passed
        ? 'All CSS and JavaScript files appear to be minified — reducing file sizes and improving load time.'
        : `Found unminified resources: ${problems.join(', ')}. Minification reduces file size by 20-40%.`,
      recommendation: passed ? null : 'Use build tools like Webpack or Vite to minify CSS and JavaScript files before deployment. For WordPress, use WP Rocket or Autoptimize.',
      data: { unminifiedScripts, unminifiedStyles, scripts, stylesheets },
      pageUrl: page.url,
    };

    const severity = isSevere ? 'HIGH' as const : 'MEDIUM' as const;

    const issues = !passed ? [{
      category: this.category,
      type: this.code,
      title: 'Unminified CSS/JavaScript Files',
      description: check.answer,
      severity,
      impactScore: isSevere ? 18 : 10,
      pageUrl: page.url,
    }] : [];

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: 'CSS/JavaScript Files Minified',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'Minification reduces file sizes by 20-40%, improving load times and reducing bandwidth usage.',
    }] : [];

    return { check, issues, passingChecks };
  }
}
