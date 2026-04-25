import type { PageRule, PageData, SiteContext, RuleResult, CheckDefinition, SEOAuditCheck } from '../../types.js';

interface SERPSnippetPreview {
  url: string;
  displayUrl: string;
  title: string;
  titleTruncated: boolean;
  description: string;
  descriptionTruncated: boolean;
  favicon: string | null;
  siteName: string | null;
}

export class SERPSnippetRule implements PageRule {
  code = 'SERP_SNIPPET';
  category = 'ON_PAGE' as const;
  level = 'page' as const;

  readonly checkDefinition: CheckDefinition = {
    id: 'SERP_SNIPPET',
    name: 'SERP Snippet',
    maxScore: 0,
    priority: 3,
    section: 'seo',
    informational: true,
    what: 'The SERP snippet is how your page appears in Google search results, consisting of the title tag, URL, and meta description.',
    why: 'A compelling SERP snippet drives clicks from search results. Controlling your title and description gives you a chance to advertise your content directly in search results.',
    how: 'Optimize your title tag (40-60 chars) and meta description (120-160 chars) to be compelling and keyword-rich. Test how they look in Google Search Console.',
    time: '30 minutes',
  };

  execute(page: PageData, _context: SiteContext): RuleResult {
    const preview = this.generatePreview(page);

    const check: SEOAuditCheck = {
      ...this.checkDefinition,
      category: this.category,
      passed: null,
      score: 0,
      shortAnswer: this.formatSnippetShortAnswer(preview),
      answer: this.formatSnippetAnswer(preview),
      recommendation: null,
      data: { preview },
      pageUrl: page.url,
    };

    return { check, issues: [], passingChecks: [] };
  }

  private generatePreview(page: PageData): SERPSnippetPreview {
    const title = page.title ?? 'Untitled Page';
    const description = page.description ?? 'No description available';
    const url = new URL(page.url);
    const displayUrl = `${url.hostname}${url.pathname}`;

    const siteName = page.ogTags?.siteName
      ?? url.hostname.replace(/^www\./, '').split('.')[0]?.replace(/^./, c => c.toUpperCase())
      ?? null;

    return {
      url: page.url,
      displayUrl,
      title: title.length > 60 ? title.substring(0, 60) + '...' : title,
      titleTruncated: title.length > 60,
      description: description.length > 160 ? description.substring(0, 160) + '...' : description,
      descriptionTruncated: description.length > 160,
      favicon: page.favicon?.hasFavicon && page.favicon.url ? page.favicon.url : null,
      siteName,
    };
  }

  private formatSnippetShortAnswer(preview: SERPSnippetPreview): string {
    const warnings: string[] = [];
    if (preview.titleTruncated) warnings.push('title truncated');
    if (preview.descriptionTruncated) warnings.push('description truncated');
    return warnings.length > 0
      ? `SERP snippet preview (${warnings.join(', ')}).`
      : 'SERP snippet preview ready.';
  }

  private formatSnippetAnswer(preview: SERPSnippetPreview): string {
    return `Search result preview — Title: "${preview.title}"${preview.titleTruncated ? ' (truncated)' : ''} | Description: "${preview.description.substring(0, 80)}..."${preview.descriptionTruncated ? ' (truncated)' : ''}`;
  }
}
