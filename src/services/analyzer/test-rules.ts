// /**
//  * Test script for individual SEO rules
//  * Usage: npx tsx src/services/analyzer/test-rules.ts [rule-name]
//  */

// import type { PageData, SiteContext } from './types.js';

// // Technical Rules
// import { HTTPSCheckRule } from './rules/technical/HTTPSCheckRule.js';
// import { SSLEnabledRule } from './rules/technical/SSLEnabledRule.js';
// import { CanonicalTagRule } from './rules/technical/CanonicalTagRule.js';
// import { NoindexTagRule } from './rules/technical/NoindexTagRule.js';
// import { XMLSitemapRule } from './rules/technical/XMLSitemapRule.js';
// import { CharsetRule } from './rules/technical/CharsetRule.js';
// import { MissingRobotsRule } from './rules/technical/MissingRobotsRule.js';

// // On-Page Rules
// import { TitleTagRule } from './rules/on-page/TitleTagRule.js';
// import { MetaDescriptionRule } from './rules/on-page/MetaDescriptionRule.js';
// import { H1TagRule } from './rules/on-page/H1TagRule.js';
// import { HeadingHierarchyRule } from './rules/on-page/HeadingHierarchyRule.js';
// import { KeywordConsistencyRule } from './rules/on-page/KeywordConsistencyRule.js';
// import { WordCountRule } from './rules/on-page/WordCountRule.js';
// import { ImageAltTextRule } from './rules/on-page/ImageAltTextRule.js';
// import { HreflangRule } from './rules/on-page/HreflangRule.js';
// import { LangAttributeRule } from './rules/on-page/LangAttributeRule.js';
// import { SERPSnippetRule } from './rules/on-page/SERPSnippetRule.js';
// import { FriendlyURLRule } from './rules/on-page/FriendlyURLRule.js';

// // Performance Rules
// import { CoreWebVitalsRule } from './rules/performance/CoreWebVitalsRule.js';
// import { LoadTimeRule } from './rules/performance/LoadTimeRule.js';
// import { FlashUsageRule } from './rules/performance/FlashUsageRule.js';

// // Links Rules
// import { LinkStructureRule } from './rules/links/LinkStructureRule.js';

// // Usability Rules
// import { IFrameUsageRule } from './rules/usability/IFrameUsageRule.js';
// import { EmailPrivacyRule } from './rules/usability/EmailPrivacyRule.js';
// import { DeprecatedTagsRule } from './rules/usability/DeprecatedTagsRule.js';
// import { InlineStylesRule } from './rules/usability/InlineStylesRule.js';

// // Social Rules
// import { FacebookLinkRule } from './rules/social/FacebookLinkRule.js';
// import { FacebookPixelRule } from './rules/social/FacebookPixelRule.js';
// import { TwitterLinkRule } from './rules/social/TwitterLinkRule.js';
// import { InstagramLinkRule } from './rules/social/InstagramLinkRule.js';
// import { LinkedInLinkRule } from './rules/social/LinkedInLinkRule.js';
// import { YouTubeLinkRule } from './rules/social/YouTubeLinkRule.js';
// import { LocalSEORule } from './rules/social/LocalSEORule.js';

// // Mock data generators
// function createMockPageData(overrides: Partial<PageData> = {}): PageData {
//   return {
//     url: 'https://example.com/',
//     title: 'Example Page Title - SEO Guide',
//     description: 'This is a meta description for the example page that explains the content',
//     statusCode: 200,
//     loadTime: 1200,
//     html: '<html lang="en"><body><h1>Main Heading Text Here</h1><p>Content here</p></body></html>',
//     headings: [
//       { level: 1, text: 'Main Heading Text Here' },
//       { level: 2, text: 'Subheading 1' },
//       { level: 3, text: 'Subheading 2' },
//     ],
//     images: [
//       { src: 'https://example.com/image1.jpg', alt: 'Image 1' },
//       { src: 'https://example.com/image2.jpg', alt: 'Image 2' },
//     ],
//     links: [
//       { href: 'https://example.com/about', text: 'About', isInternal: true },
//       { href: 'https://external.com', text: 'External', isInternal: false },
//     ],
//     canonical: 'https://example.com/',
//     robots: 'index, follow',
//     viewport: 'width=device-width, initial-scale=1',
//     charset: 'UTF-8',
//     lang: 'en',
//     langAttr: 'en',
//     wordCount: 600,
//     flashCount: 0,
//     iframeCount: 0,
//     exposedEmails: [],
//     deprecatedTagsCount: 0,
//     inlineStylesCount: 0,
//     ogImage: null,
//     hasSchemaOrg: false,
//     hreflangLinks: [],
//     hreflangLinks: [],
//     lcp: 1800,
//     cls: 0.05,
//     fid: 50,
//     socialLinks: {
//       facebook: false,
//       twitter: false,
//       instagram: false,
//       linkedin: false,
//       youtube: false,
//     },
//     hasFacebookPixel: false,
//     localSeo: {
//       phone: { found: false, number: null, source: null },
//       address: { found: false, text: null, source: null },
//     },
//     ...overrides,
//   };
// }

