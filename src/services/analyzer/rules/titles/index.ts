import type { AuditRule, RuleContext, SeoIssue, FixRecommendation } from '../../types';

/**
 * Rule: Missing title
 * Severity: HIGH
 * Category: On-Page SEO
 */
export const titleMissingRule: AuditRule = {
  code: 'TITLE_MISSING',
  name: 'Missing title',
  category: 'ON_PAGE',
  severity: 'HIGH',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page } = context;
    const issues: SeoIssue[] = [];
    
    if (!page.title || page.title.trim().length === 0) {
      issues.push({
        category: 'ON_PAGE',
        type: 'title_missing',
        title: 'Missing Page Title',
        description: 'This page does not have a title tag, which is critical for SEO and user experience.',
        severity: 'HIGH',
        impactScore: 95,
        pageUrl: page.url,
        elementSelector: 'title',
      });
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue): FixRecommendation => ({
    title: 'Add a page title',
    whyItMatters: 'Title tags are one of the most important on-page SEO factors. They appear in search results and browser tabs, directly affecting click-through rates and rankings.',
    howToFix: [
      'Write a unique, descriptive title for this page.',
      'Include the main topic or primary keyword naturally.',
      'Keep it around 50-60 characters to avoid truncation in search results.',
      'Make it compelling to encourage clicks from search results.',
    ],
    estimatedEffort: 'low',
    priority: 10,
  }),
};

/**
 * Rule: Title too short
 * Severity: MEDIUM
 * Category: On-Page SEO
 */
export const titleTooShortRule: AuditRule = {
  code: 'TITLE_TOO_SHORT',
  name: 'Title too short',
  category: 'ON_PAGE',
  severity: 'MEDIUM',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page } = context;
    const issues: SeoIssue[] = [];
    
    if (page.title && page.title.length > 0 && page.title.length < 20) {
      issues.push({
        category: 'ON_PAGE',
        type: 'title_too_short',
        title: 'Title Tag Too Short',
        description: `The title is only ${page.title.length} characters long. Titles should be at least 20-30 characters to be descriptive enough.`,
        severity: 'MEDIUM',
        impactScore: 70,
        pageUrl: page.url,
        elementSelector: 'title',
      });
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue, context: RuleContext): FixRecommendation => ({
    title: 'Expand title tag',
    whyItMatters: 'Short titles are often not descriptive enough for users or search engines to understand the page content, reducing relevance and click-through rates.',
    howToFix: [
      `Expand the title from ${context.page.title?.length || 0} to 50-60 characters.`,
      'Add more context about the page topic.',
      'Include relevant keywords naturally.',
      'Consider adding your brand name if space allows.',
    ],
    estimatedEffort: 'low',
    priority: 7,
  }),
};

/**
 * Rule: Title too long
 * Severity: MEDIUM
 * Category: On-Page SEO
 */
export const titleTooLongRule: AuditRule = {
  code: 'TITLE_TOO_LONG',
  name: 'Title too long',
  category: 'ON_PAGE',
  severity: 'MEDIUM',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page } = context;
    const issues: SeoIssue[] = [];
    
    if (page.title && page.title.length > 60) {
      issues.push({
        category: 'ON_PAGE',
        type: 'title_too_long',
        title: 'Title Tag Too Long',
        description: `The title is ${page.title.length} characters long and may be truncated in search results. Keep it under 60 characters.`,
        severity: 'MEDIUM',
        impactScore: 55,
        pageUrl: page.url,
        elementSelector: 'title',
      });
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue, context: RuleContext): FixRecommendation => ({
    title: 'Shorten title tag',
    whyItMatters: 'Titles longer than 60 characters get truncated in search results, diluting your message and reducing click-through rates.',
    howToFix: [
      `Shorten the title from ${context.page.title?.length || 0} to around 50-60 characters.`,
      'Put the most important keywords and information at the beginning.',
      'Remove redundant words or phrases.',
      'Consider moving branding to the end or removing it if space is tight.',
    ],
    estimatedEffort: 'low',
    priority: 6,
  }),
};

/**
 * Rule: Duplicate titles
 * Severity: HIGH
 * Category: On-Page SEO
 */
export const titleDuplicateRule: AuditRule = {
  code: 'TITLE_DUPLICATE',
  name: 'Duplicate titles',
  category: 'ON_PAGE',
  severity: 'HIGH',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page, siteContext } = context;
    const issues: SeoIssue[] = [];
    
    if (page.title) {
      const pagesWithSameTitle = siteContext.titleMap.get(page.title) || [];
      
      // Only report if there are other pages with the same title
      if (pagesWithSameTitle.length > 1) {
        issues.push({
          category: 'ON_PAGE',
          type: 'title_duplicate',
          title: 'Duplicate Title Tag',
          description: `This title is shared by ${pagesWithSameTitle.length} pages. Each page should have a unique title for better targeting and rankings.`,
          severity: 'HIGH',
          impactScore: 80,
          pageUrl: page.url,
          elementSelector: 'title',
        });
      }
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue, context: RuleContext): FixRecommendation => {
    const pagesWithSameTitle = context.siteContext.titleMap.get(context.page.title || '') || [];
    
    return {
      title: 'Make title unique',
      whyItMatters: 'Duplicate titles confuse search engines about which page to rank for which queries, weakening page targeting and diluting ranking potential.',
      howToFix: [
        'Write a unique title that specifically describes this page\'s content.',
        `Other pages with this title: ${pagesWithSameTitle.slice(0, 3).join(', ')}${pagesWithSameTitle.length > 3 ? '...' : ''}`,
        'Include page-specific keywords or differentiators.',
        'Use a template that adds unique content for each page (e.g., category name, product name).',
      ],
      estimatedEffort: 'low',
      priority: 9,
    };
  },
};
