/**
 * Live crawl + analyze test script
 * Crawls a real URL and runs all SEO rules against the result
 *
 * Usage:
 *   npx tsx src/services/analyzer/test-live-crawl.ts https://example.com
 *   npx tsx src/services/analyzer/test-live-crawl.ts https://example.com --mode=multi --pages=5
 */

import { SiteAuditCrawler } from '../crawler/SiteAuditCrawler.js';
import { SeoAnalyzer } from './SeoAnalyzer.js';
import { browserPool } from '../crawler/BrowserPool.js';

// ──────────────────────────────────────────────
// Parse CLI args
// ──────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const url = args.find((a) => a.startsWith('http')) || 'https://example.com';
  const mode = args.includes('--mode=multi') ? 'multi' : 'single';
  const pagesArg = args.find((a) => a.startsWith('--pages='));
  const pageLimit = pagesArg ? parseInt(pagesArg.split('=')[1]!, 10) : 3;
  return { url, mode: mode as 'single' | 'multi', pageLimit };
}

// ──────────────────────────────────────────────
// Formatting helpers
// ──────────────────────────────────────────────
const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '\x1b[31m', // red
  HIGH: '\x1b[33m',     // yellow
  MEDIUM: '\x1b[36m',   // cyan
  LOW: '\x1b[90m',      // dark gray
};
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const DIM = '\x1b[2m';

function severityBadge(s: string) {
  const color = SEVERITY_COLORS[s] || '';
  return `${color}[${s}]${RESET}`;
}

function header(text: string) {
  const line = '─'.repeat(70);
  console.log(`\n${BOLD}${line}${RESET}`);
  console.log(`${BOLD}  ${text}${RESET}`);
  console.log(`${BOLD}${line}${RESET}`);
}

