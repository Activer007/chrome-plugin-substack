# Substack to Markdown 插件 - 改进规划

## 📊 当前项目状态分析

### 当前版本：v1.0.4 (2026-02-05)

### 核心功能
从 Substack 文章提取数据 → 转换为 Markdown → 下载到本地

### 整体进度
- **第一阶段（核心体验增强）**：✅ 100% 完成 (6/6)
- **第二阶段（高级功能）**：✅ 75% 完成 (3/4)
- **第三阶段（架构升级）**：⬜ 0% 完成 (0/3)
- **第四阶段（合规性检查）**：⬜ 0% 完成 (0/5)

### 已完成改进
- ✅ 支持所有 Substack 自定义域名
- ✅ 友好的文件名生成（3种格式可选）
- ✅ 不破坏原始 DOM
- ✅ 健壮的错误处理
- ✅ UI 重设计 (Substack 原生风)
- ✅ 设置面板视觉增强（v1.0.4）
- ✅ 设置按钮交互优化（v1.0.4）
- ✅ YAML Frontmatter 支持 (Obsidian 兼容)
- ✅ 剪贴板一键复制
- ✅ PDF 打印优化（v1.0.3 修复标题空白）
- ✅ 图片本地化 ZIP 导出
- ✅ Obsidian 一键保存（URI Scheme）
- ✅ Markdown 预览界面
- ✅ 脚注支持（标准 Markdown 格式）

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
    - ✅ **v1.0.3 修复**: 使用 Chrome DevTools MCP 工具分析并修复打印时标题上方 ~100px 空白问题（modalViewer 和 article 的 padding/margin 重置）
4.  ✅ **剪贴板支持**: 添加 "Copy Markdown" 按钮，解决高频粘贴需求。
5.  ✅ **脚注支持**: 解析 `<sup>` 和锚点，生成标准脚注。
6.  ✅ **自定义文件名**: 允许用户配置命名规则（如 `yyyy-MM-dd-Title.md`）。

### 🔵 第二阶段：高级功能 (Power Features)
**目标**：解决"永久存档"和"无缝集成"的痛点。
*预计耗时：1 周 | 实际进度：3/4 完成 (75%)*

1.  ✅ **图片本地化 (ZIP)**: 使用 JSZip 打包图片和 Markdown，实现真正离线阅读。
2.  ✅ **Obsidian 一键保存**: 利用 URI Scheme 直接写入 Obsidian Vault。
3.  **智能内容清理**: 增加"纯净模式"选项，移除推广干扰。
4.  ✅ **预览界面**: 下载前预览并确认内容（v1.0.3 已实现基础预览功能）。

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

## 📋 更新日志

