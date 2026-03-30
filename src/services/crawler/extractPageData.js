// Pure JavaScript extraction function to avoid tsx/esbuild transpilation issues
// This file is intentionally .js to prevent TypeScript compilation artifacts

export const extractPageDataFunction = function() {
  // Helper: Get text content
  function getText(selector) {
    var el = document.querySelector(selector);
    return el && el.textContent ? el.textContent.trim() : null;
  }

  // Helper: Get attribute
  function getAttr(selector, attr) {
    var el = document.querySelector(selector);
    return el ? el.getAttribute(attr) : null;
  }

  // Title and description
  var title = getText('title');
  var description = getAttr('meta[name="description"]', 'content');

  // Headings
  var headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(function(h) {
    return {
      level: parseInt(h.tagName[1], 10),
      text: h.textContent ? h.textContent.trim() : ''
    };
  });

  // Images
  var images = Array.from(document.querySelectorAll('img')).map(function(img) {
    return {
      src: img.src,
      alt: img.alt || null
    };
  });

  // Links
  var links = Array.from(document.querySelectorAll('a[href]')).map(function(a) {
    var href = a.href;
    return {
      href: href,
      text: a.textContent ? a.textContent.trim() : '',
      isInternal: href.startsWith(window.location.origin)
    };
  });

  // Word count (approximate)
  var bodyText = document.body.innerText || '';
  var wordCount = bodyText.split(/\s+/).filter(function(w) { return w.length > 0; }).length;

  // Meta tags
  var canonical = getAttr('link[rel="canonical"]', 'href');
  var robots = getAttr('meta[name="robots"]', 'content');
  var ogImage = getAttr('meta[property="og:image"]', 'content');

  // Check for Schema.org structured data
  var hasSchemaOrg = !!document.querySelector('script[type="application/ld+json"]');

  return {
    title: title,
    description: description,
    html: document.documentElement.outerHTML,
    headings: headings,
    images: images,
    links: links,
    wordCount: wordCount,
    canonical: canonical,
    robots: robots,
    ogImage: ogImage,
    hasSchemaOrg: hasSchemaOrg
  };
};

export const measureWebVitalsFunction = function() {
  var navEntries = performance.getEntriesByType('navigation');
  var perfData = navEntries[0];
  
  if (!perfData) {
    return { lcp: 0, cls: 0, fid: 0 };
  }
  
  // LCP - Largest Contentful Paint (approximation)
  var lcp = perfData.loadEventEnd - perfData.fetchStart;
  
  // CLS - Cumulative Layout Shift (requires LayoutShift API, simplified)
  var cls = 0; // Placeholder - requires proper implementation
  
  // FID - First Input Delay (requires interaction, use TBT as proxy)
  var fid = 0; // Placeholder
  
  return { lcp: lcp, cls: cls, fid: fid };
};
