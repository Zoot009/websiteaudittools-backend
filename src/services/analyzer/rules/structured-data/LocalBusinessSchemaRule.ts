/**
 * Check for LocalBusiness schema markup
 * Helps Google display rich results for local businesses (address, hours, phone, etc.)
 */

import type { SiteRule, PageData, SiteContext, RuleResult, Issue, PassingCheck } from '../../types.js';

/**
 * Schema.org LocalBusiness subtypes commonly used.
 * All inherit the LocalBusiness properties.
 */
const LOCAL_BUSINESS_TYPES = new Set([
  'localbusiness',
  // Food & drink
  'foodestablishment', 'restaurant', 'caffeorcoffeeshop', 'fastfoodrestaurant',
  'barorpub', 'bakery', 'icecreamshop', 'winery', 'brewery',
  // Lodging
  'lodgingbusiness', 'hotel', 'motel', 'hostel', 'resort', 'bnb',
  // Health
  'medicalbusiness', 'dentist', 'physician', 'hospital', 'pharmacy',
  'optician', 'veterinarycare', 'physiotherapist',
  // Legal & financial
  'legalservice', 'attorney', 'notary', 'financialservice',
  'accountingservice', 'insuranceagency', 'realestatealent',
  // Retail
  'store', 'grocerystore', 'hardwarestore', 'clothingstore', 'electronicstore',
  'petstore', 'bookstore', 'furniturestore', 'homeandconstructionbusiness',
  // Services
  'autodealer', 'autorepair', 'beautysalon', 'barbershop', 'hairsalon',
  'spaorhealthclub', 'gymorfitnesscenter', 'movingcompany',
  'drycleaning', 'laundry', 'locksmith', 'electrician', 'plumber', 'roofer',
  // Entertainment & travel
  'entertainmentbusiness', 'sportsclub', 'travelagency', 'touristinformationcenter',
  'movietheatre', 'nightclub',
  // Education & government
  'governmentoffice', 'postaloffice', 'policestation', 'library',
  'childcare', 'school',
]);

function isLocalBusinessType(type: string): boolean {
  return LOCAL_BUSINESS_TYPES.has(type.toLowerCase());
}

export class LocalBusinessSchemaRule implements SiteRule {
  code = 'LOCAL_BUSINESS_SCHEMA';
  category = 'STRUCTURED_DATA' as const;
  level = 'site' as const;

  execute(pages: PageData[], _context: SiteContext): RuleResult {
    const issues: Issue[] = [];
    const passingChecks: PassingCheck[] = [];

    let foundSchema: any = null;
    let foundOnPage: string | null = null;

    // Search all pages for a LocalBusiness schema
    for (const page of pages) {
      if (!page.schemas || page.schemas.length === 0) continue;

      for (const schema of page.schemas) {
        if (isLocalBusinessType(schema.type)) {
          foundSchema = schema.data;
          foundOnPage = page.url;
          break;
        }
      }
      if (foundSchema) break;
    }

    if (!foundSchema) {
      // Only flag if any page has actual local signals (phone/address) — indicates a local business
      const hasLocalSignals = pages.some(
        (p) => p.localSeo?.phone?.found || p.localSeo?.address?.found
      );

      if (hasLocalSignals) {
        issues.push({
          category: this.category,
          type: this.code,
          title: 'Missing LocalBusiness Schema',
          description:
            'Your site shows local business signals (phone/address) but has no LocalBusiness JSON-LD schema. ' +
            'Adding a LocalBusiness schema helps Google display your address, hours, phone, and reviews in Search and Maps.',
          severity: 'HIGH' as const,
          impactScore: 30,
        });
      } else {
        // No local signals — can't determine if it's a local business, skip
        return { issues, passingChecks };
      }

      return { issues, passingChecks };
    }

    // Schema found — validate required and recommended fields
    const data = foundSchema;
    const requiredFields: Array<{ key: string; label: string }> = [
      { key: 'name', label: 'name' },
      { key: 'address', label: 'address' },
      { key: 'telephone', label: 'telephone' },
      { key: 'url', label: 'url' },
    ];
    const recommendedFields: Array<{ key: string; label: string }> = [
      { key: 'openingHours', label: 'openingHours' },
      { key: 'openingHoursSpecification', label: 'openingHoursSpecification' },
      { key: 'geo', label: 'geo (lat/long)' },
      { key: 'image', label: 'image' },
      { key: 'priceRange', label: 'priceRange' },
      { key: 'aggregateRating', label: 'aggregateRating' },
    ];

    const missingRequired = requiredFields.filter((f) => !data[f.key]);
    const missingRecommended = recommendedFields.filter(
      (f) => !data[f.key]
    );

    // Address must be an object with at least streetAddress
    let addressIncomplete = false;
    if (data.address && typeof data.address === 'object') {
      const addr = data.address;
      if (!addr.streetAddress && !addr['street-address']) {
        addressIncomplete = true;
      }
    }

    if (missingRequired.length > 0 || addressIncomplete) {
      const missingList = [
        ...missingRequired.map((f) => f.label),
        ...(addressIncomplete ? ['address.streetAddress'] : []),
      ];
      issues.push({
        category: this.category,
        type: 'INCOMPLETE_LOCAL_BUSINESS_SCHEMA',
        title: 'Incomplete LocalBusiness Schema',
        description:
          `LocalBusiness schema is present but missing required fields: ${missingList.join(', ')}. ` +
          'These fields are required for Google to display your business information correctly in rich results.',
        severity: 'MEDIUM' as const,
        impactScore: 20,
        pageUrl: foundOnPage!,
      });
    } else {
      passingChecks.push({
        category: this.category,
        code: this.code,
        title: 'LocalBusiness Schema Present',
        description:
          `LocalBusiness schema with required fields (name, address, telephone, url) is correctly implemented.`,
        pageUrl: foundOnPage!,
        goodPractice:
          'LocalBusiness schema helps Google display your address, hours, phone, and reviews directly in search results.',
      });
    }

    // Warn about missing recommended fields (low severity)
    if (missingRecommended.length > 0) {
      const hasHours =
        !!data['openingHours'] || !!data['openingHoursSpecification'];
      if (!hasHours) {
        issues.push({
          category: this.category,
          type: 'MISSING_OPENING_HOURS_SCHEMA',
          title: 'Opening Hours Missing from LocalBusiness Schema',
          description:
            'Your LocalBusiness schema does not include opening hours. ' +
            'Adding openingHours or openingHoursSpecification enables Google to show your business hours in rich results.',
          severity: 'LOW' as const,
          impactScore: 8,
          pageUrl: foundOnPage!,
        });
      }

      if (!data['aggregateRating']) {
        issues.push({
          category: this.category,
          type: 'MISSING_AGGREGATE_RATING_SCHEMA',
          title: 'No Aggregate Rating in LocalBusiness Schema',
          description:
            'Adding aggregateRating to your LocalBusiness schema enables star ratings to appear in search results, ' +
            'which significantly increases click-through rates.',
          severity: 'LOW' as const,
          impactScore: 8,
          pageUrl: foundOnPage!,
        });
      }

      if (data['geo']) {
        passingChecks.push({
          category: this.category,
          code: 'local_business_geo',
          title: 'LocalBusiness Geo Coordinates Present',
          description: 'Schema includes geo coordinates, enabling precise map placement.',
          pageUrl: foundOnPage!,
          goodPractice: 'Geo coordinates improve accuracy in Google Maps results.',
        });
      }
    }

    return { issues, passingChecks };
  }
}
