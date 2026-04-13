/**
 * Engine for executing SEO analysis rules
 */

import type { PageData, SiteContext, RuleResult, Issue, PassingCheck } from './types';
import { RuleRegistry } from './RuleRegistry';

export class RuleEngine {
  constructor(private registry: RuleRegistry) {}

  /**
   * Run all page-level rules against a single page
   */
  runPageRules(page: PageData, context: SiteContext): RuleResult {
    const allIssues: Issue[] = [];
    const allPassingChecks: PassingCheck[] = [];

    const pageRules = this.registry.getPageRules();

    for (const rule of pageRules) {
      try {
        const result = rule.execute(page, context);
        allIssues.push(...result.issues);
        allPassingChecks.push(...result.passingChecks);
      } catch (error) {
        console.error(`Error executing page rule ${rule.code}:`, error);
        // Continue with other rules even if one fails
      }
    }

    return {
      issues: allIssues,
      passingChecks: allPassingChecks,
    };
  }

  /**
   * Run all page-level rules against all pages
   */
  runAllPageRules(pages: PageData[], context: SiteContext): RuleResult {
    const allIssues: Issue[] = [];
    const allPassingChecks: PassingCheck[] = [];

    for (const page of pages) {
      const result = this.runPageRules(page, context);
      allIssues.push(...result.issues);
      allPassingChecks.push(...result.passingChecks);
    }

    return {
      issues: allIssues,
      passingChecks: allPassingChecks,
    };
  }

  /**
   * Run all site-level rules
   */
  runSiteRules(pages: PageData[], context: SiteContext): RuleResult {
    const allIssues: Issue[] = [];
    const allPassingChecks: PassingCheck[] = [];

    const siteRules = this.registry.getSiteRules();

    for (const rule of siteRules) {
      try {
        const result = rule.execute(pages, context);
        allIssues.push(...result.issues);
        allPassingChecks.push(...result.passingChecks);
      } catch (error) {
        console.error(`Error executing site rule ${rule.code}:`, error);
        // Continue with other rules even if one fails
      }
    }

    return {
      issues: allIssues,
      passingChecks: allPassingChecks,
    };
  }

  /**
   * Run all rules (both page-level and site-level)
   */
  runAllRules(pages: PageData[], context: SiteContext): RuleResult {
    const pageResults = this.runAllPageRules(pages, context);
    const siteResults = this.runSiteRules(pages, context);

    return {
      issues: [...pageResults.issues, ...siteResults.issues],
      passingChecks: [...pageResults.passingChecks, ...siteResults.passingChecks],
    };
  }

  /**
   * Get execution statistics
   */
  getStats() {
    return this.registry.getStats();
  }
}
