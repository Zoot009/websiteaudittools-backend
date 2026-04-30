import type { PageData } from '../crawler/SiteAuditCrawler';
import type { LinkGraphCrawlResult } from './linkGraphCrawler.js';
import type { SiteContext } from '../analyzer/types.js';

/**
 * Node in the internal link graph
 */
export interface LinkGraphNode {
  id: string;              // URL
  label: string;           // Page title or URL path
  url: string;             // Full URL
  type: 'page';
  title: string | null;    // Page title
  
  // Metrics
  inboundCount: number;    // Number of pages linking to this page
  outboundCount: number;   // Number of links going out from this page
  depth: number;           // Distance from homepage (BFS depth)
  
  // SEO metrics
  statusCode: number;
  loadTime: number;
  wordCount: number;
  hasIssues: boolean;      // Whether this page has SEO issues
  
  // Classification
  isOrphan: boolean;       // No inbound links (except homepage)
  isHub: boolean;          // High outbound count (>10 links)
  isAuthority: boolean;    // High inbound count (>5 links)
}

/**
 * Edge in the internal link graph
 */
export interface LinkGraphEdge {
  id: string;              // Unique edge ID
  source: string;          // Source URL
  target: string;          // Target URL
  anchorText?: string;     // Link anchor text (if available)
  strength: number;        // Edge weight (1 by default, could be based on anchor position)
}

/**
 * Result of a connected pages query
 */
export interface ConnectedPagesResult {
  targetUrl: string;
  connectedPages: string[];
  totalPagesChecked: number;
  pagesContainingTarget: number;
  targetFound: boolean;
}

