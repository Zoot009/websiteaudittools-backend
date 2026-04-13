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
  titleMap: Map<string, string[]>; // title → URLs with that title
  descriptionMap: Map<string, string[]>; // description → URLs
  canonicalMap: Map<string, string[]>; // canonical → URLs

  // Link graph
  internalLinkGraph: Map<string, Set<string>>; // page → pages it links to
  inboundLinkCount: Map<string, number>; // page → count of inbound links

  // Site-level data
  hasRobotsTxt: boolean;
  robotsTxt?: string;
  robotsDisallowed: Set<string>; // URLs blocked by robots.txt
  hasSitemap: boolean;
  sitemapUrls?: Set<string>;
}

/**
 * SEO issue found during analysis
 */
export interface Issue {
  category: IssueCategory;
  type: string; // Unique code like "MISSING_META_DESCRIPTION"
  title: string; // Human-readable title
  description: string; // Detailed explanation
  severity: Severity; // CRITICAL | HIGH | MEDIUM | LOW
  impactScore: number; // 0-100, how much it affects SEO
  pageUrl?: string; // Which page has this issue
  elementSelector?: string; // CSS selector for the element
  lineNumber?: number; // Line number in HTML (optional)
}

/**
 * Check that passed (what's working well)
 */
export interface PassingCheck {
  category: IssueCategory;
  code: string; // Rule code that passed
  title: string; // Human-readable title
  description: string; // What passed
  pageUrl?: string; // Which page passed
  goodPractice: string; // Why this is good
}

/**
 * Result of running a single rule
 */
export interface RuleResult {
  issues: Issue[];
  passingChecks: PassingCheck[];
}

/**
 * Per-level heading frequency for a single page
 */
export interface HeadingFrequency {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  tag: string;      // e.g. "H1"
  count: number;
  values: string[]; // actual text of each heading at this level
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
  keywords: KeywordEntry[]; // top individual words
  phrases: KeywordEntry[];  // top 2-word phrases
}

/**
 * Complete analysis result
 */
export interface AnalysisResult {
  overallScore: number; // 0-100
  totalIssues: number;
  categoryScores: Array<{
    category: string;
    score: number; // 0-100
    issueCount: number;
  }>;
  issues: Issue[];
  passingChecks: PassingCheck[];
  pageHeadings: PageHeadingSummary[];
  keywordConsistency: PageKeywordConsistency[];
}

/**
 * Base interface for all SEO rules
 */
export interface Rule {
  // Unique identifier for this rule
  code: string;

  // Which category this rule belongs to
  category: IssueCategory;

  // Whether this rule analyzes individual pages or the entire site
  level: 'page' | 'site';

  // Execute the rule
  execute(input: PageData | PageData[], context: SiteContext): RuleResult;
}

/**
 * Page-level rule analyzes individual pages
 */
export interface PageRule extends Rule {
  level: 'page';
  execute(page: PageData, context: SiteContext): RuleResult;
}

/**
 * Site-level rule analyzes all pages together
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
  TECHNICAL: 0.20, // robots.txt, sitemap, canonical, SSL
  ON_PAGE: 0.30, // titles, descriptions, headings, content
  PERFORMANCE: 0.20, // Core Web Vitals, load time
  ACCESSIBILITY: 0.05, // alt text, ARIA (limited checks for now)
  LINKS: 0.10, // internal linking structure
  STRUCTURED_DATA: 0.05, // Schema.org, Open Graph
  SECURITY: 0.10, // HTTPS, security headers
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
