/**
 * Registry for managing SEO analysis rules
 */

import type { IssueCategory } from './types';
import type { Rule, PageRule, SiteRule } from './types';

export class RuleRegistry {
  private rules: Map<string, Rule> = new Map();
  private pageRules: PageRule[] = [];
  private siteRules: SiteRule[] = [];
  private rulesByCategory: Map<IssueCategory, Rule[]> = new Map();

  /**
   * Register a new rule
   */
  register(rule: Rule): void {
    // Check for duplicate rule codes
    if (this.rules.has(rule.code)) {
      throw new Error(`Rule with code "${rule.code}" is already registered`);
    }

    // Store in main registry
    this.rules.set(rule.code, rule);

    // Store by level
    if (rule.level === 'page') {
      this.pageRules.push(rule as PageRule);
    } else if (rule.level === 'site') {
      this.siteRules.push(rule as SiteRule);
    }

    // Store by category
    if (!this.rulesByCategory.has(rule.category)) {
      this.rulesByCategory.set(rule.category, []);
    }
    this.rulesByCategory.get(rule.category)!.push(rule);
  }

  /**
   * Register multiple rules at once
   */
  registerMany(rules: Rule[]): void {
    for (const rule of rules) {
      this.register(rule);
    }
  }

  /**
   * Get a specific rule by code
   */
  getRule(code: string): Rule | undefined {
    return this.rules.get(code);
  }

  /**
   * Get all registered rules
   */
  getAllRules(): Rule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get all page-level rules
   */
  getPageRules(): PageRule[] {
    return this.pageRules;
  }

  /**
   * Get all site-level rules
   */
  getSiteRules(): SiteRule[] {
    return this.siteRules;
  }

  /**
   * Get rules for a specific category
   */
  getRulesByCategory(category: IssueCategory): Rule[] {
    return this.rulesByCategory.get(category) || [];
  }

  /**
   * Get count of registered rules
   */
  getRuleCount(): number {
    return this.rules.size;
  }

  /**
   * Get statistics about registered rules
   */
  getStats(): {
    total: number;
    pageRules: number;
    siteRules: number;
    byCategory: Record<string, number>;
  } {
    const byCategory: Record<string, number> = {};
    for (const [category, rules] of this.rulesByCategory.entries()) {
      byCategory[category] = rules.length;
    }

    return {
      total: this.rules.size,
      pageRules: this.pageRules.length,
      siteRules: this.siteRules.length,
      byCategory,
    };
  }

  /**
   * Clear all registered rules (useful for testing)
   */
  clear(): void {
    this.rules.clear();
    this.pageRules = [];
    this.siteRules = [];
    this.rulesByCategory.clear();
  }
}
