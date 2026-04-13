/**
 * Check for text with font sizes that are too small (< 12px)
 */

import type { PageRule, PageData, SiteContext, RuleResult, Issue, PassingCheck } from '../../types.js';

export class FontSizeRule implements PageRule {
  code = 'FONT_SIZE_TOO_SMALL';
  category = 'ACCESSIBILITY' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    const smallFontCount = page.smallFontCount ?? 0;

    if (smallFontCount > 5) {
      issues.push({
        category: this.category,
        type: this.code,
        severity: 'MEDIUM',
        title: 'Text Too Small for Mobile',
        description: `Found ${smallFontCount} elements with font size smaller than 12px, which can be difficult to read on mobile devices. Increase font sizes to at least 14-16px for better readability.`,
        impactScore: 15,
        pageUrl: page.url,
      });
    } else if (smallFontCount > 0) {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'Minimal Small Font Usage',
        description: `Only ${smallFontCount} elements with small fonts detected`,
        pageUrl: page.url,
        goodPractice:
          'Most text uses readable font sizes, which improves accessibility and user experience.',
      });
    } else {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'Readable Font Sizes',
        description: 'All text elements use readable font sizes (12px or larger)',
        pageUrl: page.url,
        goodPractice:
          'Using readable font sizes improves accessibility and ensures content is readable on all devices.',
      });
    }

    return { issues, passingChecks };
  }
}
