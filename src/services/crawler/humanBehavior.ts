import type { Page } from 'playwright';

/**
 * Human Behavior Simulation
 * Mimics realistic human interactions to avoid bot detection
 */

/**
 * Generate random delay that mimics human reading/interaction time
 */
export function getRandomDelay(min: number = 1000, max: number = 3000): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate realistic mouse movement path (Bezier curve simulation)
 */
export async function simulateMouseMovement(page: Page): Promise<void> {
  try {
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const moves = Math.floor(Math.random() * 3) + 2; // 2-4 movements
        let completed = 0;

        const moveToRandomPosition = () => {
          const x = Math.floor(Math.random() * window.innerWidth);
          const y = Math.floor(Math.random() * window.innerHeight);
          
          // Create mouse move event
          const event = new MouseEvent('mousemove', {
            clientX: x,
            clientY: y,
            bubbles: true,
          });
          document.dispatchEvent(event);
          
          completed++;
          if (completed < moves) {
            setTimeout(moveToRandomPosition, Math.random() * 300 + 100);
          } else {
            resolve();
          }
        };

        moveToRandomPosition();
      });
    });
  } catch (error) {
    // Fail silently - not critical
  }
}

/**
 * Simulate realistic scrolling behavior
 */
export async function simulateScrolling(page: Page): Promise<void> {
  try {
    const scrolls = Math.floor(Math.random() * 2) + 1; // 1-2 scrolls
    
    for (let i = 0; i < scrolls; i++) {
      // Random scroll distance (20%-60% of page height)
      const scrollPercentage = Math.random() * 0.4 + 0.2;
      
      await page.evaluate((percentage) => {
        const scrollDistance = window.innerHeight * percentage;
        window.scrollBy({
          top: scrollDistance,
          behavior: 'smooth',
        });
      }, scrollPercentage);
      
      // Wait a bit (humans don't scroll instantly)
      await page.waitForTimeout(getRandomDelay(500, 1500));
    }
    
    // Scroll back to top
    await page.evaluate(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  } catch (error) {
    // Fail silently
  }
}

/**
 * Simulate reading time based on content length
 * Humans spend more time on longer pages
 */
export function getReadingDelay(wordCount: number): number {
  // Average reading speed: 200-250 words per minute
  // But we only "skim" for 2-5 seconds
  const baseDelay = 2000; // 2 seconds minimum
  const wordDelay = Math.min(wordCount / 250, 3); // Max 3 extra seconds
  
  return baseDelay + (wordDelay * 1000) + getRandomDelay(0, 1000);
}

/**
 * Get random realistic viewport size
 */
export function getRandomViewport(): { width: number; height: number } {
  const viewports = [
    { width: 1920, height: 1080 }, // Full HD
    { width: 1366, height: 768 },  // HD
    { width: 1536, height: 864 },  // HD+
    { width: 1440, height: 900 },  // MacBook
    { width: 2560, height: 1440 }, // 2K
    { width: 1280, height: 720 },  // HD Ready
  ];
  
  return viewports[Math.floor(Math.random() * viewports.length)]!;
}

/**
 * Get random timezone (affects fingerprinting)
 */
export function getRandomTimezone(): string {
  const timezones = [
    'America/New_York',
    'America/Chicago',
    'America/Los_Angeles',
    'America/Denver',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Australia/Sydney',
  ];
  
  return timezones[Math.floor(Math.random() * timezones.length)]!;
}

/**
 * Get random locale
 */
export function getRandomLocale(): string {
  const locales = [
    'en-US',
    'en-GB',
    'en-CA',
    'en-AU',
  ];
  
  return locales[Math.floor(Math.random() * locales.length)]!;
}

/**
 * Enhanced headers that mimic real browser requests
 */
export function getRealisticHeaders(referer?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1', // Do Not Track
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
  };

  if (referer) {
    headers['Referer'] = referer;
    headers['Sec-Fetch-Site'] = 'same-origin';
  }

  return headers;
}

/**
 * Simulate full human-like page interaction
 */
export async function simulateHumanInteraction(
  page: Page, 
  options: {
    enableMouseMovement?: boolean;
    enableScrolling?: boolean;
    wordCount?: number;
  } = {}
): Promise<void> {
  const {
    enableMouseMovement = true,
    enableScrolling = true,
    wordCount = 500,
  } = options;

  try {
    // 1. Initial delay (page load perception)
    await page.waitForTimeout(getRandomDelay(500, 1500));

    // 2. Mouse movements (simulate cursor on page)
    if (enableMouseMovement) {
      await simulateMouseMovement(page);
    }

    // 3. Scrolling behavior
    if (enableScrolling) {
      await simulateScrolling(page);
    }

    // 4. Reading delay based on content
    const readingDelay = getReadingDelay(wordCount);
    await page.waitForTimeout(readingDelay);

  } catch (error) {
    // Fail gracefully - these are nice-to-haves
    console.log('⚠️ Human behavior simulation partially failed (non-critical)');
  }
}

