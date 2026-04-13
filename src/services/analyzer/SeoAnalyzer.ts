/**
 * Main SEO Analyzer class
 * Orchestrates rule execution and score calculation
 */

import type { IssueCategory } from './types';
import type {
  PageData,
  SiteContext,
  AnalysisResult,
  Issue,
  CategoryWeights,
  PageHeadingSummary,
  HeadingFrequency,
  PageKeywordConsistency,
  KeywordEntry,
} from './types';
import {
  DEFAULT_CATEGORY_WEIGHTS,
  SEVERITY_MULTIPLIERS,
} from './types.js';
import { RuleRegistry } from './RuleRegistry.js';
import { RuleEngine } from './RuleEngine.js';
import { buildSiteContext } from './siteContextBuilder.js';

// Import all rules (will be added as we create them)
// Technical rules
import { HTTPSCheckRule } from './rules/technical/HTTPSCheckRule.js';
import { SSLEnabledRule } from './rules/technical/SSLEnabledRule.js';
import { CanonicalTagRule } from './rules/technical/CanonicalTagRule.js';
import { NoindexTagRule } from './rules/technical/NoindexTagRule.js';
import { XMLSitemapRule } from './rules/technical/XMLSitemapRule.js';
import { CharsetRule } from './rules/technical/CharsetRule.js';
import { MissingRobotsRule } from './rules/technical/MissingRobotsRule.js';
import { HTTP2Rule } from './rules/technical/HTTP2Rule.js';

// On-page rules
import { TitleTagRule } from './rules/on-page/TitleTagRule.js';
import { MetaDescriptionRule } from './rules/on-page/MetaDescriptionRule.js';
import { H1TagRule } from './rules/on-page/H1TagRule.js';
import { HeadingHierarchyRule } from './rules/on-page/HeadingHierarchyRule.js';
import { KeywordConsistencyRule } from './rules/on-page/KeywordConsistencyRule.js';
import { WordCountRule } from './rules/on-page/WordCountRule.js';
import { ImageAltTextRule } from './rules/on-page/ImageAltTextRule.js';
import { HreflangRule } from './rules/on-page/HreflangRule.js';
import { LangAttributeRule } from './rules/on-page/LangAttributeRule.js';
import { SERPSnippetRule } from './rules/on-page/SERPSnippetRule.js';
import { FriendlyURLRule } from './rules/on-page/FriendlyURLRule.js';

// Performance rules
import { CoreWebVitalsRule } from './rules/performance/CoreWebVitalsRule.js';
import { LoadTimeRule } from './rules/performance/LoadTimeRule.js';
import { FlashUsageRule } from './rules/performance/FlashUsageRule.js';
import { PageSizeRule } from './rules/performance/PageSizeRule.js';
import { ResourceCountRule } from './rules/performance/ResourceCountRule.js';
import { ImageOptimizationRule } from './rules/performance/ImageOptimizationRule.js';
import { MinificationRule } from './rules/performance/MinificationRule.js';

// Links rules
import { LinkStructureRule } from './rules/links/LinkStructureRule.js';

// Usability rules
import { IFrameUsageRule } from './rules/usability/IFrameUsageRule.js';
import { EmailPrivacyRule } from './rules/usability/EmailPrivacyRule.js';
import { DeprecatedTagsRule } from './rules/usability/DeprecatedTagsRule.js';
import { InlineStylesRule } from './rules/usability/InlineStylesRule.js';
import { MobileViewportRule } from './rules/usability/MobileViewportRule.js';
import { FaviconRule } from './rules/usability/FaviconRule.js';
import { FontSizeRule } from './rules/usability/FontSizeRule.js';
import { TapTargetSizeRule } from './rules/usability/TapTargetSizeRule.js';

