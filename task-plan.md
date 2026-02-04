# Substack to Markdown 插件 - 改进规划

## 📊 当前项目状态分析

### 核心功能
从 Substack 文章提取数据 → 转换为 Markdown → 下载到本地

### 已完成改进
- ✅ 支持所有 Substack 自定义域名
- ✅ 友好的文件名生成
- ✅ 不破坏原始 DOM
- ✅ 健壮的错误处理

### 技术架构
```
chrome-plugin-substack/
├── manifest.json       # Manifest V3 配置
├── content.js          # 内容提取逻辑（注入页面）
├── popup.js            # 弹出窗口交互
├── background.js       # 后台服务
└── popup.html          # 用户界面
```

---

## 🚀 改进方向（12个维度）

### **一、批量处理与自动化**

#### 1.1 批量下载功能
**方案**：添加"订阅源批量下载"功能
- 从作者归档页面提取所有文章链接
- 队列化下载，避免请求过载
- 显示进度条和下载状态
- 支持暂停/恢复

**价值**：用户可一键备份整个订阅源

**实现要点**：
```javascript
// 新增文件: batch-downloader.js
class BatchDownloader {
  - extractArticleLinks(archiveUrl)
  - queueDownload(links)
  - updateProgress(current, total)
  - pause/resume()
}
```

#### 1.2 自动同步功能
**方案**：定期自动检查并下载新文章
- 后台定时任务（每小时/每天）
- 只下载新文章，去重机制
- 增量更新本地知识库

**技术要点**：
- 使用 Chrome Alarms API
- IndexedDB 存储已下载文章记录
- 后台 Service Worker 定期执行

---

### **二、内容处理增强**

#### 2.1 图片本地化
**方案**：自动下载图片并替换链接
- 将图片保存到本地文件夹
- Markdown 中引用本地路径
- 支持打包成 ZIP（包含图片和 MD）

**价值**：离线可用，永久保存

**实现要点**：
```javascript
// content.js 增强
async function downloadImages(images) {
  const folder = 'images/' + generateFilename(data);
  for (const img of images) {
    const blob = await fetch(img.src).then(r => r.blob());
    const localPath = await chrome.downloads.download({
      url: URL.createObjectURL(blob),
      filename: folder + '/' + sanitizeFilename(img.alt),
      saveAs: false
    });
    img.localPath = localPath;
  }
}
```

#### 2.2 智能内容清理
**方案**：提供"纯净模式"
- 移除营销内容（Subscribe 按钮、推荐阅读）
- 提取核心正文
- 保留关键引用和数据

**配置选项**：
```javascript
const cleanupOptions = {
  removeSubscribeButtons: true,
  removeRecommendedReading: true,
  removeFooterCTA: true,
  preserveQuotes: true,
  preserveData: true
};
```

#### 2.3 AI 摘要生成
**方案**：集成 AI API 生成摘要
- 调用 OpenAI/Claude API
- 在 Markdown 顶部添加摘要
- 提取关键要点（3-5 bullet points）

**用户配置**：
- API Key 自行提供（隐私保护）
- 可选功能开关
- 支持选择 AI 模型

---

### **三、多平台扩展**

#### 3.1 平台适配器架构
**方案**：设计可插拔的内容提取器
```
extractors/
├── base-extractor.js      # 基础接口
├── substack-extractor.js  # Substack（已有）
├── medium-extractor.js    # Medium（新增）
├── ghost-extractor.js     # Ghost（新增）
└── wordpress-extractor.js # WordPress（新增）
```

**接口设计**：
```javascript
class BaseExtractor {
  canHandle(url) { return false; }
  extractArticleData() { return {}; }
  convertToMarkdown(data) { return ''; }
}
```

#### 3.2 通用文章识别
**方案**：基于 JSON-LD + Schema.org
- 自动识别任何结构化数据的文章
- 适配 WordPress、Ghost 等主流 CMS

**检测逻辑**：
```javascript
function detectPlatform() {
  // 1. 检查 JSON-LD
  const jsonLd = document.querySelector('script[type="application/ld+json"]');
  if (jsonLd) return 'schema-org';

  // 2. 检查特定标记
  if (document.querySelector('meta[property="og:site_name"][content="Medium"]')) {
    return 'medium';
  }

  // 3. 检查 URL 模式
  if (url.match(/substack\.com/)) return 'substack';

  return 'generic';
}
```

