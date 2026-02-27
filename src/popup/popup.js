/**
 * SEO Analyzer - Popup Script
 * Handles UI and communication with content script
 */

// DOM elements
const loadingEl = document.getElementById('loading');
const resultsEl = document.getElementById('results');
const errorEl = document.getElementById('error');
const errorDetailEl = document.getElementById('errorDetail');
const overallScoreEl = document.getElementById('overallScore');
let currentTabUrl = '';

// Start analysis when popup opens
document.addEventListener('DOMContentLoaded', () => {
  startAnalysis();
  initDataToggle();

  // Dashboard button
  const dashBtn = document.getElementById('dashboardBtn');
  if (dashBtn) {
    dashBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('src/popup/dashboard.html') });
    });
  }
});

/**
 * Initialize data collection toggle
 */
async function initDataToggle() {
  const toggle = document.getElementById('dataToggle');
  if (!toggle) return;

  // Load saved preference
  const result = await chrome.storage.local.get('dataCollection');
  toggle.checked = result.dataCollection !== false; // default true

  toggle.addEventListener('change', () => {
    chrome.storage.local.set({ dataCollection: toggle.checked });
  });
}

/**
 * Start the page analysis
 */
async function startAnalysis() {
  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.url) {
      throw new Error('Cannot access this tab');
    }
    
    // Check if we can analyze this URL
    currentTabUrl = tab.url;

    if (tab.url.startsWith('chrome://') || 
        tab.url.startsWith('chrome-extension://') ||
        tab.url.startsWith('about:') ||
        tab.url.startsWith('edge://')) {
      throw new Error('Cannot analyze browser pages');
    }

    // Inject content script if needed and request analysis
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/content/analyzer.js']
      });
    } catch (e) {
      // Script might already be injected, continue
    }

    // Request analysis
    const results = await chrome.tabs.sendMessage(tab.id, { action: 'analyze' });
    
    if (results) {
      displayResults(results);
    } else {
      throw new Error('No response from page');
    }

  } catch (error) {
    showError(error.message);
  }
}

/**
 * Display analysis results
 */
function displayResults(data) {
  // Hide loading, show results
  loadingEl.classList.add('hidden');
  resultsEl.classList.remove('hidden');
  
  // Calculate overall score
  const scores = [
    data.meta.score,
    data.headings.score,
    data.images.score,
    data.links.score,
    data.schema.score,
    data.content.score,
    data.readability.score
  ];
  const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  
  // Set overall score
  overallScoreEl.textContent = `${overallScore}%`;
  overallScoreEl.className = 'score-badge ' + getScoreClass(overallScore);
  
  // Render each section
  renderContentSection(data.content);
  renderReadabilitySection(data.readability);
  renderNgramsSection(data.ngrams);
  renderMetaSection(data.meta);
  renderHeadingsSection(data.headings);
  renderImagesSection(data.images);
  renderLinksSection(data.links);
  renderSchemaSection(data.schema);
  
  // Open first section by default
  document.querySelector('.section').classList.add('open');

  // Render new sections
  if (data.webVitals) renderWebVitalsSection(data.webVitals);
  if (data.performance) renderPerformanceSection(data.performance);
  if (data.textToHtml) renderTextToHtmlSection(data.textToHtml);
  if (data.socialCards) renderSocialCardsSection(data.socialCards);
  if (data.hreflang) renderHreflangSection(data.hreflang);
  if (data.schemaValidation) renderSchemaValidationSection(data.schemaValidation);
  if (data.lazyImages) renderLazyImagesSection(data.lazyImages);
  if (data.mixedContent) renderMixedContentSection(data.mixedContent);
  if (data.iframes) renderIframesSection(data.iframes);
  if (data.keywordDensity) renderKeywordDensitySection(data.keywordDensity);
  if (data.mediaTypes) renderMediaTypesSection(data.mediaTypes);
  if (data.faviconAndFeeds) renderFaviconFeedsSection(data.faviconAndFeeds);
  if (data.aboveFold) renderAboveFoldSection(data.aboveFold);
  if (data.tocNavigation) renderTocSection(data.tocNavigation);

  // Send data to API (fire and forget)
  if (typeof sendAnalysis === 'function') {
    sendAnalysis(data);
  }
}

/**
 * Render Content (word/character count) section
 */
function renderContentSection(data) {
  const scoreEl = document.getElementById('contentScore');
  const contentEl = document.getElementById('contentContent');
  
  scoreEl.textContent = `${data.stats.words.toLocaleString()} words`;
  scoreEl.className = 'section-score ' + getScoreClass(data.score);
  
  let html = `
    <div class="stats-grid">
      <div class="stat">
        <div class="stat-value">${data.stats.words.toLocaleString()}</div>
        <div class="stat-label">Words</div>
      </div>
      <div class="stat">
        <div class="stat-value">${data.stats.characters.toLocaleString()}</div>
        <div class="stat-label">Characters</div>
      </div>
      <div class="stat">
        <div class="stat-value">${data.stats.sentences.toLocaleString()}</div>
        <div class="stat-label">Sentences</div>
      </div>
      <div class="stat">
        <div class="stat-value">~${data.stats.readingTimeMin}m</div>
        <div class="stat-label">Read Time</div>
      </div>
    </div>
    <div class="item">
      <div class="item-status info">ℹ</div>
      <div class="item-content">
        <div class="item-label">Characters (no spaces): ${data.stats.charactersNoSpaces.toLocaleString()}</div>
      </div>
    </div>
    <div class="item">
      <div class="item-status ${data.title.characters >= 30 && data.title.characters <= 60 ? 'pass' : 'warn'}">
        ${data.title.characters >= 30 && data.title.characters <= 60 ? '✓' : '!'}
      </div>
      <div class="item-content">
        <div class="item-label">Title: ${data.title.words} words, ${data.title.characters} chars</div>
      </div>
    </div>
    <div class="item">
      <div class="item-status ${data.description.characters >= 120 && data.description.characters <= 160 ? 'pass' : 'warn'}">
        ${data.description.characters >= 120 && data.description.characters <= 160 ? '✓' : '!'}
      </div>
      <div class="item-content">
        <div class="item-label">Meta Description: ${data.description.words} words, ${data.description.characters} chars</div>
      </div>
    </div>
  `;

  // Thin content warning
  if (data.stats.words < 300) {
    html += `
      <div class="item">
        <div class="item-status warn">!</div>
        <div class="item-content">
          <div class="item-label">Thin content — under 300 words</div>
          <div class="item-value">Search engines generally prefer pages with 300+ words of substantive content</div>
        </div>
      </div>
    `;
  }

  html += `
    <div class="item" style="border-top: 1px solid var(--gray-200); margin-top: 8px; padding-top: 8px;">
      <div class="item-status info">💡</div>
      <div class="item-content">
        <div class="item-value">Tip: Right-click selected text on any page → "Count words & characters"</div>
      </div>
    </div>
  `;
  
  contentEl.innerHTML = html;
}