// function createMockSiteContext(overrides: Partial<SiteContext> = {}): SiteContext {
//   return {
//     baseUrl: 'https://example.com',
//     totalPages: 10,
//     titleMap: new Map(),
//     descriptionMap: new Map(),
//     canonicalMap: new Map(),
//     internalLinkGraph: new Map(),
//     inboundLinkCount: new Map(),
//     hasRobotsTxt: true,
//     robotsTxt: 'User-agent: *\nDisallow: /admin/',
//     robotsDisallowed: new Set(),
//     hasSitemap: true,
//     sitemapUrls: new Set(['https://example.com/']),
//     ...overrides,
//   };
// }

// // Test definitions
// const tests = {
//   // ============= TECHNICAL RULES =============
//   'https-check': {
//     rule: new HTTPSCheckRule(),
//     tests: [
//       {
//         name: '✅ PASS: HTTPS enabled',
//         page: createMockPageData({ url: 'https://example.com/' }),
//         expectIssues: 0,
//         expectPassing: 1,
//       },
//       {
//         name: '❌ FAIL: HTTP only',
//         page: createMockPageData({ url: 'http://example.com/' }),
//         expectIssues: 1,
//         expectPassing: 0,
//       },
//     ],
//   },

//   'ssl-enabled': {
//     rule: new SSLEnabledRule(),
//     tests: [
//       {
//         name: '✅ PASS: SSL enabled',
//         page: createMockPageData({ url: 'https://example.com/' }),
//         expectIssues: 0,
//         expectPassing: 1,
//       },
//     ],
//   },

//   'canonical-tag': {
//     rule: new CanonicalTagRule(),
//     tests: [
//       {
//         name: '✅ PASS: Canonical present',
//         page: createMockPageData({ canonical: 'https://example.com/' }),
//         expectIssues: 0,
//         expectPassing: 1,
//       },
//       {
//         name: '❌ FAIL: Missing canonical',
//         page: createMockPageData({ canonical: null }),
//         expectIssues: 1,
//         expectPassing: 0,
//       },
//     ],
//   },

//   'noindex-tag': {
//     rule: new NoindexTagRule(),
//     tests: [
//       {
//         name: '✅ PASS: Indexable page',
//         page: createMockPageData({ robots: 'index, follow' }),
//         expectIssues: 0,
//         expectPassing: 1,
//       },
//       {
//         name: '❌ FAIL: Noindex on homepage',
//         page: createMockPageData({ url: 'https://example.com/', robots: 'noindex' }),
//         expectIssues: 1,
//         expectPassing: 0,
//       },
//     ],
//   },

//   'xml-sitemap': {
//     rule: new XMLSitemapRule(),
//     tests: [
//       {
//         name: '✅ PASS: Sitemap exists',
//         page: createMockPageData(),
//         context: createMockSiteContext({ hasSitemap: true }),
//         expectIssues: 0,
//         expectPassing: 1,
//       },
//       {
//         name: '❌ FAIL: No sitemap',
//         page: createMockPageData(),
//         context: createMockSiteContext({ hasSitemap: false }),
//         expectIssues: 1,
//         expectPassing: 0,
//       },
//     ],
//   },

//   'charset': {
//     rule: new CharsetRule(),
//     tests: [
//       {
//         name: '✅ PASS: Charset declared',
//         page: createMockPageData({ charset: 'UTF-8' }),
//         expectIssues: 0,
//         expectPassing: 1,
//       },
//       {
//         name: '❌ FAIL: Missing charset',
//         page: createMockPageData({ charset: null }),
//         expectIssues: 1,
//         expectPassing: 0,
//       },
//     ],
//   },

