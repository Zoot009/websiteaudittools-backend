/**
 * Core types and interfaces for the SEO Analyzer system
 */

// Define enums locally (will map to Prisma enums when saving)
export type IssueCategory =
  | 'TECHNICAL'
  | 'ON_PAGE'
  | 'PERFORMANCE'
  | 'ACCESSIBILITY'
  | 'LINKS'
  | 'STRUCTURED_DATA'
  | 'SECURITY';

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Seoptimer-style report sections (UI grouping, separate from scoring categories)
 */
export type AuditSection = 'seo' | 'performance' | 'ui' | 'links' | 'technology' | 'geo' | 'social';

/**
 * Letter grade assigned based on score (A+ to F)
 */
export type ScoreGrade = 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';

/**
 * Performance tier for easier understanding
 */
export type ScoreTier = 'Excellent' | 'Good' | 'Fair' | 'Poor';

/**
 * Static metadata every rule must define.
 * These values never change regardless of the page being evaluated.
 */
export interface CheckDefinition {
  /** Unique check identifier, matches rule code */
  id: string;
  /** Human-readable display name */
  name: string;
  /** Maximum achievable score for this check (0 = informational) */
  maxScore: number;
  /** 1 = Critical, 2 = Medium, 3 = Low importance */
  priority: 1 | 2 | 3;
  /** UI section this check belongs to */
  section: AuditSection;
  /** If true, check is display-only and never affects the score */
  informational: boolean;
  /** Educational: what this check evaluates */
  what: string;
  /** Educational: why this matters for SEO */
  why: string;
  /** Educational: how to implement / fix */
  how: string;
  /** Estimated fix time, e.g. "15 minutes", "2 hours" */
  time?: string;
  /** Extra context appended to the recommendation */
  append?: string;
}

/**
 * Canonical scored check — the single source of truth for scoring.
 * Extends CheckDefinition with the dynamic result fields.
 */
export interface SEOAuditCheck extends CheckDefinition {
  /** Scoring category this check belongs to */
  category: IssueCategory;
  /** true = passed, false = failed, null = informational */
  passed: boolean | null;
  /** Achieved score (0 ≤ score ≤ maxScore) */
  score: number;
  /** Short one-line result summary */
  shortAnswer: string;
  /** Full result message (may include extracted data details) */
  answer: string;
  /** Actionable recommendation when failed, null when passed */
  recommendation: string | null;
  /** Raw scalar value for display (e.g. title length, word count) */
  value?: string | number | null;
  /** Structured data payload for rich UI display */
  data?: any;
  /** Page URL where this check was evaluated */
  pageUrl?: string;
}

/**
 * Result returned by every rule execution.
 * `check`      — the canonical scored/informational check for the scoring engine.
 * `issues`     — per-page problem records for DB storage and issue lists.
 * `passingChecks` — what passed, for the "passing checks" display.
 */
export interface RuleResult {
  check: SEOAuditCheck;
  issues: Issue[];
  passingChecks: PassingCheck[];
}

/**
 * Aggregated output from the RuleEngine across all rules and pages.
 */
export interface EngineResult {
  checks: SEOAuditCheck[];
  issues: Issue[];
  passingChecks: PassingCheck[];
}

/**
 * Page data structure from crawler
 */
export interface PageData {
  // Basic info
  url: string;
  title: string | null;
  description: string | null;
  statusCode: number;
  loadTime: number;

  // Content extraction
  html: string;
  headings: Array<{
    level: number;
    text: string;
  }>;
  images: Array<{
    src: string;
    alt: string | null;
  }>;
  links: Array<{
    href: string;
    text: string;
    isInternal: boolean;
  }>;
  wordCount: number;

  // Performance (Core Web Vitals)
  lcp: number | null;
  cls: number | null;
  fid: number | null;

  // Meta tags
  canonical: string | null;
  robots: string | null;
  ogImage: string | null;
  hasSchemaOrg: boolean;

  // Internationalization
  langAttr?: string | null;
  hreflangLinks?: Array<{
    hreflang: string;
    href: string;
  }>;
  charset?: string | null;