/**
 * Render Readability section
 */
function renderReadabilitySection(data) {
  const scoreEl = document.getElementById('readabilityScore');
  const contentEl = document.getElementById('readabilityContent');
  
  if (data.message) {
    scoreEl.textContent = 'N/A';
    scoreEl.className = 'section-score';
    contentEl.innerHTML = `
      <div class="item">
        <div class="item-status info">ℹ</div>
        <div class="item-content"><div class="item-label">${data.message}</div></div>
      </div>
    `;
    return;
  }

  scoreEl.textContent = `${data.score}%`;
  scoreEl.className = 'section-score ' + getScoreClass(data.score);

  // Flesch ease label
  let easeLabel, easeStatus;
  if (data.fleschEase >= 80) { easeLabel = 'Very Easy (conversational)'; easeStatus = 'pass'; }
  else if (data.fleschEase >= 60) { easeLabel = 'Standard (good for web)'; easeStatus = 'pass'; }
  else if (data.fleschEase >= 40) { easeLabel = 'Somewhat Difficult'; easeStatus = 'warn'; }
  else if (data.fleschEase >= 20) { easeLabel = 'Difficult (academic)'; easeStatus = 'warn'; }
  else { easeLabel = 'Very Difficult'; easeStatus = 'fail'; }

  // Grade label
  let gradeLabel;
  if (data.fleschKincaid <= 6) gradeLabel = 'Elementary';
  else if (data.fleschKincaid <= 8) gradeLabel = 'Middle School';
  else if (data.fleschKincaid <= 12) gradeLabel = 'High School';
  else gradeLabel = 'College+';

  contentEl.innerHTML = `
    <div class="stats-grid">
      <div class="stat">
        <div class="stat-value">${data.fleschEase}</div>
        <div class="stat-label">Flesch Ease</div>
      </div>
      <div class="stat">
        <div class="stat-value">${data.fleschKincaid}</div>
        <div class="stat-label">Grade Level</div>
      </div>
      <div class="stat">
        <div class="stat-value">${data.avgSentenceLen}</div>
        <div class="stat-label">Words/Sentence</div>
      </div>
      <div class="stat">
        <div class="stat-value">${data.avgWordLen}</div>
        <div class="stat-label">Chars/Word</div>
      </div>
    </div>
    <div class="item">
      <div class="item-status ${easeStatus}">${getStatusIcon(easeStatus)}</div>
      <div class="item-content">
        <div class="item-label">Flesch Reading Ease: ${data.fleschEase} — ${easeLabel}</div>
        <div class="item-value">60+ recommended for web content. Higher = easier to read.</div>
      </div>
    </div>
    <div class="item">
      <div class="item-status info">ℹ</div>
      <div class="item-content">
        <div class="item-label">Grade Level: ${data.fleschKincaid} — ${gradeLabel}</div>
        <div class="item-value">Flesch-Kincaid grade. Most web content targets 6th–8th grade.</div>
      </div>
    </div>
    <div class="item">
      <div class="item-status info">ℹ</div>
      <div class="item-content">
        <div class="item-label">Avg syllables per word: ${data.syllablesPerWord}</div>
      </div>
    </div>
  `;
}

/**
 * Render N-grams / Word Combinations section
 */
function renderNgramsSection(data) {
  const scoreEl = document.getElementById('ngramsScore');
  const contentEl = document.getElementById('ngramsContent');
  
  scoreEl.textContent = `${data.uniqueWords} unique`;
  scoreEl.className = 'section-score';

  let html = `
    <div class="stats-grid">
      <div class="stat">
        <div class="stat-value">${data.totalWords.toLocaleString()}</div>
        <div class="stat-label">Total Words</div>
      </div>
      <div class="stat">
        <div class="stat-value">${data.uniqueWords.toLocaleString()}</div>
        <div class="stat-label">Unique Words</div>
      </div>
    </div>
  `;

  // Render each n-gram group
  const groups = [
    { label: 'Top Single Words', items: data.unigrams },
    { label: 'Top 2-Word Phrases', items: data.bigrams },
    { label: 'Top 3-Word Phrases', items: data.trigrams }
  ];

  groups.forEach(group => {
    html += `<div class="item-label" style="margin-top: 10px; margin-bottom: 6px; font-weight: 600;">${group.label}</div>`;
    if (group.items.length === 0) {
      html += `<div class="item-value" style="margin-bottom: 8px;">No repeated phrases found</div>`;
    } else {
      html += '<div class="ngram-list">';
      group.items.forEach((item, i) => {
        const barWidth = Math.max(8, Math.round((item.count / group.items[0].count) * 100));
        html += `
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 3px; font-size: 12px;">
            <span style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--gray-700);">${escapeHtml(item.phrase)}</span>
            <div style="width: 60px; height: 6px; background: var(--gray-100); border-radius: 3px; flex-shrink: 0;">
              <div style="width: ${barWidth}%; height: 100%; background: var(--primary); border-radius: 3px;"></div>
            </div>
            <span style="flex-shrink: 0; width: 24px; text-align: right; color: var(--gray-500); font-size: 11px;">${item.count}</span>
          </div>
        `;
      });
      html += '</div>';
    }
  });

  contentEl.innerHTML = html;
}