//   'missing-robots': {
//     rule: new MissingRobotsRule(),
//     tests: [
//       {
//         name: '✅ PASS: Robots.txt exists',
//         page: createMockPageData(),
//         context: createMockSiteContext({ hasRobotsTxt: true }),
//         expectIssues: 0,
//         expectPassing: 1,
//       },
//       {
//         name: '❌ FAIL: No robots.txt',
//         page: createMockPageData(),
//         context: createMockSiteContext({ hasRobotsTxt: false }),
//         expectIssues: 1,
//         expectPassing: 0,
//       },
//     ],
//   },

//   // ============= ON-PAGE RULES =============
//   'title-tag': {
//     rule: new TitleTagRule(),
//     tests: [
//       {
//         name: '✅ PASS: Good title',
//         page: createMockPageData({ title: 'SEO Best Practices Guide for Beginners' }),
//         expectIssues: 0,
//         expectPassing: 1,
//       },
//       {
//         name: '❌ FAIL: Missing title',
//         page: createMockPageData({ title: null }),
//         expectIssues: 1,
//         expectPassing: 0,
//       },
//       {
//         name: '❌ FAIL: Title too short',
//         page: createMockPageData({ title: 'Hi' }),
//         expectIssues: 1,
//         expectPassing: 0,
//       },
//       {
//         name: '❌ FAIL: Title too long',
//         page: createMockPageData({ 
//           title: 'This is an extremely long title that exceeds the recommended character limit for SEO and will likely be truncated in search results' 
//         }),
//         expectIssues: 1,
//         expectPassing: 0,
//       },
//     ],
//   },

//   'meta-description': {
//     rule: new MetaDescriptionRule(),
//     tests: [
//       {
//         name: '✅ PASS: Good description',
//         page: createMockPageData({ 
//           description: 'Learn SEO best practices and improve your website ranking with our comprehensive guide.' 
//         }),
//         expectIssues: 0,
//         expectPassing: 1,
//       },
//       {
//         name: '❌ FAIL: Missing description',
//         page: createMockPageData({ description: null }),
//         expectIssues: 1,
//         expectPassing: 0,
//       },
//       {
//         name: '❌ FAIL: Description too short',
//         page: createMockPageData({ description: 'Short desc' }),
//         expectIssues: 1,
//         expectPassing: 0,
//       },
//     ],
//   },

//   'h1-tag': {
//     rule: new H1TagRule(),
//     tests: [
//       {
//         name: '✅ PASS: One good H1',
//         page: createMockPageData({
//           headings: [{ level: 1, text: 'A Proper Main Page Heading' }],
//         }),
//         expectIssues: 0,
//         expectPassing: 1,
//       },
//       {
//         name: '❌ FAIL: Missing H1',
//         page: createMockPageData({ headings: [] }),
//         expectIssues: 1,
//         expectPassing: 0,
//       },
//       {
//         name: '❌ FAIL: Multiple H1s',
//         page: createMockPageData({
//           headings: [
//             { level: 1, text: 'First H1' },
//             { level: 1, text: 'Second H1' },
//           ],
//         }),
//         expectIssues: 1,
//         expectPassing: 0,
//       },
//     ],
//   },

//   'heading-hierarchy': {
//     rule: new HeadingHierarchyRule(),
//     tests: [
//       {
//         name: '✅ PASS: Proper hierarchy',
//         page: createMockPageData({
//           headings: [
//             { level: 1, text: 'H1' },
//             { level: 2, text: 'H2' },
//             { level: 3, text: 'H3' },
//           ],
//         }),
//         expectIssues: 0,
//         expectPassing: 1,
//       },
//       {
//         name: '❌ FAIL: Skipped level',
//         page: createMockPageData({
//           headings: [
//             { level: 1, text: 'H1' },
//             { level: 3, text: 'H3' }, // Skipped H2
//           ],
//         }),
//         expectIssues: 1,
//         expectPassing: 0,
//       },
//     ],
//   },

//   'keyword-consistency': {
//     rule: new KeywordConsistencyRule(),
//     tests: [
//       {
//         name: '✅ PASS: Keywords consistent',
//         page: createMockPageData({
//           title: 'SEO Guide',
//           description: 'Complete SEO guide for beginners',
//           headings: [{ level: 1, text: 'SEO Guide Overview' }],
//         }),
//         expectIssues: 0,
//         expectPassing: 1,
//       },
//     ],
//   },

