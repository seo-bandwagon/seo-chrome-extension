/**
 * SEO Analyzer - Content Script
 * Analyzes the current page for SEO issues
 */

// Guard against duplicate injection — only add listener once
if (!window.__seoAnalyzerLoaded) {
  window.__seoAnalyzerLoaded = true;
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'analyze') {
      analyzePage().then(results => sendResponse(results));
    } else if (request.action === 'countSelection') {
      const selection = window.getSelection().toString();
      sendResponse(countText(selection));
    }
    return true; // Keep channel open for async response
  });
}

/**
 * Main analysis function
 */
async function analyzePage() {
  // Collect web vitals async (2s timeout for buffered entries)
  const webVitalsPromise = analyzeWebVitals();

  // Run all sync analyzers
  const results = {
    url: window.location.href,
    meta: analyzeMeta(),
    headings: analyzeHeadings(),
    images: analyzeImages(),
    links: analyzeLinks(),
    schema: analyzeSchema(),
    content: analyzeContent(),
    readability: analyzeReadability(),
    ngrams: analyzeNgrams(),
    performance: analyzePerformance(),
    textToHtml: analyzeTextToHtml(),
    aboveFold: analyzeAboveFold(),
    hreflang: analyzeHreflang(),
    schemaValidation: analyzeSchemaValidation(),
    lazyImages: analyzeLazyImages(),
    mixedContent: analyzeMixedContent(),
    iframes: analyzeIframes(),
    socialCards: analyzeSocialCards(),
    faviconAndFeeds: analyzeFaviconAndFeeds(),
    mediaTypes: analyzeMediaTypes(),
    keywordDensity: analyzeKeywordDensity(),
    tocNavigation: analyzeTocNavigation(),
    timestamp: Date.now()
  };

  // Wait for web vitals
  results.webVitals = await webVitalsPromise;

  return results;
}

/**
 * Analyze meta tags
 */
function analyzeMeta() {
  const results = {
    score: 0,
    items: [],
    issues: []
  };

  // Title
  const title = document.title || '';
  const titleLength = title.length;
  results.items.push({
    key: 'title',
    label: 'Title',
    value: title || '(missing)',
    status: !title ? 'fail' : (titleLength < 30 || titleLength > 60) ? 'warn' : 'pass',
    detail: `${titleLength} characters${titleLength < 30 ? ' (too short)' : titleLength > 60 ? ' (too long)' : ''}`
  });

  // Meta Description
  const descMeta = document.querySelector('meta[name="description"]');
  const description = descMeta ? descMeta.getAttribute('content') : '';
  const descLength = description.length;
  results.items.push({
    key: 'description',
    label: 'Meta Description',
    value: description || '(missing)',
    status: !description ? 'fail' : (descLength < 120 || descLength > 160) ? 'warn' : 'pass',
    detail: description ? `${descLength} characters${descLength < 120 ? ' (too short)' : descLength > 160 ? ' (too long)' : ''}` : 'Missing meta description'
  });

  // Canonical
  const canonical = document.querySelector('link[rel="canonical"]');
  const canonicalHref = canonical ? canonical.getAttribute('href') : '';
  results.items.push({
    key: 'canonical',
    label: 'Canonical URL',
    value: canonicalHref || '(missing)',
    status: canonicalHref ? 'pass' : 'warn'
  });

  // Robots
  const robotsMeta = document.querySelector('meta[name="robots"]');
  const robots = robotsMeta ? robotsMeta.getAttribute('content') : '';
  const isNoindex = robots.toLowerCase().includes('noindex');
  const isNofollow = robots.toLowerCase().includes('nofollow');
  results.items.push({
    key: 'robots',
    label: 'Robots',
    value: robots || 'index, follow (default)',
    status: isNoindex ? 'warn' : 'info',
    detail: isNoindex ? 'Page is noindexed!' : isNofollow ? 'Links are nofollowed' : ''
  });

  // Open Graph
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDesc = document.querySelector('meta[property="og:description"]');
  const ogImage = document.querySelector('meta[property="og:image"]');
  const ogCount = [ogTitle, ogDesc, ogImage].filter(Boolean).length;
  results.items.push({
    key: 'og',
    label: 'Open Graph Tags',
    value: ogCount === 3 ? 'Complete' : `${ogCount}/3 present`,
    status: ogCount === 3 ? 'pass' : ogCount === 0 ? 'warn' : 'info',
    detail: `Title: ${ogTitle ? '✓' : '✗'}, Description: ${ogDesc ? '✓' : '✗'}, Image: ${ogImage ? '✓' : '✗'}`
  });

  // Twitter Card
  const twitterCard = document.querySelector('meta[name="twitter:card"]');
  const twitterTitle = document.querySelector('meta[name="twitter:title"]');
  results.items.push({
    key: 'twitter',
    label: 'Twitter Card',
    value: twitterCard ? twitterCard.getAttribute('content') : '(not set)',
    status: twitterCard ? 'pass' : 'info'
  });

  // Viewport
  const viewport = document.querySelector('meta[name="viewport"]');
  results.items.push({
    key: 'viewport',
    label: 'Viewport',
    value: viewport ? 'Set' : '(missing)',
    status: viewport ? 'pass' : 'fail'
  });

  // Lang attribute
  const htmlLang = document.documentElement.lang;
  results.items.push({
    key: 'lang',
    label: 'HTML Lang',
    value: htmlLang || '(missing)',
    status: htmlLang ? 'pass' : 'warn'
  });

  // Calculate score
  const passCount = results.items.filter(i => i.status === 'pass').length;
  results.score = Math.round((passCount / results.items.length) * 100);

  return results;
}