/**
 * Render Meta Tags section
 */
function renderMetaSection(data) {
  const scoreEl = document.getElementById('metaScore');
  const contentEl = document.getElementById('metaContent');
  
  scoreEl.textContent = `${data.score}%`;
  scoreEl.className = 'section-score ' + getScoreClass(data.score);
  
  let html = '';
  data.items.forEach(item => {
    html += `
      <div class="item">
        <div class="item-status ${item.status}">${getStatusIcon(item.status)}</div>
        <div class="item-content">
          <div class="item-label">${item.label}</div>
          <div class="item-value truncate">${escapeHtml(item.value)}</div>
          ${item.detail ? `<div class="item-value">${item.detail}</div>` : ''}
        </div>
      </div>
    `;
  });
  
  contentEl.innerHTML = html;
}

/**
 * Render Headings section
 */
function renderHeadingsSection(data) {
  const scoreEl = document.getElementById('headingsScore');
  const contentEl = document.getElementById('headingsContent');
  
  scoreEl.textContent = `${data.score}%`;
  scoreEl.className = 'section-score ' + getScoreClass(data.score);
  
  let html = `
    <div class="stats-grid">
      <div class="stat">
        <div class="stat-value">${data.stats.h1}</div>
        <div class="stat-label">H1</div>
      </div>
      <div class="stat">
        <div class="stat-value">${data.stats.h2}</div>
        <div class="stat-label">H2</div>
      </div>
      <div class="stat">
        <div class="stat-value">${data.stats.h3 + data.stats.h4}</div>
        <div class="stat-label">H3-H4</div>
      </div>
      <div class="stat">
        <div class="stat-value">${data.stats.total}</div>
        <div class="stat-label">Total</div>
      </div>
    </div>
  `;
  
  // Issues
  if (data.issues.length > 0) {
    data.issues.forEach(issue => {
      html += `
        <div class="item">
          <div class="item-status ${issue.type}">${getStatusIcon(issue.type)}</div>
          <div class="item-content">
            <div class="item-label">${issue.message}</div>
          </div>
        </div>
      `;
    });
  }
  
  // Heading tree
  if (data.items.length > 0) {
    html += '<div class="heading-tree">';
    data.items.slice(0, 20).forEach(h => {
      const indent = (h.level - 1) * 12;
      html += `
        <div class="heading-item" style="padding-left: ${indent}px">
          <span class="heading-tag ${h.tag}">${h.tag.toUpperCase()}</span>
          <span class="heading-text">${escapeHtml(h.text)}</span>
        </div>
      `;
    });
    if (data.items.length > 20) {
      html += `<div class="item-value">...and ${data.items.length - 20} more</div>`;
    }
    html += '</div>';
  }
  
  contentEl.innerHTML = html;
}

/**
 * Render Images section
 */
function renderImagesSection(data) {
  const scoreEl = document.getElementById('imagesScore');
  const contentEl = document.getElementById('imagesContent');
  
  scoreEl.textContent = `${data.score}%`;
  scoreEl.className = 'section-score ' + getScoreClass(data.score);
  
  let html = `
    <div class="stats-grid">
      <div class="stat">
        <div class="stat-value">${data.stats.total}</div>
        <div class="stat-label">Total</div>
      </div>
      <div class="stat">
        <div class="stat-value">${data.stats.withAlt}</div>
        <div class="stat-label">With Alt</div>
      </div>
      <div class="stat">
        <div class="stat-value">${data.stats.withoutAlt}</div>
        <div class="stat-label">Missing Alt</div>
      </div>
      <div class="stat">
        <div class="stat-value">${data.stats.decorative}</div>
        <div class="stat-label">Decorative</div>
      </div>
    </div>
  `;
  
  // Issues
  data.issues.forEach(issue => {
    html += `
      <div class="item">
        <div class="item-status ${issue.type}">${getStatusIcon(issue.type)}</div>
        <div class="item-content">
          <div class="item-label">${issue.message}</div>
        </div>
      </div>
    `;
  });
  
  // Show problem images first
  const problemImages = data.items.filter(i => i.status === 'fail' || i.status === 'warn');
  problemImages.slice(0, 10).forEach(img => {
    html += `
      <div class="item">
        <div class="item-status ${img.status}">${getStatusIcon(img.status)}</div>
        <div class="item-content">
          <div class="item-label">${escapeHtml(img.src)}</div>
          <div class="item-value">Alt: ${escapeHtml(img.alt)}</div>
        </div>
      </div>
    `;
  });
  
  if (problemImages.length > 10) {
    html += `<div class="item-value">...and ${problemImages.length - 10} more</div>`;
  }
  
  contentEl.innerHTML = html;
}

/**
 * Render Links section
 */