### 2026-02-05 - v1.0.4
**分支**: `fix/settings-button`
**PR**: [#11](https://github.com/Activer007/chrome-plugin-substack/pull/11)

#### 问题诊断
用户报告设置按钮点击无响应。经分析发现：
- JS 使用 `display` 属性控制显示/隐藏
- CSS 使用 `transform/opacity/visibility` 控制显示/隐藏
- 两者机制不一致导致修改 `display` 后 CSS 动画不生效

#### 修复内容

**1. 修复设置按钮切换逻辑**
- 将 `toggleSettings()` 从修改 `display` 改为切换 `.open` CSS 类
- 与 CSS 中的 `.settings-drawer.open` 动画配合

**2. 增强设置面板视觉设计**
- 渐变背景：`rgba(255,255,255,0.98)` → `rgba(249,250,251,0.98)`
- 顶部 3px 橙色强调线（品牌色 `#FF6719`）
- 左右各 8px 空隙，创造悬浮效果
- 双层阴影增强深度感
- 底部 12px 圆角

**3. 改进图标一致性**
- 替换为更简洁的 Material Design 风格设置图标
- 与底部操作按钮图标风格保持一致

**4. 增强交互体验**
- 点击设置面板外部区域自动关闭
- Escape 键关闭设置面板和预览模态框

#### 技术细节
```javascript
// 修改前
function toggleSettings() {
  const isVisible = settingsPanel.style.display !== 'none';
  settingsPanel.style.display = isVisible ? 'none' : 'block';
  settingsBtn.style.color = isVisible ? '#888' : '#FF6719';
}

// 修改后
function toggleSettings() {
  settingsPanel.classList.toggle('open');
  const isOpen = settingsPanel.classList.contains('open');
  settingsBtn.style.color = isOpen ? '#FF6719' : '#888';
}

// 新增：点击外部关闭
document.addEventListener('click', (e) => {
  if (!settingsPanel.contains(e.target) && !settingsBtn.contains(e.target)) {
    if (settingsPanel.classList.contains('open')) {
      settingsPanel.classList.remove('open');
      settingsBtn.style.color = '#888';
    }
  }
});
```

```css
/* 设置面板新样式 */
.settings-drawer {
  background: linear-gradient(to bottom, rgba(255,255,255,0.98), rgba(249,250,251,0.98));
  border: 1px solid rgba(0,0,0,0.08);
  border-top: 3px solid var(--primary);
  box-shadow:
    0 8px 24px rgba(0,0,0,0.12),
    0 2px 6px rgba(0,0,0,0.08);
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  margin: 0 8px;
  width: calc(100% - 16px);
}
```

#### 提交记录
- f958d78: Fix settings button toggle logic
- 3c2f4f3: Enhance settings drawer visual distinction
- 6190e82: Improve icon consistency and add click-outside-to-close

---

### 2026-02-04 - v1.0.3
**分支**: `fix/pdf-print-top-spacing`

#### 问题诊断
使用 Chrome DevTools MCP 工具分析打印页面布局，发现：
- `modalViewerInner`: `padding: 12px`
- `modalViewer` 内部子元素: `paddingTop: 88px` ⚠️ 主要问题源
- `article`: `paddingTop: 16px`
- 累计空白: ~101px

#### 修复内容
- 重置 `[class*="modalViewer"]` 及其所有子元素的 padding/margin
- 重置 `article` 元素的 padding/margin
- 重置 `article > *:first-child` 的顶部间距
- 重置 `h1` 的 margin-top 和 padding-top

#### 技术细节
```css
/* 关键修复规则 */
[class*="modalViewer"] {
  padding: 0 !important;
  margin: 0 !important;
}

[class*="modalViewer"] [class*="pc-padding"] {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  /* ... */
}

article {
  padding: 0 !important;
  margin: 0 !important;
}

article > *:first-child {
  margin-top: 0 !important;
  padding-top: 0 !important;
}

h1 {
  margin-top: 0 !important;
  padding-top: 0 !important;
}
```

---

## 🎯 剩余任务优先级建议 (v1.0.3 之后)

### ⚡ 立即可做（高优先级）

#### 1. 智能内容清理（"纯净模式"）- 第二阶段收尾
**预计耗时**：0.5-1 天
**价值**：🌟🌟🌟🌟⭐ (用户需求明显)

**任务清单**：
- [ ] 在 popup.html 添加"纯净模式"checkbox
- [ ] 实现内容过滤逻辑（黑名单选择器）
- [ ] 过滤 Subscribe/Upgrade/Gift 等推广内容
- [ ] 测试不同页面的过滤效果

---

### 🔥 短期规划（1-2 周）

#### 2. 代码模块化 - 第三阶段启动
**预计耗时**：1-2 天
**价值**：🌟🌟🌟⭐⭐ (为后续功能打好基础)

**任务清单**：
- [ ] 拆分 popup.js → extractor.js, converter.js, ui.js
- [ ] 更新 manifest.json 引用
- [ ] 测试重构后的功能完整性

#### 3. Chrome Web Store 发布准备 - 第四阶段
**预计耗时**：1 天
**价值**：🌟🌟🌟🌟🌟 (发布前必须完成)

**任务清单**：
- [ ] 依赖本地化检查（确认无 CDN 链接）
- [ ] CSP 检查（无内联脚本）
- [ ] 权限最小化审查
- [ ] 补充 32x32 图标
- [ ] Service Worker 持久化测试

---

### 📅 中期规划（2-4 周）

#### 4. 批量下载功能
**预计耗时**：3-5 天
**价值**：🌟🌟🌟🌟⭐ (核心功能，用户期待)

#### 5. 引入 Readability.js & Turndown
**预计耗时**：2-3 天
**价值**：🌟🌟🌟⭐⭐ (提升代码质量)

---

### 🔮 长期规划（按需实现）

#### 6. 多平台适配（Medium、Ghost 等）
**预计耗时**：1-2 周
**价值**：🌟🌟⭐⭐⭐ (扩展生态)

#### 7. 其他高级功能
- 右键菜单集成
- 快捷键支持
- Notion API 集成
- AI 摘要生成
- WebDAV 同步
- 本地数据库（IndexedDB）

---

## 📌 下一步行动建议

### 推荐路线 A：快速收尾 + 发布（适合近期发布）
```
v1.0.3 (当前) → v1.0.4 (纯净模式) → v1.1.0 (Chrome Store 发布)
```
1. ✅ 实现"纯净模式"（0.5-1 天）
2. ✅ Chrome Store 发布准备（1 天）
3. ✅ 提交 Chrome Web Store 审核

### 推荐路线 B：完善功能 + 架构升级（适合长期维护）
```
v1.0.3 (当前) → v1.0.4 (纯净模式) → v1.1.0 (代码模块化) → v1.2.0 (批量下载)
```
1. ✅ 实现"纯净模式"（0.5-1 天）
2. ✅ 代码模块化重构（1-2 天）
3. ✅ 批量下载功能（3-5 天）
4. ✅ Chrome Store 发布准备（1 天）

---

**文档更新时间**：2026-02-05
**当前版本**：v1.0.4
**状态**：第一阶段 ✅ 100% | 第二阶段 ✅ 75% | 第三阶段 ⬜ 0% | 第四阶段 ⬜ 0%