  // Usability metrics
  flashCount?: number;
  iframeCount?: number;
  exposedEmails?: string[];

  // Code quality
  isAMP?: boolean;
  deprecatedTagsCount?: number;
  inlineStylesCount?: number;

  // Social detection
  socialLinks?: {
    facebook: boolean;
    twitter: boolean;
    instagram: boolean;
    linkedin: boolean;
    youtube: boolean;
  };
  hasFacebookPixel?: boolean;

  // Social Media - Phase 2
  ogTags?: {
    title?: string;
    description?: string;
    image?: string;
    type?: string;
    url?: string;
    siteName?: string;
  };
  twitterTags?: {
    card?: string;
    site?: string;
    title?: string;
    description?: string;
    image?: string;
  };

  // Usability - Phase 2
  viewport?: {
    hasViewport: boolean;
    content: string | null;
  };
  favicon?: {
    hasFavicon: boolean;
    url: string | null;
  };
  smallFontCount?: number;
  smallTapTargetCount?: number;

  // Performance - Phase 2
  pageSizes?: {
    html: number;
    css: number;
    js: number;
    images: number;
    total: number;
  };
  resourceCounts?: {
    scripts: number;
    stylesheets: number;
    images: number;
    fonts: number;
  };
  jsErrors?: Array<{ message: string; source: string; line: number }>;
  imageOptimization?: {
    unoptimized: number;
    modernFormats: number;
  };
  minification?: {
    unminifiedScripts: number;
    unminifiedStyles: number;
  };
  renderMetrics?: {
    initialSize: number;
    renderedSize: number;
    percentage: number;
  };

  // HTTP Level - Phase 2
  compression?: 'gzip' | 'br' | 'deflate' | 'none';
  protocol?: string;
  isHTTP2?: boolean;

  // Google PageSpeed Insights
  pageSpeed?: {
    mobile?: any;
    desktop?: any;
    error?: string;
  };

  // HTTP Headers
  httpHeaders?: Record<string, string>;

  // Structured Data (JSON-LD schemas)
  schemas?: Array<{
    type: string;
    data: any;
  }>;

  // Local SEO
  localSeo?: {
    phone: {
      found: boolean;
      number: string | null;
      source: string | null;
    };
    address: {
      found: boolean;
      text: string | null;
      source: string | null;
    };
  };
}

/**
 * Site-level context built from analyzing all pages
 */
export interface SiteContext {
  baseUrl: string;
  totalPages: number;

  // Cross-page analysis
  titleMap: Map<string, string[]>;
  descriptionMap: Map<string, string[]>;
  canonicalMap: Map<string, string[]>;

  // Link graph
  internalLinkGraph: Map<string, Set<string>>;
  inboundLinkCount: Map<string, number>;

  // Site-level data
  hasRobotsTxt: boolean;
  robotsTxt?: string;
  robotsDisallowed: Set<string>;
  hasSitemap: boolean;
  sitemapUrls?: Set<string>;
}

/**
 * Platform-specific implementation guides
 */
export interface PlatformGuides {
  wordpress?: string;
  shopify?: string;
  wix?: string;
}

/**
 * Educational content for checks/issues
 */
export interface RecommendationContent {
  what: string;
  why: string;
  how: string;
  timeEstimate?: string;
  moreInfoUrl?: string;
  bestPracticesUrl?: string;
  platformGuides?: PlatformGuides;
}

/**
 * SEO issue found during analysis (for DB storage and issue display)
 */
export interface Issue {
  category: IssueCategory;
  type: string;
  title: string;
  description: string;
  severity: Severity;
  impactScore: number;
  pageUrl?: string;
  elementSelector?: string;
  lineNumber?: number;
  recommendation?: string;
  recommendationContent?: RecommendationContent;
  data?: any;
}

/**
 * Check that passed (for passing checks display)
 */
export interface PassingCheck {
  category: IssueCategory;
  code: string;
  title: string;
  description: string;
  pageUrl?: string;
  goodPractice: string;
  recommendationContent?: RecommendationContent;
  data?: any;
}

/**
 * Score for a Seoptimer-style section
 */
