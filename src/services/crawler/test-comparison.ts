/**
 * Side-by-Side Comparison Test
 * 
 * Tests crawling the same site with and without human behavior
 * to demonstrate the difference in behavior and detection rates.
 * 
 * Run: npx tsx src/services/crawler/test-comparison.ts
 */

import { chromium } from 'playwright';
import { 
  simulateHumanInteraction, 
  injectAntiDetectionScripts,
  getRandomViewport,
  getRealisticHeaders 
} from './humanBehavior.js';

async function testWithoutHumanBehavior(url: string) {
  console.log('\n🤖 === TEST 1: BASIC CRAWLER (Robot-like) ===\n');
  
  const startTime = Date.now();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
    const content = await page.content();
    const title = await page.title();
    
    const duration = Date.now() - startTime;
    
    console.log(`✓ Page loaded: ${title}`);
    console.log(`🌐 Status code: ${response?.status() || 'N/A'}`);
    console.log(`⏱  Time taken: ${duration}ms`);
    console.log(`📄 Content length: ${content.length} bytes`);
    
    // Check for detection
    const isBlocked = content.toLowerCase().includes('just a moment') || 
                     content.toLowerCase().includes('checking your browser') ||
                     content.toLowerCase().includes('access denied');
    
    if (isBlocked) {
      console.log(`❌ DETECTED: Site shows challenge/block page`);
    } else {
      console.log(`✅ SUCCESS: No obvious detection`);
    }
    
  } catch (error) {
    console.log(`❌ ERROR: ${error}`);
  } finally {
    await browser.close();
  }
}

async function testWithHumanBehavior(url: string) {
  console.log('\n👤 === TEST 2: HUMAN-LIKE CRAWLER ===\n');
  
  const startTime = Date.now();
  const browser = await chromium.launch({ 
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
    ]
  });
  
  const viewport = getRandomViewport();
  const context = await browser.newContext({
    viewport,
    extraHTTPHeaders: getRealisticHeaders(),
    locale: 'en-US',
    timezoneId: 'America/New_York',
  });
  
  // Inject anti-detection
  await injectAntiDetectionScripts(context);
  
  const page = await context.newPage();
  
  try {
    console.log(`📐 Viewport: ${viewport.width}x${viewport.height}`);
    console.log(`🌍 Timezone: America/New_York`);
    console.log(`🎭 Random behaviors: ENABLED`);
    
    const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
    
    // Get word count for realistic timing
    const wordCount = await page.evaluate(() => {
      return document.body.innerText.split(/\s+/).length;
    });
    
    console.log(`🌐 Status code: ${response?.status() || 'N/A'}`);
    console.log(`📝 Word count: ${wordCount}`);
    console.log(`🤖 Simulating human interaction...`);
    
    // Simulate human behavior
    await simulateHumanInteraction(page, {
      wordCount,
      enableMouseMovement: true,
      enableScrolling: true,
    });
    
    const content = await page.content();
    const title = await page.title();
    
    const duration = Date.now() - startTime;
    
    console.log(`✓ Page loaded: ${title}`);
    console.log(`⏱  Time taken: ${duration}ms`);
    console.log(`📄 Content length: ${content.length} bytes`);
    
    // Check for detection
    const isBlocked = content.toLowerCase().includes('just a moment') || 
                     content.toLowerCase().includes('checking your browser') ||
                     content.toLowerCase().includes('access denied');
    
    if (isBlocked) {
      console.log(`❌ DETECTED: Site shows challenge/block page`);
    } else {
      console.log(`✅ SUCCESS: No obvious detection`);
    }
    
    // Check webdriver flag
    const hasWebdriver = await page.evaluate(() => (window.navigator as any).webdriver);
    console.log(`🔍 navigator.webdriver: ${hasWebdriver ? '❌ true (exposed)' : '✅ false (hidden)'}`);
    
  } catch (error) {
    console.log(`❌ ERROR: ${error}`);
  } finally {
    await browser.close();
  }
}

async function runComparison() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║  HUMAN BEHAVIOR SIMULATION - COMPARISON TEST   ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  
  // Test URL - use a bot detection test site
  const testUrl = process.argv[2] || 'https://dynastyc.com';
  
  console.log(`🎯 Testing URL: ${testUrl}\n`);
  console.log('This test will crawl the same page twice:');
  console.log('  1. Like a typical bot (fast, no human behavior)');
  console.log('  2. Like a human (delays, mouse, scrolling)\n');
  console.log('================================================\n');
  
  // Test 1: Basic crawler
  await testWithoutHumanBehavior(testUrl);
  
  console.log('\n---\n');
  
  // Small delay between tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 2: Human-like crawler
  await testWithHumanBehavior(testUrl);
  
  // Summary
  console.log('\n\n╔════════════════════════════════════════════════╗');
  console.log('║                   SUMMARY                      ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  
  console.log('📊 Key Differences:\n');
  console.log('   1. Speed:');
  console.log('      • Basic: ~1-2 seconds');
  console.log('      • Human: ~4-8 seconds (includes delays)\n');
  
  console.log('   2. Detection Risk:');
  console.log('      • Basic: Medium-High (webdriver flag, no delays)');
  console.log('      • Human: Low (hidden flags, realistic behavior)\n');
  
  console.log('   3. Fingerprint:');
  console.log('      • Basic: Consistent, easily detected');
  console.log('      • Human: Randomized, harder to detect\n');
  
  console.log('💡 Recommendations:\n');
  console.log('   • Use human behavior for aggressive sites (Cloudflare, etc.)');
  console.log('   • Use basic mode for trusted sites (faster)');
  console.log('   • Always cache results to minimize re-crawling\n');
  
  console.log('🧪 Test More Sites:\n');
  console.log('   npx tsx test-comparison.ts https://bot.sannysoft.com/');
  console.log('   npx tsx test-comparison.ts https://nowsecure.nl\n');
}

// Run comparison
runComparison()
  .then(() => {
    console.log('✅ Comparison test complete\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
