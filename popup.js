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
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // 检查是否是 Substack 页面
      if (!tab.url || (!tab.url.includes('substack.com') && !tab.url.match(/\/p\/[\w-]+/))) {
        showStatus('请在 Substack 文章页面使用此插件', 'error');
        return false;
      }

      // 注入 content script
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          if (window.SubstackExtractor && window.SubstackExtractor.isSubstackPostPage()) {
            return window.SubstackExtractor.extractArticleData();
          }
          return null;
        }
      });

      if (!results || !results[0] || !results[0].result) {
        showStatus('无法提取文章信息，请刷新页面后重试', 'error');
        return false;
      }

      articleData = results[0].result;

      // 显示文章信息
      if (articleData.meta) {
        articleTitleEl.textContent = truncateText(articleData.meta.title || '-', 30);
        articleAuthorEl.textContent = articleData.meta.authors?.map(a => a.name).join(', ') || '-';
        articleDateEl.textContent = articleData.meta.datePublished
          ? new Date(articleData.meta.datePublished).toLocaleDateString('zh-CN')
          : '-';

        showStatus('✅ 检测到 Substack 文章！', 'success');
        articleInfoEl.style.display = 'block';
        return true;
      }

      showStatus('无法提取文章元数据', 'error');
      return false;
    } catch (error) {
      console.error('检查页面失败:', error);
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

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // 在页面中生成 Markdown
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (data) => {
          if (window.SubstackExtractor) {
            return window.SubstackExtractor.convertToMarkdown(data);
          }
          return null;
        },
        args: [articleData]
      });

      if (!results || !results[0] || !results[0].result) {
        throw new Error('生成 Markdown 失败');
      }

      const markdown = results[0].result;

      // 生成友好的文件名
      const filenameResults = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (data) => {
          if (window.SubstackExtractor) {
            return window.SubstackExtractor.generateFilename(data);
          }
          return null;
        },
        args: [articleData]
      });

      const filename = filenameResults?.[0]?.result || 'substack-article.md';

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
      console.error('下载失败:', error);
      showStatus('下载失败: ' + error.message, 'error');
    } finally {
      extractBtn.disabled = false;
      extractBtn.innerHTML = '🚀 提取并下载 Markdown';
    }
  }

  // 预览 Markdown
  async function previewMarkdown() {
    if (!articleData) {
      showStatus('没有文章数据', 'error');
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (data) => {
          if (window.SubstackExtractor) {
            return window.SubstackExtractor.convertToMarkdown(data);
          }
          return null;
        },
        args: [articleData]
      });

      if (!results || !results[0] || !results[0].result) {
        throw new Error('生成 Markdown 失败');
      }

      const markdown = results[0].result;
      markdownPreview.textContent = markdown;
      previewContainer.style.display = 'block';
    } catch (error) {
      console.error('预览失败:', error);
      showStatus('预览失败: ' + error.message, 'error');
    }
  }

  // 事件监听
  extractBtn.addEventListener('click', extractAndDownload);
  previewBtn.addEventListener('click', previewMarkdown);

  // 初始化检查
  await checkPage();
});
