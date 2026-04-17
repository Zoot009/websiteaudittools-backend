/**
 * SEO Crawler & Rules Test Script
 *
 * Usage:
 *   npx tsx src/services/analyzer/test/test.ts <url>
 *   npx tsx src/services/analyzer/test/test.ts https://example.com
 *   npx tsx src/services/analyzer/test/test.ts https://example.com --multi
 */

import 'dotenv/config';
import { SiteAuditCrawler } from '../../crawler/SiteAuditCrawler.js';
import { browserPool } from '../../crawler/BrowserPool.js';
import { SeoAnalyzer } from '../SeoAnalyzer.js';

// ── ANSI colours ───────────────────────────────────────────────
const R   = '\x1b[0m';   // reset
const B   = '\x1b[1m';   // bold
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const GRN = '\x1b[32m';
const YEL = '\x1b[33m';
const CYA = '\x1b[36m';
const MAG = '\x1b[35m';

const BOX_WIDTH = 64; // visible character width (excluding border chars)

/** Strip ANSI escape codes to get the real visible length of a string */
function visibleLen(s: string): number {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, '').length;
}

/** Pad a string to a target visible width (accounts for ANSI codes) */
function padToVisible(s: string, width: number, char = ' '): string {
  const len = visibleLen(s);
  return len >= width ? s : s + char.repeat(width - len);
}

function hr(char = '─', width = BOX_WIDTH) { return char.repeat(width); }

/** Print a box line: ║ <content padded to BOX_WIDTH> ║ */
function boxLine(content: string) {
  console.log('║ ' + padToVisible(content, BOX_WIDTH - 2) + ' ║');
}

// ── Entry point ────────────────────────────────────────────────
const args = process.argv.slice(2);
const url  = args.find(a => !a.startsWith('--'));
const mode = args.includes('--multi') ? 'multi' : 'single';

if (!url) {
  console.error(`${RED}Error:${R} please provide a URL.\n`);
  console.error(`  Usage: npx tsx src/services/analyzer/test/test.ts <url> [--multi]\n`);
  process.exit(1);
}

