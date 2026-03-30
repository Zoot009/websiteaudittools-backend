/**
 * Cloudflare Protection Bypass Utilities
 * 
 * Cloudflare uses multiple detection methods:
 * 1. TLS fingerprinting
 * 2. HTTP/2 fingerprinting
 * 3. JavaScript challenges
 * 4. Canvas/WebGL fingerprinting
 * 5. Behavioral analysis
 * 6. IP reputation
 */

import type { Page, BrowserContext } from 'playwright';
import { detectCloudflareBlock } from './antibot.js';

/**
 * Enhanced Cloudflare detection with detailed analysis
 */
export async function detectCloudflareChallenge(page: Page): Promise<{
  isCloudflare: boolean;
  challengeType: 'none' | 'js-challenge' | 'captcha' | 'ban';
  details: string[];
}> {
  try {
    const url = page.url();
    const content = await page.content();
    const title = await page.title();
    
    const details: string[] = [];
    let challengeType: 'none' | 'js-challenge' | 'captcha' | 'ban' = 'none';
    
    // Check for Cloudflare indicators
    const lowerContent = content.toLowerCase();
    const lowerTitle = title.toLowerCase();
    
    // JavaScript Challenge
    if (lowerContent.includes('checking your browser') || 
        lowerContent.includes('just a moment') ||
        lowerContent.includes('please wait while we check your browser')) {
      challengeType = 'js-challenge';
      details.push('JavaScript challenge detected');
    }
    
    // CAPTCHA Challenge
    if (lowerContent.includes('captcha') || 
        lowerContent.includes('recaptcha') ||
        lowerContent.includes('hcaptcha')) {
      challengeType = 'captcha';
      details.push('CAPTCHA challenge detected');
    }
    
    // Banned/Blocked
    if (lowerTitle.includes('access denied') || 
        lowerContent.includes('you have been blocked') ||
        lowerContent.includes('your access has been blocked')) {
      challengeType = 'ban';
      details.push('Access blocked/banned');
    }
    
    // Check for Cloudflare Ray ID (indicates Cloudflare is active)
    const cfRayMatch = content.match(/cloudflare ray id: ([a-f0-9-]+)/i);
    if (cfRayMatch) {
      details.push(`Cloudflare Ray ID: ${cfRayMatch[1]}`);
    }
    
    // Check if challenge page is present
    const hasChallengeScript = lowerContent.includes('cf_chl_opt') || 
                               lowerContent.includes('cf-challenge');
    
    if (hasChallengeScript && challengeType === 'none') {
      challengeType = 'js-challenge';
      details.push('Cloudflare challenge script detected');
    }
    
    const isCloudflare = challengeType !== 'none' || details.length > 0;
    
    return { isCloudflare, challengeType, details };
    
  } catch (error) {
    return { 
      isCloudflare: false, 
      challengeType: 'none', 
      details: [`Error detecting: ${error}`] 
    };
  }
}

/**
 * Wait for Cloudflare challenge to complete
 * This works for JavaScript challenges (not CAPTCHAs)
 */
export async function waitForCloudflareChallenge(
  page: Page, 
  maxWaitTime: number = 30000
): Promise<boolean> {
  console.log('⏳ Waiting for Cloudflare challenge to resolve...');
  
  const startTime = Date.now();
  
  try {
    // Wait for the challenge to complete by checking for URL change or content change
    await page.waitForFunction(
      () => {
        const body = document.body.innerText.toLowerCase();
        return !body.includes('checking your browser') && 
               !body.includes('just a moment') &&
               !body.includes('please wait');
      },
      { timeout: maxWaitTime }
    );
    
    const duration = Date.now() - startTime;
    console.log(`✅ Challenge resolved in ${duration}ms`);
    
    // Small delay to let page stabilize
    await page.waitForTimeout(1000);
    
    return true;
  } catch (error) {
    console.log(`❌ Challenge did not resolve within ${maxWaitTime}ms`);
    return false;
  }
}

/**
 * Enhanced browser context for Cloudflare bypass
 * Adds extra headers and properties that Cloudflare checks
 */
