import { SeoAnalyzer } from "../analyzer/SeoAnalyzer";
import { browserPool } from "../crawler/BrowserPool";
import { SiteAuditCrawler } from "../crawler/SiteAuditCrawler";
import { RecommendationGenerator } from "./RecommendatonGenerator";

async function test() {
  // Crawl
  const crawler = new SiteAuditCrawler();
  const crawlResult = await crawler.crawl('https://example.com', { mode: 'single' });

  // Analyze
  const analyzer = new SeoAnalyzer();
  const analysisResult = await analyzer.analyze(crawlResult.pages, crawlResult.baseUrl);

  // Generate recommendations
  const generator = new RecommendationGenerator();
  const recommendations = await generator.generateRecommendations(analysisResult.issues);

  console.log(`\n💡 TOP 5 RECOMMENDATIONS:\n`);
  for (const rec of recommendations.slice(0, 5)) {
    console.log(`[Priority ${rec.priority}] ${rec.title}`);
    console.log(`  Difficulty: ${rec.difficulty}`);
    console.log(`  Est. Time: ${rec.estimatedTimeMinutes} minutes`);
    console.log(`  Steps: ${rec.steps.length}`);
    console.log('');
  }

  await browserPool.closeAll();
}

test();