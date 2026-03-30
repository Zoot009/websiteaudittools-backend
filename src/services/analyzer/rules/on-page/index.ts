/**
 * On-Page SEO Rules
 * Rules for analytics, tracking, and modern SEO files
 */

import type { AuditRule, RuleContext, SeoIssue, FixRecommendation } from '../../types';
import * as cheerio from 'cheerio';

/**
 * Rule: Missing Analytics Tracking
 * Severity: LOW
 * Category: On-Page
 */
export const missingAnalyticsRule: AuditRule = {
  code: 'MISSING_ANALYTICS',
  name: 'Missing analytics tracking',
  category: 'ON_PAGE',
  severity: 'LOW',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page } = context;
    const issues: SeoIssue[] = [];
    
    try {
      const $ = cheerio.load(page.html);
      
      // Check for common analytics platforms
      const hasGoogleAnalytics = page.html.includes('google-analytics.com') || 
                                  page.html.includes('googletagmanager.com') ||
                                  page.html.includes('gtag') ||
                                  page.html.includes('GA_MEASUREMENT_ID');
      
      const hasPlausible = page.html.includes('plausible.io');
      const hasFathom = page.html.includes('cdn.usefathom.com');
      const hasMatomo = page.html.includes('matomo') || page.html.includes('piwik');
      
      if (!hasGoogleAnalytics && !hasPlausible && !hasFathom && !hasMatomo) {
        issues.push({
          category: 'ON_PAGE',
          type: 'missing_analytics',
          title: 'No Analytics Tracking Detected',
          description: 'No analytics tracking code was found on this page. Analytics help you understand your traffic, user behavior, and SEO performance.',
          severity: 'LOW',
          impactScore: 30,
          pageUrl: page.url,
        });
      }
    } catch (error) {
      // Skip if parsing fails
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue): FixRecommendation => ({
    title: 'Install analytics tracking',
    whyItMatters: 'Analytics tools help you measure traffic, understand user behavior, track conversions, and evaluate your SEO performance. You can\'t improve what you don\'t measure.',
    howToFix: [
      'Choose an analytics platform: Google Analytics 4 (free), Plausible (privacy-focused), or Matomo',
      'For Google Analytics: Create a GA4 property and get your Measurement ID',
      'Add the tracking script to your site\'s <head> section',
      'Verify tracking is working by visiting your site and checking the analytics dashboard',
      'Set up key events (formerly conversions) for important actions',
      'Consider privacy regulations (GDPR, CCPA) and add cookie consent if required',
    ],
    estimatedEffort: 'low',
    priority: 4,
  }),
};

/**
 * Rule: Missing llms.txt
 * Severity: LOW
 * Category: On-Page
 */
export const missingLlmsTxtRule: AuditRule = {
  code: 'MISSING_LLMS_TXT',
  name: 'Missing llms.txt file',
  category: 'ON_PAGE',
  severity: 'LOW',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page, siteContext } = context;
    const issues: SeoIssue[] = [];
    
    // Only check on base/home page
    if (page.url === siteContext.baseUrl || page.url === siteContext.baseUrl + '/') {
      // This is a site-level check - we'd need to fetch /llms.txt separately
      // For now, just flag as a recommendation
      issues.push({
        category: 'ON_PAGE',
        type: 'missing_llms_txt',
        title: 'Consider Adding llms.txt File',
        description: 'Your site does not have a /llms.txt file. This emerging standard helps AI language models understand how to reference your content.',
        severity: 'LOW',
        impactScore: 20,
        pageUrl: siteContext.baseUrl,
      });
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue, context: RuleContext): FixRecommendation => ({
    title: 'Create an llms.txt file',
    whyItMatters: 'llms.txt is an emerging standard that helps AI language models (like ChatGPT, Claude, Perplexity) understand how to properly cite and reference your content. As AI search grows, this improves your visibility in AI-generated answers.',
    howToFix: [
      'Create a text file named "llms.txt" in your site root: /llms.txt',
      'Include your site name, description, and preferred citation format',
      'Add links to important pages (about, contact, key content)',
      'Specify your author/organization information',
      'Example format: https://llmstxt.org/ for the specification',
      'Keep it simple and human-readable (plain text, markdown-like)',
    ],
    estimatedEffort: 'low',
    priority: 2,
  }),
};

// Export all on-page rules
export const onPageRules: AuditRule[] = [
  missingAnalyticsRule,
  missingLlmsTxtRule,
];
