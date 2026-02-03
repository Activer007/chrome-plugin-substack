# Substack to Markdown Chrome 插件

一个 Chrome 浏览器插件，用于从 Substack 文章页面提取标题、作者、日期、内容等信息并保存为 Markdown 格式。

## 功能特性

- ✅ 自动识别 Substack 文章页面
- 📋 提取完整的文章元数据（标题、作者、发布日期、描述）
- 🖼️ 保留文章中的图片
- 🔗 收集文章内的所有链接
- 📝 生成格式良好的 Markdown 文件
- 💾 一键下载保存到本地
- 👁️ 预览生成的 Markdown 内容

## 技术实现

### 数据提取策略

插件使用多种策略来提取文章数据：

1. **JSON-LD 结构化数据**（主要数据源）
   ```javascript
   // 从 <script type="application/ld+json"> 提取
   const jsonLd = document.querySelector('script[type="application/ld+json"]');
   ```

2. **DOM 解析**（内容提取）
   ```javascript
   // 从 <main> 标签提取文章内容
   const main = document.querySelector('main');
   ```

### 提取的数据字段

| 字段 | 来源 | 说明 |
|------|------|------|
| 标题 | JSON-LD / meta | 文章主标题 |
| 副标题 | h3 | 文章描述性副标题 |
| 作者 | JSON-LD | 作者名称和链接 |
| 发布日期 | JSON-LD | ISO 8601 格式日期 |
| 出版社 | JSON-LD | Substack 出版物信息 |
| 封面图 | JSON-LD | 主文章图片 |
| 正文内容 | DOM | 文章所有段落和标题 |
| 图片 | DOM | 文章内的所有图片 |
| 链接 | DOM | 文章内的所有外部链接 |

### 限制说明

- ⚠️ **付费内容**：需要登录订阅才能获取付费墙后的完整内容
- ⚠️ **动态加载**：某些内容可能是异步加载的

## 文件结构

```
chrome-plugin-substack/
├── manifest.json       # 插件配置文件
├── content.js          # 内容脚本（注入到页面）
├── popup.html          # 弹出窗口界面
├── popup.js            # 弹出窗口逻辑
├── background.js       # 后台服务脚本
├── icons/              # 图标文件
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md           # 本文档
```

## 安装方法

### 开发模式安装

1. 克隆或下载此项目
2. 打开 Chrome 浏览器，访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目文件夹

### 使用方法

1. 访问任意 Substack 文章页面（例如：`https://substack.com/home/post/p-186071474`）
2. 点击浏览器工具栏中的插件图标
3. 查看提取的文章信息
4. 点击"提取并下载 Markdown"按钮
5. 选择保存位置，文件将自动下载

## 生成的 Markdown 格式

```markdown
# 文章标题

## 📋 文章信息
- **作者**: 作者名称
- **发布日期**: 2026年1月29日
- **出版社**: 出版物名称
- **原文链接**: https://...

## 📝 简介
文章描述...

## 🖼️ 封面
![封面图](图片URL)

## 📖 正文

### 章节标题
段落内容...

## 🔗 相关链接
- [链接文本](URL)

---
*提取时间: 2026年1月29日*
*由 Substack to Markdown 插件生成*
```

## 开发说明

### 权限说明

插件需要以下权限：
- `activeTab`: 访问当前活动标签页
- `scripting`: 注入脚本到页面
- `downloads`: 下载生成的 Markdown 文件
- `host_permissions`: 访问 substack.com 域名

### 扩展功能建议

可以考虑添加的功能：
- 批量下载多篇文章
- 自动保存到云服务（Notion, Obsidian 等）
- 自定义 Markdown 模板
- 导出为 PDF 或 HTML
- 添加标签和分类功能

## 常见问题

**Q: 为什么有些文章无法提取完整内容？**
A: 付费文章需要登录订阅才能访问完整内容。插件只能提取当前可见的内容。

**Q: 支持其他平台吗？**
A: 当前版本仅支持 Substack。可以扩展支持 Medium、Ghost 等其他平台。

**Q: 如何自定义 Markdown 格式？**
A: 可以修改 `content.js` 中的 `convertToMarkdown` 函数来自定义输出格式。

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