function renderLinksSection(data) {
  const scoreEl = document.getElementById('linksScore');
  const contentEl = document.getElementById('linksContent');
  
  scoreEl.textContent = `${data.score}%`;
  scoreEl.className = 'section-score ' + getScoreClass(data.score);
  
  let html = `
    <div class="stats-grid">
      <div class="stat">
        <div class="stat-value">${data.stats.total}</div>
        <div class="stat-label">Total</div>
      </div>
      <div class="stat">
        <div class="stat-value">${data.stats.internal}</div>
        <div class="stat-label">Internal</div>
      </div>
      <div class="stat">
        <div class="stat-value">${data.stats.external}</div>
        <div class="stat-label">External</div>
      </div>
      <div class="stat">
        <div class="stat-value">${data.stats.nofollow}</div>
        <div class="stat-label">Nofollow</div>
      </div>
    </div>
  `;
  
  // Issues
  data.issues.forEach(issue => {
    html += `
      <div class="item">
        <div class="item-status ${issue.type}">${getStatusIcon(issue.type)}</div>
        <div class="item-content">
          <div class="item-label">${issue.message}</div>
        </div>
      </div>
    `;
  });
  
  if (data.issues.length === 0) {
    html += `
      <div class="item">
        <div class="item-status pass">✓</div>
        <div class="item-content">
          <div class="item-label">No link issues detected</div>
        </div>
      </div>
    `;
  }

  // CTA link to full link analysis on seobandwagon.dev
  const currentUrl = encodeURIComponent(currentTabUrl);
  html += `
    <div class="section-cta" style="margin-top: 12px; text-align: center;">
      <a href="https://seobandwagon.dev/tools/link-analyzer?url=${currentUrl}" 
         target="_blank" rel="noopener" 
         style="color: #60a5fa; text-decoration: none; font-size: 13px; font-weight: 500;">
        Get detailed link analysis →
      </a>
    </div>
  `;
  
  contentEl.innerHTML = html;
}

/**
 * Render Schema section
 */
function renderSchemaSection(data) {
  const scoreEl = document.getElementById('schemaScore');
  const contentEl = document.getElementById('schemaContent');
  
  scoreEl.textContent = data.types.length > 0 ? '✓' : '✗';
  scoreEl.className = 'section-score ' + (data.types.length > 0 ? 'good' : 'bad');
  
  let html = '';
  
  if (data.types.length > 0) {
    html += `
      <div class="item">
        <div class="item-status pass">✓</div>
        <div class="item-content">
          <div class="item-label">${data.types.length} schema type(s) found</div>
        </div>
      </div>
      <div class="schema-types">
    `;
    data.types.forEach(type => {
      html += `<span class="schema-badge">${escapeHtml(type)}</span>`;
    });
    html += '</div>';
    
    // Format info
    const formats = [];
    if (data.jsonLd.length > 0) formats.push('JSON-LD');
    if (data.microdata.length > 0) formats.push('Microdata');
    if (data.rdfa) formats.push('RDFa');
    
    html += `
      <div class="item" style="margin-top: 12px">
        <div class="item-status info">ℹ</div>
        <div class="item-content">
          <div class="item-label">Format: ${formats.join(', ')}</div>
        </div>
      </div>
    `;
  } else {
    html += `
      <div class="item">
        <div class="item-status fail">✗</div>
        <div class="item-content">
          <div class="item-label">No schema markup detected</div>
          <div class="item-value">Add structured data to help search engines understand your content</div>
        </div>
      </div>
    `;
  }
  
  contentEl.innerHTML = html;
}

/**
 * Show error state
 */
function showError(message) {
  loadingEl.classList.add('hidden');
  errorEl.classList.remove('hidden');
  errorDetailEl.textContent = message;
}

/**
 * Toggle section open/closed
 */
function toggleSection(sectionId) {
  const section = document.querySelector(`[data-section="${sectionId}"]`);
  if (section) section.classList.toggle('open');
}

// Event delegation for section headers (MV3 blocks inline onclick)
document.addEventListener('click', (e) => {
  const header = e.target.closest('.section-header');
  if (header) {
    const section = header.closest('.section');
    if (section && section.dataset.section) {
      toggleSection(section.dataset.section);
    }
  }
});

/**
 * Get CSS class for score
 */
function getScoreClass(score) {
  if (score >= 80) return 'good';
  if (score >= 50) return 'warning';
  return 'bad';
}

/**
 * Get status icon
 */
function getStatusIcon(status) {
  switch (status) {
    case 'pass': return '✓';
    case 'warn': return '!';
    case 'fail': return '✗';
    case 'info': return 'ℹ';
    default: return '•';
  }
}

