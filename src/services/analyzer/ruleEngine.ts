import type { PageData } from '../crawler/SiteAuditCrawler';
import type { SeoIssue, RuleContext, SiteContext, AnalysisResult, CategoryScore, SeoIssueWithFix } from './types';
import { ruleRegistry } from './ruleRegistry';
import { buildSiteContext } from './siteContextBuilder';
import type { IssueCategory } from '../../generated/prisma/enums';

/**
 * Rule Engine - Runs all registered rules and generates analysis results
 */
export class RuleEngine {
  /**
   * Run all rules against the provided pages
   */
  async runAnalysis(pages: PageData[], baseUrl: string): Promise<AnalysisResult> {
    console.log(`🔍 Rule Engine: Analyzing ${pages.length} pages with ${ruleRegistry.getAllRules().length} rules...`);
    
    // Build site context for cross-page analysis
    const siteContext = await buildSiteContext(pages, baseUrl);
    
    // Collect all issues
    const allIssues: SeoIssue[] = [];
    const issuesWithFixes: SeoIssueWithFix[] = [];
    
    // Run rules for each page
    for (const page of pages) {
      const pageIssues = this.runRulesForPage(page, siteContext);
      allIssues.push(...pageIssues);
      
      // Generate recommendations for each issue
      for (const issue of pageIssues) {
        const rule = ruleRegistry.getRuleByCode(issue.type.toUpperCase().replace(/-/g, '_'));
        
        if (rule?.getRecommendation) {
          const context: RuleContext = { page, siteContext };
          const recommendation = rule.getRecommendation(issue, context);
          
          issuesWithFixes.push({
            ...issue,
            recommendation,
          });
        } else {
          // No recommendation available
          issuesWithFixes.push({
            ...issue,
            recommendation: {
              title: 'Fix this issue',
              whyItMatters: issue.description,
              howToFix: ['Review the issue and apply appropriate fixes.'],
              estimatedEffort: 'medium',
              priority: 5,
            },
          });
        }
      }
    }
    
    console.log(`✅ Rule Engine: Found ${allIssues.length} issues`);
    
    // Calculate scores
    const categoryScores = this.calculateCategoryScores(allIssues);
    const overallScore = this.calculateOverallScore(categoryScores);
    const criticalIssues = allIssues.filter(i => i.severity === 'CRITICAL').length;
    
    return {
      overallScore,
      categoryScores,
      issues: allIssues,
      issuesWithFixes,
      totalIssues: allIssues.length,
      criticalIssues,
    };
  }
  
  /**
   * Run all rules for a single page
   */
  private runRulesForPage(page: PageData, siteContext: SiteContext): SeoIssue[] {
    const issues: SeoIssue[] = [];
    const rules = ruleRegistry.getAllRules();
    const context: RuleContext = { page, siteContext };
    
    for (const rule of rules) {
      try {
        const ruleIssues = rule.run(context);
        issues.push(...ruleIssues);
      } catch (error) {
        console.error(`Error running rule ${rule.code}:`, error);
        // Continue with other rules
      }
    }
    
    return issues;
  }
  
  /**
   * Calculate score for each category
   */
  private calculateCategoryScores(issues: SeoIssue[]): CategoryScore[] {
    const categories: IssueCategory[] = [
      'TECHNICAL',
      'ON_PAGE',
      'PERFORMANCE',
      'ACCESSIBILITY',
      'LINKS',
      'STRUCTURED_DATA',
      'SECURITY',
    ];
    
    return categories.map(category => {
      const categoryIssues = issues.filter(i => i.category === category);
      const criticalIssues = categoryIssues.filter(i => i.severity === 'CRITICAL').length;
      
      // Calculate score based on issue impact
      let totalImpact = 0;
      for (const issue of categoryIssues) {
        totalImpact += issue.impactScore;
      }
      
      // Score = 100 - (average impact of issues)
      // This gives a score that decreases as issues are found
      const avgImpact = categoryIssues.length > 0 ? totalImpact / categoryIssues.length : 0;
      const score = Math.max(0, 100 - avgImpact);
      
      return {
        category,
        score: Math.round(score),
        issuesFound: categoryIssues.length,
        criticalIssues,
      };
    });
  }
  
  /**
   * Calculate overall score (weighted average of categories)
   */
  private calculateOverallScore(categoryScores: CategoryScore[]): number {
    // Category weights (total = 100)
    const weights: Record<string, number> = {
      TECHNICAL: 20,
      ON_PAGE: 25,
      PERFORMANCE: 20,
      ACCESSIBILITY: 15,
      LINKS: 10,
      STRUCTURED_DATA: 5,
      SECURITY: 5,
    };
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (const categoryScore of categoryScores) {
      const weight = weights[categoryScore.category] || 0;
      weightedSum += categoryScore.score * weight;
      totalWeight += weight;
    }
    
    const overallScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
    return Math.round(overallScore);
  }
}

/**
 * Singleton instance
 */
export const ruleEngine = new RuleEngine();
