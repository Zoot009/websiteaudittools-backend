import { chromium, type Browser, type Page } from 'playwright';
import { getRandomUserAgent } from '../crawler/antibot.js';
import { 
  getRandomViewport, 
  getRandomTimezone, 
  getRandomLocale,
  getRealisticHeaders,
  injectAntiDetectionScripts 
} from '../crawler/humanBehavior.js';

interface ScreenshotResult {
  desktop: string; // base64
  mobile: string;  // base64
}

interface ScreenshotOptions {
  url: string;
  timeout?: number; // milliseconds
}

/**
 * Captures desktop and mobile screenshots of a website
 * Returns base64-encoded images with anti-bot protection
 */
export async function captureScreenshots(options: ScreenshotOptions): Promise<ScreenshotResult> {
  const { url, timeout = 20000 } = options;
  
  let browser: Browser | null = null;
  
  try {
    // Launch browser with enhanced stealth settings
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-automation',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    });

    // Capture both screenshots in parallel
    const [desktopScreenshot, mobileScreenshot] = await Promise.all([
      captureDesktopScreenshot(browser, url, timeout),
      captureMobileScreenshot(browser, url, timeout),
    ]);

    return {
      desktop: desktopScreenshot,
      mobile: mobileScreenshot,
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Capture desktop screenshot (1920x1080) with anti-bot protection
 */
async function captureDesktopScreenshot(browser: Browser, url: string, timeout: number): Promise<string> {
  const userAgent = getRandomUserAgent();
  const viewport = { width: 1920, height: 1080 };
  const timezone = getRandomTimezone();
  const locale = getRandomLocale();
  
  const context = await browser.newContext({
    viewport,
    userAgent,
    timezoneId: timezone,
    locale,
    extraHTTPHeaders: getRealisticHeaders(),
    permissions: ['geolocation'],
  });

  const page = await context.newPage();
  
  try {
    // Inject anti-detection scripts BEFORE navigation
    await injectAntiDetectionScripts(page);
    
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout 
    });

    // Wait for page to settle
    await page.waitForTimeout(2000);

    // Capture viewport-only screenshot (not full page to avoid bot detection)
    const screenshot = await page.screenshot({
      fullPage: false, // Only capture viewport to avoid bot detection scrolling
      type: 'jpeg',
      quality: 85,
    });

    return screenshot.toString('base64');
  } finally {
    await context.close();
  }
}

/**
 * Capture mobile screenshot (375x667 - iPhone viewport) with anti-bot protection
 */
async function captureMobileScreenshot(browser: Browser, url: string, timeout: number): Promise<string> {
  const viewport = { width: 375, height: 667 }; // iPhone 6/7/8 viewport
  const timezone = getRandomTimezone();
  const locale = getRandomLocale();
  
  const context = await browser.newContext({
    viewport,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true,
    timezoneId: timezone,
    locale,
    extraHTTPHeaders: getRealisticHeaders(),
    permissions: ['geolocation'],
  });

  const page = await context.newPage();
  
  try {
    // Inject anti-detection scripts BEFORE navigation
    await injectAntiDetectionScripts(page);
    
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout 
    });

    // Wait for page to settle
    await page.waitForTimeout(2000);

    // Capture viewport-only screenshot (iPhone dimensions, no overflow)
    const screenshot = await page.screenshot({
      fullPage: false, // Only capture viewport to maintain iPhone dimensions
      type: 'jpeg',
      quality: 85,
      clip: {
        x: 0,
        y: 0,
        width: 375,
        height: 667,
      },
    });

    return screenshot.toString('base64');
  } finally {
    await context.close();
  }
}
