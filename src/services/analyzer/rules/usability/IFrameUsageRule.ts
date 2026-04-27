import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class IFrameUsageRule implements PageRule {
  code = 'IFRAME_USAGE';
  category = 'ACCESSIBILITY' as const;
  level = 'page' as const;

  private readonly EXCESSIVE_THRESHOLD = 3;

  readonly checkDefinition: CheckDefinition = {
    id: 'IFRAME_USAGE',
    name: 'IFrame Usage',
    maxScore: 2,
    priority: 3,
    section: 'ui',
    informational: false,
    what: 'IFrames embed external content within your page. Excessive iframe usage can slow page load and create accessibility issues for screen readers and search engine crawlers.',
    why: 'Search engines cannot reliably crawl iframe content, so important content inside iframes may not be indexed. Excessive iframes also increase page weight and reduce accessibility for users with assistive technologies.',
    how: 'Use iframes sparingly and only for genuinely embedded content (maps, videos, widgets). For content that should be indexed, include it in the page HTML directly instead of inside iframes.',
    time: '1-2 hours',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    const iframeCount = page.iframeCount ?? 0;
    const passed = iframeCount < this.EXCESSIVE_THRESHOLD;
    const score = iframeCount === 0
      ? this.checkDefinition.maxScore
      : iframeCount < this.EXCESSIVE_THRESHOLD
        ? 1
        : 0;

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score,
      shortAnswer: iframeCount === 0
        ? 'No iframes found.'
        : iframeCount < this.EXCESSIVE_THRESHOLD
          ? `${iframeCount} iframe(s) found (acceptable).`
          : `Excessive iframes detected (${iframeCount} total).`,
      answer: iframeCount === 0
        ? 'Page does not use iframes, ensuring full crawlability and optimal performance.'
        : iframeCount < this.EXCESSIVE_THRESHOLD
          ? `Page has ${iframeCount} iframe(s), which is acceptable for embedded content like maps or videos.`
          : `Page has ${iframeCount} iframes. Excessive iframes can slow page load, hurt SEO crawlability, and reduce accessibility.`,
      recommendation: iframeCount >= this.EXCESSIVE_THRESHOLD
        ? 'Reduce iframe usage. Replace iframe content with native HTML where possible, especially for content you want indexed by search engines.'
        : null,
      value: iframeCount,
      data: { iframeCount },
      pageUrl: page.url,
    };

    const issues = !passed ? [{
      category: this.category,
      type: this.code,
      title: 'Excessive IFrame Usage',
      description: check.answer,
      severity: 'LOW' as const,
      impactScore: 8,
      pageUrl: page.url,
    }] : [];

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: iframeCount === 0 ? 'No IFrames' : 'Minimal IFrame Usage',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: iframeCount === 0
        ? 'Avoiding iframes improves page performance and search engine crawlability.'
        : 'Limited iframe usage is acceptable for embedded content like videos or maps.',
    }] : [];

    return { check, issues, passingChecks };
  }
}