async function run() {
  console.log('\n');
  console.log('╔' + hr('═') + '╗');
  boxLine(`🚀  SEO CRAWLER + RULES TEST`);
  console.log('╚' + hr('═') + '╝');
  console.log(`\n${B}URL :${R}  ${url}`);
  console.log(`${B}Mode:${R}  ${mode}`);
  console.log(`${B}Time:${R}  ${new Date().toLocaleTimeString()}`);
  console.log(hr());

  const crawler   = new SiteAuditCrawler();
  const startTime = Date.now();

  try {
    // ── 1. CRAWL ─────────────────────────────────────────────
    console.log(`\n${CYA}${B}[1/2] Crawling...${R}`);
    const result = await crawler.crawl(url!, {
      mode,
      pageLimit: mode === 'multi' ? 10 : 1,
      timeout: 30000,
    });

    const crawlMs = Date.now() - startTime;
    console.log(`   ${GRN}✓${R} Done in ${(crawlMs / 1000).toFixed(1)}s`);
    console.log(`   Pages crawled : ${B}${result.pagesAnalyzed}${R}`);
    console.log(`   Crawl errors  : ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log(`\n${YEL}Crawl errors:${R}`);
      result.errors.forEach((e, i) => console.log(`   ${i + 1}. ${e}`));
    }

    // ── Per-page raw data summary ─────────────────────────────
    console.log(`\n${B}Page Data Summary${R}`);
    console.log(hr());
    for (const page of result.pages) {
      console.log(`\n${B}${page.url}${R}`);
      console.log(`   Status         : ${page.statusCode}`);
      console.log(`   Load time      : ${page.loadTime}ms`);
      console.log(`   Title          : ${page.title || `${DIM}(none)${R}`}`);
      console.log(`   Description    : ${
        page.description
          ? page.description.substring(0, 80) + (page.description.length > 80 ? '…' : '')
          : `${DIM}(none)${R}`
      }`);
      console.log(`   Word count     : ${page.wordCount}`);
      console.log(`   Canonical      : ${page.canonical || `${DIM}(none)${R}`}`);
      console.log(`   Robots meta    : ${page.robots   || `${DIM}(none)${R}`}`);
      console.log(`   Lang attr      : ${page.langAttr  || `${DIM}(none)${R}`}`);
      console.log(`   HTTPS          : ${page.isHttps ? `${GRN}✓${R}` : `${RED}✗${R}`}`);
      console.log(`   Schema.org     : ${
        page.hasSchemaOrg
          ? `${GRN}✓ (${page.schemas?.length ?? 0} schema(s))${R}`
          : `${RED}✗${R}`
      }`);
      console.log(`   Headings       : ${page.headings.length}  (H1: ${page.headings.filter(h => h.level === 1).length})`);
      console.log(`   Images         : ${page.images.length}  (missing alt: ${page.images.filter(i => !i.alt || i.alt.trim() === '').length})`);
      console.log(`   Links          : ${page.links.length}  (internal: ${page.links.filter(l => l.isInternal).length})`);

      const vitals: string[] = [];
      if (page.lcp != null) vitals.push(`LCP ${page.lcp.toFixed(0)}ms`);
      if (page.cls != null) vitals.push(`CLS ${page.cls.toFixed(3)}`);
      if (page.fid != null) vitals.push(`FID ${page.fid.toFixed(0)}ms`);
      if (vitals.length > 0) console.log(`   Core Web Vitals: ${vitals.join('  │  ')}`);
    }

    // ── 2. ANALYSIS ──────────────────────────────────────────
    console.log(`\n${CYA}${B}[2/2] Running all SEO rules...${R}`);
    const analyzeStart = Date.now();
    const analyzer     = new SeoAnalyzer();
    const analysis     = await analyzer.analyze(result.pages, result.baseUrl);
    const analyzeMs    = Date.now() - analyzeStart;
    console.log(`   ${GRN}✓${R} Done in ${(analyzeMs / 1000).toFixed(1)}s`);

    // ── Score ─────────────────────────────────────────────────
    const scoreColor =
      analysis.overallScore >= 80 ? GRN :
      analysis.overallScore >= 60 ? YEL : RED;

    const totalRules   = analysis.issues.length + analysis.passingChecks.length;
    const scoreContent = `${B}Overall Score : ${scoreColor}${analysis.overallScore} / 100${R}`;
    const issueContent = `Issues: ${analysis.totalIssues}  │  Passing: ${analysis.passingChecks.length}  │  Rules run: ${totalRules}`;

    console.log('\n╔' + hr('═') + '╗');
    boxLine(scoreContent);
    boxLine(issueContent);
    console.log('╚' + hr('═') + '╝');

    // ── Category scores ───────────────────────────────────────
    console.log(`\n${B}Category Scores${R}`);
    console.log(hr());
    for (const cat of analysis.categoryScores) {
      const c   = cat.score >= 80 ? GRN : cat.score >= 60 ? YEL : RED;
      const bar = '█'.repeat(Math.round(cat.score / 5));
      const pad = cat.category.padEnd(18);
      console.log(`   ${pad} ${c}${String(cat.score).padStart(3)}${R}  ${DIM}${bar}${R}  (${cat.issueCount} issue${cat.issueCount !== 1 ? 's' : ''})`);
    }

    // ── Passing checks ────────────────────────────────────────
    if (analysis.passingChecks.length > 0) {
      console.log(`\n${GRN}${B}✓ Passing Checks (${analysis.passingChecks.length})${R}`);
      console.log(hr());
      for (const p of analysis.passingChecks) {
        const page = p.pageUrl ? `  ${DIM}[${p.pageUrl}]${R}` : '';
        console.log(`   ${GRN}✓${R} ${B}${p.title}${R}${page}`);
        console.log(`     ${DIM}${p.description}${R}`);
      }
    }

    // ── Issues grouped by severity ────────────────────────────
    const severities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;
    const sevColor: Record<string, string> = {
      CRITICAL : RED,
      HIGH     : YEL,
      MEDIUM   : MAG,
      LOW      : DIM,
    };

    for (const sev of severities) {
      const issues = analysis.issues.filter(i => i.severity === sev);
      if (issues.length === 0) continue;
      const color  = sevColor[sev];
      const indent = ' '.repeat(sev.length + 3);
      console.log(`\n${color}${B}${sev} Issues (${issues.length})${R}`);
      console.log(hr());
      for (const issue of issues) {
        const page = issue.pageUrl ? `  ${DIM}[${issue.pageUrl}]${R}` : '';
        console.log(`   ${color}[${sev}]${R} ${B}${issue.title}${R}${page}`);
        const desc = issue.description.length > 120
          ? issue.description.substring(0, 117) + '…'
          : issue.description;
        console.log(`   ${indent}${DIM}${desc}${R}`);
        if (issue.recommendation) {
          const rec = issue.recommendation.length > 120
            ? issue.recommendation.substring(0, 117) + '…'
            : issue.recommendation;
          console.log(`   ${indent}${GRN}→ ${rec}${R}`);
        }
      }
    }

    // ── Heading frequency ─────────────────────────────────────
    if (analysis.pageHeadings.length > 0) {
      console.log(`\n${B}Heading Frequency${R}`);
      console.log(hr());
      for (const ps of analysis.pageHeadings) {
        console.log(`\n   ${B}${ps.pageUrl}${R}`);
        console.log(`   ${'TAG'.padEnd(6)} ${'COUNT'.padEnd(7)} VALUES`);
        console.log(`   ${hr('─', 56)}`);
        for (const h of ps.frequency) {
          if (h.count === 0) {
            console.log(`   ${h.tag.padEnd(6)} ${'0'.padStart(3)}    ${DIM}(none)${R}`);
          } else {
            const bar = '█'.repeat(Math.min(h.count, 18));
            console.log(`   ${h.tag.padEnd(6)} ${String(h.count).padStart(3)}    ${DIM}${bar}${R}`);
            h.values.slice(0, 4).forEach(v => {
              const t = v.length > 60 ? v.substring(0, 57) + '…' : v;
              console.log(`          ${DIM}→ ${t}${R}`);
            });
            if (h.values.length > 4) {
              console.log(`          ${DIM}  … and ${h.values.length - 4} more${R}`);
            }
          }
        }
      }
    }

    // ── Keyword consistency ───────────────────────────────────
    if (analysis.keywordConsistency.length > 0) {
      console.log(`\n${B}Keyword Consistency${R}`);
      console.log(hr());

      const printTable = (
        label   : string,
        entries : Array<{ keyword: string; inTitle: boolean; inMetaDescription: boolean; inHeadingTags: boolean; pageFrequency: number }>,
        padEnd  : number,
      ) => {
        if (entries.length === 0) return;
        console.log(`\n   ${B}${label}${R}`);
        console.log(`   ${'KEYWORD'.padEnd(padEnd)} TITLE  META   H-TAGS  FREQ`);
        console.log(`   ${hr('─', 52)}`);
        for (const e of entries) {
          const t   = e.inTitle           ? `${GRN}✓${R}` : `${RED}✗${R}`;
          const m   = e.inMetaDescription ? `${GRN}✓${R}` : `${RED}✗${R}`;
          const h   = e.inHeadingTags     ? `${GRN}✓${R}` : `${RED}✗${R}`;
          const bar = '█'.repeat(Math.min(e.pageFrequency, 18));
          // pad keyword to visible width (no ANSI in keyword itself)
          console.log(`   ${e.keyword.padEnd(padEnd)} ${t}      ${m}      ${h}      ${String(e.pageFrequency).padStart(3)}  ${DIM}${bar}${R}`);
        }
      };

      for (const kc of analysis.keywordConsistency) {
        const icon = kc.passed ? `${GRN}✓${R}` : `${RED}✗${R}`;
        console.log(`\n   ${icon} ${B}${kc.pageUrl}${R}  ${DIM}${kc.message}${R}`);
        printTable('Individual Keywords', kc.keywords, 22);
        printTable('Phrases (2-word)',    kc.phrases,  22);
      }
    }

    // ── Footer ────────────────────────────────────────────────
    const totalMs  = Date.now() - startTime;
    const doneText = `✨  DONE  —  total time: ${(totalMs / 1000).toFixed(1)}s`;
    console.log('\n╔' + hr('═') + '╗');
    boxLine(doneText);
    console.log('╚' + hr('═') + '╝\n');

  } catch (err: any) {
    console.error(`\n${RED}${B}Fatal error:${R} ${err.message}`);
    if (err.stack) console.error(`${DIM}${err.stack}${R}`);
    process.exitCode = 1;
  } finally {
    await browserPool.closeAll();
  }
}

run();