export interface SectionScore {
  section: AuditSection;
  score: number;
  checks: number;
}

/**
 * Per-level heading frequency for a single page
 */
export interface HeadingFrequency {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  tag: string;
  count: number;
  values: string[];
}

/**
 * Heading summary for a single page
 */
export interface PageHeadingSummary {
  pageUrl: string;
  frequency: HeadingFrequency[];
}

/**
 * A single keyword or phrase and where it appears on the page
 */
export interface KeywordEntry {
  keyword: string;
  inTitle: boolean;
  inMetaDescription: boolean;
  inHeadingTags: boolean;
  pageFrequency: number;
}

/**
 * Keyword consistency summary for a single page
 */
export interface PageKeywordConsistency {
  pageUrl: string;
  passed: boolean;
  message: string;
  keywords: KeywordEntry[];
  phrases: KeywordEntry[];
}

/**
 * Enhanced category score with grade and tier
 */
export interface CategoryScore {
  category: string;
  score: number;
  grade: ScoreGrade;
  tier: ScoreTier;
  issueCount: number;
  passingCount: number;
  bonus: number;
}

/**
 * Score summary with insights and breakdown
 */
export interface ScoreSummary {
  overall: {
    score: number;
    grade: ScoreGrade;
    tier: ScoreTier;
  };
  categories: Array<{
    category: string;
    score: number;
    grade: ScoreGrade;
    tier: ScoreTier;
    weight: number;
    contribution: number;
  }>;
  statistics: {
    totalIssues: number;
    totalPassing: number;
    penaltyPoints: number;
    bonusPoints: number;
    pagesAnalyzed: number;
  };
  insights: {
    overall: string;
    categories: Array<{
      category: string;
      insight: string;
    }>;
    recommendations?: string[];
  };
}

/**
 * Complete analysis result
 */
export interface AnalysisResult {
  overallScore: number;
  overallGrade: ScoreGrade;
  overallTier: ScoreTier;
  totalIssues: number;
  categoryScores: CategoryScore[];
  sectionScores: SectionScore[];
  scoreSummary: ScoreSummary;
  checks: SEOAuditCheck[];
  issues: Issue[];
  passingChecks: PassingCheck[];
  pageHeadings: PageHeadingSummary[];
  keywordConsistency: PageKeywordConsistency[];
}

/**
 * Base interface for all SEO rules.
 * Every rule must define `checkDefinition` (static metadata) and
 * return a `RuleResult` that includes the canonical `check`.
 */
export interface Rule {
  code: string;
  category: IssueCategory;
  level: 'page' | 'site';
  /** Static metadata — maxScore, priority, section, educational content */
  checkDefinition: CheckDefinition;
  execute(input: PageData | PageData[], context: SiteContext): RuleResult;
}

/**
 * Page-level rule — runs once per page
 */
export interface PageRule extends Rule {
  level: 'page';
  execute(page: PageData, context: SiteContext): RuleResult;
}

/**
 * Site-level rule — runs once across all pages
 */
export interface SiteRule extends Rule {
  level: 'site';
  execute(pages: PageData[], context: SiteContext): RuleResult;
}

/**
 * Category weights for overall score calculation
 */
export interface CategoryWeights {
  TECHNICAL: number;
  ON_PAGE: number;
  PERFORMANCE: number;
  ACCESSIBILITY: number;
  LINKS: number;
  STRUCTURED_DATA: number;
  SECURITY: number;
}

/**
 * Default category weights (must sum to 1.0)
 */
export const DEFAULT_CATEGORY_WEIGHTS: CategoryWeights = {
  TECHNICAL: 0.20,
  ON_PAGE: 0.30,
  PERFORMANCE: 0.20,
  ACCESSIBILITY: 0.05,
  LINKS: 0.10,
  STRUCTURED_DATA: 0.05,
  SECURITY: 0.10,
};

/**
 * Severity multipliers for impact calculation
 */
export const SEVERITY_MULTIPLIERS = {
  CRITICAL: 4.0,
  HIGH: 2.0,
  MEDIUM: 1.0,
  LOW: 0.5,
} as const;
