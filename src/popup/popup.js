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
    data.schema.score
  ];
  const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  
  // Set overall score
  overallScoreEl.textContent = `${overallScore}%`;
  overallScoreEl.className = 'score-badge ' + getScoreClass(overallScore);
  
  // Render each section
  renderMetaSection(data.meta);
  renderHeadingsSection(data.headings);
  renderImagesSection(data.images);
  renderLinksSection(data.links);
  renderSchemaSection(data.schema);
  
  // Open first section by default
  document.querySelector('.section').classList.add('open');
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
