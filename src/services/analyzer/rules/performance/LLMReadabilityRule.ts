import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class LLMReadabilityRule implements PageRule {
  code = 'LLM_READABILITY';
  category = 'PERFORMANCE' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'LLM_READABILITY',
    name: 'LLM Readability',
    maxScore: 2,
    priority: 3,
    section: 'performance',
    informational: false,
    what: 'LLM readability measures how much of your page content is available in the initial HTML vs rendered only through JavaScript. AI crawlers and LLMs typically read static HTML, not JavaScript-rendered content.',
    why: 'As AI-powered search and AI answer engines grow, ensuring your content is readable by LLMs becomes increasingly important. Heavy JavaScript rendering may make your content invisible to AI crawlers.',
    how: 'Implement server-side rendering (SSR) or static site generation (SSG) for content-heavy pages. Ensure critical content is present in the initial HTML. Test your site with JavaScript disabled to see what\'s accessible.',
    time: '4-8 hours',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    if (!page.renderMetrics) {
      const stub: SEOAuditCheck = {
        ...this.checkDefinition,
        maxScore: 0,
        informational: true,
        category: this.category,
        passed: null,
        score: 0,
        shortAnswer: 'LLM readability data not available.',
        answer: 'Render metrics could not be collected for this page.',
        recommendation: null,
        pageUrl: page.url,
      };
      return { check: stub, issues: [], passingChecks: [] };
    }

    const { initialSize, renderedSize, percentage } = page.renderMetrics;
    const passed = percentage <= 50;
    const score = percentage <= 25
      ? this.checkDefinition.maxScore
      : percentage <= 50
        ? 1
        : 0;

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score,
      shortAnswer: percentage <= 25
        ? `Excellent LLM readability (${percentage}% JS-rendered).`
        : percentage <= 50
          ? `Good LLM readability (${percentage}% JS-rendered).`
          : `Poor LLM readability (${percentage}% JS-rendered).`,
      answer: percentage <= 25
        ? `Only ${percentage}% of content is JavaScript-rendered. Content is highly accessible to AI crawlers and LLMs.`
        : percentage <= 50
          ? `${percentage}% of content is JavaScript-rendered. Most content is accessible to AI crawlers.`
          : `${percentage}% of content is JavaScript-rendered. This content may be invisible to AI crawlers and LLMs.`,
      recommendation: passed ? null : 'Implement server-side rendering (SSR) or static site generation (SSG) to make content available in the initial HTML.',
      value: percentage,
      data: { initialSize, renderedSize, renderingPercentage: percentage },
      pageUrl: page.url,
    };

    const issues = !passed ? [{
      category: this.category,
      type: this.code,
      title: 'High JavaScript Rendering',
      description: check.answer,
      severity: 'LOW' as const,
      impactScore: 8,
      pageUrl: page.url,
    }] : [];

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: score === this.checkDefinition.maxScore ? 'Excellent LLM Readability' : 'Good LLM Readability',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'Low JavaScript rendering ensures your content is accessible to search engines, AI systems, and assistive technologies.',
    }] : [];

    return { check, issues, passingChecks };
  }
}
