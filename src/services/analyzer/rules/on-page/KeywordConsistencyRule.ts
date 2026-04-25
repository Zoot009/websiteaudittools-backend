import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

interface KeywordData {
  word: string;
  count: number;
  grade: number;
  title: boolean;
  description: boolean;
  headers: boolean;
}

interface PhraseData {
  word: string;
  count: number;
  grade: number;
  title: boolean;
  description: boolean;
  headers: boolean;
}

export class KeywordConsistencyRule implements PageRule {
  code = 'KEYWORD_CONSISTENCY';
  category = 'ON_PAGE' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'KEYWORD_CONSISTENCY',
    name: 'Keyword Consistency',
    maxScore: 3,
    priority: 2,
    section: 'seo',
    informational: false,
    what: 'Keyword consistency measures how well your target keywords are distributed across important page elements: title, meta description, headings, and body content.',
    why: 'Consistent use of keywords throughout your page helps search engines understand what you want to rank for. It signals topical relevance and reinforces your content\'s focus.',
    how: 'Identify your primary and secondary keywords. Include the primary keyword in your title tag, H1, meta description, first paragraph, and naturally throughout content. Use semantic variations and related terms.',
    time: '60 minutes',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    if (!page.title || !page.description || page.headings.length === 0) {
      const stub: SEOAuditCheck = {
        ...this.checkDefinition,
        maxScore: 0,
        informational: true,
        category: this.category,
        passed: null,
        score: 0,
        shortAnswer: 'Keyword consistency check skipped — missing title, description, or headings.',
        answer: 'Keyword consistency requires title, meta description, and headings to evaluate.',
        recommendation: null,
        pageUrl: page.url,
      };
      return { check: stub, issues: [], passingChecks: [] };
    }

    const titleText = page.title.toLowerCase();
    const descriptionText = page.description.toLowerCase();
    const headingText = page.headings.map(h => h.text.toLowerCase()).join(' ');
    const htmlText = page.html ? page.html.toLowerCase() : '';

    const keywords = this.extractKeywordsWithGrades(titleText, descriptionText, headingText, htmlText);
    const phrases = this.extractPhrasesWithGrades(titleText, descriptionText, headingText, htmlText);

    const topKeywords = keywords.slice(0, 8);
    const consistentKeywords = topKeywords.filter(kw => kw.title || kw.description || kw.headers);
    const consistencyScore = topKeywords.length > 0 ? consistentKeywords.length / topKeywords.length : 0;
    const passed = consistencyScore >= 0.5 && keywords.length > 0;

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score: passed ? this.checkDefinition.maxScore : Math.round(consistencyScore * this.checkDefinition.maxScore),
      shortAnswer: passed
        ? 'Good keyword consistency across title, description, and headings.'
        : 'Low keyword consistency — keywords don\'t appear consistently across page elements.',
      answer: passed
        ? 'Key terms appear consistently across title, meta description, and headings, reinforcing the page\'s topical relevance.'
        : `Keywords from title "${page.title}" don't consistently appear in meta description or headings. Improve topical consistency for better SEO.`,
      recommendation: passed ? null : 'Use target keywords consistently across title, meta description, headings, and body content.',
      data: {
        keywords: keywords.slice(0, 8),
        phrases: phrases.slice(0, 8),
        consistencyScore: Math.round(consistencyScore * 100),
      },
      pageUrl: page.url,
    };

    const issues = !passed ? [{
      category: this.category,
      type: this.code,
      title: 'Low Keyword Consistency',
      description: check.answer,
      severity: 'LOW' as const,
      impactScore: 8,
      pageUrl: page.url,
    }] : [];

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: 'Good Keyword Consistency',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'Keyword consistency reinforces page topic and helps search engines understand your content focus.',
      data: { keywords: keywords.slice(0, 8), phrases: phrases.slice(0, 8) },
    }] : [];

    return { check, issues, passingChecks };
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the', 'and', 'for', 'with', 'from', 'about', 'this', 'that', 'your', 'our',
      'are', 'was', 'were', 'been', 'have', 'has', 'had', 'will', 'can', 'may',
      'into', 'over', 'after', 'through', 'than', 'when', 'which', 'their', 'them',
    ]);
    return text.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !stopWords.has(w));
  }

  private extractKeywordsWithGrades(
    title: string,
    description: string,
    headings: string,
    html: string,
  ): KeywordData[] {
    const words = this.extractKeywords(`${title} ${description} ${headings} ${html}`);
    const wordCounts = new Map<string, number>();
    words.forEach(w => wordCounts.set(w, (wordCounts.get(w) ?? 0) + 1));

    const maxCount = Math.max(...Array.from(wordCounts.values()), 1);
    const result: KeywordData[] = [];

    for (const [word, count] of wordCounts.entries()) {
      const inTitle = title.includes(word);
      const inDescription = description.includes(word);
      const inHeaders = headings.includes(word);
      let grade = (count / maxCount) * 50;
      if (inTitle) grade += 25;
      if (inDescription) grade += 15;
      if (inHeaders) grade += 10;
      result.push({ word, count, grade: Math.min(100, Math.round(grade)), title: inTitle, description: inDescription, headers: inHeaders });
    }

    return result.sort((a, b) => b.grade - a.grade);
  }

  private extractPhrasesWithGrades(
    title: string,
    description: string,
    headings: string,
    html: string,
  ): PhraseData[] {
    const words = this.extractKeywords(`${title} ${description} ${headings} ${html}`);
    const phraseCounts = new Map<string, number>();
    for (let i = 0; i < words.length - 1; i++) {
      const phrase = `${words[i]} ${words[i + 1]}`;
      phraseCounts.set(phrase, (phraseCounts.get(phrase) ?? 0) + 1);
    }

    const maxCount = Math.max(...Array.from(phraseCounts.values()), 1);
    const result: PhraseData[] = [];

    for (const [phrase, count] of phraseCounts.entries()) {
      if (count < 2) continue;
      const inTitle = title.includes(phrase);
      const inDescription = description.includes(phrase);
      const inHeaders = headings.includes(phrase);
      let grade = (count / maxCount) * 50;
      if (inTitle) grade += 25;
      if (inDescription) grade += 15;
      if (inHeaders) grade += 10;
      result.push({ word: phrase, count, grade: Math.min(100, Math.round(grade)), title: inTitle, description: inDescription, headers: inHeaders });
    }

    return result.sort((a, b) => b.grade - a.grade);
  }
}