export interface LinkGraphOrphanData {
  graphOrphans: string[];      // Visited pages with 0 inbound links (excluding start URL)
  sitemapUnvisited: string[];  // Sitemap pages never visited (empty if no sitemap)
  sitemapAvailable: boolean;
  crawlComplete: boolean;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Complete link graph structure for visualization
 */
export interface LinkGraph {
  nodes: LinkGraphNode[];
  edges: LinkGraphEdge[];
  orphanData: LinkGraphOrphanData;
  metadata: {
    totalPages: number;
    totalLinks: number;
    maxDepth: number;
    orphanPages: number;
    hubPages: number;
    authorityPages: number;
    averageLinksPerPage: number;
    avgInboundLinks: number;
    maxInboundLinks: number;
    pagesWithNoInbound: number;
    topLinkedPages: Array<{ url: string; title: string | null; inboundLinks: number }>;
    generatedAt: string;
  };
}

/**
 * Calculate page depth from homepage using BFS
 */
function calculatePageDepths(
  pages: PageData[],
  internalLinkGraph: Map<string, Set<string>>,
  baseUrl: string
): Map<string, number> {
  const depths = new Map<string, number>();
  const visited = new Set<string>();
  const queue: { url: string; depth: number }[] = [];
  
  // Find homepage (baseUrl)
  const homepage = pages.find(p => {
    try {
      const pageUrl = new URL(p.url);
      const base = new URL(baseUrl);
      return pageUrl.origin === base.origin && pageUrl.pathname === '/';
    } catch {
      return false;
    }
  });
  
  // Start BFS from homepage if found, otherwise use first page
  const startUrl = homepage?.url || pages[0]?.url;
  if (!startUrl) return depths;
  
  queue.push({ url: startUrl, depth: 0 });
  visited.add(startUrl);
  depths.set(startUrl, 0);
  
  while (queue.length > 0) {
    const { url, depth } = queue.shift()!;
    const outboundLinks = internalLinkGraph.get(url);
    
    if (outboundLinks) {
      for (const targetUrl of outboundLinks) {
        if (!visited.has(targetUrl)) {
          visited.add(targetUrl);
          depths.set(targetUrl, depth + 1);
          queue.push({ url: targetUrl, depth: depth + 1 });
        }
      }
    }
  }
  
  // For pages not reachable from homepage, assign max depth + 1
  const maxDepth = Math.max(...Array.from(depths.values()), 0);
  for (const page of pages) {
    if (!depths.has(page.url)) {
      depths.set(page.url, maxDepth + 1);
    }
  }
  
  return depths;
}

/**
 * Extract anchor text for links from page data
 */
function extractAnchorTexts(pages: PageData[]): Map<string, Map<string, string>> {
  const anchorMap = new Map<string, Map<string, string>>();
  
  for (const page of pages) {
    const pageAnchors = new Map<string, string>();
    
    for (const link of page.links) {
      if (link.isInternal && link.text) {
        try {
          const linkUrl = new URL(link.href, page.url);
          // Store first occurrence of anchor text for this link
          if (!pageAnchors.has(linkUrl.href)) {
            pageAnchors.set(linkUrl.href, link.text.substring(0, 100)); // Limit length
          }
        } catch {
          // Invalid URL, skip
        }
      }
    }
    
    anchorMap.set(page.url, pageAnchors);
  }
  
  return anchorMap;
}

/**
 * Generate link graph data structure for force-directed visualization
 */
export function generateLinkGraph(
  pages: PageData[],
  siteContext: SiteContext
): LinkGraph {
  const internalLinkGraph = siteContext.internalLinkGraph || new Map();
  const inboundLinkCount = siteContext.inboundLinkCount || new Map();
  
  // Calculate depths
  const depths = calculatePageDepths(pages, internalLinkGraph, siteContext.baseUrl);
  const maxDepth = Math.max(...Array.from(depths.values()), 0);
  
  // Extract anchor texts
  const anchorTexts = extractAnchorTexts(pages);
  
  // Create nodes
  const nodes: LinkGraphNode[] = pages.map(page => {
    const inbound = inboundLinkCount.get(page.url) || 0;
    const outbound = internalLinkGraph.get(page.url)?.size || 0;
    const depth = depths.get(page.url) || 0;
    
    // Get URL path for label if title is missing
    let label = page.title || '';
    if (!label) {
      try {
        const urlObj = new URL(page.url);
        label = urlObj.pathname === '/' ? 'Home' : urlObj.pathname;
      } catch {
        label = page.url;
      }
    }
    
    // Determine page classification
    const isOrphan = inbound === 0 && depth > 0; // Homepage (depth 0) is not orphan
    const isHub = outbound > 10;
    const isAuthority = inbound > 5;
    
    return {
      id: page.url,
      label: label.substring(0, 60), // Limit label length
      url: page.url,
      type: 'page' as const,
      title: page.title,
      inboundCount: inbound,
      outboundCount: outbound,
      depth,
      statusCode: page.statusCode,
      loadTime: page.loadTime,
      wordCount: page.wordCount,
      hasIssues: false, // Will be updated if linked to audit report
      isOrphan,
      isHub,
      isAuthority,
    };
  });
  
  // Create edges
  const edges: LinkGraphEdge[] = [];
  let edgeIdCounter = 0;
  
  internalLinkGraph.forEach((targets: Set<string>, source: string) => {
    const sourceAnchors = anchorTexts.get(source);
    
    targets.forEach((target: string) => {
      const anchorText = sourceAnchors?.get(target);
      
      edges.push({
        id: `edge-${edgeIdCounter++}`,
        source,
        target,
        ...(anchorText && { anchorText }),
        strength: 1,
      });
    });
  });
  
  // Calculate metadata
  const orphanNodes = nodes.filter(n => n.isOrphan);
  const orphanPages = orphanNodes.length;
  const hubPages = nodes.filter(n => n.isHub).length;
  const authorityPages = nodes.filter(n => n.isAuthority).length;
  const averageLinksPerPage = nodes.length > 0
    ? Math.round((edges.length / nodes.length) * 10) / 10
    : 0;

  const inboundCounts = nodes.map(n => n.inboundCount);
  const totalInbound = inboundCounts.reduce((s, c) => s + c, 0);
  const avgInboundLinks = nodes.length > 0
    ? Math.round((totalInbound / nodes.length) * 100) / 100
    : 0;
  const maxInboundLinks = inboundCounts.length > 0 ? Math.max(...inboundCounts) : 0;
  const pagesWithNoInbound = inboundCounts.filter(c => c === 0).length;
  const topLinkedPages = getTopLinkedPages(nodes);

  // Build orphanData from site context
  const sitemapAvailable = siteContext.hasSitemap && !!siteContext.sitemapUrls && siteContext.sitemapUrls.size > 0;
  const pageUrlSet = new Set(pages.map(p => p.url));
  const sitemapUnvisited = sitemapAvailable
    ? Array.from(siteContext.sitemapUrls!).filter(url => !pageUrlSet.has(url))
    : [];
  const crawlComplete = !sitemapAvailable || sitemapUnvisited.length === 0;
  const confidence: 'high' | 'medium' | 'low' =
    sitemapAvailable && crawlComplete ? 'high' :
    sitemapAvailable || crawlComplete ? 'medium' : 'low';

  const orphanData: LinkGraphOrphanData = {
    graphOrphans: orphanNodes.map(n => n.url),
    sitemapUnvisited,
    sitemapAvailable,
    crawlComplete,
    confidence,
  };

  return {
    nodes,
    edges,
    orphanData,
    metadata: {
      totalPages: nodes.length,
      totalLinks: edges.length,
      maxDepth,
      orphanPages,
      hubPages,
      authorityPages,
      averageLinksPerPage,
      avgInboundLinks,
      maxInboundLinks,
      pagesWithNoInbound,
      topLinkedPages,
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Filter link graph by depth (useful for large sites)
 */
export function filterLinkGraphByDepth(
  graph: LinkGraph,
  maxDepth: number
): LinkGraph {
  const filteredNodes = graph.nodes.filter(node => node.depth <= maxDepth);
  const nodeIds = new Set(filteredNodes.map(n => n.id));

  const filteredEdges = graph.edges.filter(
    edge => nodeIds.has(edge.source) && nodeIds.has(edge.target)
  );

  return {
    nodes: filteredNodes,
    edges: filteredEdges,
    orphanData: {
      ...graph.orphanData,
      graphOrphans: graph.orphanData.graphOrphans.filter(url => nodeIds.has(url)),
    },
    metadata: {
      ...graph.metadata,
      totalPages: filteredNodes.length,
      totalLinks: filteredEdges.length,
    },
  };
}

/**
 * Export graph to DOT format (Graphviz)
 */
export function exportToDOT(graph: LinkGraph): string {
  let dot = 'digraph InternalLinks {\n';
  dot += '  node [shape=box, style=rounded];\n';
  dot += '  rankdir=TB;\n\n';
  
  // Add nodes with colors based on classification
  for (const node of graph.nodes) {
    let color = 'lightblue';
    if (node.isOrphan) color = 'red';
    else if (node.isAuthority) color = 'green';
    else if (node.isHub) color = 'orange';
    
    const label = node.label.replace(/"/g, '\\"');
    dot += `  "${node.id}" [label="${label}", fillcolor="${color}", style="filled"];\n`;
  }
  
  dot += '\n';
  
  // Add edges
  for (const edge of graph.edges) {
    dot += `  "${edge.source}" -> "${edge.target}";\n`;
  }
  
  dot += '}\n';
  return dot;
}

/**
 * Returns the top N pages sorted by inbound link count (descending)
 */
export function getTopLinkedPages(
  nodes: LinkGraphNode[],
  limit = 10
): Array<{ url: string; title: string | null; inboundLinks: number }> {
  return [...nodes]
    .sort((a, b) => b.inboundCount - a.inboundCount)
    .slice(0, limit)
    .map(n => ({ url: n.url, title: n.title, inboundLinks: n.inboundCount }));
}

/**
 * Find all pages in a completed crawl result that link to targetUrl
 */
export function findConnectedPages(
  links: LinkGraphCrawlResult['links'],
  targetUrl: string
): ConnectedPagesResult {
  const connectedPages = links
    .filter(l => l.target === targetUrl)
    .map(l => l.source)
    .filter((v, i, a) => a.indexOf(v) === i) // deduplicate
    .sort((a, b) => a.localeCompare(b));

  const totalPagesChecked = new Set(links.map(l => l.source)).size;

  return {
    targetUrl,
    connectedPages,
    totalPagesChecked,
    pagesContainingTarget: connectedPages.length,
    targetFound: connectedPages.length > 0,
  };
}

/**
 * Export graph to CSV format for spreadsheet analysis
 */
export function exportToCSV(graph: LinkGraph): { nodes: string; edges: string } {
  // Nodes CSV
  const nodeHeaders = ['URL', 'Title', 'Inbound Links', 'Outbound Links', 'Depth', 'Status Code', 'Load Time', 'Word Count', 'Is Orphan', 'Is Hub', 'Is Authority'];
  const nodeRows = graph.nodes.map(node => [
    node.url,
    node.title || '',
    node.inboundCount,
    node.outboundCount,
    node.depth,
    node.statusCode,
    node.loadTime,
    node.wordCount,
    node.isOrphan,
    node.isHub,
    node.isAuthority,
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  
  const nodesCsv = [nodeHeaders.join(','), ...nodeRows].join('\n');
  
  // Edges CSV
  const edgeHeaders = ['Source URL', 'Target URL', 'Anchor Text'];
  const edgeRows = graph.edges.map(edge => [
    edge.source,
    edge.target,
    edge.anchorText || '',
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  
  const edgesCsv = [edgeHeaders.join(','), ...edgeRows].join('\n');
  
  return {
    nodes: nodesCsv,
    edges: edgesCsv,
  };
}
