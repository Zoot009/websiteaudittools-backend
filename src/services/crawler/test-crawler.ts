/**
 * Test script for the Site Audit Crawler
 * 
 * Usage:
 *   npx tsx src/services/crawler/test-crawler.ts --quick
 *   npx tsx src/services/crawler/test-crawler.ts --single
 */

import 'dotenv/config'; // Load environment variables
import { SiteAuditCrawler } from './SiteAuditCrawler.js';
import { browserPool } from './BrowserPool.js';
import { SeoAnalyzer } from '../analyzer/SeoAnalyzer.js';

/**
 * Quick Test: Test a single URL with single-page mode
 */
async function quickTest() {
  // 🔧 CHANGE THIS URL TO TEST DIFFERENT WEBSITES
  const TEST_URL = 'https://dental.com/';
  
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   🚀  QUICK CRAWLER TEST (Single Page)                 ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`\n🔍 Testing URL: ${TEST_URL}`);
  console.log(`⏰ Started at: ${new Date().toLocaleTimeString()}`);
  console.log(`\n🛡️  Anti-Bot Settings:`);
  console.log(`   STEALTH_MODE:    ${process.env.STEALTH_MODE || 'false'}`);
  console.log(`   HUMAN_BEHAVIOR:  ${process.env.HUMAN_BEHAVIOR || 'false'}`);
  console.log('─'.repeat(60));

  const startTime = Date.now();
  const crawler = new SiteAuditCrawler();

  try {
    const result = await crawler.crawl(TEST_URL, {
      timeout: 30000,
    });

    const duration = Date.now() - startTime;

    console.log(`\n✅ Crawl completed successfully!`);
    console.log(`⏱️  Total time: ${duration}ms (${(duration / 1000).toFixed(1)}s)`);
    console.log(`📊 Pages analyzed: ${result.pagesAnalyzed}`);
    
    if (result.errors.length > 0) {
      console.log(`⚠️  Errors encountered: ${result.errors.length}`);
    }

    // Display page details
    if (result.pages.length > 0) {
      const page = result.pages[0];
      
      console.log('\n📄 Page Details:');
      console.log('─'.repeat(60));
      console.log(`   URL:              ${page.url}`);
      console.log(`   Title:            ${page.title || '(none)'}`);
      console.log(`   Description:      ${page.description ? page.description.substring(0, 60) + '...' : '(none)'}`);
      console.log(`   Status Code:      ${page.statusCode}`);
      console.log(`   Load Time:        ${page.loadTime}ms`);
      console.log(`   Word Count:       ${page.wordCount}`);
      
      console.log('\n📊 SEO Metrics:');
      console.log('─'.repeat(60));
      console.log(`   Canonical:        ${page.canonical || '(none)'}`);
      console.log(`   Robots:           ${page.robots || '(none)'}`);
      console.log(`   OG Image:         ${page.ogImage ? '✅ Yes' : '❌ No'}`);
      console.log(`   Schema.org:       ${page.hasSchemaOrg ? '✅ Yes' : '❌ No'}`);
      console.log(`   Language:         ${page.langAttr || '(none)'}`);
      
      console.log('\n🎨 Content Analysis:');
      console.log('─'.repeat(60));
      console.log(`   Headings:         ${page.headings.length}`);
      console.log(`   Images:           ${page.images.length}`);
      console.log(`   Links:            ${page.links.length} (${page.links.filter(l => l.isInternal).length} internal)`);
      
      if (page.headings.length > 0) {
        console.log(`\n   Heading Structure:`);
        const h1s = page.headings.filter(h => h.level === 1);
        const h2s = page.headings.filter(h => h.level === 2);
        const h3s = page.headings.filter(h => h.level === 3);
        console.log(`     H1: ${h1s.length}${h1s.length > 0 ? ` - "${h1s[0].text.substring(0, 50)}${h1s[0].text.length > 50 ? '...' : ''}"` : ''}`);
        console.log(`     H2: ${h2s.length}`);
        console.log(`     H3: ${h3s.length}`);
      }
      
      console.log('\n⚡ Performance (Core Web Vitals):');
      console.log('─'.repeat(60));
      console.log(`   LCP:              ${page.lcp ? page.lcp.toFixed(0) + 'ms' : 'N/A'}`);
      console.log(`   CLS:              ${page.cls !== null ? page.cls.toFixed(3) : 'N/A'}`);
      console.log(`   FID:              ${page.fid ? page.fid.toFixed(0) + 'ms' : 'N/A'}`);
      
      if (page.localSeo) {
        console.log('\n📍 Local SEO:');
        console.log('─'.repeat(60));
        console.log(`   Phone:            ${page.localSeo.phone.found ? `✅ ${page.localSeo.phone.number}` : '❌ Not found'}`);
        console.log(`   Address:          ${page.localSeo.address.found ? `✅ ${page.localSeo.address.text?.substring(0, 60)}` : '❌ Not found'}`);
      }
      
      if (page.socialLinks) {
        const social = page.socialLinks;
        console.log('\n🌐 Social Media:');
        console.log('─'.repeat(60));
        console.log(`   Facebook:         ${social.facebook ? '✅' : '❌'}`);
        console.log(`   Twitter:          ${social.twitter ? '✅' : '❌'}`);
        console.log(`   Instagram:        ${social.instagram ? '✅' : '❌'}`);
        console.log(`   LinkedIn:         ${social.linkedin ? '✅' : '❌'}`);
        console.log(`   YouTube:          ${social.youtube ? '✅' : '❌'}`);
      }
    }

    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      console.log('─'.repeat(60));
      result.errors.forEach((error, idx) => {
        console.log(`   ${idx + 1}. ${error}`);
      });
    }

    // ── SEO Analysis ──────────────────────────────────────────
    console.log('\n🔬 Running SEO Analysis...');
    console.log('─'.repeat(60));

    const analyzer = new SeoAnalyzer();
    const analysis = await analyzer.analyze(result.pages, result.baseUrl);

    const scoreColor =
      analysis.overallScore >= 80 ? '\x1b[32m' :
      analysis.overallScore >= 60 ? '\x1b[33m' : '\x1b[31m';
    const RESET = '\x1b[0m';
    const BOLD = '\x1b[1m';
    const DIM = '\x1b[2m';

    console.log(`   Overall Score: ${scoreColor}${BOLD}${analysis.overallScore}/100${RESET}`);
    console.log(`   Issues Found : ${analysis.totalIssues}`);
    console.log(`   Passing      : ${analysis.passingChecks.length}`);

    // ── Heading Frequency ─────────────────────────────────────
    if (analysis.pageHeadings.length > 0) {
      console.log('\n📊 Heading Frequency:');
      console.log('─'.repeat(60));

      for (const pageSummary of analysis.pageHeadings) {
        console.log(`\n   ${BOLD}${pageSummary.pageUrl}${RESET}`);
        console.log(`   ${'HEADER TAG'.padEnd(12)} FREQUENCY   VALUES`);
        console.log(`   ${'─'.repeat(55)}`);

        for (const h of pageSummary.frequency) {
          if (h.count === 0) {
            console.log(`   ${h.tag.padEnd(12)} ${String(h.count).padStart(3)}          ${DIM}(none)${RESET}`);
          } else {
            const bar = '█'.repeat(Math.min(h.count, 20));
            console.log(`   ${h.tag.padEnd(12)} ${String(h.count).padStart(3)}  ${bar}`);
            h.values.slice(0, 5).forEach((v) => {
              const truncated = v.length > 60 ? v.substring(0, 57) + '...' : v;
              console.log(`              ${DIM}→ ${truncated}${RESET}`);
            });
            if (h.values.length > 5) {
              console.log(`              ${DIM}  … and ${h.values.length - 5} more${RESET}`);
            }
          }
        }
      }
    }

    // ── Keyword Consistency ───────────────────────────────────
    if (analysis.keywordConsistency.length > 0) {
      console.log('\n🔑 Keyword Consistency:');
      console.log('─'.repeat(60));

      for (const kc of analysis.keywordConsistency) {
        const statusIcon = kc.passed ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
        console.log(`\n   ${statusIcon} ${BOLD}${kc.pageUrl}${RESET}`);
        console.log(`   ${DIM}${kc.message}${RESET}`);

        if (kc.keywords.length > 0) {
          console.log(`\n   ${BOLD}Individual Keywords${RESET}`);
          console.log(`   ${'KEYWORD'.padEnd(20)} ${'TITLE'.padEnd(7)} ${'META DESC'.padEnd(11)} ${'HEADINGS'.padEnd(10)} FREQ`);
          console.log(`   ${'─'.repeat(55)}`);
          for (const k of kc.keywords) {
            const t = k.inTitle ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
            const m = k.inMetaDescription ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
            const h = k.inHeadingTags ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
            const bar = '█'.repeat(Math.min(k.pageFrequency, 20));
            console.log(`   ${k.keyword.padEnd(20)} ${t}      ${m}          ${h}         ${String(k.pageFrequency).padStart(3)}  ${DIM}${bar}${RESET}`);
          }
        }

        if (kc.phrases.length > 0) {
          console.log(`\n   ${BOLD}Phrases${RESET}`);
          console.log(`   ${'PHRASE'.padEnd(25)} ${'TITLE'.padEnd(7)} ${'META DESC'.padEnd(11)} ${'HEADINGS'.padEnd(10)} FREQ`);
          console.log(`   ${'─'.repeat(60)}`);
          for (const p of kc.phrases) {
            const t = p.inTitle ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
            const m = p.inMetaDescription ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
            const h = p.inHeadingTags ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
            const bar = '█'.repeat(Math.min(p.pageFrequency, 20));
            console.log(`   ${p.keyword.padEnd(25)} ${t}      ${m}          ${h}         ${String(p.pageFrequency).padStart(3)}  ${DIM}${bar}${RESET}`);
          }
        }
      }
    }

    // ── Critical/High issues ──────────────────────────────────
    const importantIssues = analysis.issues.filter(
      (i) => i.severity === 'CRITICAL' || i.severity === 'HIGH'
    );
    if (importantIssues.length > 0) {
      console.log('\n🚨 Critical & High Issues:');
      console.log('─'.repeat(60));
      for (const issue of importantIssues) {
        const color = issue.severity === 'CRITICAL' ? '\x1b[31m' : '\x1b[33m';
        console.log(`   ${color}[${issue.severity}]${RESET} ${BOLD}${issue.title}${RESET}`);
        console.log(`          ${DIM}${issue.description.substring(0, 100)}${issue.description.length > 100 ? '…' : ''}${RESET}`);
      }
    }

  } catch (error: any) {
    console.error(`\n❌ Crawl failed: ${error.message}`);
    console.error('Stack trace:', error.stack);
  } finally {
    await browserPool.closeAll();
  }

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║   ✨  TEST COMPLETE                                      ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
}

