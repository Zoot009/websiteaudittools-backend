/**
 * Main SEO Analyzer class
 * Orchestrates rule execution and score calculation
 */

import type { IssueCategory } from './types';
import type {
  PageData,
  SiteContext,
  AnalysisResult,
  EngineResult,
  Issue,
  PassingCheck,
  SEOAuditCheck,
  CategoryWeights,
  CategoryScore,
  ScoreSummary,
  PageHeadingSummary,
  HeadingFrequency,
  PageKeywordConsistency,
  KeywordEntry,
} from './types';
import { DEFAULT_CATEGORY_WEIGHTS } from './types.js';
import {
  calculateGrade,
  calculateTier,
  calculateFinalScoreFromChecks,
  calculateSectionScoresFromChecks,
  getScoreInsight,
  CATEGORY_WEIGHTS,
} from './scoring.js';
import { RuleRegistry } from './RuleRegistry.js';
import { RuleEngine } from './RuleEngine.js';
import { buildSiteContext } from './siteContextBuilder.js';

// Technical rules
import { HTTPSCheckRule } from './rules/technical/HTTPSCheckRule.js';
import { SSLEnabledRule } from './rules/technical/SSLEnabledRule.js';
import { CanonicalTagRule } from './rules/technical/CanonicalTagRule.js';
import { NoindexTagRule } from './rules/technical/NoindexTagRule.js';
import { NoindexHeaderRule } from './rules/technical/NoindexHeaderRule.js';
import { RobotsTxtBlockingRule } from './rules/technical/RobotsTxtBlockingRule.js';
import { XMLSitemapRule } from './rules/technical/XMLSitemapRule.js';
import { CharsetRule } from './rules/technical/CharsetRule.js';
import { MissingRobotsRule } from './rules/technical/MissingRobotsRule.js';
import { HTTP2Rule } from './rules/technical/HTTP2Rule.js';
import { ServerSoftwareRule } from './rules/technical/ServerSoftwareRule.js';
import { AnalyticsDetectionRule } from './rules/technical/AnalyticsDetectionRule.js';
import { DMARCRecordRule } from './rules/technical/DMARCRecordRule.js';
import { SPFRecordRule } from './rules/technical/SPFRecordRule.js';
import { DNSCheckRule } from './rules/technical/DNSCheckRule.js';
import { IPAddressRule } from './rules/technical/IPAddressRule.js';

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
import { PageSpeedMobileRule } from './rules/performance/PageSpeedMobileRule.js';
import { PageSpeedDesktopRule } from './rules/performance/PageSpeedDesktopRule.js';
import { CompressionRule } from './rules/performance/CompressionRule.js';
import { JavaScriptErrorsRule } from './rules/performance/JavaScriptErrorsRule.js';
import { AMPRule } from './rules/performance/AMPRule.js';
import { LLMReadabilityRule } from './rules/performance/LLMReadabilityRule.js';

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
import { YouTubeActivityRule } from './rules/social/YouTubeActivityRule.js';
import { LocalSEORule } from './rules/social/LocalSEORule.js';
import { OpenGraphTagsRule } from './rules/social/OpenGraphTagsRule.js';
import { TwitterCardTagsRule } from './rules/social/TwitterCardTagsRule.js';

// Structured Data rules
import { IdentitySchemaRule } from './rules/structured-data/IdentitySchemaRule.js';
import { LocalBusinessSchemaRule } from './rules/structured-data/LocalBusinessSchemaRule.js';
import { GoogleBusinessProfileRule } from './rules/structured-data/GoogleBusinessProfileRule.js';

