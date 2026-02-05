from fontTools.ttLib import TTFont
import os

FONT_FILE = "NotoSerifSC.subset.ttf"

def check_font():
    if not os.path.exists(FONT_FILE):
        print(f"错误: 找不到文件 {FONT_FILE}")
        return

    try:
        font = TTFont(FONT_FILE)
        # 获取 cmap 表 (platformID=3, platEncID=1 是 Windows Unicode，通常最全)
        cmap = font.getBestCmap()

        if not cmap:
            print("错误: 无法读取字符映射表 (cmap)")
            return

        char_count = len(cmap)
        file_size_mb = os.path.getsize(FONT_FILE) / (1024 * 1024)

        print(f"========== 字体分析报告 ==========")
        print(f"文件名: {FONT_FILE}")
        print(f"文件大小: {file_size_mb:.2f} MB")
        print(f"包含字符数: {char_count}")
        print(f"----------------------------------")

        # 验证一些关键字符
        test_chars = {
            'A': 0x0041,
            '我': 0x6211, # 一级汉字
            '饕': 0x9955, # 二级汉字 (GB2312)
            '𠮷': 0x20BB7 # 扩展B区生僻字 (通常不包含在GB2312)
        }

        print("关键字符检查:")
        for char, code in test_chars.items():
            included = code in cmap
            status = "✅ 包含" if included else "❌ 未包含"
            print(f"  {char}: {status}")

    except Exception as e:
        print(f"发生异常: {e}")

if __name__ == "__main__":
    check_font()
