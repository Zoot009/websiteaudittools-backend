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

  // Internationalization
  var langAttr = document.documentElement.getAttribute('lang') || null;
  var hreflangLinks = Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]')).map(function(link) {
    return {
      hreflang: link.getAttribute('hreflang'),
      href: link.getAttribute('href')
    };
  });

  // Charset detection
  var charsetMeta = getAttr('meta[charset]', 'charset') || 
                    getAttr('meta[http-equiv="Content-Type"]', 'content');
  var charset = null;
  if (charsetMeta) {
    if (charsetMeta.includes('charset=')) {
      charset = charsetMeta.split('charset=')[1].split(';')[0].trim();
    } else {
      charset = charsetMeta;
    }
  }

  // Usability checks
  var flashCount = document.querySelectorAll('embed[type*="flash"], object[type*="flash"], object[data*=".swf"]').length;
  var iframeCount = document.querySelectorAll('iframe').length;
  
  // Email privacy - find plain text emails
  var emailMatches = bodyText.match(/[\w.-]+@[\w.-]+\.\w{2,}/g) || [];
  var exposedEmails = Array.from(new Set(emailMatches)).slice(0, 5); // Unique emails, max 5

  // Performance/Code quality
  var isAMP = document.documentElement.hasAttribute('amp') || 
              document.documentElement.hasAttribute('⚡') ||
              !!document.querySelector('script[src*="ampproject.org"]');
  
  var deprecatedTags = document.querySelectorAll('font, center, marquee, blink, big, strike, tt, basefont, u').length;
  var inlineStylesCount = document.querySelectorAll('[style]').length;

  // Social media links detection
  var allLinks = Array.from(document.querySelectorAll('a[href]'));
  var socialLinks = {
    facebook: allLinks.some(function(a) { return a.href.includes('facebook.com/') && !a.href.includes('sharer'); }),
    twitter: allLinks.some(function(a) { return a.href.includes('twitter.com/') || a.href.includes('x.com/'); }),
    instagram: allLinks.some(function(a) { return a.href.includes('instagram.com/'); }),
    linkedin: allLinks.some(function(a) { return a.href.includes('linkedin.com/'); }),
    youtube: allLinks.some(function(a) { return a.href.includes('youtube.com/'); })
  };

  // Facebook Pixel detection
  var hasFacebookPixel = document.documentElement.outerHTML.includes('fbq(') || 
                         document.documentElement.outerHTML.includes('facebook.com/tr');

  // === PHASE 2 ENHANCEMENTS ===
  
  // Open Graph tags
  var ogTags = {
    title: getAttr('meta[property="og:title"]', 'content'),
    description: getAttr('meta[property="og:description"]', 'content'),
    image: getAttr('meta[property="og:image"]', 'content'),
    type: getAttr('meta[property="og:type"]', 'content'),
    url: getAttr('meta[property="og:url"]', 'content'),
    siteName: getAttr('meta[property="og:site_name"]', 'content')
  };

  // Twitter Card tags
  var twitterTags = {
    card: getAttr('meta[name="twitter:card"]', 'content'),
    site: getAttr('meta[name="twitter:site"]', 'content'),
    title: getAttr('meta[name="twitter:title"]', 'content'),
    description: getAttr('meta[name="twitter:description"]', 'content'),
    image: getAttr('meta[name="twitter:image"]', 'content')
  };

  // Mobile Viewport
  var viewportMeta = getAttr('meta[name="viewport"]', 'content');
  var viewport = {
    hasViewport: !!viewportMeta,
    content: viewportMeta
  };

  // Favicon detection
  var faviconEl = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
  var favicon = {
    hasFavicon: !!faviconEl,
    url: faviconEl ? faviconEl.getAttribute('href') : null
  };

  // Small font detection (fonts < 12px)
  var allElements = document.querySelectorAll('p, span, div, a, li');
  var smallFontCount = 0;
  for (var i = 0; i < Math.min(allElements.length, 100); i++) {
    var computedStyle = window.getComputedStyle(allElements[i]);
    var fontSize = parseFloat(computedStyle.fontSize);
    if (fontSize > 0 && fontSize < 12) {
      smallFontCount++;
    }
  }

  // Small tap targets (clickable elements < 48x48px)
  var clickableElements = document.querySelectorAll('a, button, input[type="button"], input[type="submit"]');
  var smallTapTargetCount = 0;
  for (var j = 0; j < clickableElements.length; j++) {
    var rect = clickableElements[j].getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && (rect.width < 48 || rect.height < 48)) {
      smallTapTargetCount++;
    }
  }

  // Performance metrics - Page sizes
  var resources = performance.getEntriesByType('resource');
  var htmlSize = 0;
  var cssSize = 0;
  var jsSize = 0;
  var imageSize = 0;
  var totalSize = 0;
  var scriptCount = 0;
  var stylesheetCount = 0;
  var imageCount = 0;
  var fontCount = 0;
  var unminifiedScripts = 0;
  var unminifiedStyles = 0;

  for (var k = 0; k < resources.length; k++) {
    var resource = resources[k];
    var size = resource.transferSize || resource.encodedBodySize || 0;
    totalSize += size;

    var resourceType = resource.initiatorType;
    var name = resource.name || '';

    if (resourceType === 'script' || name.endsWith('.js')) {
      jsSize += size;
      scriptCount++;
      if (!name.includes('.min.js') && !name.includes('min.js')) {
        unminifiedScripts++;
      }
    } else if (resourceType === 'css' || resourceType === 'link' || name.endsWith('.css')) {
      cssSize += size;
      stylesheetCount++;
      if (!name.includes('.min.css') && !name.includes('min.css')) {
        unminifiedStyles++;
      }
    } else if (resourceType === 'img' || name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
      imageSize += size;
      imageCount++;
    } else if (name.match(/\.(woff|woff2|ttf|eot)$/i)) {
      fontCount++;
    }
  }

  // HTML document size
  var navEntries = performance.getEntriesByType('navigation');
  if (navEntries.length > 0) {
    htmlSize = navEntries[0].transferSize || navEntries[0].encodedBodySize || 0;
    totalSize += htmlSize;
  }

  var pageSizes = {
    html: htmlSize,
    css: cssSize,
    js: jsSize,
    images: imageSize,
    total: totalSize
  };

  var resourceCounts = {
    scripts: scriptCount,
    stylesheets: stylesheetCount,
    images: imageCount,
    fonts: fontCount
  };

  var minification = {
    unminifiedScripts: unminifiedScripts,
    unminifiedStyles: unminifiedStyles
  };

  // Image optimization
  var unoptimizedImages = 0;
  var modernFormats = 0;
  for (var m = 0; m < images.length; m++) {
    var imgSrc = images[m].src.toLowerCase();
    if (imgSrc.endsWith('.webp') || imgSrc.endsWith('.avif')) {
      modernFormats++;
    } else if (imgSrc.endsWith('.jpg') || imgSrc.endsWith('.jpeg') || imgSrc.endsWith('.png')) {
      unoptimizedImages++;
    }
  }

  var imageOptimization = {
    unoptimized: unoptimizedImages,
    modernFormats: modernFormats
  };

  // Rendered content metrics
  var initialHtmlSize = document.documentElement.outerHTML.length;
  var renderedHtmlSize = document.body ? document.body.innerHTML.length : initialHtmlSize;
  var renderPercentage = initialHtmlSize > 0 ? (renderedHtmlSize / initialHtmlSize) * 100 : 100;

  var renderMetrics = {
    initialSize: initialHtmlSize,
    renderedSize: renderedHtmlSize,
    percentage: Math.round(renderPercentage)
  };

  // JavaScript errors (collect from window errors - note: this needs to be set up before page load)
  var jsErrors = window.__pageErrors || [];

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
    hasSchemaOrg: hasSchemaOrg,
    // Internationalization
    langAttr: langAttr,
    hreflangLinks: hreflangLinks,
    charset: charset,
    // Usability
    flashCount: flashCount,
    iframeCount: iframeCount,
    exposedEmails: exposedEmails,
    // Performance/Code quality
    isAMP: isAMP,
    deprecatedTagsCount: deprecatedTags,
    inlineStylesCount: inlineStylesCount,
    // Social
    socialLinks: socialLinks,
    hasFacebookPixel: hasFacebookPixel,
    // Phase 2 - Social Media
    ogTags: ogTags,
    twitterTags: twitterTags,
    // Phase 2 - Usability
    viewport: viewport,
    favicon: favicon,
    smallFontCount: smallFontCount,
    smallTapTargetCount: smallTapTargetCount,
    // Phase 2 - Performance
    pageSizes: pageSizes,
    resourceCounts: resourceCounts,
    jsErrors: jsErrors,
    imageOptimization: imageOptimization,
    minification: minification,
    renderMetrics: renderMetrics
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
