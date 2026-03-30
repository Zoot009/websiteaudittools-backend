import type { AuditRule, RuleContext, SeoIssue, FixRecommendation } from '../../types';
import * as cheerio from 'cheerio';

/**
 * Rule: No structured data
 * Severity: MEDIUM
 * Category: Structured Data
 */
export const noStructuredDataRule: AuditRule = {
  code: 'NO_STRUCTURED_DATA',
  name: 'No structured data',
  category: 'STRUCTURED_DATA',
  severity: 'MEDIUM',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page } = context;
    const issues: SeoIssue[] = [];
    
    if (!page.hasSchemaOrg) {
      issues.push({
        category: 'STRUCTURED_DATA',
        type: 'no_structured_data',
        title: 'No Structured Data Found',
        description: 'This page does not have Schema.org structured data, which could improve search result appearance and features.',
        severity: 'MEDIUM',
        impactScore: 50,
        pageUrl: page.url,
      });
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue): FixRecommendation => ({
    title: 'Add structured data markup',
    whyItMatters: 'Structured data helps search engines understand your content better and can enable rich results (star ratings, prices, availability, etc.) in search.',
    howToFix: [
      'Add JSON-LD structured data to the <head> or <body> of your page.',
      'Use appropriate schema types for your content (Article, Product, Organization, LocalBusiness, etc.).',
      'Include key properties like name, description, image, and type-specific fields.',
      'Test your markup using Google\'s Rich Results Test tool.',
      'Consider breadcrumb markup for improved navigation display in SERPs.',
    ],
    estimatedEffort: 'medium',
    priority: 5,
  }),
};

/**
 * Rule: Missing Open Graph tags
 * Severity: LOW to MEDIUM
 * Category: Structured Data
 */
export const missingOpenGraphRule: AuditRule = {
  code: 'MISSING_OPEN_GRAPH',
  name: 'Missing Open Graph tags',
  category: 'STRUCTURED_DATA',
  severity: 'LOW',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page } = context;
    const issues: SeoIssue[] = [];
    
    if (!page.ogImage) {
      issues.push({
        category: 'STRUCTURED_DATA',
        type: 'missing_og_image',
        title: 'Missing Open Graph Image',
        description: 'This page does not have an Open Graph image, which affects how it appears when shared on social media.',
        severity: 'LOW',
        impactScore: 40,
        pageUrl: page.url,
        elementSelector: 'meta[property="og:image"]',
      });
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue): FixRecommendation => ({
    title: 'Add Open Graph tags',
    whyItMatters: 'Open Graph tags control how your page appears when shared on social media platforms like Facebook, LinkedIn, and Slack. Good social previews increase click-through rates.',
    howToFix: [
      'Add essential OG tags: og:title, og:description, og:image, og:url, og:type.',
      'Use a high-quality image (recommended: 1200x630 pixels).',
      'Ensure the og:image is an absolute URL.',
      'Add og:site_name for brand consistency.',
      'Consider adding Twitter Card tags as well for Twitter/X optimization.',
    ],
    estimatedEffort: 'low',
    priority: 4,
  }),
};

/**
 * Rule: Missing Twitter/X Cards
 * Severity: LOW
 * Category: Structured Data
 */
export const missingTwitterCardsRule: AuditRule = {
  code: 'MISSING_TWITTER_CARDS',
  name: 'Missing Twitter/X Cards',
  category: 'STRUCTURED_DATA',
  severity: 'LOW',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page } = context;
    const issues: SeoIssue[] = [];
    
    try {
      const $ = cheerio.load(page.html);
      const twitterCard = $('meta[name="twitter:card"]');
      const twitterImage = $('meta[name="twitter:image"]');
      
      if (twitterCard.length === 0 || twitterImage.length === 0) {
        issues.push({
          category: 'STRUCTURED_DATA',
          type: 'missing_twitter_cards',
          title: 'Missing Twitter/X Card Tags',
          description: 'This page lacks Twitter Card meta tags. Adding them will improve how your content looks when shared on X (Twitter).',
          severity: 'LOW',
          impactScore: 35,
          pageUrl: page.url,
          elementSelector: 'meta[name="twitter:card"]',
        });
      }
    } catch (error) {
      // Skip if HTML parsing fails
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue): FixRecommendation => ({
    title: 'Add Twitter/X Card tags',
    whyItMatters: 'Twitter Cards control how your links appear on X (formerly Twitter). Rich previews with images and descriptions get significantly more engagement than plain links.',
    howToFix: [
      'Add twitter:card meta tag (use "summary_large_image" for best results)',
      'Add twitter:title (page title, max 70 characters)',
      'Add twitter:description (page summary, max 200 characters)',
      'Add twitter:image (absolute URL, min 300x157px, recommended 1200x628px)',
      'Optionally add twitter:site with your @username',
      'Test with Twitter Card Validator: https://cards-dev.twitter.com/validator',
    ],
    estimatedEffort: 'low',
    priority: 3,
  }),
};

/**
 * Rule: Missing Identity/Organization Schema
 * Severity: LOW
 * Category: Structured Data
 */
export const missingIdentitySchemaRule: AuditRule = {
  code: 'MISSING_IDENTITY_SCHEMA',
  name: 'Missing Organization Schema',
  category: 'STRUCTURED_DATA',
  severity: 'LOW',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page, siteContext } = context;
    const issues: SeoIssue[] = [];
    
    // Only check on homepage
    if (page.url === siteContext.baseUrl || page.url === siteContext.baseUrl + '/') {
      try {
        const $ = cheerio.load(page.html);
        const scriptTags = $('script[type="application/ld+json"]');
        
        let hasOrganizationSchema = false;
        scriptTags.each((_, elem) => {
          try {
            const content = $(elem).html() || '';
            const data = JSON.parse(content);
            const type = data['@type'] || (Array.isArray(data['@graph']) ? data['@graph'].map((item: any) => item['@type']).join(',') : '');
            
            if (type.includes('Organization') || type.includes('Corporation')) {
              hasOrganizationSchema = true;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        });
        
        if (!hasOrganizationSchema) {
          issues.push({
            category: 'STRUCTURED_DATA',
            type: 'missing_identity_schema',
            title: 'Missing Organization Schema',
            description: 'Your homepage lacks Organization schema markup. This helps search engines understand your brand identity, logo, and social profiles.',
            severity: 'LOW',
            impactScore: 40,
            pageUrl: page.url,
          });
        }
      } catch (error) {
        // Skip if parsing fails
      }
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue, context: RuleContext): FixRecommendation => ({
    title: 'Add Organization Schema to homepage',
    whyItMatters: 'Organization schema helps search engines understand your brand identity. It can enable your logo in search results, connect your social profiles, and establish your website as your official presence.',
    howToFix: [
      'Add JSON-LD Organization schema to your homepage <head>',
      'Include: name, logo (URL), url (website), contactPoint',
      'Add sameAs array with your social media profile URLs',
      'For local businesses, use LocalBusiness instead of Organization',
      'Include address and telephone if applicable',
      'Test with Google\'s Rich Results Test tool',
    ],
    estimatedEffort: 'low',
    priority: 4,
  }),
};

// Export all structured data rules
export const structuredDataRules = [
  noStructuredDataRule,
  missingOpenGraphRule,
  missingTwitterCardsRule,
  missingIdentitySchemaRule,
];
