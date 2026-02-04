// Popup Script
document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('status');
  const articleInfoEl = document.getElementById('articleInfo');
  const articleCoverEl = document.getElementById('articleCover');
  const articleTitleEl = document.getElementById('articleTitle');
  const articleAuthorEl = document.getElementById('articleAuthor');
  const articleDateEl = document.getElementById('articleDate');
  const extractBtn = document.getElementById('extractBtn');
  const extractZipBtn = document.getElementById('extractZipBtn');
  const copyBtn = document.getElementById('copyBtn');
  const pdfBtn = document.getElementById('pdfBtn');
  const obsidianBtn = document.getElementById('obsidianBtn');
  const previewBtn = document.getElementById('previewBtn');
  const previewModal = document.getElementById('previewModal');
  const closePreviewBtn = document.getElementById('closePreviewBtn');
  const markdownPreview = document.getElementById('markdownPreview');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsPanel = document.getElementById('settingsPanel');
  const useFrontmatterEl = document.getElementById('useFrontmatter');
  const filenameFormatEl = document.getElementById('filenameFormat');

  if (!statusEl || !extractBtn || !extractZipBtn || !previewBtn) {
    console.error('Missing required DOM elements');
    return;
  }

  // Load settings
  const savedFormat = localStorage.getItem('filenameFormat') || 'title-date';
  if (filenameFormatEl) {
    filenameFormatEl.value = savedFormat;
    filenameFormatEl.addEventListener('change', () => {
      localStorage.setItem('filenameFormat', filenameFormatEl.value);
    });
  }

  let articleData = null;

  // Check Page & Extract Data
  async function checkPage() {
    console.log('[Popup] ========== Checking Page ==========');
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // Basic URL checks
      const isSubstackUrl = tab.url && (
        tab.url.includes('substack.com') ||
        tab.url.match(/\/p\/[\w-]+/) ||
        tab.url.includes('/home/post/')
      );

      if (!tab.url || !isSubstackUrl) {
        showStatus('Please use on a Substack article page', 'info');
        return false;
      }

      // Inject extraction logic
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // --- INJECTED CODE START ---

          function extractJsonLdData() {
            const jsonLdScript = document.querySelector('script[type="application/ld+json"]');
            if (!jsonLdScript) return extractMetaDataFromDOM();
            try {
              const data = JSON.parse(jsonLdScript.textContent);
              return {
                title: data.headline || '',
                description: data.description || '',
                datePublished: data.datePublished || '',
                authors: Array.isArray(data.author)
                  ? data.author.map(a => ({ name: a.name || '', url: a.url || '' }))
                  : [{ name: data.author?.name || '', url: data.author?.url || '' }],
                publisher: { name: data.publisher?.name || '', url: data.publisher?.url || '' },
                image: data.image?.[0]?.url || data.image || '',
                url: data.url || window.location.href
              };
            } catch (e) {
              return extractMetaDataFromDOM();
            }
          }

          function extractMetaDataFromDOM() {
            let title = document.title || '';
            // Try to find better title if document.title is messy
            const h1 = document.querySelector('h1');
            if (h1) title = h1.textContent.trim();

            const authorLink = document.querySelector('.byline a') ||
                               Array.from(document.querySelectorAll('a')).find(a => a.href?.includes('/@'));
            const authorName = authorLink?.textContent?.trim() || '';

            const timeEl = document.querySelector('time');
            const dateText = timeEl ? timeEl.getAttribute('datetime') || timeEl.textContent : '';

            return {
              title,
              description: '',
              datePublished: dateText,
              authors: authorName ? [{ name: authorName, url: authorLink?.href || '' }] : [],
              publisher: { name: '', url: '' },
              image: '',
              url: window.location.href
            };
          }

          function htmlToMarkdown(element) {
            const clone = element.cloneNode(true);
            const processNode = (node) => {
              if (node.nodeType === Node.TEXT_NODE) return node.textContent;
              if (node.nodeType !== Node.ELEMENT_NODE) return '';

              const tag = node.tagName.toLowerCase();
              const children = Array.from(node.childNodes).map(processNode).join('');

              switch (tag) {
                case 'a':
                  let href = node.getAttribute('href') || '';

                  // Footnote support: convert <a href="#footnote-1">1</a> to [^1]
                  if ((node.classList.contains('footnote-anchor') || href.startsWith('#footnote-')) && !href.includes('http')) {
                    return `[^${children.trim()}]`;
                  }

                  if (node.classList.contains('button')) return children;
                  // Strip UTM
                  if (href.includes('utm_')) {
                    try {
                      const url = new URL(href);
                      Array.from(url.searchParams.keys()).forEach(k => k.startsWith('utm_') && url.searchParams.delete(k));
                      href = url.toString();
                    } catch (e) {}
                  }
                  return href ? `[${children.trim()}](${href})` : children;
                case 'strong': case 'b': return `**${children}**`;
                case 'em': case 'i': return `*${children}*`;
                case 'code': return `\`${children}\``;
                case 'br': return '\n';
                default: return children;
              }
            };
            return processNode(clone).trim();
          }

          function extractArticleContent() {
            // Find container
            const container = document.querySelector('.body.markup') ||
                              document.querySelector('main') ||
                              document.querySelector('article') ||
                              document.querySelector('#entry');

            if (!container) return { sections: [], fullText: '' };

            const sections = [];

            Array.from(container.children).forEach(el => {
              const tag = el.tagName.toLowerCase();

              // Skip utility elements
              if (el.classList.contains('button-wrapper') ||
                  el.textContent.includes('Subscribe') ||
                  el.textContent.includes('Sign in')) return;

              // Images
              const images = el.querySelectorAll('img');
              images.forEach(img => {
                if (img.width > 50 && !img.src.includes('avatar')) {
                  sections.push({ type: 'image', content: img.src, alt: img.alt });
                }
              });

              // Text
              const text = el.textContent.trim();
              if (!text && images.length === 0) return;

              if (tag === 'h2') sections.push({ type: 'h2', content: text });
              else if (tag === 'h3') sections.push({ type: 'h3', content: text });
              else if (tag === 'h4') sections.push({ type: 'h4', content: text });
              else if (tag === 'p' && text) sections.push({ type: 'paragraph', content: htmlToMarkdown(el) });
              else if (tag === 'ul' || tag === 'ol') {
                 const items = Array.from(el.querySelectorAll('li')).map(li => htmlToMarkdown(li));
                 if (items.length) sections.push({ type: 'list', content: items, ordered: tag === 'ol' });
              }
              else if (tag === 'blockquote') sections.push({ type: 'blockquote', content: htmlToMarkdown(el) });
              else if (tag === 'pre') sections.push({ type: 'code', content: text });
            });

            return { sections, fullText: container.textContent };
          }

          function extractLinks() {
            return Array.from(document.querySelectorAll('.body.markup a')).map(a => ({
               text: a.textContent.trim(),
               href: a.href
            })).filter(l => l.text && l.href && !l.href.includes('javascript'));
          }

          function extractFootnotes() {
            const footnotes = [];
            const footnoteDivs = document.querySelectorAll('.footnote');

            footnoteDivs.forEach(div => {
               // Extract ID from id="footnote-1"
               const id = div.id.replace('footnote-', '');

               // Process content
               // Clone to avoid modifying DOM and to remove back-links safely
               const clone = div.cloneNode(true);

               // Remove back links (e.g., arrows pointing back to text)
               const backLinks = clone.querySelectorAll('a[href^="#footnote-anchor-"]');
               backLinks.forEach(bl => bl.remove());

               // Convert to markdown
               // Remove leading numbers if present (e.g. "1. Note text" -> "Note text")
               let mdContent = htmlToMarkdown(clone).trim();
               mdContent = mdContent.replace(/^[0-9]+\.\s*/, '');

               if (id && mdContent) {
                  footnotes.push({ id, content: mdContent });
               }
            });

            return footnotes;
          }

          const meta = extractJsonLdData();
          const content = extractArticleContent();
          const links = extractLinks();
          const footnotes = extractFootnotes();

          return {
            meta,
            content,
            links,
            footnotes,
            sourceUrl: window.location.href
          };
          // --- INJECTED CODE END ---
        }
      });

      if (!results || !results[0] || !results[0].result) {
         showStatus('Failed to extract content', 'error');
         return false;
      }

      articleData = results[0].result;

      // Update UI
      if (articleData.meta) {
        articleTitleEl.textContent = articleData.meta.title || 'Untitled';
        articleAuthorEl.textContent = articleData.meta.authors?.map(a => a.name).join(', ') || '-';
        if (articleData.meta.datePublished) {
           try {
             articleDateEl.textContent = new Date(articleData.meta.datePublished).toLocaleDateString();
           } catch(e) { articleDateEl.textContent = '-'; }
        }

        // Show cover image if available
        if (articleData.meta.image && articleCoverEl) {
          articleCoverEl.src = articleData.meta.image;
          articleCoverEl.style.display = 'block';
        } else if (articleCoverEl) {
          articleCoverEl.style.display = 'none';
        }

        articleInfoEl.style.display = 'block';
        showStatus('Article detected', 'success');
      }

      return true;
    } catch (e) {
      console.error(e);
      showStatus('Error: ' + e.message, 'error');
      return false;
    }
  }

  function showStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.className = `status ${type}`;
  }

  function generateMarkdown(data) {
    const useFrontmatter = useFrontmatterEl.checked;
    const { meta, content, links } = data;
    let md = '';

    if (useFrontmatter) {
       md += '---\n';
       md += `title: "${(meta?.title || 'Untitled').replace(/"/g, '\\"')}"\n`;
       if (meta?.authors?.length) {
         md += `author: "${meta.authors.map(a => a.name).join(', ').replace(/"/g, '\\"')}"\n`;
       }
       if (meta?.datePublished) {
         try {
           md += `date: ${new Date(meta.datePublished).toISOString().split('T')[0]}\n`;
         } catch(e) {}
       }
       md += `url: "${meta?.url || data.sourceUrl || ''}"\n`;
       md += `tags: [substack, newsletter]\n`;
       if (meta?.publisher?.name) {
         md += `publisher: "${meta.publisher.name.replace(/"/g, '\\"')}"\n`;
       }
       md += '---\n\n';
    }

    md += `# ${meta?.title || 'Untitled'}\n\n`;

    if (meta?.authors?.length) {
      md += `**Author**: ${meta.authors.map(a => a.name).join(', ')}\n\n`;
    }
    if (meta?.publisher?.name) {
      md += `**Publisher**: ${meta.publisher.name}\n\n`;
    }
    if (meta?.datePublished) {
      try {
         md += `**Date**: ${new Date(meta.datePublished).toLocaleDateString()}\n\n`;
      } catch(e) {}
    }
    md += `**URL**: ${meta?.url || data.sourceUrl || ''}\n\n`;
    md += '---\n\n';

    if (meta?.image) {
      md += `![Cover](${meta.image})\n\n`;
    }

    if (meta?.description) {
      md += `> ${meta.description}\n\n`;
    }

    content.sections.forEach(section => {
       switch (section.type) {
          case 'h2': md += `## ${section.content}\n\n`; break;
          case 'h3': md += `### ${section.content}\n\n`; break;
          case 'h4': md += `#### ${section.content}\n\n`; break;
          case 'paragraph': md += `${section.content}\n\n`; break;
          case 'list':
            section.content.forEach(item => {
              md += `${section.ordered ? '1.' : '-'} ${item}\n`;
            });
            md += '\n';
            break;
          case 'blockquote': md += `> ${section.content}\n\n`; break;
          case 'code': md += '```\n' + section.content + '\n```\n\n'; break;
          case 'image':
             md += `![${section.alt || 'Image'}](${section.content})\n\n`;
             break;
       }
    });

    if (links && links.length > 0) {
      md += '---\n### Links\n\n';
      links.forEach(l => md += `- [${l.text}](${l.href})\n`);
    }

    if (data.footnotes && data.footnotes.length > 0) {
      md += '\n---\n### Footnotes\n\n';
      data.footnotes.forEach(fn => {
        md += `[^${fn.id}]: ${fn.content}\n`;
      });
    }

    return md;
  }

  function generateFilename(data) {
     const title = data.meta?.title || 'untitled';
     // Fix: Add fallback for empty titles (e.g. only emojis)
     const safeTitle = title.replace(/[^\w\s\u4e00-\u9fa5-]/g, '').replace(/\s+/g, '-').substring(0, 50) || 'untitled-post';

     let date = new Date().toISOString().split('T')[0];
     if (data.meta?.datePublished) {
       try {
         // Fix: Use local time instead of UTC to avoid date shifting
         // en-CA locale formats as YYYY-MM-DD
         date = new Date(data.meta.datePublished).toLocaleDateString('en-CA');
       } catch(e) {}
     }

     let author = 'unknown';
     if (data.meta?.authors && data.meta.authors.length > 0) {
        author = data.meta.authors[0].name || 'unknown';
     }
     // Fix: Add fallback for empty author names
     const safeAuthor = author.replace(/[^\w\s\u4e00-\u9fa5-]/g, '').replace(/\s+/g, '-').substring(0, 30) || 'unknown-author';

     const format = filenameFormatEl ? filenameFormatEl.value : 'title-date';

     switch (format) {
        case 'date-title':
            return `${date}-${safeTitle}.md`;
        case 'author-title':
            return `${safeAuthor}-${safeTitle}.md`;
        case 'title-date':
        default:
            return `${safeTitle}-${date}.md`;
     }
  }

  async function fetchImage(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Fetch failed');
      return await response.blob();
    } catch (e) {
      console.warn('Failed to fetch image:', url, e);
      return null;
    }
  }

  async function extractAndDownload(isZipMode = false) {
    if (!articleData) return;

    const activeBtn = isZipMode ? extractZipBtn : extractBtn;

    try {
      activeBtn.disabled = true;
      const originalText = activeBtn.innerHTML;
      activeBtn.innerHTML = isZipMode ? 'Initializing...' : 'Processing...';

      const filename = generateFilename(articleData);

      if (isZipMode) {
        // ZIP Mode Implementation
        if (typeof JSZip === 'undefined') {
          throw new Error('JSZip library not loaded');
        }

        const zip = new JSZip();
        const assetsFolder = zip.folder("assets");
        const imageMap = new Map();

        // 1. Collect all image URLs
        const urls = [];
        if (articleData.meta?.image) urls.push(articleData.meta.image);
        articleData.content.sections.forEach(s => {
          if (s.type === 'image') urls.push(s.content);
        });

        // Deduplicate
        const uniqueUrls = [...new Set(urls)];

        // 2. Download images
        activeBtn.innerHTML = `Downloading ${uniqueUrls.length} images...`;
        let downloadCount = 0;

        const downloadPromises = uniqueUrls.map(async (url, index) => {
           // Update progress (approximate since parallel)
           downloadCount++;
           if (downloadCount % 5 === 0 || downloadCount === uniqueUrls.length) {
              activeBtn.innerHTML = `Downloading images (${downloadCount}/${uniqueUrls.length})...`;
           }

           const blob = await fetchImage(url);
           if (blob) {
             // Generate extension from blob type or URL
             let ext = 'jpg';
             if (blob.type === 'image/png') ext = 'png';
             else if (blob.type === 'image/gif') ext = 'gif';
             else if (blob.type === 'image/webp') ext = 'webp';
             else if (blob.type === 'image/svg+xml') ext = 'svg';

             const imgName = `image-${index + 1}.${ext}`;
             assetsFolder.file(imgName, blob);
             imageMap.set(url, `assets/${imgName}`);
           }
        });

        await Promise.all(downloadPromises);

        // 3. Create modified data with local paths
        const localData = JSON.parse(JSON.stringify(articleData));

        if (localData.meta?.image && imageMap.has(localData.meta.image)) {
           localData.meta.image = imageMap.get(localData.meta.image);
        }

        localData.content.sections.forEach(s => {
           if (s.type === 'image' && imageMap.has(s.content)) {
              s.content = imageMap.get(s.content);
           }
        });

        // 4. Generate Markdown and ZIP
        activeBtn.innerHTML = 'Compressing...';
        const md = generateMarkdown(localData);
        zip.file(filename, md); // Use the same filename inside the zip

        const zipBlob = await zip.generateAsync({type:"blob"});
        const zipName = filename.replace(/\.md$/, '') + '.zip';
        const url = URL.createObjectURL(zipBlob);

        await chrome.downloads.download({
           url: url,
           filename: zipName,
           saveAs: true
        });
        setTimeout(() => URL.revokeObjectURL(url), 10000);

      } else {
        // Standard Markdown Mode
        const md = generateMarkdown(articleData);
        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        await chrome.downloads.download({
          url: url,
          filename: filename,
          saveAs: true
        });
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }

      showStatus(isZipMode ? 'ZIP Downloaded!' : 'Markdown Downloaded!', 'success');
      activeBtn.innerHTML = originalText;

    } catch (e) {
      console.error(e);
      showStatus('Error: ' + e.message, 'error');
      activeBtn.innerHTML = originalText;
    } finally {
      activeBtn.disabled = false;
    }
  }

  function previewMarkdown() {
    if (!articleData) return;
    const md = generateMarkdown(articleData);
    markdownPreview.textContent = md;
    previewModal.style.display = 'flex';
  }

  function closePreview() {
    previewModal.style.display = 'none';
  }

  function toggleSettings() {
    const isVisible = settingsPanel.style.display !== 'none';
    settingsPanel.style.display = isVisible ? 'none' : 'block';
    settingsBtn.style.color = isVisible ? '#888' : '#FF6719';
  }

  async function copyToClipboard() {
    if (!articleData) return;
    const originalHTML = copyBtn.innerHTML;
    try {
      const md = generateMarkdown(articleData);
      await navigator.clipboard.writeText(md);

      // Button feedback
      copyBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Copied!';
      copyBtn.style.color = '#1e8e3e';
      copyBtn.style.borderColor = '#1e8e3e';

      setTimeout(() => {
        copyBtn.innerHTML = originalHTML;
        copyBtn.style.color = '';
        copyBtn.style.borderColor = '';
      }, 2000);
    } catch (e) {
      console.error(e);
      showStatus('Failed to copy: ' + e.message, 'error');
    }
  }

  async function exportToPdf() {
    try {
      showStatus('Preparing PDF...', 'info');
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          console.log('[PDF Export] Starting PDF export...');

          // Check page structure
          const entry = document.getElementById('entry');
          const article = document.querySelector('article');
          const bodyMarkup = document.querySelector('.body.markup');
          const modalViewer = document.querySelector('[class*="modalViewer"]');
          const readerNavRoot = document.querySelector('.reader-nav-root');
          const readerNavPage = document.querySelector('.reader-nav-page');
          const paywall = document.querySelector('.paywall');

          console.log('[PDF Export] Page structure:', {
            hasEntry: !!entry,
            hasArticle: !!article,
            hasBodyMarkup: !!bodyMarkup,
            bodyMarkupLength: bodyMarkup?.textContent?.length || 0,
            bodyMarkupPreview: bodyMarkup?.textContent?.substring(0, 100),
            hasModalViewer: !!modalViewer,
            modalViewerClasses: modalViewer?.className,
            modalViewerPosition: modalViewer ? window.getComputedStyle(modalViewer).position : null,
            hasReaderNavRoot: !!readerNavRoot,
            hasReaderNavPage: !!readerNavPage,
            hasPaywall: !!paywall,
            articleInModal: modalViewer?.contains(article),
            readerNavContainsModal: readerNavRoot?.contains(modalViewer),
            url: window.location.href
          });

          // Log each element individually for better visibility
          console.log('[PDF Export] Element details:');
          console.log('  entry:', entry ? { id: entry.id, className: entry.className } : null);
          console.log('  article:', article ? { className: article.className } : null);
          console.log('  modalViewer:', modalViewer ? { className: modalViewer.className, position: window.getComputedStyle(modalViewer).position } : null);
          console.log('  readerNavRoot:', readerNavRoot ? { className: readerNavRoot.className } : null);
          console.log('  readerNavPage:', readerNavPage ? { className: readerNavPage.className } : null);

          // Create style element for print optimization
          const styleId = 'substack-print-style';
          let style = document.getElementById(styleId);

          // Always remove old style and recreate to ensure fresh styles
          if (style) {
            console.log('[PDF Export] Removing old print styles...');
            style.remove();
          }

          console.log('[PDF Export] Creating new print styles...');
          style = document.createElement('style');
          style.id = styleId;
          style.textContent = `
              @media print {
                /* Hide distractions - use specific selectors to avoid hiding article content */
                nav, header, footer, aside,
                #comments, .post-comments, .comments-section,
                .subscribe-widget, .subscription-widget, .subscribe-footer,
                .share-toolbar, .post-footer,
                .simple-heart-button, .like-button,
                div[class*="frontend-pencraft-Nav"],
                div[class*="settings-menu"],
                .dock,
                .button-wrapper,
                .secondary-actions,
                /* Logged-in page elements */
                .reader-nav-page,
                .paywall,
                [class*="sidebar"][class*="fixed"],
                [class*="pc-position-fixed"],
                .reader-onboarding-modal,
                [class*="modal-uY8Fz4"],
                /* Audio/video players */
                audio, video,
                [class*="player"],
                [class*="audio"],
                [class*="video"],
                /* Viewers and containers (keep modalViewer) */
                [class*="viewer"]:not([class*="modalViewer"]) {
                  display: none !important;
                }

                /* Hide ALL buttons - stronger rules */
                button,
                [class*="button"],
                [role="button"],
                [class*="btn"],
                .upgrade-btn,
                .cta-button,
                [class*="subscribe"],
                [class*="upgrade"] {
                  display: none !important;
                }

                /* Hide button containers */
                [class*="buttonWrapper"],
                [class*="button-wrapper"],
                [class*="action"],
                .actions,
                .toolbar {
                  display: none !important;
                }

                /* Layout overrides */
                body, html, #entry {
                  background-color: #fff !important;
                  background: #fff !important;
                  height: auto !important;
                  min-height: auto !important;
                  overflow: visible !important;
                  display: block !important;
                }

                /* Fix modalViewer - convert from fixed to static for printing */
                [class*="modalViewer"] {
                  position: static !important;
                  display: block !important;
                  width: 100% !important;
                  min-width: 100% !important;
                  height: auto !important;
                  min-height: auto !important;
                  max-height: none !important;
                  max-width: none !important;
                  overflow: visible !important;
                  z-index: auto !important;
                }

                /* Ensure all pencraft containers in the modal are visible (but NOT buttons) */
                [class*="modalViewer"] .pencraft:not(button):not([class*="button"]) {
                  position: static !important;
                }

                /* Force article to be visible */
                article {
                  display: block !important;
                  position: static !important;
                  width: 100% !important;
                  height: auto !important;
                  overflow: visible !important;
                }

                main, article, .body.markup, .single-post {
                  width: 100% !important;
                  max-width: 100% !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  border: none !important;
                  box-shadow: none !important;
                }

                /* Force body content to be visible */
                .body.markup {
                  display: block !important;
                  visibility: visible !important;
                  opacity: 1 !important;
                }

                /* Typography */
                body {
                  color: #000 !important;
                  font-size: 12pt;
                }

                h1 { font-size: 24pt !important; margin-bottom: 0.5em !important; }
                h2 { font-size: 18pt !important; margin-top: 1em !important; }
                p, li { line-height: 1.5 !important; }

                a {
                   text-decoration: underline;
                   color: #000 !important;
                }

                img {
                  max-width: 100% !important;
                  height: auto !important;
                  break-inside: avoid;
                }

                blockquote {
                  border-left: 3px solid #000 !important;
                  padding-left: 1em !important;
                }

                /* Remove all borders and shadows */
                *, *::before, *::after {
                  box-shadow: none !important;
                  text-shadow: none !important;
                }

                /* Remove borders from containers */
                [class*="modalViewer"],
                [class*="container"],
                [class*="viewer"],
                article,
                .post {
                  border: none !important;
                  outline: none !important;
                  box-shadow: none !important;
                  border-radius: 0 !important;
                }

                /* Hide bottom sections - likes, comments, restacks */
                [class*="like"],
                [class*="comment"],
                [class*="restack"],
                [class*="share"],
                .post-footer,
                .footer,
                [class*="interaction"],
                [class*="reaction"],
                .facepile,
                [class*="avatar"] {
                  display: none !important;
                }

                /* Hide subscribe sections at bottom */
                [class*="subscribe"],
                .upgrade-btn,
                .cta-section {
                  display: none !important;
                }

                /* CRITICAL: Force hide ALL buttons - must be last for highest priority */
                button,
                [class*="button"],
                [class*="iconButton"],
                [class*="Button"],
                [role="button"],
                span[data-state] button,
                div[data-state] button,
                .pencraft button,
                .pencraft[class*="button"],
                .pencraft[class*="Button"] {
                  display: none !important;
                  visibility: hidden !important;
                  opacity: 0 !important;
                  width: 0 !important;
                  height: 0 !important;
                  overflow: hidden !important;
                  position: absolute !important;
                  left: -9999px !important;
                }

                /* Force hide spans that contain buttons */
                span[data-state] {
                  display: none !important;
                }

                /* Hide top navigation/close buttons area */
                [class*="pc-padding-12"][class*="pc-mobile-padding-0"] > button {
                  display: none !important;
                }

                /* Hide audio players */
                svg[class*="lucide-chevron"],
                svg[class*="lucide-play"],
                svg[class*="lucide-pause"] {
                  display: none !important;
                }

                /* Hide specific button containers */
                .pc-gap-8:has(button) {
                  display: none !important;
                }
              }
            `;
            document.head.appendChild(style);
            console.log('[PDF Export] Print styles added to DOM');

          // Check which elements will be hidden
          console.log('[PDF Export] Checking visibility:');
          console.log('  - readerNavPage will be hidden:', readerNavPage?.matches('.reader-nav-page, .paywall, [class*="sidebar"][class*="fixed"], [class*="pc-position-fixed"], .reader-onboarding-modal, [class*="modal-uY8Fz4"]'));
          console.log('  - paywall will be hidden:', paywall?.matches('.reader-nav-page, .paywall, [class*="sidebar"][class*="fixed"], [class*="pc-position-fixed"], .reader-onboarding-modal, [class*="modal-uY8Fz4"]'));
          console.log('  - modalViewer will be hidden:', modalViewer?.matches('.reader-nav-page, .paywall, [class*="sidebar"][class*="fixed"], [class*="pc-position-fixed"], .reader-onboarding-modal, [class*="modal-uY8Fz4"]'));

          // Check parent chain for visibility issues
          if (article) {
            console.log('[PDF Export] Checking article parent chain:');
            let current = article;
            let depth = 0;
            while (current && depth < 20) {
              const computed = window.getComputedStyle(current);
              const isVisible = computed.display !== 'none' && computed.visibility !== 'hidden' && computed.opacity !== '0';
              console.log(`  [${depth}] ${current.tagName}.${current.className?.substring(0, 30)}: display=${computed.display}, visibility=${computed.visibility}, opacity=${computed.opacity}, position=${computed.position}, visible=${isVisible}`);
              if (current === document.body) break;
              current = current.parentElement;
              depth++;
            }
          }

          // Check if styles were actually applied
          const styleElement = document.getElementById(styleId);
          console.log('[PDF Export] Style element in DOM:', !!styleElement);
          console.log('[PDF Export] Style content length:', styleElement?.textContent?.length || 0);

          // Check body content before print
          console.log('[PDF Export] Body text content length:', document.body.textContent?.length || 0);
          console.log('[PDF Export] Article text content length:', article?.textContent?.length || 0);
          console.log('[PDF Export] Body markup text content length:', bodyMarkup?.textContent?.length || 0);

          // Verify print styles are in place
          console.log('[PDF Export] Verifying print styles...');
          const styleRules = document.styleSheets[0]?.cssRules || [];
          let foundPrintRule = false;
          for (let i = 0; i < styleRules.length; i++) {
            if (styleRules[i]?.cssText?.includes('@media print')) {
              foundPrintRule = true;
              console.log('[PDF Export] Found @media print rule');
              break;
            }
          }
          console.log('[PDF Export] Print rule found:', foundPrintRule);

          // Temporary: Apply print styles to screen for testing (remove @media print wrapper)
          console.log('[PDF Export] Applying test styles to screen...');
          const testStyleId = 'substack-print-test-style';
          let testStyle = document.getElementById(testStyleId);
          if (testStyle) testStyle.remove();

          testStyle = document.createElement('style');
          testStyle.id = testStyleId;
          // Extract print styles without @media wrapper
          testStyle.textContent = styleElement.textContent.replace(/@media print\s*{/, '').replace(/}\s*$/, '');
          document.head.appendChild(testStyle);

          console.log('[PDF Export] Test styles applied - check if article is now visible');
          console.log('[PDF Export] ModalViewer position now:', window.getComputedStyle(modalViewer).position);

          // Function to restore page
          const restorePage = () => {
            console.log('[PDF Export] Restoring page state...');
            const testStyleToRemove = document.getElementById(testStyleId);
            if (testStyleToRemove) {
              testStyleToRemove.remove();
              console.log('[PDF Export] ✓ Test styles removed, page restored');
            }
          };

          // Trigger print
          console.log('[PDF Export] Triggering window.print() in 100ms...');
          setTimeout(() => {
            console.log('[PDF Export] Calling window.print() now');
            window.print();
            console.log('[PDF Export] window.print() called');

            // Restore page after print dialog closes (delay to ensure dialog is handled)
            setTimeout(restorePage, 1000);
          }, 100);
        }
      });

      showStatus('Print dialog opened', 'success');
      setTimeout(() => {
         if (statusEl.textContent.includes('Print')) {
            showStatus('Article detected', 'success');
         }
      }, 3000);
    } catch (e) {
      console.error(e);
      showStatus('PDF Error: ' + e.message, 'error');
    }
  }

  async function saveToObsidian() {
    if (!articleData) return;
    try {
      const md = generateMarkdown(articleData);
      const filename = generateFilename(articleData).replace(/\.md$/, '');

      // 1. Copy content to clipboard (bypassing URL length limits)
      await navigator.clipboard.writeText(md);

      // 2. Open Obsidian URI
      // clipboard=true tells Obsidian to use clipboard content for the new note
      const uri = `obsidian://new?file=${encodeURIComponent(filename)}&clipboard=true`;
      window.open(uri, '_self');

      showStatus('✅ Sent to Obsidian!', 'success');
      setTimeout(() => {
        if (statusEl.textContent.includes('Obsidian')) {
           showStatus('Article detected', 'success');
        }
      }, 3000);
    } catch (e) {
      console.error(e);
      showStatus('Obsidian Error: ' + e.message, 'error');
    }
  }

  extractBtn.addEventListener('click', () => extractAndDownload(false));
  extractZipBtn.addEventListener('click', () => extractAndDownload(true));
  copyBtn.addEventListener('click', copyToClipboard);
  pdfBtn.addEventListener('click', exportToPdf);
  obsidianBtn.addEventListener('click', saveToObsidian);
  previewBtn.addEventListener('click', previewMarkdown);
  closePreviewBtn.addEventListener('click', closePreview);
  settingsBtn.addEventListener('click', toggleSettings);

  // Close modal when clicking outside
  previewModal.addEventListener('click', (e) => {
    if (e.target === previewModal) closePreview();
  });

  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && previewModal.style.display === 'flex') {
      closePreview();
    }
  });

  await checkPage();
});
