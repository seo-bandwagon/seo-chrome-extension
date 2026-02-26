/**
 * SEO Analyzer - Content Script
 * Analyzes the current page for SEO issues
 */

// Guard against duplicate injection — only add listener once
if (!window.__seoAnalyzerLoaded) {
  window.__seoAnalyzerLoaded = true;
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'analyze') {
      const results = analyzePage();
      sendResponse(results);
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
function analyzePage() {
  return {
    url: window.location.href,
    meta: analyzeMeta(),
    headings: analyzeHeadings(),
    images: analyzeImages(),
    links: analyzeLinks(),
    schema: analyzeSchema(),
    content: analyzeContent(),
    timestamp: Date.now()
  };
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
