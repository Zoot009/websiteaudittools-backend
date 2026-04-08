import { browserPool } from "./BrowserPool";
import { SiteAuditCrawler } from "./SiteAuditCrawler";

async function test() {
  const crawler = new SiteAuditCrawler();

  // Test single page
  console.log('\n📄 Testing SINGLE page crawl...\n');
  const singleResult = await crawler.crawl('https://dental.com', {
    mode: 'single',
  });
  console.log(JSON.stringify(singleResult, null, 2));

  // Test multi-page
  console.log('\n\n📚 Testing MULTI page crawl...\n');
  const multiResult = await crawler.crawl('https://dental.com', {
    mode: 'multi',
    pageLimit: 5,
  });
  console.log(`Pages crawled: ${multiResult.pagesAnalyzed}`);

  // Cleanup
  await browserPool.closeAll();
}

test();