type AsyncSiteRule = {
  code: string;
  checkDefinition: import('./types.js').CheckDefinition;
  category: IssueCategory;
  executeAsync: (pages: PageData[], context: SiteContext) => Promise<import('./types.js').RuleResult>;
};

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

    // Step 2: Run sync rules then async site-level rules
    const syncResult = this.engine.runAllRules(pages, context);
    const asyncResult = await this.runAsyncSiteRules(pages, context);

    // Step 3: Deduplicate checks — one check per rule ID, worst score wins
    const allChecks = [...syncResult.checks, ...asyncResult.checks];
    const checks = this.deduplicateChecks(allChecks);

    const issues: Issue[] = [...syncResult.issues, ...asyncResult.issues];
    const passingChecks: PassingCheck[] = [...syncResult.passingChecks, ...asyncResult.passingChecks];

    console.log(
      `[SeoAnalyzer] ${checks.length} unique checks, ${issues.length} issues, ${passingChecks.length} passing`
    );

    // Step 4: Score
    const sectionScores = calculateSectionScoresFromChecks(checks);
    const categoryScores = this.calculateCategoryScores(checks);
    const overallScore = calculateFinalScoreFromChecks(checks);
    const overallGrade = calculateGrade(overallScore);
    const overallTier = calculateTier(overallScore);

    // Step 5: Build summary
    const scoreSummary = this.buildScoreSummary(
      overallScore,
      overallGrade,
      overallTier,
      categoryScores,
      issues.length,
      passingChecks.length,
      pages.length
    );

    return {
      overallScore,
      overallGrade,
      overallTier,
      totalIssues: issues.length,
      categoryScores,
      sectionScores,
      scoreSummary,
      checks,
      issues,
      passingChecks,
      pageHeadings: this.buildPageHeadings(pages),
      keywordConsistency: this.buildKeywordConsistency(pages),
    };
  }

  /**
   * Deduplicate checks: one entry per check ID.
   * - Non-informational beats informational (maxScore > 0 wins over maxScore = 0).
   * - Among equally non-informational checks, keep the worst score ratio (most critical page).
   */
  private deduplicateChecks(checks: SEOAuditCheck[]): SEOAuditCheck[] {
    const byId = new Map<string, SEOAuditCheck>();

    for (const check of checks) {
      const existing = byId.get(check.id);

      if (!existing) {
        byId.set(check.id, check);
        continue;
      }

      // Prefer real check over informational stub
      if (existing.maxScore === 0 && check.maxScore > 0) {
        byId.set(check.id, check);
        continue;
      }
      if (existing.maxScore > 0 && check.maxScore === 0) {
        continue;
      }

      // Both non-informational: keep the worst ratio (lowest score / maxScore)
      const existingRatio = existing.score / existing.maxScore;
      const newRatio = check.score / check.maxScore;
      if (newRatio < existingRatio) {
        byId.set(check.id, check);
      }
    }

    const sectionOrder: Record<string, number> = {
      seo: 0,
      technology: 1,
      performance: 2,
      ui: 3,
      links: 4,
      social: 5,
      geo: 6,
    };

    return Array.from(byId.values()).sort((a, b) => {
      const sd = (sectionOrder[a.section] ?? 99) - (sectionOrder[b.section] ?? 99);
      if (sd !== 0) return sd;
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.id.localeCompare(b.id);
    });
  }

  private async runAsyncSiteRules(pages: PageData[], context: SiteContext): Promise<EngineResult> {
    const checks: SEOAuditCheck[] = [];
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    const asyncRules: AsyncSiteRule[] = [
      new DMARCRecordRule(),
      new SPFRecordRule(),
      new DNSCheckRule(),
      new IPAddressRule(),
    ];

    const results = await Promise.allSettled(
      asyncRules.map((rule) => rule.executeAsync(pages, context))
    );

    results.forEach((result, i) => {
      const ruleCode = asyncRules[i]?.code ?? 'UNKNOWN';
      if (result.status === 'fulfilled') {
        checks.push(result.value.check);
        issues.push(...result.value.issues);
        passingChecks.push(...result.value.passingChecks);
      } else {
        console.error(`[SeoAnalyzer] Async rule ${ruleCode} failed:`, result.reason);
      }
    });

    return { checks, issues, passingChecks };
  }

  /**
   * Calculate per-category scores from the deduplicated checks.
   */
  private calculateCategoryScores(checks: SEOAuditCheck[]): CategoryScore[] {
    const allCategories: IssueCategory[] = [
      'TECHNICAL', 'ON_PAGE', 'PERFORMANCE', 'ACCESSIBILITY',
      'LINKS', 'STRUCTURED_DATA', 'SECURITY',
    ];

    return allCategories.map((category) => {
      const scorable = checks.filter((c) => c.category === category && c.maxScore > 0);
      const failed   = checks.filter((c) => c.category === category && c.passed === false);
      const passed   = checks.filter((c) => c.category === category && c.passed === true);

      let weightedSum = 0;
      for (const c of scorable) {
        const normalized = Math.max(0, Math.min(1, c.score / c.maxScore));
        const weight = c.priority === 1 ? 1.0 : c.priority === 2 ? 0.7 : 0.4;
        weightedSum += normalized * weight;
      }

      const score = scorable.length > 0
        ? Math.round(((weightedSum / scorable.length) * 100) * 10) / 10
        : 0;

      return {
        category,
        score,
        grade: calculateGrade(score),
        tier: calculateTier(score),
        issueCount: failed.length,
        passingCount: passed.length,
        bonus: 0,
      };
    });
  }

  private buildScoreSummary(
    overallScore: number,
    overallGrade: string,
    overallTier: string,
    categoryScores: CategoryScore[],
    totalIssues: number,
    totalPassing: number,
    pagesAnalyzed: number
  ): ScoreSummary {
    let totalPenalty = 0;
    let totalBonus = 0;
    for (const cs of categoryScores) {
      totalPenalty += Math.max(0, 100 - (cs.score - cs.bonus));
      totalBonus += cs.bonus;
    }

    const categories = categoryScores.map((cs) => {
      const weight = CATEGORY_WEIGHTS[cs.category as IssueCategory] || 0;
      return {
        category: cs.category,
        score: cs.score,
        grade: cs.grade,
        tier: cs.tier,
        weight,
        contribution: Math.round(cs.score * weight * 10) / 10,
      };
    });

    let overallInsight = '';
    if (overallScore >= 90) {
      overallInsight = 'Outstanding! Your site demonstrates excellent SEO practices across all categories.';
    } else if (overallScore >= 70) {
      overallInsight = 'Good work! Your site has a solid SEO foundation with some areas for improvement.';
    } else if (overallScore >= 50) {
      overallInsight = 'Fair performance. Several important SEO issues need attention to improve rankings.';
    } else {
      overallInsight = 'Critical issues detected. Immediate action required to improve SEO performance.';
    }

    const recommendations: string[] = [];
    const low = categoryScores.filter((cs) => cs.score < 70).sort((a, b) => a.score - b.score);
    if (low.length > 0) {
      recommendations.push(
        `Focus on improving ${low[0]!.category.toLowerCase().replace('_', ' ')} (score: ${low[0]!.score})`
      );
    }
    if (totalIssues > 10) {
      recommendations.push(`Address ${totalIssues} issues to improve overall score`);
    }

    return {
      overall: { score: overallScore, grade: overallGrade as any, tier: overallTier as any },
      categories,
      statistics: {
        totalIssues,
        totalPassing,
        penaltyPoints: Math.round(totalPenalty * 10) / 10,
        bonusPoints: Math.round(totalBonus * 10) / 10,
        pagesAnalyzed,
      },
      insights: {
        overall: overallInsight,
        categories: categoryScores.map((cs) => ({
          category: cs.category,
          insight: getScoreInsight(cs.score, cs.grade, cs.category as IssueCategory),
        })),
        recommendations,
      },
    };
  }

  // ── Heading extraction ─────────────────────────────────────────────────────

  private buildPageHeadings(pages: PageData[]): PageHeadingSummary[] {
    return pages.map((page) => {
      const levelMap = new Map<number, string[]>();
      for (const h of page.headings) {
        const existing = levelMap.get(h.level) ?? [];
        existing.push(h.text);
        levelMap.set(h.level, existing);
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

  // ── Keyword consistency ────────────────────────────────────────────────────

  private readonly STOP_WORDS = new Set([
    'the','and','for','with','from','about','this','that','your','our',
    'are','was','were','been','have','has','had','will','can','may',
    'all','but','not','you','we','he','she','they','it','its',
    'be','by','as','at','of','on','in','to','a','is','an',
    'or','if','so','do','go','get','got','also','more','than',
    'when','who','how','what','why','where','which','their','them',
    'into','up','out','no','yes','new','use','used','using',
    'one','two','three','these','those','then','there','here',
    'just','only','very','some','any','such','each','other',
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
    return text.split(/\W+/).filter((w) => w.length > 3 && !this.STOP_WORDS.has(w));
  }

  private countFreq(words: string[]): Map<string, number> {
    const freq = new Map<string, number>();
    for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);
    return freq;
  }

  private countBigrams(words: string[]): Map<string, number> {
    const freq = new Map<string, number>();
    for (let i = 0; i < words.length - 1; i++) {
      const bg = `${words[i]} ${words[i + 1]}`;
      freq.set(bg, (freq.get(bg) ?? 0) + 1);
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
      const titleLc   = (page.title ?? '').toLowerCase();
      const descLc    = (page.description ?? '').toLowerCase();
      const headingLc = page.headings.map((h) => h.text.toLowerCase()).join(' ');

      const words     = this.tokenize(bodyText);
      const wordFreq  = this.countFreq(words);
      const bigramFreq = this.countBigrams(words);

      const toEntry = (kw: string, freq: number): KeywordEntry => ({
        keyword: kw,
        inTitle: titleLc.includes(kw),
        inMetaDescription: descLc.includes(kw),
        inHeadingTags: headingLc.includes(kw),
        pageFrequency: freq,
      });

      const keywords = this.topEntries(wordFreq, 10).map(([kw, f]) => toEntry(kw, f));
      const phrases  = this.topEntries(bigramFreq, 7).map(([kw, f]) => toEntry(kw, f));

      const passed = keywords.slice(0, 5)
        .filter((k) => k.inTitle || k.inMetaDescription || k.inHeadingTags)
        .length >= 3;

      return {
        pageUrl: page.url,
        passed,
        message: passed
          ? "Your page's main keywords are distributed well across the important HTML Tags."
          : 'Some of your main keywords are missing from important HTML Tags.',
        keywords,
        phrases,
      };
    });
  }

  // ── Rule registration ──────────────────────────────────────────────────────

  private registerAllRules(): void {
    try {
      // Technical (13 sync + 4 async handled separately)
      this.registry.register(new HTTPSCheckRule());
      this.registry.register(new SSLEnabledRule());
      this.registry.register(new CanonicalTagRule());
      this.registry.register(new NoindexTagRule());
      this.registry.register(new NoindexHeaderRule());
      this.registry.register(new RobotsTxtBlockingRule());
      this.registry.register(new XMLSitemapRule());
      this.registry.register(new CharsetRule());
      this.registry.register(new MissingRobotsRule());
      this.registry.register(new HTTP2Rule());
      this.registry.register(new JavaScriptErrorsRule());
      this.registry.register(new ServerSoftwareRule());
      this.registry.register(new AnalyticsDetectionRule());

      // On-page (11)
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

      // Performance (12)
      this.registry.register(new CoreWebVitalsRule());
      this.registry.register(new LoadTimeRule());
      this.registry.register(new FlashUsageRule());
      this.registry.register(new PageSizeRule());
      this.registry.register(new ResourceCountRule());
      this.registry.register(new ImageOptimizationRule());
      this.registry.register(new MinificationRule());
      this.registry.register(new PageSpeedMobileRule());
      this.registry.register(new PageSpeedDesktopRule());
      this.registry.register(new CompressionRule());
      this.registry.register(new AMPRule());
      this.registry.register(new LLMReadabilityRule());

      // Links (1)
      this.registry.register(new LinkStructureRule());

      // Usability (8)
      this.registry.register(new IFrameUsageRule());
      this.registry.register(new EmailPrivacyRule());
      this.registry.register(new DeprecatedTagsRule());
      this.registry.register(new InlineStylesRule());
      this.registry.register(new MobileViewportRule());
      this.registry.register(new FaviconRule());
      this.registry.register(new FontSizeRule());
      this.registry.register(new TapTargetSizeRule());

      // Social (10)
      this.registry.register(new FacebookLinkRule());
      this.registry.register(new FacebookPixelRule());
      this.registry.register(new TwitterLinkRule());
      this.registry.register(new InstagramLinkRule());
      this.registry.register(new LinkedInLinkRule());
      this.registry.register(new YouTubeLinkRule());
      this.registry.register(new YouTubeActivityRule());
      this.registry.register(new LocalSEORule());
      this.registry.register(new OpenGraphTagsRule());
      this.registry.register(new TwitterCardTagsRule());

      // Structured Data (3)
      this.registry.register(new IdentitySchemaRule());
      this.registry.register(new LocalBusinessSchemaRule());
      this.registry.register(new GoogleBusinessProfileRule());

      const stats = this.registry.getStats();
      console.log(`[SeoAnalyzer] Registered ${stats.total} rules:`, stats.byCategory);
    } catch (error) {
      console.error('[SeoAnalyzer] Error registering rules:', error);
      throw error;
    }
  }

  getStats() {
    return this.registry.getStats();
  }
}
