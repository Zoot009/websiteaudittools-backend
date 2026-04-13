/**
 * Test script for sitemap parser
 * 
 * Usage:
 *   npx tsx src/services/crawler/test-sitemap.ts
 */

import { 
  getSitemapsFromRobots,
  resolveSitemap,
  getSeedUrls,
  discoverSitemapPageUrls
} from './sitemapParser.js';
import { browserPool } from './BrowserPool.js';

// Test domains with different sitemap configurations
const TEST_DOMAINS = [
  'https://chatgpt.com'         // Complex site structure
];

/**
 * Quick Test: Test a single URL for sitemap discovery
 * Modify the TEST_URL constant below to test different websites
 */
async function quickTest() {
  // 🔧 CHANGE THIS URL TO TEST DIFFERENT WEBSITES
  const TEST_URL = 'https://chatgpt.com';
  
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   🚀  QUICK SITEMAP TEST                              ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`\n🔍 Testing URL: ${TEST_URL}`);
  console.log(`⏰ Started at: ${new Date().toLocaleTimeString()}\n`);
  console.log('─'.repeat(60));

  const startTime = Date.now();

  try {
    // Step 1: Check robots.txt
    console.log('\n📋 Step 1: Checking robots.txt...');
    const sitemaps = await getSitemapsFromRobots(TEST_URL);
    
    if (sitemaps.length > 0) {
      console.log(`✅ Found ${sitemaps.length} sitemap(s) in robots.txt:`);
      sitemaps.forEach((sm, idx) => {
        console.log(`   ${idx + 1}. ${sm}`);
      });
    } else {
      console.log('⚠️  No sitemaps found in robots.txt');
      console.log('   Will try common sitemap paths...');
    }

    // Step 2: Get all seed URLs
    console.log('\n🌱 Step 2: Fetching all seed URLs...');
    const seeds = await getSeedUrls(TEST_URL);
    const duration = Date.now() - startTime;
    
    console.log(`\n✅ Successfully fetched sitemap data!`);
    console.log(`⏱️  Total time: ${duration}ms (${(duration / 1000).toFixed(1)}s)`);
    console.log(`📊 Total seed URLs: ${seeds.length}`);
    
    // Display results
    if (seeds.length > 0) {
      console.log('\n📄 Discovered URLs:');
      console.log('─'.repeat(60));
      
      // Show first 20 URLs
      const displayCount = Math.min(20, seeds.length);
      seeds.slice(0, displayCount).forEach((url, idx) => {
        console.log(`   ${(idx + 1).toString().padStart(2, ' ')}. ${url}`);
      });
      
      if (seeds.length > displayCount) {
        console.log(`   ... and ${seeds.length - displayCount} more URLs`);
      }
      
      // Statistics
      console.log('\n📊 Statistics:');
      console.log(`   Total URLs:        ${seeds.length}`);
      console.log(`   Sitemaps found:    ${sitemaps.length || 'None (used fallback)'}`);
      console.log(`   Avg fetch speed:   ${(seeds.length / duration * 1000).toFixed(2)} URLs/sec`);
    } else {
      console.log('\n⚠️  No URLs found in sitemaps');
      console.log('   The site may not have a sitemap, or it may be blocked');
    }

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    console.error('Stack trace:', error.stack);
  } finally {
    // Cleanup
    await browserPool.closeAll();
  }

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║   ✨  TEST COMPLETE                                   ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
}

/**
 * Test 1: Get sitemaps from robots.txt
 */
async function testGetSitemapsFromRobots() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 TEST 1: Get Sitemaps from robots.txt');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  for (const domain of TEST_DOMAINS) {
    console.log(`\n🔍 Testing: ${domain}`);
    console.log('─'.repeat(50));
    
    try {
      const sitemaps = await getSitemapsFromRobots(domain);
      
      if (sitemaps.length > 0) {
        console.log(`✅ Found ${sitemaps.length} sitemap(s):`);
        sitemaps.forEach((sm, idx) => {
          console.log(`   ${idx + 1}. ${sm}`);
        });
      } else {
        console.log('⚠️  No sitemaps found in robots.txt');
      }
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
    }
  }
}

