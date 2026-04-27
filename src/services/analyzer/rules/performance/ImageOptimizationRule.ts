import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class ImageOptimizationRule implements PageRule {
  code = 'IMAGE_OPTIMIZATION';
  category = 'PERFORMANCE' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'IMAGE_OPTIMIZATION',
    name: 'Image Optimization',
    maxScore: 3,
    priority: 2,
    section: 'performance',
    informational: false,
    what: 'Image optimization involves using modern formats (WebP, AVIF) and proper compression. Images typically account for 50-80% of total page weight.',
    why: 'Unoptimized images are the leading cause of slow page load times. Converting to modern formats like WebP provides 25-35% better compression than JPG/PNG with no visible quality loss.',
    how: 'Convert images to WebP or AVIF format using tools like Squoosh, Sharp, or your CMS\'s image optimization feature. Serve correctly sized images (don\'t load 4000px images for 400px containers). Implement lazy loading for off-screen images.',
    time: '2-4 hours',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    if (!page.imageOptimization) {
      const stub: SEOAuditCheck = {
        ...this.checkDefinition,
        maxScore: 0,
        informational: true,
        category: this.category,
        passed: null,
        score: 0,
        shortAnswer: 'Image optimization data not available.',
        answer: 'Image format analysis could not be collected for this page.',
        recommendation: null,
        pageUrl: page.url,
      };
      return { check: stub, issues: [], passingChecks: [] };
    }

    const { unoptimized, modernFormats } = page.imageOptimization;
    const totalImages = unoptimized + modernFormats;

    if (totalImages === 0) {
      const stub: SEOAuditCheck = {
        ...this.checkDefinition,
        maxScore: 0,
        informational: true,
        category: this.category,
        passed: null,
        score: 0,
        shortAnswer: 'No images found to evaluate.',
        answer: 'Page has no images — image optimization check is not applicable.',
        recommendation: null,
        pageUrl: page.url,
      };
      return { check: stub, issues: [], passingChecks: [] };
    }

    const unoptimizedPct = Math.round((unoptimized / totalImages) * 100);
    const passed = !(unoptimized > 10 && unoptimizedPct > 50);
    const score = passed
      ? modernFormats > 0 ? this.checkDefinition.maxScore : 2
      : 0;

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score,
      shortAnswer: passed
        ? `${modernFormats} of ${totalImages} images use modern formats.`
        : `${unoptimized} of ${totalImages} images (${unoptimizedPct}%) use legacy formats.`,
      answer: passed
        ? `${modernFormats} image(s) use modern formats (WebP/AVIF)${unoptimized > 0 ? `, ${unoptimized} still use legacy formats` : ', all optimized'}.`
        : `${unoptimized} of ${totalImages} images (${unoptimizedPct}%) use legacy JPG/PNG formats instead of modern WebP or AVIF. Converting to WebP provides 25-35% better compression.`,
      recommendation: passed ? null : 'Convert images to WebP or AVIF format for 25-35% better compression. Use tools like Squoosh or your CMS\'s image optimization feature.',
      data: { unoptimized, modernFormats, totalImages, unoptimizedPct },
      pageUrl: page.url,
    };

    const severity = unoptimizedPct > 80 ? 'HIGH' as const : 'MEDIUM' as const;

    const issues = !passed ? [{
      category: this.category,
      type: this.code,
      title: 'Images Not Using Modern Formats',
      description: check.answer,
      severity,
      impactScore: unoptimizedPct > 80 ? 20 : 12,
      pageUrl: page.url,
    }] : [];

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: 'Using Modern Image Formats',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'Modern image formats like WebP and AVIF provide 25-35% better compression, reducing page size and improving load times.',
    }] : [];

    return { check, issues, passingChecks };
  }
}
