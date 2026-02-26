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

// Start analysis when popup opens
document.addEventListener('DOMContentLoaded', startAnalysis);

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
  section.classList.toggle('open');
}

// Make toggleSection globally available
window.toggleSection = toggleSection;

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
