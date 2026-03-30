/**
 * Test script for SEOptimizer-style enhancements
 * Tests new rules on a real website
 */

import { SiteAuditCrawler } from './SiteAuditCrawler';
import { SeoAnalyzer } from '../analyzer/SeoAnalyzer';
import { browserPool } from './BrowserPool';

async function testSEOptimizerEnhancements() {
  const testUrl = process.argv[2] || 'https://www.cloudflare.com';
  
  console.log('🧪 Testing SEOptimizer-Style Enhancements');
  console.log(`📍 URL: ${testUrl}`);
  console.log('━'.repeat(60));
  
  try {
    // Crawl the site
    console.log('\n📡 Step 1: Crawling...');
    const crawler = new SiteAuditCrawler();
    const crawlResult = await crawler.crawl(testUrl, {
      mode: 'multi',
      pageLimit: 3,
    });
    const pages = crawlResult.pages;
    console.log(`✅ Crawled ${pages.length} pages`);
    
    // Analyze
    console.log('\n🔍 Step 2: Analyzing with new rules...');
    const analyzer = new SeoAnalyzer();
    const result = await analyzer.analyze(pages, crawlResult.baseUrl);
    
    // Display results
    console.log('\n📊 Step 3: Results');
    console.log('━'.repeat(60));
    console.log(`Overall Score: ${result.overallScore}/100`);
    console.log(`Total Issues: ${result.totalIssues}`);
    console.log(`Critical Issues: ${result.criticalIssues}`);
    
    // Group issues by type
    const newRuleTypes = [
      'keyword_consistency',
      'heading_structure',
      'word_count',
      'link_structure',
      'missing_viewport',
      'viewport_correct',
      'viewport_misconfigured',
      'robots_txt',
      'sitemap',
      'favicon',
      'http2'
    ];
    
    const newRuleIssues = result.issues.filter(issue => 
      newRuleTypes.some(type => issue.type.includes(type))
    );
    
    console.log('\n🆕 New SEOptimizer-Style Checks:');
    console.log('━'.repeat(60));
    
    if (newRuleIssues.length === 0) {
      console.log('⚠️  No new rule checks triggered');
    } else {
      newRuleIssues.forEach(issue => {
        const icon = issue.severity === 'CRITICAL' ? '🔴' :
                     issue.severity === 'HIGH' ? '🟠' :
                     issue.severity === 'MEDIUM' ? '🟡' :
                     issue.severity === 'LOW' ? '🟢' : 'ℹ️';
        
        console.log(`\n${icon} ${issue.title}`);
        console.log(`   Category: ${issue.category}`);
        console.log(`   Severity: ${issue.severity}`);
        console.log(`   ${issue.description}`);
        
        // Display special data
        if (issue.elementSelector) {
          try {
            const data = JSON.parse(issue.elementSelector);
            if (data.keywords) {
              console.log('\n   📝 Top Keywords:');
              data.keywords.slice(0, 5).forEach((kw: any) => {
                const markers = [
                  kw.inTitle ? '📌Title' : '',
                  kw.inMeta ? '📌Meta' : '',
                  kw.inHeadings ? '📌Headers' : ''
                ].filter(Boolean).join(' ');
                console.log(`      "${kw.keyword}" (${kw.frequency}x) ${markers}`);
              });
            }
            if (data.h1 !== undefined) {
              console.log('\n   📊 Heading Distribution:');
              Object.entries(data).forEach(([level, count]) => {
                if (level !== 'totalHeadings' && typeof count === 'number' && count > 0) {
                  console.log(`      ${level.toUpperCase()}: ${count}`);
                }
              });
            }
            if (data.total) {
              console.log('\n   🔗 Link Breakdown:');
              console.log(`      Internal: ${data.internal}`);
              console.log(`      External (follow): ${data.externalFollow}`);
              console.log(`      External (nofollow): ${data.externalNofollow}`);
              console.log(`      External %: ${data.externalPercentage}%`);
            }
          } catch (e) {
            // Skip if not JSON
          }
        }
      });
    }
    
    console.log('\n\n📋 Category Scores:');
    console.log('━'.repeat(60));
    result.categoryScores.forEach(cat => {
      const bar = '█'.repeat(Math.round(cat.score / 5)) + '░'.repeat(20 - Math.round(cat.score / 5));
      console.log(`${cat.category.padEnd(20)} ${bar} ${cat.score}/100 (${cat.issuesFound} issues)`);
    });
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Run test
testSEOptimizerEnhancements()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