/**
 * Escape HTML entities
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// Render: Core Web Vitals
// ============================================
function renderWebVitalsSection(data) {
  const scoreEl = document.getElementById('webVitalsScore');
  const contentEl = document.getElementById('webVitalsContent');

  // Grade based on Google thresholds
  const lcpGood = data.lcp != null && data.lcp <= 2500;
  const clsGood = data.cls != null && data.cls <= 0.1;
  const inpGood = data.inp != null && data.inp <= 200;
  const goods = [lcpGood, clsGood, inpGood].filter(Boolean).length;

  scoreEl.textContent = goods === 3 ? 'Good' : goods >= 1 ? 'Needs Work' : 'Poor';
  scoreEl.className = 'section-score ' + (goods === 3 ? 'good' : goods >= 1 ? 'warning' : 'bad');

  contentEl.innerHTML = `
    <div class="stats-grid">
      <div class="stat">
        <div class="stat-value">${data.lcp != null ? (data.lcp / 1000).toFixed(1) + 's' : 'N/A'}</div>
        <div class="stat-label">LCP</div>
      </div>
      <div class="stat">
        <div class="stat-value">${data.cls != null ? data.cls : 'N/A'}</div>
        <div class="stat-label">CLS</div>
      </div>
      <div class="stat">
        <div class="stat-value">${data.inp != null ? data.inp + 'ms' : 'N/A'}</div>
        <div class="stat-label">INP</div>
      </div>
      <div class="stat">
        <div class="stat-value">${data.ttfb != null ? data.ttfb + 'ms' : 'N/A'}</div>
        <div class="stat-label">TTFB</div>
      </div>
    </div>
    <div class="item">
      <div class="item-status ${lcpGood ? 'pass' : 'warn'}">${lcpGood ? '✓' : '!'}</div>
      <div class="item-content">
        <div class="item-label">LCP: ${data.lcp != null ? (data.lcp / 1000).toFixed(1) + 's' : 'Not measured'}</div>
        <div class="item-value">Good: ≤2.5s | Needs Work: ≤4s | Poor: >4s</div>
      </div>
    </div>
    <div class="item">
      <div class="item-status ${clsGood ? 'pass' : 'warn'}">${clsGood ? '✓' : '!'}</div>
      <div class="item-content">
        <div class="item-label">CLS: ${data.cls != null ? data.cls : 'Not measured'}</div>
        <div class="item-value">Good: ≤0.1 | Needs Work: ≤0.25 | Poor: >0.25</div>
      </div>
    </div>
    <div class="item">
      <div class="item-status ${inpGood ? 'pass' : 'warn'}">${inpGood ? '✓' : '!'}</div>
      <div class="item-content">
        <div class="item-label">INP: ${data.inp != null ? data.inp + 'ms' : 'Not measured'}</div>
        <div class="item-value">Good: ≤200ms | Needs Work: ≤500ms | Poor: >500ms</div>
      </div>
    </div>
    ${data.fcp != null ? `<div class="item"><div class="item-status info">ℹ</div><div class="item-content"><div class="item-label">FCP: ${(data.fcp / 1000).toFixed(1)}s</div></div></div>` : ''}
  `;
}

// ============================================
// Render: Page Performance
// ============================================
function renderPerformanceSection(data) {
  const scoreEl = document.getElementById('performanceScore');
  const contentEl = document.getElementById('performanceContent');

  const loadSec = data.loadTime ? (data.loadTime / 1000).toFixed(1) + 's' : 'N/A';
  scoreEl.textContent = loadSec;
  scoreEl.className = 'section-score ' + (data.loadTime <= 3000 ? 'good' : data.loadTime <= 6000 ? 'warning' : 'bad');

  const transferKB = data.totalTransferSize ? (data.totalTransferSize / 1024).toFixed(0) + ' KB' : 'N/A';

  contentEl.innerHTML = `
    <div class="stats-grid">
      <div class="stat">
        <div class="stat-value">${loadSec}</div>
        <div class="stat-label">Load Time</div>
      </div>
      <div class="stat">
        <div class="stat-value">${data.domSize.toLocaleString()}</div>
        <div class="stat-label">DOM Elements</div>
      </div>
      <div class="stat">
        <div class="stat-value">${data.resourceCounts.total}</div>
        <div class="stat-label">Resources</div>
      </div>
      <div class="stat">
        <div class="stat-value">${transferKB}</div>
        <div class="stat-label">Transfer</div>
      </div>
    </div>
    <div class="item"><div class="item-status info">ℹ</div><div class="item-content"><div class="item-label">Scripts: ${data.resourceCounts.scripts} | Stylesheets: ${data.resourceCounts.stylesheets} | Fonts: ${data.resourceCounts.fonts} | Images: ${data.resourceCounts.images}</div></div></div>
    ${data.domSize > 1500 ? '<div class="item"><div class="item-status warn">!</div><div class="item-content"><div class="item-label">Large DOM (>1500 elements) — may impact rendering performance</div></div></div>' : ''}
  `;
}

// ============================================
// Render: Text-to-HTML Ratio
// ============================================
function renderTextToHtmlSection(data) {
  const scoreEl = document.getElementById('textToHtmlScore');
  const contentEl = document.getElementById('textToHtmlContent');

  scoreEl.textContent = data.ratio + '%';
  scoreEl.className = 'section-score ' + (data.status === 'good' ? 'good' : data.status === 'fair' ? 'warning' : 'bad');

  contentEl.innerHTML = `
    <div class="stats-grid">
      <div class="stat">
        <div class="stat-value">${data.ratio}%</div>
        <div class="stat-label">Ratio</div>
      </div>
      <div class="stat">
        <div class="stat-value">${(data.textSize / 1024).toFixed(1)}KB</div>
        <div class="stat-label">Text</div>
      </div>
      <div class="stat">
        <div class="stat-value">${(data.htmlSize / 1024).toFixed(1)}KB</div>
        <div class="stat-label">HTML</div>
      </div>
    </div>
    <div class="item">
      <div class="item-status ${data.status === 'good' ? 'pass' : data.status === 'fair' ? 'warn' : 'fail'}">${data.status === 'good' ? '✓' : '!'}</div>
      <div class="item-content">
        <div class="item-label">${data.status === 'good' ? 'Good ratio (25%+)' : data.status === 'fair' ? 'Fair ratio (10-25%) — consider reducing markup bloat' : 'Low ratio (<10%) — too much code vs content'}</div>
      </div>
    </div>
  `;
}

// ============================================
// Render: Social Cards
// ============================================
function renderSocialCardsSection(data) {
  const scoreEl = document.getElementById('socialCardsScore');
  const contentEl = document.getElementById('socialCardsContent');

  const totalIssues = data.og.issues.length + data.twitter.issues.length;
  scoreEl.textContent = totalIssues === 0 ? '✓' : totalIssues + ' issues';
  scoreEl.className = 'section-score ' + (totalIssues === 0 ? 'good' : 'warning');

  let html = '<div class="item-label" style="font-weight:600; margin-bottom:6px;">Open Graph</div>';
  if (data.og.tagCount === 0) {
    html += '<div class="item"><div class="item-status fail">✗</div><div class="item-content"><div class="item-label">No Open Graph tags found</div></div></div>';
  } else {
    html += `<div class="item"><div class="item-status ${data.og.issues.length === 0 ? 'pass' : 'warn'}">${data.og.issues.length === 0 ? '✓' : '!'}</div><div class="item-content"><div class="item-label">${data.og.tagCount} OG tags found</div></div></div>`;
    data.og.issues.forEach(i => { html += `<div class="item"><div class="item-status warn">!</div><div class="item-content"><div class="item-label">${escapeHtml(i)}</div></div></div>`; });
  }

  html += '<div class="item-label" style="font-weight:600; margin-top:10px; margin-bottom:6px;">Twitter Card</div>';
  if (data.twitter.tagCount === 0 && data.og.tagCount === 0) {
    html += '<div class="item"><div class="item-status fail">✗</div><div class="item-content"><div class="item-label">No Twitter Card tags (no OG fallback either)</div></div></div>';
  } else {
    html += `<div class="item"><div class="item-status ${data.twitter.issues.length === 0 ? 'pass' : 'info'}">${data.twitter.issues.length === 0 ? '✓' : 'ℹ'}</div><div class="item-content"><div class="item-label">${data.twitter.tagCount} Twitter tags${data.twitter.tagCount === 0 ? ' (using OG fallback)' : ''}</div></div></div>`;
    data.twitter.issues.forEach(i => { html += `<div class="item"><div class="item-status info">ℹ</div><div class="item-content"><div class="item-label">${escapeHtml(i)}</div></div></div>`; });
  }

  contentEl.innerHTML = html;
}

// ============================================
// Render: Hreflang
// ============================================
function renderHreflangSection(data) {
  const scoreEl = document.getElementById('hreflangScore');
  const contentEl = document.getElementById('hreflangContent');

  if (data.count === 0) {
    scoreEl.textContent = 'None';
    scoreEl.className = 'section-score';
    contentEl.innerHTML = '<div class="item"><div class="item-status info">ℹ</div><div class="item-content"><div class="item-label">No hreflang tags — single-language site</div></div></div>';
    return;
  }

  scoreEl.textContent = data.count + ' tags';
  scoreEl.className = 'section-score ' + (data.issues.length === 0 ? 'good' : 'warning');

  let html = '';
  data.entries.forEach(e => {
    html += `<div class="item"><div class="item-status pass">✓</div><div class="item-content"><div class="item-label">${escapeHtml(e.lang)}</div><div class="item-value truncate">${escapeHtml(e.href || '')}</div></div></div>`;
  });
  data.issues.forEach(i => {
    html += `<div class="item"><div class="item-status warn">!</div><div class="item-content"><div class="item-label">${escapeHtml(i)}</div></div></div>`;
  });

  contentEl.innerHTML = html;
}

// ============================================
// Render: Schema Validation
// ============================================
function renderSchemaValidationSection(data) {
  const scoreEl = document.getElementById('schemaValidationScore');
  const contentEl = document.getElementById('schemaValidationContent');

  if (!data || data.length === 0) {
    scoreEl.textContent = 'N/A';
    scoreEl.className = 'section-score';
    contentEl.innerHTML = '<div class="item"><div class="item-status info">ℹ</div><div class="item-content"><div class="item-label">No JSON-LD schema to validate</div></div></div>';
    return;
  }

  const valid = data.filter(d => d.valid).length;
  scoreEl.textContent = valid + '/' + data.length;
  scoreEl.className = 'section-score ' + (valid === data.length ? 'good' : 'warning');

  let html = '';
  data.forEach(item => {
    html += `<div class="item"><div class="item-status ${item.valid ? 'pass' : 'warn'}">${item.valid ? '✓' : '!'}</div><div class="item-content"><div class="item-label">${escapeHtml(item.type)} — ${item.fieldCount} fields</div>`;
    if (item.missingFields.length > 0) {
      html += `<div class="item-value">Missing: ${item.missingFields.map(f => escapeHtml(f)).join(', ')}</div>`;
    }
    html += '</div></div>';
  });

  contentEl.innerHTML = html;
}

// ============================================
// Render: Lazy Images
// ============================================
function renderLazyImagesSection(data) {
  const scoreEl = document.getElementById('lazyImagesScore');
  const contentEl = document.getElementById('lazyImagesContent');

  if (data.total === 0) {
    scoreEl.textContent = 'None';
    scoreEl.className = 'section-score';
    contentEl.innerHTML = '<div class="item"><div class="item-status info">ℹ</div><div class="item-content"><div class="item-label">No images on page</div></div></div>';
    return;
  }

  const lazyPct = Math.round(data.lazy / data.total * 100);
  scoreEl.textContent = lazyPct + '% lazy';
  scoreEl.className = 'section-score ' + (lazyPct >= 50 ? 'good' : lazyPct > 0 ? 'warning' : 'bad');

  contentEl.innerHTML = `
    <div class="stats-grid">
      <div class="stat"><div class="stat-value">${data.total}</div><div class="stat-label">Total</div></div>
      <div class="stat"><div class="stat-value">${data.lazy}</div><div class="stat-label">Lazy</div></div>
      <div class="stat"><div class="stat-value">${data.eager}</div><div class="stat-label">Eager</div></div>
      <div class="stat"><div class="stat-value">${data.noAttribute}</div><div class="stat-label">No Attr</div></div>
    </div>
    ${data.dataSrcPattern > 0 ? `<div class="item"><div class="item-status info">ℹ</div><div class="item-content"><div class="item-label">${data.dataSrcPattern} images use data-src pattern (JS lazy loading)</div></div></div>` : ''}
    ${data.noAttribute > 3 ? `<div class="item"><div class="item-status warn">!</div><div class="item-content"><div class="item-label">${data.noAttribute} images without loading attribute — add loading="lazy" for below-fold images</div></div></div>` : ''}
  `;
}

// ============================================
// Render: Mixed Content
// ============================================
function renderMixedContentSection(data) {
  const scoreEl = document.getElementById('mixedContentScore');
  const contentEl = document.getElementById('mixedContentContent');

  if (!data.isHttps) {
    scoreEl.textContent = 'HTTP';
    scoreEl.className = 'section-score bad';
    contentEl.innerHTML = '<div class="item"><div class="item-status fail">✗</div><div class="item-content"><div class="item-label">Page served over HTTP — not secure</div></div></div>';
    return;
  }

  scoreEl.textContent = data.mixedCount === 0 ? '✓ Secure' : data.mixedCount + ' mixed';
  scoreEl.className = 'section-score ' + (data.mixedCount === 0 ? 'good' : 'bad');

  let html = '';
  if (data.mixedCount === 0) {
    html = '<div class="item"><div class="item-status pass">✓</div><div class="item-content"><div class="item-label">No mixed content detected — all resources loaded over HTTPS</div></div></div>';
  } else {
    html = `<div class="item"><div class="item-status fail">✗</div><div class="item-content"><div class="item-label">${data.mixedCount} resource(s) loaded over HTTP</div></div></div>`;
    data.items.forEach(item => {
      html += `<div class="item"><div class="item-status warn">!</div><div class="item-content"><div class="item-label">${escapeHtml(item.type)}</div><div class="item-value truncate">${escapeHtml(item.url)}</div></div></div>`;
    });
  }

  contentEl.innerHTML = html;
}

// ============================================
// Render: iFrames
// ============================================
function renderIframesSection(data) {
  const scoreEl = document.getElementById('iframesScore');
  const contentEl = document.getElementById('iframesContent');

  scoreEl.textContent = data.count === 0 ? 'None' : data.count + ' found';
  scoreEl.className = 'section-score';

  if (data.count === 0) {
    contentEl.innerHTML = '<div class="item"><div class="item-status info">ℹ</div><div class="item-content"><div class="item-label">No iFrames detected</div></div></div>';
    return;
  }

  let html = '';
  data.items.forEach(item => {
    const titleWarn = !item.title ? ' (missing title attribute)' : '';
    html += `<div class="item"><div class="item-status ${item.title ? 'info' : 'warn'}">${item.title ? 'ℹ' : '!'}</div><div class="item-content"><div class="item-label">${escapeHtml(item.type)}${titleWarn}</div><div class="item-value truncate">${escapeHtml(item.src)}</div></div></div>`;
  });

  contentEl.innerHTML = html;
}

// ============================================
// Render: Keyword Density
// ============================================
function renderKeywordDensitySection(data) {
  const scoreEl = document.getElementById('keywordDensityScore');
  const contentEl = document.getElementById('keywordDensityContent');

  if (data.totalWords === 0) {
    scoreEl.textContent = 'N/A';
    scoreEl.className = 'section-score';
    contentEl.innerHTML = '<div class="item"><div class="item-status info">ℹ</div><div class="item-content"><div class="item-label">Not enough content to analyze</div></div></div>';
    return;
  }

  scoreEl.textContent = data.totalWords + ' words';
  scoreEl.className = 'section-score';

  let html = '';

  if (data.titleTerms && data.titleTerms.length > 0) {
    html += '<div class="item-label" style="font-weight:600; margin-bottom:6px;">Title Keywords in Body</div>';
    data.titleTerms.forEach(t => {
      const status = t.density >= 0.5 && t.density <= 3 ? 'pass' : t.density > 3 ? 'warn' : 'info';
      html += `<div class="item"><div class="item-status ${status}">${getStatusIcon(status)}</div><div class="item-content"><div class="item-label">"${escapeHtml(t.term)}" — ${t.count}× (${t.density}%)</div></div></div>`;
    });
  }

  if (data.h1Terms && data.h1Terms.length > 0) {
    html += '<div class="item-label" style="font-weight:600; margin-top:10px; margin-bottom:6px;">H1 Keywords in Body</div>';
    data.h1Terms.forEach(t => {
      const status = t.density >= 0.5 && t.density <= 3 ? 'pass' : t.density > 3 ? 'warn' : 'info';
      html += `<div class="item"><div class="item-status ${status}">${getStatusIcon(status)}</div><div class="item-content"><div class="item-label">"${escapeHtml(t.term)}" — ${t.count}× (${t.density}%)</div></div></div>`;
    });
  }

  if (html === '') {
    html = '<div class="item"><div class="item-status info">ℹ</div><div class="item-content"><div class="item-label">No meaningful title/H1 keywords to track</div></div></div>';
  }

  contentEl.innerHTML = html;
}

// ============================================
// Render: Media Types
// ============================================
function renderMediaTypesSection(data) {
  const scoreEl = document.getElementById('mediaTypesScore');
  const contentEl = document.getElementById('mediaTypesContent');

  const total = data.videos.count + data.audio.count + data.pdfs.count;
  scoreEl.textContent = total === 0 ? 'None' : total + ' found';
  scoreEl.className = 'section-score';

  if (total === 0) {
    contentEl.innerHTML = '<div class="item"><div class="item-status info">ℹ</div><div class="item-content"><div class="item-label">No video, audio, or PDF content detected</div></div></div>';
    return;
  }

  let html = `<div class="stats-grid">
    <div class="stat"><div class="stat-value">${data.videos.count}</div><div class="stat-label">Videos</div></div>
    <div class="stat"><div class="stat-value">${data.audio.count}</div><div class="stat-label">Audio</div></div>
    <div class="stat"><div class="stat-value">${data.pdfs.count}</div><div class="stat-label">PDFs</div></div>
  </div>`;

  data.videos.items.forEach(v => { html += `<div class="item"><div class="item-status info">🎬</div><div class="item-content"><div class="item-label">${escapeHtml(v.type)}</div><div class="item-value truncate">${escapeHtml(v.src)}</div></div></div>`; });
  data.pdfs.items.forEach(p => { html += `<div class="item"><div class="item-status info">📄</div><div class="item-content"><div class="item-label">${escapeHtml(p.text || 'PDF')}</div><div class="item-value truncate">${escapeHtml(p.href)}</div></div></div>`; });

  contentEl.innerHTML = html;
}

// ============================================
// Render: Favicon & Feeds
// ============================================
function renderFaviconFeedsSection(data) {
  const scoreEl = document.getElementById('faviconFeedsScore');
  const contentEl = document.getElementById('faviconFeedsContent');

  const hasFav = data.favicon.hasFavicon;
  const hasFeeds = data.feeds.count > 0;

  scoreEl.textContent = (hasFav ? '✓' : '✗') + ' / ' + (hasFeeds ? data.feeds.count + ' feed' : 'No feed');
  scoreEl.className = 'section-score ' + (hasFav ? 'good' : 'warning');

  let html = `<div class="item"><div class="item-status ${hasFav ? 'pass' : 'warn'}">${hasFav ? '✓' : '!'}</div><div class="item-content"><div class="item-label">Favicon: ${hasFav ? data.favicon.count + ' icon(s) defined' : 'Missing — add a favicon for brand recognition'}</div></div></div>`;

  if (hasFav) {
    data.favicon.items.forEach(f => {
      html += `<div class="item"><div class="item-status info">ℹ</div><div class="item-content"><div class="item-label">${escapeHtml(f.rel)}${f.sizes ? ' (' + f.sizes + ')' : ''}</div><div class="item-value truncate">${escapeHtml(f.href || '')}</div></div></div>`;
    });
  }

  html += `<div class="item" style="margin-top:8px;"><div class="item-status ${hasFeeds ? 'pass' : 'info'}">${hasFeeds ? '✓' : 'ℹ'}</div><div class="item-content"><div class="item-label">RSS/Atom: ${hasFeeds ? data.feeds.count + ' feed(s)' : 'None detected'}</div></div></div>`;

  data.feeds.items.forEach(f => {
    html += `<div class="item"><div class="item-status info">ℹ</div><div class="item-content"><div class="item-label">${escapeHtml(f.type.toUpperCase())}${f.title ? ': ' + escapeHtml(f.title) : ''}</div></div></div>`;
  });

  contentEl.innerHTML = html;
}

// ============================================
// Render: Above the Fold
// ============================================
function renderAboveFoldSection(data) {
  const scoreEl = document.getElementById('aboveFoldScore');
  const contentEl = document.getElementById('aboveFoldContent');

  scoreEl.textContent = data.totalElements + ' elements';
  scoreEl.className = 'section-score';

  contentEl.innerHTML = `
    <div class="stats-grid">
      <div class="stat"><div class="stat-value">${data.totalElements}</div><div class="stat-label">Elements</div></div>
      <div class="stat"><div class="stat-value">${data.textElements}</div><div class="stat-label">Text</div></div>
      <div class="stat"><div class="stat-value">${data.imageCount}</div><div class="stat-label">Images</div></div>
      <div class="stat"><div class="stat-value">${data.ctaCount}</div><div class="stat-label">CTAs</div></div>
    </div>
    <div class="item"><div class="item-status info">ℹ</div><div class="item-content"><div class="item-label">${data.textLength.toLocaleString()} characters of text above the fold</div></div></div>
    <div class="item"><div class="item-status info">ℹ</div><div class="item-content"><div class="item-label">Viewport: ${data.viewportWidth}×${data.viewportHeight}px</div></div></div>
    ${data.textLength < 200 ? '<div class="item"><div class="item-status warn">!</div><div class="item-content"><div class="item-label">Low text content above fold — users may not see value immediately</div></div></div>' : ''}
    ${data.ctaCount === 0 ? '<div class="item"><div class="item-status warn">!</div><div class="item-content"><div class="item-label">No CTAs above the fold</div></div></div>' : ''}
  `;
}

// ============================================
// Render: TOC
// ============================================
function renderTocSection(data) {
  const scoreEl = document.getElementById('tocScore');
  const contentEl = document.getElementById('tocContent');

  scoreEl.textContent = data.hasToc ? '✓ Found' : 'None';
  scoreEl.className = 'section-score ' + (data.hasToc ? 'good' : '');

  if (!data.hasToc && data.jumpLinkCount === 0) {
    contentEl.innerHTML = '<div class="item"><div class="item-status info">ℹ</div><div class="item-content"><div class="item-label">No table of contents or anchor navigation</div><div class="item-value">Long-form content benefits from a TOC for user experience and potential search features</div></div></div>';
    return;
  }

  let html = `<div class="item"><div class="item-status pass">✓</div><div class="item-content"><div class="item-label">${data.jumpLinkCount} anchor link(s) detected</div></div></div>`;

  data.jumpLinks.forEach(link => {
    html += `<div class="item"><div class="item-status info">ℹ</div><div class="item-content"><div class="item-label">${escapeHtml(link.text || '(no text)')}</div><div class="item-value">→ ${escapeHtml(link.targetTag)}#${escapeHtml(link.targetId)}</div></div></div>`;
  });

  contentEl.innerHTML = html;
}