//   'word-count': {
//     rule: new WordCountRule(),
//     tests: [
//       {
//         name: '✅ PASS: Sufficient content',
//         page: createMockPageData({ wordCount: 600 }),
//         expectIssues: 0,
//         expectPassing: 1,
//       },
//       {
//         name: '❌ FAIL: Thin content',
//         page: createMockPageData({ wordCount: 50 }),
//         expectIssues: 1,
//         expectPassing: 0,
//       },
//     ],
//   },

//   'image-alt-text': {
//     rule: new ImageAltTextRule(),
//     tests: [
//       {
//         name: '✅ PASS: All images have alt',
//         page: createMockPageData({
//           images: [
//             { src: 'img1.jpg', alt: 'Image 1' },
//             { src: 'img2.jpg', alt: 'Image 2' },
//           ],
//         }),
//         expectIssues: 0,
//         expectPassing: 1,
//       },
//       {
//         name: '❌ FAIL: Images missing alt',
//         page: createMockPageData({
//           images: [
//             { src: 'img1.jpg', alt: null },
//             { src: 'img2.jpg', alt: 'Has alt' },
//           ],
//         }),
//         expectIssues: 1,
//         expectPassing: 0,
//       },
//     ],
//   },

//   'hreflang': {
//     rule: new HreflangRule(),
//     tests: [
//       {
//         name: '✅ PASS: Valid hreflang',
//         page: createMockPageData({
//           url: 'https://example.com/',
//           hreflangLinks: [
//             { hreflang: 'en', href: 'https://example.com/' },
//             { hreflang: 'es', href: 'https://example.com/es/' },
//           ],
//         }),
//         expectIssues: 0,
//         expectPassing: 1,
//       },
//     ],
//   },

//   'lang-attribute': {
//     rule: new LangAttributeRule(),
//     tests: [
//       {
//         name: '✅ PASS: Lang attribute set',
//         page: createMockPageData({ langAttr: 'en' }),
//         expectIssues: 0,
//         expectPassing: 1,
//       },
//       {
//         name: '❌ FAIL: Missing lang',
//         page: createMockPageData({ langAttr: null }),
//         expectIssues: 1,
//         expectPassing: 0,
//       },
//     ],
//   },

//   'serp-snippet': {
//     rule: new SERPSnippetRule(),
//     tests: [
//       {
//         name: '✅ PASS: Good SERP preview',
//         page: createMockPageData({
//           title: 'Great SEO Title',
//           description: 'Detailed meta description that provides context',
//         }),
//         expectIssues: 0,
//         expectPassing: 1,
//       },
//     ],
//   },

//   'friendly-url': {
//     rule: new FriendlyURLRule(),
//     tests: [
//       {
//         name: '✅ PASS: Clean URL',
//         page: createMockPageData({ url: 'https://example.com/about-us' }),
//         expectIssues: 0,
//         expectPassing: 1,
//       },
//       {
//         name: '❌ FAIL: URL with parameters',
//         page: createMockPageData({ url: 'https://example.com/page?id=123&ref=abc' }),
//         expectIssues: 1,
//         expectPassing: 0,
//       },
//     ],
//   },

//   // ============= PERFORMANCE RULES =============
//   'core-web-vitals': {
//     rule: new CoreWebVitalsRule(),
//     tests: [
//       {
//         name: '✅ PASS: Good vitals',
//         page: createMockPageData({ lcp: 1500, cls: 0.05, fid: 50 }),
//         expectIssues: 0,
//         expectPassing: 1,
//       },
//       {
//         name: '❌ FAIL: Poor LCP',
//         page: createMockPageData({ lcp: 5000, cls: 0.05, fid: 50 }),
//         expectIssues: 1,
//         expectPassing: 0,
//       },
//     ],
//   },

//   'load-time': {
//     rule: new LoadTimeRule(),
//     tests: [
//       {
//         name: '✅ PASS: Fast load',
//         page: createMockPageData({ loadTime: 1500 }),
//         expectIssues: 0,
//         expectPassing: 1,
//       },
//       {
//         name: '❌ FAIL: Slow load',
//         page: createMockPageData({ loadTime: 5000 }),
//         expectIssues: 1,
//         expectPassing: 0,
//       },
//     ],
//   },

//   'flash-usage': {
//     rule: new FlashUsageRule(),
//     tests: [
//       {
//         name: '✅ PASS: No Flash',
//         page: createMockPageData({ flashCount: 0 }),
//         expectIssues: 0,
//         expectPassing: 1,
//       },
//       {
//         name: '❌ FAIL: Flash detected',
//         page: createMockPageData({ flashCount: 2 }),
//         expectIssues: 1,
//         expectPassing: 0,
//       },
//     ],
//   },

