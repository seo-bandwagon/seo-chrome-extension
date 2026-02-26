# SEO Analyzer Chrome Extension

A free, privacy-focused Chrome extension for one-click SEO analysis. Built by [SEO Bandwagon](https://seobandwagon.com).

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Manifest](https://img.shields.io/badge/manifest-v3-green)

## Features

- **Meta Tags Analysis** - Title, description, canonical, robots, Open Graph, Twitter Cards
- **Heading Structure** - H1-H6 visualization with hierarchy validation
- **Image Audit** - Alt text presence and quality check
- **Link Analysis** - Internal/external counts, nofollow/noopener detection
- **Schema Markup** - JSON-LD, Microdata, and RDFa detection

## Installation

### From Chrome Web Store
*Coming soon*

### Developer Mode

1. Clone this repository
2. Open `chrome://extensions` in Chrome
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `seo-chrome-extension` folder

## Privacy & Data Collection

This extension:
- ✅ Only analyzes pages when you click the icon
- ✅ No account required
- ✅ Data collection can be disabled with one click

**Data sharing (on by default):** When enabled, analysis results (URL, scores, meta tags, headings, images, links, schema, word counts, readability, and word frequency data) are sent to SEO Bandwagon servers to improve our SEO insights and services. No personally identifiable information is collected — data is associated with an anonymous session ID only.

You can disable data sharing at any time using the toggle at the bottom of the extension popup. When disabled, all analysis runs entirely locally with no data leaving your browser.

See our [Privacy Policy](https://seobandwagon.com/privacy) for full details.

## Development

```bash
# Clone
git clone https://github.com/keepkalm/seo-chrome-extension.git
cd seo-chrome-extension

# Load in Chrome
# Go to chrome://extensions → Developer mode → Load unpacked
```

## Project Structure

```
seo-chrome-extension/
├── manifest.json          # Extension manifest (v3)
├── src/
│   ├── popup/            # Popup UI
│   │   ├── popup.html
│   │   └── popup.js
│   ├── content/          # Content script (page analysis)
│   │   └── analyzer.js
│   ├── background/       # Service worker
│   │   └── service-worker.js
│   ├── styles/           # CSS
│   │   └── popup.css
│   └── icons/            # Extension icons
└── README.md
```

## Roadmap

### v0.2.0
- [ ] Export analysis as PDF/JSON
- [ ] Highlight issues on page
- [ ] History of analyzed pages

### v0.3.0
- [ ] Performance metrics (Core Web Vitals hints)
- [ ] Mobile-friendliness indicators
- [ ] Competitor comparison

### v1.0.0
- [ ] Chrome Web Store listing
- [ ] Full documentation
- [ ] Firefox port

## License

MIT License - see [LICENSE](LICENSE)

## Credits

Built by [SEO Bandwagon](https://seobandwagon.com) - Seattle's SEO Agency