/**
 * Analyze heading structure
 */
function analyzeHeadings() {
  const results = {
    score: 0,
    items: [],
    issues: [],
    stats: { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0, total: 0 }
  };

  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  
  headings.forEach(h => {
    const tag = h.tagName.toLowerCase();
    const text = h.textContent.trim().substring(0, 100);
    results.stats[tag]++;
    results.stats.total++;
    
    results.items.push({
      tag: tag,
      text: text,
      level: parseInt(tag.charAt(1))
    });
  });

  // Check for issues
  if (results.stats.h1 === 0) {
    results.issues.push({ type: 'fail', message: 'No H1 tag found' });
  } else if (results.stats.h1 > 1) {
    results.issues.push({ type: 'warn', message: `Multiple H1 tags (${results.stats.h1})` });
  }

  // Check heading order
  let lastLevel = 0;
  let skipIssue = false;
  results.items.forEach(h => {
    if (h.level > lastLevel + 1 && !skipIssue) {
      results.issues.push({ 
        type: 'warn', 
        message: `Heading level skipped (H${lastLevel} to H${h.level})`
      });
      skipIssue = true;
    }
    lastLevel = h.level;
  });

  // Calculate score
  let score = 100;
  if (results.stats.h1 === 0) score -= 40;
  else if (results.stats.h1 > 1) score -= 20;
  if (skipIssue) score -= 20;
  if (results.stats.total === 0) score = 0;
  
  results.score = Math.max(0, score);

  return results;
}

/**
 * Analyze images
 */
function analyzeImages() {
  const results = {
    score: 0,
    items: [],
    issues: [],
    stats: { total: 0, withAlt: 0, withoutAlt: 0, decorative: 0 }
  };

  const images = document.querySelectorAll('img');
  
  images.forEach(img => {
    results.stats.total++;
    
    const alt = img.getAttribute('alt');
    const src = img.src || img.dataset.src || '';
    const fileName = src.split('/').pop().split('?')[0].substring(0, 40);
    
    if (alt === null || alt === undefined) {
      results.stats.withoutAlt++;
      results.items.push({
        src: fileName || '(inline)',
        alt: '(missing)',
        status: 'fail'
      });
    } else if (alt === '') {
      // Empty alt = decorative
      results.stats.decorative++;
      results.items.push({
        src: fileName || '(inline)',
        alt: '(decorative)',
        status: 'info'
      });
    } else {
      results.stats.withAlt++;
      results.items.push({
        src: fileName || '(inline)',
        alt: alt.substring(0, 60),
        status: alt.length > 125 ? 'warn' : 'pass'
      });
    }
  });

  // Calculate score
  if (results.stats.total === 0) {
    results.score = 100;
  } else {
    const goodImages = results.stats.withAlt + results.stats.decorative;
    results.score = Math.round((goodImages / results.stats.total) * 100);
  }

  // Issues
  if (results.stats.withoutAlt > 0) {
    results.issues.push({
      type: 'fail',
      message: `${results.stats.withoutAlt} image(s) missing alt attribute`
    });
  }

  return results;
}

/**
 * Analyze links
 */
