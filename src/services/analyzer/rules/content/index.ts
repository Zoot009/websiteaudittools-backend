import type { AuditRule, RuleContext, SeoIssue, FixRecommendation } from '../../types';

/**
 * Rule: Thin content
 * Severity: MEDIUM to HIGH
 * Category: On-Page SEO
 */
export const thinContentRule: AuditRule = {
  code: 'THIN_CONTENT',
  name: 'Thin content',
  category: 'ON_PAGE',
  severity: 'MEDIUM',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page } = context;
    const issues: SeoIssue[] = [];
    
    // Threshold: less than 300 words is considered thin
    if (page.wordCount < 300) {
      const severity = page.wordCount < 100 ? 'HIGH' : 'MEDIUM';
      
      issues.push({
        category: 'ON_PAGE',
        type: 'thin_content',
        title: 'Thin Content',
        description: `This page has only ${page.wordCount} words. Pages with thin content may not satisfy search intent or rank well.`,
        severity: severity as 'HIGH' | 'MEDIUM',
        impactScore: page.wordCount < 100 ? 75 : 60,
        pageUrl: page.url,
      });
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue, context: RuleContext): FixRecommendation => ({
    title: 'Expand content',
    whyItMatters: 'Thin content pages may not provide enough value to satisfy user intent, leading to poor rankings and high bounce rates.',
    howToFix: [
      `Expand the content from ${context.page.wordCount} words to at least 300-500 words.`,
      'Add more detail, examples, or explanations about the topic.',
      'Consider what questions users might have and answer them.',
      'Ensure content quality over quantity - add value, not fluff.',
      'Consider if this page should exist or if content should be merged with a related page.',
    ],
    estimatedEffort: 'medium',
    priority: 7,
  }),
};
