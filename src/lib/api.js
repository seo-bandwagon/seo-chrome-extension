/**
 * SEO Analyzer - API Client
 * Sends analysis data to seobandwagon.dev
 */

const API_BASE = 'https://seobandwagon.dev';
const ANALYSIS_ENDPOINT = `${API_BASE}/api/extension/analysis`;

/**
 * Get or create a persistent anonymous session ID
 */
async function getSessionId() {
  const result = await chrome.storage.local.get('sessionId');
  if (result.sessionId) return result.sessionId;

  const sessionId = crypto.randomUUID();
  await chrome.storage.local.set({ sessionId });
  return sessionId;
}

/**
 * Check if data collection is enabled (opt-in)
 */
async function isDataCollectionEnabled() {
  const result = await chrome.storage.local.get('dataCollection');
  // Default to true for new installs
  return result.dataCollection !== false;
}

/**
 * Send analysis results to the API
 * Fires and forgets — never blocks the UI
 */
async function sendAnalysis(data) {
  try {
    const enabled = await isDataCollectionEnabled();
    if (!enabled) return;

    const sessionId = await getSessionId();
    const version = chrome.runtime.getManifest().version;

    const payload = {
      url: data.url,
      meta: data.meta,
      headings: data.headings,
      images: data.images,
      links: data.links,
      schema: data.schema,
      content: data.content,
      readability: data.readability,
      ngrams: data.ngrams,
      extensionVersion: version,
      userAgent: navigator.userAgent,
      sessionId: sessionId,
    };

    const response = await fetch(ANALYSIS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SEO-Analyzer': `chrome-ext/${version}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn('SEO Analyzer: Failed to save analysis', response.status);
    }
  } catch (e) {
    // Silent fail — never interrupt the user experience
    console.warn('SEO Analyzer: Could not reach API', e.message);
  }
}