function analyzeLinks() {
  const results = {
    score: 100,
    items: [],
    issues: [],
    stats: { 
      total: 0, 
      internal: 0, 
      external: 0, 
      nofollow: 0, 
      noopener: 0,
      empty: 0,
      blankWithoutNoopener: 0
    }
  };

  const links = document.querySelectorAll('a[href]');
  const currentHost = window.location.hostname;
  
  links.forEach(link => {
    results.stats.total++;
    
    const href = link.getAttribute('href');
    const rel = link.getAttribute('rel') || '';
    const text = link.textContent.trim().substring(0, 50);
    
    // Classify link
    let linkHost = '';
    try {
      const url = new URL(href, window.location.origin);
      linkHost = url.hostname;
    } catch (e) {
      // Invalid URL
    }
    
    const isInternal = !href.startsWith('http') || linkHost === currentHost;
    const isExternal = href.startsWith('http') && linkHost !== currentHost;
    const isNofollow = rel.includes('nofollow');
    const hasTargetBlank = link.getAttribute('target') === '_blank';
    const isNoopener = rel.includes('noopener');
    const isEmpty = !text && !link.querySelector('img');
    
    if (isInternal) results.stats.internal++;
    if (isExternal) results.stats.external++;
    if (isNofollow) results.stats.nofollow++;
    if (isNoopener) results.stats.noopener++;
    if (isEmpty) results.stats.empty++;
    if (isExternal && hasTargetBlank && !isNoopener) results.stats.blankWithoutNoopener++;
  });

  // External links with target="_blank" but no noopener
  const externalWithoutNoopener = results.stats.blankWithoutNoopener || 0;
  
  // Issues
  if (results.stats.empty > 0) {
    results.issues.push({
      type: 'warn',
      message: `${results.stats.empty} link(s) with empty anchor text`
    });
    results.score -= 10;
  }

  if (externalWithoutNoopener > 0) {
    results.issues.push({
      type: 'info',
      message: `${externalWithoutNoopener} external link(s) without rel="noopener"`
    });
  }

  results.score = Math.max(0, results.score);

  return results;
}

/**
 * Analyze schema markup
 */
function analyzeSchema() {
  const results = {
    score: 0,
    types: [],
    jsonLd: [],
    microdata: [],
    rdfa: false
  };

  // JSON-LD
  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  jsonLdScripts.forEach(script => {
    try {
      const data = JSON.parse(script.textContent);
      const types = extractSchemaTypes(data);
      results.types.push(...types);
      results.jsonLd.push(data);
    } catch (e) {
      // Invalid JSON-LD
    }
  });

  // Microdata
  const microdataElements = document.querySelectorAll('[itemtype]');
  microdataElements.forEach(el => {
    const itemtype = el.getAttribute('itemtype');
    if (itemtype) {
      const type = itemtype.split('/').pop();
      if (!results.types.includes(type)) {
        results.types.push(type);
      }
      results.microdata.push(type);
    }
  });

  // RDFa
  const rdfaElements = document.querySelectorAll('[typeof]');
  if (rdfaElements.length > 0) {
    results.rdfa = true;
    rdfaElements.forEach(el => {
      const type = el.getAttribute('typeof');
      if (type && !results.types.includes(type)) {
        results.types.push(type);
      }
    });
  }

  // Calculate score — reward breadth and JSON-LD usage
  if (results.types.length === 0) {
    results.score = 0;
  } else {
    let score = 50; // base for having any schema
    if (results.jsonLd.length > 0) score += 20; // JSON-LD is preferred format
    if (results.types.length >= 2) score += 15; // multiple types shows depth
    if (results.types.length >= 4) score += 15; // comprehensive markup
    results.score = Math.min(100, score);
  }

  return results;
}

/**
 * Analyze page content — word count, character count, reading time
 */
function analyzeContent() {
  // Get visible body text, excluding scripts/styles/hidden elements
  const bodyClone = document.body.cloneNode(true);
  const removeTags = bodyClone.querySelectorAll('script, style, noscript, svg, [hidden], [aria-hidden="true"]');
  removeTags.forEach(el => el.remove());
  const bodyText = bodyClone.textContent || '';

  const stats = countText(bodyText);

  // Title stats
  const title = document.title || '';
  const titleWords = title.trim() ? title.trim().split(/\s+/).length : 0;

  // Meta description stats
  const descMeta = document.querySelector('meta[name="description"]');
  const description = descMeta ? descMeta.getAttribute('content') || '' : '';
  const descWords = description.trim() ? description.trim().split(/\s+/).length : 0;

  return {
    score: stats.words >= 300 ? 100 : stats.words >= 100 ? 70 : stats.words > 0 ? 40 : 0,
    stats: stats,
    title: { characters: title.length, words: titleWords },
    description: { characters: description.length, words: descWords }
  };
}

/**
 * Count words, characters, sentences, and estimate reading time
 */