//   // ============= LINKS RULES =============
//   'link-structure': {
//     rule: new LinkStructureRule(),
//     tests: [
//       {
//         name: '✅ PASS: Good link balance',
//         page: createMockPageData({
//           links: [
//             { href: '/page1', text: 'Internal 1', isInternal: true },
//             { href: '/page2', text: 'Internal 2', isInternal: true },
//             { href: 'https://external.com', text: 'External', isInternal: false },
//           ],
//         }),
//         expectIssues: 0,
//         expectPassing: 1,
//       },
//       {
//         name: '❌ FAIL: No links',
//         page: createMockPageData({ links: [] }),
//         expectIssues: 1,
//         expectPassing: 0,
//       },
//     ],
//   },

//   // ============= USABILITY RULES =============
//   'iframe-usage': {
//     rule: new IFrameUsageRule(),
//     tests: [
//       {
//         name: '✅ PASS: No iframes',
//         page: createMockPageData({ iframeCount: 0 }),
//         expectIssues: 0,
//         expectPassing: 1,
//       },
//       {
//         name: '❌ FAIL: Excessive iframes',
//         page: createMockPageData({ iframeCount: 5 }),
//         expectIssues: 1,
//         expectPassing: 0,
//       },
//     ],
//   },

//   'email-privacy': {
//     rule: new EmailPrivacyRule(),
//     tests: [
//       {
//         name: '✅ PASS: No plain emails',
//         page: createMockPageData({ exposedEmails: [] }),
//         expectIssues: 0,
//         expectPassing: 1,
//       },
//       {
//         name: '❌ FAIL: Plain email exposed',
//         page: createMockPageData({ exposedEmails: ['contact@example.com'] }),
//         expectIssues: 1,
//         expectPassing: 0,
//       },
//     ],
//   },

//   'deprecated-tags': {
//     rule: new DeprecatedTagsRule(),
//     tests: [
//       {
//         name: '✅ PASS: Modern HTML',
//         page: createMockPageData({ deprecatedTagsCount: 0 }),
//         expectIssues: 0,
//         expectPassing: 1,
//       },
//       {
//         name: '❌ FAIL: Deprecated tags',
//         page: createMockPageData({ deprecatedTagsCount: 3 }),
//         expectIssues: 1,
//         expectPassing: 0,
//       },
//     ],
//   },

//   'inline-styles': {
//     rule: new InlineStylesRule(),
//     tests: [
//       {
//         name: '✅ PASS: External CSS',
//         page: createMockPageData({ inlineStylesCount: 0 }),
//         expectIssues: 0,
//         expectPassing: 1,
//       },
//       {
//         name: '❌ FAIL: Excessive inline styles',
//         page: createMockPageData({ inlineStylesCount: 25 }),
//         expectIssues: 1,
//         expectPassing: 0,
//       },
//     ],
//   },

//   // ============= SOCIAL RULES =============
//   'facebook-link': {
//     rule: new FacebookLinkRule(),
//     tests: [
//       {
//         name: '✅ PASS: Facebook linked',
//         page: createMockPageData({
//           url: 'https://example.com/',
//           socialLinks: { facebook: true, twitter: false, instagram: false, linkedin: false, youtube: false },
//         }),
//         expectIssues: 0,
//         expectPassing: 1,
//       },
//     ],
//   },

//   'facebook-pixel': {
//     rule: new FacebookPixelRule(),
//     tests: [
//       {
//         name: '✅ PASS: Pixel detected',
//         page: createMockPageData({
//           url: 'https://example.com/',
//           hasFacebookPixel: true,
//         }),
//         expectIssues: 0,
//         expectPassing: 1,
//       },
//     ],
//   },

//   'twitter-link': {
//     rule: new TwitterLinkRule(),
//     tests: [
//       {
//         name: '✅ PASS: Twitter linked',
//         page: createMockPageData({
//           url: 'https://example.com/',
//           socialLinks: { facebook: false, twitter: true, instagram: false, linkedin: false, youtube: false },
//         }),
//         expectIssues: 0,
//         expectPassing: 1,
//       },
//     ],
//   },

