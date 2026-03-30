/**
 * Cloudflare Bypass Test
 * 
 * Tests the Cloudflare detection and bypass capabilities
 * Run: npx tsx src/services/crawler/test-cloudflare.ts
 */

import { chromium } from 'playwright';
import {
  detectCloudflareChallenge,
  waitForCloudflareChallenge,
  createCloudflareBypassContext,
  bypassCloudflare,
} from './cloudflareBypass.js';

async function testCloudflareBypass(url: string) {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║       CLOUDFLARE BYPASS TEST                   ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  
  console.log(`🎯 Testing URL: ${url}\n`);
  
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });
  
  try {
    // Create bypass-ready context
    console.log('📦 Creating Cloudflare-bypass context...');
    const context = await createCloudflareBypassContext(browser, {
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      timezone: 'America/New_York',
    });
    
    const page = await context.newPage();
    
    // Attempt bypass
    console.log('\n🚀 Attempting to bypass Cloudflare...\n');
    const result = await bypassCloudflare(page, url, {
      maxAttempts: 2,
      waitForChallenge: true,
      challengeTimeout: 30000,
    });
    
    // Display results
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 RESULTS:\n');
    console.log(`   Success: ${result.success ? '✅ YES' : '❌ NO'}`);
    console.log(`   Challenge Type: ${result.challengeType}`);
    console.log(`   Final URL: ${result.finalUrl}\n`);
    
    console.log('📝 Details:');
    result.details.forEach((detail, i) => {
      console.log(`   ${i + 1}. ${detail}`);
    });
    
    if (result.success) {
      // Get page info
      const title = await page.title();
      const content = await page.content();
      
      console.log('\n✅ PAGE SUCCESSFULLY LOADED:\n');
      console.log(`   Title: ${title}`);
      console.log(`   Content length: ${content.length} bytes`);
      
      // Check what we got
      const hasContent = content.length > 10000;
      const hasTitle = title && title !== 'Just a moment...';
      
      if (hasContent && hasTitle) {
        console.log('\n🎉 SUCCESS! Page content retrieved successfully!');
      } else {
        console.log('\n⚠️  WARNING: Page loaded but content may be incomplete');
      }
    } else {
      console.log('\n❌ BYPASS FAILED\n');
      
      // Provide recommendations
      if (result.challengeType === 'captcha') {
        console.log('💡 RECOMMENDATIONS:');
        console.log('   • Use a CAPTCHA solving service (2captcha, Anti-Captcha)');
        console.log('   • Use residential proxies');
        console.log('   • Consider manual intervention');
      } else if (result.challengeType === 'ban') {
        console.log('💡 RECOMMENDATIONS:');
        console.log('   • Rotate IP addresses (use proxy pool)');
        console.log('   • Wait before retrying (cooldown period)');
        console.log('   • Check if domain/IP is blacklisted');
      } else {
        console.log('💡 RECOMMENDATIONS:');
        console.log('   • Enable STEALTH_MODE=true');
        console.log('   • Enable HUMAN_BEHAVIOR=true');
        console.log('   • Use residential proxies');
        console.log('   • Increase challenge timeout');
      }
    }
    
    await page.close();
    await context.close();
    
  } catch (error) {
    console.log(`\n❌ ERROR: ${error}\n`);
  } finally {
    await browser.close();
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

async function runTests() {
  // Test URLs (replace with actual Cloudflare-protected sites)
  const testUrls = [
    process.argv[2] || 'https://nowsecure.nl', // Known Cloudflare test site
    // Add more URLs to test
  ];
  
  console.log('\n🧪 CLOUDFLARE BYPASS TESTING SUITE\n');
  console.log('This will test our ability to bypass Cloudflare protection.\n');
  
  for (const url of testUrls) {
    await testCloudflareBypass(url);
    
    // Wait between tests
    if (testUrls.indexOf(url) < testUrls.length - 1) {
      console.log('\n⏸  Waiting 5 seconds before next test...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║              TEST SUMMARY                      ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  
  console.log('📚 CLOUDFLARE PROTECTION LEVELS:\n');
  console.log('   Level 1: Basic Bot Fight');
  console.log('      ✅ Can bypass with --disable-blink-features');
  console.log('      ✅ Our current setup handles this\n');
  
  console.log('   Level 2: JavaScript Challenge');
  console.log('      ⚠️  Can often bypass by waiting');
  console.log('      ⚠️  Requires good fingerprinting\n');
  
  console.log('   Level 3: CAPTCHA');
  console.log('      ❌ Requires CAPTCHA solving service');
  console.log('      ❌ Or residential proxies\n');
  
  console.log('   Level 4: Bot Management (Enterprise)');
  console.log('      ❌ Very difficult to bypass');
  console.log('      ❌ Requires advanced techniques\n');
  
  console.log('💡 TIPS:\n');
  console.log('   • Always use stealth mode for Cloudflare sites');
  console.log('   • Enable human behavior simulation');
  console.log('   • Use reputable proxy services (Bright Data, Oxylabs)');
  console.log('   • Respect rate limits');
  console.log('   • Cache aggressively to minimize requests\n');
  
  console.log('🔗 TEST MORE SITES:\n');
  console.log('   npx tsx test-cloudflare.ts https://example-with-cf.com\n');
}

// Run tests
runTests()
  .then(() => {
    console.log('✅ Testing complete\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Testing failed:', error);
    process.exit(1);
  });
