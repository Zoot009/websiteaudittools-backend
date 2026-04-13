/**
 * Check if images have alt text
 */

import type { PageRule, PageData, SiteContext, RuleResult, Issue, PassingCheck, Severity } from '../../types.js';

export class ImageAltTextRule implements PageRule {
  code = 'IMAGE_ALT_TEXT';
  category = 'ON_PAGE' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    const images = page.images || [];

    if (images.length === 0) {
      // No images, nothing to check
      return { issues, passingChecks };
    }

    const imagesWithoutAlt = images.filter((img) => !img.alt || img.alt.trim().length === 0);

    if (imagesWithoutAlt.length > 0) {
      const severity: Severity = imagesWithoutAlt.length === images.length ? 'HIGH' : 'MEDIUM';
      const impactScore = Math.min(30, imagesWithoutAlt.length * 3);

      issues.push({
        category: this.category,
        type: this.code,
        title: 'Images Missing Alt Text',
        description: `${imagesWithoutAlt.length} of ${images.length} images are missing alt text. Alt text improves accessibility and image SEO.`,
        severity,
        impactScore,
        pageUrl: page.url,
        elementSelector: 'img:not([alt])',
      });
    } else {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'All Images Have Alt Text',
        description: `All ${images.length} images have alt text`,
        pageUrl: page.url,
        goodPractice:
          'Alt text improves accessibility for screen readers and helps search engines understand image content.',
      });
    }

    return { issues, passingChecks };
  }
}
