// Background Service Worker
console.log('Substack to Markdown background script loaded');

// 监听插件安装
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('插件已安装');
  } else if (details.reason === 'update') {
    console.log('插件已更新');
  }
});

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'downloadMarkdown') {
    // 处理 Markdown 下载
    const { markdown, filename } = request.data;

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    chrome.downloads.download({
      url: url,
      filename: filename || 'article.md',
      saveAs: true
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, downloadId });
      }
    });

    return true; // 保持消息通道开放
  }
});

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // 检查是否是 Substack 页面
    if (tab.url.includes('substack.com') || tab.url.match(/\/p\/[\w-]+/)) {
      // 可以在这里执行一些初始化操作
      console.log('检测到 Substack 页面:', tab.url);
    }
  }
});
