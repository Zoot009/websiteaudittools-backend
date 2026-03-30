import { chromium, type Browser } from "playwright";
import { getRandomUserAgent } from './antibot';
import { 
  getRandomViewport, 
  getRandomTimezone, 
  getRandomLocale,
  getRealisticHeaders,
  injectAntiDetectionScripts 
} from './humanBehavior';

interface BrowserPoolOptions {
  maxBrowsers?: number;
  headless?: boolean;
  stealthMode?: boolean; // Enhanced anti-detection
}

export class BrowserPool {
  private browsers: Browser[] = [];
  private availableBrowsers: Browser[] = [];
  private waitingQueue: Array<(browser: Browser) => void> = []; // ✅ Add this
  private maxBrowsers: number;
  private headless: boolean;
  private stealthMode: boolean;
  private isInitialized = false;

  constructor(options: BrowserPoolOptions = {}) {
    this.maxBrowsers = options.maxBrowsers || 3;
    this.headless = options.headless ?? true;
    this.stealthMode = options.stealthMode ?? false;
  }

  /**
   * Initialize the browser pool by launching browsers
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log(`🌐 Launching ${this.maxBrowsers} browsers${this.stealthMode ? ' (stealth mode)' : ''}...`);

    const launchArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--disable-blink-features=AutomationControlled', // ⭐ ALWAYS hide automation (critical!)
    ];

    // Additional stealth arguments (already includes --disable-blink-features above)
    if (this.stealthMode) {
      launchArgs.push(
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-web-security',
        '--flag-switches-begin',
        '--disable-site-isolation-trials',
        '--flag-switches-end'
      );
    }

    for (let i = 0; i < this.maxBrowsers; i++) {
      const browser = await chromium.launch({
        headless: this.headless,
        args: launchArgs,
      });

      this.browsers.push(browser);
      this.availableBrowsers.push(browser);
    }

    this.isInitialized = true;
    console.log(`✅ Browser pool ready with ${this.maxBrowsers} browsers`);
  }

  /**
   * Create a new stealth browser context with anti-detection measures
   */
  async createStealthContext(browser: Browser, referer?: string) {
    const viewport = getRandomViewport();
    const locale = getRandomLocale();
    const timezone = getRandomTimezone();
    
    const context = await browser.newContext({
      userAgent: getRandomUserAgent(),
      viewport,
      locale,
      timezoneId: timezone,
      permissions: [],
      extraHTTPHeaders: getRealisticHeaders(referer),
      // Randomize color scheme
      colorScheme: Math.random() > 0.5 ? 'light' : 'dark',
      // Realistic geolocation (optional, disable for privacy)
      // geolocation: { latitude: 40.7128, longitude: -74.0060 }, // NYC
    });

    // Inject anti-detection scripts into context
    await injectAntiDetectionScripts(context);

    return context;
  }

  /**
   * Acquire a browser from the pool
   * Waits if all browsers are busy
   */
  async acquire(): Promise<Browser> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // If available, return immediately
    if (this.availableBrowsers.length > 0) {
      return this.availableBrowsers.pop()!;
    }

    // Wait in queue (no polling!)
    return new Promise<Browser>((resolve) => {
      this.waitingQueue.push(resolve);
    });
  }

  /**
   * Release a browser back to the pool
   */
  release(browser: Browser): void {
    if (!this.browsers.includes(browser)) return;

    // Give to waiting job or return to pool
    if (this.waitingQueue.length > 0) {
      const resolve = this.waitingQueue.shift()!;
      resolve(browser);
    } else {
      this.availableBrowsers.push(browser);
    }
  }

  /**
   * Close all browsers in the pool
   */
  async closeAll(): Promise<void> {
    console.log('🔒 Closing all browsers in pool...');
    
    for (const browser of this.browsers) {
      await browser.close();
    }

    this.browsers = [];
    this.availableBrowsers = [];
    this.isInitialized = false;
    
    console.log('✅ All browsers closed');
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      total: this.browsers.length,
      available: this.availableBrowsers.length,
      busy: this.browsers.length - this.availableBrowsers.length,
    };
  }
}

// Singleton instance
export const browserPool = new BrowserPool({
  maxBrowsers: parseInt(process.env.BROWSER_COUNT || '3'),
  headless: process.env.HEADLESS !== 'false', // Default to true
  stealthMode: process.env.STEALTH_MODE === 'true', // Optional stealth mode
});