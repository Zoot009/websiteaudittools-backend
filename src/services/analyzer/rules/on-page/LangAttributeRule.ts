import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

export class LangAttributeRule implements PageRule {
  code = 'LANG_ATTRIBUTE';
  category = 'ON_PAGE' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'LANG_ATTRIBUTE',
    name: 'Language',
    maxScore: 2,
    priority: 3,
    section: 'seo',
    informational: false,
    what: 'The lang attribute in the HTML tag declares the primary language of a page. It helps browsers and assistive technologies properly render and interpret content.',
    why: 'The lang attribute improves accessibility for screen readers and helps search engines return language-specific results. It\'s a simple attribute that provides important context about your content.',
    how: 'Add the lang attribute to your <html> tag: <html lang="en"> for English, <html lang="es"> for Spanish. Use correct ISO 639-1 language codes. Most CMS platforms set this automatically.',
    time: '5 minutes',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    const passed = !!(page.langAttr && page.langAttr.trim().length > 0);

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed,
      score: passed ? this.checkDefinition.maxScore : 0,
      shortAnswer: passed
        ? `Language declared as "${page.langAttr}".`
        : 'Lang attribute is missing on <html> tag.',
      answer: passed
        ? `Page declares language as "${page.langAttr}" on the <html> tag, improving accessibility and browser behavior.`
        : `Page "${page.url}" is missing a lang attribute on the <html> tag. This helps browsers and assistive technologies interpret content correctly.`,
      recommendation: passed ? null : 'Add lang="en" (or appropriate language code) to your <html> tag.',
      data: { langAttr: page.langAttr ?? null },
      pageUrl: page.url,
    };

    const issues = !passed ? [{
      category: this.category,
      type: this.code,
      title: 'Missing Lang Attribute',
      description: check.answer,
      severity: 'LOW' as const,
      impactScore: 5,
      pageUrl: page.url,
      elementSelector: 'html',
    }] : [];

    const passingChecks = passed ? [{
      category: this.category,
      code: this.code,
      title: 'Lang Attribute Present',
      description: check.shortAnswer,
      pageUrl: page.url,
      goodPractice: 'The lang attribute helps screen readers pronounce content correctly and aids browser translation features.',
    }] : [];

    return { check, issues, passingChecks };
  }
}
