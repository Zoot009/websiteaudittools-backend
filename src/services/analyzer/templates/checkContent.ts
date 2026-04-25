/**
 * Educational content templates for SEO checks
 * 
 * Each rule can import and use these templates to provide rich educational content
 * matching the SEOptimer pattern of what/why/how + time estimates + guides
 */

import type { RecommendationContent } from '../types';

/**
 * TECHNICAL CHECKS
 */

export const HTTPS_CHECK_CONTENT: RecommendationContent = {
  what: 'HTTPS (Hypertext Transfer Protocol Secure) is the secure version of HTTP, which encrypts data between your website and visitors. It ensures that sensitive information like passwords and credit cards are transmitted securely.',
  why: 'HTTPS is a confirmed ranking signal by Google. Sites without HTTPS are marked as "Not Secure" in browsers, which can erode trust and increase bounce rates. Search engines prioritize secure sites in rankings.',
  how: 'Purchase an SSL certificate from your hosting provider or use free options like Let\'s Encrypt. Install the certificate on your server and configure your site to redirect all HTTP traffic to HTTPS. Most modern hosting platforms (Cloudflare, Vercel, Netlify) provide automatic HTTPS.',
  timeEstimate: '2 hours',
  moreInfoUrl: '/blog/https-ssl-guide',
  bestPracticesUrl: '/blog/https-ssl-guide#best-practices',
  platformGuides: {
    wordpress: '/blog/wordpress-https-setup',
    shopify: '/blog/shopify-ssl-guide',
    wix: '/blog/wix-ssl-guide'
  }
};

export const SSL_CERTIFICATE_CONTENT: RecommendationContent = {
  what: 'SSL (Secure Sockets Layer) is a security technology that creates an encrypted link between a web server and a browser. An SSL certificate is required to enable HTTPS on your website.',
  why: 'SSL is essential for protecting user data and building trust. Google has made SSL a ranking factor, and browsers now warn users when visiting non-SSL sites. Without SSL, your site will show "Not Secure" warnings that severely impact credibility.',
  how: 'Obtain an SSL certificate from your hosting provider or certificate authority (CA). Free certificates are available through Let\'s Encrypt. Most modern hosting platforms offer one-click SSL installation. After installation, ensure all pages redirect from HTTP to HTTPS.',
  timeEstimate: '2 hours',
  moreInfoUrl: '/blog/ssl-certificate',
  platformGuides: {
    wordpress: '/blog/ssl-certificate#wordpress',
    shopify: '/blog/ssl-certificate#shopify',
    wix: '/blog/ssl-certificate#wix'
  }
};

export const CANONICAL_TAG_CONTENT: RecommendationContent = {
  what: 'The Canonical Tag is an HTML element that tells search engines which version of a URL is the primary one to index. It prevents duplicate content issues when the same content is accessible through multiple URLs.',
  why: 'Without canonical tags, search engines may index multiple versions of the same page (www vs non-www, HTTP vs HTTPS, trailing slash variations), diluting your ranking power. Google recommends all pages specify a canonical URL.',
  how: 'Add a <link rel="canonical" href="URL"> tag in the <head> section of each page, pointing to the preferred URL. Most CMS platforms provide settings to automatically generate canonical tags. For custom sites, implement this in your template system.',
  timeEstimate: '15 minutes',
  moreInfoUrl: '/blog/canonical-url',
  bestPracticesUrl: '/blog/canonical-url#best-practices'
};

export const ROBOTS_TXT_CONTENT: RecommendationContent = {
  what: 'Robots.txt is a text file placed at your site\'s root that tells search engine crawlers which pages they should and shouldn\'t access. It\'s essential for controlling how search engines crawl your site.',
  why: 'A properly configured robots.txt helps search engines crawl your site efficiently, prevents crawling of duplicate or low-value pages, and can help with crawl budget optimization for larger sites.',
  how: 'Create a robots.txt file in your site\'s root directory (yourdomain.com/robots.txt). Start with allowing all: "User-agent: * / Allow: /". Add Disallow directives for admin areas, private content, or duplicate pages. Include your sitemap URL: "Sitemap: https://yourdomain.com/sitemap.xml".',
  timeEstimate: '30 minutes',
  moreInfoUrl: '/blog/robots-txt-guide',
  bestPracticesUrl: '/blog/robots-txt-guide#best-practices'
};

