/**
 * 图标生成脚本
 * 运行: node generate-icons.js
 * 需要: npm install canvas
 */

const fs = require('fs');
const path = require('path');

// 检查是否安装了 canvas
let canvas;
try {
  canvas = require('canvas');
} catch (e) {
  console.error('❌ 未找到 canvas 模块');
  console.log('\n请先安装依赖:');
  console.log('  npm install canvas\n');
  console.log('或者使用浏览器版本生成图标:');
  console.log('  在浏览器中打开 generate-icons.html');
  process.exit(1);
}

const { createCanvas } = canvas;

/**
 * 绘制圆角矩形
 */
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
}

/**
 * 绘制图标
 */
function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const scale = size / 128;

  ctx.scale(scale, scale);

  // 背景圆形
  ctx.beginPath();
  ctx.arc(64, 64, 64, 0, Math.PI * 2);
  ctx.fillStyle = '#FF6719';
  ctx.fill();

  // 白色堆栈图标
  ctx.fillStyle = '#FFFFFF';

  // 底部条
  roundRect(ctx, 28, 75, 72, 8, 2);

  // 中间条
  roundRect(ctx, 28, 59, 72, 8, 2);

  // 顶部条
  roundRect(ctx, 28, 43, 72, 8, 2);

  // 箭头
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 垂直线
  ctx.beginPath();
  ctx.moveTo(64, 20);
  ctx.lineTo(64, 38);
  ctx.stroke();

  // 箭头左侧
  ctx.beginPath();
  ctx.moveTo(64, 38);
  ctx.lineTo(58, 32);
  ctx.stroke();

  // 箭头右侧
  ctx.beginPath();
  ctx.moveTo(64, 38);
  ctx.lineTo(70, 32);
  ctx.stroke();

  // MD 标识
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MD', 64, 110);

  return canvas;
}

/**
 * 主函数
 */
function main() {
  console.log('🎨 开始生成图标...\n');

  const sizes = [16, 48, 128];
  const iconsDir = __dirname;

  sizes.forEach(size => {
    const canvas = drawIcon(size);
    const filename = path.join(iconsDir, `icon${size}.png`);
    const buffer = canvas.toBuffer('image/png');

    fs.writeFileSync(filename, buffer);
    console.log(`✅ 已生成: icon${size}.png (${size}×${size})`);
  });

  console.log('\n🎉 所有图标生成完成！');
  console.log('\n📁 图标保存在: ' + iconsDir);
  console.log('\n图标说明:');
  console.log('  - icon16.png: 浏览器工具栏图标');
  console.log('  - icon48.png: 扩展管理页面图标');
  console.log('  - icon128.png: Chrome Web Store 图标');
  console.log('\n设计风格:');
  console.log('  - Substack 品牌橙色 (#FF6719)');
  console.log('  - 三条横线代表文章堆叠');
  console.log('  - 箭头表示下载/保存');
  console.log('  - "MD" 代表 Markdown 格式');
}

// 运行
main();
