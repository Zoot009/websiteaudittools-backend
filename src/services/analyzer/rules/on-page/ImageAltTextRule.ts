import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck, Severity } from '../../types.js';

export class ImageAltTextRule implements PageRule {
  code = 'IMAGE_ALT_TEXT';
  category = 'ON_PAGE' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'IMAGE_ALT_TEXT',
    name: 'Image Alt Text',
    maxScore: 3,
    priority: 2,
    section: 'seo',
    informational: false,
    what: 'Alt text (alternative text) is an HTML attribute that describes what an image shows. It appears when images fail to load and is read by screen readers for visually impaired users.',
    why: 'Alt text is crucial for accessibility and image SEO. Search engines can\'t "see" images, so they rely on alt text to understand image content. It also helps images rank in Google Image Search, driving additional traffic.',
    how: 'Add descriptive alt text to all meaningful images: <img src="image.jpg" alt="descriptive text">. Describe what the image shows, include relevant keywords naturally, keep it concise (125 characters or less). Use alt="" for purely decorative images.',
    time: '60 minutes',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    const images = page.images ?? [];

    if (images.length === 0) {
      const stub: SEOAuditCheck = {
        ...this.checkDefinition,
        maxScore: 0,
        informational: true,
        category: this.category,
        passed: null,
        score: 0,
        shortAnswer: 'No images found on this page.',
        answer: 'Page has no images — image alt text check is not applicable.',
        recommendation: null,
        pageUrl: page.url,
      };
      return { check: stub, issues: [], passingChecks: [] };
    }

    const imagesWithoutAlt = images.filter(img => !img.alt || img.alt.trim().length === 0);
    const passed = imagesWithoutAlt.length === 0;
    const missedRatio = imagesWithoutAlt.length / images.length;
    const score = passed
      ? this.checkDefinition.maxScore
      : Math.max(0, Math.round(this.checkDefinition.maxScore * (1 - missedRatio)));

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score,
      shortAnswer: passed
        ? `All ${images.length} images have alt text.`
        : `${imagesWithoutAlt.length} of ${images.length} images are missing alt text.`,
      answer: passed
        ? `All ${images.length} images have alt text, improving accessibility and image SEO.`
        : `${imagesWithoutAlt.length} of ${images.length} images are missing alt text. Alt text improves accessibility and helps search engines understand image content.`,
      recommendation: passed ? null : 'Add descriptive alt text to all meaningful images. Use empty alt="" for decorative images.',
      data: { total: images.length, missing: imagesWithoutAlt.length },
      pageUrl: page.url,
    };

    const severity: Severity = imagesWithoutAlt.length === images.length ? 'HIGH' : 'MEDIUM';

    const issues = !passed ? [{
      category: this.category,
      type: this.code,
      title: 'Images Missing Alt Text',
      description: check.answer,
      severity,
      impactScore: Math.min(30, imagesWithoutAlt.length * 3),
      pageUrl: page.url,
      elementSelector: 'img:not([alt])',
    }] : [];

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: 'All Images Have Alt Text',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'Alt text improves accessibility for screen readers and helps search engines understand image content.',
    }] : [];

    return { check, issues, passingChecks };
  }
}
