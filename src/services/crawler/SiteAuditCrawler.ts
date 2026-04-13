import type { Browser, Page, BrowserContext } from 'playwright';
import { browserPool } from './BrowserPool';
import { getSeedUrls } from './sitemapParser';
import { fetchViaScrapeDo } from './scrapeDoFallback';
import { cleanUrl, isPageUrl } from './antibot';
import { extractLocalSeoData } from './localSeoDetection';
import { 
  simulateHumanInteraction, 
  RateLimiter,
  getRandomViewport,
  getRealisticHeaders,
  injectAntiDetectionScripts
} from './humanBehavior';
import {
  detectCloudflareChallenge,
  waitForCloudflareChallenge,
} from './cloudflareBypass';
// @ts-ignore - JS file for browser execution
import { extractPageDataFunction, measureWebVitalsFunction } from './extractPageData.js';

/** Thrown when a page actively blocks our crawler (403, Cloudflare ban/CAPTCHA). */
export class BotBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BotBlockedError';
  }
}

export interface CrawlerOptions {
  mode: 'single' | 'multi';
  pageLimit?: number | undefined;
  timeout?: number | undefined; // milliseconds
}

export interface PageData {
  url: string;
  title: string | null;
  description: string | null;
  statusCode: number;
  loadTime: number;
  
  // Content
  html: string;
  headings: { level: number; text: string }[];
  images: { src: string; alt: string | null }[];
  links: { href: string; text: string; isInternal: boolean }[];
  wordCount: number;
  
  // Performance (Core Web Vitals)
  lcp: number | null; // Largest Contentful Paint
  cls: number | null; // Cumulative Layout Shift
  fid: number | null; // First Input Delay (hard to measure, use TBT instead)
  
  // Meta
  canonical: string | null;
  robots: string | null;
  ogImage: string | null;
  hasSchemaOrg: boolean;
  
  // Internationalization
  langAttr?: string | null;
  hreflangLinks?: { hreflang: string; href: string }[];
  charset?: string | null;
  
  // Usability
  flashCount?: number;
  iframeCount?: number;
  exposedEmails?: string[];
  
  // Performance/Code quality
  isAMP?: boolean;
  deprecatedTagsCount?: number;
  inlineStylesCount?: number;
  
  // Social
  socialLinks?: {
    facebook: boolean;
    twitter: boolean;
    instagram: boolean;
    linkedin: boolean;
    youtube: boolean;
  };
  hasFacebookPixel?: boolean;
  ogTags?: { 
    title?: string; 
    description?: string; 
    image?: string; 
    type?: string; 
    url?: string; 
    siteName?: string;
  };
  twitterTags?: { 
    card?: string; 
    site?: string; 
    title?: string; 
    description?: string; 
    image?: string;
  };
  
  // Local SEO
  localSeo?: {
    phone: { found: boolean; number: string | null; source: string | null };
    address: { found: boolean; text: string | null; source: string | null };
  };
  
  // Usability - Phase 2
  viewport?: { hasViewport: boolean; content: string | null };
  favicon?: { hasFavicon: boolean; url: string | null };
  smallFontCount?: number;
  smallTapTargetCount?: number;
  
  // Performance - Phase 2
  pageSizes?: { html: number; css: number; js: number; images: number; total: number };
  resourceCounts?: { scripts: number; stylesheets: number; images: number; fonts: number };
  jsErrors?: Array<{ message: string; source: string; line: number }>;
  imageOptimization?: { unoptimized: number; modernFormats: number };
  minification?: { unminifiedScripts: number; unminifiedStyles: number };
  renderMetrics?: { initialSize: number; renderedSize: number; percentage: number };
  
  // HTTP Level - Phase 2
  compression?: 'gzip' | 'br' | 'deflate' | 'none';
  protocol?: string;
  isHTTP2?: boolean;
}

