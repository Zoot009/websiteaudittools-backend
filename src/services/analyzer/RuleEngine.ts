/**
 * Engine for executing SEO analysis rules
 */

import type { PageData, SiteContext, RuleResult, EngineResult, SEOAuditCheck, Issue, PassingCheck } from './types';
import { RuleRegistry } from './RuleRegistry';

export class RuleEngine {
  constructor(private registry: RuleRegistry) {}

  /**
   * Run all page-level rules against a single page
   */
  runPageRules(page: PageData, context: SiteContext): EngineResult {
    const checks: SEOAuditCheck[] = [];
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    for (const rule of this.registry.getPageRules()) {
      try {
        const result: RuleResult = rule.execute(page, context);
        checks.push(result.check);
        issues.push(...result.issues);
        passingChecks.push(...result.passingChecks);
      } catch (error) {
        console.error(`Error executing page rule ${rule.code}:`, error);
      }
    }

    return { checks, issues, passingChecks };
  }

  /**
   * Run all page-level rules across all pages
   */
  runAllPageRules(pages: PageData[], context: SiteContext): EngineResult {
    const checks: SEOAuditCheck[] = [];
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    for (const page of pages) {
      const result = this.runPageRules(page, context);
      checks.push(...result.checks);
      issues.push(...result.issues);
      passingChecks.push(...result.passingChecks);
    }

    return { checks, issues, passingChecks };
  }

  /**
   * Run all site-level rules
   */
  runSiteRules(pages: PageData[], context: SiteContext): EngineResult {
    const checks: SEOAuditCheck[] = [];
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    for (const rule of this.registry.getSiteRules()) {
      try {
        const result: RuleResult = rule.execute(pages, context);
        checks.push(result.check);
        issues.push(...result.issues);
        passingChecks.push(...result.passingChecks);
      } catch (error) {
        console.error(`Error executing site rule ${rule.code}:`, error);
      }
    }

    return { checks, issues, passingChecks };
  }

  /**
   * Run all rules (page-level and site-level)
   */
  runAllRules(pages: PageData[], context: SiteContext): EngineResult {
    const pageResults = this.runAllPageRules(pages, context);
    const siteResults = this.runSiteRules(pages, context);

    return {
      checks: [...pageResults.checks, ...siteResults.checks],
      issues: [...pageResults.issues, ...siteResults.issues],
      passingChecks: [...pageResults.passingChecks, ...siteResults.passingChecks],
    };
  }

  getStats() {
    return this.registry.getStats();
  }
}
