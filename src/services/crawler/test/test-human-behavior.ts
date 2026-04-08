/**
 * Test Human Behavior Simulation
 * 
 * This test demonstrates the anti-bot detection features
 * Run with: npx tsx src/services/crawler/test-human-behavior.ts
 */

import { SiteAuditCrawler } from './SiteAuditCrawler.js';
import { browserPool } from './BrowserPool.js';

async function testHumanBehavior() {
  console.log('\n🧪 Testing Human Behavior Simulation\n');
  console.log('================================================\n');

  // Test sites (choose based on what you want to test)
  const testSites = [
    {
      name: 'Regular Site (No Protection)',
      url: 'https://example.com',
      expectation: 'Should work easily',
    },
    {
      name: 'Bot Detection Test',
      url: 'https://bot.sannysoft.com/',
      expectation: 'Will detect headless if stealth mode is off',
    },
    // Uncomment to test Cloudflare
    // {
    //   name: 'Cloudflare Protected',
    //   url: 'https://nowsecure.nl',
    //   expectation: 'May show challenge without stealth',
    // },
  ];

  for (const site of testSites) {
    console.log(`\n📍 Testing: ${site.name}`);
    console.log(`   URL: ${site.url}`);
    console.log(`   Expected: ${site.expectation}\n`);

    try {
      const crawler = new SiteAuditCrawler();
      
      // Test with human behavior enabled
      const result = await crawler.crawl(site.url, {
        mode: 'single',
        timeout: 30000,
      });

      if (result.pages.length > 0) {
        const page = result.pages[0];
        console.log(`✅ SUCCESS! Crawled successfully`);
        console.log(`   Title: ${page?.title || 'N/A'}`);
        console.log(`   Status: ${page?.statusCode}`);
        console.log(`   Load Time: ${page?.loadTime}ms`);
        console.log(`   Word Count: ${page?.wordCount}`);
        
        // Check if we got a challenge page
        if (page?.html.toLowerCase().includes('just a moment') || 
            page?.html.toLowerCase().includes('checking your browser')) {
          console.log(`⚠️  WARNING: Cloudflare challenge detected!`);
          console.log(`   Try enabling STEALTH_MODE=true`);
        }
      } else {
        console.log(`❌ FAILED: No pages crawled`);
      }

      if (result.errors.length > 0) {
        console.log(`⚠️  Errors: ${result.errors.length}`);
        result.errors.forEach(err => console.log(`   - ${err}`));
      }

    } catch (error) {
      console.log(`❌ ERROR: ${error}`);
    }

    console.log('\n---\n');
  }

  // Show current configuration
  console.log('\n📋 Current Configuration:\n');
  console.log(`   STEALTH_MODE: ${process.env.STEALTH_MODE || 'false'}`);
  console.log(`   HUMAN_BEHAVIOR: ${process.env.HUMAN_BEHAVIOR || 'false'}`);
  console.log(`   BROWSER_COUNT: ${process.env.BROWSER_COUNT || '3'}`);
  console.log(`   HEADLESS: ${process.env.HEADLESS !== 'false' ? 'true' : 'false'}`);

  console.log('\n💡 Tips:\n');
  console.log('   - Enable STEALTH_MODE=true for better anti-detection');
  console.log('   - Enable HUMAN_BEHAVIOR=true for realistic interactions');
  console.log('   - Use HEADLESS=false to see browser actions visually');
  console.log('   - Test at https://bot.sannysoft.com/ to check fingerprint');

  console.log('\n================================================\n');
}

// Run the test
testHumanBehavior()
  .then(() => {
    console.log('✅ Test complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    // Clean up browser pool
    await browserPool.closeAll();
  });
