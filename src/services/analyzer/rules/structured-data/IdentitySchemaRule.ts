/**
 * Check for Identity Schema (Organization or Person)
 * Powers Google Knowledge Graph and brand recognition
 */

import type { SiteRule, PageData, SiteContext, RuleResult, Issue, PassingCheck } from '../../types.js';

export class IdentitySchemaRule implements SiteRule {
  code = 'IDENTITY_SCHEMA';
  category = 'STRUCTURED_DATA' as const;
  level = 'site' as const;

  execute(pages: PageData[], context: SiteContext): RuleResult {
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    let hasOrganization = false;
    let hasPerson = false;
    let organizationData: any = null;
    let personData: any = null;
    let foundOnPage: string | null = null;

    // Check all pages for Organization or Person schemas
    for (const page of pages) {
      if (!page.schemas || page.schemas.length === 0) {
        continue;
      }

      for (const schema of page.schemas) {
        const type = schema.type.toLowerCase();

        if (type === 'organization') {
          hasOrganization = true;
          organizationData = schema.data;
          foundOnPage = page.url;
        } else if (type === 'person') {
          hasPerson = true;
          personData = schema.data;
          foundOnPage = page.url;
        }

        if (hasOrganization || hasPerson) {
          break;
        }
      }

      if (hasOrganization || hasPerson) {
        break;
      }
    }

    if (hasOrganization) {
      // Check completeness of Organization schema
      const org = organizationData;
      const hasName = !!org.name;
      const hasLogo = !!org.logo;
      const hasUrl = !!org.url;
      const hasSameAs = org.sameAs && Array.isArray(org.sameAs) && org.sameAs.length > 0;
      const hasContactPoint = !!org.contactPoint;

      const missingFields: string[] = [];
      if (!hasName) missingFields.push('name');
      if (!hasLogo) missingFields.push('logo');
      if (!hasUrl) missingFields.push('url');
      if (!hasSameAs) missingFields.push('sameAs (social profiles)');

      if (missingFields.length === 0) {
        passingChecks.push({
          category: 'STRUCTURED_DATA',
          code: 'complete_organization_schema',
          title: 'Complete Organization Schema Found',
          description: `Organization schema with all key properties (name, logo, url, sameAs) is implemented. This helps Google understand your brand and can power your Knowledge Graph panel.`,
          pageUrl: foundOnPage!,
          goodPractice: 'Complete organization schema helps Google display rich brand information',
        });
      } else {
        issues.push({
          type: 'incomplete_organization_schema',
          category: 'STRUCTURED_DATA',
          title: 'Incomplete Organization Schema',
          description: `Organization schema is present but missing important fields: ${missingFields.join(', ')}. Adding these will improve your Knowledge Graph representation and brand visibility. Include: name, logo (high-res image), url (homepage), sameAs (array of social profile URLs).`,
          severity: 'MEDIUM',
          impactScore: 55,
          pageUrl: foundOnPage!,
        });
      }

      // Bonus: Check for contact point
      if (hasContactPoint) {
        passingChecks.push({
          category: 'STRUCTURED_DATA',
          code: 'organization_contact_point',
          title: 'Organization Contact Information',
          description: 'Organization schema includes contactPoint, making it easier for users to reach you.',
          pageUrl: foundOnPage!,
          goodPractice: 'Contact information in schema helps users and search engines',
        });
      }

    } else if (hasPerson) {
      // Check completeness of Person schema
      const person = personData;
      const hasName = !!person.name;
      const hasImage = !!person.image;
      const hasUrl = !!person.url;
      const hasSameAs = person.sameAs && Array.isArray(person.sameAs) && person.sameAs.length > 0;

      const missingFields: string[] = [];
      if (!hasName) missingFields.push('name');
      if (!hasImage) missingFields.push('image');
      if (!hasUrl) missingFields.push('url');
      if (!hasSameAs) missingFields.push('sameAs (social profiles)');

      if (missingFields.length === 0) {
        passingChecks.push({
          category: 'STRUCTURED_DATA',
          code: 'complete_person_schema',
          title: 'Complete Person Schema Found',
          description: `Person schema with all key properties (name, image, url, sameAs) is implemented. This helps Google understand your personal brand and can power your Knowledge Graph panel.`,
          pageUrl: foundOnPage!,
          goodPractice: 'Complete person schema helps Google display rich personal brand information',
        });
      } else {
        issues.push({
          type: 'incomplete_person_schema',
          category: 'STRUCTURED_DATA',
          title: 'Incomplete Person Schema',
          description: `Person schema is present but missing important fields: ${missingFields.join(', ')}. Adding these will improve your Knowledge Graph representation. Include: name, image (profile photo), url (website), sameAs (array of social profile URLs).`,
          severity: 'MEDIUM',
          impactScore: 55,
          pageUrl: foundOnPage!,
        });
      }

    } else {
      // No identity schema found
      issues.push({
        type: 'missing_identity_schema',
        category: 'STRUCTURED_DATA',
        title: 'No Organization or Person Schema Found',
        description: 'Your site is missing Organization or Person schema markup. This structured data helps Google understand who you are and can power your Knowledge Graph panel in search results. Add Organization schema for companies or Person schema for personal brands.\n\nBenefits:\n• Enables Google Knowledge Graph\n• Displays brand logo in search\n• Shows social profiles\n• Improves brand recognition\n• Links your content to your identity',
        severity: 'HIGH',
        impactScore: 72,
        pageUrl: context.baseUrl,
      });
    }

    return { issues, passingChecks };
  }
}
