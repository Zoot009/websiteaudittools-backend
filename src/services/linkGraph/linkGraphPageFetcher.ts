import type { BrowserContext, Page } from 'playwright';
import { browserPool } from '../crawler/BrowserPool.js';
import { fetchViaScrapeDo } from '../crawler/scrapeDoFallback.js';
import {
  getRandomViewport,
  getRealisticHeaders,
  injectAntiDetectionScripts,
} from '../crawler/humanBehavior.js';
import { detectCloudflareChallenge, waitForCloudflareChallenge } from '../crawler/cloudflareBypass.js';
import { getRandomUserAgent, isPageUrl } from '../crawler/antibot.js';

export type CrawlSource = 'native' | 'fallback' | 'none';

export interface FetchInternalLinksResult {
  source: CrawlSource;
  links: string[];
  skipped: boolean;
  skipReason?: string;
  nativeError?: string;
  error?: string;
}

interface FetchInternalLinksWithFallbackOptions {
  currentUrl: string;
  timeout: number;
  referer?: string;
  baseHost: string;
  normalizeLink: (rawUrl: string, baseUrl: string) => string;
  isInternalUrl: (url: string, host: string) => boolean;
}

function isHtmlResponse(contentType: string | null): boolean {
  if (!contentType) return false;

  const lowerType = contentType.toLowerCase();
  return lowerType.includes('text/html') || lowerType.includes('application/xhtml+xml');
}

function normalizeAndFilterLinks(
  rawLinks: string[],
  currentUrl: string,
  baseHost: string,
  normalizeLink: (rawUrl: string, baseUrl: string) => string,
  isInternalUrl: (url: string, host: string) => boolean
): string[] {
  const seen = new Set<string>();
  const filtered: string[] = [];

  for (const rawLink of rawLinks) {
    const normalized = normalizeLink(rawLink, currentUrl).trim();

    if (!normalized) {
      continue;
    }

    if (!isPageUrl(normalized)) {
      continue;
    }

    if (!isInternalUrl(normalized, baseHost)) {
      continue;
    }

    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    filtered.push(normalized);
  }

  return filtered;
}

async function extractRawLinksFromPage(page: Page): Promise<string[]> {
  const links = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href]'));
    return anchors
      .map(a => (a as HTMLAnchorElement).href)
      .filter(href => href && href.trim() !== '');
  });

  return links;
}

export async function fetchInternalLinksWithFallback(
  options: FetchInternalLinksWithFallbackOptions
): Promise<FetchInternalLinksResult> {
  const {
    currentUrl,
    timeout,
    referer,
    baseHost,
    normalizeLink,
    isInternalUrl,
  } = options;

  const browser = await browserPool.acquire();
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    if (process.env.STEALTH_MODE === 'true') {
      context = await browserPool.createStealthContext(browser, referer);
    } else {
      context = await browser.newContext({
        userAgent: getRandomUserAgent(),
        viewport: getRandomViewport(),
        extraHTTPHeaders: getRealisticHeaders(referer),
      });
      await injectAntiDetectionScripts(context);
    }

    page = await context.newPage();
    page.setDefaultTimeout(timeout);

    const response = await page.goto(currentUrl, {
      waitUntil: 'domcontentloaded',
      timeout,
    });

    if (!response) {
      throw new Error('No navigation response received');
    }

    if (response.status() >= 400) {
      throw new Error(`HTTP ${response.status()}`);
    }

    const contentType = response.headers()['content-type'] || null;
    if (!isHtmlResponse(contentType)) {
      return {
        source: 'native',
        links: [],
        skipped: true,
        skipReason: `non-html:${contentType || 'unknown'}`,
      };
    }

    const cloudflareDetection = await detectCloudflareChallenge(page);
    if (cloudflareDetection.isCloudflare) {
      if (cloudflareDetection.challengeType === 'js-challenge') {
        const resolved = await waitForCloudflareChallenge(page, 30000);
        if (!resolved) {
          throw new Error('Cloudflare JavaScript challenge did not resolve');
        }
      }

      if (
        cloudflareDetection.challengeType === 'captcha' ||
        cloudflareDetection.challengeType === 'ban'
      ) {
        throw new Error(`Cloudflare ${cloudflareDetection.challengeType} detected`);
      }
    }

    await page.waitForTimeout(500);

    const rawLinks = await extractRawLinksFromPage(page);
    const internalLinks = normalizeAndFilterLinks(
      rawLinks,
      currentUrl,
      baseHost,
      normalizeLink,
      isInternalUrl
    );

    return {
      source: 'native',
      links: internalLinks,
      skipped: false,
    };
  } catch (nativeError: unknown) {
    const nativeErrorMessage = nativeError instanceof Error ? nativeError.message : 'Unknown error';

    try {
      const fallbackResult = await fetchViaScrapeDo(currentUrl);
      const rawFallbackLinks = fallbackResult.links.map(link => link.href);
      const internalLinks = normalizeAndFilterLinks(
        rawFallbackLinks,
        currentUrl,
        baseHost,
        normalizeLink,
        isInternalUrl
      );

      return {
        source: 'fallback',
        links: internalLinks,
        skipped: false,
        nativeError: nativeErrorMessage,
      };
    } catch (fallbackError: unknown) {
      const fallbackErrorMessage = fallbackError instanceof Error ? fallbackError.message : 'Unknown fallback error';

      return {
        source: 'none',
        links: [],
        skipped: false,
        nativeError: nativeErrorMessage,
        error: `${nativeErrorMessage} | ${fallbackErrorMessage}`,
      };
    }
  } finally {
    if (page && !page.isClosed()) {
      await page.close().catch(() => {});
    }
    if (context) {
      await context.close().catch(() => {});
    }
    browserPool.release(browser);
  }
}
