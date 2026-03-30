/**
 * Local SEO Detection Utilities
 * Advanced phone number and address extraction with multiple fallback strategies
 * Ported from js-seo-crawler with TypeScript enhancements
 */

import * as cheerio from 'cheerio';

export interface LocalSeoData {
  phone: {
    found: boolean;
    number: string | null;
    source: string | null;
  };
  address: {
    found: boolean;
    text: string | null;
    source: string | null;
  };
}

interface AddressCandidate {
  text: string;
  source: string;
}

/**
 * Extract local SEO information (phone and address) from HTML
 */
export function extractLocalSeoData(html: string): LocalSeoData {
  const $ = cheerio.load(html);
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();

  return {
    phone: extractPhoneNumber($, bodyText),
    address: extractAddress($, bodyText),
  };
}

/**
 * Extract phone number with 4-tier fallback strategy
 * 1. tel: links (highest confidence)
 * 2. Schema.org structured data
 * 3. Contact/footer elements
 * 4. Full body text with strict patterns
 */
function extractPhoneNumber($: cheerio.CheerioAPI, bodyText: string): LocalSeoData['phone'] {
  // Strict phone regex with word boundaries
  const phoneRegexStrict = /(?<!\d)(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}(?!\d)/g;
  const intlPhoneRegex = /(?<!\d)\+(?!1\b)\d{1,3}[-.\s]\d{2,5}[-.\s]\d{3,5}(?:[-.\s]\d{1,5})?(?!\d)/g;

  const extractPhoneFromText = (text: string): string | null => {
    phoneRegexStrict.lastIndex = 0;
    intlPhoneRegex.lastIndex = 0;
    const m = phoneRegexStrict.exec(text) || intlPhoneRegex.exec(text);
    return m ? m[0].trim() : null;
  };

  let validPhone: string | null = null;
  let source: string | null = null;

  // 1. tel: links - highest confidence
  const telLinks: Array<{ display: string; href: string }> = [];
  $('a[href^="tel:"]').each((_, el) => {
    const displayText = $(el).text().trim();
    const hrefVal = ($(el).attr('href') || '').replace('tel:', '').trim();
    telLinks.push({ display: displayText, href: hrefVal });

    if (validPhone) return false;

    const candidate = displayText && /\d/.test(displayText) ? displayText : hrefVal;
    if (candidate && /\d{7,}/.test(candidate.replace(/\D/g, '')) && !isFakePhone(candidate)) {
      validPhone = candidate;
      source = 'tel: link';
    }
  });

  // 2. Schema.org structured data
  if (!validPhone) {
    $('script[type="application/ld+json"]').each((_, el) => {
      if (validPhone) return false;
      try {
        const schema = JSON.parse($(el).html() || '');
        const found = findPhoneInSchema(schema);
        if (found && !isFakePhone(found)) {
          validPhone = found;
          source = 'Schema.org';
        }
      } catch {
        // Skip invalid JSON
      }
    });
  }

  // 3. Contact/footer elements
  if (!validPhone) {
    const contactSelectors = [
      'footer',
      '[class*="contact"]',
      '#contact',
      '[class*="phone"]',
      '[class*="tel"]',
      '[itemprop="telephone"]',
      '[class*="footer"]',
    ];

    for (const sel of contactSelectors) {
      if (validPhone) break;
      $(sel).each((_, el) => {
        if (validPhone) return false;
        const elText = $(el).text().replace(/\s+/g, ' ');
        const found = extractPhoneFromText(elText);
        if (found && !isFakePhone(found)) {
          validPhone = found;
          source = `Contact element (${sel})`;
        }
      });
    }
  }

  // 4. Full body text - strict patterns only
  if (!validPhone) {
    const candidate = extractPhoneFromText(bodyText);
    if (candidate && !isFakePhone(candidate)) {
      validPhone = candidate;
      source = 'Body text pattern';
    }
  }

  return {
    found: validPhone !== null,
    number: validPhone,
    source,
  };
}

/**
 * Recursively search for phone in schema object
 */