// Social rules
import { FacebookLinkRule } from './rules/social/FacebookLinkRule.js';
import { FacebookPixelRule } from './rules/social/FacebookPixelRule.js';
import { TwitterLinkRule } from './rules/social/TwitterLinkRule.js';
import { InstagramLinkRule } from './rules/social/InstagramLinkRule.js';
import { LinkedInLinkRule } from './rules/social/LinkedInLinkRule.js';
import { YouTubeLinkRule } from './rules/social/YouTubeLinkRule.js';
import { LocalSEORule } from './rules/social/LocalSEORule.js';
import { OpenGraphTagsRule } from './rules/social/OpenGraphTagsRule.js';
import { TwitterCardTagsRule } from './rules/social/TwitterCardTagsRule.js';

export class SeoAnalyzer {
  private registry: RuleRegistry;
  private engine: RuleEngine;
  private categoryWeights: CategoryWeights;

  constructor(categoryWeights: CategoryWeights = DEFAULT_CATEGORY_WEIGHTS) {
    this.registry = new RuleRegistry();
    this.engine = new RuleEngine(this.registry);
    this.categoryWeights = categoryWeights;
    this.registerAllRules();
  }

  /**
   * Main analysis method
   */
  async analyze(pages: PageData[], baseUrl: string): Promise<AnalysisResult> {
    console.log(`[SeoAnalyzer] Starting analysis for ${pages.length} pages from ${baseUrl}`);

    // Step 1: Build site context
    const context = await buildSiteContext(pages, baseUrl);
    console.log(`[SeoAnalyzer] Built site context: ${context.totalPages} pages`);

    // Step 2: Run all rules
    const ruleResult = this.engine.runAllRules(pages, context);
    console.log(
      `[SeoAnalyzer] Found ${ruleResult.issues.length} issues and ${ruleResult.passingChecks.length} passing checks`
    );

    // Step 3: Calculate scores
    const categoryScores = this.calculateCategoryScores(ruleResult.issues);
    const overallScore = this.calculateOverallScore(categoryScores);

    return {
      overallScore,
      totalIssues: ruleResult.issues.length,
      categoryScores,
      issues: ruleResult.issues,
      passingChecks: ruleResult.passingChecks,
      pageHeadings: this.buildPageHeadings(pages),
      keywordConsistency: this.buildKeywordConsistency(pages),
    };
  }

  /**
   * Build per-page heading frequency data
   */
  private buildPageHeadings(pages: PageData[]): PageHeadingSummary[] {
    return pages.map((page) => {
      const levelMap = new Map<number, string[]>();
      for (const heading of page.headings) {
        const existing = levelMap.get(heading.level) ?? [];
        existing.push(heading.text);
        levelMap.set(heading.level, existing);
      }
      const frequency: HeadingFrequency[] = ([1, 2, 3, 4, 5, 6] as const).map((level) => ({
        level,
        tag: `H${level}`,
        count: levelMap.get(level)?.length ?? 0,
        values: levelMap.get(level) ?? [],
      }));
      return { pageUrl: page.url, frequency };
    });
  }

  // ── Keyword consistency ─────────────────────────────────────────────

  private readonly STOP_WORDS = new Set([
    'the', 'and', 'for', 'with', 'from', 'about', 'this', 'that', 'your', 'our',
    'are', 'was', 'were', 'been', 'have', 'has', 'had', 'will', 'can', 'may',
    'all', 'but', 'not', 'you', 'we', 'he', 'she', 'they', 'it', 'its',
    'be', 'by', 'as', 'at', 'of', 'on', 'in', 'to', 'a', 'is', 'an',
    'or', 'if', 'so', 'do', 'go', 'get', 'got', 'also', 'more', 'than',
    'when', 'who', 'how', 'what', 'why', 'where', 'which', 'their', 'them',
    'into', 'up', 'out', 'no', 'yes', 'new', 'use', 'used', 'using',
    'one', 'two', 'three', 'these', 'those', 'then', 'there', 'here',
    'just', 'only', 'very', 'some', 'any', 'such', 'each', 'other',
  ]);

