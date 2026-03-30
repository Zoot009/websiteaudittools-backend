import type { PageData } from '../crawler/SiteAuditCrawler';
import type { SiteContext } from './types';
import axios from 'axios';

/**
 * Build site-wide context for cross-page analysis
 */
export async function buildSiteContext(pages: PageData[], baseUrl: string): Promise<SiteContext> {
  const titleMap = new Map<string, string[]>();
  const descriptionMap = new Map<string, string[]>();
  const canonicalMap = new Map<string, string[]>();
  const internalLinkGraph = new Map<string, Set<string>>();
  const inboundLinkCount = new Map<string, number>();
  
  // Check for robots.txt
  let hasRobotsTxt = false;
  try {
    const robotsUrl = new URL('/robots.txt', baseUrl).href;
    const response = await axios.get(robotsUrl, { 
      timeout: 5000,
      validateStatus: (status) => status === 200,
    });
    hasRobotsTxt = response.status === 200 && response.data.length > 0;
  } catch (error) {
    // robots.txt doesn't exist or is inaccessible
    hasRobotsTxt = false;
  }
  
  // Build maps for duplicate detection
  for (const page of pages) {
    // Title map
    if (page.title) {
      const urls = titleMap.get(page.title) || [];
      urls.push(page.url);
      titleMap.set(page.title, urls);
    }
    
    // Description map
    if (page.description) {
      const urls = descriptionMap.get(page.description) || [];
      urls.push(page.url);
      descriptionMap.set(page.description, urls);
    }
    
    // Canonical map
    if (page.canonical) {
      const urls = canonicalMap.get(page.canonical) || [];
      urls.push(page.url);
      canonicalMap.set(page.canonical, urls);
    }
    
    // Build internal link graph
    const internalLinks = page.links.filter(link => link.isInternal);
    const outboundLinks = new Set<string>();
    
    for (const link of internalLinks) {
      try {
        const linkUrl = new URL(link.href, page.url);
        const normalizedLink = linkUrl.href;
        
        outboundLinks.add(normalizedLink);
        
        // Count inbound links
        const currentCount = inboundLinkCount.get(normalizedLink) || 0;
        inboundLinkCount.set(normalizedLink, currentCount + 1);
      } catch {
        // Invalid URL, skip
      }
    }
    
    internalLinkGraph.set(page.url, outboundLinks);
  }
  
  // Initialize inbound count for pages with zero inbound links
  for (const page of pages) {
    if (!inboundLinkCount.has(page.url)) {
      inboundLinkCount.set(page.url, 0);
    }
  }
  
  return {
    baseUrl,
    allPages: pages,
    titleMap,
    descriptionMap,
    canonicalMap,
    internalLinkGraph,
    inboundLinkCount,
    hasRobotsTxt,
  };
}