---

### **四、导出格式扩展**

#### 4.1 多格式导出
**方案**：支持多种输出格式

| 格式 | 用途 | 优先级 |
|------|------|--------|
| PDF | 打印、分享 | 高 |
| HTML | 单文件归档 | 中 |
| Org-mode | Emacs 用户 | 低 |
| Notion API | 直接导入 Notion | 高 |
| Obsidian | 带_frontmatter_ | 高 |

**实现方式**：
```javascript
// exporters/
├── markdown-exporter.js
├── pdf-exporter.js       // 使用 jsPDF 或浏览器打印
├── html-exporter.js      // 单文件 HTML
├── notion-exporter.js    // Notion API
└── obsidian-exporter.js  // 添加 frontmatter
```

#### 4.2 自定义模板
**方案**：用户可自定义 Markdown 模板

**模板配置界面**：
```json
{
  "template": {
    "titleFormat": "# {{title}}",
    "includeMetadata": true,
    "includeImage": true,
    "imagePosition": "after_title",
    "contentFormat": "clean",
    "footer": "---\n提取于 {{date}}",
    "customFrontmatter": {
      "tags": "{{tags}}",
      "source": "{{url}}"
    }
  }
}
```

---

### **五、云服务集成**

#### 5.1 直接同步到笔记软件
**方案**：一键推送到各类服务

**优先支持**：
1. **Notion** - API 成熟，用户量大
2. **Obsidian** - 通过 Git 仓库自动同步
3. **Readwise Reader** - 流行阅读管理工具
4. **Logseq** - 知识管理工具

**Notion 集成示例**：
```javascript
async function pushToNotion(markdown, title) {
  const response = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userConfig.notionToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      parent: { database_id: userConfig.notionDatabaseId },
      properties: {
        title: { title: [{ text: { content: title } }] }
      },
      children: markdownToNotionBlocks(markdown)
    })
  });
}
```

#### 5.2 WebDAV/云存储
**方案**：保存到云盘
- 支持 WebDAV（坚果云、Nextcloud）
- Google Drive API
- Dropbox API
- OneDrive API

**配置界面**：
```
云存储设置:
┌─────────────────────────────┐
│ 服务提供商: [WebDAV     ▼] │
│ 服务器地址: [https://...]   │
│ 用户名:     [_____________] │
│ 密码:       [_____________] │
│ 保存路径:   /Substack/      │
│ [测试连接] [保存配置]        │
└─────────────────────────────┘
```

---

### **六、知识管理功能**

#### 6.1 标签与分类
**方案**：自动提取和添加标签
- 从文章元数据提取 tags
- AI 生成主题标签
- 用户自定义分类
- 保存到 Markdown frontmatter

**输出格式**：
```markdown
---
title: "如何构建成功的工程团队"
author: "John Doe"
tags: [工程管理, 团队协作, 领导力]
category: 技术管理
date: 2026-01-29
source: substack
source_url: https://...
extracted_at: 2026-01-30T10:30:00Z
---

# 如何构建成功的工程团队
...
```

#### 6.2 全文搜索
**方案**：建立本地索引
- 使用 Chrome IndexedDB 存储元数据
- 支持全文搜索已下载文章
- 快速查找历史文章

**搜索界面**：
```javascript
// popup.html 增强
<input type="text" id="searchInput" placeholder="搜索已下载的文章...">

<div id="searchResults">
  <article>
    <h3>如何构建成功的工程团队</h3>
    <p>匹配片段: ...工程文化是...</p>
    <button>重新下载</button>
  </article>
</div>
```

---

### **七、协作与分享**

#### 7.1 生成分享链接
**方案**：将 Markdown 上传到公共服务
- GitHub Gist（匿名或登录）
- Pastebin
- 临时分享链接

