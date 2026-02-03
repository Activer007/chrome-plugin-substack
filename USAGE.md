# 🚀 快速开始指南

## 方法一：直接在浏览器测试（推荐用于验证功能）

这是最快速的方法，无需安装插件即可测试提取功能：

1. **打开 Substack 文章页面**
   - 访问任意 Substack 文章，例如：
     - https://substack.com/home/post/p-186071474
     - https://newsletter.eng-leadership.com/p/how-to-build-a-successful-engineer

2. **打开浏览器控制台**
   - Windows/Linux: 按 `F12` 或 `Ctrl + Shift + J`
   - Mac: 按 `Cmd + Option + J`

3. **运行测试脚本**
   - 复制 `test-extraction.js` 文件的全部内容
   - 粘贴到控制台
   - 按 `Enter` 执行

4. **查看结果**
   - 控制台会显示提取的文章信息
   - Markdown 文件会自动下载到你的下载文件夹

---

## 方法二：安装 Chrome 插件

### 准备图标文件

在创建插件之前，需要准备图标文件。你可以：

**选项 A：创建简单图标**
```bash
# 创建 icons 文件夹
mkdir icons

# 使用任意图片编辑器创建三个尺寸的 PNG 图标：
# - icon16.png (16x16 像素)
# - icon48.png (48x48 像素)
# - icon128.png (128x128 像素)
```

**选项 B：使用在线工具**
- 访问 https://www.favicon-generator.org/
- 上传一个图片，生成多种尺寸
- 将生成的图标保存到 `icons/` 文件夹

**选项 C：临时使用占位图标**
- 可以暂时注释掉 manifest.json 中的 icons 部分

### 安装插件

1. **打开 Chrome 扩展管理页面**
   - 在地址栏输入：`chrome://extensions/`
   - 或点击菜单 → 更多工具 → 扩展程序

2. **启用开发者模式**
   - 点击右上角的"开发者模式"开关

3. **加载插件**
   - 点击"加载已解压的扩展程序"
   - 选择 `chrome-plugin-substack` 文件夹
   - 点击"选择文件夹"

4. **确认安装**
   - 插件图标应该出现在浏览器工具栏
   - 如果看到错误，检查控制台输出

---

## 使用插件

### 基本使用

1. **访问 Substack 文章**
   ```
   例如：https://substack.com/home/post/p-186071474
   ```

2. **点击插件图标**
   - 在浏览器工具栏找到插件图标
   - 点击打开弹出窗口

3. **查看文章信息**
   - 弹出窗口会显示：
     - 文章标题
     - 作者名称
     - 发布日期

4. **预览或下载**
   - 点击"👁️ 预览 Markdown"查看生成的内容
   - 点击"🚀 提取并下载 Markdown"保存文件

### 键盘快捷键（可选）

可以在 `manifest.json` 中添加快捷键：

```json
{
  "commands": {
    "extract-article": {
      "suggested_key": {
        "default": "Ctrl+Shift+S",
        "mac": "Command+Shift+S"
      },
      "description": "提取当前 Substack 文章"
    }
  }
}
```

---

## 测试不同的 Substack URL

以下是几个可以用来测试的 URL：

| URL | 说明 |
|-----|------|
| `https://substack.com/home/post/p-186071474` | Engineering Leadership - 工程管理文章 |
| `https://ideas.profoundideas.com/p/a-prompt-to-become-dangerously-self` | Profound Ideas - 自我教育 |
| `https://useaitowrite.substack.com/p/ai-isnt-making-you-10x-smarter-its` | AI 写作 - AI 工具使用 |

---

## 故障排除

### 问题 1: 插件无法加载
**原因**: 缺少图标文件或 manifest.json 语法错误

**解决**:
```bash
# 检查 manifest.json 语法
cat manifest.json | python -m json.tool

# 或临时移除图标配置
# 编辑 manifest.json，注释掉 icons 和 action.default_icon 部分
```

### 问题 2: 提取不到文章内容
**原因**: 页面尚未完全加载或不是 Substack 页面

**解决**:
- 等待页面完全加载后再点击插件
- 刷新页面重试
- 检查控制台是否有错误信息

### 问题 3: 下载的文件内容不完整
**原因**: 付费文章需要登录订阅

**解决**:
- 在 Substack 登录你的账户
- 确保已订阅该出版物
- 重新加载页面后再次提取

### 问题 4: 控制台报错
**原因**: 脚本执行失败

**解决**:
```javascript
// 在控制台运行此代码检查环境
console.log('当前 URL:', window.location.href);
console.log('JSON-LD 存在:', !!document.querySelector('script[type="application/ld+json"]'));
console.log('Main 元素存在:', !!document.querySelector('main'));
```

---

## 调试技巧

### 查看 Content Script 日志

1. 打开 Substack 文章页面
2. 打开开发者工具（F12）
3. 切换到 Console 标签
4. 查找 "Substack to Markdown" 相关日志

### 测试单个函数

在控制台中直接测试：

```javascript
// 测试 JSON-LD 提取
const data = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent);
console.log(data);

// 测试内容提取
const main = document.querySelector('main');
console.log(main.querySelectorAll('h2, h3, p').length);
```

### 修改后重新加载插件

修改插件代码后：
1. 访问 `chrome://extensions/`
2. 点击插件的"刷新"按钮
3. 刷新 Substack 页面

---

## 下一步

插件已成功提取以下数据：

✅ 文章标题
✅ 作者信息
✅ 发布日期
✅ 文章描述
✅ 正文内容
✅ 图片链接
✅ 外部链接

可以考虑添加的功能：

- 批量下载多篇文章
- 导出到 Notion/Obsidian
- 自定义 Markdown 模板
- 添加标签和分类
- 同步到云存储
- 生成 PDF 或 HTML

祝你使用愉快！ 🎉
