/**
 * Local SEO Rules
 * Rules for detecting phone numbers and addresses on pages
 */

import type { AuditRule, RuleContext, SeoIssue, FixRecommendation } from '../../types';

/**
 * Phone Number Detection Rule
 */
export const phoneNumberRule: AuditRule = {
  code: 'PHONE_NUMBER_MISSING',
  name: 'Phone Number Detection',
  category: 'ON_PAGE',
  severity: 'MEDIUM',
  
  run(context: RuleContext): SeoIssue[] {
    const { page } = context;
    const issues: SeoIssue[] = [];

    // Check if local SEO data was extracted
    if (!page.localSeo?.phone.found) {
      issues.push({
        type: 'phone_number_missing',
        category: 'ON_PAGE',
        severity: 'MEDIUM',
        title: 'Phone Number Not Found',
        description: 'No phone number was detected on this page. Adding a visible phone number helps with local SEO and user trust, especially for local businesses.',
        pageUrl: page.url,
        impactScore: 50,
      });
    }

    return issues;
  },

  getRecommendation(issue: SeoIssue, context: RuleContext): FixRecommendation {
    return {
      title: 'Add Phone Number to Your Website',
      whyItMatters:
        'Phone numbers are crucial for local businesses. They improve local SEO rankings, appear in Google Business listings, and increase user trust. Phones should be easily clickable on mobile devices.',
      howToFix: [
        'Add your phone number in a visible location (header, footer, or contact section)',
        'Use tel: links for mobile clickability: <a href="tel:+1234567890">Call Us</a>',
        'Add phone number to Schema.org LocalBusiness structured data',
        'Ensure the phone number is consistent across your website and other online listings (NAP consistency)',
      ],
      estimatedEffort: 'low',
      priority: 5,
    };
  },
};

/**
 * Address Detection Rule
 */
export const addressRule: AuditRule = {
  code: 'ADDRESS_MISSING',
  name: 'Address Detection',
  category: 'ON_PAGE',
  severity: 'MEDIUM',
  
  run(context: RuleContext): SeoIssue[] {
    const { page } = context;
    const issues: SeoIssue[] = [];

    // Check if local SEO data was extracted
    if (!page.localSeo?.address.found) {
      issues.push({
        type: 'address_missing',
        category: 'ON_PAGE',
        severity: 'MEDIUM',
        title: 'Address Not Found',
        description: 'No physical address was detected on this page. Adding your business address is important for local SEO and helps customers find your location.',
        pageUrl: page.url,
        impactScore: 55,
      });
    }

    return issues;
  },

  getRecommendation(issue: SeoIssue, context: RuleContext): FixRecommendation {
    return {
      title: 'Add Business Address to Your Website',
      whyItMatters:
        'Business addresses are essential for local SEO. They help search engines understand your location, improve your Google Maps rankings, and build trust with customers who want to visit your physical location.',
      howToFix: [
        'Add your full business address in the footer or contact page',
        'Use the HTML <address> semantic tag for better structure',
        'Add address to Schema.org LocalBusiness or PostalAddress structured data',
        'Ensure address format is clear: Street, City, State ZIP',
        'Keep your address consistent across all online platforms (NAP consistency)',
      ],
      estimatedEffort: 'low',
      priority: 5,
    };
  },
};

/**
 * Local Business Schema Rule
 */
export const localBusinessSchemaRule: AuditRule = {
  code: 'LOCAL_BUSINESS_SCHEMA_MISSING',
  name: 'Local Business Schema',
  category: 'TECHNICAL',
  severity: 'HIGH',
  
  run(context: RuleContext): SeoIssue[] {
    const { page } = context;
    const issues: SeoIssue[] = [];

    // Check if page has schema and local contact info
    const hasPhone = page.localSeo?.phone.found;
    const hasAddress = page.localSeo?.address.found;

    // If site has local business indicators but no schema
    if ((hasPhone || hasAddress) && !page.hasSchemaOrg) {
      issues.push({
        type: 'local_business_schema_missing',
        category: 'TECHNICAL',
        severity: 'HIGH',
        title: 'Local Business Schema Missing',
        description: 'Your page has contact information but lacks LocalBusiness structured data. Adding Schema.org markup helps search engines understand your business better.',
        pageUrl: page.url,
        impactScore: 70,
      });
    }

    return issues;
  },

  getRecommendation(issue: SeoIssue, context: RuleContext): FixRecommendation {
    const { page } = context;
    const phone = page.localSeo?.phone.number || 'YOUR_PHONE_NUMBER';
    const address = page.localSeo?.address.text || 'YOUR_ADDRESS';

    return {
      title: 'Add Local Business Schema Markup',
      whyItMatters:
        'LocalBusiness schema is critical for local SEO. It tells search engines your business type, location, hours, and contact info. This improves local search rankings and enables rich results in Google Search.',
      howToFix: [
        'Add JSON-LD structured data to your page <head> section',
        `Use the detected phone (${phone}) and address (${address}) in the schema`,
        'Include business name, type, opening hours, and image',
        'Test your schema with Google\'s Rich Results Test tool',
        'See the code example below for a complete implementation',
      ],
      estimatedEffort: 'medium',
      priority: 3,
    };
  },
};

// Export all local SEO rules
export const localSeoRules: AuditRule[] = [
  phoneNumberRule,
  addressRule,
  localBusinessSchemaRule,
];