  private extractTextFromHtml(html: string): string {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#\d+;/g, ' ')
      .toLowerCase();
  }

  private tokenize(text: string): string[] {
    return text
      .split(/\W+/)
      .filter((w) => w.length > 3 && !this.STOP_WORDS.has(w));
  }

  private countFreq(words: string[]): Map<string, number> {
    const freq = new Map<string, number>();
    for (const word of words) {
      freq.set(word, (freq.get(word) ?? 0) + 1);
    }
    return freq;
  }

  private countBigrams(words: string[]): Map<string, number> {
    const freq = new Map<string, number>();
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      freq.set(bigram, (freq.get(bigram) ?? 0) + 1);
    }
    return freq;
  }

  private topEntries(freq: Map<string, number>, limit: number): Array<[string, number]> {
    return Array.from(freq.entries())
      .filter(([, c]) => c >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  }

  private buildKeywordConsistency(pages: PageData[]): PageKeywordConsistency[] {
    return pages.map((page) => {
      const bodyText = this.extractTextFromHtml(page.html);
      const titleLc = (page.title ?? '').toLowerCase();
      const descLc = (page.description ?? '').toLowerCase();
      const headingLc = page.headings.map((h) => h.text.toLowerCase()).join(' ');

      const words = this.tokenize(bodyText);
      const wordFreq = this.countFreq(words);
      const bigramFreq = this.countBigrams(words);

      const toEntry = (kw: string, freq: number): KeywordEntry => ({
        keyword: kw,
        inTitle: titleLc.includes(kw),
        inMetaDescription: descLc.includes(kw),
        inHeadingTags: headingLc.includes(kw),
        pageFrequency: freq,
      });

      const keywords = this.topEntries(wordFreq, 10).map(([kw, f]) => toEntry(kw, f));
      const phrases = this.topEntries(bigramFreq, 7).map(([kw, f]) => toEntry(kw, f));

      // Pass if at least 3 of the top 5 keywords appear in at least one important tag
      const passed =
        keywords
          .slice(0, 5)
          .filter((k) => k.inTitle || k.inMetaDescription || k.inHeadingTags)
          .length >= 3;

      return {
        pageUrl: page.url,
        passed,
        message: passed
          ? "Your page's main keywords are distributed well across the important HTML Tags."
          : 'Some of your main keywords are missing from important HTML Tags (title, description, headings).',
        keywords,
        phrases,
      };
    });
  }

  /**
   * Calculate score for each category
   */
  private calculateCategoryScores(
    issues: Issue[]
  ): Array<{ category: string; score: number; issueCount: number }> {
    // Group issues by category
    const issuesByCategory = new Map<IssueCategory, Issue[]>();

    for (const issue of issues) {
      if (!issuesByCategory.has(issue.category)) {
        issuesByCategory.set(issue.category, []);
      }
      issuesByCategory.get(issue.category)!.push(issue);
    }

    // Calculate score per category
    const categoryScores: Array<{ category: string; score: number; issueCount: number }> = [];

    // Include ALL categories, even if no issues
    const allCategories: IssueCategory[] = [
      'TECHNICAL',
      'ON_PAGE',
      'PERFORMANCE',
      'ACCESSIBILITY',
      'LINKS',
      'STRUCTURED_DATA',
      'SECURITY',
    ];

    for (const category of allCategories) {
      const categoryIssues = issuesByCategory.get(category) || [];

      if (categoryIssues.length === 0) {
        // Perfect score if no issues
        categoryScores.push({
          category,
          score: 100,
          issueCount: 0,
        });
        continue;
      }

      // Calculate total weighted impact
      const totalImpact = categoryIssues.reduce((sum, issue) => {
        const severityMultiplier = SEVERITY_MULTIPLIERS[issue.severity as keyof typeof SEVERITY_MULTIPLIERS] || 1;
        return sum + issue.impactScore * severityMultiplier;
      }, 0);

      // Normalize to 0-100 scale
      // Max possible impact: assume 20 critical issues at 100 impact each
      const maxPossibleImpact = 20 * 100 * SEVERITY_MULTIPLIERS.CRITICAL;
      const impactRatio = Math.min(totalImpact / maxPossibleImpact, 1);
      const score = Math.max(0, 100 - impactRatio * 100);

      categoryScores.push({
        category,
        score: Math.round(score),
        issueCount: categoryIssues.length,
      });
    }

    return categoryScores;
  }

  /**
   * Calculate overall score from category scores
   */
  private calculateOverallScore(
    categoryScores: Array<{ category: string; score: number }>
  ): number {
    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const { category, score } of categoryScores) {
      const weight = this.categoryWeights[category as keyof CategoryWeights] || 0;
      totalWeightedScore += score * weight;
      totalWeight += weight;
    }

    // Ensure weights sum to 1.0
    if (totalWeight === 0) {
      return 0;
    }

    const overallScore = totalWeightedScore / totalWeight;
    return Math.round(overallScore);
  }

  /**
   * Register all SEO rules
   */
  private registerAllRules(): void {
    try {
      // Technical rules (8)
      this.registry.register(new HTTPSCheckRule());
      this.registry.register(new SSLEnabledRule());
      this.registry.register(new CanonicalTagRule());
      this.registry.register(new NoindexTagRule());
      this.registry.register(new XMLSitemapRule());
      this.registry.register(new CharsetRule());
      this.registry.register(new MissingRobotsRule());
      this.registry.register(new HTTP2Rule());
      this.registry.register(new HTTP2Rule());

      // On-page rules (11)
      this.registry.register(new TitleTagRule());
      this.registry.register(new MetaDescriptionRule());
      this.registry.register(new H1TagRule());
      this.registry.register(new HeadingHierarchyRule());
      this.registry.register(new KeywordConsistencyRule());
      this.registry.register(new WordCountRule());
      this.registry.register(new ImageAltTextRule());
      this.registry.register(new HreflangRule());
      this.registry.register(new LangAttributeRule());
      this.registry.register(new SERPSnippetRule());
      this.registry.register(new FriendlyURLRule());

      // Performance rules (7)
      this.registry.register(new CoreWebVitalsRule());
      this.registry.register(new LoadTimeRule());
      this.registry.register(new FlashUsageRule());
      this.registry.register(new PageSizeRule());
      this.registry.register(new ResourceCountRule());
      this.registry.register(new ImageOptimizationRule());
      this.registry.register(new MinificationRule());

      // Links rules (1)
      this.registry.register(new LinkStructureRule());

      // Usability rules (8)
      this.registry.register(new IFrameUsageRule());
      this.registry.register(new EmailPrivacyRule());
      this.registry.register(new DeprecatedTagsRule());
      this.registry.register(new InlineStylesRule());
      this.registry.register(new MobileViewportRule());
      this.registry.register(new FaviconRule());
      this.registry.register(new FontSizeRule());
      this.registry.register(new TapTargetSizeRule());

      // Social rules (9)
      this.registry.register(new FacebookLinkRule());
      this.registry.register(new FacebookPixelRule());
      this.registry.register(new TwitterLinkRule());
      this.registry.register(new InstagramLinkRule());
      this.registry.register(new LinkedInLinkRule());
      this.registry.register(new YouTubeLinkRule());
      this.registry.register(new LocalSEORule());
      this.registry.register(new OpenGraphTagsRule());
      this.registry.register(new TwitterCardTagsRule());

      const stats = this.registry.getStats();
      console.log(`[SeoAnalyzer] Registered ${stats.total} rules:`, stats.byCategory);
    } catch (error) {
      console.error('[SeoAnalyzer] Error registering rules:', error);
      throw error;
    }
  }

  /**
   * Get statistics about registered rules
   */
  getStats() {
    return this.registry.getStats();
  }
}