export const SITEMAP_CONTENT: RecommendationContent = {
  what: 'An XML sitemap is a file that lists all important pages on your website, helping search engines discover and crawl your content more efficiently. It acts as a roadmap of your site structure.',
  why: 'Sitemaps help search engines find and index all your important pages, especially for new sites, large sites, or sites with pages that aren\'t well-linked internally. While not a direct ranking factor, proper indexation is fundamental to SEO success.',
  how: 'Generate an XML sitemap using your CMS (WordPress: Yoast/RankMath, Shopify: automatic) or sitemap generator tools. Save it as sitemap.xml in your root directory. Submit it to Google Search Console and Bing Webmaster Tools. Update it regularly when adding new content.',
  timeEstimate: '30 minutes',
  moreInfoUrl: '/blog/xml-sitemap',
  bestPracticesUrl: '/blog/xml-sitemap#best-practices',
  platformGuides: {
    wordpress: '/blog/wordpress-sitemap-guide',
    shopify: '/blog/shopify-sitemap-guide'
  }
};

export const CHARSET_CONTENT: RecommendationContent = {
  what: 'Character encoding (charset) tells browsers how to interpret text characters on your page. UTF-8 is the universal standard that supports all languages and special characters.',
  why: 'Incorrect or missing charset declarations can cause text to display incorrectly, especially for non-English content. UTF-8 is recommended by W3C and supports international SEO efforts.',
  how: 'Add <meta charset="UTF-8"> in the <head> section of your HTML, preferably as the first meta tag. Most modern frameworks and CMS platforms include this by default.',
  timeEstimate: '5 minutes',
  moreInfoUrl: '/blog/character-encoding'
};

export const NOINDEX_TAG_CONTENT: RecommendationContent = {
  what: 'The noindex tag is a meta robots directive that tells search engines not to index a specific page. It prevents the page from appearing in search results.',
  why: 'Accidentally leaving noindex tags on important pages can devastate your SEO by removing them from search engine indexes. This is a critical issue that must be fixed immediately for pages you want to rank.',
  how: 'Remove or modify the <meta name="robots" content="noindex"> tag from your page\'s <head> section. Check your CMS settings to ensure indexing is enabled. For WordPress, ensure "Discourage search engines" is unchecked in Settings > Reading.',
  timeEstimate: '15 minutes',
  moreInfoUrl: '/blog/noindex-tag'
};

export const HTTP2_CONTENT: RecommendationContent = {
  what: 'HTTP/2 is the second major version of the HTTP protocol. It offers significant performance improvements over HTTP/1.1 through features like multiplexing, header compression, and server push.',
  why: 'HTTP/2 can dramatically improve page load times, especially for pages with many resources. Faster load times improve user experience and are a confirmed ranking factor. Most modern browsers require HTTPS for HTTP/2.',
  how: 'Check if your hosting provider or CDN supports HTTP/2 (most modern hosts do). Ensure HTTPS is enabled first (HTTP/2 requires SSL). For custom servers, upgrade web server software (Apache 2.4.17+ or Nginx 1.9.5+) and enable HTTP/2 in configuration.',
  timeEstimate: '1 hour',
  moreInfoUrl: '/blog/http2-guide'
};

/**
 * ON-PAGE CHECKS
 */

