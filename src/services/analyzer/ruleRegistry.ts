import type { AuditRule } from './types';

// Import all rules
import {
  pageNon200StatusRule,
  pageRedirectsRule,
  pageNoindexRule,
  canonicalPointsElsewhereRule,
  canonicalMissingRule,
} from './rules/crawlability';

import {
  titleMissingRule,
  titleTooShortRule,
  titleTooLongRule,
  titleDuplicateRule,
} from './rules/titles';

import {
  metaDescriptionMissingRule,
  metaDescriptionTooShortRule,
  metaDescriptionTooLongRule,
  metaDescriptionDuplicateRule,
} from './rules/meta-descriptions';

import {
  h1MissingRule,
  h1MultipleRule,
  h1EmptyOrGenericRule,
} from './rules/headings';

import { thinContentRule } from './rules/content';
import { seOptimizerEnhancementRules } from './rules/content/seoptimer-enhancements';
import { brokenInternalLinksRule } from './rules/links';
import { missingAltTextRule } from './rules/images';
import { technicalRules } from './rules/technical';
import { technicalEnhancementRules } from './rules/technical/seoptimer-enhancements';
import { structuredDataRules } from './rules/structured-data';
import { noHttpsRule } from './rules/security';
import { localSeoRules } from './rules/local-seo';
import { onPageRules } from './rules/on-page';

/**
 * Registry of all audit rules
 * Rules are organized by priority and category
 */
export class RuleRegistry {
  private rules: AuditRule[] = [];
  
  constructor() {
    this.registerDefaultRules();
  }
  
  /**
   * Register the 20 core audit rules
   */
  private registerDefaultRules(): void {
    // Group 1: Crawlability & Indexability (CRITICAL)
    this.rules.push(pageNon200StatusRule);
    this.rules.push(pageRedirectsRule);
    this.rules.push(pageNoindexRule);
    this.rules.push(canonicalPointsElsewhereRule);
    this.rules.push(canonicalMissingRule);
    
    // Group 2: Title Tags (HIGH PRIORITY)
    this.rules.push(titleMissingRule);
    this.rules.push(titleTooShortRule);
    this.rules.push(titleTooLongRule);
    this.rules.push(titleDuplicateRule);
    
    // Group 3: Meta Descriptions (MEDIUM PRIORITY)
    this.rules.push(metaDescriptionMissingRule);
    this.rules.push(metaDescriptionTooShortRule);
    this.rules.push(metaDescriptionTooLongRule);
    this.rules.push(metaDescriptionDuplicateRule);
    
    // Group 4: Headings (MEDIUM-HIGH PRIORITY)
    this.rules.push(h1MissingRule);
    this.rules.push(h1MultipleRule);
    this.rules.push(h1EmptyOrGenericRule);
    
    // Group 5: Content Quality (MEDIUM PRIORITY)
    this.rules.push(thinContentRule);
    
    // Group 6: Internal Linking (HIGH PRIORITY)
    this.rules.push(brokenInternalLinksRule);
    
    // Group 7: Images (MEDIUM PRIORITY)
    this.rules.push(missingAltTextRule);
    
    // Group 8: Technical & Mobile (HIGH PRIORITY)
    technicalRules.forEach(rule => this.rules.push(rule));
    
    // Group 9: Structured Data (MEDIUM PRIORITY)
    structuredDataRules.forEach(rule => this.rules.push(rule));
    
    // Group 10: Security (CRITICAL)
    this.rules.push(noHttpsRule);
    
    // Group 11: Local SEO (MEDIUM PRIORITY)
    localSeoRules.forEach(rule => this.rules.push(rule));
    
    // Group 12: On-Page (LOW PRIORITY)
    onPageRules.forEach(rule => this.rules.push(rule));
    
    // Group 13: SEOptimizer-Style Enhancements (INFO & ANALYSIS)
    seOptimizerEnhancementRules.forEach(rule => this.rules.push(rule));
    technicalEnhancementRules.forEach(rule => this.rules.push(rule));
  }
  
  /**
   * Get all registered rules
   */
  getAllRules(): AuditRule[] {
    return this.rules;
  }
  
  /**
   * Get rules by category
   */
  getRulesByCategory(category: string): AuditRule[] {
    return this.rules.filter(rule => rule.category === category);
  }
  
  /**
   * Get rules by severity
   */
  getRulesBySeverity(severity: string): AuditRule[] {
    return this.rules.filter(rule => rule.severity === severity);
  }
  
  /**
   * Get a specific rule by code
   */
  getRuleByCode(code: string): AuditRule | undefined {
    return this.rules.find(rule => rule.code === code);
  }
  
  /**
   * Add a custom rule
   */
  addRule(rule: AuditRule): void {
    this.rules.push(rule);
  }
  
  /**
   * Remove a rule by code
   */
  removeRule(code: string): void {
    this.rules = this.rules.filter(rule => rule.code !== code);
  }
}

/**
 * Singleton instance
 */
export const ruleRegistry = new RuleRegistry();