function sectionHeader(text: string) {
  console.log(`\n${BOLD}${text}${RESET}`);
  console.log('─'.repeat(55));
}

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────
async function main() {
  const { url, mode, pageLimit } = parseArgs();

  header(`🔍 Live SEO Audit: ${url}`);
  console.log(`  Mode      : ${mode}`);
  console.log(`  Page limit: ${mode === 'single' ? 1 : pageLimit}`);
  console.log(`  Started   : ${new Date().toISOString()}`);

  // ── Step 1: Crawl ─────────────────────────────
  sectionHeader('🕷  Step 1: Crawling');

  const crawler = new SiteAuditCrawler();
  let crawlResult;

  try {
    crawlResult = await crawler.crawl(url, {
      mode,
      pageLimit,
      timeout: 30000,
    });
  } catch (err) {
    console.error(`\n❌ Crawl failed: ${err}`);
    process.exit(1);
  } finally {
    // Always shut down browser pool cleanly
    await browserPool.closeAll();
  }

  if (crawlResult.pages.length === 0) {
    console.error('\n❌ No pages were crawled. Check the URL or network.');
    process.exit(1);
  }

  console.log(`\n✅ Crawled ${crawlResult.pages.length} page(s)`);

  if (crawlResult.errors.length > 0) {
    console.log(`⚠️  ${crawlResult.errors.length} crawl error(s):`);
    crawlResult.errors.forEach((e) => console.log(`   • ${e}`));
  }

  // ── Step 2: Print crawled data summary ────────
  sectionHeader('📄 Step 2: Crawled Page Data');

  for (const page of crawlResult.pages) {
    console.log(`\n  ${BOLD}${page.url}${RESET}`);
    console.log(`    Status     : ${page.statusCode}`);
    console.log(`    Load time  : ${page.loadTime}ms`);
    console.log(`    Title      : ${page.title ?? DIM + '(missing)' + RESET}`);
    console.log(`    Description: ${page.description ? page.description.substring(0, 80) + '…' : DIM + '(missing)' + RESET}`);
    console.log(`    H1 tags    : ${page.headings.filter((h) => h.level === 1).length}`);
    console.log(`    Images     : ${page.images.length} (${page.images.filter((i) => !i.alt).length} missing alt)`);
    console.log(`    Links      : ${page.links.length} (${page.links.filter((l) => l.isInternal).length} internal)`);
    console.log(`    Word count : ${page.wordCount}`);
    console.log(`    Canonical  : ${page.canonical ?? DIM + '(none)' + RESET}`);
    console.log(`    Lang attr  : ${page.langAttr ?? DIM + '(none)' + RESET}`);
    console.log(`    Charset    : ${page.charset ?? DIM + '(none)' + RESET}`);
    console.log(`    Robots     : ${page.robots ?? DIM + '(none)' + RESET}`);

    if (page.lcp !== null && page.lcp !== undefined) {
      console.log(`    LCP        : ${Math.round(page.lcp)}ms`);
    }
    if (page.cls !== null && page.cls !== undefined) {
      console.log(`    CLS        : ${page.cls.toFixed(3)}`);
    }

    const socials = page.socialLinks;
    if (socials) {
      const found = Object.entries(socials)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(', ');
      console.log(`    Social     : ${found || DIM + '(none detected)' + RESET}`);
    }
  }

  // ── Step 3: Run analyzer ──────────────────────
  sectionHeader('🔬 Step 3: Running SEO Rules');

  const analyzer = new SeoAnalyzer();
  const result = await analyzer.analyze(crawlResult.pages, crawlResult.baseUrl);

  // ── Step 4: Print results ─────────────────────
  sectionHeader('📊 Step 4: Results');

  // Overall score
  const scoreColor =
    result.overallScore >= 80 ? GREEN :
    result.overallScore >= 60 ? '\x1b[33m' : '\x1b[31m';
  console.log(`\n  ${BOLD}Overall Score: ${scoreColor}${result.overallScore}/100${RESET}`);
  console.log(`  Total Issues : ${result.totalIssues}`);
  console.log(`  Passing      : ${result.passingChecks.length}`);

  // Category scores
  console.log(`\n  ${BOLD}Category Scores:${RESET}`);
  for (const cat of result.categoryScores) {
    const bar = '█'.repeat(Math.round(cat.score / 5)) + '░'.repeat(20 - Math.round(cat.score / 5));
    const color = cat.score >= 80 ? GREEN : cat.score >= 60 ? '\x1b[33m' : '\x1b[31m';
    console.log(`    ${cat.category.padEnd(16)} ${color}${String(cat.score).padStart(3)}${RESET}  ${DIM}${bar}${RESET}  ${cat.issueCount} issue(s)`);
  }

  // Issues by severity
  if (result.issues.length > 0) {
    sectionHeader('❌ Issues Found');

    const bySeverity: Record<string, typeof result.issues> = {
      CRITICAL: [],
      HIGH: [],
      MEDIUM: [],
      LOW: [],
    };
    for (const issue of result.issues) {
      bySeverity[issue.severity]?.push(issue);
    }

    for (const [severity, issues] of Object.entries(bySeverity)) {
      if (issues.length === 0) continue;
      console.log(`\n  ${severityBadge(severity)} (${issues.length})`);
      for (const issue of issues) {
        console.log(`    • ${BOLD}${issue.title}${RESET}`);
        console.log(`      ${DIM}${issue.description.substring(0, 120)}${issue.description.length > 120 ? '…' : ''}${RESET}`);
        if (issue.pageUrl) {
          console.log(`      ${DIM}Page: ${issue.pageUrl}${RESET}`);
        }
      }
    }
  }

  // Passing checks
  if (result.passingChecks.length > 0) {
    sectionHeader('✅ Passing Checks');
    for (const check of result.passingChecks) {
      console.log(`  ${GREEN}✓${RESET} ${check.title}${check.pageUrl ? DIM + '  (' + check.pageUrl + ')' + RESET : ''}`);
    }
  }

  // ── Step 5: Rule coverage summary ─────────────
  sectionHeader('🧪 Step 5: Rule Coverage');

  const ruleCodesWithIssues = new Set(result.issues.map((i) => i.type));
  const ruleCodesWithPassing = new Set(result.passingChecks.map((p) => p.code));
  const allRuleCodes = new Set([...ruleCodesWithIssues, ...ruleCodesWithPassing]);

  console.log(`  Rules triggered       : ${allRuleCodes.size}`);
  console.log(`  Rules with issues     : ${ruleCodesWithIssues.size}`);
  console.log(`  Rules passing cleanly : ${ruleCodesWithPassing.size}`);

  // Final summary
  header('🏁 Audit Complete');
  console.log(`  URL            : ${url}`);
  console.log(`  Pages crawled  : ${crawlResult.pages.length}`);
  console.log(`  Overall score  : ${result.overallScore}/100`);
  console.log(`  Issues found   : ${result.totalIssues}`);
  console.log(`  Passing checks : ${result.passingChecks.length}`);
  console.log(`  Finished       : ${new Date().toISOString()}\n`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
