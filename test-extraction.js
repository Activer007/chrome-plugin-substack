/**
 * Substack 文章提取测试脚本
 * 直接在浏览器控制台运行此脚本来测试提取功能
 */

(function() {
  'use strict';

  console.log('🔍 Substack 文章提取器测试脚本\n');

  // ========== 工具函数 ==========

  // 从 JSON-LD 提取结构化数据
  function extractJsonLdData() {
    const jsonLdScript = document.querySelector('script[type="application/ld+json"]');
    if (!jsonLdScript) {
      console.error('❌ 未找到 JSON-LD 数据');
      return null;
    }

    try {
      const data = JSON.parse(jsonLdScript.textContent);
      console.log('✅ 成功解析 JSON-LD 数据');

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
      console.error('❌ 解析 JSON-LD 失败:', e);
      return null;
    }
  }

  // 从 DOM 提取文章内容
  function extractArticleContent() {
    const main = document.querySelector('main');
    if (!main) {
      console.error('❌ 未找到 main 元素');
      return { sections: [], fullText: '' };
    }

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

    console.log(`✅ 提取到 ${sections.length} 个内容区块`);

    return { sections };
  }

  // 转换为 Markdown
  function convertToMarkdown(data) {
    const { meta, content } = data;

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

    // 页脚
    md += '---\n\n';
    md += `*提取时间: ${new Date().toLocaleString('zh-CN')}*\n`;

    return md;
  }

  // 下载文件
  function downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ========== 主函数 ==========

  async function testExtraction() {
    console.log('📊 开始提取文章数据...\n');

    // 提取 JSON-LD 数据
    const jsonData = extractJsonLdData();
    if (!jsonData) {
      console.log('❌ 提取失败');
      return;
    }

    console.log('📋 文章元数据:');
    console.table({
      '标题': jsonData.title,
      '作者': jsonData.authors.map(a => a.name).join(', '),
      '发布日期': jsonData.datePublished,
      '出版社': jsonData.publisher.name,
      '是否免费': jsonData.isAccessibleForFree ? '是' : '否'
    });

    // 提取文章内容
    const articleContent = extractArticleContent();

    // 组合数据
    const articleData = {
      meta: jsonData,
      content: articleContent
    };

    console.log('\n📝 内容区块统计:');
    const stats = {};
    articleContent.sections.forEach(s => {
      stats[s.type] = (stats[s.type] || 0) + 1;
    });
    console.table(stats);

    // 生成 Markdown
    console.log('\n🔄 生成 Markdown...');
    const markdown = convertToMarkdown(articleData);

    console.log(`✅ Markdown 已生成，共 ${markdown.length} 字符`);
    console.log('\n📄 Markdown 预览 (前 500 字符):');
    console.log('─'.repeat(60));
    console.log(markdown.substring(0, 500) + '...');
    console.log('─'.repeat(60));

    // 下载文件
    const filename = `substack-${Date.now()}.md`;
    console.log(`\n💾 正在下载: ${filename}`);
    downloadFile(markdown, filename);

    console.log('\n✅ 测试完成！');
    console.log('💡 提示: 你可以在代码中修改 convertToMarkdown 函数来自定义输出格式');

    return articleData;
  }

  // ========== 运行测试 ==========

  // 检查是否在 Substack 页面
  if (!window.location.href.includes('substack.com') && !window.location.href.match(/\/p\/[\w-]+/)) {
    console.warn('⚠️  当前页面可能不是 Substack 文章页面');
  }

  // 执行提取
  const result = await testExtraction();

  // 将结果暴露到全局，方便调试
  window.__substack_test_result = result;
  window.__substack_markdown = result ? convertToMarkdown(result) : null;

  console.log('\n💡 调试提示:');
  console.log('  - window.__substack_test_result = 提取的完整数据');
  console.log('  - window.__substack_markdown = 生成的 Markdown');
  console.log('  - 使用 console.table() 查看结构化数据');

})();
