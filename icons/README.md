# 图标文件说明

## 📁 文件列表

- `icon.svg` - SVG 矢量源文件
- `generate-icons.html` - 浏览器版图标生成器（推荐使用）
- `generate-icons.js` - Node.js 版图标生成脚本
- `icon16.png` - 16×16 像素图标（工具栏）
- `icon48.png` - 48×48 像素图标（扩展管理）
- `icon128.png` - 128×128 像素图标（Chrome 商店）

## 🎨 设计说明

### 视觉元素

| 元素 | 含义 | 说明 |
|------|------|------|
| 橙色圆形背景 | Substack 品牌 | 使用 Substack 官方橙色 #FF6719 |
| 三条白色横线 | 文章堆叠 | 代表 Substack 的核心概念 |
| 向下箭头 | 下载/保存 | 表示插件的功能 |
| "MD" 文字 | Markdown | 输出格式标识 |

### 设计理念

1. **品牌一致性**: 使用 Substack 的标志性橙色
2. **简洁明了**: 在小尺寸下依然清晰可辨
3. **功能传达**: 箭头和 MD 文字清楚表达插件用途
4. **专业外观**: 现代扁平化设计风格

## 🚀 生成图标

### 方法一：使用浏览器（推荐，最简单）

1. 在浏览器中打开 `generate-icons.html`
2. 查看三个尺寸的图标预览
3. 点击"下载所有图标"按钮
4. 图标将自动保存到下载文件夹

**优点**:
- ✅ 无需安装任何依赖
- ✅ 可视化预览
- ✅ 一键下载所有尺寸

### 方法二：使用 Node.js

```bash
# 1. 安装依赖
npm install canvas

# 2. 运行生成脚本
node generate-icons.js

# 3. 图标将生成在当前目录
```

**优点**:
- ✅ 命令行操作
- ✅ 可集成到构建流程
- ✅ 批量生成

### 方法三：手动转换 SVG

使用在线工具将 `icon.svg` 转换为 PNG：

1. 访问 https://cloudconvert.com/svg-to-png
2. 上传 `icon.svg`
3. 分别导出 16px、48px、128px 三个尺寸
4. 重命名为 icon16.png、icon48.png、icon128.png

## 📏 尺寸规格

| 文件 | 尺寸 | 用途 |
|------|------|------|
| icon16.png | 16×16px | 浏览器工具栏 |
| icon48.png | 48×48px | Chrome 扩展管理页面 |
| icon128.png | 128×128px | Chrome Web Store |

## 🔧 颜色值

- **主色**: `#FF6719` (Substack 橙色)
- **白色**: `#FFFFFF`

## 📝 使用图标

图标已经配置在 `manifest.json` 中：

```json
{
  "action": {
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

## 🎯 自定义设计

如果你想修改图标设计：

1. **修改 SVG**: 编辑 `icon.svg` 文件
2. **更新 HTML**: 修改 `generate-icons.html` 中的绘制代码
3. **重新生成**: 使用任一生成方法创建新的 PNG 文件

### 主要绘制参数

```javascript
// 背景圆形
ctx.arc(64, 64, 64, 0, Math.PI * 2);

// 堆叠线条 (x, y, width, height, radius)
roundRect(ctx, 28, 75, 72, 8, 2);  // 底部
roundRect(ctx, 28, 59, 72, 8, 2);  // 中间
roundRect(ctx, 28, 43, 72, 8, 2);  // 顶部

// 箭头
ctx.moveTo(64, 20);  // 顶部
ctx.lineTo(64, 38);  // 底部
ctx.lineTo(58, 32);  // 左翼
ctx.lineTo(70, 32);  // 右翼
```

## ✅ 质量检查

生成图标后，请检查：

- [ ] 三个尺寸的图标都已生成
- [ ] 在不同背景下都清晰可见
- [ ] 16×16 尺寸下仍能识别主要元素
- [ ] 颜色与 Substack 品牌一致
- [ ] 文件名正确（icon16.png, icon48.png, icon128.png）

## 📚 参考资源

- [Substack 官方网站](https://substack.com/)
- [Chrome 扩展图标指南](https://developer.chrome.com/docs/webstore/branding/)
- [Favicon 设计最佳实践](https://www.favicon-generator.org/about/icon-design/)