export async function createCloudflareBypassContext(
  browser: any,
  options: {
    userAgent?: string;
    viewport?: { width: number; height: number };
    locale?: string;
    timezone?: string;
  } = {}
): Promise<BrowserContext> {
  
  const context = await browser.newContext({
    userAgent: options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: options.viewport || { width: 1920, height: 1080 },
    locale: options.locale || 'en-US',
    timezoneId: options.timezone || 'America/New_York',
    
    // Important headers for Cloudflare
    extraHTTPHeaders: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Sec-CH-UA': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
      'Sec-CH-UA-Mobile': '?0',
      'Sec-CH-UA-Platform': '"Windows"',
    },
    
    // Enable JavaScript (required for challenges)
    javaScriptEnabled: true,
    
    // Accept all downloads in case of redirects
    acceptDownloads: false,
    
    // Ignore HTTPS errors
    ignoreHTTPSErrors: false,
  });
  
  // Inject advanced anti-detection scripts
  await context.addInitScript(() => {
    // 1. Hide webdriver
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
    
    // 2. Add chrome object with realistic properties
    (window as any).chrome = {
      runtime: {},
      loadTimes: function() {},
      csi: function() {},
      app: {
        isInstalled: false,
        InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
        RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' },
      },
    };
    
    // 3. Mock permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters: any) =>
      parameters.name === 'notifications'
        ? Promise.resolve({ state: 'denied' } as PermissionStatus)
        : originalQuery(parameters);
    
    // 4. Mock plugins (modern browsers have fewer plugins)
    Object.defineProperty(navigator, 'plugins', {
      get: () => [
        {
          0: { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
          description: 'Portable Document Format',
          filename: 'internal-pdf-viewer',
          length: 1,
          name: 'PDF Viewer',
        },
        {
          0: { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format' },
          description: 'Portable Document Format',
          filename: 'internal-pdf-viewer',
          length: 1,
          name: 'Chrome PDF Viewer',
        },
      ],
    });
    
    // 5. Languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });
    
    // 6. Hardware concurrency (realistic values)
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => 8,
    });
    
    // 7. Device memory
    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => 8,
    });
    
    // 8. Platform
    Object.defineProperty(navigator, 'platform', {
      get: () => 'Win32',
    });
    
    // 9. Mock battery API (privacy concern)
    if ('getBattery' in navigator) {
      (navigator as any).getBattery = () => Promise.reject(new Error('Battery status unavailable'));
    }
    
    // 10. Canvas fingerprinting - add consistent but realistic noise
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(type?: string) {
      const context = this.getContext('2d');
      if (context) {
        const imageData = context.getImageData(0, 0, this.width, this.height);
        // Add very small noise to avoid detection while maintaining consistency
        for (let i = 0; i < imageData.data.length; i += 100) {
          imageData.data[i] = imageData.data[i]! + 0.01;
        }
        context.putImageData(imageData, 0, 0);
      }
      return originalToDataURL.call(this, type);
    };
    
    // 11. WebGL fingerprinting
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      if (parameter === 37445) return 'Intel Inc.';
      if (parameter === 37446) return 'Intel Iris OpenGL Engine';
      return getParameter.call(this, parameter);
    };
    
    // 12. Override automation-related properties
    delete (window.navigator as any).__proto__.webdriver;
  });
  
  return context;
}

/**
 * Full Cloudflare bypass attempt
 */
export async function bypassCloudflare(
  page: Page,
  url: string,
  options: {
    maxAttempts?: number;
    waitForChallenge?: boolean;
    challengeTimeout?: number;
  } = {}
): Promise<{
  success: boolean;
  challengeType: string;
  finalUrl: string;
  details: string[];
}> {
  const maxAttempts = options.maxAttempts || 1;
  const waitForChallenge = options.waitForChallenge ?? true;
  const challengeTimeout = options.challengeTimeout || 30000;
  
  const details: string[] = [];
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    details.push(`Attempt ${attempt}/${maxAttempts}`);
    
    try {
      // Navigate to the page
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      
      details.push(`Status: ${response?.status() || 'unknown'}`);
      
      // Check for Cloudflare challenge
      const detection = await detectCloudflareChallenge(page);
      
      if (detection.isCloudflare) {
        details.push(`Cloudflare detected: ${detection.challengeType}`);
        details.push(...detection.details);
        
        if (detection.challengeType === 'js-challenge' && waitForChallenge) {
          // Wait for JavaScript challenge to complete
          const resolved = await waitForCloudflareChallenge(page, challengeTimeout);
          
          if (resolved) {
            // Check again after challenge
            const recheck = await detectCloudflareChallenge(page);
            if (!recheck.isCloudflare) {
              details.push('Challenge passed successfully');
              return {
                success: true,
                challengeType: detection.challengeType,
                finalUrl: page.url(),
                details,
              };
            }
          } else {
            details.push('Challenge did not resolve in time');
          }
        } else if (detection.challengeType === 'captcha') {
          details.push('⚠️ CAPTCHA detected - requires human solving or service');
          return {
            success: false,
            challengeType: detection.challengeType,
            finalUrl: page.url(),
            details,
          };
        } else if (detection.challengeType === 'ban') {
          details.push('❌ IP/User banned - requires proxy rotation');
          return {
            success: false,
            challengeType: detection.challengeType,
            finalUrl: page.url(),
            details,
          };
        }
      } else {
        // No Cloudflare challenge, success!
        details.push('✅ No Cloudflare challenge detected');
        return {
          success: true,
          challengeType: 'none',
          finalUrl: page.url(),
          details,
        };
      }
      
    } catch (error) {
      details.push(`Error: ${error}`);
    }
    
    // Wait before retry
    if (attempt < maxAttempts) {
      const delay = 2000 * attempt; // Increasing delay
      details.push(`Waiting ${delay}ms before retry...`);
      await page.waitForTimeout(delay);
    }
  }
  
  return {
    success: false,
    challengeType: 'unknown',
    finalUrl: page.url(),
    details,
  };
}

/**
 * Check if we need to use Cloudflare bypass for a URL
 */
export function shouldUseCloudflareBypass(url: string): boolean {
  // You can maintain a list of domains known to use Cloudflare
  const cloudflareIndicators = [
    'cloudflare-dns.com',
    // Add more as you discover them
  ];
  
  return cloudflareIndicators.some(indicator => url.includes(indicator));
}
