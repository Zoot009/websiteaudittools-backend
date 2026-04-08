import type { PageData } from '../crawler/SiteAuditCrawler';
import type { SeoIssue, RuleContext, SiteContext, AnalysisResult, CategoryScore, SeoIssueWithFix, PassingCheck } from './types';
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
    
    // Collect all issues and passing checks
    const allIssues: SeoIssue[] = [];
    const issuesWithFixes: SeoIssueWithFix[] = [];
    const passingChecks: PassingCheck[] = [];
    
    // Track which rules passed (no issues) for each page
    const ruleResultsMap = new Map<string, Set<string>>(); // pageUrl -> Set of rule codes that found issues
    
    // Run rules for each page
    for (const page of pages) {
      const context: RuleContext = { page, siteContext };
      const pageIssues: SeoIssue[] = [];
      const issueRuleCodes = new Set<string>();
      
      // Run all rules for this page
      const rules = ruleRegistry.getAllRules();
      for (const rule of rules) {
        try {
          const ruleIssues = rule.run(context);
          
          if (ruleIssues.length > 0) {
            // Rule found issues
            pageIssues.push(...ruleIssues);
            issueRuleCodes.add(rule.code);
          } else {
            // Rule passed - no issues found! ✨
            const passingMessage = rule.getPassingMessage?.(context) || 
              `${rule.name} check passed`;
            
            passingChecks.push({
              category: rule.category,
              code: rule.code,
              title: rule.name,
              description: passingMessage,
              pageUrl: page.url,
              goodPractice: this.getGoodPracticeMessage(rule.code, rule.name),
            });
          }
        } catch (error) {
          console.error(`Error running rule ${rule.code}:`, error);
          // Continue with other rules
        }
      }
      
      ruleResultsMap.set(page.url, issueRuleCodes);
      allIssues.push(...pageIssues);
      
      // Generate recommendations for each issue
      for (const issue of pageIssues) {
        const rule = ruleRegistry.getRuleByCode(issue.type.toUpperCase().replace(/-/g, '_'));
        
        if (rule?.getRecommendation) {
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
    console.log(`✨ Rule Engine: Found ${passingChecks.length} passing checks`);
    
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
      passingChecks,
      totalPasses: passingChecks.length,
    };
  }
  
  /**
   * Get a positive message explaining why passing this check is good
   */
  private getGoodPracticeMessage(ruleCode: string, ruleName: string): string {
    // Map of rule codes to good practice explanations
    const goodPractices: Record<string, string> = {
      'TITLE_MISSING': 'Page has a proper title tag that helps search engines and users understand the content.',
      'TITLE_TOO_SHORT': 'Title length is appropriate for search engine display.',
      'TITLE_TOO_LONG': 'Title length is optimized to avoid truncation in search results.',
      'META_DESCRIPTION_MISSING': 'Page has a meta description to improve search result appearance.',
      'META_DESCRIPTION_TOO_SHORT': 'Meta description provides adequate detail.',
      'META_DESCRIPTION_TOO_LONG': 'Meta description length is optimized for search results.',
      'H1_MISSING': 'Page has a proper H1 heading for structure and SEO.',
      'H1_MULTIPLE': 'Page uses a single H1 heading following best practices.',
      'MISSING_VIEWPORT': 'Viewport meta tag is properly configured for mobile devices.',
      'NO_HTTPS': 'Site is using HTTPS for security and SEO benefits.',
      'NO_STRUCTURED_DATA': 'Page includes structured data for enhanced search results.',
      'MISSING_ALT_TEXT': 'All images have descriptive alt text for accessibility.',
      'PAGE_NON_200_STATUS': 'Page returns a successful 200 status code.',
      'PAGE_REDIRECTS': 'No unnecessary redirects impacting performance.',
      'THIN_CONTENT': 'Page has substantial, valuable content.',
      'SLOW_LOAD_TIME': 'Page loads quickly providing good user experience.',
      'MISSING_OPEN_GRAPH': 'Open Graph tags are present for social media sharing.',
      'MISSING_TWITTER_CARDS': 'Twitter Card tags optimize social sharing.',
    };
    
    return goodPractices[ruleCode] || 
      `Following best practices for ${ruleName.toLowerCase()}.`;
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