export const TITLE_TAG_CONTENT: RecommendationContent = {
  what: 'The Title Tag is an HTML element that specifies the title of a web page. It appears in search engine results, browser tabs, and when pages are shared on social media. It\'s one of the most important on-page SEO elements.',
  why: 'Title tags are a primary ranking factor. They tell search engines and users what your page is about. Well-optimized titles with target keywords can significantly improve click-through rates from search results.',
  how: 'Add a <title> tag in your page\'s <head> section. Keep it between 50-60 characters to avoid truncation in search results. Include your primary keyword naturally, preferably near the beginning. Make it compelling to encourage clicks. Format: "Primary Keyword - Secondary Keyword | Brand Name".',
  timeEstimate: '15 minutes',
  moreInfoUrl: '/blog/title-tag',
  bestPracticesUrl: '/blog/title-tag#best-practices',
  platformGuides: {
    wordpress: '/blog/wordpress-page-title',
    shopify: '/blog/shopify-title-meta',
    wix: '/blog/wix-title-meta'
  }
};

export const META_DESCRIPTION_CONTENT: RecommendationContent = {
  what: 'Meta Description is an HTML attribute that provides a brief summary of a web page\'s content. While not a direct ranking factor, it appears in search results and heavily influences click-through rates.',
  why: 'A compelling meta description can significantly improve your click-through rate from search results, which indirectly affects rankings. It\'s your chance to advertise your content directly in search results.',
  how: 'Add a <meta name="description" content="..."> tag in your page\'s <head>. Keep it between 120-160 characters to avoid truncation. Include target keywords naturally and write compelling copy that encourages clicks. Focus on benefits and value proposition.',
  timeEstimate: '30 minutes',
  moreInfoUrl: '/blog/meta-description',
  bestPracticesUrl: '/blog/meta-description#best-practices',
  platformGuides: {
    wordpress: '/blog/wordpress-meta-description',
    shopify: '/blog/shopify-title-meta',
    wix: '/blog/wix-title-meta'
  }
};

export const H1_TAG_CONTENT: RecommendationContent = {
  what: 'The H1 tag is the main heading HTML element on a page. It should clearly describe the page\'s primary topic and is one of the most important on-page SEO elements after the title tag.',
  why: 'H1 tags help search engines understand your page\'s main topic and keyword focus. Each page should have exactly one H1 that includes your primary target keyword. It also helps users quickly understand what the page is about.',
  how: 'Wrap your main page heading in <h1> tags. Use only one H1 per page. Include your primary keyword naturally. Make it descriptive and compelling for users. Place it near the top of your content, typically as the first visible heading.',
  timeEstimate: '30 minutes',
  moreInfoUrl: '/blog/h1-html-tag',
  bestPracticesUrl: '/blog/header-tags#best-practices',
  platformGuides: {
    wordpress: '/blog/header-tags#wordpress',
    shopify: '/blog/header-tags#shopify',
    wix: '/blog/header-tags#wix'
  }
};

export const HEADING_HIERARCHY_CONTENT: RecommendationContent = {
  what: 'Heading hierarchy refers to the proper use of HTML heading tags (H1-H6) in a logical, nested structure. It creates a content outline that search engines and assistive technologies use to understand page structure.',
  why: 'Proper heading hierarchy helps search engines understand your content organization and improves accessibility for screen reader users. It also enhances the user experience by making content scannable.',
  how: 'Use headings in order: H1 for main title, H2 for major sections, H3 for subsections under H2, etc. Never skip levels (e.g., don\'t jump from H1 to H3). Include relevant keywords in headings naturally. Aim for at least 2-3 heading levels on content pages.',
  timeEstimate: '30 minutes',
  moreInfoUrl: '/blog/header-tags',
  bestPracticesUrl: '/blog/header-tags#best-practices'
};

export const KEYWORD_CONSISTENCY_CONTENT: RecommendationContent = {
  what: 'Keyword consistency measures how well your target keywords are distributed across important page elements (title, meta description, headings, body content). It signals topical relevance to search engines.',
  why: 'Consistent use of keywords throughout your page helps search engines understand what you want to rank for. However, keywords should be used naturally - keyword stuffing is penalized. The goal is natural, contextual usage.',
  how: 'Identify your primary and secondary keywords. Include the primary keyword in: title tag, H1, meta description, first paragraph, and naturally throughout content. Use semantic variations and related terms. Aim for 1-2% keyword density (natural usage will achieve this).',
  timeEstimate: '60 minutes',
  moreInfoUrl: '/blog/keyword-consistency',
  bestPracticesUrl: '/blog/keyword-optimization'
};

