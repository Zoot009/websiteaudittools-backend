import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class FlashUsageRule implements PageRule {
  code = 'FLASH_USAGE';
  category = 'PERFORMANCE' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'FLASH_USAGE',
    name: 'Flash',
    maxScore: 3,
    priority: 2,
    section: 'performance',
    informational: false,
    what: 'Adobe Flash is a deprecated technology that was once used for animations, video, and interactive content. It is no longer supported by any modern browser.',
    why: 'Flash content is invisible to search engines and inaccessible to mobile users. Adobe ended Flash support on December 31, 2020. Using Flash breaks your site for virtually all users.',
    how: 'Replace Flash content with HTML5 equivalents: use <video> for video, CSS animations for animations, and JavaScript for interactive elements. Most modern hosting and CMS platforms no longer support Flash.',
    time: '4-8 hours',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    const flashCount = page.flashCount ?? 0;
    const passed = flashCount === 0;

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score: passed ? this.checkDefinition.maxScore : 0,
      shortAnswer: passed
        ? 'No Flash content detected.'
        : `${flashCount} Flash object(s) detected.`,
      answer: passed
        ? 'Page does not use deprecated Flash technology — compatible with all modern browsers.'
        : `Page contains ${flashCount} Flash object(s). Flash is deprecated and not supported by any modern browser. Content is invisible to users and search engines.`,
      recommendation: passed ? null : 'Replace Flash content with HTML5 equivalents: <video> for video, CSS animations for animations, and JavaScript for interactivity.',
      data: { flashCount },
      pageUrl: page.url,
    };

    const issues = !passed ? [{
      category: this.category,
      type: this.code,
      title: 'Flash Content Detected',
      description: check.answer,
      severity: 'CRITICAL' as const,
      impactScore: 40,
      pageUrl: page.url,
      elementSelector: 'object[type*="flash"], embed[type*="flash"]',
    }] : [];

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: 'No Flash Content',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'Avoiding Flash ensures compatibility with modern browsers and mobile devices.',
    }] : [];

    return { check, issues, passingChecks };
  }
}
