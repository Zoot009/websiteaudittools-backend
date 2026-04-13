/**
 * Check keyword consistency across title, description, and headings
 */

import type { PageRule, PageData, SiteContext, RuleResult, Issue, PassingCheck } from '../../types.js';

export class KeywordConsistencyRule implements PageRule {
  code = 'KEYWORD_CONSISTENCY';
  category = 'ON_PAGE' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    // Skip if missing critical elements
    if (!page.title || !page.description || page.headings.length === 0) {
      return { issues, passingChecks };
    }

    // Extract keywords from title (words > 3 characters, excluding common words)
    const titleKeywords = this.extractKeywords(page.title);

    if (titleKeywords.length === 0) {
      return { issues, passingChecks };
    }

    // Check if top keywords appear in description and headings
    const descriptionText = page.description.toLowerCase();
    const headingTexts = page.headings
      .slice(0, 3) // Top 3 headings
      .map((h) => h.text.toLowerCase())
      .join(' ');

    const keywordsInDescription = titleKeywords.filter((kw) => descriptionText.includes(kw));
    const keywordsInHeadings = titleKeywords.filter((kw) => headingTexts.includes(kw));

    const consistencyScore =
      (keywordsInDescription.length + keywordsInHeadings.length) / (titleKeywords.length * 2);

    if (consistencyScore < 0.3) {
      issues.push({
        category: this.category,
        type: this.code,
        title: 'Low Keyword Consistency',
        description: `Keywords from title "${page.title}" don't consistently appear in meta description or headings. Improve topical consistency for better SEO.`,
        severity: 'LOW' as const,
        impactScore: 8,
        pageUrl: page.url,
      });
    } else {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'Good Keyword Consistency',
        description: 'Key terms appear consistently across title, description, and headings',
        pageUrl: page.url,
        goodPractice:
          'Keyword consistency reinforces page topic and helps search engines understand your content focus.',
      });
    }

    return { issues, passingChecks };
  }

  private extractKeywords(text: string): string[] {
    const commonWords = new Set([
      'the',
      'and',
      'for',
      'with',
      'from',
      'about',
      'this',
      'that',
      'your',
      'our',
      'are',
      'was',
      'were',
      'been',
      'have',
      'has',
      'had',
      'will',
      'can',
      'may',
    ]);

    return text
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 3 && !commonWords.has(word))
      .slice(0, 5); // Top 5 keywords
  }
}
