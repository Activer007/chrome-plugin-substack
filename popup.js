// Popup 脚本
document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('status');
  const articleInfoEl = document.getElementById('articleInfo');
  const articleTitleEl = document.getElementById('articleTitle');
  const articleAuthorEl = document.getElementById('articleAuthor');
  const articleDateEl = document.getElementById('articleDate');
  const extractBtn = document.getElementById('extractBtn');
  const previewBtn = document.getElementById('previewBtn');
  const previewContainer = document.getElementById('previewContainer');
  const markdownPreview = document.getElementById('markdownPreview');

  // 检查所有必需元素是否存在
  if (!statusEl || !extractBtn || !previewBtn) {
    console.error('Missing required DOM elements');
    return;
  }

  let articleData = null;

  // 检查当前页面
  async function checkPage() {
    console.log('[Popup] ========== 开始检查页面 ==========');
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('[Popup] 当前标签页 URL:', tab.url);

      // 检查是否是首页（不包含 post 的纯首页）
      if (tab.url && tab.url === 'https://substack.com/home' || tab.url === 'https://substack.com/home/') {
        console.warn('[Popup] 在首页信息流页面');
        showStatus('请在文章详情页使用插件（点击文章标题打开完整文章）', 'error');
        return false;
      }

      // 检查是否是 Substack 页面（放宽检查，支持自定义域名和 home/post）
      const isSubstackUrl = tab.url && (
        tab.url.includes('substack.com') ||
        tab.url.match(/\/p\/[\w-]+/) ||
        tab.url.includes('/home/post/')
      );

      if (!tab.url || !isSubstackUrl) {
        console.warn('[Popup] 不是 Substack 页面:', tab.url);
        showStatus('请在 Substack 文章页面使用此插件', 'error');
        return false;
      }

      console.log('[Popup] ✅ 是 Substack 相关页面');

      // 注入完整的提取逻辑（不依赖 content script）
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          console.log('[Injected] 开始执行提取逻辑...');
          console.log('[Injected] 当前 URL:', window.location.href);

          // 检查是否有 iframe（有些内容可能在 iframe 中）
          const iframes = document.querySelectorAll('iframe');
          console.log('[Injected] 页面上的 iframe 数量:', iframes.length);

          // 从 JSON-LD 提取结构化数据
          function extractJsonLdData() {
            console.log('[Injected] 提取 JSON-LD...');
            const jsonLdScript = document.querySelector('script[type="application/ld+json"]');
            if (!jsonLdScript) {
              console.warn('[Injected] 未找到 JSON-LD，尝试从 DOM 提取元数据');
              return extractMetaDataFromDOM();
            }

            try {
              const data = JSON.parse(jsonLdScript.textContent);
              console.log('[Injected] ✅ JSON-LD 成功:', data.headline);
              return {
                title: data.headline || '',
                description: data.description || '',
                datePublished: data.datePublished || '',
                dateModified: data.dateModified || '',
                authors: Array.isArray(data.author)
                  ? data.author.map(a => ({ name: a.name || '', url: a.url || '' }))
                  : [{ name: data.author?.name || '', url: data.author?.url || '' }],
                publisher: {
                  name: data.publisher?.name || '',
                  url: data.publisher?.url || ''
                },
                image: data.image?.[0]?.url || data.image || '',
                isAccessibleForFree: data.isAccessibleForFree ?? true,
                url: data.url || window.location.href
              };
            } catch (e) {
              console.error('[Injected] JSON-LD 解析失败，尝试从 DOM 提取:', e);
              return extractMetaDataFromDOM();
            }
          }

          // 从 DOM 提取元数据（当没有 JSON-LD 时）
          function extractMetaDataFromDOM() {
            console.log('[Injected] 从 DOM 提取元数据...');

            // 优先使用 document.title（最可靠）
            let title = document.title || '';

            // 如果 title 为空或太短，尝试其他方法
            if (!title || title.length < 10) {
              // 尝试找主文章标题链接（在 inbox/home 页面中）
              // 排除侧边栏的推荐文章链接
              const allPostLinks = Array.from(document.querySelectorAll('a[href*="/p/"]')).filter(a => {
                // 排除包含 class 名为 "reader2-inbox-post" 的（这些是推荐文章）
                return !a.className.includes('reader2-inbox-post') &&
                       !a.className.includes('linkRow');
              });

              // 选择文本最长的 /p/ 链接（通常是主文章标题）
              const mainPostLink = allPostLinks.reduce((longest, current) => {
                const currentText = current.textContent?.trim() || '';
                const longestText = longest.textContent?.trim() || '';
                return currentText.length > longestText.length ? current : longest;
              }, allPostLinks[0]);

              title = mainPostLink?.textContent?.trim() || title;
            }

            // 提取作者 - 包含 /@ 的链接
            const authorLink = Array.from(document.querySelectorAll('a')).find(a =>
              a.href && a.href.includes('/@') &&
              a.textContent.trim().length > 2 &&
              a.textContent.trim().length < 100 &&
              !a.textContent.includes('Share')  // 排除分享按钮
            );
            const authorName = authorLink?.textContent?.trim() || '';
            const authorUrl = authorLink?.href || '';

            // 提取日期 - 格式如 "JAN 05, 2026" 或 "Jan 05, 2026"
            const dateRegex = /^[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}$/;
            const allElements = Array.from(document.querySelectorAll('*'));
            const dateElement = allElements.find(el => {
              const text = el.textContent?.trim();
              return text && dateRegex.test(text) && el.children.length === 0;
            });
            const dateText = dateElement?.textContent?.trim() || '';

            // 获取发布者名称 - 从文章链接中智能提取
            let pubName = '';
            let pubUrl = '';

            // 策略：找到主文章的 /p/ 链接，从中提取发布者域名，然后找对应的发布者链接
            const mainPostLinks = Array.from(document.querySelectorAll('a[href*="/p/"]')).filter(a => {
              return !a.className.includes('reader2-inbox-post') &&
                     !a.className.includes('linkRow') &&
                     !a.href.includes('utm_source');
            });

            // 选择文本最长的作为主文章链接
            const mainPostLink = mainPostLinks.reduce((longest, current) => {
              const currentText = current.textContent?.trim() || '';
              const longestText = longest.textContent?.trim() || '';
              return currentText.length > longestText.length ? current : longest;
            }, mainPostLinks[0]);

            if (mainPostLink && mainPostLink.href) {
              const urlMatch = mainPostLink.href.match(/https?:\/\/([^\/]+)\//);
              if (urlMatch) {
                const domain = urlMatch[1];
                // 找指向该域名的发布者链接
                const pubLinks = Array.from(document.querySelectorAll('a')).filter(a =>
                  a.href && a.href.includes(domain) && !a.href.includes('/p/')
                );

                // 选择文本长度合理且最短的
                const validLinks = pubLinks.filter(a => {
                  const text = a.textContent?.trim() || '';
                  return text.length >= 5 && text.length <= 100;
                });

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

            console.log('[Injected] ✅ DOM 元数据提取成功:', {
              title: title.substring(0, 50),
              authorName,
              dateText,
              pubName
            });

            return {
              title,
              description: '',
              datePublished: dateText || '',
              dateModified: '',
              authors: authorName ? [{ name: authorName, url: authorUrl }] : [],
              publisher: {
                name: pubName,
                url: pubUrl
              },
              image: '',
              isAccessibleForFree: true,
              url: window.location.href
            };
          }

          // 将 HTML 转换为 Markdown 格式（保留链接和格式）
          function htmlToMarkdown(element) {
            const clone = element.cloneNode(true);
            const processNode = (node) => {
              if (node.nodeType === Node.TEXT_NODE) {
                return node.textContent;
              }

              if (node.nodeType !== Node.ELEMENT_NODE) {
                return '';
              }

              const tag = node.tagName.toLowerCase();
              const children = Array.from(node.childNodes).map(processNode).join('');

              switch (tag) {
                case 'a':
                  const href = node.getAttribute('href') || '';
                  const text = children.trim();
                  // 跳过按钮类链接
                  if (node.classList.contains('button') || href.includes('utm_source')) {
                    return text;
                  }
                  return href ? `[${text}](${href})` : text;
                case 'strong':
                case 'b':
                  return `**${children}**`;
                case 'em':
                case 'i':
                  return `*${children}*`;
                case 'code':
                  return `\`${children}\``;
                case 'br':
                  return '\n';
                default:
                  return children;
              }
            };

            return processNode(clone).trim();
          }

          // 从 DOM 提取文章内容
          function extractArticleContent() {
            console.log('[Injected] 提取文章内容...');

            // 尝试多个容器
            let container = document.querySelector('main');
            if (!container) {
              console.log('[Injected] 未找到 main，尝试 article');
              container = document.querySelector('article');
            }
            if (!container) {
              console.log('[Injected] 未找到 article，尝试 #entry');
              container = document.querySelector('#entry');
            }

            if (!container) {
              console.error('[Injected] 无法找到内容容器');
              return { sections: [], fullText: '' };
            }

            console.log('[Injected] ✅ 找到容器:', container.tagName, container.className);

            // 尝试找到 .body.markup 容器（Substack 的主要内容区域）
            const bodyMarkup = container.querySelector('.body.markup');
            const contentContainer = bodyMarkup || container;

            console.log('[Injected] 内容容器:', contentContainer.className);

            const sections = [];
            let skipCount = 0;

            // 遍历所有直接子元素，保持原始顺序
            Array.from(contentContainer.children).forEach((el, index) => {
              const tagName = el.tagName.toLowerCase();
              const className = el.className || '';

              // 跳过非内容区域（但保留标题元素）
              const isHeading = /^h[1-6]$/.test(tagName);
              if (!isHeading && (
                className.includes('byline') ||
                className.includes('post-header') ||
                className.includes('footer') ||
                className === 'header'
              )) {
                return;
              }

              // 首先检查是否包含图片（非头像）
              const images = Array.from(el.querySelectorAll('img')).filter(img =>
                !img.src.includes('avatar') &&
                !img.alt.includes('avatar') &&
                !img.src.includes('/w_32,') &&
                !img.src.includes('/w_36,') &&
                !img.src.includes('/w_64,') &&
                !img.src.includes('/w_72,') &&
                !img.src.includes('/w_80,')
              );

              // 处理图片 - 图片通常在段落之前或之后
              if (images.length > 0) {
                images.forEach(img => {
                  sections.push({
                    type: 'image',
                    content: img.src,
                    alt: img.alt || ''
                  });
                });
                console.log('[Injected] 找到图片:', images.length, '张');
              }

              // 处理文本内容（使用 htmlToMarkdown 保留格式）
              const text = el.textContent?.trim();

              if (tagName === 'h2' && text && text.length > 3) {
                sections.push({ type: 'h2', content: text });
              } else if (tagName === 'h3' && text && text.length > 3) {
                sections.push({ type: 'h3', content: text });
              } else if (tagName === 'h4' && text && text.length > 3) {
                sections.push({ type: 'h4', content: text });
              } else if (tagName === 'p' && text && text.length >= 10) {
                // 跳过导航、订阅等文本
                if (text.includes('Subscribe') || text.includes('Sign in') ||
                    text.includes('Learn more') || text.match(/^(Home|Chat|Activity|Share)$/)) {
                  skipCount++;
                  return;
                }
                // 使用 htmlToMarkdown 保留链接和格式
                const markdown = htmlToMarkdown(el);
                sections.push({ type: 'paragraph', content: markdown });
              } else if (tagName === 'ul' || tagName === 'ol') {
                // 对列表项也使用 htmlToMarkdown
                const items = Array.from(el.querySelectorAll('li')).map(li => htmlToMarkdown(li)).filter(text => text.length > 0);
                if (items.length > 0 && items.some(i => i.length > 0)) {
                  sections.push({ type: 'list', content: items, ordered: tagName === 'ol' });
                }
              } else if (tagName === 'blockquote' && text && text.length >= 10) {
                // 对引用也使用 htmlToMarkdown
                const markdown = htmlToMarkdown(el);
                sections.push({ type: 'blockquote', content: markdown });
              } else if (tagName === 'pre' && text && text.length >= 10) {
                sections.push({ type: 'code', content: text });
              }
            });

            const fullText = contentContainer.textContent?.trim() || '';
            console.log('[Injected] ✅ 提取了', sections.length, '个段落 (跳过', skipCount, '个)');
            return { sections, fullText };
          }

          // 提取图片
          function extractImages() {
            const container = document.querySelector('main') || document.querySelector('article') || document.querySelector('#entry');
            if (!container) return [];

            const images = Array.from(container.querySelectorAll('img')).map(img => ({
              src: img.src || '',
              alt: img.alt || '',
              title: img.title || ''
            }));

            return images.filter(img => img.src && !img.src.includes('avatar'));
          }

          // 提取链接
          function extractLinks() {
            const container = document.querySelector('main') || document.querySelector('article') || document.querySelector('#entry');
            if (!container) return [];

            const links = Array.from(container.querySelectorAll('a')).map(a => ({
              href: a.href || '',
              text: a.textContent?.trim() || ''
            }));

            return links.filter(link => link.href && link.text);
          }

          // 主提取函数
          const jsonLdData = extractJsonLdData();
          const articleContent = extractArticleContent();
          const images = extractImages();
          const links = extractLinks();

          const result = {
            meta: jsonLdData,
            content: articleContent,
            images,
            links,
            extractedAt: new Date().toISOString(),
            sourceUrl: window.location.href
          };

          console.log('[Injected] ✅ 提取完成:', {
            hasMeta: !!result.meta,
            sectionsCount: result.content.sections.length,
            imagesCount: result.images.length,
            linksCount: result.links.length
          });

          return result;
        }
      });

      console.log('[Popup] 脚本执行结果:', results);

      if (!results || !results[0] || !results[0].result) {
        console.error('[Popup] ❌ 提取失败，结果为空');
        showStatus('无法提取文章信息，请刷新页面后重试', 'error');
        return false;
      }

      articleData = results[0].result;
      console.log('[Popup] 文章数据已提取:', articleData);

      // 显示文章信息
      if (articleData.meta) {
        articleTitleEl.textContent = truncateText(articleData.meta.title || '-', 30);
        articleAuthorEl.textContent = articleData.meta.authors?.map(a => a.name).join(', ') || '-';
        articleDateEl.textContent = articleData.meta.datePublished
          ? new Date(articleData.meta.datePublished).toLocaleDateString('zh-CN')
          : '-';

        console.log('[Popup] 文章信息已显示');
        showStatus('✅ 检测到 Substack 文章！', 'success');
        articleInfoEl.style.display = 'block';
        return true;
      }

      console.error('[Popup] 文章元数据为空');
      showStatus('无法提取文章元数据', 'error');
      return false;
    } catch (error) {
      console.error('[Popup] 检查页面失败:', error);
      showStatus('发生错误: ' + error.message, 'error');
      return false;
    }
  }

  // 显示状态消息
  function showStatus(message, type = 'info') {
    statusEl.className = `status ${type}`;
    statusEl.textContent = message;
  }

  // 截断文本
  function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  // 提取并下载 Markdown
  async function extractAndDownload() {
    if (!articleData) {
      showStatus('没有文章数据', 'error');
      return;
    }

    try {
      extractBtn.disabled = true;
      extractBtn.innerHTML = '处理中 <span class="loading"></span>';

      console.log('[Popup] 开始生成 Markdown...');

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // 在页面中生成 Markdown（注入完整逻辑）
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (data) => {
          console.log('[Injected] 生成 Markdown...');
          const { meta, content, images, links } = data;

          let md = '';

          // 标题
          md += `# ${meta?.title || 'Untitled'}\n\n`;

          // 元数据
          md += '## 📋 文章信息\n\n';
          if (meta?.authors?.length) {
            const authorNames = meta.authors.map(a => a.name).filter(Boolean).join(', ');
            md += `- **作者**: ${authorNames}\n`;
          }
          if (meta?.datePublished) {
            const date = new Date(meta.datePublished).toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
            md += `- **发布日期**: ${date}\n`;
          }
          if (meta?.publisher?.name) {
            md += `- **出版社**: [${meta.publisher.name}](${meta.publisher.url})\n`;
          }
          md += `- **原文链接**: ${meta?.url || window.location.href}\n`;
          md += '\n';

          // 描述
          if (meta?.description) {
            md += `## 📝 简介\n\n${meta.description}\n\n`;
          }

          // 封面图
          if (meta?.image) {
            md += `## 🖼️ 封面\n\n![封面图](${meta.image})\n\n`;
          }

          // 正文内容
          md += '## 📖 正文\n\n';

          content.sections.forEach(section => {
            switch (section.type) {
              case 'h2':
                md += `## ${section.content}\n\n`;
                break;
              case 'h3':
                md += `### ${section.content}\n\n`;
                break;
              case 'h4':
                md += `#### ${section.content}\n\n`;
                break;
              case 'paragraph':
                md += `${section.content}\n\n`;
                break;
              case 'list':
                section.content.forEach(item => {
                  md += `${section.ordered ? '1.' : '-'} ${item}\n`;
                });
                md += '\n';
                break;
              case 'blockquote':
                md += `> ${section.content}\n\n`;
                break;
              case 'code':
                md += '```\n' + section.content + '\n```\n\n';
                break;
              case 'image':
                // 图片保留在原始位置
                const altText = section.alt || '图片';
                md += `![${altText}](${section.content})\n\n`;
                break;
            }
          });

          // 相关链接
          if (links.length > 0) {
            md += '## 🔗 相关链接\n\n';
            links.forEach(link => {
              md += `- [${link.text}](${link.href})\n`;
            });
            md += '\n';
          }

          // 页脚
          md += '---\n\n';
          md += `*提取时间: ${new Date().toLocaleString('zh-CN')}*\n`;
          md += `*由 [Substack to Markdown](https://github.com) 插件生成*\n`;

          console.log('[Injected] ✅ Markdown 生成完成');
          return md;
        },
        args: [articleData]
      });

      if (!results || !results[0] || !results[0].result) {
        throw new Error('生成 Markdown 失败');
      }

      const markdown = results[0].result;

      // 生成文件名
      const filenameResults = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (data) => {
          const title = data.meta?.title || 'untitled';
          const sanitizedTitle = title
            .replace(/[^\w\s\u4e00-\u9fa5-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 50);

          let date = '';
          if (data.meta?.datePublished) {
            try {
              // 尝试解析日期格式如 "Jan 05, 2026"
              const dateObj = new Date(data.meta.datePublished);
              if (!isNaN(dateObj.getTime())) {
                date = dateObj.toISOString().split('T')[0];
              } else {
                date = new Date().toISOString().split('T')[0];
              }
            } catch (e) {
              date = new Date().toISOString().split('T')[0];
            }
          } else {
            date = new Date().toISOString().split('T')[0];
          }

          return `${sanitizedTitle}-${date}.md`;
        },
        args: [articleData]
      });

      const filename = filenameResults?.[0]?.result || 'substack-article.md';
      console.log('[Popup] 文件名:', filename);

      // 使用 Chrome Downloads API 下载文件
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      await chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: true
      });

      showStatus('✅ Markdown 文件已下载！', 'success');
    } catch (error) {
      console.error('[Popup] 下载失败:', error);
      showStatus('下载失败: ' + error.message, 'error');
    } finally {
      extractBtn.disabled = false;
      extractBtn.innerHTML = '🚀 提取并下载 Markdown';
    }
  }

  // 预览 Markdown（直接使用已提取的数据）
  async function previewMarkdown() {
    if (!articleData) {
      showStatus('没有文章数据', 'error');
      return;
    }

    try {
      console.log('[Popup] 开始预览...');

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (data) => {
          console.log('[Injected] 生成 Markdown 预览...');
          const { meta, content, images, links } = data;

          let md = '';

          md += `# ${meta?.title || 'Untitled'}\n\n`;
          md += '## 📋 文章信息\n\n';
          if (meta?.authors?.length) {
            const authorNames = meta.authors.map(a => a.name).filter(Boolean).join(', ');
            md += `- **作者**: ${authorNames}\n`;
          }
          if (meta?.datePublished) {
            const date = new Date(meta.datePublished).toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
            md += `- **发布日期**: ${date}\n`;
          }
          if (meta?.publisher?.name) {
            md += `- **出版社**: [${meta.publisher.name}](${meta.publisher.url})\n`;
          }
          md += `- **原文链接**: ${meta?.url || window.location.href}\n`;
          md += '\n';

          if (meta?.description) {
            md += `## 📝 简介\n\n${meta.description}\n\n`;
          }

          if (meta?.image) {
            md += `## 🖼️ 封面\n\n![封面图](${meta.image})\n\n`;
          }

          md += '## 📖 正文\n\n';
          content.sections.forEach(section => {
            switch (section.type) {
              case 'h2': md += `## ${section.content}\n\n`; break;
              case 'h3': md += `### ${section.content}\n\n`; break;
              case 'h4': md += `#### ${section.content}\n\n`; break;
              case 'paragraph': md += `${section.content}\n\n`; break;
              case 'list':
                section.content.forEach(item => { md += `${section.ordered ? '1.' : '-'} ${item}\n`; });
                md += '\n';
                break;
              case 'blockquote': md += `> ${section.content}\n\n`; break;
              case 'code': md += '```\n' + section.content + '\n```\n\n'; break;
              case 'image':
                // 图片保留在原始位置
                const altText = section.alt || '图片';
                md += `![${altText}](${section.content})\n\n`;
                break;
            }
          });

          if (links.length > 0) {
            md += '## 🔗 相关链接\n\n';
            links.forEach(link => { md += `- [${link.text}](${link.href})\n`; });
            md += '\n';
          }

          md += '---\n\n';
          md += `*提取时间: ${new Date().toLocaleString('zh-CN')}*\n`;

          return md;
        },
        args: [articleData]
      });

      if (!results || !results[0] || !results[0].result) {
        throw new Error('生成 Markdown 失败');
      }

      const markdown = results[0].result;
      markdownPreview.textContent = markdown;
      previewContainer.style.display = 'block';
      console.log('[Popup] ✅ 预览完成');
    } catch (error) {
      console.error('[Popup] 预览失败:', error);
      showStatus('预览失败: ' + error.message, 'error');
    }
  }

  // 事件监听
  extractBtn.addEventListener('click', extractAndDownload);
  previewBtn.addEventListener('click', previewMarkdown);

  // 初始化检查
  await checkPage();
});
