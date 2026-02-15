/**
 * SEO Analyzer - Background Service Worker
 * Handles extension lifecycle and future background tasks
 */

// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('SEO Analyzer installed');
  } else if (details.reason === 'update') {
    console.log('SEO Analyzer updated to version', chrome.runtime.getManifest().version);
  }
});

// Future: Could add context menu, badge updates, etc.
