// Substack 文章提取器
(function() {
  'use strict';

  // 检查是否在 Substack 文章页面
  function isSubstackPostPage() {
    return window.location.href.match(/substack\.com\/p\/|\/p\/[\w-]+/);
  }

  // 从 JSON-LD 提取结构化数据
  function extractJsonLdData() {
    const jsonLdScript = document.querySelector('script[type="application/ld+json"]');
    if (!jsonLdScript) return null;

    try {
      const data = JSON.parse(jsonLdScript.textContent);
      return {
        title: data.headline || '',
        description: data.description || '',
        datePublished: data.datePublished || '',
        dateModified: data.dateModified || '',
        authors: Array.isArray(data.author)
          ? data.author.map(a => ({
              name: a.name || '',
              url: a.url || ''
            }))
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
      console.error('Failed to parse JSON-LD:', e);
      return null;
    }
  }

  // 从 DOM 提取文章内容
  function extractArticleContent() {
    const main = document.querySelector('main');
    if (!main) return { sections: [], fullText: '' };

    // 移除不需要的元素
    const elementsToRemove = main.querySelectorAll(
      'button, [role="button"], iframe, .paywall, form, input'
    );
    elementsToRemove.forEach(el => el.remove());

    // 获取所有内容元素
    const contentElements = main.querySelectorAll(
      'h2, h3, h4, h5, h6, p, ul, ol, blockquote, pre, code'
    );

    const sections = [];
    contentElements.forEach(el => {
      const tag = el.tagName.toLowerCase();
      const text = el.textContent?.trim();

      if (!text) return;

      if (tag === 'h2') {
        sections.push({ type: 'h2', content: text });
      } else if (tag === 'h3') {
        sections.push({ type: 'h3', content: text });
      } else if (tag === 'h4') {
        sections.push({ type: 'h4', content: text });
      } else if (tag === 'p') {
        sections.push({ type: 'paragraph', content: text });
      } else if (tag === 'ul' || tag === 'ol') {
        const items = Array.from(el.querySelectorAll('li')).map(li => li.textContent?.trim() || '');
        sections.push({ type: 'list', content: items, ordered: tag === 'ol' });
      } else if (tag === 'blockquote') {
        sections.push({ type: 'blockquote', content: text });
      } else if (tag === 'pre') {
        sections.push({ type: 'code', content: text });
      }
    });

    // 获取完整文本
    const fullText = main.textContent?.trim() || '';

    return { sections, fullText };
  }

  // 提取图片
  function extractImages() {
    const main = document.querySelector('main');
    if (!main) return [];

    const images = Array.from(main.querySelectorAll('img')).map(img => ({
      src: img.src || '',
      alt: img.alt || '',
      title: img.title || ''
    }));

    return images.filter(img => img.src && !img.src.includes('avatar'));
  }

  // 提取链接
  function extractLinks() {
    const main = document.querySelector('main');
    if (!main) return [];

    const links = Array.from(main.querySelectorAll('a')).map(a => ({
      href: a.href || '',
      text: a.textContent?.trim() || ''
    }));

    return links.filter(link => link.href && link.text);
  }

  // 主提取函数
  function extractArticleData() {
    const jsonLdData = extractJsonLdData();
    const articleContent = extractArticleContent();
    const images = extractImages();
    const links = extractLinks();

    return {
      meta: jsonLdData,
      content: articleContent,
      images,
      links,
      extractedAt: new Date().toISOString(),
      sourceUrl: window.location.href
    };
  }

  // 转换为 Markdown
  function convertToMarkdown(data) {
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
      }
    });

    // 图片列表
    if (images.length > 0) {
      md += '## 🖼️ 文章图片\n\n';
      images.forEach((img, index) => {
        md += `${index + 1}. ${img.alt ? img.alt : '图片'}\n`;
        md += `   ![${img.alt || '图片'}](${img.src})\n\n`;
      });
    }

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

    return md;
  }

  // 生成文件名
  function generateFilename(data) {
    const title = data.meta?.title || 'untitled';
    const sanitizedTitle = title
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    const date = data.meta?.datePublished
      ? new Date(data.meta.datePublished).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    return `${sanitizedTitle}-${date}.md`;
  }

  // 将数据暴露给全局，供 popup 调用
  window.SubstackExtractor = {
    extractArticleData,
    convertToMarkdown,
    generateFilename,
    isSubstackPostPage
  };

  console.log('Substack to Markdown 插件已加载');
})();
