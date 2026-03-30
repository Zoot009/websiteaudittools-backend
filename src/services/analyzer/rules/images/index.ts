import type { AuditRule, RuleContext, SeoIssue, FixRecommendation } from '../../types';

/**
 * Rule: Missing alt text
 * Severity: MEDIUM
 * Category: Accessibility
 */
export const missingAltTextRule: AuditRule = {
  code: 'MISSING_ALT_TEXT',
  name: 'Missing alt text',
  category: 'ACCESSIBILITY',
  severity: 'MEDIUM',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page } = context;
    const issues: SeoIssue[] = [];
    
    const imagesWithoutAlt = page.images.filter(img => !img.alt || img.alt.trim().length === 0);
    
    if (imagesWithoutAlt.length > 0) {
      issues.push({
        category: 'ACCESSIBILITY',
        type: 'missing_alt_text',
        title: 'Images Missing Alt Text',
        description: `${imagesWithoutAlt.length} images are missing alt text, which affects accessibility and image SEO.`,
        severity: 'MEDIUM',
        impactScore: 65,
        pageUrl: page.url,
        elementSelector: 'img:not([alt])',
      });
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue, context: RuleContext): FixRecommendation => {
    const imagesWithoutAlt = context.page.images.filter(img => !img.alt || img.alt.trim().length === 0);
    
    return {
      title: 'Add alt text to images',
      whyItMatters: 'Alt text is critical for accessibility (screen readers) and provides SEO signals for image search. It also helps if images fail to load.',
      howToFix: [
        `Add descriptive alt text to ${imagesWithoutAlt.length} images.`,
        'Describe what the image shows, not just "image" or the filename.',
        'Include relevant keywords naturally when appropriate.',
        'Keep it concise but descriptive (aim for 125 characters or less).',
        'Decorative images can use empty alt="" but must have the attribute.',
      ],
      estimatedEffort: 'medium',
      priority: 6,
    };
  },
};
