/**
 * Check for clickable elements that are too small (tap targets < 48x48px)
 */

import type { PageRule, PageData, SiteContext, RuleResult, Issue, PassingCheck } from '../../types.js';

export class TapTargetSizeRule implements PageRule {
  code = 'TAP_TARGET_SIZE';
  category = 'ACCESSIBILITY' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    const smallTapTargetCount = page.smallTapTargetCount ?? 0;

    if (smallTapTargetCount > 10) {
      issues.push({
        category: this.category,
        type: this.code,
        severity: 'HIGH',
        title: 'Many Tap Targets Too Small',
        description: `Found ${smallTapTargetCount} clickable elements smaller than 48x48px, which can be difficult to tap on mobile devices. Increase button and link sizes to at least 48x48px.`,
        impactScore: 20,
        pageUrl: page.url,
      });
    } else if (smallTapTargetCount > 0) {
      issues.push({
        category: this.category,
        type: this.code,
        severity: 'MEDIUM',
        title: 'Some Tap Targets Too Small',
        description: `Found ${smallTapTargetCount} clickable elements smaller than 48x48px. Increase element sizes to at least 48x48px for better mobile usability.`,
        impactScore: 12,
        pageUrl: page.url,
      });
    } else {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'Touch-Friendly Tap Targets',
        description: 'All clickable elements meet the recommended minimum size of 48x48px',
        pageUrl: page.url,
        goodPractice:
          'Properly sized tap targets improve mobile usability and reduce user frustration from mis-taps.',
      });
    }

    return { issues, passingChecks };
  }
}