/**
 * Single Page Test: Test multiple URLs with single-page mode
 */
async function testSingleMode() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   📄  SINGLE PAGE MODE TEST                            ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  const testUrls = [
    'https://example.com',
    'https://www.wikipedia.org',
    'https://github.com',
  ];

  for (const url of testUrls) {
    console.log(`\n🔍 Testing: ${url}`);
    console.log('─'.repeat(60));

    const startTime = Date.now();
    const crawler = new SiteAuditCrawler();

    try {
      const result = await crawler.crawl(url, {
        timeout: 30000,
      });

      const duration = Date.now() - startTime;

      console.log(`✅ Success - ${duration}ms`);
      
      if (result.pages.length > 0) {
        const page = result.pages[0];
        console.log(`   Title: ${page.title || '(none)'}`);
        console.log(`   Status: ${page.statusCode}`);
        console.log(`   Words: ${page.wordCount}, Images: ${page.images.length}, Links: ${page.links.length}`);
        console.log(`   LCP: ${page.lcp ? page.lcp.toFixed(0) + 'ms' : 'N/A'}`);
      }

      if (result.errors.length > 0) {
        console.log(`   ⚠️  ${result.errors.length} error(s)`);
      }

    } catch (error: any) {
      console.error(`❌ Failed: ${error.message}`);
    }
  }

  await browserPool.closeAll();
  console.log('\n✨ Single mode tests complete\n');
}

// Parse command line arguments
const args = process.argv.slice(2);
const testMode = args[0];

// Run the appropriate test
(async () => {
  try {
    if (testMode === '--quick' || testMode === '-q') {
      await quickTest();
    } else if (testMode === '--single' || testMode === '-s') {
      await testSingleMode();
    } else {
      // Default: show usage and run quick test
      console.log('\n📖 Usage:');
      console.log('   npx tsx src/services/crawler/test-crawler.ts --quick   # Quick single page test');
      console.log('   npx tsx src/services/crawler/test-crawler.ts --single  # Test multiple URLs\n');
      
      await quickTest();
    }
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
})();
