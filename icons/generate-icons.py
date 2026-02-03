"""
图标生成脚本 (Python 版本)
运行: python generate-icons.py
需要: pip install Pillow
"""

from PIL import Image, ImageDraw, ImageFont
import os

def draw_rounded_rectangle(draw, xy, corner_radius, fill):
    """绘制圆角矩形"""
    x1, y1, x2, y2 = xy
    draw.rectangle([x1 + corner_radius, y1, x2 - corner_radius, y2], fill=fill)
    draw.rectangle([x1, y1 + corner_radius, x2, y2 - corner_radius], fill=fill)
    draw.pieslice([x1, y1, x1 + corner_radius * 2, y1 + corner_radius * 2], 180, 270, fill=fill)
    draw.pieslice([x2 - corner_radius * 2, y1, x2, y1 + corner_radius * 2], 270, 360, fill=fill)
    draw.pieslice([x1, y2 - corner_radius * 2, x1 + corner_radius * 2, y2], 90, 180, fill=fill)
    draw.pieslice([x2 - corner_radius * 2, y2 - corner_radius * 2, x2, y2], 0, 90, fill=fill)

def create_icon(size):
    """创建指定尺寸的图标"""
    # 创建图像 (使用透明背景)
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 基础尺寸是 128x128，计算缩放比例
    scale = size / 128

    # 绘制圆形背景 (Substack 橙色 #FF6719)
    circle_bbox = [
        0,
        0,
        size,
        size
    ]
    draw.ellipse(circle_bbox, fill=(255, 103, 25, 255))

    # 白色堆栈线条
    white = (255, 255, 255, 255)

    # 缩放所有坐标
    def s(v):
        return int(v * scale)

    # 顶部条
    draw_rounded_rectangle(draw, [s(28), s(43), s(100), s(51)], s(2), white)

    # 中间条
    draw_rounded_rectangle(draw, [s(28), s(59), s(100), s(67)], s(2), white)

    # 底部条
    draw_rounded_rectangle(draw, [s(28), s(75), s(100), s(83)], s(2), white)

    # 绘制箭头
    # 垂直线
    draw.line([s(64), s(20), s(64), s(38)], fill=white, width=int(3 * scale))

    # 箭头左侧
    draw.polygon([
        (s(64), s(38)),
        (s(58), s(32)),
        (s(60), s(32)),
        (s(64), s(36))
    ], fill=white)

    # 箭头右侧
    draw.polygon([
        (s(64), s(38)),
        (s(70), s(32)),
        (s(68), s(32)),
        (s(64), s(36))
    ], fill=white)

    # MD 文字 (128px 用 14pt，其他尺寸按比例)
    if size >= 48:
        try:
            font_size = int(14 * scale)
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            # 如果系统没有 arial.ttf，使用默认字体
            font = ImageFont.load_default()

        # 获取文字边界框以正确居中
        text = "MD"
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]

        x = (size - text_width) // 2
        y = s(110) - text_height // 2

        draw.text((x, y), text, fill=white, font=font)

    return img

def main():
    print("🎨 开始生成图标...\n")

    sizes = [16, 48, 128]
    icons_dir = os.path.dirname(__file__)

    for size in sizes:
        img = create_icon(size)
        filename = os.path.join(icons_dir, f"icon{size}.png")
        img.save(filename, "PNG")
        print(f"✅ 已生成: icon{size}.png ({size}×{size})")

    print("\n🎉 所有图标生成完成！")
    print(f"\n📁 图标保存在: {icons_dir}")
    print("\n图标说明:")
    print("  - icon16.png: 浏览器工具栏图标")
    print("  - icon48.png: 扩展管理页面图标")
    print("  - icon128.png: Chrome Web Store 图标")
    print("\n设计风格:")
    print("  - Substack 品牌橙色 (#FF6719)")
    print("  - 三条横线代表文章堆叠")
    print("  - 箭头表示下载/保存")
    print("  - 'MD' 代表 Markdown 格式")

if __name__ == "__main__":
    try:
        main()
    except ImportError:
        print("❌ 未找到 Pillow 库")
        print("\n请先安装依赖:")
        print("  pip install Pillow\n")
        print("或者使用浏览器版本生成图标:")
        print("  在浏览器中打开 generate-icons.html")
    except Exception as e:
        print(f"❌ 生成图标时出错: {e}")
