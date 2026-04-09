/**
 * SEOptimer-Style Content & Analysis Rules
 * Enhanced rules to match SEOptimer's free report features
 */

import type { AuditRule, RuleContext, SeoIssue, FixRecommendation } from '../../types';
import * as cheerio from 'cheerio';

/**
 * Helper: Extract keywords from text
 */
function extractKeywords(text: string, minLength: number = 3, topN: number = 20): Map<string, number> {
  // Common stop words to exclude
  const stopWords = new Set([
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
    'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
    'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
    'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
    'is', 'are', 'was', 'were', 'been', 'has', 'had', 'can', 'could',
    'should', 'may', 'might', 'must', 'shall', 'will', 'would'
  ]);
  
  // Tokenize and count
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= minLength && !stopWords.has(word));
  
  const frequency = new Map<string, number>();
  words.forEach(word => {
    frequency.set(word, (frequency.get(word) || 0) + 1);
  });
  
  // Sort by frequency and take top N
  const sorted = Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);
  
  return new Map(sorted);
}

/**
 * Rule: Keyword Consistency Analysis
 * Severity: INFO (provides analysis, not necessarily an issue)
 * Category: On-Page
 */
export const keywordConsistencyRule: AuditRule = {
  code: 'KEYWORD_CONSISTENCY',
  name: 'Keyword consistency analysis',
  category: 'ON_PAGE',
  severity: 'LOW',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page } = context;
    const issues: SeoIssue[] = [];
    
    try {
      const $ = cheerio.load(page.html);
      
      // Extract text from key areas
      const titleText = page.title || '';
      const metaDesc = page.description || '';
      const headingsText = page.headings.map(h => h.text).join(' ');
      const bodyText = $('body').text();
      
      // Extract top keywords from body
      const keywords = extractKeywords(bodyText, 4, 10);
      
      if (keywords.size === 0) {
        return issues;
      }
      
      // Check consistency for top keywords
      const inconsistentKeywords: string[] = [];
      const consistentKeywords: string[] = [];
      
      keywords.forEach((frequency, keyword) => {
        const inTitle = titleText.toLowerCase().includes(keyword);
        const inMeta = metaDesc.toLowerCase().includes(keyword);
        const inHeadings = headingsText.toLowerCase().includes(keyword);
        
        // Keyword appears frequently in content but not in important tags
        if (frequency >= 3 && !inTitle && !inMeta && !inHeadings) {
          inconsistentKeywords.push(keyword);
        } else if (inTitle || inMeta) {
          consistentKeywords.push(keyword);
        }
      });
      
      // Create keyword data for display
      const keywordData: Array<{keyword: string, frequency: number, inTitle: boolean, inMeta: boolean, inHeadings: boolean}> = [];
      let index = 0;
      for (const [keyword, frequency] of keywords) {
        if (index >= 8) break; // Top 8 keywords
        keywordData.push({
          keyword,
          frequency,
          inTitle: titleText.toLowerCase().includes(keyword),
          inMeta: metaDesc.toLowerCase().includes(keyword),
          inHeadings: headingsText.toLowerCase().includes(keyword),
        });
        index++;
      }
      
      if (inconsistentKeywords.length > 0) {
        issues.push({
          category: 'ON_PAGE',
          type: 'keyword_consistency_poor',
          title: 'Keywords Not Distributed Well',
          description: `Your page's main keywords (${inconsistentKeywords.slice(0, 3).join(', ')}) appear frequently in content but not in title, meta description, or heading tags. This reduces ranking potential.`,
          severity: 'LOW',
          impactScore: 45,
          pageUrl: page.url,
          elementSelector: JSON.stringify({ keywords: keywordData }),
        });
      } else if (consistentKeywords.length >= 2) {
        issues.push({
          category: 'ON_PAGE',
          type: 'keyword_consistency_good',
          title: 'Good Keyword Consistency',
          description: `Your important keywords (${consistentKeywords.slice(0, 3).join(', ')}) are well distributed across title, meta tags, and content.`,
          severity: 'LOW',
          impactScore: 0,
          pageUrl: page.url,
          elementSelector: JSON.stringify({ keywords: keywordData }),
        });
      }
    } catch (error) {
      // Skip if parsing fails
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue): FixRecommendation => ({
    title: 'Improve keyword distribution',
    whyItMatters: 'Keywords should appear consistently across your most important HTML elements (title, meta description, headings) and naturally in your content. This signals to search engines what your page is about.',
    howToFix: [
      'Identify your target keywords (the terms you want to rank for)',
      'Include your main keyword in the page title (preferably near the beginning)',
      'Use your main keyword in the meta description naturally',
      'Include your keyword in at least one heading tag (H1, H2, or H3)',
      'Use related keywords and variations throughout your content',
      'Avoid keyword stuffing - write naturally for humans first',
      'Aim for 1-2% keyword density (not too high, not too low)',
    ],
    estimatedEffort: 'low',
    priority: 6,
  }),
};

