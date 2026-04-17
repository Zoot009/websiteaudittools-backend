/**
 * Test PageSpeed Insights Integration
 * 
 * Usage:
 *   ts-node src/services/performance/test-pagespeed.ts [url]
 */

// IMPORTANT: Load environment variables FIRST, before importing services
import * as dotenv from 'dotenv';
dotenv.config();

// Now import service (which reads process.env in constructor)
import { pageSpeedService } from './pageSpeedService.js';

async function testPageSpeed() {
  const url = process.argv[2] || 'https://example.com';

  console.log(`\n🧪 Testing PageSpeed Insights for: ${url}\n`);

  // Check if API is configured
  const apiInfo = pageSpeedService.getApiInfo();
  console.log(`📊 API Status: ${apiInfo.configured ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`📊 ${apiInfo.quotaInfo}\n`);

  if (!apiInfo.configured) {
    console.error('❌ Error: GOOGLE_PAGESPEED_API_KEY not found in .env file');
    console.log('\nTo use PageSpeed Insights:');
    console.log('1. Get an API key from: https://developers.google.com/speed/docs/insights/v5/get-started');
    console.log('2. Add to .env: GOOGLE_PAGESPEED_API_KEY=your_key_here');
    process.exit(1);
  }

  try {
    console.log('⏳ Fetching PageSpeed data (this may take 30-60 seconds)...\n');

    // Analyze the URL
    const result = await pageSpeedService.analyze(url, {
      mobile: true,
      desktop: true,
    });

    if (result.error) {
      console.error(`❌ Error: ${result.error}`);
      process.exit(1);
    }

    // Display Mobile Results
    if (result.mobile) {
      console.log('📱 MOBILE RESULTS');
      console.log('='.repeat(60));
      console.log(`Performance Score: ${result.mobile.performanceScore}/100`);
      console.log('');

      // Field Data (Real User Metrics)
      if (result.mobile.fieldData) {
        console.log('📊 Field Data (Real User Metrics from CrUX):');
        const { fcp, lcp, fid, cls, inp } = result.mobile.fieldData;
        
        if (fcp) console.log(`  FCP: ${fcp.value}ms (${fcp.category})`);
        if (lcp) console.log(`  LCP: ${lcp.value}ms (${lcp.category})`);
        if (fid) console.log(`  FID: ${fid.value}ms (${fid.category})`);
        if (inp) console.log(`  INP: ${inp.value}ms (${inp.category})`);
        if (cls) console.log(`  CLS: ${(cls.value / 100).toFixed(3)} (${cls.category})`);
        console.log('');
      } else {
        console.log('📊 Field Data: Not available (insufficient real user data)');
        console.log('');
      }

      // Lab Data (Lighthouse)
      console.log('🔬 Lab Data (Lighthouse Metrics):');
      console.log(`  FCP: ${(result.mobile.labData.fcp / 1000).toFixed(1)}s`);
      console.log(`  Speed Index: ${(result.mobile.labData.speedIndex / 1000).toFixed(1)}s`);
      console.log(`  LCP: ${(result.mobile.labData.lcp / 1000).toFixed(1)}s`);
      console.log(`  TTI: ${(result.mobile.labData.tti / 1000).toFixed(1)}s`);
      console.log(`  TBT: ${result.mobile.labData.tbt.toFixed(0)}ms`);
      console.log(`  CLS: ${result.mobile.labData.cls.toFixed(3)}`);
      console.log('');

      // Top Opportunities
      if (result.mobile.opportunities && result.mobile.opportunities.length > 0) {
        console.log('💡 Top Performance Opportunities:');
        result.mobile.opportunities.slice(0, 5).forEach((opp, i) => {
          const savings = (opp.potentialSavings / 1000).toFixed(1);
          console.log(`  ${i + 1}. ${opp.title} (save ${savings}s)`);
        });
        console.log('');
      }
    }

    // Display Desktop Results
    if (result.desktop) {
      console.log('💻 DESKTOP RESULTS');
      console.log('='.repeat(60));
      console.log(`Performance Score: ${result.desktop.performanceScore}/100`);
      console.log('');

      // Lab Data
      console.log('🔬 Lab Data (Lighthouse Metrics):');
      console.log(`  FCP: ${(result.desktop.labData.fcp / 1000).toFixed(1)}s`);
      console.log(`  Speed Index: ${(result.desktop.labData.speedIndex / 1000).toFixed(1)}s`);
      console.log(`  LCP: ${(result.desktop.labData.lcp / 1000).toFixed(1)}s`);
      console.log(`  TTI: ${(result.desktop.labData.tti / 1000).toFixed(1)}s`);
      console.log(`  TBT: ${result.desktop.labData.tbt.toFixed(0)}ms`);
      console.log(`  CLS: ${result.desktop.labData.cls.toFixed(3)}`);
      console.log('');

      // Top Opportunities
      if (result.desktop.opportunities && result.desktop.opportunities.length > 0) {
        console.log('💡 Top Performance Opportunities:');
        result.desktop.opportunities.slice(0, 5).forEach((opp, i) => {
          const savings = (opp.potentialSavings / 1000).toFixed(1);
          console.log(`  ${i + 1}. ${opp.title} (save ${savings}s)`);
        });
        console.log('');
      }
    }

    console.log('✅ PageSpeed test complete!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testPageSpeed().catch(console.error);