/**
 * Test 2: Resolve a single sitemap
 */
async function testResolveSitemap() {
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🗺️  TEST 2: Resolve Individual Sitemap');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const testSitemaps = [
    'https://zootwebagency.com/sitemap_index.xml',
    'https://www.npmjs.com/sitemap.xml',
  ];

  for (const sitemapUrl of testSitemaps) {
    console.log(`\n🔍 Resolving: ${sitemapUrl}`);
    console.log('─'.repeat(50));
    
    try {
      const startTime = Date.now();
      const urls = await resolveSitemap(sitemapUrl);
      const duration = Date.now() - startTime;
      
      console.log(`✅ Resolved in ${duration}ms`);
      console.log(`📊 Found ${urls.length} URL(s)`);
      
      if (urls.length > 0) {
        console.log('\n📄 Sample URLs (first 10):');
        urls.slice(0, 10).forEach((url, idx) => {
          console.log(`   ${idx + 1}. ${url}`);
        });
        
        if (urls.length > 10) {
          console.log(`   ... and ${urls.length - 10} more`);
        }
      }
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
    }
  }
}

/**
 * Test 3: Get seed URLs (full workflow)
 */
async function testGetSeedUrls() {
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🌱 TEST 3: Get Seed URLs (Full Workflow)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  for (const domain of TEST_DOMAINS) {
    console.log(`\n🔍 Testing: ${domain}`);
    console.log('─'.repeat(50));
    
    try {
      const startTime = Date.now();
      const seeds = await getSeedUrls(domain);
      const duration = Date.now() - startTime;
      
      console.log(`✅ Completed in ${duration}ms`);
      console.log(`📊 Total seed URLs: ${seeds.length}`);
      
      if (seeds.length > 0) {
        console.log('\n📄 Sample seed URLs (first 15):');
        seeds.slice(0, 15).forEach((url, idx) => {
          console.log(`   ${idx + 1}. ${url}`);
        });
        
        if (seeds.length > 15) {
          console.log(`   ... and ${seeds.length - 15} more`);
        }
      }
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
    }
  }
}

/**
 * Test 4: Discover sitemap page URLs (analyzer context)
 */