**实现**：
```javascript
async function shareToGist(markdown) {
  const response = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userConfig.githubToken}`,
      'Accept': 'application/vnd.github.v3+json'
    },
    body: JSON.stringify({
      description: 'Substack article export',
      public: false,
      files: {
        'article.md': { content: markdown }
      }
    })
  });
  return response.html_url;
}
```

#### 7.2 高亮与笔记
**方案**：允许用户在页面添加标注
- 选择文本 → 添加高亮
- 添加个人笔记
- 导出到 Markdown 时包含笔记

**数据结构**：
```javascript
const annotations = {
  articleUrl: 'https://...',
  highlights: [
    { text: '关键句...', note: '我的思考', position: 123 }
  ],
  notes: [
    { content: '整体评论', timestamp: '...' }
  ]
};
```

---

### **八、开发者体验**

#### 8.1 开放 API
**方案**：提供编程接口
```javascript
// 其他扩展可调用
chrome.runtime.sendMessage(
  'extension-id',
  { action: 'extractArticle', url: '...' },
  response => console.log(response.data)
);
```

#### 8.2 调试模式
**方案**：开发者工具面板
- 查看 JSON-LD 原始数据
- 测试提取规则
- 验证 Markdown 输出

**DevTools Panel**：
```
Substack Extractor DevTools
├── [Raw Data] - JSON-LD 原始数据
├── [Extracted] - 提取后的结构化数据
├── [Markdown] - 生成的 Markdown
└── [Settings] - 调试选项
```

---

### **九、性能与可靠性**

#### 9.1 增量更新检测
**方案**：智能判断是否需要重新下载
- 记录已下载文章 URL 和 dateModified
- 检测文章是否更新
- 只下载变化的内容

**数据存储**：
```javascript
// IndexedDB
const db = {
  name: 'SubstackExtractorDB',
  stores: {
    articles: {
      keyPath: 'url',
      indexes: ['dateModified', 'downloadedAt']
    }
  }
};
```

#### 9.2 错误恢复
**方案**：失败重试机制
- 网络错误自动重试（3次）
- 保存失败队列
- 稍后重试

**重试逻辑**：
```javascript
async function retryDownload(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await download(url);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await delay(1000 * (i + 1)); // 指数退避
    }
  }
}
```

---

### **十、用户体验优化**

#### 10.1 快捷键支持
**方案**：键盘快捷操作

| 快捷键 | 功能 |
|--------|------|
| `Alt+S` | 提取当前文章 |
| `Alt+B` | 批量下载该作者所有文章 |
| `Alt+P` | 预览 Markdown |
| `Alt+D` | 下载 Markdown |
| `Alt+N` | 推送到 Notion |

**manifest.json 配置**：
```json
"commands": {
  "extract-article": {
    "suggested_key": {
      "default": "Alt+S"
    },
    "description": "提取当前文章为 Markdown"
  }
}
```

#### 10.2 右键菜单集成
**方案**：浏览器上下文菜单

```javascript
// manifest.json
"permissions": ["contextMenus"],

// background.js
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'extractPage',
    title: '提取此页面为 Markdown',
    contexts: ['page', 'link']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'extractPage') {
    extractArticle(tab.id, info.linkUrl || tab.url);
  }
});
```

#### 10.3 可视化进度
**方案**：批量下载时显示进度
- 浮动窗口显示当前任务
- 实时更新下载进度

**UI 设计**：
```
┌────────────────────────────────┐
│ Substack 批量下载               │
├────────────────────────────────┤
│ 正在下载: 第 3 / 10 篇          │
│ ████████░░░░░░░░░░ 30%         │
│ 当前: 如何构建成功的工程团队...  │
│ [暂停] [取消]                   │
└────────────────────────────────┘
```

---

### **十一、高级功能**

#### 11.1 订阅管理
**方案**：管理关注的作者
- 收藏喜欢的 Substack 作者
- 一键查看所有作者的新文章
- 类似 RSS 阅读器的体验

**数据结构**：
```javascript
const subscriptions = [
  {
    author: 'John Doe',
    url: 'https://author.substack.com',
    lastCheck: '2026-01-29',
    newArticles: 3,
    autoDownload: true
  }
];
```

#### 11.2 翻译功能
**方案**：集成翻译 API
- 自动翻译英文文章为中文
- 在 Markdown 中保留双语对照
- 使用 DeepL/Google Translate

**翻译结果格式**：
```markdown
## 原文（English）
The engineering culture is...