function findPhoneInSchema(obj: any): string | null {
  if (!obj || typeof obj !== 'object') return null;

  // Check for telephone property
  if (typeof obj.telephone === 'string' && obj.telephone.length > 6) {
    return obj.telephone;
  }

  // Recursively search nested objects and arrays
  for (const val of Object.values(obj)) {
    if (Array.isArray(val)) {
      for (const item of val) {
        const found = findPhoneInSchema(item);
        if (found) return found;
      }
    } else {
      const found = findPhoneInSchema(val);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Detect fake/placeholder phone numbers
 */
function isFakePhone(num: string): boolean {
  const digits = num.replace(/\D/g, '');
  if (digits.length < 7) return true;

  // All same digit: 0000000, 1111111
  if (/^(\d)\1+$/.test(digits)) return true;

  // Sequential ascending (wrapping): 1234567890
  let allAsc = true;
  let allDesc = true;
  for (let i = 1; i < digits.length; i++) {
    const curr = digits[i];
    const prev = digits[i - 1];
    if (!curr || !prev) continue;
    if ((+curr - +prev + 10) % 10 !== 1) allAsc = false;
    if ((+prev - +curr + 10) % 10 !== 1) allDesc = false;
    if (!allAsc && !allDesc) break;
  }

  return allAsc || allDesc;
}

/**
 * Extract address with multiple fallback strategies
 * 1. Schema.org structured data
 * 2. HTML pattern matching (US addresses, City/State/ZIP, PO Box)
 * 3. Microdata itemprop
 * 4. Address-related CSS classes/IDs
 * 5. Footer element scanning
 */
function extractAddress($: cheerio.CheerioAPI, bodyText: string): LocalSeoData['address'] {
  let hasAddress = false;
  let addressText: string | null = null;
  let addressSource: string | null = null;

  // 1. Try Schema.org structured data first
  $('script[type="application/ld+json"]').each((_, el) => {
    if (hasAddress) return false;
    try {
      const schema = JSON.parse($(el).html() || '');
      const addr = extractAddressFromSchema(schema);
      if (addr && addr.length > 15) {
        hasAddress = true;
        addressText = addr;
        addressSource = 'Schema.org';
        return false;
      }
    } catch {
      // Skip invalid JSON
    }
  });

  // 2. HTML pattern matching
  if (!hasAddress) {
    const candidates: AddressCandidate[] = [];

    // Full street address (e.g., "123 Main Street, Albany, NY 12188")
    const usAddressRegex = /\b\d{1,5}\s+[A-Za-z][A-Za-z\s.]+?\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir|Way|Place|Pl|Plaza|Square|Trail|Parkway|Pkwy|Highway|Hwy)\b[,\s]*(?:[A-Za-z\s]+)?[,\s]*(?:[A-Z]{2})?\s*\d{5}?/gi;
    const usMatches = bodyText.match(usAddressRegex);
    if (usMatches) {
      usMatches.forEach((m) => candidates.push({ text: m, source: 'US address pattern' }));
    }

    // City, State ZIP format (e.g., "Waterford, NY 12188")
    const cityStateZipRegex = /(?<![A-Za-z])[A-Za-z][A-Za-z\s]{1,30},\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/g;
    const cityStateMatches = bodyText.match(cityStateZipRegex);
    if (cityStateMatches) {
      cityStateMatches.forEach((m) => candidates.push({ text: m.trim(), source: 'City/State/ZIP pattern' }));
    }

    // PO Box addresses
    const poBoxRegex = /P\.?O\.?\s*Box\s+\d+[,\s]*[A-Za-z\s]*[,\s]*[A-Z]{2}\s*\d{5}/gi;
    const poBoxMatches = bodyText.match(poBoxRegex);
    if (poBoxMatches) {
      poBoxMatches.forEach((m) => candidates.push({ text: m, source: 'PO Box pattern' }));
    }

    // 3. Microdata
    $('[itemprop*="address"], [itemtype*="PostalAddress"]').each((_, el) => {
      const addrText = $(el).text().trim().replace(/\s+/g, ' ');
      if (addrText.length > 15 && addrText.length < 200) {
        candidates.push({ text: addrText, source: 'Microdata itemprop' });
      }
    });

    // 4. Address-related selectors
    const addressSelectors = [
      'address',
      'footer address',
      'footer [itemprop*="address"]',
      '.address',
      '#address',
      '[class*="address"]',
      '.location',
      '#location',
      '[class*="location"]',
      '.contact-info',
      '.contact-address',
      'footer [class*="contact"]',
      'footer [class*="address"]',
      'footer [class*="location"]',
      '[class*="footer"] [class*="address"]',
      '[class*="footer"] [class*="contact"]',
    ];

    addressSelectors.forEach((selector) => {
      $(selector).each((_, el) => {
        const addrText = $(el).text().trim().replace(/\s+/g, ' ');
        if (addrText.length > 10 && addrText.length < 300 && /\d/.test(addrText)) {
          candidates.push({ text: addrText, source: `CSS selector: ${selector}` });
        }
      });
    });

    // 5. Footer element scanning
    if (candidates.length === 0) {
      $('footer p, footer span, footer li, footer div').each((_, el) => {
        const children = $(el).children().length;
        if (children > 3) return;

        const elText = $(el).text().trim().replace(/\s+/g, ' ');
        if (elText.length < 10 || elText.length > 250) return;

        usAddressRegex.lastIndex = 0;
        poBoxRegex.lastIndex = 0;

        if (usAddressRegex.test(elText) || poBoxRegex.test(elText)) {
          candidates.push({ text: elText, source: 'Footer element pattern match' });
        }

        // Generic address pattern
        if (/\d{1,5}\s+\w/.test(elText) && /,/.test(elText) && /\d/.test(elText)) {
          candidates.push({ text: elText, source: 'Footer generic address pattern' });
        }
      });
    }

    // Use the first address found
    if (candidates.length > 0 && candidates[0]) {
      hasAddress = true;
      // Strip leading label words
      addressText = candidates[0].text
        .trim()
        .replace(/^(our\s+)?(location|address)\s*[:.\-–—]?\s*/i, '');
      addressSource = candidates[0].source;
    }
  }

  return {
    found: hasAddress,
    text: addressText,
    source: addressSource,
  };
}

/**
 * Extract address from Schema.org structured data
 */
function extractAddressFromSchema(schema: any): string | null {
  if (!schema || typeof schema !== 'object') return null;

  // Handle @graph array
  if (schema['@graph'] && Array.isArray(schema['@graph'])) {
    for (const item of schema['@graph']) {
      const addr = extractAddressFromSchemaItem(item);
      if (addr) return addr;
    }
  }

  return extractAddressFromSchemaItem(schema);
}

function extractAddressFromSchemaItem(obj: any): string | null {
  if (!obj || typeof obj !== 'object') return null;

  if (obj.address) {
    // String address
    if (typeof obj.address === 'string' && obj.address.length > 15) {
      return obj.address;
    }

    // PostalAddress object
    if (obj.address.streetAddress) {
      const addr = obj.address;
      const parts = [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.postalCode].filter(Boolean);
      const result = parts.join(', ');
      if (result.length > 15) return result;
    }
  }

  // Recursively search nested objects
  for (const val of Object.values(obj)) {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const found = extractAddressFromSchemaItem(val);
      if (found) return found;
    }
  }

  return null;
}
