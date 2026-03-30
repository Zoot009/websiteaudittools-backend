import { browserPool } from "../crawler/BrowserPool";
import { SiteAuditCrawler } from "../crawler/SiteAuditCrawler";
import { SeoAnalyzer } from "./SeoAnalyzer";

async function test() {
  // Crawl a page
  const crawler = new SiteAuditCrawler();
  const crawlResult = await crawler.crawl('https://example.com', {
    mode: 'single',
  });

  // Analyze it
  const analyzer = new SeoAnalyzer();
  const analysisResult = await analyzer.analyze(crawlResult.pages, crawlResult.baseUrl);

  console.log('\n📊 ANALYSIS RESULTS:\n');
  console.log(`Overall Score: ${analysisResult.overallScore}/100`);
  console.log(`\nCategory Scores:`);
  for (const cat of analysisResult.categoryScores) {
    console.log(`  ${cat.category}: ${cat.score}/100 (${cat.issuesFound} issues)`);
  }
  console.log(`\nTotal Issues: ${analysisResult.totalIssues}`);
  console.log(`Critical Issues: ${analysisResult.criticalIssues}`);
  
  console.log(`\n🔍 Top 10 Issues:\n`);
  const topIssues = analysisResult.issues
    .sort((a, b) => b.impactScore - a.impactScore)
    .slice(0, 10);
  
  for (const issue of topIssues) {
    console.log(`[${issue.severity}] ${issue.title}`);
    console.log(`  Impact: ${issue.impactScore}/100`);
    console.log(`  ${issue.description}\n`);
  }

  await browserPool.closeAll();
}

test();