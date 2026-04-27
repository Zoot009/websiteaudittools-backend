import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class PageSizeRule implements PageRule {
  code = 'PAGE_SIZE_TOO_LARGE';
  category = 'PERFORMANCE' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'PAGE_SIZE_TOO_LARGE',
    name: 'Page Size',
    maxScore: 3,
    priority: 2,
    section: 'performance',
    informational: false,
    what: 'Page size is the total weight of all resources loaded by a page, including HTML, CSS, JavaScript, and images. Large pages take longer to load.',
    why: 'Large page sizes directly increase load time, especially on mobile and slow connections. Google recommends keeping total page size under 3MB for optimal performance.',
    how: 'Optimize images (compress and use WebP/AVIF format), minify CSS and JavaScript, enable server compression (gzip/brotli), remove unused CSS/JS, and implement lazy loading for off-screen images.',
    time: '4-8 hours',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    if (!page.pageSizes) {
      const stub: SEOAuditCheck = {
        ...this.checkDefinition,
        maxScore: 0,
        informational: true,
        category: this.category,
        passed: null,
        score: 0,
        shortAnswer: 'Page size data not available.',
        answer: 'Page size information could not be collected for this page.',
        recommendation: null,
        pageUrl: page.url,
      };
      return { check: stub, issues: [], passingChecks: [] };
    }

    const totalSizeMB = page.pageSizes.total / (1024 * 1024);
    const passed = totalSizeMB <= 3;
    const score = totalSizeMB <= 1.5
      ? this.checkDefinition.maxScore
      : totalSizeMB <= 3
        ? 2
        : 0;

    const breakdown: string[] = [];
    const imagesMB = page.pageSizes.images / (1024 * 1024);
    const jsMB = page.pageSizes.js / (1024 * 1024);
    const cssMB = page.pageSizes.css / (1024 * 1024);
    if (imagesMB > 1) breakdown.push(`Images: ${imagesMB.toFixed(2)}MB`);
    if (jsMB > 0.5) breakdown.push(`JavaScript: ${jsMB.toFixed(2)}MB`);
    if (cssMB > 0.25) breakdown.push(`CSS: ${cssMB.toFixed(2)}MB`);

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score,
      shortAnswer: passed
        ? `Page size is ${totalSizeMB.toFixed(2)}MB${totalSizeMB <= 1.5 ? ' (excellent)' : ' (acceptable)'}.`
        : `Page size is ${totalSizeMB.toFixed(2)}MB (too large).`,
      answer: passed
        ? `Total page size is ${totalSizeMB.toFixed(2)}MB — within recommended limits.`
        : `Total page size is ${totalSizeMB.toFixed(2)}MB, exceeding the recommended 3MB limit. ${breakdown.length > 0 ? 'Largest contributors: ' + breakdown.join(', ') + '.' : ''}`,
      recommendation: passed ? null : 'Optimize images using WebP/AVIF, minify CSS/JS, enable server compression, and implement lazy loading.',
      value: Math.round(totalSizeMB * 100) / 100,
      data: {
        totalSizeMB: Math.round(totalSizeMB * 100) / 100,
        html: page.pageSizes.html,
        css: page.pageSizes.css,
        js: page.pageSizes.js,
        images: page.pageSizes.images,
      },
      pageUrl: page.url,
    };

    const severity = totalSizeMB > 5 ? 'HIGH' as const : 'MEDIUM' as const;

    const issues = !passed ? [{
      category: this.category,
      type: this.code,
      title: 'Page Size Too Large',
      description: check.answer,
      severity,
      impactScore: totalSizeMB > 5 ? 25 : 15,
      pageUrl: page.url,
    }] : [];

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: totalSizeMB <= 1.5 ? 'Page Size Optimized' : 'Page Size Acceptable',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'Smaller page sizes improve load times and reduce bandwidth costs, especially for mobile users.',
    }] : [];

    return { check, issues, passingChecks };
  }
}