function countText(text) {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  const characters = cleaned.length;
  const charactersNoSpaces = cleaned.replace(/\s/g, '').length;
  const words = cleaned ? cleaned.split(/\s+/).length : 0;
  const sentences = cleaned ? (cleaned.match(/[.!?]+(\s|$)/g) || []).length : 0;
  const paragraphs = text.trim() ? text.trim().split(/\n\s*\n/).filter(p => p.trim()).length : 0;
  const readingTimeMin = Math.max(1, Math.ceil(words / 238)); // avg adult reading speed

  return { characters, charactersNoSpaces, words, sentences, paragraphs, readingTimeMin };
}

/**
 * Readability analysis — Flesch Reading Ease, Flesch-Kincaid Grade, avg lengths
 */
function analyzeReadability() {
  const bodyClone = document.body.cloneNode(true);
  bodyClone.querySelectorAll('script, style, noscript, svg, [hidden], [aria-hidden="true"]').forEach(el => el.remove());
  const text = (bodyClone.textContent || '').replace(/\s+/g, ' ').trim();

  if (!text || text.split(/\s+/).length < 30) {
    return { score: 0, fleschEase: null, fleschKincaid: null, avgSentenceLen: 0, avgWordLen: 0, syllablesPerWord: 0, message: 'Not enough text to analyze (need 30+ words)' };
  }

  const words = text.split(/\s+/);
  const wordCount = words.length;
  const sentenceCount = Math.max(1, (text.match(/[.!?]+(\s|$)/g) || []).length);
  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);

  const avgSentenceLen = +(wordCount / sentenceCount).toFixed(1);
  const avgWordLen = +(words.join('').length / wordCount).toFixed(1);
  const syllablesPerWord = +(totalSyllables / wordCount).toFixed(2);

  // Flesch Reading Ease: 206.835 - 1.015*(words/sentences) - 84.6*(syllables/words)
  const fleschEase = Math.max(0, Math.min(100,
    +(206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (totalSyllables / wordCount)).toFixed(1)
  ));

  // Flesch-Kincaid Grade Level: 0.39*(words/sentences) + 11.8*(syllables/words) - 15.59
  const fleschKincaid = Math.max(0,
    +(0.39 * (wordCount / sentenceCount) + 11.8 * (totalSyllables / wordCount) - 15.59).toFixed(1)
  );

  // Score: Flesch Ease maps well — 60+ is good for web content
  const score = fleschEase >= 60 ? 100 : fleschEase >= 40 ? 70 : fleschEase >= 20 ? 40 : 20;

  return { score, fleschEase, fleschKincaid, avgSentenceLen, avgWordLen, syllablesPerWord, message: null };
}

/**
 * Count syllables in a word (English approximation)
 */
function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!word || word.length <= 2) return 1;

  // Remove trailing silent e
  word = word.replace(/e$/, '');

  // Count vowel groups
  const vowelGroups = word.match(/[aeiouy]+/g);
  let count = vowelGroups ? vowelGroups.length : 1;

  return Math.max(1, count);
}

/**
 * N-gram / word combination frequency analysis
 */
