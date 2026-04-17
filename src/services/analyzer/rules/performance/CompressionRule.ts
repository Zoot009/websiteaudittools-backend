/**
 * Check if HTTP compression (Gzip/Brotli/Deflate) is enabled
 * Compression reduces page load times and improves Core Web Vitals
 */

import type { PageRule, PageData, SiteContext, RuleResult, Issue, PassingCheck } from '../../types.js';

export class CompressionRule implements PageRule {
  code = 'COMPRESSION';
  category = 'PERFORMANCE' as const;
  level = 'page' as const;

  execute(page: PageData, context: SiteContext): RuleResult {
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    // Check if compression data is available
    if (!page.compression) {
      // If compression data is missing, we can't determine (skip check)
      return { issues, passingChecks };
    }

    // Check compression status
    if (page.compression === 'none') {
      issues.push({
        type: 'compression_disabled',
        category: 'PERFORMANCE',
        title: 'HTTP Compression Not Enabled',
        description: 'No compression (Gzip, Brotli, or Deflate) detected on HTTP responses. Enabling compression can reduce page size by 60-80% and significantly improve load times, which directly impacts Core Web Vitals and search rankings.',
        severity: 'HIGH',
        impactScore: 85,
        pageUrl: page.url,
      });
    } else {
      // Compression is enabled
      const compressionType = page.compression === 'br' ? 'Brotli' 
        : page.compression === 'gzip' ? 'Gzip' 
        : page.compression === 'deflate' ? 'Deflate'
        : page.compression;

      passingChecks.push({
        category: 'PERFORMANCE',
        code: 'compression_enabled',
        title: `HTTP Compression Enabled (${compressionType})`,
        description: `${compressionType} compression is active, reducing bandwidth usage and improving page load speed.`,
        pageUrl: page.url,
        goodPractice: `Using ${compressionType} compression reduces file sizes by 60-80%, improving Core Web Vitals`,
      });

      // Bonus tip: Brotli is better than Gzip
      if (page.compression === 'gzip') {
        issues.push({
          type: 'compression_suboptimal',
          category: 'PERFORMANCE',
          title: 'Consider Upgrading to Brotli Compression',
          description: 'Currently using Gzip compression. Brotli typically achieves 15-20% better compression than Gzip, resulting in faster page loads. Most modern browsers support Brotli.',
          severity: 'LOW',
          impactScore: 25,
          pageUrl: page.url,
        });
      }
    }

    return { issues, passingChecks };
  }
}
