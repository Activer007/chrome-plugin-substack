# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个 Chrome 浏览器插件（Manifest V3），用于从 Substack 文章页面提取内容并保存为 Markdown 格式。

## 开发命令

### 安装和测试插件
由于这是 Chrome 插件，没有传统的构建命令。开发和测试方式：

1. **加载插件**：在 Chrome 中访问 `chrome://extensions/`，启用"开发者模式"，点击"加载已解压的扩展程序"，选择项目根目录
2. **重新加载**：修改代码后，在 `chrome://extensions/` 页面点击插件的"重新加载"按钮（或按 `Ctrl+R`）
3. **调试**：
   - Popup 界面：右键点击插件图标 → "检查弹出内容"
   - Content Script：在 Substack 页面按 `F12` 打开开发者工具
   - Background Script：在 `chrome://extensions/` 页面点击"Service Worker"查看日志

### 查看日志
插件使用详细的控制台日志，前缀标识来源：
- `[Popup]` - popup.js 中的日志
- `[Injected]` - 通过 executeScript 注入到页面的代码日志
- `[Substack Extractor]` - content.js 中的日志（目前主要逻辑在 popup.js 中注入）

## 代码架构

### 核心文件
- `manifest.json` - Manifest V3 配置，定义权限和脚本
- `popup.html` + `popup.js` - 插件弹出窗口 UI 和主要逻辑
- `content.js` - 内容脚本（目前仅作为备用，主要提取逻辑在 popup.js 中注入）
- `background.js` - 后台服务脚本（目前仅监听安装/更新事件）

### 数据提取流程

**主要逻辑在 popup.js 中**，通过 `chrome.scripting.executeScript` 动态注入到页面：

1. **页面检测** (`checkPage`)：验证当前是否为 Substack 文章页面
   - 支持：`xxx.substack.com/p/xxx`、自定义域名、`substack.com/inbox/post/p-xxx`、`substack.com/home/post/p-xxx`
   - 不支持：纯首页 `substack.com/home`

2. **元数据提取** (`extractJsonLdData` → `extractMetaDataFromDOM`)：
   - **优先策略**：从 JSON-LD (`<script type="application/ld+json">`) 提取结构化数据
   - **回退策略**：从 DOM 解析（用于 inbox/home 模式或无 JSON-LD 的页面）
     - 标题：document.title 或最长的 `/p/` 链接文本
     - 作者：包含 `/@` 的链接
     - 日期：正则匹配 `^[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}$`
     - 发布者：从主文章链接的域名提取

3. **内容提取** (`extractArticleContent`)：
   - 容器查找顺序：`main` → `article` → `#entry`
   - 优先使用 `.body.markup` 容器（Substack 主内容区）
   - 遍历子元素，过滤导航、订阅按钮等无关内容
   - **图片保留在原始位置**（而非末尾单独列表）

4. **HTML → Markdown 转换** (`htmlToMarkdown`)：
   - 保留链接 `<a>`：移除 UTM 跟踪参数
   - 保留加粗 `<strong>/<b>`：转换为 `**text**`
   - 保留斜体 `<em>/<i>`：转换为 `*text*`
   - 保留代码 `<code>`：转换为 `` `text` ``

5. **文件下载**：使用 `chrome.downloads.download` API

### 关键设计决策

1. **为什么主要逻辑在 popup.js 中注入而非 content.js？**
   - 更灵活：可以根据用户操作动态注入
   - 避免污染：不需要在每个页面都运行提取逻辑
   - 调试方便：可以更精细控制执行时机

2. **内容提取的智能过滤**：
   - 跳过包含 "Subscribe"、"Sign in" 等导航文本
   - 过滤头像图片（检测 `/w_32,`、`/w_36,` 等尺寸）
   - 排除侧边栏推荐文章（`reader2-inbox-post`、`linkRow` class）

3. **日期解析容错**：
   - 支持标准 ISO 格式（JSON-LD）
   - 支持子格式 "Jan 05, 2026"（DOM 解析）
   - 解析失败时使用当前日期

## 开发注意事项

1. **manifest.json 版本号**：更新功能时需同步 `manifest.json` 中的 `version` 字段

2. **host_permissions**：如需支持更多域名，在 `manifest.json` 中添加到 `host_permissions`

3. **中文文件名支持**：文件名清理时使用 `[\u4e00-\u9fa5]` 保留中文字符

4. **调试日志**：所有关键操作都有 `[Injected]` 或 `[Popup]` 前缀的日志，便于问题定位
