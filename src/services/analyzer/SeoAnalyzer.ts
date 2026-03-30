import type { PageData } from '../crawler/SiteAuditCrawler';
import { ruleEngine } from './ruleEngine';

// Re-export types from types.ts for backward compatibility
export type { 
  SeoIssue, 
  SeoIssueWithFix,
  FixRecommendation,
  CategoryScore, 
  AnalysisResult,
  AuditRule,
  RuleContext,
  SiteContext,
} from './types';

/**
 * SEO Analyzer - Main entry point for analysis
 * Now powered by the modular rule engine
 */
export class SeoAnalyzer {
  /**
   * Analyze all pages and generate comprehensive report using the rule engine
   */
  async analyze(pages: PageData[], baseUrl: string): Promise<import('./types').AnalysisResult> {
    console.log(`🔍 SEO Analyzer: Starting analysis for ${pages.length} pages...`);
    
    // Use the rule engine to perform analysis
    const result = await ruleEngine.runAnalysis(pages, baseUrl);
    
    console.log(`✅ SEO Analyzer: Analysis complete`);
    console.log(`   - Overall Score: ${result.overallScore}/100`);
    console.log(`   - Total Issues: ${result.totalIssues}`);
    console.log(`   - Critical Issues: ${result.criticalIssues}`);
    
    return result;
  }
}
