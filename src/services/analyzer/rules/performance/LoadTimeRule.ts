import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class LoadTimeRule implements PageRule {
  code = 'LOAD_TIME';
  category = 'PERFORMANCE' as const;
  level = 'page' as const;

  private readonly GOOD_THRESHOLD = 2000;
  private readonly POOR_THRESHOLD = 4000;

  readonly checkDefinition: CheckDefinition = {
    id: 'LOAD_TIME',
    name: 'Load Time',
    maxScore: 4,
    priority: 1,
    section: 'performance',
    informational: false,
    what: 'Load time is how long it takes for a page to fully load and become interactive. It\'s a critical user experience and SEO metric that directly affects bounce rates and conversions.',
    why: 'Page speed is a confirmed ranking factor. Users abandon pages that take longer than 3 seconds to load. Every second of delay can reduce conversions by up to 20%. Fast sites rank better.',
    how: 'Optimize images (compress, use WebP), minify CSS/JS, enable compression (gzip/brotli), use a CDN, implement browser caching, remove unused code, defer off-screen images, and reduce server response time.',
    time: '4-8 hours',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    const loadTime = page.loadTime;
    const loadTimeSec = (loadTime / 1000).toFixed(2);

    let passed: boolean;
    let score: number;
    let shortAnswer: string;
    let answer: string;
    let recommendation: string | null;
    let issueType: string;
    let severity: 'HIGH' | 'MEDIUM';
    let impactScore: number;

    if (loadTime >= this.POOR_THRESHOLD) {
      passed = false; score = 0;
      shortAnswer = `Page load time is slow (${loadTimeSec}s).`;
      answer = `Page took ${loadTimeSec}s to load (should be <2s). Slow pages frustrate users and hurt SEO rankings.`;
      recommendation = 'Optimize images, enable caching, use a CDN, and minimize CSS/JS to reduce load time below 2 seconds.';
      issueType = 'SLOW_LOAD_TIME'; severity = 'HIGH'; impactScore = 25;
    } else if (loadTime >= this.GOOD_THRESHOLD) {
      passed = false; score = 2;
      shortAnswer = `Page load time needs improvement (${loadTimeSec}s).`;
      answer = `Page took ${loadTimeSec}s to load. Consider optimizing to reach the <2s target.`;
      recommendation = 'Optimize images, minify assets, and enable compression to improve load time to under 2 seconds.';
      issueType = 'MODERATE_LOAD_TIME'; severity = 'MEDIUM'; impactScore = 10;
    } else {
      passed = true; score = this.checkDefinition.maxScore;
      shortAnswer = `Page load time is fast (${loadTimeSec}s).`;
      answer = `Page loaded in ${loadTimeSec}s — within the recommended <2s target.`;
      recommendation = null;
      issueType = ''; severity = 'MEDIUM'; impactScore = 0;
    }

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score,
      shortAnswer,
      answer,
      recommendation,
      value: loadTime,
      data: { loadTime, loadTimeSec: parseFloat(loadTimeSec) },
      pageUrl: page.url,
    };

    const issues = !passed ? [{
      category: this.category,
      type: issueType,
      title: score === 0 ? 'Slow Page Load Time' : 'Moderate Page Load Time',
      description: answer,
      severity,
      impactScore,
      pageUrl: page.url,
    }] : [];

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: 'Fast Page Load',
      description: shortAnswer,
      pageUrl: page.url,
      goodPractice: 'Fast-loading pages (<2s) provide better user experience and improved SEO rankings.',
    }] : [];

    return { check, issues, passingChecks };
  }
}