## 译文（中文）
工程文化是...
```

#### 11.3 文章关联分析
**方案**：分析文章间的引用关系
- 提取"推荐阅读"链接
- 生成文章关系图谱
- 找出相关主题文章

**可视化**：
```javascript
// 使用 D3.js 或 Cytoscape.js
const graph = {
  nodes: [{ id: 'article-1', label: '...' }],
  edges: [{ source: 'article-1', target: 'article-2' }]
};
```

---

### **十二、商业价值方向**

#### 12.1 付费内容支持
**方案**：登录状态提取
- 用户登录 Substack 后
- 插件可提取付费内容
- 保存到本地备份

**注意事项**：
- 仅提取用户已订阅的内容
- 遵守服务条款
- 不提供破解功能

#### 12.2 Newsletter 转 RSS
**方案**：为没有 RSS 的 Substack 生成 RSS feed
- 本地生成 RSS XML
- 可导入 RSS 阅读器

**RSS 格式**：
```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Author Name</title>
    <item>
      <title>Article Title</title>
      <link>https://...</link>
      <description>...</description>
      <pubDate>...</pubDate>
    </item>
  </channel>
</rss>
```

---

## 🎯 实施优先级

### 🔥 高优先级（立即开始）
| 功能 | 价值 | 复杂度 | 预估工作量 |
|------|------|--------|-----------|
| 图片本地化 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 2-3天 |
| 自定义模板 | ⭐⭐⭐⭐ | ⭐⭐ | 1-2天 |
| 批量下载 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 3-5天 |
| Notion 集成 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 2-3天 |
| Obsidian 集成 | ⭐⭐⭐⭐ | ⭐⭐ | 1-2天 |

**小计**：9-15 天

### 🌟 中优先级（近期规划）
| 功能 | 价值 | 复杂度 | 预估工作量 |
|------|------|--------|-----------|
| 多平台支持 (Medium, Ghost) | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 5-7天 |
| 标签与分类 | ⭐⭐⭐⭐ | ⭐⭐ | 1-2天 |
| 快捷键 + 右键菜单 | ⭐⭐⭐ | ⭐ | 0.5-1天 |
| 全文搜索 | ⭐⭐⭐⭐ | ⭐⭐⭐ | 2-3天 |
| WebDAV 支持 | ⭐⭐⭐ | ⭐⭐⭐ | 2-3天 |
| PDF 导出 | ⭐⭐⭐ | ⭐⭐ | 1-2天 |

**小计**：11.5-18 天

### 💡 低优先级（长期方向）
| 功能 | 价值 | 复杂度 | 预估工作量 |
|------|------|--------|-----------|
| AI 摘要 | ⭐⭐⭐ | ⭐⭐⭐ | 2-3天（需API成本） |
| 翻译功能 | ⭐⭐ | ⭐⭐⭐ | 2-3天 |
| 订阅管理 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 5-7天 |
| 文章关系图谱 | ⭐⭐ | ⭐⭐⭐⭐⭐ | 7-10天 |
| 开放 API | ⭐⭐⭐ | ⭐⭐ | 1-2天 |
| 调试面板 | ⭐⭐ | ⭐⭐ | 1-2天 |

**小计**：18-27 天

---

## 📋 第一步行动建议

### 方案 A：核心功能增强（推荐）
**目标**：打造最强单篇文章提取体验

**实施顺序**：
1. 图片本地化（2-3天）
2. 自定义模板（1-2天）
3. Notion/Obsidian 一键推送（2-3天）

**成果**：用户体验显著提升，满足 80% 核心需求

### 方案 B：批量处理能力
**目标**：解决备份整个订阅源的刚需

**实施顺序**：
1. 批量下载功能（3-5天）
2. 进度可视化（1天）
3. WebDAV 云存储（2-3天）

**成果**：差异化功能，吸引深度用户

### 方案 C：平台扩展
**目标**：从 Substack 工具升级为通用工具

**实施顺序**：
1. 重构为适配器架构（2-3天）
2. 实现 Medium 提取器（2-3天）
3. 实现 Ghost 提取器（1-2天）

**成果**：用户群体扩大 5-10 倍

---

## 🛠️ 技术债务清理

### 当前需要优化的点
1. **代码模块化**：将 content.js 拆分为多个模块
2. **错误处理**：添加更详细的错误日志
3. **测试覆盖**：添加单元测试和 E2E 测试
4. **类型安全**：考虑迁移到 TypeScript

---

## 📝 版本规划

### v1.1（下一版本）
- 图片本地化
- 自定义模板
- Notion 集成

### v1.2
- 批量下载
- Obsidian 集成
- 快捷键支持

### v1.3
- 多平台支持（Medium）
- 全文搜索
- 标签分类

### v2.0
- 订阅管理
- 自动同步
- RSS 生成

---

**文档生成时间**：2026-02-04
**最后更新**：2026-02-04
