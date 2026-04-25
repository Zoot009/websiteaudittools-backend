/**
 * Check LLM readability - measures how much content is available in raw HTML vs JavaScript-rendered
 * AI crawlers typically read static HTML, not JavaScript-rendered content
 */

import type { PageRule, PageData, SiteContext, RuleResult, Issue, PassingCheck } from '../../types.js';
import { getRecommendationContent } from '../../templates/checkContent.js';

export class LLMReadabilityRule implements PageRule {
  code = 'LLM_READABILITY';
  category = 'PERFORMANCE' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    const recommendationContent = getRecommendationContent(this.code);

    // Check if renderMetrics are available (requires enhanced crawler)
    if (!page.renderMetrics) {
      // Skip check if we don't have render metrics
      return { issues, passingChecks };
    }

    const { initialSize, renderedSize, percentage } = page.renderMetrics;
    
    // Low rendering percentage = good for LLMs (content is in HTML)
    // High rendering percentage = bad for LLMs (content rendered by JS)
    
    if (percentage > 50) {
      issues.push({
        category: this.category,
        type: 'HIGH_JS_RENDERING',
        title: 'High JavaScript Rendering',
        description: `${percentage}% of page content is JavaScript-rendered. This content may be invisible to AI crawlers and LLMs, potentially excluding you from AI-generated answers.`,
        severity: 'LOW' as const,
        impactScore: 8,
        pageUrl: page.url,
        recommendation: 'Implement server-side rendering (SSR) or static site generation (SSG) to make content available in initial HTML.',
        ...(recommendationContent && { recommendationContent }),
        data: {
          initialSize,
          renderedSize,
          renderingPercentage: percentage,
          llmReadable: 'poor'
        }
      });
    } else if (percentage > 25) {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'Moderate LLM Readability',
        description: `${percentage}% of content is JavaScript-rendered. Most content is accessible to AI crawlers.`,
        pageUrl: page.url,
        goodPractice: 'Keeping most content in initial HTML ensures accessibility to search engines and AI systems.',
        ...(recommendationContent && { recommendationContent }),
        data: {
          initialSize,
          renderedSize,
          renderingPercentage: percentage,
          llmReadable: 'good'
        }
      });
    } else {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'Excellent LLM Readability',
        description: `Only ${percentage}% of content is JavaScript-rendered. Content is highly accessible to AI crawlers and LLMs.`,
        pageUrl: page.url,
        goodPractice: 'Low JavaScript rendering ensures your content is accessible to search engines, AI systems, and assistive technologies.',
        ...(recommendationContent && { recommendationContent }),
        data: {
          initialSize,
          renderedSize,
          renderingPercentage: percentage,
          llmReadable: 'excellent'
        }
      });
    }

    return { issues, passingChecks };
  }
}
