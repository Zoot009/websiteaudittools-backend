/**
 * scrape.do fallback for bot-blocked pages.
 * Used automatically when Playwright encounters a 403, Cloudflare ban, or CAPTCHA.
 */
import axios from 'axios';
import { load } from 'cheerio';
import type { PageData } from './SiteAuditCrawler.js';
import { extractLocalSeoData } from './localSeoDetection.js';
import 'dotenv/config'

export async function fetchViaScrapeDo(url: string): Promise<PageData> {
  const apiKey = process.env.SCRAPE_DO_API_KEY;
  if (!apiKey) {
    console.log(apiKey)
    throw new Error('SCRAPE_DO_API_KEY environment variable is not set');
  }

  console.log(`  🌐 scrape.do: fetching ${url}`);
  const startTime = Date.now();

  const response = await axios.get<string>('https://api.scrape.do/', {
    params: {
      token: apiKey,
      url,
    },
    responseType: 'text',
    timeout: 30000,
  });

  const loadTime = Date.now() - startTime;
  const html = response.data;
  const $ = load(html);

  // Title & description
  const title = $('title').text().trim() || null;
  const description = $('meta[name="description"]').attr('content') ?? null;

  // Headings
  const headings: { level: number; text: string }[] = [];
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const level = parseInt((el as any).tagName[1], 10);
    headings.push({ level, text: $(el).text().trim() });
  });

  // Images
  const images: { src: string; alt: string | null }[] = [];
  $('img').each((_, el) => {
    const src = $(el).attr('src');
    if (src) {
      images.push({ src, alt: $(el).attr('alt') ?? null });
    }
  });

  // Links — resolve relative hrefs against the page origin
  const baseOrigin = new URL(url).origin;
  const links: { href: string; text: string; isInternal: boolean }[] = [];
  $('a[href]').each((_, el) => {
    let href = $(el).attr('href') ?? '';
    if (href.startsWith('/')) href = baseOrigin + href;
    links.push({
      href,
      text: $(el).text().trim(),
      isInternal: href.startsWith(baseOrigin),
    });
  });

  // Word count
  const wordCount = ($('body').text() || '')
    .split(/\s+/)
    .filter(w => w.length > 0).length;

  // Meta tags
  const canonical = $('link[rel="canonical"]').attr('href') ?? null;
  const robots = $('meta[name="robots"]').attr('content') ?? null;
  const ogImage = $('meta[property="og:image"]').attr('content') ?? null;
  const hasSchemaOrg = $('script[type="application/ld+json"]').length > 0;

  const localSeo = extractLocalSeoData(html);

  console.log(`  ✅ scrape.do: got ${html.length} bytes in ${loadTime}ms`);

  return {
    url,
    title,
    description,
    statusCode: response.status,
    loadTime,
    html,
    headings,
    images,
    links,
    wordCount,
    canonical,
    robots,
    ogImage,
    hasSchemaOrg,
    lcp: null,
    cls: null,
    fid: null,
    localSeo,
  };
}