function analyzeNgrams() {
  const bodyClone = document.body.cloneNode(true);
  bodyClone.querySelectorAll('script, style, noscript, svg, [hidden], [aria-hidden="true"]').forEach(el => el.remove());
  const text = (bodyClone.textContent || '').toLowerCase();

  // Tokenize: letters, numbers, hyphens within words
  const words = text.match(/[a-z0-9](?:[a-z0-9'-]*[a-z0-9])?/g) || [];

  const stopWords = new Set([
    'a','an','the','and','or','but','in','on','at','to','for','of','with','by',
    'from','is','it','its','this','that','are','was','were','be','been','being',
    'have','has','had','do','does','did','will','would','could','should','may',
    'might','shall','can','not','no','nor','so','if','then','than','too','very',
    'just','about','above','after','again','all','also','am','as','because',
    'before','between','both','each','few','get','got','he','her','here','him',
    'his','how','i','into','me','more','most','my','new','now','of','only',
    'other','our','out','over','own','re','same','she','some','such','there',
    'they','their','them','these','those','through','under','up','us','we',
    'what','when','where','which','while','who','whom','why','you','your',
    'able','across','already','always','among','any','around','away','back',
    'become','been','below','come','down','during','even','every','find',
    'first','go','going','good','great','help','here','high','however',
    'into','keep','know','last','let','like','long','look','made','make',
    'many','much','must','need','next','off','often','old','once','one',
    'only','part','per','put','said','say','see','seem','set','show',
    'since','still','take','tell','thing','think','time','two','use',
    'want','way','well','work','year'
  ]);

  // Filter out stop words for n-gram analysis
  const filtered = words.filter(w => !stopWords.has(w) && w.length > 1);

  // Build n-grams (1, 2, 3)
  const unigrams = buildNgramCounts(filtered, 1);
  const bigrams = buildNgramCounts(words.filter(w => w.length > 1), 2, stopWords); // use all words but filter results
  const trigrams = buildNgramCounts(words.filter(w => w.length > 1), 3, stopWords);

  return {
    unigrams: getTopN(unigrams, 15),
    bigrams: getTopN(bigrams, 10),
    trigrams: getTopN(trigrams, 10),
    totalWords: words.length,
    uniqueWords: new Set(words).size
  };
}

/**
 * Build n-gram frequency map
 */
function buildNgramCounts(words, n, stopWords) {
  const counts = {};
  for (let i = 0; i <= words.length - n; i++) {
    const gram = words.slice(i, i + n).join(' ');
    // For bigrams/trigrams: skip if ALL words are stop words
    if (n > 1 && stopWords) {
      const parts = gram.split(' ');
      if (parts.every(w => stopWords.has(w))) continue;
    }
    counts[gram] = (counts[gram] || 0) + 1;
  }
  return counts;
}

/**
 * Get top N entries from frequency map (minimum count of 2)
 */
function getTopN(counts, n) {
  return Object.entries(counts)
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([phrase, count]) => ({ phrase, count }));
}

/**
 * Extract schema types from JSON-LD object
 */
function extractSchemaTypes(data) {
  const types = [];
  
  if (Array.isArray(data)) {
    data.forEach(item => types.push(...extractSchemaTypes(item)));
  } else if (data && typeof data === 'object') {
    if (data['@type']) {
      const type = Array.isArray(data['@type']) ? data['@type'][0] : data['@type'];
      types.push(type);
    }
    if (data['@graph']) {
      types.push(...extractSchemaTypes(data['@graph']));
    }
  }
  
  return [...new Set(types)];
}

// ============================================
// Core Web Vitals (LCP, CLS, INP)
// ============================================
function analyzeWebVitals() {
  return new Promise((resolve) => {
    const vitals = { lcp: null, cls: null, inp: null, fcp: null, ttfb: null };
    let clsValue = 0;
    let inpValue = 0;
    let resolved = false;

    function finish() {
      if (resolved) return;
      resolved = true;
      vitals.cls = +clsValue.toFixed(4);
      vitals.inp = inpValue || null;
      resolve(vitals);
    }

    // TTFB
    try {
      const nav = performance.getEntriesByType('navigation')[0];
      if (nav) {
        vitals.ttfb = Math.round(nav.responseStart - nav.requestStart);
      }
    } catch (e) {}

    // FCP
    try {
      const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
      if (fcpEntry) {
        vitals.fcp = Math.round(fcpEntry.startTime);
      }
    } catch (e) {}

    // LCP
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          const last = entries[entries.length - 1];
          vitals.lcp = Math.round(last.startTime);
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {}

    // CLS
    try {
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {}

    // INP (interaction to next paint)
    try {
      const inpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const duration = entry.duration || 0;
          if (duration > inpValue) {
            inpValue = duration;
          }
        }
      });
      inpObserver.observe({ type: 'event', buffered: true });
    } catch (e) {}

    // Resolve after 2 seconds to capture buffered entries
    setTimeout(finish, 2000);
  });
}

// ============================================
// Page Performance
// ============================================
function analyzePerformance() {
  const results = {
    loadTime: null,
    domContentLoaded: null,
    domSize: 0,
    resourceCounts: { scripts: 0, stylesheets: 0, fonts: 0, images: 0, total: 0 },
    totalTransferSize: 0,
  };

  // Load timing
  try {
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav) {
      results.loadTime = Math.round(nav.loadEventEnd - nav.startTime);
      results.domContentLoaded = Math.round(nav.domContentLoadedEventEnd - nav.startTime);
    }
  } catch (e) {}

  // DOM size
  results.domSize = document.querySelectorAll('*').length;

  // Resource counts
  try {
    const resources = performance.getEntriesByType('resource');
    results.resourceCounts.total = resources.length;
    for (const r of resources) {
      const type = r.initiatorType;
      if (type === 'script') results.resourceCounts.scripts++;
      else if (type === 'link' || type === 'css') results.resourceCounts.stylesheets++;
      else if (type === 'img') results.resourceCounts.images++;
      else if (r.name.match(/\.(woff2?|ttf|otf|eot)(\?|$)/i)) results.resourceCounts.fonts++;

      if (r.transferSize) results.totalTransferSize += r.transferSize;
    }
  } catch (e) {}

  return results;
}