//   'instagram-link': {
//     rule: new InstagramLinkRule(),
//     tests: [
//       {
//         name: '✅ PASS: Instagram linked',
//         page: createMockPageData({
//           url: 'https://example.com/',
//           socialLinks: { facebook: false, twitter: false, instagram: true, linkedin: false, youtube: false },
//         }),
//         expectIssues: 0,
//         expectPassing: 1,
//       },
//     ],
//   },

//   'linkedin-link': {
//     rule: new LinkedInLinkRule(),
//     tests: [
//       {
//         name: '✅ PASS: LinkedIn linked',
//         page: createMockPageData({
//           url: 'https://example.com/',
//           socialLinks: { facebook: false, twitter: false, instagram: false, linkedin: true, youtube: false },
//         }),
//         expectIssues: 0,
//         expectPassing: 1,
//       },
//     ],
//   },

//   'youtube-link': {
//     rule: new YouTubeLinkRule(),
//     tests: [
//       {
//         name: '✅ PASS: YouTube linked',
//         page: createMockPageData({
//           url: 'https://example.com/',
//           socialLinks: { facebook: false, twitter: false, instagram: false, linkedin: false, youtube: true },
//         }),
//         expectIssues: 0,
//         expectPassing: 1,
//       },
//     ],
//   },

//   'local-seo': {
//     rule: new LocalSEORule(),
//     tests: [
//       {
//         name: '✅ PASS: Local business info',
//         page: createMockPageData({
//           url: 'https://example.com/',
//           localSeo: {
//             phone: { found: true, number: '+1-555-0100', source: 'body' },
//             address: { found: true, text: '123 Main St', source: 'footer' },
//           },
//         }),
//         expectIssues: 0,
//         expectPassing: 1,
//       },
//     ],
//   },
// };

// // Test runner
// async function runTest(ruleName: string, testCase: any, context?: SiteContext) {
//   const mockContext = context || createMockSiteContext();
  
//   // Check if this is a site-level or page-level rule
//   let result;
//   if (testCase.rule.level === 'site') {
//     // Site-level rules expect an array of pages
//     const pages = Array.isArray(testCase.page) ? testCase.page : [testCase.page];
//     result = testCase.rule.execute(pages, mockContext);
//   } else {
//     // Page-level rules expect a single page
//     result = testCase.rule.execute(testCase.page, mockContext);
//   }
  
//   const issueCount = result.issues.length;
//   const passingCount = result.passingChecks.length;
  
//   const passed = 
//     issueCount === testCase.expectIssues && 
//     passingCount === testCase.expectPassing;
  
//   const status = passed ? '✅ PASS' : '❌ FAIL';
//   console.log(`  ${status} ${testCase.name}`);
  
//   if (!passed) {
//     console.log(`    Expected: ${testCase.expectIssues} issues, ${testCase.expectPassing} passing`);
//     console.log(`    Got: ${issueCount} issues, ${passingCount} passing`);
    
//     if (result.issues.length > 0) {
//       console.log('    Issues:', result.issues.map(i => i.title));
//     }
//     if (result.passingChecks.length > 0) {
//       console.log('    Passing:', result.passingChecks.map(p => p.title));
//     }
//   }
  
//   return passed;
// }

// async function runAllTests(filterRule?: string) {
//   console.log('🧪 Testing SEO Rules\n');
  
//   let totalTests = 0;
//   let passedTests = 0;
//   let failedTests = 0;
  
//   for (const [ruleName, testSuite] of Object.entries(tests)) {
//     // Skip if filtering and doesn't match
//     if (filterRule && ruleName !== filterRule) {
//       continue;
//     }
    
//     console.log(`\n📋 ${testSuite.rule.code} (${ruleName})`);
//     console.log('─'.repeat(60));
    
//     for (const test of testSuite.tests) {
//       totalTests++;
//       const passed = await runTest(ruleName, {
//         ...testSuite,
//         ...test,
//         page: test.page,
//       }, test.context);
      
//       if (passed) {
//         passedTests++;
//       } else {
//         failedTests++;
//       }
//     }
//   }
  
//   console.log('\n' + '═'.repeat(60));
//   console.log(`\n📊 Test Summary:`);
//   console.log(`   Total: ${totalTests}`);
//   console.log(`   ✅ Passed: ${passedTests}`);
//   console.log(`   ❌ Failed: ${failedTests}`);
//   console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);
  
//   process.exit(failedTests > 0 ? 1 : 0);
// }

// // Run tests
// const ruleName = process.argv[2];
// runAllTests(ruleName).catch(console.error);
