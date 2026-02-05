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
  const pdfDirectBtn = document.getElementById('pdfDirectBtn');
  const obsidianBtn = document.getElementById('obsidianBtn');
  const previewBtn = document.getElementById('previewBtn');
  const previewModal = document.getElementById('previewModal');
  const closePreviewBtn = document.getElementById('closePreviewBtn');
  const markdownPreview = document.getElementById('markdownPreview');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsPanel = document.getElementById('settingsPanel');
  const useFrontmatterEl = document.getElementById('useFrontmatter');
  const filenameFormatEl = document.getElementById('filenameFormat');
  // const imageModeEl = document.getElementById('imageMode'); // Removed
  const frontmatterTemplateEl = document.getElementById('frontmatterTemplate');
  const frontmatterTemplateContainer = document.getElementById('frontmatterTemplateContainer');
  const pdfShowCoverEl = document.getElementById('pdfShowCover');
  const pdfShowFootnotesEl = document.getElementById('pdfShowFootnotes');
  const pdfFontSizeEl = document.getElementById('pdfFontSize');

  if (!statusEl || !extractBtn || !extractZipBtn || !previewBtn) {
    console.error('Missing required DOM elements');
    return;
  }

  // --- Load Settings ---
  const settings = {
    filenameFormat: localStorage.getItem('filenameFormat') || 'title-date',
    useFrontmatter: localStorage.getItem('useFrontmatter') !== 'false', // Default true
    // imageMode: localStorage.getItem('imageMode') || 'url', // Removed
    frontmatterTemplate: localStorage.getItem('frontmatterTemplate') || '',
    pdfShowCover: localStorage.getItem('pdfShowCover') !== 'false', // Default true
    pdfShowFootnotes: localStorage.getItem('pdfShowFootnotes') !== 'false', // Default true
    pdfFontSize: localStorage.getItem('pdfFontSize') || '11'
  };

  // Initialize Inputs
  if (filenameFormatEl) {
    filenameFormatEl.value = settings.filenameFormat;
    filenameFormatEl.addEventListener('change', () => {
      settings.filenameFormat = filenameFormatEl.value;
      localStorage.setItem('filenameFormat', settings.filenameFormat);
    });
  }

  if (useFrontmatterEl) {
    useFrontmatterEl.checked = settings.useFrontmatter;
    if (frontmatterTemplateContainer) {
        frontmatterTemplateContainer.style.display = settings.useFrontmatter ? 'block' : 'none';
    }

    useFrontmatterEl.addEventListener('change', () => {
      settings.useFrontmatter = useFrontmatterEl.checked;
      localStorage.setItem('useFrontmatter', settings.useFrontmatter);
      if (frontmatterTemplateContainer) {
        frontmatterTemplateContainer.style.display = settings.useFrontmatter ? 'block' : 'none';
      }
    });
  }

  if (frontmatterTemplateEl) {
    frontmatterTemplateEl.value = settings.frontmatterTemplate;
    frontmatterTemplateEl.addEventListener('input', () => {
      settings.frontmatterTemplate = frontmatterTemplateEl.value;
      localStorage.setItem('frontmatterTemplate', settings.frontmatterTemplate);
    });
  }

  /* Removed Image Mode Listener
  if (imageModeEl) {
    imageModeEl.value = settings.imageMode;
    imageModeEl.addEventListener('change', () => {
      settings.imageMode = imageModeEl.value;
      localStorage.setItem('imageMode', settings.imageMode);
    });
  }
  */

  // PDF Settings
  if (pdfShowCoverEl) {
    pdfShowCoverEl.checked = settings.pdfShowCover;
    pdfShowCoverEl.addEventListener('change', () => {
      settings.pdfShowCover = pdfShowCoverEl.checked;
      localStorage.setItem('pdfShowCover', settings.pdfShowCover);
    });
  }

  if (pdfShowFootnotesEl) {
    pdfShowFootnotesEl.checked = settings.pdfShowFootnotes;
    pdfShowFootnotesEl.addEventListener('change', () => {
      settings.pdfShowFootnotes = pdfShowFootnotesEl.checked;
      localStorage.setItem('pdfShowFootnotes', settings.pdfShowFootnotes);
    });
  }

  if (pdfFontSizeEl) {
    pdfFontSizeEl.value = settings.pdfFontSize;
    pdfFontSizeEl.addEventListener('change', () => {
      settings.pdfFontSize = pdfFontSizeEl.value;
      localStorage.setItem('pdfFontSize', settings.pdfFontSize);
    });
  }

  let articleData = null;

  // Helper: Button Feedback Animation
  function setButtonFeedback(btn, status, message) {
    if (!btn) return;
    // Save original content if not already saved
    if (!btn.hasAttribute('data-original-html')) {
      btn.setAttribute('data-original-html', btn.innerHTML);
    }
    const originalHTML = btn.getAttribute('data-original-html');

    if (status === 'loading') {
      btn.disabled = true;
      // Preserve icon if possible, or just text
      btn.innerHTML = `<span class="loading-dots">${message || 'Processing'}</span>`;
    } else if (status === 'success') {
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" style="width:16px;height:16px;margin-right:4px;vertical-align:text-bottom;display:inline-block;">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/>
        </svg>
        <span>${message || 'Done'}</span>`;
      btn.style.color = '#1e8e3e';
      btn.style.borderColor = '#1e8e3e';

      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.style.color = '';
        btn.style.borderColor = '';
        btn.disabled = false;
      }, 3000);
    } else if (status === 'error') {
      btn.innerHTML = `<span>Error</span>`;
      btn.style.color = '#d32f2f';
      btn.style.borderColor = '#d32f2f';

      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.style.color = '';
        btn.style.borderColor = '';
        btn.disabled = false;
      }, 3000);
    }
  }

  // Check Page & Extract Data
  async function checkPage() {
    console.log('[Popup] ========== Checking Page ==========');
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // Basic URL checks - support multiple Substack URL formats:
      // 1. xxx.substack.com/p/xxx (standard)
      // 2. substack.com/inbox/post/p-xxx (inbox)
      // 3. substack.com/home/post/p-xxx (home)
      // 4. substack.com/@username/p-xxx (profile post - NEW)
      const isSubstackUrl = tab.url && (
        tab.url.includes('substack.com') ||
        tab.url.match(/\/p\/[\w-]+/) ||
        tab.url.includes('/home/post/') ||
        tab.url.match(/\/@[\w-]+\/p-\d+/)
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

              // 检查 JSON-LD 类型 - 如果是 Person 类型（用户资料页），则回退到 DOM/meta 提取
              // 这种情况发生在 /@username/p-xxx 格式的 URL
              if (data['@type'] === 'Person') {
                console.log('[Injected] JSON-LD is Person type, falling back to meta tags');
                return extractMetaDataFromDOM();
              }

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
            // 优先从 og:title 获取标题
            const ogTitle = document.querySelector('meta[property="og:title"]');
            let title = ogTitle?.content || document.title || '';

            // 如果 og:title 没有，尝试 h1
            if (!title) {
              const h1 = document.querySelector('h1');
              if (h1) title = h1.textContent.trim();
            }

            console.log('[Injected] extractMetaDataFromDOM - title:', title);

            // 智能查找当前文章链接 - 用于定位作者和发布者
            let currentPostLink = null;
            const currentUrl = window.location.href;

            // 策略1a: 匹配 /@username/p-xxx 格式 (profile post)
            const profileUrlMatch = currentUrl.match(/\/@[\w-]+\/p-(\d+)/);
            if (profileUrlMatch) {
              const postId = profileUrlMatch[1];
              console.log('[Injected] Profile URL detected, postId:', postId);

              // 查找包含 /p/ 的文章链接（不是 /p-xxx 格式，而是实际文章链接）
              const articleLinks = Array.from(document.querySelectorAll('a[href*="/p/"]')).filter(a => {
                const text = a.textContent?.trim() || '';
                // 排除短文本链接（如导航、按钮等）
                return text.length > 20 && !a.href.includes('utm_');
              });

              // 选择文本最长的作为标题链接
              if (articleLinks.length > 0) {
                currentPostLink = articleLinks.reduce((longest, current) => {
                  const currentText = current.textContent?.trim() || '';
                  const longestText = longest.textContent?.trim() || '';
                  return currentText.length > longestText.length ? current : longest;
                }, articleLinks[0]);

                // 使用找到的链接文本作为标题
                if (currentPostLink && currentPostLink.textContent.trim().length > title.length / 2) {
                  title = currentPostLink.textContent.trim();
                }
              }
            }

            // 策略1b: 直接匹配当前 URL 的 /p/ 链接
            if (!currentPostLink) {
              const urlMatch = currentUrl.match(/\/p\/([a-z0-9-]+)/);
              if (urlMatch) {
                const postId = urlMatch[1];
                currentPostLink = Array.from(document.querySelectorAll('a')).find(a =>
                  a.href && a.href.includes(`/p/${postId}`)
                );
              }
            }

            // 策略2: 如果没找到，尝试通过标题匹配
            if (!currentPostLink && title) {
              const titleFromUrl = title.split(' - ')[0].split(' |')[0].trim();
              currentPostLink = Array.from(document.querySelectorAll('a[href*="/p/"]')).find(a => {
                const linkText = a.textContent?.trim() || '';
                return linkText === titleFromUrl && linkText.length > 10;
              });
            }

            // 策略3: 选择文本最长的非推荐文章链接
            if (!currentPostLink) {
              const mainPostLinks = Array.from(document.querySelectorAll('a[href*="/p/"]')).filter(a => {
                return !a.className.includes('reader2-inbox-post') &&
                       !a.className.includes('linkRow') &&
                       !a.href.includes('utm_source');
              });
              currentPostLink = mainPostLinks.reduce((longest, current) => {
                const currentText = current.textContent?.trim() || '';
                const longestText = longest.textContent?.trim() || '';
                return currentText.length > longestText.length ? current : longest;
              }, mainPostLinks[0]);
            }

            // 提取作者 - 从文章链接附近查找
            let authorLink = null;
            let authorName = '';

            // 优先使用 .byline（普通文章页面）
            const bylineLink = document.querySelector('.byline a');
            if (bylineLink) {
              authorLink = bylineLink;
              authorName = bylineLink.textContent?.trim() || '';
            }

            // 如果没找到 .byline，从文章链接的父容器中查找
            if (!authorLink && currentPostLink && currentPostLink.parentElement) {
              // 向上查找 3 层
              let container = currentPostLink.parentElement;
              for (let i = 0; i < 3 && container; i++) {
                const nearbyAuthor = Array.from(container.querySelectorAll('a')).find(a =>
                  a.href && a.href.includes('/@') &&
                  a.textContent.trim().length > 2 &&
                  a.textContent.trim().length < 100
                );
                if (nearbyAuthor) {
                  authorLink = nearbyAuthor;
                  authorName = nearbyAuthor.textContent?.trim() || '';
                  break;
                }
                container = container.parentElement;
              }
            }

            // 最后的回退：全局搜索 /@ 链接（但排除侧边栏推荐）
            if (!authorName) {
              const allAuthorLinks = Array.from(document.querySelectorAll('a')).filter(a => {
                const href = a.href || '';
                const text = a.textContent?.trim() || '';
                return href.includes('/@') && text.length > 2 && text.length < 100;
              });

              // 过滤掉可能在侧边栏的作者
              const validAuthors = allAuthorLinks.filter(a => {
                const parent = a.parentElement;
                if (!parent) return true;
                // 排除包含 "reader2-inbox-post" 或 "linkRow" 的容器
                return !parent.closest('.reader2-inbox-post') && !parent.closest('.linkRow');
              });

              if (validAuthors.length > 0) {
                authorLink = validAuthors[0];
                authorName = validAuthors[0].textContent?.trim() || '';
              }
            }

            // 提取日期 - 优先使用 <time> 标签
            let dateText = '';
            const timeEl = document.querySelector('time');
            if (timeEl) {
              dateText = timeEl.getAttribute('datetime') || timeEl.textContent;
            } else {
              // 回退：使用正则表达式查找 "Jan 29, 2026" 或 "FEB 03, 2026" 格式的日期
              const dateRegex = /^[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}$/i;
              const allElements = Array.from(document.querySelectorAll('*'));
              const dateElement = allElements.find(el => {
                const text = el.textContent?.trim();
                return text && dateRegex.test(text) && el.children.length === 0;
              });
              if (dateElement) {
                dateText = dateElement.textContent?.trim() || '';

                // 策略：从日期元素附近查找作者 (/@username/p-xxx 页面结构)
                // 日期的祖父元素通常包含作者链接
                const dateParent = dateElement.parentElement?.parentElement;
                if (dateParent && !authorName) {
                  const nearbyAuthorLinks = Array.from(dateParent.querySelectorAll('a[href*="/@"]')).filter(a => {
                    const text = a.textContent?.trim() || '';
                    return text.length > 2 && text.length < 50 && !text.match(/^\d+[hmd]?$/);
                  });
                  if (nearbyAuthorLinks.length > 0) {
                    // 获取所有作者
                    const authors = nearbyAuthorLinks.map(a => ({
                      name: a.textContent?.trim() || '',
                      url: a.href || ''
                    }));
                    if (authors.length > 0) {
                      authorName = authors.map(a => a.name).join(', ');
                      authorLink = nearbyAuthorLinks[0];
                      console.log('[Injected] Found authors from date parent:', authorName);
                    }
                  }
                }
              }
            }

            console.log('[Injected] extractMetaDataFromDOM - date:', dateText, 'author:', authorName);

            // 提取发布者名称
            let pubName = '';
            let pubUrl = '';

            if (currentPostLink && currentPostLink.href) {
              const urlMatch = currentPostLink.href.match(/https?:\/\/([^\/]+)\//);
              if (urlMatch) {
                const domain = urlMatch[1];
                // 找指向该域名的发布者链接
                const pubLinks = Array.from(document.querySelectorAll('a')).filter(a =>
                  a.href && a.href.includes(domain) && !a.href.includes('/p/')
                );

                // 过滤掉订阅按钮和非正式链接
                const validLinks = pubLinks.filter(a => {
                  const text = a.textContent?.trim().toLowerCase() || '';
                  const href = a.href || '';

                  // 排除按钮和订阅相关链接
                  if (text.includes('subscribe') || text.includes('upgrade') ||
                      text.includes('sign in') || text.includes('already a') ||
                      href.includes('/subscribe') || href.includes('/sign-in')) {
                    return false;
                  }

                  // 文本长度合理（3-100字符），非空
                  const textLength = a.textContent?.trim().length || 0;
                  return textLength >= 3 && textLength <= 100;
                });

                // 选择文本最短的作为发布者链接
                const pubLink = validLinks.reduce((shortest, current) => {
                  const currentText = current.textContent?.trim() || '';
                  const shortestText = shortest.textContent?.trim() || '';
                  if (!shortestText) return current;
                  return currentText.length < shortestText.length ? current : shortest;
                }, validLinks[0]);

                if (pubLink) {
                  pubName = pubLink.textContent?.trim() || '';
                  pubUrl = pubLink.href || '';
                }
              }
            }

            // 提取封面图片 - 优先使用 og:image 或 twitter:image
            let coverImage = '';
            const ogImage = document.querySelector('meta[property="og:image"]');
            const twitterImage = document.querySelector('meta[name="twitter:image"]');
            if (ogImage && ogImage.content) {
              coverImage = ogImage.content;
            } else if (twitterImage && twitterImage.content) {
              coverImage = twitterImage.content;
            }

            return {
              title,
              description: '',
              datePublished: dateText,
              authors: authorName ? [{ name: authorName, url: authorLink?.href || '' }] : [],
              publisher: { name: pubName, url: pubUrl },
              image: coverImage,
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

        // Set cover image (for immersive card background)
        console.log('[Popup] Cover image handling:');
        console.log('[Popup]   - articleCoverEl exists:', !!articleCoverEl);
        console.log('[Popup]   - meta.image value:', articleData.meta.image);
        if (articleCoverEl) {
          if (articleData.meta.image) {
            console.log('[Popup]   - Setting cover src to:', articleData.meta.image);
            articleCoverEl.src = articleData.meta.image;

            // Debug: Check if image loads successfully
            articleCoverEl.onload = () => {
              console.log('[Popup]   - Cover image loaded successfully');
              console.log('[Popup]   - Image dimensions:', articleCoverEl.naturalWidth, 'x', articleCoverEl.naturalHeight);
            };
            articleCoverEl.onerror = (e) => {
              console.error('[Popup]   - Cover image FAILED to load:', e);
              console.log('[Popup]   - Failed URL:', articleCoverEl.src);
            };
          } else {
            console.log('[Popup]   - No image URL in meta data');
          }
          // Always keep visible - CSS fallback gradient handles missing images
        } else {
          console.error('[Popup]   - articleCoverEl element NOT FOUND in DOM!');
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

  function generateMarkdown(data, imageMap = null) {
    const useFrontmatter = settings.useFrontmatter;
    const { meta, content, links } = data;
    let md = '';

    if (useFrontmatter) {
       // Custom Frontmatter Logic
       const tmpl = settings.frontmatterTemplate;
       if (tmpl && tmpl.trim()) {
          let fm = tmpl;
          const vars = {
             title: (meta?.title || 'Untitled').replace(/"/g, '\\"'),
             url: meta?.url || data.sourceUrl || '',
             date: '',
             author: (meta?.authors || []).map(a => a.name).join(', ').replace(/"/g, '\\"')
          };

          if (meta?.datePublished) {
            try {
              vars.date = new Date(meta.datePublished).toISOString().split('T')[0];
            } catch(e) {}
          }

          // Replace variables
          Object.keys(vars).forEach(k => {
             // Regex to replace all occurrences of {key}
             fm = fm.replace(new RegExp(`{${k}}`, 'g'), vars[k]);
          });

          md += '---\n' + fm + '\n---\n\n';
       } else {
          // Default Frontmatter
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
      let coverSrc = meta.image;
      if (imageMap && imageMap.has(coverSrc)) {
         coverSrc = imageMap.get(coverSrc);
      }
      md += `![Cover](${coverSrc})\n\n`;
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
             let imgSrc = section.content;
             if (imageMap && imageMap.has(imgSrc)) {
                imgSrc = imageMap.get(imgSrc);
             }
             // Local path for ZIP mode
             // If imageMap has value 'assets/xxx.jpg', it uses that.
             // If Base64 mode, it uses data URI.
             md += `![${section.alt || 'Image'}](${imgSrc})\n\n`;
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
      setButtonFeedback(activeBtn, 'loading', isZipMode ? 'Packing...' : 'Generating...');

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
        if (uniqueUrls.length > 0) {
           activeBtn.innerHTML = `<span>Img (${uniqueUrls.length})...</span>`;
        }

        let downloadCount = 0;
        const downloadPromises = uniqueUrls.map(async (url, index) => {
           const blob = await fetchImage(url);
           if (blob) {
             let ext = 'jpg';
             if (blob.type === 'image/png') ext = 'png';
             else if (blob.type === 'image/gif') ext = 'gif';
             else if (blob.type === 'image/webp') ext = 'webp';
             else if (blob.type === 'image/svg+xml') ext = 'svg';

             const imgName = `image-${index + 1}.${ext}`;
             assetsFolder.file(imgName, blob);
             imageMap.set(url, `assets/${imgName}`);
           }
           downloadCount++;
        });

        await Promise.all(downloadPromises);

        // 3. Create modified data with local paths
        const localData = JSON.parse(JSON.stringify(articleData));
        // We actually pass imageMap to generateMarkdown, so we don't strictly need localData modification,
        // but generateMarkdown handles imageMap lookups.

        // 4. Generate Markdown and ZIP
        // Pass imageMap to use local asset paths
        const md = generateMarkdown(localData, imageMap);
        zip.file(filename, md);

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
      setButtonFeedback(activeBtn, 'success', 'Saved');

    } catch (e) {
      console.error(e);
      showStatus('Error: ' + e.message, 'error');
      setButtonFeedback(activeBtn, 'error', 'Failed');
    }
  }

  function previewMarkdown() {
    if (!articleData) return;
    // Preview uses default settings (no base64 usually)
    const md = generateMarkdown(articleData);
    markdownPreview.textContent = md;
    previewModal.style.display = 'flex';
  }

  function closePreview() {
    previewModal.style.display = 'none';
  }

  function toggleSettings() {
    settingsPanel.classList.toggle('open');
    const isOpen = settingsPanel.classList.contains('open');
    settingsBtn.style.color = isOpen ? '#FF6719' : '#888';
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
                /* Navigation elements that cause large blank space */
                [class*="pc-paddingTop-24"][class*="pc-justifyContent-center"] {
                  display: none !important;
                }

                /* Hide buttons - use specific selectors to avoid hiding article content */
                button:not([class*="Link"]),
                [class*="buttonBase"],
                [class*="iconButton"],
                [class*="buttonText"],
                [class*="buttonStyle"],
                .upgrade-btn,
                .cta-button {
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
                  /* Reset padding/margin that cause top spacing */
                  padding: 0 !important;
                  margin: 0 !important;
                }

                /* Reset all padding/margin inside modalViewer to eliminate top spacing */
                [class*="modalViewer"] > div,
                [class*="modalViewer"] div[class*="viewer"],
                [class*="modalViewer"] .pencraft {
                  padding: 0 !important;
                  margin: 0 !important;
                }

                /* Reset specific Substack pencraft padding classes */
                [class*="modalViewer"] [class*="pc-padding"],
                [class*="modalViewer"] [class*="pc-flexDirection-column"],
                [class*="modalViewer"] [class*="pc-justifyContent"] {
                  padding-top: 0 !important;
                  padding-bottom: 0 !important;
                  padding-left: 0 !important;
                  padding-right: 0 !important;
                  margin-top: 0 !important;
                  margin-bottom: 0 !important;
                }

                /* Ensure all pencraft containers in the modal are visible (but NOT buttons) */
                [class*="modalViewer"] .pencraft:not(button):not([class*="button"]) {
                  position: static !important;
                  display: block !important;
                  height: auto !important;
                  min-height: auto !important;
                  max-height: none !important;
                }

                /* Ensure all containers in modalViewer have auto height */
                [class*="modalViewer"] > div {
                  height: auto !important;
                  min-height: auto !important;
                  max-height: none !important;
                  overflow: visible !important;
                }

                [class*="modalViewer"] div[class*="viewer"] {
                  height: auto !important;
                  min-height: auto !important;
                  max-height: none !important;
                  overflow: visible !important;
                }

                /* Force article to be visible */
                article {
                  display: block !important;
                  position: static !important;
                  width: 100% !important;
                  height: auto !important;
                  overflow: visible !important;
                  /* Reset article padding that causes top spacing */
                  padding: 0 !important;
                  margin: 0 !important;
                }

                /* Ensure first child of article has no top spacing */
                article > *:first-child {
                  margin-top: 0 !important;
                  padding-top: 0 !important;
                  padding-left: 0 !important;
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

                h1 {
                  font-size: 24pt !important;
                  margin-top: 0 !important;
                  margin-bottom: 0.5em !important;
                  padding-top: 0 !important;
                }
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
                /* Use more specific selectors to avoid hiding image containers */
                .post-footer,
                .footer,
                .interaction-bar,
                .reaction-bar,
                .facepile {
                  display: none !important;
                }

                /* Hide navigation/interaction elements (but not image containers) */
                .reader-nav-page,
                .reader-onboarding-modal,
                [class*="modal-uY8Fz4"] {
                  display: none !important;
                }

                /* Hide specific UI elements with negation to protect images */
                [class*="interaction"]:not([class*="image"]),
                [class*="reaction"]:not([class*="image"]),
                [class*="avatar"]:not(img) {
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
                [class*="button"]:not(article):not(.post):not(.body):not(.markup),
                [class*="iconButton"],
                [class*="Button"]:not(article):not(.post):not(.body):not(.markup),
                [role="button"],
                span[data-state] button,
                div[data-state] button,
                .pencraft button,
                .pencraft[class*="button"]:not(article):not(.post):not(.body):not(.markup),
                .pencraft[class*="Button"]:not(article):not(.post):not(.body):not(.markup) {
                  display: none !important;
                  visibility: hidden !important;
                  opacity: 0 !important;
                  width: 0 !important;
                  height: 0 !important;
                  overflow: hidden !important;
                  position: absolute !important;
                  left: -9999px !important;
                }

                /* Force hide spans that contain buttons (but preserve author links) */
                span[data-state]:not(:has(a[href*="/@"])) {
                  display: none !important;
                }

                /* Hide by attribute patterns */
                [data-href*="subscribe"],
                [href*="subscribe"] {
                  display: none !important;
                }

                /* Hide aria-label buttons */
                button[aria-label="Close"],
                button[aria-label="View more"],
                button[aria-label="s"],
                button[aria-label="Previous"],
                button[aria-label="Next"] {
                  display: none !important;
                }

                /* Hide specific button classes */
                .iconButton-mq_Et5,
                .iconButtonBase-dJGHgN,
                .buttonText-X0uSmG,
                .priority_primary-RfbeYt {
                  display: none !important;
                }

                /* CRITICAL: Protect image containers and related elements */
                figure,
                picture,
                .image-container,
                .image2-inset,
                .captioned-image-container,
                [class*="image"]:not([class*="button"]):not([role="button"]) {
                  display: block !important;
                  visibility: visible !important;
                  opacity: 1 !important;
                  position: static !important;
                }

                /* Ensure images in containers are visible */
                figure img,
                picture img,
                [class*="image"] img,
                .image-link img {
                  display: block !important;
                  visibility: visible !important;
                  opacity: 1 !important;
                  max-width: 100% !important;
                  height: auto !important;
                }

                /* Protect image links */
                a[class*="image"]:not([role="button"]),
                a.image-link {
                  display: inline-block !important;
                  visibility: visible !important;
                  opacity: 1 !important;
                }

                /* CRITICAL: Ensure byline metadata is visible (author, publisher, date) */
                .byline-wrapper,
                .byline-wrapper *,
                .byline-wrapper a,
                .byline-wrapper div,
                [class*="meta-EgzBVA"],
                [class*="byline"] {
                  display: block !important;
                  visibility: visible !important;
                  opacity: 1 !important;
                  position: static !important;
                }

                .byline-wrapper .pencraft {
                  display: flex !important;
                  visibility: visible !important;
                  opacity: 1 !important;
                }

                /* FINAL RESCUE: Force article to be visible with high specificity */
                body article,
                body .post,
                body .body.markup,
                body #entry,
                body .single-post {
                  display: block !important;
                  visibility: visible !important;
                  opacity: 1 !important;
                  width: 100% !important;
                  height: auto !important;
                  position: static !important;
                  overflow: visible !important;
                  z-index: 9999 !important;
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

          // Trigger print
          console.log('[PDF Export] Triggering window.print() in 100ms...');
          setTimeout(() => {
            console.log('[PDF Export] Calling window.print() now');
            window.print();
            console.log('[PDF Export] window.print() called');
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
    const btn = document.getElementById('obsidianBtn');

    try {
      setButtonFeedback(btn, 'loading', 'Opening...');

      const md = generateMarkdown(articleData);
      const filename = generateFilename(articleData).replace(/\.md$/, '');

      // 1. Copy content to clipboard (bypassing URL length limits)
      await navigator.clipboard.writeText(md);

      // 2. Open Obsidian URI
      // clipboard=true tells Obsidian to use clipboard content for the new note
      const uri = `obsidian://new?file=${encodeURIComponent(filename)}&clipboard=true`;

      // Small delay to ensure clipboard write finishes and UI updates
      setTimeout(() => {
        // Try to open URI
        window.location.href = uri;

        // Detect success/failure via focus check
        // If successful, the popup usually loses focus or closes.
        // If failed (protocol not handled), the popup remains focused.
        setTimeout(() => {
          if (document.hasFocus()) {
            // Still has focus -> likely failed
            showStatus('Obsidian app not found', 'error');
            setButtonFeedback(btn, 'error', 'No Obsidian');
          } else {
            // Lost focus -> likely success
            showStatus('✅ Opening Obsidian...', 'success');
            setButtonFeedback(btn, 'success', 'Opened');
          }
        }, 1500); // Wait 1.5s for system to react
      }, 200);

    } catch (e) {
      console.error(e);
      showStatus('Obsidian Error: ' + e.message, 'error');
      setButtonFeedback(btn, 'error', 'Error');
    }
  }

  async function exportToPdfDirect() {
    if (!articleData) return;
    const btn = document.getElementById('pdfDirectBtn');

    try {
      setButtonFeedback(btn, 'loading', 'Preparing...');
      showStatus('Preparing PDF resources...', 'info');

      // 1. Fetch images and convert to Base64
      const imageMap = new Map();
      const urls = [];
      if (articleData.meta?.image) urls.push(articleData.meta.image);
      articleData.content.sections.forEach(s => {
        if (s.type === 'image') urls.push(s.content);
      });
      const uniqueUrls = [...new Set(urls)];

      if (uniqueUrls.length > 0) {
        btn.innerHTML = `<span>Fetching images (${uniqueUrls.length})...</span>`;
        let downloadCount = 0;

        const promises = uniqueUrls.map(async (url) => {
          const blob = await fetchImage(url);
          if (blob) {
            try {
              const base64 = await blobToBase64(blob);
              imageMap.set(url, base64);
            } catch (e) {
              console.warn('Failed to convert blob to base64', url);
            }
          }
          downloadCount++;
          if (downloadCount % 5 === 0) {
             btn.innerHTML = `<span>Fetching images (${downloadCount}/${uniqueUrls.length})...</span>`;
          }
        });
        await Promise.all(promises);
      }

      // 2. Generate PDF Definition
      setButtonFeedback(btn, 'loading', 'Rendering...');

      const pdfOptions = {
        showCover: settings.pdfShowCover,
        showFootnotes: settings.pdfShowFootnotes,
        fontSize: settings.pdfFontSize
      };

      const docDefinition = generatePdfDefinition(articleData, imageMap, pdfOptions);

      // 3. Download
      const filename = generateFilename(articleData).replace(/\.md$/, ''); // Remove extension, pdfmake adds .pdf

      // Configure fonts
      pdfMake.fonts = {
        NotoSerifSC: {
          normal: 'NotoSerifSC.subset.ttf',
          bold: 'NotoSerifSC.subset.ttf',
          italics: 'NotoSerifSC.subset.ttf',
          bolditalics: 'NotoSerifSC.subset.ttf'
        },
        // Fallback mapping for RobotoMono to avoid "Font not defined" errors
        RobotoMono: {
          normal: 'NotoSerifSC.subset.ttf',
          bold: 'NotoSerifSC.subset.ttf',
          italics: 'NotoSerifSC.subset.ttf',
          bolditalics: 'NotoSerifSC.subset.ttf'
        }
      };

      pdfMake.createPdf(docDefinition).download(filename);

      showStatus('PDF Downloaded!', 'success');
      setButtonFeedback(btn, 'success', 'Exported');

    } catch (e) {
      console.error(e);
      showStatus('PDF Error: ' + e.message, 'error');
      setButtonFeedback(btn, 'error', 'Failed');
    } finally {
      // Don't enable immediately if success logic handles reset
    }
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  if (pdfDirectBtn) {
    pdfDirectBtn.addEventListener('click', exportToPdfDirect);
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

  // Close settings panel when clicking outside
  document.addEventListener('click', (e) => {
    if (!settingsPanel.contains(e.target) && !settingsBtn.contains(e.target)) {
      if (settingsPanel.classList.contains('open')) {
        settingsPanel.classList.remove('open');
        settingsBtn.style.color = '#888';
      }
    }
  });

  // Close modal/settings on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // Close preview modal
      if (previewModal.style.display === 'flex') {
        closePreview();
      }
      // Close settings panel
      if (settingsPanel.classList.contains('open')) {
        settingsPanel.classList.remove('open');
        settingsBtn.style.color = '#888';
      }
    }
  });

  await checkPage();
});