export const IMAGE_ALT_CONTENT: RecommendationContent = {
  what: 'Alt text (alternative text) is an HTML attribute that describes what an image shows. It appears when images fail to load and is read by screen readers for visually impaired users.',
  why: 'Alt text is crucial for accessibility and image SEO. Search engines can\'t "see" images, so they rely on alt text to understand image content. It also helps images rank in Google Image Search, driving additional traffic.',
  how: 'Add descriptive alt text to all meaningful images using the alt attribute: <img src="image.jpg" alt="descriptive text">. Describe what the image shows, include relevant keywords naturally, keep it concise (125 characters or less). Skip alt text for purely decorative images (use alt="").',
  timeEstimate: '60 minutes',
  moreInfoUrl: '/blog/alt-attribute',
  bestPracticesUrl: '/blog/alt-attribute#best-practices'
};

export const HREFLANG_CONTENT: RecommendationContent = {
  what: 'Hreflang is an HTML attribute that tells search engines which language and regional version of a page to show to users in different countries. It prevents duplicate content issues for multilingual sites.',
  why: 'For sites with multiple language or regional versions, hreflang ensures users see the correct version in search results. Without it, search engines may show the wrong language version or treat translations as duplicate content.',
  how: 'Add <link rel="alternate" hreflang="LANGUAGE-REGION" href="URL"> tags in the <head> for each language version. Include self-referencing hreflang. Use correct language-region codes (en-US, es-ES, etc.). Implement consistently across all language versions.',
  timeEstimate: '1 hour',
  moreInfoUrl: '/blog/hreflang',
  bestPracticesUrl: '/blog/hreflang#implementation'
};

export const LANG_ATTRIBUTE_CONTENT: RecommendationContent = {
  what: 'The lang attribute in the HTML tag declares the primary language of a page. It helps browsers and assistive technologies properly render and interpret content.',
  why: 'The lang attribute improves accessibility for screen readers and helps search engines return language-specific results. It\'s a simple attribute that provides important context about your content.',
  how: 'Add lang attribute to your <html> tag: <html lang="en"> for English, <html lang="es"> for Spanish, etc. Use correct ISO 639-1 language codes. Most CMS platforms can set this automatically based on site language.',
  timeEstimate: '5 minutes',
  moreInfoUrl: '/blog/html-lang-attribute'
};

export const FRIENDLY_URLS_CONTENT: RecommendationContent = {
  what: 'Friendly URLs (also called clean URLs or semantic URLs) are human-readable web addresses that clearly describe the page content. They avoid complex parameters, IDs, and special characters.',
  why: 'Friendly URLs improve user experience, are easier to remember and share, and help search engines understand page content. They\'re more likely to be clicked and earn better engagement metrics.',
  how: 'Use descriptive words separated by hyphens, keep URLs short and focused, include target keywords naturally, use lowercase letters, avoid special characters and parameters. Most CMS platforms have permalink settings to create friendly URLs automatically.',
  timeEstimate: '30 minutes',
  moreInfoUrl: '/blog/friendly-urls',
  bestPracticesUrl: '/blog/url-structure-best-practices'
};

export const WORD_COUNT_CONTENT: RecommendationContent = {
  what: 'Word count refers to the total amount of text content on a page. While quality matters more than quantity, research shows a correlation between longer, comprehensive content and higher rankings.',
  why: 'Longer content (typically 500+ words, ideally 1000+) tends to rank better because it can cover topics more comprehensively, naturally include more keywords and variations, earn more backlinks, and provide more value to users.',
  how: 'Aim for at least 500 words on important pages, 1000-2000+ for cornerstone content and blog posts. Focus on creating comprehensive, valuable content that fully addresses user intent. Add relevant sections, expand on topics, include examples and case studies.',
  timeEstimate: '2-4 hours',
  moreInfoUrl: '/blog/content-length',
  bestPracticesUrl: '/blog/content-writing-guide'
};

