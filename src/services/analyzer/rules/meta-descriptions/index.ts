import type { AuditRule, RuleContext, SeoIssue, FixRecommendation } from '../../types';

/**
 * Rule: Missing meta description
 * Severity: MEDIUM
 * Category: On-Page SEO
 */
export const metaDescriptionMissingRule: AuditRule = {
  code: 'META_DESCRIPTION_MISSING',
  name: 'Missing meta description',
  category: 'ON_PAGE',
  severity: 'MEDIUM',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page } = context;
    const issues: SeoIssue[] = [];
    
    if (!page.description || page.description.trim().length === 0) {
      issues.push({
        category: 'ON_PAGE',
        type: 'meta_description_missing',
        title: 'Missing Meta Description',
        description: 'This page does not have a meta description, which affects click-through rates in search results.',
        severity: 'MEDIUM',
        impactScore: 75,
        pageUrl: page.url,
        elementSelector: 'meta[name="description"]',
      });
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue): FixRecommendation => ({
    title: 'Add meta description',
    whyItMatters: 'While not a direct ranking factor, meta descriptions strongly influence click-through rates from search results. They act as your ad copy in SERPs.',
    howToFix: [
      'Write a compelling meta description that summarizes the page content.',
      'Keep it between 120-160 characters.',
      'Include your primary keyword naturally.',
      'Make it action-oriented to encourage clicks.',
      'Think of it as ad copy - what would make someone click?',
    ],
    estimatedEffort: 'low',
    priority: 7,
  }),
};

/**
 * Rule: Meta description too short
 * Severity: LOW to MEDIUM
 * Category: On-Page SEO
 */
export const metaDescriptionTooShortRule: AuditRule = {
  code: 'META_DESCRIPTION_TOO_SHORT',
  name: 'Meta description too short',
  category: 'ON_PAGE',
  severity: 'LOW',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page } = context;
    const issues: SeoIssue[] = [];
    
    if (page.description && page.description.length > 0 && page.description.length < 70) {
      issues.push({
        category: 'ON_PAGE',
        type: 'meta_description_too_short',
        title: 'Meta Description Too Short',
        description: `The meta description is only ${page.description.length} characters. Aim for 120-160 characters to fully utilize the SERP preview.`,
        severity: 'LOW',
        impactScore: 50,
        pageUrl: page.url,
        elementSelector: 'meta[name="description"]',
      });
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue, context: RuleContext): FixRecommendation => ({
    title: 'Expand meta description',
    whyItMatters: 'Short descriptions miss the opportunity to provide compelling copy in search results, reducing click-through potential.',
    howToFix: [
      `Expand the description from ${context.page.description?.length || 0} to 120-160 characters.`,
      'Add more detail about what users will find on this page.',
      'Include a call-to-action or benefit statement.',
      'Use the full space available in search results.',
    ],
    estimatedEffort: 'low',
    priority: 5,
  }),
};

/**
 * Rule: Meta description too long
 * Severity: LOW to MEDIUM
 * Category: On-Page SEO
 */
export const metaDescriptionTooLongRule: AuditRule = {
  code: 'META_DESCRIPTION_TOO_LONG',
  name: 'Meta description too long',
  category: 'ON_PAGE',
  severity: 'LOW',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page } = context;
    const issues: SeoIssue[] = [];
    
    if (page.description && page.description.length > 160) {
      issues.push({
        category: 'ON_PAGE',
        type: 'meta_description_too_long',
        title: 'Meta Description Too Long',
        description: `The meta description is ${page.description.length} characters and will be truncated in search results. Keep it under 160 characters.`,
        severity: 'LOW',
        impactScore: 45,
        pageUrl: page.url,
        elementSelector: 'meta[name="description"]',
      });
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue, context: RuleContext): FixRecommendation => ({
    title: 'Shorten meta description',
    whyItMatters: 'Descriptions longer than 160 characters get truncated in search results, potentially cutting off important information or calls-to-action.',
    howToFix: [
      `Shorten the description from ${context.page.description?.length || 0} to 120-160 characters.`,
      'Put the most important information and keywords at the beginning.',
      'Remove redundant phrases or filler words.',
      'End with a complete thought before the 160-character limit.',
    ],
    estimatedEffort: 'low',
    priority: 4,
  }),
};

/**
 * Rule: Duplicate meta descriptions
 * Severity: MEDIUM
 * Category: On-Page SEO
 */
export const metaDescriptionDuplicateRule: AuditRule = {
  code: 'META_DESCRIPTION_DUPLICATE',
  name: 'Duplicate meta descriptions',
  category: 'ON_PAGE',
  severity: 'MEDIUM',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page, siteContext } = context;
    const issues: SeoIssue[] = [];
    
    if (page.description) {
      const pagesWithSameDescription = siteContext.descriptionMap.get(page.description) || [];
      
      if (pagesWithSameDescription.length > 1) {
        issues.push({
          category: 'ON_PAGE',
          type: 'meta_description_duplicate',
          title: 'Duplicate Meta Description',
          description: `This meta description is shared by ${pagesWithSameDescription.length} pages. Unique descriptions improve CTR and page differentiation.`,
          severity: 'MEDIUM',
          impactScore: 60,
          pageUrl: page.url,
          elementSelector: 'meta[name="description"]',
        });
      }
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue, context: RuleContext): FixRecommendation => {
    const pagesWithSameDescription = context.siteContext.descriptionMap.get(context.page.description || '') || [];
    
    return {
      title: 'Make meta description unique',
      whyItMatters: 'Duplicate descriptions reduce page uniqueness in search results and miss opportunities to highlight what makes each page special.',
      howToFix: [
        'Write a unique description that specifically describes this page\'s content.',
        `Other pages with this description: ${pagesWithSameDescription.slice(0, 3).join(', ')}${pagesWithSameDescription.length > 3 ? '...' : ''}`,
        'Highlight what makes this page different from others.',
        'Include page-specific details, benefits, or offers.',
      ],
      estimatedEffort: 'low',
      priority: 6,
    };
  },
};
