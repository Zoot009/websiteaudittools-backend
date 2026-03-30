import type { PageData } from '../crawler/SiteAuditCrawler';
import type { IssueCategory, Severity } from '../../generated/prisma/enums';

/**
 * Core issue interface - what gets stored in the database
 */
export interface SeoIssue {
  category: IssueCategory;
  type: string;
  title: string;
  description: string;
  severity: Severity;
  impactScore: number; // 0-100
  pageUrl?: string;
  elementSelector?: string;
  lineNumber?: number;
}

/**
 * Recommendation for fixing an issue
 */
export interface FixRecommendation {
  title: string;
  whyItMatters: string;
  howToFix: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
  priority: number; // 1-10, where 10 is highest
}

/**
 * Enhanced issue with fix recommendations
 */
export interface SeoIssueWithFix extends SeoIssue {
  recommendation: FixRecommendation;
}

/**
 * Site-wide context for cross-page analysis
 */
export interface SiteContext {
  baseUrl: string;
  allPages: PageData[];
  
  // Aggregate data for duplicate detection
  titleMap: Map<string, string[]>; // title -> urls
  descriptionMap: Map<string, string[]>; // description -> urls
  canonicalMap: Map<string, string[]>; // canonical -> urls
  
  // Sitemap and robots data (if available)
  sitemapUrls?: Set<string>;
  hasRobotsTxt?: boolean;
  robotsTxt?: string;
  robotsDisallowed?: Set<string>;
  
  // Internal link graph
  internalLinkGraph?: Map<string, Set<string>>; // url -> outbound links
  inboundLinkCount?: Map<string, number>; // url -> inbound count
}

/**
 * Rule execution context
 */
export interface RuleContext {
  page: PageData;
  siteContext: SiteContext;
}

/**
 * Rule definition - the core building block
 */
export interface AuditRule {
  // Metadata
  code: string; // e.g., "TITLE_MISSING"
  name: string; // Human-readable name
  category: IssueCategory;
  severity: Severity;
  
  // Rule behavior
  run: (context: RuleContext) => SeoIssue[];
  
  // Optional: recommendation generator
  getRecommendation?: (issue: SeoIssue, context: RuleContext) => FixRecommendation;
}

/**
 * Category score
 */
export interface CategoryScore {
  category: string;
  score: number; // 0-100
  issuesFound: number;
  criticalIssues: number;
}

/**
 * Complete analysis result
 */
export interface AnalysisResult {
  overallScore: number;
  categoryScores: CategoryScore[];
  issues: SeoIssue[];
  issuesWithFixes?: SeoIssueWithFix[];
  totalIssues: number;
  criticalIssues: number;
}