// ============================================
// Text-to-HTML Ratio
// ============================================
function analyzeTextToHtml() {
  const htmlSize = document.documentElement.outerHTML.length;
  const bodyClone = document.body.cloneNode(true);
  bodyClone.querySelectorAll('script, style, noscript, svg, [hidden], [aria-hidden="true"]').forEach(el => el.remove());
  const textSize = (bodyClone.textContent || '').replace(/\s+/g, ' ').trim().length;
  const ratio = htmlSize > 0 ? +(textSize / htmlSize * 100).toFixed(1) : 0;

  return {
    textSize,
    htmlSize,
    ratio,
    status: ratio >= 25 ? 'good' : ratio >= 10 ? 'fair' : 'poor',
  };
}

// ============================================
// Above-the-fold Content Density
// ============================================
function analyzeAboveFold() {
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  let textElements = 0;
  let totalElements = 0;
  let textLength = 0;
  let imageCount = 0;
  let ctaCount = 0;

  const allElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, span, a, button, img, input, textarea');
  allElements.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < viewportHeight && rect.bottom > 0 && rect.left < viewportWidth && rect.right > 0) {
      totalElements++;
      const tag = el.tagName.toLowerCase();
      if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'span'].includes(tag)) {
        textElements++;
        textLength += (el.textContent || '').trim().length;
      }
      if (tag === 'img') imageCount++;
      if (tag === 'button' || tag === 'input' || (tag === 'a' && el.classList.length > 0)) ctaCount++;
    }
  });

  return {
    viewportHeight,
    viewportWidth,
    totalElements,
    textElements,
    textLength,
    imageCount,
    ctaCount,
  };
}

// ============================================
// Hreflang Tags
// ============================================
function analyzeHreflang() {
  const tags = document.querySelectorAll('link[rel="alternate"][hreflang]');
  const entries = [];
  tags.forEach(tag => {
    entries.push({
      lang: tag.getAttribute('hreflang'),
      href: tag.getAttribute('href'),
    });
  });

  const issues = [];
  if (entries.length > 0) {
    const hasXDefault = entries.some(e => e.lang === 'x-default');
    if (!hasXDefault) issues.push('Missing x-default hreflang');

    const currentUrl = window.location.href;
    const hasSelfRef = entries.some(e => {
      try { return new URL(e.href, window.location.origin).href === currentUrl; } catch { return false; }
    });
    if (!hasSelfRef) issues.push('Missing self-referencing hreflang');
  }

  return { count: entries.length, entries, issues };
}

// ============================================
// Structured Data Validation
// ============================================
function analyzeSchemaValidation() {
  const results = [];
  const requiredFields = {
    'Article': ['headline', 'author', 'datePublished', 'image'],
    'Product': ['name', 'image', 'offers'],
    'LocalBusiness': ['name', 'address', 'telephone'],
    'Organization': ['name', 'url', 'logo'],
    'Person': ['name'],
    'BreadcrumbList': ['itemListElement'],
    'FAQPage': ['mainEntity'],
    'HowTo': ['name', 'step'],
    'Recipe': ['name', 'recipeIngredient', 'recipeInstructions'],
    'Event': ['name', 'startDate', 'location'],
    'VideoObject': ['name', 'description', 'thumbnailUrl', 'uploadDate'],
    'Review': ['itemReviewed', 'reviewRating', 'author'],
    'WebSite': ['name', 'url'],
    'WebPage': ['name'],
  };

  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  scripts.forEach(script => {
    try {
      const data = JSON.parse(script.textContent);
      const items = data['@graph'] || (Array.isArray(data) ? data : [data]);
      items.forEach(item => {
        const type = Array.isArray(item['@type']) ? item['@type'][0] : item['@type'];
        if (!type) return;
        const required = requiredFields[type] || [];
        const missing = required.filter(f => !item[f] && !item[f.toLowerCase()]);
        results.push({
          type,
          valid: missing.length === 0,
          missingFields: missing,
          fieldCount: Object.keys(item).filter(k => !k.startsWith('@')).length,
        });
      });
    } catch (e) {}
  });

  return results;
}

// ============================================
// Lazy-loaded vs Eager Images
// ============================================
function analyzeLazyImages() {
  const images = document.querySelectorAll('img');
  let lazy = 0, eager = 0, noAttr = 0, dataSrc = 0;

  images.forEach(img => {
    const loading = img.getAttribute('loading');
    if (loading === 'lazy') lazy++;
    else if (loading === 'eager') eager++;
    else noAttr++;

    if (img.dataset.src || img.dataset.lazySrc || img.dataset.original) dataSrc++;
  });

  return {
    total: images.length,
    lazy,
    eager,
    noAttribute: noAttr,
    dataSrcPattern: dataSrc,
  };
}

