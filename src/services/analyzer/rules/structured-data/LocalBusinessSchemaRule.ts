import type { SiteRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck, Issue } from '../../types.js';

const LOCAL_BUSINESS_TYPES = new Set([
  'localbusiness',
  'foodestablishment', 'restaurant', 'caffeorcoffeeshop', 'fastfoodrestaurant',
  'barorpub', 'bakery', 'icecreamshop', 'winery', 'brewery',
  'lodgingbusiness', 'hotel', 'motel', 'hostel', 'resort', 'bnb',
  'medicalbusiness', 'dentist', 'physician', 'hospital', 'pharmacy',
  'optician', 'veterinarycare', 'physiotherapist',
  'legalservice', 'attorney', 'notary', 'financialservice',
  'accountingservice', 'insuranceagency', 'realestatealent',
  'store', 'grocerystore', 'hardwarestore', 'clothingstore', 'electronicstore',
  'petstore', 'bookstore', 'furniturestore', 'homeandconstructionbusiness',
  'autodealer', 'autorepair', 'beautysalon', 'barbershop', 'hairsalon',
  'spaorhealthclub', 'gymorfitnesscenter', 'movingcompany',
  'drycleaning', 'laundry', 'locksmith', 'electrician', 'plumber', 'roofer',
  'entertainmentbusiness', 'sportsclub', 'travelagency', 'touristinformationcenter',
  'movietheatre', 'nightclub',
  'governmentoffice', 'postaloffice', 'policestation', 'library',
  'childcare', 'school',
]);

