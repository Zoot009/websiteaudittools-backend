/**
 * Check if images are optimized (using modern formats)
 */

import type { PageRule, PageData, SiteContext, RuleResult, Issue, PassingCheck } from '../../types.js';

export class ImageOptimizationRule implements PageRule {
  code = 'IMAGE_OPTIMIZATION';
  category = 'PERFORMANCE' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    const imageOptimization = page.imageOptimization;
    
    if (!imageOptimization) {
      return { issues, passingChecks };
    }

    const { unoptimized, modernFormats } = imageOptimization;
    const totalImages = unoptimized + modernFormats;

    if (totalImages === 0) {
      return { issues, passingChecks };
    }

    const unoptimizedPercentage = (unoptimized / totalImages) * 100;

    if (unoptimized > 10 && unoptimizedPercentage > 50) {
      issues.push({
        category: this.category,
        type: this.code,
        severity: unoptimizedPercentage > 80 ? 'HIGH' : 'MEDIUM',
        title: 'Images Not Using Modern Formats',
        description: `${unoptimized} out of ${totalImages} images (${unoptimizedPercentage.toFixed(0)}%) are using legacy formats (JPG/PNG) instead of modern formats like WebP or AVIF. Convert images to WebP/AVIF for 25-35% better compression.`,
        impactScore: unoptimizedPercentage > 80 ? 20 : 12,
        pageUrl: page.url,
      });
    } else if (modernFormats > 0) {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'Using Modern Image Formats',
        description: `${modernFormats} images are using modern formats (WebP/AVIF)${unoptimized > 0 ? `, ${unoptimized} using legacy formats` : ''}`,
        pageUrl: page.url,
        goodPractice:
          'Modern image formats like WebP and AVIF provide 25-35% better compression than JPG/PNG, reducing page size and improving load times.',
      });
    }

    return { issues, passingChecks };
  }
}
