import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck, Issue } from '../../types.js';

export class CompressionRule implements PageRule {
  code = 'COMPRESSION';
  category = 'PERFORMANCE' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'COMPRESSION',
    name: 'Compression',
    maxScore: 3,
    priority: 2,
    section: 'performance',
    informational: false,
    what: 'HTTP compression (Gzip, Brotli, or Deflate) reduces the size of HTTP responses before they\'re sent from the server to the browser.',
    why: 'Compression reduces page size by 60-80%, significantly improving load times. It directly impacts Core Web Vitals and is one of the easiest performance wins available.',
    how: 'Enable compression on your web server or CDN. Most modern hosting providers enable Gzip by default. For better compression, upgrade to Brotli (15-20% better than Gzip). In Nginx, add "gzip on;" or "brotli on;" to your config.',
    time: '1 hour',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    if (!page.compression) {
      const stub: SEOAuditCheck = {
        ...this.checkDefinition,
        maxScore: 0,
        informational: true,
        category: this.category,
        passed: null,
        score: 0,
        shortAnswer: 'Compression data not available.',
        answer: 'HTTP compression status could not be determined for this page.',
        recommendation: null,
        pageUrl: page.url,
      };
      return { check: stub, issues: [], passingChecks: [] };
    }

    const compressionTypeMap: Record<string, string> = {
      br: 'Brotli',
      gzip: 'Gzip',
      deflate: 'Deflate',
    };
    const compressionName = compressionTypeMap[page.compression] ?? page.compression;
    const isCompressed = page.compression !== 'none';
    const isBrotli = page.compression === 'br';
    const passed = isCompressed;
    const score = isCompressed ? (isBrotli ? this.checkDefinition.maxScore : 2) : 0;

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score,
      shortAnswer: isCompressed
        ? `${compressionName} compression is enabled.`
        : 'No HTTP compression detected.',
      answer: isCompressed
        ? `${compressionName} compression is active, reducing bandwidth usage and improving page load speed.`
        : 'No compression (Gzip, Brotli, or Deflate) detected. Enabling compression can reduce page size by 60-80%.',
      recommendation: isCompressed
        ? (isBrotli ? null : 'Consider upgrading from Gzip to Brotli for 15-20% better compression.')
        : 'Enable Brotli or Gzip compression on your server or CDN to significantly reduce page transfer size.',
      data: { compression: page.compression, compressionName },
      pageUrl: page.url,
    };

    const issues: Issue[] = [];

    if (!isCompressed) {
      issues.push({
        category: this.category,
        type: this.code,
        title: 'HTTP Compression Not Enabled',
        description: check.answer,
        severity: 'HIGH' as const,
        impactScore: 85,
        pageUrl: page.url,
      });
    } else if (!isBrotli) {
      issues.push({
        category: this.category,
        type: 'COMPRESSION_SUBOPTIMAL',
        title: 'Consider Upgrading to Brotli Compression',
        description: 'Currently using Gzip compression. Brotli typically achieves 15-20% better compression than Gzip, resulting in faster page loads. Most modern browsers support Brotli.',
        severity: 'LOW' as const,
        impactScore: 25,
        pageUrl: page.url,
      });
    }

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: `HTTP Compression Enabled (${compressionName})`,
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: `${compressionName} compression reduces file sizes by ${isBrotli ? '70-80' : '60-70'}%, improving Core Web Vitals and load speed.`,
    }] : [];

    return { check, issues, passingChecks };
  }
}
