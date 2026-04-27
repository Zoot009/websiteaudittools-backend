import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class OpenGraphTagsRule implements PageRule {
  code = 'OPEN_GRAPH_TAGS';
  category = 'STRUCTURED_DATA' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'OPEN_GRAPH_TAGS',
    name: 'Open Graph Tags',
    maxScore: 3,
    priority: 2,
    section: 'social',
    informational: false,
    what: 'Open Graph (OG) tags are meta tags that control how your page appears when shared on social media platforms like Facebook, LinkedIn, and Slack.',
    why: 'Without OG tags, social platforms generate unpredictable previews using whatever text and image they find on the page. Proper OG tags increase click-through rates from social shares by 200-400%.',
    how: 'Add at minimum og:title, og:description, and og:image to every page\'s <head>. Ensure og:image is at least 1200x630px. Use og:type="website" for homepages and og:type="article" for blog posts.',
    time: '1-2 hours',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    const ogTags = page.ogTags;

    if (!ogTags) {
      const stub: SEOAuditCheck = {
        ...this.checkDefinition,
        maxScore: 0,
        informational: true,
        category: this.category,
        passed: null,
        score: 0,
        shortAnswer: 'Open Graph tag data not available.',
        answer: 'Open Graph tags could not be detected for this page.',
        recommendation: null,
        pageUrl: page.url,
      };
      return { check: stub, issues: [], passingChecks: [] };
    }

    const missingTags: string[] = [];
    const presentTags: string[] = [];

    if (!ogTags.title) missingTags.push('og:title'); else presentTags.push('og:title');
    if (!ogTags.description) missingTags.push('og:description'); else presentTags.push('og:description');
    if (!ogTags.image) missingTags.push('og:image'); else presentTags.push('og:image');
    if (ogTags.type) presentTags.push('og:type');
    if (ogTags.url) presentTags.push('og:url');
    if (ogTags.siteName) presentTags.push('og:site_name');

    const passed = missingTags.length === 0;
    const score = passed
      ? this.checkDefinition.maxScore
      : missingTags.length === 1
        ? 2
        : missingTags.length === 2
          ? 1
          : 0;

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score,
      shortAnswer: passed
        ? `Open Graph tags fully configured (${presentTags.length} tags).`
        : `Missing ${missingTags.length} Open Graph tag(s): ${missingTags.join(', ')}.`,
      answer: passed
        ? `All essential Open Graph tags are configured (${presentTags.join(', ')}), ensuring great social media share previews.`
        : `Page is missing ${missingTags.length} essential Open Graph tag(s): ${missingTags.join(', ')}. This leads to poor social media share previews on Facebook, LinkedIn, and Slack.`,
      recommendation: passed ? null : `Add the missing Open Graph tags to your page's <head>: ${missingTags.join(', ')}. Ensure og:image is at least 1200x630px.`,
      data: { missingTags, presentTags, ogTags },
      pageUrl: page.url,
    };

    const issues = !passed ? [{
      category: this.category,
      type: this.code,
      title: 'Missing Open Graph Tags',
      description: check.answer,
      severity: (missingTags.length >= 2 ? 'HIGH' : 'MEDIUM') as 'HIGH' | 'MEDIUM',
      impactScore: missingTags.length >= 2 ? 15 : 10,
      pageUrl: page.url,
    }] : [];

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: 'Open Graph Tags Present',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'Open Graph tags ensure your content looks great when shared on social media platforms like Facebook, LinkedIn, and other social networks.',
    }] : [];

    return { check, issues, passingChecks };
  }
}
