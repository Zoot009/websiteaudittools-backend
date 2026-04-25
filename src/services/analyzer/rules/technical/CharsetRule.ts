import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class CharsetRule implements PageRule {
  code = 'CHARSET_UTF8';
  category = 'TECHNICAL' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'CHARSET_UTF8',
    name: 'Charset UTF-8',
    maxScore: 2,
    priority: 3,
    section: 'seo',
    informational: false,
    what: 'Character encoding (charset) tells browsers how to interpret text characters on your page. UTF-8 is the universal standard that supports all languages and special characters.',
    why: 'Incorrect or missing charset declarations can cause text to display incorrectly, especially for non-English content. UTF-8 is recommended by W3C and supports international SEO efforts.',
    how: 'Add <meta charset="UTF-8"> in the <head> section of your HTML, preferably as the first meta tag. Most modern frameworks and CMS platforms include this by default.',
    time: '5 minutes',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    const charset = page.charset?.toUpperCase() ?? null;
    const passed = charset === 'UTF-8';
    const score = passed ? this.checkDefinition.maxScore : charset ? 1 : 0;

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score,
      shortAnswer: passed
        ? 'Charset is set to UTF-8.'
        : charset
          ? `Charset is set to ${charset}, not UTF-8.`
          : 'No charset declaration found.',
      answer: passed
        ? 'Page declares UTF-8 character encoding, ensuring correct text rendering across all browsers and languages.'
        : charset
          ? `Page uses "${charset}" charset instead of UTF-8. UTF-8 is the recommended standard for modern web pages.`
          : `Page "${page.url}" has no charset declaration. Add <meta charset="UTF-8"> to the <head> section.`,
      recommendation: passed ? null : charset
        ? 'Change the charset declaration to UTF-8 for full international character support.'
        : 'Add <meta charset="UTF-8"> as the first element inside the <head> section.',
      data: { charset },
      pageUrl: page.url,
    };

    const issues = !passed ? [{
      category: this.category,
      type: charset ? 'NON_UTF8_CHARSET' : 'MISSING_CHARSET',
      title: charset ? 'Non-UTF-8 Charset Declared' : 'Missing Charset Declaration',
      description: check.answer,
      severity: 'LOW' as const,
      impactScore: charset ? 3 : 5,
      pageUrl: page.url,
      elementSelector: 'meta[charset]',
    }] : [];

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: 'UTF-8 Charset Declared',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'UTF-8 ensures proper display of international characters and special symbols.',
    }] : [];

    return { check, issues, passingChecks };
  }
}
