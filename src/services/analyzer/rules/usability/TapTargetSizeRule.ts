import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class TapTargetSizeRule implements PageRule {
  code = 'TAP_TARGET_SIZE';
  category = 'ACCESSIBILITY' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'TAP_TARGET_SIZE',
    name: 'Tap Target Size',
    maxScore: 2,
    priority: 3,
    section: 'ui',
    informational: false,
    what: 'Tap targets are interactive elements (buttons, links, form controls) that users click or tap. Google recommends a minimum size of 48x48px to prevent mis-taps on mobile.',
    why: 'Small tap targets cause frustrating mis-taps on mobile devices, increasing bounce rates and hurting user experience. Google\'s mobile-friendliness assessment flags pages with too-small tap targets.',
    how: 'Ensure all buttons and links are at least 48x48px in size or have at least 8px of spacing around them. Use CSS padding to increase the tap area without changing the visual size of the element.',
    time: '1-2 hours',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    const smallTapTargetCount = page.smallTapTargetCount ?? 0;
    const passed = smallTapTargetCount === 0;
    const score = smallTapTargetCount === 0
      ? this.checkDefinition.maxScore
      : smallTapTargetCount <= 10
        ? 1
        : 0;

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score,
      shortAnswer: smallTapTargetCount === 0
        ? 'All tap targets meet minimum size requirements.'
        : smallTapTargetCount <= 10
          ? `${smallTapTargetCount} tap target(s) too small.`
          : `${smallTapTargetCount} tap targets too small — significant mobile usability issue.`,
      answer: smallTapTargetCount === 0
        ? 'All clickable elements meet the recommended minimum size of 48x48px, ensuring good mobile usability.'
        : smallTapTargetCount <= 10
          ? `Found ${smallTapTargetCount} clickable element(s) smaller than 48x48px. This may cause mis-taps on mobile devices.`
          : `Found ${smallTapTargetCount} clickable elements smaller than 48x48px, which significantly hurts mobile usability and can lead to poor Core Web Vitals scores.`,
      recommendation: !passed ? 'Increase button and link sizes to at least 48x48px. Use CSS padding to expand tap areas without changing the visual appearance.' : null,
      value: smallTapTargetCount,
      data: { smallTapTargetCount },
      pageUrl: page.url,
    };

    const issues = !passed ? [{
      category: this.category,
      type: this.code,
      title: smallTapTargetCount > 10 ? 'Many Tap Targets Too Small' : 'Some Tap Targets Too Small',
      description: check.answer,
      severity: (smallTapTargetCount > 10 ? 'HIGH' : 'MEDIUM') as 'HIGH' | 'MEDIUM',
      impactScore: smallTapTargetCount > 10 ? 20 : 12,
      pageUrl: page.url,
    }] : [];

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: 'Touch-Friendly Tap Targets',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'Properly sized tap targets improve mobile usability and reduce user frustration from mis-taps.',
    }] : [];

    return { check, issues, passingChecks };
  }
}