// ============================================
// Mixed Content Detection
// ============================================
function analyzeMixedContent() {
  const isHttps = window.location.protocol === 'https:';
  if (!isHttps) return { isHttps: false, mixedCount: 0, items: [] };

  const items = [];
  // Check images
  document.querySelectorAll('img[src^="http:"]').forEach(el => {
    items.push({ type: 'image', url: el.getAttribute('src').substring(0, 100) });
  });
  // Check scripts
  document.querySelectorAll('script[src^="http:"]').forEach(el => {
    items.push({ type: 'script', url: el.getAttribute('src').substring(0, 100) });
  });
  // Check stylesheets
  document.querySelectorAll('link[rel="stylesheet"][href^="http:"]').forEach(el => {
    items.push({ type: 'stylesheet', url: el.getAttribute('href').substring(0, 100) });
  });
  // Check iframes
  document.querySelectorAll('iframe[src^="http:"]').forEach(el => {
    items.push({ type: 'iframe', url: el.getAttribute('src').substring(0, 100) });
  });

  return { isHttps, mixedCount: items.length, items: items.slice(0, 20) };
}

// ============================================
// iFrame Detection
// ============================================
function analyzeIframes() {
  const iframes = document.querySelectorAll('iframe');
  const items = [];

  iframes.forEach(iframe => {
    const src = iframe.getAttribute('src') || '';
    let type = 'unknown';
    if (src.includes('youtube.com') || src.includes('youtu.be')) type = 'youtube';
    else if (src.includes('vimeo.com')) type = 'vimeo';
    else if (src.includes('maps.google') || src.includes('google.com/maps')) type = 'google-maps';
    else if (src.includes('facebook.com')) type = 'facebook';
    else if (src.includes('twitter.com') || src.includes('x.com')) type = 'twitter';
    else if (src.includes('instagram.com')) type = 'instagram';
    else if (src) type = 'external';

    items.push({
      type,
      src: src.substring(0, 150),
      width: iframe.getAttribute('width') || iframe.style.width || 'auto',
      height: iframe.getAttribute('height') || iframe.style.height || 'auto',
      loading: iframe.getAttribute('loading') || 'none',
      title: (iframe.getAttribute('title') || '').substring(0, 60),
    });
  });

  return { count: iframes.length, items: items.slice(0, 20) };
}

// ============================================
// Full OG / Twitter Card Validation
// ============================================
function analyzeSocialCards() {
  const og = {};
  const twitter = {};
  const ogIssues = [];
  const twitterIssues = [];

  // Collect all OG tags
  document.querySelectorAll('meta[property^="og:"]').forEach(el => {
    const prop = el.getAttribute('property').replace('og:', '');
    og[prop] = el.getAttribute('content') || '';
  });

  // Collect all Twitter tags
  document.querySelectorAll('meta[name^="twitter:"]').forEach(el => {
    const name = el.getAttribute('name').replace('twitter:', '');
    twitter[name] = el.getAttribute('content') || '';
  });

  // Validate OG
  const ogRequired = ['title', 'description', 'image', 'url', 'type'];
  ogRequired.forEach(field => {
    if (!og[field]) ogIssues.push(`Missing og:${field}`);
  });
  if (og.title && og.title.length > 95) ogIssues.push('og:title too long (>95 chars)');
  if (og.description && og.description.length > 200) ogIssues.push('og:description too long (>200 chars)');

  // Validate Twitter
  if (!twitter.card) twitterIssues.push('Missing twitter:card');
  if (!twitter.title && !og.title) twitterIssues.push('Missing twitter:title (no OG fallback)');
  if (!twitter.description && !og.description) twitterIssues.push('Missing twitter:description (no OG fallback)');
  if (!twitter.image && !og.image) twitterIssues.push('Missing twitter:image (no OG fallback)');

  return {
    og: { tags: og, tagCount: Object.keys(og).length, issues: ogIssues },
    twitter: { tags: twitter, tagCount: Object.keys(twitter).length, issues: twitterIssues },
  };
}

// ============================================
// Favicon & RSS/Atom Feed Detection
// ============================================
function analyzeFaviconAndFeeds() {
  // Favicons
  const favicons = [];
  document.querySelectorAll('link[rel*="icon"]').forEach(el => {
    favicons.push({
      rel: el.getAttribute('rel'),
      href: el.getAttribute('href'),
      sizes: el.getAttribute('sizes') || null,
      type: el.getAttribute('type') || null,
    });
  });

  // RSS/Atom feeds
  const feeds = [];
  document.querySelectorAll('link[type="application/rss+xml"], link[type="application/atom+xml"]').forEach(el => {
    feeds.push({
      type: el.getAttribute('type').includes('rss') ? 'rss' : 'atom',
      title: el.getAttribute('title') || '',
      href: el.getAttribute('href'),
    });
  });

  return {
    favicon: { count: favicons.length, items: favicons, hasFavicon: favicons.length > 0 },
    feeds: { count: feeds.length, items: feeds },
  };
}

