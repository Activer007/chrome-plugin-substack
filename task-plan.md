# Substack to Markdown 插件 - 改进规划

## 📊 当前项目状态分析

### 核心功能
从 Substack 文章提取数据 → 转换为 Markdown → 下载到本地

### 已完成改进
- ✅ 支持所有 Substack 自定义域名
- ✅ 友好的文件名生成
- ✅ 不破坏原始 DOM
- ✅ 健壮的错误处理
- ✅ UI 重设计 (Substack 原生风)
- ✅ YAML Frontmatter 支持 (Obsidian 兼容)

### 技术架构
```
chrome-plugin-substack/
├── manifest.json       # Manifest V3 配置
├── popup.js            # 核心逻辑 (注入提取与转换)
├── popup.html          # 用户界面
└── icons/              # 图标资源
```

---

## 🚀 改进方向（14个维度）

### **一、UI/UX 设计重构：Substack 原生风 (Lite & Native)**
**目标**：打造与 Substack 平台视觉一致的沉浸式体验。
- **视觉风格**：
    - **极简主义 (Clean & Minimalist)**：去除厚重渐变背景，采用极简白底 + 柔和阴影。
    - **品牌色**：使用 **Substack Orange (#FF6719)** 作为主操作按钮颜色，建立"原生感"。
    - **字体**：标题使用衬线体 (Georgia / Merriweather) 呼应文学质感，正文使用系统无衬线体。
    - **排版**：增加留白 (Whitespace)，提升阅读呼吸感。
- **交互体验**：
    - **渐进式披露**：初始仅显示文章卡片（封面+标题），点击"预览"或"设置"后展开更多面板。
    - **微交互**：按钮加载状态、成功/失败的轻微震动反馈。
    - **Tab 布局**：重构为底部导航栏 (主页 / 历史 / 设置)。
- **布局重构**：
    - **Header**: Logo + 设置入口。
    - **Main**: 带有封面图背景的文章状态卡片 + 大尺寸 CTA 按钮。
    - **Footer**: 导航切换。

### **二、核心体验增强 (Core UX)**

#### 2.1 剪贴板支持 (Clipboard)
**方案**：一键复制生成的 Markdown
- 在 Popup 界面添加 "Copy to Clipboard" 按钮
- 方便直接粘贴到 Notion, Obsidian 或其他笔记软件
- 显示 "Copied!" Toast 提示

#### 2.2 预览模式 (Preview)
**方案**：下载前确认内容
- 在下载前展示 Markdown 预览窗口
- 允许用户简单编辑或勾选需要保留的段落
- 使用 Monaco Editor 或 Highlight.js 渲染预览

#### 2.3 快捷操作
- **右键菜单集成**：网页右键菜单添加 "Save as Markdown"
- **快捷键**：支持 `Alt+Shift+M` 快速触发

---

### **三、导出格式扩展**

#### 3.1 PDF 导出支持
**方案A：原生打印优化 (Native Print) - 🌟 推荐方案**
*利用 Chrome 原生渲染引擎，注入打印样式表*
- **实现**：点击 "Export PDF" 时注入 `@media print` 样式
- **样式优化**：移除侧边栏/导航/广告，强制白底黑字，优化图片分页逻辑
- **优势**：渲染最完美（文字矢量可复制），代码极轻量
- **劣势**：需用户在打印预览框手动保存

**方案B：Markdown 转 PDF (Markdown-based) - 🟡 远期规划**
*在前端将生成的 Markdown 重渲染为 PDF*
- **实现**：`Markdown` -> `pagedjs` -> `PDF`
- **优势**：格式最纯净，完全重排版
- **状态**：列为低优先级，视未来需求决定是否实现

#### 3.2 自定义模板与 YAML Frontmatter
**方案**：满足笔记软件（Obsidian/Notion）的元数据需求
- **YAML 头**：标准化的元数据块，支持 tags, date, author, url
- **模板配置**：
  ```yaml
  ---
  title: "{{title}}"
  author: "{{author}}"
  date: {{date}}
  url: "{{url}}"
  tags: [substack, {{tags}}]
  ---

  # {{title}}
  ```
- **文件名模板**：允许用户定义 `{{date}}-{{title}}` 或 `{{author}}/{{title}}`

#### 3.3 多格式导出
- 支持 HTML (纯净版)

---

### **四、内容处理增强**

#### 4.1 图片本地化 (ZIP 导出)
**方案**：解决远程图片失效及防盗链问题
- 引入 `JSZip` 库
- 自动下载文章内图片到 `assets/` 目录
- Markdown 引用相对路径
- 打包下载 `article.zip` (包含 `.md` 和图片文件夹)

#### 4.2 智能内容清理 ("纯净模式")
**方案**：移除干扰信息
- 移除营销内容（Subscribe 按钮、"Gift a subscription"、推荐阅读）
- 增加黑名单选择器配置
- 提取核心正文，过滤 Sidebar 和 Footer

#### 4.3 脚注 (Footnotes) 支持
**方案**：完善学术/深度文章体验
- 识别 `<sup>` 标签和脚注链接
- 转换为标准 Markdown 脚注格式 (`[^1]: ...`)
- 确保引用跳转正常

#### 4.4 AI 摘要生成 (实验性)
- 调用 OpenAI/Claude API 生成文章摘要
- 在 Markdown 顶部添加 "TL;DR"

---

### **五、批量处理与自动化**

#### 5.1 批量下载功能
**方案**：添加"订阅源批量下载"功能
- 从作者归档页面 (`/archive`) 提取所有文章链接
- 队列化下载，避免请求过载
- 显示进度条和下载状态
- 支持暂停/恢复

#### 5.2 自动同步功能
**方案**：定期自动检查并下载新文章
- 后台定时任务（每小时/每天）
- 只下载新文章，去重机制

---

### **六、云服务集成**

#### 6.1 Obsidian 深度集成
**方案**：优化 Obsidian 工作流
- **URI Scheme 唤起**：增加 "Save to Obsidian" 按钮
- 使用 `obsidian://new?name=...&content=...` 直接创建笔记

#### 6.2 Notion/云存储同步
- 一键推送到 Notion 数据库（需集成 Notion API）
- WebDAV 网盘同步支持

---

### **七、架构优化与工程化**

#### 7.1 提取引擎增强 (Readability.js)
**方案**：增强容错性
- 当 Substack 特定选择器失效时，自动回退到 Mozilla 的 `Readability.js` 算法
- 确保非标准页面也能提取出正文

#### 7.2 转换引擎升级 (Turndown)
**方案**：更稳健的 Markdown 生成
- 引入 `turndown` 库替代手写正则替换
- 更好地处理复杂嵌套（表格、引用代码块）

#### 7.3 代码模块化
- 将 `popup.js` 拆分为：
  - `extractor.js`: 负责 DOM 解析
  - `converter.js`: 负责 HTML -> MD 转换
  - `ui.js`: 负责 Popup 交互

---

## 🎯 实施优先级与路线图

基于 "Quick Wins" -> "Core Value" -> "Scale" 的策略：

### 🟢 第一阶段：核心体验增强 (Quick Wins)
**目标**：不改变架构，大幅提升生成的 Markdown 质量和易用性，并完成 UI 改版。
*预计耗时：3-4 天*

1.  ✅ **UI/UX 重构**: 实现 "Substack 原生风" 界面（白底、橙色按钮、衬线体）。
2.  ✅ **YAML Frontmatter**: 添加标准元数据头，方便 Obsidian/Notion 索引。
3.  ✅ **PDF 导出 (Lite)**: 实现基于 CSS 的原生打印优化方案。
4.  ✅ **剪贴板支持**: 添加 "Copy Markdown" 按钮，解决高频粘贴需求。
5.  ✅ **脚注支持**: 解析 `<sup>` 和锚点，生成标准脚注。
6.  **自定义文件名**: 允许用户配置命名规则（如 `yyyy-MM-dd-Title.md`）。

### 🔵 第二阶段：高级功能 (Power Features)
**目标**：解决"永久存档"和"无缝集成"的痛点。
*预计耗时：1 周*

1.  **图片本地化 (ZIP)**: 使用 JSZip 打包图片和 Markdown，实现真正离线阅读。
2.  **Obsidian 一键保存**: 利用 URI Scheme 直接写入 Obsidian Vault。
3.  **智能内容清理**: 增加"纯净模式"选项，移除推广干扰。
4.  **预览界面**: 下载前预览并确认内容，支持 Monaco Editor 高亮。

### 🟠 第三阶段：架构升级与扩展 (Scale)
**目标**：提升代码稳健性，支持更多场景。
*预计耗时：2 周*

1.  **引入 Readability.js & Turndown**: 重构核心提取与转换层。
2.  **批量下载**: 队列化处理订阅源归档。
3.  **多平台适配**: 扩展支持 Medium 等平台。

### ⚪ 第四阶段：Chrome 官方合规性检查 (Post-Release)
**目标**：确保插件符合 Store 发布标准（优先级最低，功能完备后再做）。
*预计耗时：1 天*

1.  **依赖本地化**: 检查所有第三方库（如 JSZip, Turndown）是否已下载到本地，移除所有 CDN 链接。
2.  **CSP 检查**: 确保无内联脚本违反 Content Security Policy。
3.  **权限最小化**: 移除未使用的 `host_permissions` 或 `permissions`。
4.  **图标规范**: 补充 32x32px 图标，检查各尺寸图标显示效果。
5.  **Service Worker 持久化**: 检查后台任务是否依赖全局变量（针对 V3 瞬时特性）。

---

**文档更新时间**：2026-02-04
**状态**：已整合 UI/UX 重构与 PDF 导出方案