/**
 * Rate limiting between requests
 * Prevents aggressive crawling patterns
 */
export class RateLimiter {
  private lastRequestTime: number = 0;
  private minDelay: number;
  private maxDelay: number;

  constructor(minDelay: number = 2000, maxDelay: number = 5000) {
    this.minDelay = minDelay;
    this.maxDelay = maxDelay;
  }

  /**
   * Wait before next request to appear human-like
   */
  async waitForNextRequest(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const requiredDelay = getRandomDelay(this.minDelay, this.maxDelay);

    if (timeSinceLastRequest < requiredDelay) {
      const waitTime = requiredDelay - timeSinceLastRequest;
      console.log(`⏳ Rate limiting: waiting ${Math.round(waitTime / 1000)}s before next request`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Reset rate limiter
   */
  reset(): void {
    this.lastRequestTime = 0;
  }
}

/**
 * Enhanced browser fingerprint randomization
 * Can be applied to Page or BrowserContext
 */
export async function injectAntiDetectionScripts(target: any): Promise<void> {
  await target.addInitScript(() => {
    // 1. Override navigator.webdriver
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });

    // 2. Mock plugins (modern browsers have few)
    Object.defineProperty(navigator, 'plugins', {
      get: () => [
        {
          0: { type: 'application/pdf' },
          description: 'Portable Document Format',
          filename: 'internal-pdf-viewer',
          length: 1,
          name: 'PDF Viewer',
        },
      ],
    });

    // 3. Add chrome object
    (window as any).chrome = {
      runtime: {},
      loadTimes: () => {},
      csi: () => {},
      app: {},
    };

    // 4. Mock permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters: any) =>
      parameters.name === 'notifications'
        ? Promise.resolve({ state: 'denied' } as PermissionStatus)
        : originalQuery(parameters);

    // 5. Mock languages (consistent with Accept-Language header)
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });

    // 6. Mock hardware concurrency (common values)
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => [2, 4, 8, 16][Math.floor(Math.random() * 4)],
    });

    // 7. Mock device memory (common values)
    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => [4, 8, 16][Math.floor(Math.random() * 3)],
    });

    // 8. Canvas fingerprinting protection (add small noise)
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(type?: string) {
      // Add imperceptible noise to canvas to prevent fingerprinting
      const context = this.getContext('2d');
      if (context) {
        const imageData = context.getImageData(0, 0, this.width, this.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i] = imageData.data[i]! + Math.random() * 0.1 - 0.05;
        }
        context.putImageData(imageData, 0, 0);
      }
      return originalToDataURL.call(this, type);
    };

    // 9. WebGL fingerprinting protection
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      // Randomize WebGL vendor/renderer
      if (parameter === 37445) {
        return 'Intel Inc.';
      }
      if (parameter === 37446) {
        return 'Intel Iris OpenGL Engine';
      }
      return getParameter.call(this, parameter);
    };

    // 10. Mock battery API (privacy concern for fingerprinting)
    if ('getBattery' in navigator) {
      (navigator as any).getBattery = () => Promise.reject(new Error('Battery API not available'));
    }
  });
}

/**
 * Cookie and session management for persistent identity
 */
export interface SessionData {
  cookies: any[];
  localStorage: Record<string, string>;
}

export async function saveSessionData(page: Page): Promise<SessionData> {
  const cookies = await page.context().cookies();
  const localStorage = await page.evaluate(() => {
    const data: Record<string, string> = {};
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key) {
        data[key] = window.localStorage.getItem(key) || '';
      }
    }
    return data;
  });

  return { cookies, localStorage };
}

export async function restoreSessionData(page: Page, session: SessionData): Promise<void> {
  // Restore cookies
  if (session.cookies.length > 0) {
    await page.context().addCookies(session.cookies);
  }

  // Restore localStorage
  if (Object.keys(session.localStorage).length > 0) {
    await page.evaluate((data) => {
      for (const [key, value] of Object.entries(data)) {
        window.localStorage.setItem(key, value);
      }
    }, session.localStorage);
  }
}
