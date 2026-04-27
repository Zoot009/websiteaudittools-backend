import type { SiteRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class IdentitySchemaRule implements SiteRule {
  code = 'IDENTITY_SCHEMA';
  category = 'STRUCTURED_DATA' as const;
  level = 'site' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'IDENTITY_SCHEMA',
    name: 'Identity Schema',
    maxScore: 4,
    priority: 2,
    section: 'seo',
    informational: false,
    what: 'Identity schema (Organization or Person) is structured data that tells Google who you are, linking your website to your brand identity in the Knowledge Graph.',
    why: 'Organization and Person schemas power Google\'s Knowledge Graph panels, display your logo in search results, connect your social profiles, and improve brand recognition — directly impacting E-E-A-T signals that influence rankings.',
    how: 'Add an Organization schema to your homepage with: name, logo (high-resolution image), url (homepage), and sameAs (array of all social profile URLs). Use Person schema for personal brands and bloggers.',
    time: '1-2 hours',
  };

  execute(pages: PageData[], context: SiteContext): RuleResult {
    let hasOrganization = false;
    let hasPerson = false;
    let schemaData: Record<string, unknown> | null = null;
    let schemaType: 'Organization' | 'Person' | null = null;
    let foundOnPage: string | null = null;

    for (const page of pages) {
      if (!page.schemas || page.schemas.length === 0) continue;
      for (const schema of page.schemas) {
        const type = schema.type.toLowerCase();
        if (type === 'organization') {
          hasOrganization = true;
          schemaData = schema.data;
          schemaType = 'Organization';
          foundOnPage = page.url;
          break;
        } else if (type === 'person') {
          hasPerson = true;
          schemaData = schema.data;
          schemaType = 'Person';
          foundOnPage = page.url;
          break;
        }
      }
      if (hasOrganization || hasPerson) break;
    }

    if (!hasOrganization && !hasPerson) {
      const check: SEOAuditCheck = {
        ...this.checkDefinition,
        category: this.category,
        passed: false,
        score: 0,
        shortAnswer: 'No Organization or Person schema found.',
        answer: 'Site is missing Organization or Person schema markup. This structured data helps Google understand your brand identity and powers Knowledge Graph panels in search results.',
        recommendation: 'Add an Organization schema to your homepage with name, logo, url, and sameAs properties linking to all your social profiles.',
        pageUrl: context.baseUrl,
      };
      return {
        check,
        issues: [{
          category: this.category,
          type: 'MISSING_IDENTITY_SCHEMA',
          title: 'No Organization or Person Schema Found',
          description: check.answer,
          severity: 'HIGH' as const,
          impactScore: 72,
          pageUrl: context.baseUrl,
        }],
        passingChecks: [],
      };
    }

    const data = schemaData!;
    const isOrg = schemaType === 'Organization';

    const hasName = !!data.name;
    const hasLogoOrImage = !!(isOrg ? data.logo : data.image);
    const hasUrl = !!data.url;
    const hasSameAs = Array.isArray(data.sameAs) && (data.sameAs as unknown[]).length > 0;
    const hasContactPoint = !!data.contactPoint;

    const missingFields: string[] = [];
    if (!hasName) missingFields.push('name');
    if (!hasLogoOrImage) missingFields.push(isOrg ? 'logo' : 'image');
    if (!hasUrl) missingFields.push('url');
    if (!hasSameAs) missingFields.push('sameAs (social profiles)');

    const passed = missingFields.length === 0;
    const score = passed
      ? this.checkDefinition.maxScore
      : missingFields.length === 1
        ? 3
        : missingFields.length === 2
          ? 2
          : 1;

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score,
      shortAnswer: passed
        ? `Complete ${schemaType} schema found.`
        : `${schemaType} schema found but missing ${missingFields.length} field(s).`,
      answer: passed
        ? `${schemaType} schema with all key properties (name, ${isOrg ? 'logo' : 'image'}, url, sameAs) is implemented, enabling Google Knowledge Graph integration.`
        : `${schemaType} schema is present but missing: ${missingFields.join(', ')}. These fields are needed for the Knowledge Graph panel and brand recognition in search results.`,
      recommendation: passed ? null : `Add the missing fields to your ${schemaType} schema: ${missingFields.join(', ')}.`,
      data: { schemaType, hasName, hasLogoOrImage, hasUrl, hasSameAs, hasContactPoint, missingFields },
      pageUrl: foundOnPage ?? context.baseUrl,
    };

    const issues = !passed ? [{
      category: this.category,
      type: `INCOMPLETE_${schemaType!.toUpperCase()}_SCHEMA`,
      title: `Incomplete ${schemaType} Schema`,
      description: check.answer,
      severity: 'MEDIUM' as const,
      impactScore: 55,
      pageUrl: foundOnPage ?? context.baseUrl,
    }] : [];

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: `Complete ${schemaType} Schema Found`,
      description: check.shortAnswer,
      pageUrl: foundOnPage ?? context.baseUrl,
      goodPractice: `Complete ${schemaType} schema helps Google display rich brand information and power Knowledge Graph results.`,
    }] : [];

    if (passed && hasContactPoint) {
      passingChecks.push({
        category: this.category,
        code: 'IDENTITY_SCHEMA_CONTACT',
        title: 'Organization Contact Information in Schema',
        description: 'Schema includes contactPoint, making contact information accessible to search engines.',
        pageUrl: foundOnPage ?? context.baseUrl,
        goodPractice: 'Contact information in schema helps users and search engines find your business.',
      });
    }

    return { check, issues, passingChecks };
  }
}
