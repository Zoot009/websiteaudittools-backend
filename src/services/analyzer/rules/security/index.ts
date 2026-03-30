import type { AuditRule, RuleContext, SeoIssue, FixRecommendation } from '../../types';

/**
 * Rule: No HTTPS
 * Severity: HIGH
 * Category: Security
 */
export const noHttpsRule: AuditRule = {
  code: 'NO_HTTPS',
  name: 'No HTTPS',
  category: 'SECURITY',
  severity: 'HIGH',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page } = context;
    const issues: SeoIssue[] = [];
    
    try {
      const url = new URL(page.url);
      
      if (url.protocol !== 'https:') {
        issues.push({
          category: 'SECURITY',
          type: 'no_https',
          title: 'Not Using HTTPS',
          description: 'This page is not served over HTTPS, which is a ranking factor and security concern.',
          severity: 'HIGH',
          impactScore: 90,
          pageUrl: page.url,
        });
      }
    } catch {
      // Invalid URL, skip check
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue): FixRecommendation => ({
    title: 'Enable HTTPS',
    whyItMatters: 'HTTPS is a confirmed ranking factor. Non-HTTPS sites show security warnings in browsers, reducing trust and conversions. Chrome marks HTTP sites as "Not Secure".',
    howToFix: [
      'Obtain and install an SSL/TLS certificate (free options: Let\'s Encrypt).',
      'Configure your server to serve content over HTTPS.',
      'Set up 301 redirects from HTTP to HTTPS for all pages.',
      'Update internal links to use HTTPS.',
      'Update canonical tags and sitemaps to use HTTPS URLs.',
    ],
    estimatedEffort: 'medium',
    priority: 10,
  }),
};
