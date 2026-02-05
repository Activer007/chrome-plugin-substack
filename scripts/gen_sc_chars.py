# 生成 GB2312 所有汉字 (一级+二级，共6763字)
# 这是一个标准的简体中文常用字符集

def get_gb2312_chars():
    chars = []
    # GB2312 编码范围：
    # 第一字节 0xB0-0xF7 (汉字区)
    # 第二字节 0xA1-0xFE

    for head in range(0xB0, 0xF8):
        for body in range(0xA1, 0xFF):
            val = f'{head:x}{body:x}'
            try:
                # 解码为字符
                char = bytes.fromhex(val).decode('gb2312')
                chars.append(char)
            except:
                continue
    return "".join(chars)

if __name__ == "__main__":
    content = get_gb2312_chars()

    # 额外补充 ASCII 和 常用标点，确保万无一失
    ascii_chars = "".join(chr(i) for i in range(32, 127))
    punctuations = "，。！？；：“”‘’（）【】《》……——、"

    full_text = ascii_chars + punctuations + content

    with open("scripts/sc_chars.txt", "w", encoding="utf-8") as f:
        f.write(full_text)

    print(f"已生成 scripts/sc_chars.txt，包含 {len(full_text)} 个字符 (GB2312 + ASCII + 标点)")
