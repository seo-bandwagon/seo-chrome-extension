/**
 * SEO Analyzer - Background Service Worker
 * Handles extension lifecycle, context menu, and background tasks
 */

// Create context menu on install/update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('SEO Analyzer installed');
  } else if (details.reason === 'update') {
    console.log('SEO Analyzer updated to version', chrome.runtime.getManifest().version);
  }

  // Context menu for selected text
  chrome.contextMenus.create({
    id: 'seo-count-selection',
    title: 'Count words & characters',
    contexts: ['selection']
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'seo-count-selection' && tab?.id) {
    try {
      // Inject content script if needed
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['src/content/analyzer.js']
        });
      } catch (e) {
        // Already injected
      }

      // Get count from content script
      const results = await chrome.tabs.sendMessage(tab.id, { action: 'countSelection' });

      if (results) {
        // Show results via a small injected notification
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: showCountNotification,
          args: [results]
        });
      }
    } catch (e) {
      console.error('Count selection failed:', e);
    }
  }
});

/**
 * Injected into the page to show a floating notification with count results
 */
function showCountNotification(stats) {
  // Remove existing notification if any
  const existing = document.getElementById('seo-analyzer-count');
  if (existing) existing.remove();

  const div = document.createElement('div');
  div.id = 'seo-analyzer-count';
  div.innerHTML = `
    <div style="
      position: fixed; top: 16px; right: 16px; z-index: 999999;
      background: #1e293b; color: #f1f5f9; border-radius: 10px;
      padding: 14px 18px; font-family: -apple-system, sans-serif;
      font-size: 13px; line-height: 1.6; box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      min-width: 200px; animation: seoFadeIn 0.2s ease-out;
    ">
      <div style="font-weight: 600; margin-bottom: 6px; font-size: 14px; color: #60a5fa;">
        📊 Text Count
      </div>
      <div><strong>${stats.words.toLocaleString()}</strong> words</div>
      <div><strong>${stats.characters.toLocaleString()}</strong> characters</div>
      <div><strong>${stats.charactersNoSpaces.toLocaleString()}</strong> chars (no spaces)</div>
      <div><strong>${stats.sentences.toLocaleString()}</strong> sentences</div>
      <div style="margin-top: 4px; color: #94a3b8; font-size: 12px;">
        ~${stats.readingTimeMin} min read
      </div>
    </div>
    <style>
      @keyframes seoFadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
    </style>
  `;

  document.body.appendChild(div);

  // Auto-dismiss after 4 seconds
  setTimeout(() => {
    div.style.transition = 'opacity 0.3s';
    div.style.opacity = '0';
    setTimeout(() => div.remove(), 300);
  }, 4000);
}
