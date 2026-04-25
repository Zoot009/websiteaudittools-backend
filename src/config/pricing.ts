// ============================================================
// Pricing Config — Phase 0 placeholders. Update before Phase 5.
// All values are in credits (integers).
// ============================================================

export const AUDIT_SINGLE_COST = 1;

export const LINK_GRAPH_BASE_COST = 5;
export const LINK_GRAPH_PER_100_PAGES = 1;

// Chat stays on the Redis per-day quota; no credit deduction for now.
export const CHAT_MESSAGE_COST = 0;

export const SCREENSHOT_COST = 1;

// ============================================================
// Cost calculators
// ============================================================

/**
 * Returns the credit cost for a site audit.
 *
 * @param mode - Currently only 'single' is supported. Multi-page mode will
 *               be factored in once it ships.
 * @param pageLimit - Number of pages (only relevant when mode expands beyond
 *                    'single'; ignored for now).
 */
export function calculateAuditCost(mode: 'single', pageLimit?: number): number {
  // Multi-page mode not yet implemented — cost is always 1 credit per audit.
  void pageLimit;
  void mode;
  return AUDIT_SINGLE_COST;
}

/**
 * Returns the credit cost for a link-graph crawl.
 *
 * Formula: base + ceil(maxPages / 100) * per-100-pages surcharge.
 * `maxDepth` is accepted for future pricing tiers but not currently factored in.
 *
 * @param maxPages - Maximum pages the crawl may visit.
 * @param maxDepth - Maximum crawl depth (reserved for future use).
 */
export function calculateLinkGraphCost(maxPages: number, maxDepth?: number): number {
  void maxDepth;
  const pageSurcharge = Math.ceil(maxPages / 100) * LINK_GRAPH_PER_100_PAGES;
  return LINK_GRAPH_BASE_COST + pageSurcharge;
}
