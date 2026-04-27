import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

interface LinkAnalysis {
  total: number;
  internal: number;
  external: number;
  internalRatio: number;
  externalRatio: number;
  nofollow: number;
  nofollowRatio: number;
}

export class LinkStructureRule implements PageRule {
  code = 'LINK_STRUCTURE';
  category = 'LINKS' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'LINK_STRUCTURE',
    name: 'Link Structure',
    maxScore: 3,
    priority: 2,
    section: 'links',
    informational: false,
    what: 'Link structure refers to the balance and quality of internal and external links on your page, including the ratio of internal to external links.',
    why: 'Proper link structure helps distribute PageRank throughout your site, improves crawlability, enhances user navigation, and signals topical relationships to search engines.',
    how: 'Aim for at least 70-80% internal links to keep users on your site and distribute PageRank. Use external links sparingly and only to high-quality, relevant sources. Ensure all important pages are linked from multiple locations.',
    time: '1 hour',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    const links = page.links ?? [];

    if (links.length === 0) {
      const check: SEOAuditCheck = {
        ...this.checkDefinition,
        category: this.category,
        passed: false,
        score: 0,
        shortAnswer: 'No links found on this page.',
        answer: `Page "${page.url}" has no links. Pages should link to related content for better navigation and SEO.`,
        recommendation: 'Add internal links to related content and external links to authoritative sources.',
        data: { analysis: this.analyzeLinks([]) },
        pageUrl: page.url,
      };
      return {
        check,
        issues: [{
          category: this.category,
          type: 'NO_LINKS',
          title: 'No Links on Page',
          description: check.answer,
          severity: 'MEDIUM' as const,
          impactScore: 15,
          pageUrl: page.url,
        }],
        passingChecks: [],
      };
    }

    const analysis = this.analyzeLinks(links);
    let passed: boolean;
    let score: number;
    let shortAnswer: string;
    let answer: string;
    let recommendation: string | null;
    let issueType: string | null = null;
    let issueSeverity: 'MEDIUM' | 'LOW' = 'LOW';
    let issueImpact = 8;

    if (analysis.internal === 0) {
      passed = false; score = 0;
      shortAnswer = 'No internal links found.';
      answer = `Page has ${analysis.external} external link(s) but no internal links. Internal linking improves site navigation and SEO.`;
      recommendation = 'Add internal links to related pages on your site to improve navigation and distribute PageRank.';
      issueType = 'NO_INTERNAL_LINKS'; issueSeverity = 'MEDIUM'; issueImpact = 15;
    } else if (analysis.external === 0 && analysis.total > 10) {
      passed = false; score = 2;
      shortAnswer = 'No external links found.';
      answer = `Page has ${analysis.internal} internal link(s) but no external links. Linking to authoritative sources can build trust.`;
      recommendation = 'Consider adding a few external links to high-quality, relevant sources to support your content.';
      issueType = 'NO_EXTERNAL_LINKS'; issueSeverity = 'LOW'; issueImpact = 3;
    } else if (analysis.externalRatio > 50) {
      passed = false; score = 1;
      shortAnswer = `High external link ratio (${analysis.externalRatio}% external).`;
      answer = `Page has ${analysis.externalRatio}% external links (${analysis.external} external, ${analysis.internal} internal). Too many external links can leak PageRank.`;
      recommendation = 'Aim for at least 70-80% internal links to keep users on your site and distribute PageRank effectively.';
      issueType = 'TOO_MANY_EXTERNAL_LINKS'; issueSeverity = 'LOW'; issueImpact = 8;
    } else if (analysis.total > 100) {
      passed = false; score = 2;
      shortAnswer = `Excessive links (${analysis.total} total).`;
      answer = `Page has ${analysis.total} links (${analysis.internal} internal, ${analysis.external} external). Consider reducing to under 100.`;
      recommendation = 'Reduce total links to under 100 to avoid diluting link equity and improve page quality.';
      issueType = 'TOO_MANY_LINKS'; issueSeverity = 'LOW'; issueImpact = 5;
    } else {
      passed = true; score = this.checkDefinition.maxScore;
      shortAnswer = `Healthy link structure: ${analysis.total} links (${analysis.internalRatio}% internal).`;
      answer = `Page has ${analysis.total} links with a good balance: ${analysis.internalRatio}% internal (${analysis.internal}) and ${analysis.externalRatio}% external (${analysis.external}).`;
      recommendation = null;
    }

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score,
      shortAnswer,
      answer,
      recommendation,
      data: { analysis },
      pageUrl: page.url,
    };

    const issues = !passed && issueType ? [{
      category: this.category,
      type: issueType,
      title: shortAnswer,
      description: answer,
      severity: issueSeverity,
      impactScore: issueImpact,
      pageUrl: page.url,
    }] : [];

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: 'Healthy Link Structure',
      description: shortAnswer,
      pageUrl: page.url,
      goodPractice: 'Balanced internal and external linking helps with navigation, user experience, and SEO.',
      data: { analysis },
    }] : [];

    return { check, issues, passingChecks };
  }

  private analyzeLinks(links: Array<{ href: string; text: string; isInternal: boolean }>): LinkAnalysis {
    const total = links.length;
    const internal = links.filter(l => l.isInternal).length;
    const external = total - internal;
    const nofollow = links.filter(l => l.text.toLowerCase().includes('nofollow')).length;

    return {
      total,
      internal,
      external,
      internalRatio: total > 0 ? Math.round((internal / total) * 100) : 0,
      externalRatio: total > 0 ? Math.round((external / total) * 100) : 0,
      nofollow,
      nofollowRatio: total > 0 ? Math.round((nofollow / total) * 100) : 0,
    };
  }
}