/**
 * Rule: H2-H6 Heading Structure Analysis
 * Severity: INFO
 * Category: On-Page
 */
export const headingStructureRule: AuditRule = {
  code: 'HEADING_STRUCTURE',
  name: 'Heading structure analysis',
  category: 'ON_PAGE',
  severity: 'LOW',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page } = context;
    const issues: SeoIssue[] = [];
    
    // Count headings by level
    const counts = {
      h1: page.headings.filter(h => h.level === 1).length,
      h2: page.headings.filter(h => h.level === 2).length,
      h3: page.headings.filter(h => h.level === 3).length,
      h4: page.headings.filter(h => h.level === 4).length,
      h5: page.headings.filter(h => h.level === 5).length,
      h6: page.headings.filter(h => h.level === 6).length,
    };
    
    const totalHeadings = page.headings.length;
    const levelsUsed = Object.values(counts).filter(count => count > 0).length;
    
    if (levelsUsed >= 3) {
      // Good heading structure - return empty to trigger passing check
      return [];
    } else if (totalHeadings === 0) {
      issues.push({
        category: 'ON_PAGE',
        type: 'heading_structure_missing',
        title: 'No Heading Tags Found',
        description: 'Your page has no heading tags (H1-H6). Headings help structure content for users and search engines.',
        severity: 'HIGH',
        impactScore: 80,
        pageUrl: page.url,
      });
    } else if (levelsUsed < 3) {
      issues.push({
        category: 'ON_PAGE',
        type: 'heading_structure_limited',
        title: 'Limited Heading Structure',
        description: `Your page only uses ${levelsUsed} heading level(s). Consider using at least H1, H2, and H3 tags to better organize content.`,
        severity: 'LOW',
        impactScore: 35,
        pageUrl: page.url,
        elementSelector: JSON.stringify(counts),
      });
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue): FixRecommendation => ({
    title: 'Use multiple heading levels',
    whyItMatters: 'A well-structured hierarchy of heading tags (H1 through H3 at minimum) helps search engines understand your content organization and improves accessibility for screen readers.',
    howToFix: [
      'Start with one H1 tag for your main page title',
      'Use H2 tags for major sections of your content',
      'Use H3 tags for subsections within H2 sections',
      'Use H4-H6 for further subdivisions if needed',
      'Maintain proper hierarchy (don\'t skip from H2 to H5)',
      'Include relevant keywords naturally in your headings',
      'Keep headings descriptive and meaningful',
    ],
    estimatedEffort: 'low',
    priority: 5,
  }),
};

/**
 * Rule: Word Count Analysis
 * Severity: INFO (provides measurement)
 * Category: Content
 */
export const wordCountRule: AuditRule = {
  code: 'WORD_COUNT',
  name: 'Content length analysis',
  category: 'ON_PAGE',
  severity: 'LOW',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page } = context;
    const issues: SeoIssue[] = [];
    
    const wordCount = page.wordCount;
    
    if (wordCount >= 500) {
      // Good content length - return empty to trigger passing check
      return [];
    } else if (wordCount >= 300) {
      issues.push({
        category: 'ON_PAGE',
        type: 'word_count_moderate',
        title: 'Moderate Content Length',
        description: `Your page has ${wordCount} words. While acceptable, consider expanding to 500+ words for better ranking potential.`,
        severity: 'LOW',
        impactScore: 30,
        pageUrl: page.url,
      });
    }
    // Thin content (< 300 words) is already handled by thinContentRule
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue, context: RuleContext): FixRecommendation => ({
    title: 'Expand content length',
    whyItMatters: 'Longer, comprehensive content tends to rank better in search results. Studies show a correlation between word count and rankings, though quality matters more than quantity.',
    howToFix: [
      `Expand your content from ${context.page.wordCount} to at least 500-1000 words`,
      'Add more detailed explanations and examples',
      'Answer common questions about your topic',
      'Include case studies or data to support your points',
      'Add relevant images, charts, or videos (with descriptive text)',
      'Ensure all added content provides value - no fluff',
      'Break up long sections with headings for readability',
    ],
    estimatedEffort: 'medium',
    priority: 5,
  }),
};