export class LocalBusinessSchemaRule implements SiteRule {
  code = 'LOCAL_BUSINESS_SCHEMA';
  category = 'STRUCTURED_DATA' as const;
  level = 'site' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'LOCAL_BUSINESS_SCHEMA',
    name: 'Local Business Schema',
    maxScore: 3,
    priority: 2,
    section: 'geo',
    informational: false,
    what: 'LocalBusiness schema is JSON-LD markup that provides Google with structured information about your business including address, phone, hours, and type — enabling rich results in Search and Maps.',
    why: 'LocalBusiness schema enables Google to display your business information directly in search results (address, hours, phone, ratings), significantly increasing visibility and click-through rates for local searches.',
    how: 'Add a LocalBusiness JSON-LD script to your homepage with: name, address (with streetAddress), telephone, url, and openingHours. Include image and aggregateRating for the richest results.',
    time: '1-2 hours',
  };

  execute(pages: PageData[], context: SiteContext): RuleResult {
    let foundSchema: Record<string, unknown> | null = null;
    let foundOnPage: string | null = null;

    for (const page of pages) {
      if (!page.schemas || page.schemas.length === 0) continue;
      for (const schema of page.schemas) {
        if (LOCAL_BUSINESS_TYPES.has(schema.type.toLowerCase())) {
          foundSchema = schema.data;
          foundOnPage = page.url;
          break;
        }
      }
      if (foundSchema) break;
    }

    if (!foundSchema) {
      const hasLocalSignals = pages.some(
        (p) => p.localSeo?.phone?.found || p.localSeo?.address?.found
      );

      if (!hasLocalSignals) {
        const stub: SEOAuditCheck = {
          ...this.checkDefinition,
          maxScore: 0,
          informational: true,
          category: this.category,
          passed: null,
          score: 0,
          shortAnswer: 'LocalBusiness schema check applies to local businesses.',
          answer: 'No local business signals detected. LocalBusiness schema check skipped for non-local sites.',
          recommendation: null,
          pageUrl: context.baseUrl,
        };
        return { check: stub, issues: [], passingChecks: [] };
      }

      const check: SEOAuditCheck = {
        ...this.checkDefinition,
        category: this.category,
        passed: false,
        score: 0,
        shortAnswer: 'No LocalBusiness schema found.',
        answer: 'Site shows local business signals (phone/address) but has no LocalBusiness JSON-LD schema. This misses rich result opportunities in Google Search and Maps.',
        recommendation: 'Add a LocalBusiness schema with name, address, telephone, url, and openingHours to your homepage.',
        pageUrl: context.baseUrl,
      };
      return {
        check,
        issues: [{
          category: this.category,
          type: this.code,
          title: 'Missing LocalBusiness Schema',
          description: check.answer,
          severity: 'HIGH' as const,
          impactScore: 30,
        }],
        passingChecks: [],
      };
    }

    const data = foundSchema;
    const requiredFields = [
      { key: 'name', label: 'name' },
      { key: 'address', label: 'address' },
      { key: 'telephone', label: 'telephone' },
      { key: 'url', label: 'url' },
    ];

    const missingRequired = requiredFields.filter((f) => !data[f.key]).map((f) => f.label);

    const addressIncomplete =
      data.address &&
      typeof data.address === 'object' &&
      !(data.address as Record<string, unknown>).streetAddress &&
      !(data.address as Record<string, unknown>)['street-address'];

    if (addressIncomplete) missingRequired.push('address.streetAddress');

    const hasHours = !!data['openingHours'] || !!data['openingHoursSpecification'];
    const hasRating = !!data['aggregateRating'];
    const hasGeo = !!data['geo'];

    const passed = missingRequired.length === 0;
    const score = passed
      ? this.checkDefinition.maxScore
      : missingRequired.length <= 1
        ? 2
        : 1;

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score,
      shortAnswer: passed
        ? 'LocalBusiness schema is correctly implemented.'
        : `LocalBusiness schema missing required field(s): ${missingRequired.join(', ')}.`,
      answer: passed
        ? 'LocalBusiness schema with required fields (name, address, telephone, url) is correctly implemented, enabling rich results in Google Search and Maps.'
        : `LocalBusiness schema is present but missing required fields: ${missingRequired.join(', ')}. These are needed for Google to display your business information correctly in rich results.`,
      recommendation: passed ? null : `Add the missing required fields to your LocalBusiness schema: ${missingRequired.join(', ')}.`,
      data: { missingRequired, hasHours, hasRating, hasGeo },
      pageUrl: foundOnPage ?? context.baseUrl,
    };

    const issues: Issue[] = [];

    if (!passed) {
      issues.push({
        category: this.category,
        type: 'INCOMPLETE_LOCAL_BUSINESS_SCHEMA',
        title: 'Incomplete LocalBusiness Schema',
        description: check.answer,
        severity: 'MEDIUM' as const,
        impactScore: 20,
        pageUrl: foundOnPage ?? context.baseUrl,
      });
    }

    if (passed && !hasHours) {
      issues.push({
        category: this.category,
        type: 'MISSING_OPENING_HOURS_SCHEMA',
        title: 'Opening Hours Missing from LocalBusiness Schema',
        description: 'Your LocalBusiness schema does not include opening hours. Adding openingHours enables Google to show your business hours in rich results.',
        severity: 'LOW' as const,
        impactScore: 8,
        pageUrl: foundOnPage ?? context.baseUrl,
      });
    }

    if (passed && !hasRating) {
      issues.push({
        category: this.category,
        type: 'MISSING_AGGREGATE_RATING_SCHEMA',
        title: 'No Aggregate Rating in LocalBusiness Schema',
        description: 'Adding aggregateRating to your LocalBusiness schema enables star ratings in search results, significantly increasing click-through rates.',
        severity: 'LOW' as const,
        impactScore: 8,
        pageUrl: foundOnPage ?? context.baseUrl,
      });
    }

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: 'LocalBusiness Schema Present',
      description: check.shortAnswer,
      pageUrl: foundOnPage ?? context.baseUrl,
      goodPractice: 'LocalBusiness schema helps Google display your address, hours, phone, and reviews directly in search results.',
    }] : [];

    if (hasGeo) {
      passingChecks.push({
        category: this.category,
        code: 'LOCAL_BUSINESS_GEO',
        title: 'LocalBusiness Geo Coordinates Present',
        description: 'Schema includes geo coordinates, enabling precise map placement.',
        pageUrl: foundOnPage ?? context.baseUrl,
        goodPractice: 'Geo coordinates improve accuracy in Google Maps results.',
      });
    }

    return { check, issues, passingChecks };
  }
}