/**
 * PERFORMANCE CHECKS
 */

export const CORE_WEB_VITALS_CONTENT: RecommendationContent = {
  what: 'Core Web Vitals are Google\'s user experience metrics that measure loading performance (LCP), interactivity (FID/INP), and visual stability (CLS). They are confirmed ranking factors.',
  why: 'Core Web Vitals directly impact rankings and user experience. Pages with poor Core Web Vitals may rank lower, lose traffic, and experience higher bounce rates. Google considers them essential to page quality.',
  how: 'Improve LCP by optimizing images, removing render-blocking resources, and using a CDN. Reduce CLS by specifying image/video dimensions and avoiding dynamic content insertion. Improve FID/INP by minimizing JavaScript and deferring non-critical scripts. Use tools like Google PageSpeed Insights to identify specific issues.',
  timeEstimate: '4-8 hours',
  moreInfoUrl: '/blog/core-web-vitals',
  bestPracticesUrl: '/blog/core-web-vitals#optimization-guide'
};

export const LOAD_TIME_CONTENT: RecommendationContent = {
  what: 'Load time is how long it takes for a page to fully load and become interactive. It\'s a critical user experience and SEO metric that directly affects bounce rates and conversions.',
  why: 'Page speed is a confirmed ranking factor. Users abandon pages that take longer than 3 seconds to load. Every second of delay can reduce conversions by up to 20%. Fast sites rank better and perform better.',
  how: 'Optimize images (compress, use modern formats like WebP), minify CSS/JS, enable compression (gzip/brotli), use a CDN, implement browser caching, remove unused code, defer off-screen images, reduce server response time.',
  timeEstimate: '4-8 hours',
  moreInfoUrl: '/blog/page-speed-optimization',
  bestPracticesUrl: '/blog/speed-optimization-checklist'
};

export const IMAGE_OPTIMIZATION_CONTENT: RecommendationContent = {
  what: 'Image optimization involves reducing image file sizes without significant quality loss and using appropriate formats. Images typically account for 50-80% of page weight.',
  why: 'Unoptimized images are the leading cause of slow page load times. Optimized images improve load speed, reduce bandwidth costs, improve rankings, and enhance user experience.',
  how: 'Compress images using tools like TinyPNG, ImageOptim, or Squoosh. Use modern formats (WebP, AVIF) with fallbacks. Serve correctly sized images (don\'t load 4000px images for 400px displays). Implement lazy loading for off-screen images. Use responsive images with srcset.',
  timeEstimate: '2-4 hours',
  moreInfoUrl: '/blog/image-optimization',
  bestPracticesUrl: '/blog/image-optimization-guide'
};

export const MINIFICATION_CONTENT: RecommendationContent = {
  what: 'Minification is the process of removing unnecessary characters from code (whitespace, comments, formatting) without changing functionality. It reduces file sizes for CSS, JavaScript, and HTML.',
  why: 'Minified files load faster, reducing page load time and improving Core Web Vitals. This is a quick win for performance optimization with minimal effort.',
  how: 'Use build tools (Webpack, Vite, Rollup) that automatically minify during production builds. For WordPress, use caching plugins like WP Rocket or Autoptimize. For manual minification, use online tools or npm packages (Terser for JS, cssnano for CSS).',
  timeEstimate: '1 hour',
  moreInfoUrl: '/blog/minification',
  bestPracticesUrl: '/blog/minification-guide'
};

/**
 * TECHNICAL - NEW CHECKS
 */

