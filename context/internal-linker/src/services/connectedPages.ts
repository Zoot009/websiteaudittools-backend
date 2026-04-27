/**
 * Utilities to find inbound connected pages for a target URL.
 */

import type { LinkMap } from '../types.js';

export interface ConnectedPagesResult {
  targetUrl: string;
  connectedPages: string[];
  totalPagesChecked: number;
  pagesContainingTarget: number;
  targetFound: boolean;
}

/**
 * Return pages that contain the target URL as an internal outbound link.
 */
export function findPagesLinkingToTarget(
  linkMap: LinkMap,
  targetUrl: string
): ConnectedPagesResult {
  const connectedPages = Object.entries(linkMap)
    .filter(([_, links]) => links.includes(targetUrl))
    .map(([sourceUrl]) => sourceUrl)
    .sort((a, b) => a.localeCompare(b));

  return {
    targetUrl,
    connectedPages,
    totalPagesChecked: Object.keys(linkMap).length,
    pagesContainingTarget: connectedPages.length,
    targetFound: connectedPages.length > 0,
  };
}