export interface CrawlResult {
  baseUrl: string;
  mode: 'single' | 'multi';
  pagesAnalyzed: number;
  pages: PageData[];
  errors: string[];
}

export class SiteAuditCrawler {
  private visitedUrls = new Set<string>();
  private toVisit: string[] = [];
  private errors: string[] = [];
  private baseUrl: string = '';
  private rateLimiter: RateLimiter;
  private lastVisitedUrl: string = '';

  constructor() {
    // Rate limit: 2-5 seconds between requests (looks more human)
    this.rateLimiter = new RateLimiter(2000, 5000);
  }

  /**
   * Main crawl method
   */
  async crawl(url: string, options: CrawlerOptions): Promise<CrawlResult> {
    this.reset();
    this.baseUrl = this.normalizeUrl(url);

    const maxPages = options.mode === 'single' ? 1 : (options.pageLimit || 10);

    console.log(`🕷 Starting ${options.mode} crawl of ${this.baseUrl} (max ${maxPages} pages)`);

    // For multi-page mode, seed with sitemap URLs
    if (options.mode === 'multi') {
      try {
        const sitemapUrls = await getSeedUrls(this.baseUrl);
        // Add sitemap URLs to queue (deduplicated)
        for (const sitemapUrl of sitemapUrls) {
          const cleaned = cleanUrl(sitemapUrl);
          if (!this.visitedUrls.has(cleaned) && isPageUrl(cleaned)) {
            this.toVisit.push(cleaned);
          }
        }
        console.log(`📋 Seeded crawler with ${this.toVisit.length} URLs from sitemaps`);
      } catch (error) {
        console.log(`⚠️ Could not load sitemaps, starting with base URL only`);
      }
    }

    // Ensure base URL is in the queue
    if (this.toVisit.length === 0) {
      this.toVisit.push(this.baseUrl);
    }

    const pages: PageData[] = [];

    while (this.toVisit.length > 0 && pages.length < maxPages) {
      const currentUrl = this.toVisit.shift()!;
      
      if (this.visitedUrls.has(currentUrl)) continue;
      
      // Rate limit between requests (human-like behavior)
      if (pages.length > 0) {
        await this.rateLimiter.waitForNextRequest();
      }
      
      try {
        const pageData = await this.crawlPage(currentUrl, options);
        pages.push(pageData);
        this.visitedUrls.add(currentUrl);
        this.lastVisitedUrl = currentUrl;

        // In multi-page mode, discover more links
        if (options.mode === 'multi') {
          this.discoverLinks(pageData);
        }

        console.log(`✅ Crawled: ${currentUrl} (${pages.length}/${maxPages})`);
      } catch (error) {
        if (error instanceof BotBlockedError) {
          console.log(`  🔄 Bot blocked (${error.message}), trying scrape.do fallback...`);
          try {
            const pageData = await fetchViaScrapeDo(currentUrl);
            pages.push(pageData);
            this.visitedUrls.add(currentUrl);
            this.lastVisitedUrl = currentUrl;
            if (options.mode === 'multi') {
              this.discoverLinks(pageData);
            }
            console.log(`✅ Scraped via scrape.do: ${currentUrl} (${pages.length}/${maxPages})`);
          } catch (fallbackError) {
            const errorMsg = `Failed to scrape ${currentUrl} via scrape.do: ${fallbackError}`;
            this.errors.push(errorMsg);
            console.error(`❌ ${errorMsg}`);
          }
        } else {
          const errorMsg = `Failed to crawl ${currentUrl}: ${error}`;
          this.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }
    }

    console.log(`🎉 Crawl complete: ${pages.length} pages analyzed`);

    return {
      baseUrl: this.baseUrl,
      mode: options.mode,
      pagesAnalyzed: pages.length,
      pages,
      errors: this.errors,
    };
  }

  /**
   * Crawl a single page and extract all data
   */
  private async crawlPage(url: string, options: CrawlerOptions): Promise<PageData> {
    console.log(`\n🔍 Processing: ${url}`);
    
    const browser = await browserPool.acquire();
    let page: Page | null = null;
    let context: BrowserContext | null = null;

    try {
      // Use stealth context with referer support (if we have a previous URL)
      const referer = this.lastVisitedUrl || undefined;
      
      if (process.env.STEALTH_MODE === 'true') {
        context = await browserPool.createStealthContext(browser, referer);
      } else {
        // Even in non-stealth mode, use random viewport and realistic headers
        const viewport = getRandomViewport();
        context = await browser.newContext({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          viewport,
          extraHTTPHeaders: getRealisticHeaders(referer),
        });
        
        // Still inject basic anti-detection for non-stealth mode
        await injectAntiDetectionScripts(context);
      }

      page = await context.newPage();

      // Set timeout
      page.setDefaultTimeout(options.timeout || 30000);

      // Measure load time
      const startTime = Date.now();
      const response = await page.goto(url, { 
        waitUntil: 'domcontentloaded' 
      });
      const loadTime = Date.now() - startTime;
      const statusCode = response?.status() || 0;
      console.log(`  ⏱  Load time: ${loadTime}ms | Status: ${statusCode}`);

      // Extract HTTP-level data (Phase 2)
      const headers = response?.headers() || {};
      const compression = this.detectCompression(headers);
      const protocol = response?.request().allHeaders().then(h => h[':protocol']) || 'http/1.1';
      const isHTTP2 = (await protocol)?.includes('h2') || false;

      // Treat 403 as bot-blocking: fall back to scrape.do
      if (statusCode === 403) {
        throw new BotBlockedError(`HTTP 403 Forbidden for ${url}`);
      }

      // ** CLOUDFLARE DETECTION & BYPASS **
      const cfDetection = await detectCloudflareChallenge(page);
      if (cfDetection.isCloudflare) {
        console.log(`  🛡️  Cloudflare detected: ${cfDetection.challengeType}`);
        cfDetection.details.forEach(detail => console.log(`     - ${detail}`));
        
        if (cfDetection.challengeType === 'js-challenge') {
          console.log(`  ⏳ Waiting for JavaScript challenge to complete...`);
          const resolved = await waitForCloudflareChallenge(page, 30000);
          
          if (resolved) {
            console.log(`  ✅ Cloudflare challenge passed!`);
          } else {
            console.log(`  ⚠️  Cloudflare challenge did not resolve (page may be incomplete)`);
          }
        } else if (cfDetection.challengeType === 'captcha') {
          throw new BotBlockedError('Cloudflare CAPTCHA detected - falling back to scrape.do');
        } else if (cfDetection.challengeType === 'ban') {
          throw new BotBlockedError('Access blocked by Cloudflare - falling back to scrape.do');
        }
      }

      // Wait for JavaScript to execute
      await page.waitForTimeout(1000);

      // Extract all data
      const pageData = await page.evaluate(extractPageDataFunction) as Omit<PageData, 'url' | 'statusCode' | 'loadTime' | 'lcp' | 'cls' | 'fid' | 'localSeo'>;

      // ** SIMULATE HUMAN BEHAVIOR **
      // This makes crawling look much more natural
      if (process.env.HUMAN_BEHAVIOR === 'true' || process.env.STEALTH_MODE === 'true') {
        console.log(`  🤖 Simulating human interaction...`);
        await simulateHumanInteraction(page, {
          wordCount: pageData.wordCount,
          enableMouseMovement: true,
          enableScrolling: true,
        });
      }

      // Get Core Web Vitals
      const webVitals = await this.measureWebVitals(page);

      // Extract local SEO data (phone & address)
      const localSeo = extractLocalSeoData(pageData.html);

      // Log extracted info
      console.log(`  📄 Title: ${pageData.title || 'N/A'}`);
      console.log(`  📝 Description: ${pageData.description?.substring(0, 80) || 'N/A'}${pageData.description && pageData.description.length > 80 ? '...' : ''}`);
      console.log(`  🔤 Word count: ${pageData.wordCount}`);
      console.log(`  📊 Headings: ${pageData.headings.length} (${pageData.headings.filter(h => h.level === 1).length} H1s)`);
      console.log(`  🖼  Images: ${pageData.images.length}`);
      console.log(`  🔗 Links: ${pageData.links.length} (${pageData.links.filter(l => l.isInternal).length} internal)`);
      console.log(`  ⚡ LCP: ${webVitals.lcp}ms | Schema.org: ${pageData.hasSchemaOrg ? '✓' : '✗'}`);
      console.log(`  🗜️  Compression: ${compression} | HTTP/2: ${isHTTP2 ? '✓' : '✗'}`);

      return {
        url,
        statusCode,
        loadTime,
        ...pageData,
        ...webVitals,
        localSeo,
        compression,
        protocol: await protocol,
        isHTTP2,
      };
    } finally {
      // Cleanup in reverse order: page -> context -> browser
      if (page && !page.isClosed()) {
        await page.close();
      }
      if (context) {
        await context.close();
      }
      browserPool.release(browser);
    }
  }

  /**
   * Measure Core Web Vitals
   */
  private async measureWebVitals(page: Page): Promise<{ lcp: number | null; cls: number | null; fid: number | null }> {
    try {
      const metrics = await page.evaluate(measureWebVitalsFunction) as { lcp: number | null; cls: number | null; fid: number | null };
      return metrics;
    } catch {
      return { lcp: null, cls: null, fid: null };
    }
  }

  /**
   * Detect compression type from response headers (Phase 2)
   */
  private detectCompression(headers: Record<string, string>): 'gzip' | 'br' | 'deflate' | 'none' {
    const encoding = headers['content-encoding']?.toLowerCase();
    if (encoding?.includes('br')) return 'br';
    if (encoding?.includes('gzip')) return 'gzip';
    if (encoding?.includes('deflate')) return 'deflate';
    return 'none';
  }

  /**
   * Discover internal links from a page
   */
  private discoverLinks(pageData: PageData): void {
    for (const link of pageData.links) {
      if (link.isInternal && !this.visitedUrls.has(link.href)) {
        // Clean URL
        const cleaned = cleanUrl(link.href);
        
        // Filter using antibot utilities
        if (isPageUrl(cleaned) && this.shouldCrawlUrl(cleaned)) {
          // Deduplicate
          if (!this.toVisit.includes(cleaned) && !this.visitedUrls.has(cleaned)) {
            this.toVisit.push(cleaned);
          }
        }
      }
    }
  }

  /**
   * Should this URL be crawled?
   */
  private shouldCrawlUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      
      // Skip common non-content patterns
      const skipPatterns = [
        '/wp-admin',
        '/admin',
        '/login',
        '/cart',
        '/checkout',
        '/account',
        '/wp-json',
        '/feed',
        '/category',
        '/tag',
        '/author',
      ];

      const pathname = urlObj.pathname.toLowerCase();
      for (const pattern of skipPatterns) {
        if (pathname.includes(pattern)) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Normalize URL (remove fragments, trailing slashes, etc.)
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      urlObj.hash = ''; // Remove #fragment
      let pathname = urlObj.pathname;
      
      // Remove trailing slash (except for root)
      if (pathname.length > 1 && pathname.endsWith('/')) {
        pathname = pathname.slice(0, -1);
      }
      
      urlObj.pathname = pathname;
      return urlObj.href;
    } catch {
      return url;
    }
  }

  /**
   * Reset crawler state
   */
  private reset(): void {
    this.visitedUrls.clear();
    this.toVisit = [];
    this.errors = [];
    this.baseUrl = '';
    this.lastVisitedUrl = '';
    this.rateLimiter.reset();
  }
}