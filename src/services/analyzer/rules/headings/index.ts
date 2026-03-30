import type { AuditRule, RuleContext, SeoIssue, FixRecommendation } from '../../types';

/**
 * Rule: Missing H1
 * Severity: HIGH
 * Category: On-Page SEO
 */
export const h1MissingRule: AuditRule = {
  code: 'H1_MISSING',
  name: 'Missing H1',
  category: 'ON_PAGE',
  severity: 'HIGH',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page } = context;
    const issues: SeoIssue[] = [];
    
    const h1s = page.headings.filter(h => h.level === 1);
    
    if (h1s.length === 0) {
      issues.push({
        category: 'ON_PAGE',
        type: 'h1_missing',
        title: 'Missing H1 Tag',
        description: 'This page does not have an H1 tag, which is important for content structure and SEO.',
        severity: 'HIGH',
        impactScore: 75,
        pageUrl: page.url,
        elementSelector: 'h1',
      });
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue): FixRecommendation => ({
    title: 'Add an H1 heading',
    whyItMatters: 'H1 tags provide topical clarity and content structure. They help search engines understand the main topic of the page and improve accessibility.',
    howToFix: [
      'Add a clear, descriptive H1 tag that summarizes the page\'s main topic.',
      'Include your primary keyword naturally in the H1.',
      'Make it user-friendly and compelling, not just keyword-stuffed.',
      'Ensure it\'s visible and near the top of the page content.',
    ],
    estimatedEffort: 'low',
    priority: 8,
  }),
};

/**
 * Rule: Multiple H1s
 * Severity: MEDIUM
 * Category: On-Page SEO
 */
export const h1MultipleRule: AuditRule = {
  code: 'H1_MULTIPLE',
  name: 'Multiple H1s',
  category: 'ON_PAGE',
  severity: 'MEDIUM',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page } = context;
    const issues: SeoIssue[] = [];
    
    const h1s = page.headings.filter(h => h.level === 1);
    
    if (h1s.length > 1) {
      issues.push({
        category: 'ON_PAGE',
        type: 'h1_multiple',
        title: 'Multiple H1 Tags',
        description: `This page has ${h1s.length} H1 tags. Best practice is to have only one H1 per page for clear topical focus.`,
        severity: 'MEDIUM',
        impactScore: 50,
        pageUrl: page.url,
        elementSelector: 'h1',
      });
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue, context: RuleContext): FixRecommendation => {
    const h1s = context.page.headings.filter(h => h.level === 1);
    
    return {
      title: 'Use only one H1',
      whyItMatters: 'Multiple H1 tags can dilute topical focus and create confusion about the page\'s main subject. While not always fatal, it signals poor content structure.',
      howToFix: [
        'Keep the most important H1 that best describes the page topic.',
        `Current H1s found: ${h1s.slice(0, 3).map(h => `"${h.text}"`).join(', ')}`,
        'Convert secondary H1s to H2 or H3 tags as appropriate.',
        'Ensure your heading hierarchy flows logically: H1 → H2 → H3.',
      ],
      estimatedEffort: 'low',
      priority: 6,
    };
  },
};

/**
 * Rule: Empty or generic H1
 * Severity: MEDIUM
 * Category: On-Page SEO
 */
export const h1EmptyOrGenericRule: AuditRule = {
  code: 'H1_EMPTY_OR_GENERIC',
  name: 'Empty or generic H1',
  category: 'ON_PAGE',
  severity: 'MEDIUM',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page } = context;
    const issues: SeoIssue[] = [];
    
    const h1s = page.headings.filter(h => h.level === 1);
    
    if (h1s.length === 1 && h1s[0]) {
      const h1Text = h1s[0].text.trim().toLowerCase();
      const genericTerms = ['home', 'welcome', 'untitled', 'page', 'default'];
      
      if (h1Text.length === 0 || genericTerms.includes(h1Text)) {
        issues.push({
          category: 'ON_PAGE',
          type: 'h1_empty_or_generic',
          title: 'Empty or Generic H1',
          description: `The H1 is ${h1Text.length === 0 ? 'empty' : `too generic ("${h1s[0].text}")`}. H1 should clearly describe the page topic.`,
          severity: 'MEDIUM',
          impactScore: 65,
          pageUrl: page.url,
          elementSelector: 'h1',
        });
      }
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue): FixRecommendation => ({
    title: 'Make H1 descriptive',
    whyItMatters: 'Generic or empty H1s provide weak topical relevance and miss opportunities to signal page content to users and search engines.',
    howToFix: [
      'Write a specific, descriptive H1 that clearly states what this page is about.',
      'Include relevant keywords naturally.',
      'Avoid generic terms like "Home" or "Welcome" without context.',
      'Make it informative and compelling for users.',
    ],
    estimatedEffort: 'low',
    priority: 7,
  }),
};