// ============================================
// Media Type Detection
// ============================================
function analyzeMediaTypes() {
  const videos = [];
  const audio = [];
  const pdfs = [];

  // Video elements
  document.querySelectorAll('video').forEach(el => {
    videos.push({ type: 'native', src: (el.getAttribute('src') || el.querySelector('source')?.getAttribute('src') || '').substring(0, 100) });
  });

  // Video embeds (iframes already captured, just count types here)
  document.querySelectorAll('iframe').forEach(iframe => {
    const src = iframe.getAttribute('src') || '';
    if (src.includes('youtube.com') || src.includes('youtu.be')) videos.push({ type: 'youtube', src: src.substring(0, 100) });
    else if (src.includes('vimeo.com')) videos.push({ type: 'vimeo', src: src.substring(0, 100) });
    else if (src.includes('wistia.')) videos.push({ type: 'wistia', src: src.substring(0, 100) });
  });

  // Audio elements
  document.querySelectorAll('audio').forEach(el => {
    audio.push({ src: (el.getAttribute('src') || el.querySelector('source')?.getAttribute('src') || '').substring(0, 100) });
  });

  // PDF links
  document.querySelectorAll('a[href$=".pdf"], a[href*=".pdf?"]').forEach(el => {
    pdfs.push({ href: el.getAttribute('href').substring(0, 100), text: (el.textContent || '').trim().substring(0, 60) });
  });

  return {
    videos: { count: videos.length, items: videos.slice(0, 10) },
    audio: { count: audio.length, items: audio.slice(0, 10) },
    pdfs: { count: pdfs.length, items: pdfs.slice(0, 10) },
  };
}

// ============================================
// Keyword Density (title/H1 terms in body)
// ============================================
function analyzeKeywordDensity() {
  const title = document.title || '';
  const h1 = document.querySelector('h1');
  const h1Text = h1 ? h1.textContent.trim() : '';

  const bodyClone = document.body.cloneNode(true);
  bodyClone.querySelectorAll('script, style, noscript, svg').forEach(el => el.remove());
  const bodyText = (bodyClone.textContent || '').toLowerCase();
  const bodyWords = bodyText.match(/[a-z0-9]+(?:['-][a-z0-9]+)*/g) || [];
  const totalWords = bodyWords.length;

  if (totalWords === 0) return { titleTerms: [], h1Terms: [], totalWords: 0 };

  const stopWords = new Set(['a','an','the','and','or','but','in','on','at','to','for','of','with','by','is','it','this','that','are','was','be','have','do','not','from','as','i','you','we','they','he','she','your','my','our','their']);

  function getTermDensity(text) {
    const words = text.toLowerCase().match(/[a-z0-9]+(?:['-][a-z0-9]+)*/g) || [];
    const meaningful = words.filter(w => !stopWords.has(w) && w.length > 2);
    return meaningful.map(term => {
      const count = bodyWords.filter(w => w === term).length;
      return { term, count, density: +(count / totalWords * 100).toFixed(2) };
    }).filter(t => t.count > 0);
  }

  return {
    titleTerms: getTermDensity(title),
    h1Terms: getTermDensity(h1Text),
    totalWords,
  };
}

// ============================================
// TOC / Anchor Navigation Detection
// ============================================
function analyzeTocNavigation() {
  // Check for elements with IDs that are linked to from the same page
  const anchors = document.querySelectorAll('a[href^="#"]');
  const jumpLinks = [];

  anchors.forEach(a => {
    const href = a.getAttribute('href');
    if (href === '#' || href === '#top') return;
    const targetId = href.substring(1);
    const target = document.getElementById(targetId);
    if (target) {
      jumpLinks.push({
        text: (a.textContent || '').trim().substring(0, 60),
        targetTag: target.tagName.toLowerCase(),
        targetId,
      });
    }
  });

  // Check for nav/toc containers
  const hasTocElement = !!(
    document.querySelector('[class*="toc"]') ||
    document.querySelector('[class*="table-of-contents"]') ||
    document.querySelector('[id*="toc"]') ||
    document.querySelector('nav[aria-label*="content"]')
  );

  return {
    hasToc: hasTocElement || jumpLinks.length >= 3,
    jumpLinkCount: jumpLinks.length,
    jumpLinks: jumpLinks.slice(0, 15),
  };
}