export const DMARC_RECORD_CONTENT: RecommendationContent = {
  what: 'DMARC (Domain-based Message Authentication, Reporting, and Conformance) is an email authentication protocol that helps prevent email spoofing and phishing attacks from your domain.',
  why: 'Major email providers like Gmail and Outlook now require or strongly recommend DMARC for email deliverability. Without it, your legitimate emails may be marked as spam or rejected. It also protects your brand from email-based phishing attacks.',
  how: 'Add a DMARC TXT record to your domain\'s DNS: "_dmarc.yourdomain.com" with value starting with "v=DMARC1;". Start with a monitoring policy (p=none) to collect reports, then gradually enforce (p=quarantine or p=reject). Coordinate with your email provider for proper SPF and DKIM setup.',
  timeEstimate: '30 minutes',
  moreInfoUrl: '/blog/dmarc-guide',
  bestPracticesUrl: '/blog/email-authentication'
};

export const SPF_RECORD_CONTENT: RecommendationContent = {
  what: 'SPF (Sender Policy Framework) is a DNS record that specifies which mail servers are authorized to send email on behalf of your domain. It helps prevent email spoofing.',
  why: 'SPF records improve email deliverability and security. Without SPF, your emails are more likely to be marked as spam, and malicious actors can more easily send spoofed emails from your domain.',
  how: 'Add an SPF TXT record to your domain\'s DNS. Format: "v=spf1 include:_spf.yourmailprovider.com ~all". Include all legitimate mail servers (email service provider, web host, CRM system). Test the record before enforcement to avoid blocking legitimate emails.',
  timeEstimate: '30 minutes',
  moreInfoUrl: '/blog/spf-record',
  bestPracticesUrl: '/blog/email-authentication#spf'
};

export const DNS_CHECK_CONTENT: RecommendationContent = {
  what: 'DNS (Domain Name System) translates human-readable domain names into IP addresses. Your DNS nameservers are the authoritative servers that respond to DNS queries for your domain.',
  why: 'DNS configuration affects site accessibility, speed, and email deliverability. Properly configured DNS ensures your site is reachable, resolves quickly, and email records function correctly.',
  how: 'Verify your DNS nameservers are correctly configured and responding. Use your domain registrar\'s DNS management or a DNS service like Cloudflare. Ensure all necessary records (A, AAAA, MX, TXT) are properly configured.',
  timeEstimate: '15 minutes',
  moreInfoUrl: '/blog/dns-basics'
};

export const ANALYTICS_DETECTION_CONTENT: RecommendationContent = {
  what: 'Web analytics tools like Google Analytics, Google Tag Manager, or Facebook Pixel track user behavior on your site, providing crucial data about traffic, conversions, and user engagement.',
  why: 'Without analytics, you\'re flying blind. Analytics data is essential for measuring SEO success, understanding user behavior, making data-driven decisions, and tracking ROI. It\'s not a direct ranking factor but is fundamental to SEO strategy.',
  how: 'Install Google Analytics 4 (GA4) by adding the tracking code to your site\'s <head> section. For WordPress, use plugins like MonsterInsights or Site Kit. For Shopify, enable Google Analytics in settings. Consider adding Google Tag Manager for easier tag management.',
  timeEstimate: '30 minutes',
  moreInfoUrl: '/blog/google-analytics-setup',
  platformGuides: {
    wordpress: '/blog/wordpress-google-analytics',
    shopify: '/blog/shopify-analytics',
    wix: '/blog/wix-google-analytics'
  }
};

export const ON_PAGE_LINKS_CONTENT: RecommendationContent = {
  what: 'On-page link structure refers to the balance and quality of internal and external links on your page, including the use of dofollow vs nofollow attributes.',
  why: 'Proper link structure helps distribute PageRank throughout your site, improves crawlability, enhances user navigation, and signals topical relationships. Too many external links or excessive nofollow usage can waste link equity.',
  how: 'Aim for at least 70-80% internal links to keep users on your site and distribute PageRank. Use external links sparingly and only to high-quality, relevant sources. Use nofollow only for untrusted content, sponsored links, or user-generated content. Ensure all important pages are linked from multiple locations.',
  timeEstimate: '1 hour',
  moreInfoUrl: '/blog/internal-linking',
  bestPracticesUrl: '/blog/link-structure-guide'
};