/**
 * Rule: Link Structure Analysis
 * Severity: INFO
 * Category: Links
 */
export const linkStructureRule: AuditRule = {
  code: 'LINK_STRUCTURE',
  name: 'Link structure analysis',
  category: 'LINKS',
  severity: 'LOW',
  
  run: (context: RuleContext): SeoIssue[] => {
    const { page } = context;
    const issues: SeoIssue[] = [];
    
    try {
      const $ = cheerio.load(page.html);
      
      // Analyze all links
      const links = $('a[href]');
      let internalLinksFollow = 0;
      let externalLinksFollow = 0;
      let externalLinksNofollow = 0;
      const unfriendlyUrls: string[] = [];
      
      links.each((_, elem) => {
        const href = $(elem).attr('href') || '';
        const rel = $(elem).attr('rel') || '';
        const isNofollow = rel.includes('nofollow');
        
        // Skip non-http links
        if (!href.startsWith('http') && !href.startsWith('/') && !href.startsWith('#')) {
          return;
        }
        
        // Check if external
        const isExternal = href.startsWith('http') && !href.includes(new URL(page.url).hostname);
        
        if (isExternal) {
          if (isNofollow) {
            externalLinksNofollow++;
          } else {
            externalLinksFollow++;
          }
        } else {
          internalLinksFollow++;
        }
        
        // Check for unfriendly URLs (very long, with parameters, etc.)
        const queryString = href.split('?')[1];
        if (href.length > 100 || 
            (href.includes('?') && queryString && queryString.includes('&') && queryString.split('&').length > 3) ||
            href.includes('=') && /[0-9a-f]{32,}/.test(href)) {
          if (unfriendlyUrls.length < 3) {
            unfriendlyUrls.push(href.substring(0, 100));
          }
        }
      });
      
      const totalLinks = internalLinksFollow + externalLinksFollow + externalLinksNofollow;
      const externalPercentage = totalLinks > 0 ? Math.round(((externalLinksFollow + externalLinksNofollow) / totalLinks) * 100) : 0;
      
      // Warn if too many external links
      if (externalPercentage > 30 && externalLinksFollow > 10) {
        issues.push({
          category: 'LINKS',
          type: 'too_many_external_links',
          title: 'High External Link Ratio',
          description: `${externalPercentage}% of your links are external. Consider adding more internal links to keep users on your site and distribute link equity.`,
          severity: 'LOW',
          impactScore: 25,
          pageUrl: page.url,
        });
      }
      
      // Warn about unfriendly URLs
      if (unfriendlyUrls.length > 0) {
        issues.push({
          category: 'LINKS',
          type: 'unfriendly_urls',
          title: 'Some Link URLs Are Not User-Friendly',
          description: `Found ${unfriendlyUrls.length}+ URLs that are not human-readable. Examples: ${unfriendlyUrls.join(', ')}...`,
          severity: 'LOW',
          impactScore: 20,
          pageUrl: page.url,
        });
      }
    } catch (error) {
      // Skip if parsing fails
    }
    
    return issues;
  },
  
  getRecommendation: (issue: SeoIssue): FixRecommendation => {
    if (issue.type === 'too_many_external_links') {
      return {
        title: 'Balance internal and external links',
        whyItMatters: 'Too many external links can send users away from your site and dilute your page\'s link equity. Internal links help search engines understand your site structure and keep users engaged.',
        howToFix: [
          'Review your external links and ensure they add value',
          'Add more internal links to relevant pages on your own site',
          'Consider using nofollow for low-value external links',
          'Link to your own related content where appropriate',
          'Aim for a majority of links to be internal (60-70%)',
        ],
        estimatedEffort: 'low',
        priority: 4,
      };
    } else {
      return {
        title: 'Use more readable URLs',
        whyItMatters: 'Friendly, readable URLs help both users and search engines understand what a link points to. They also look better when shared and can improve click-through rates.',
        howToFix: [
          'Use descriptive, human-readable URL slugs',
          'Keep URLs short and meaningful (under 100 characters)',
          'Avoid long query strings with multiple parameters',
          'Use hyphens to separate words (not underscores)',
          'Avoid random IDs or session tokens in URLs',
          'Structure URLs hierarchically (/category/subcategory/page)',
        ],
        estimatedEffort: 'medium',
        priority: 4,
      };
    }
  },
};

// Export all enhancement rules
export const seOptimizerEnhancementRules: AuditRule[] = [
  keywordConsistencyRule,
  headingStructureRule,
  wordCountRule,
  linkStructureRule,
];