async function testDiscoverSitemapPageUrls() {
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔎 TEST 4: Discover Sitemap Page URLs');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const testDomain = 'https://example.com';
  console.log(`🔍 Testing: ${testDomain}`);
  console.log('─'.repeat(50));
  
  try {
    const startTime = Date.now();
    const pageUrls = await discoverSitemapPageUrls(testDomain);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Completed in ${duration}ms`);
    console.log(`📊 Found ${pageUrls.size} unique page URL(s)`);
    
    if (pageUrls.size > 0) {
      console.log('\n📄 Sample page URLs (first 10):');
      Array.from(pageUrls).slice(0, 10).forEach((url, idx) => {
        console.log(`   ${idx + 1}. ${url}`);
      });
      
      if (pageUrls.size > 10) {
        console.log(`   ... and ${pageUrls.size - 10} more`);
      }
    }

    // Verify homepage is NOT automatically added
    const hasHomepage = pageUrls.has(testDomain) || pageUrls.has(testDomain + '/');
    console.log(`\n🏠 Homepage auto-added: ${hasHomepage ? '❌ YES (unexpected)' : '✅ NO (expected)'}`);
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
  }
}

/**
 * Test 5: Error handling and edge cases
 */
async function testErrorHandling() {
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚠️  TEST 5: Error Handling & Edge Cases');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const edgeCases = [
    {
      name: 'Non-existent domain',
      url: 'https://this-domain-definitely-does-not-exist-12345.com',
    },
    {
      name: 'Invalid sitemap URL',
      url: 'https://example.com/nonexistent-sitemap.xml',
    },
    {
      name: 'Domain without sitemap',
      url: 'https://httpbin.org',
    },
  ];

  for (const testCase of edgeCases) {
    console.log(`\n🧪 Test: ${testCase.name}`);
    console.log(`   URL: ${testCase.url}`);
    console.log('─'.repeat(50));
    
    try {
      const seeds = await getSeedUrls(testCase.url);
      console.log(`✅ Gracefully handled - returned ${seeds.length} seed URL(s)`);
      
      // Should at least return the base URL
      if (seeds.length > 0) {
        console.log('   Fallback seeds:', seeds);
      }
    } catch (error: any) {
      console.error(`❌ Unexpected error: ${error.message}`);
    }
  }
}

/**
 * Test 6: Performance test with timing
 */
async function testPerformance() {
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚡ TEST 6: Performance Metrics');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const testDomain = 'https://example.com';
  console.log(`🔍 Testing: ${testDomain}`);
  console.log('─'.repeat(50));

  try {
    // Time robots.txt fetch
    console.log('\n1️⃣  Fetching robots.txt...');
    const robotsStart = Date.now();
    const sitemaps = await getSitemapsFromRobots(testDomain);
    const robotsDuration = Date.now() - robotsStart;
    console.log(`   ⏱️  Time: ${robotsDuration}ms`);
    console.log(`   📊 Found: ${sitemaps.length} sitemap(s)`);

    // Time sitemap resolution
    if (sitemaps.length > 0) {
      console.log('\n2️⃣  Resolving sitemap...');
      const resolveStart = Date.now();
      const urls = await resolveSitemap(sitemaps[0]);
      const resolveDuration = Date.now() - resolveStart;
      console.log(`   ⏱️  Time: ${resolveDuration}ms`);
      console.log(`   📊 URLs: ${urls.length}`);
      console.log(`   📈 Rate: ${(urls.length / resolveDuration * 1000).toFixed(2)} URLs/sec`);
    }

    // Time full workflow
    console.log('\n3️⃣  Full workflow (getSeedUrls)...');
    const fullStart = Date.now();
    const seeds = await getSeedUrls(testDomain);
    const fullDuration = Date.now() - fullStart;
    console.log(`   ⏱️  Total time: ${fullDuration}ms`);
    console.log(`   📊 Total seeds: ${seeds.length}`);
    
    console.log('\n📊 Summary:');
    console.log(`   robots.txt:      ${robotsDuration}ms`);
    console.log(`   Sitemap parse:   ${sitemaps.length ? `ms` : 'N/A'}`);
    console.log(`   Total workflow:  ${fullDuration}ms`);
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║   🧪  SITEMAP PARSER TEST SUITE              ║');
  console.log('╚═══════════════════════════════════════════════╝');
  console.log(`\n⏰ Started at: ${new Date().toISOString()}\n`);

  const startTime = Date.now();

  try {
    await testGetSitemapsFromRobots();
    await testResolveSitemap();
    await testGetSeedUrls();
    await testDiscoverSitemapPageUrls();
    await testErrorHandling();
    await testPerformance();

    const totalDuration = Date.now() - startTime;

    console.log('\n\n╔═══════════════════════════════════════════════╗');
    console.log('║   ✅  ALL TESTS COMPLETED                    ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log(`\n⏱️  Total duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(1)}s)`);
    console.log(`✨ Finished at: ${new Date().toISOString()}\n`);
  } catch (error: any) {
    console.error('\n\n❌ Test suite failed:', error);
    process.exit(1);
  } finally {
    await browserPool.closeAll();
  }
}

// Check command line arguments
const args = process.argv.slice(2);
const runQuickTest = args.includes('--quick') || args.includes('-q');

// Run the appropriate test
if (runQuickTest) {
  quickTest()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
} else {
  runAllTests()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