export const LLM_READABILITY_CONTENT: RecommendationContent = {
  what: 'LLM (Large Language Model) readability measures how much of your page content is available in raw HTML vs rendered only through JavaScript. AI crawlers and LLMs typically read static HTML, not JavaScript-rendered content.',
  why: 'As AI-powered search and AI answer engines grow, ensuring your content is readable by LLMs becomes important. Heavy JavaScript rendering may make your content invisible to AI crawlers, potentially excluding you from AI-generated answers and summaries.',
  how: 'Implement server-side rendering (SSR) or static site generation (SSG) for content-heavy pages. Ensure critical content is present in the initial HTML. Use progressive enhancement rather than JavaScript-dependent content rendering. Test your site with JavaScript disabled to see what\'s accessible.',
  timeEstimate: '4-8 hours',
  moreInfoUrl: '/blog/llm-readability',
  bestPracticesUrl: '/blog/ai-seo-optimization'
};

/**
 * LINKS & SOCIAL CHECKS
 */

export const LINK_STRUCTURE_CONTENT: RecommendationContent = {
  what: 'Internal link structure refers to how pages on your site link to each other. A strong internal linking strategy helps search engines discover pages, distribute PageRank, and understand site hierarchy.',
  why: 'Internal links are one of the most powerful on-page SEO factors you control. They help search engines discover all your content, establish information hierarchy, distribute ranking power throughout your site, and guide users to related content.',
  how: 'Ensure all important pages are linked from your main navigation or are within 3 clicks of the homepage. Use descriptive anchor text with relevant keywords. Link from high-authority pages to new content. Create hub pages that link to related content clusters. Avoid orphan pages (pages with no internal links).',
  timeEstimate: '2-4 hours',
  moreInfoUrl: '/blog/internal-linking-strategy'
};

export const OPEN_GRAPH_CONTENT: RecommendationContent = {
  what: 'Open Graph tags are meta tags that control how your content appears when shared on social media platforms like Facebook, LinkedIn, and others. They specify title, description, image, and other metadata.',
  why: 'Proper Open Graph tags ensure your content looks professional and compelling when shared on social media, increasing click-through rates and social engagement. Social signals can indirectly benefit SEO through increased traffic and brand awareness.',
  how: 'Add Open Graph meta tags in your page <head>: og:title, og:description, og:image, og:url, og:type. Use high-quality images (1200x630px recommended). Test with Facebook\'s Sharing Debugger. Most SEO plugins handle this automatically.',
  timeEstimate: '30 minutes',
  moreInfoUrl: '/blog/open-graph-tags',
  platformGuides: {
    wordpress: '/blog/wordpress-open-graph'
  }
};

/**
 * STRUCTURED DATA CHECKS
 */

export const SCHEMA_ORG_CONTENT: RecommendationContent = {
  what: 'Schema.org markup (structured data) is code that helps search engines understand your content better and can enable rich results in search like star ratings, prices, availability, and more.',
  why: 'Structured data can give you rich results (rich snippets) in search, making your listings more attractive and increasing click-through rates. It helps search engines better understand and categorize your content, potentially improving rankings.',
  how: 'Add JSON-LD structured data to your pages. Common schemas include Organization, Article, Product, LocalBusiness, Recipe, FAQ, and Review. Use Google\'s Structured Data Markup Helper or schema generators. Validate with Google\'s Rich Results Test.',
  timeEstimate: '2-4 hours',
  moreInfoUrl: '/blog/schema-markup',
  bestPracticesUrl: '/blog/structured-data-guide'
};

/**
 * ACCESSIBILITY & USABILITY CHECKS
 */

