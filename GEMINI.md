# Gemini Context: chrome-plugin-substack

This `GEMINI.md` file provides essential context for the "Substack to Markdown" Chrome extension project.

## Project Overview

**Substack to Markdown** is a Chrome extension designed to extract content from Substack article pages (including custom domains) and convert it into a well-formatted Markdown file. It aims to preserve article metadata, content structure, and images while filtering out noise like navigation bars and subscription prompts.

### Key Features
*   **Smart Extraction:** Prioritizes JSON-LD structured data for metadata (title, author, date), falling back to DOM parsing if necessary.
*   **Markdown Generation:** Converts HTML content to standard Markdown, preserving headings, links, bold/italic text, and code blocks.
*   **Image Handling:** Keeps images in their original positions within the article.
*   **Broad Support:** Works on standard `substack.com/p/...` links, custom domains, and "Inbox/Reader" modes (`substack.com/inbox/post/...`).
*   **Privacy:** Runs entirely locally within the browser.

## Architecture & Codebase

The project follows the standard Chrome Extension V3 Manifest architecture.

### Key Files
*   **`manifest.json`**: The extension configuration. Defines permissions (`activeTab`, `scripting`, `downloads`, `host_permissions`), background service worker, and popup action.
*   **`popup.html`**: The user interface for the extension popup.
*   **`popup.js`**: **Core Logic.** Unlike many extensions that put logic in `content.js`, this project primarily uses `popup.js` to dynamically inject extraction scripts via `chrome.scripting.executeScript`. This allows for better control and avoids running on every page load.
    *   **Functions:** `checkPage`, `extractJsonLdData`, `extractMetaDataFromDOM`, `extractArticleContent`, `htmlToMarkdown`.
*   **`content.js`**: Minimal content script, currently acts as a fallback or placeholder.
*   **`background.js`**: Service worker, handles installation events.
*   **`icons/`**: Contains scripts (`generate-icons.py`, etc.) to generate extension icons.

### Data Extraction Strategy
1.  **Check Page:** Verify if the current URL is a supported Substack page.
2.  **Metadata:** Try parsing `<script type="application/ld+json">` first. If missing, scrape `document.title`, metadata tags, and specific DOM elements.
3.  **Content:** Locate the main content container (usually `.body.markup` or `main`). Traverse the DOM to build the Markdown string, handling specific Substack quirks (like "paywall" divs or subscribe buttons) by excluding them.
4.  **Download:** Generate a `.md` file blob and trigger a download via `chrome.downloads`.

## Development & Usage

### Installation (Developer Mode)
1.  Open Chrome and navigate to `chrome://extensions/`.
2.  Enable **Developer mode** (top right toggle).
3.  Click **Load unpacked**.
4.  Select the **project root directory** (`chrome-plugin-substack`).

### Workflow
*   **No Build Step:** The project uses vanilla JavaScript, HTML, and CSS. No `npm build` or compilation is required.
*   **Reloading:** After making changes to any file (especially `manifest.json` or `background.js`), go to `chrome://extensions/` and click the **reload** (circular arrow) icon for this extension.

### Debugging
*   **Popup Logs:** Right-click the extension icon -> "Inspect popup" to see `[Popup]` logs.
*   **Injected Script Logs:** Open the standard DevTools (F12) on the target Substack page to see `[Injected]` logs from the script running in the page context.

## Coding Conventions

*   **Log Prefixes:**
    *   `[Popup]`: Logs originating from the popup UI logic.
    *   `[Injected]`: Logs from the script executing inside the web page.
*   **Selectors:** Prefer robust selectors (like `[class*="post-header"]`) over brittle ones where possible, but use specific Substack class names (`.body.markup`) when necessary for precision.
*   **Filenames:** Ensure generated filenames are sanitized (remove illegal characters) but support international characters (e.g., Chinese titles).
