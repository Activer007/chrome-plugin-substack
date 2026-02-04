// Popup Script
document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('status');
  const articleInfoEl = document.getElementById('articleInfo');
  const articleTitleEl = document.getElementById('articleTitle');
  const articleAuthorEl = document.getElementById('articleAuthor');
  const articleDateEl = document.getElementById('articleDate');
  const extractBtn = document.getElementById('extractBtn');
  const copyBtn = document.getElementById('copyBtn');
  const pdfBtn = document.getElementById('pdfBtn');
  const previewBtn = document.getElementById('previewBtn');
  const previewContainer = document.getElementById('previewContainer');
  const markdownPreview = document.getElementById('markdownPreview');
  const useFrontmatterEl = document.getElementById('useFrontmatter');
  const filenameFormatEl = document.getElementById('filenameFormat');

  if (!statusEl || !extractBtn || !previewBtn) {
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

       md += `# ${meta?.title || 'Untitled'}\n\n`;
    } else {
       md += `# ${meta?.title || 'Untitled'}\n\n`;
       if (meta?.authors?.length) {
         md += `**Author**: ${meta.authors.map(a => a.name).join(', ')}\n\n`;
       }
       if (meta?.datePublished) {
         try {
            md += `**Date**: ${new Date(meta.datePublished).toLocaleDateString()}\n\n`;
         } catch(e) {}
       }
       md += `**URL**: ${meta?.url || data.sourceUrl || ''}\n\n`;
       md += '---\n\n';
    }

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
     const safeTitle = title.replace(/[^\w\s\u4e00-\u9fa5-]/g, '').replace(/\s+/g, '-').substring(0, 50);

     let date = new Date().toISOString().split('T')[0];
     if (data.meta?.datePublished) {
       try { date = new Date(data.meta.datePublished).toISOString().split('T')[0]; } catch(e) {}
     }

     let author = 'unknown';
     if (data.meta?.authors && data.meta.authors.length > 0) {
        author = data.meta.authors[0].name || 'unknown';
     }
     const safeAuthor = author.replace(/[^\w\s\u4e00-\u9fa5-]/g, '').replace(/\s+/g, '-').substring(0, 30);

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

  async function extractAndDownload() {
    if (!articleData) return;
    try {
      extractBtn.disabled = true;
      extractBtn.innerHTML = 'Processing...';

      const md = generateMarkdown(articleData);
      const filename = generateFilename(articleData);
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      await chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: true
      });
      showStatus('✅ Downloaded!', 'success');
    } catch (e) {
      console.error(e);
      showStatus('Error: ' + e.message, 'error');
    } finally {
      extractBtn.disabled = false;
      extractBtn.innerHTML = 'Download Markdown';
    }
  }

  function previewMarkdown() {
    if (!articleData) return;
    const md = generateMarkdown(articleData);
    markdownPreview.textContent = md;
    previewContainer.style.display = 'block';
  }

  async function copyToClipboard() {
    if (!articleData) return;
    try {
      const md = generateMarkdown(articleData);
      await navigator.clipboard.writeText(md);
      showStatus('✅ Copied to clipboard!', 'success');
      setTimeout(() => {
        if (statusEl.textContent.includes('Copied')) {
           showStatus('Article detected', 'success');
        }
      }, 3000);
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
          // Create style element for print optimization
          const styleId = 'substack-print-style';
          let style = document.getElementById(styleId);

          if (!style) {
            style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
              @media print {
                /* Hide distractions */
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
                .pencraft.pc-display-flex {
                  display: none !important;
                }

                /* Layout overrides */
                body, html {
                  background-color: #fff !important;
                  background: #fff !important;
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
              }
            `;
            document.head.appendChild(style);
          }

          // Trigger print
          setTimeout(() => {
            window.print();
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

  extractBtn.addEventListener('click', extractAndDownload);
  copyBtn.addEventListener('click', copyToClipboard);
  pdfBtn.addEventListener('click', exportToPdf);
  previewBtn.addEventListener('click', previewMarkdown);

  await checkPage();
});