export const VIEWPORT_CONTENT: RecommendationContent = {
  what: 'The viewport meta tag controls how your page is displayed on mobile devices. It ensures your page scales appropriately to fit different screen sizes.',
  why: 'Mobile-friendliness is a ranking factor. Without a proper viewport tag, your site may appear tiny or zoomed out on mobile devices, leading to poor user experience and higher bounce rates.',
  how: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to your page <head>. This is standard for responsive designs. Most modern frameworks and themes include this by default.',
  timeEstimate: '5 minutes',
  moreInfoUrl: '/blog/viewport-meta-tag'
};

export const FONT_LEGIBILITY_CONTENT: RecommendationContent = {
  what: 'Font legibility refers to whether your text is easy to read across all devices. This includes font size, line height, contrast, and font family choices.',
  why: 'Legible text improves user experience and accessibility. Small or hard-to-read fonts increase bounce rates and hurt conversions. Google considers text legibility in mobile-friendliness assessments.',
  how: 'Use minimum 16px font size for body text on mobile. Ensure adequate line spacing (1.4-1.6 line height). Use sufficient color contrast (4.5:1 ratio minimum for body text). Choose readable font families. Test on actual devices.',
  timeEstimate: '1 hour',
  moreInfoUrl: '/blog/typography-guide'
};

/**
 * Helper function to get recommendation content by rule code
 */
export function getRecommendationContent(ruleCode: string): RecommendationContent | undefined {
  const contentMap: Record<string, RecommendationContent> = {
    // Technical
    'HTTPS_CHECK': HTTPS_CHECK_CONTENT,
    'SSL_CERTIFICATE': SSL_CERTIFICATE_CONTENT,
    'CANONICAL_TAG': CANONICAL_TAG_CONTENT,
    'ROBOTS_TXT': ROBOTS_TXT_CONTENT,
    'SITEMAP': SITEMAP_CONTENT,
    'CHARSET': CHARSET_CONTENT,
    'NOINDEX_TAG': NOINDEX_TAG_CONTENT,
    'HTTP2_CHECK': HTTP2_CONTENT,
    'DMARC_RECORD': DMARC_RECORD_CONTENT,
    'SPF_RECORD': SPF_RECORD_CONTENT,
    'DNS_CHECK': DNS_CHECK_CONTENT,
    'ANALYTICS_DETECTION': ANALYTICS_DETECTION_CONTENT,
    
    // On-page
    'TITLE_TAG': TITLE_TAG_CONTENT,
    'META_DESCRIPTION': META_DESCRIPTION_CONTENT,
    'H1_TAG': H1_TAG_CONTENT,
    'HEADING_HIERARCHY': HEADING_HIERARCHY_CONTENT,
    'KEYWORD_CONSISTENCY': KEYWORD_CONSISTENCY_CONTENT,
    'IMAGE_ALT': IMAGE_ALT_CONTENT,
    'HREFLANG': HREFLANG_CONTENT,
    'LANG_ATTRIBUTE': LANG_ATTRIBUTE_CONTENT,
    'FRIENDLY_URLS': FRIENDLY_URLS_CONTENT,
    'WORD_COUNT': WORD_COUNT_CONTENT,
    
    // Performance
    'CORE_WEB_VITALS': CORE_WEB_VITALS_CONTENT,
    'LOAD_TIME': LOAD_TIME_CONTENT,
    'IMAGE_OPTIMIZATION': IMAGE_OPTIMIZATION_CONTENT,
    'MINIFICATION': MINIFICATION_CONTENT,
    
    // Links
    'LINK_STRUCTURE': LINK_STRUCTURE_CONTENT,
    'ON_PAGE_LINKS': ON_PAGE_LINKS_CONTENT,
    
    // Social
    'OPEN_GRAPH': OPEN_GRAPH_CONTENT,
    
    // Structured Data
    'SCHEMA_ORG': SCHEMA_ORG_CONTENT,
    
    // Accessibility
    'VIEWPORT': VIEWPORT_CONTENT,
    'FONT_LEGIBILITY': FONT_LEGIBILITY_CONTENT,
    
    // New checks
    'LLM_READABILITY': LLM_READABILITY_CONTENT,
  };
  
  return contentMap[ruleCode];
}
