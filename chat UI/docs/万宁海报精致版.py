#!/usr/bin/env python3
"""
海南万宁旅游攻略海报 - 精致版
设计哲学: Hainan Breeze | 海南清风
"""

from PIL import Image, ImageDraw, ImageFont
import math

WIDTH = 1080
HEIGHT = 1920
DPI = 150

# 精致配色系统
# 天空渐变
SKY_TOP = (135, 175, 210)
SKY_BOTTOM = (255, 225, 175)
# 海洋
SEA_LIGHT = (85, 195, 210)
SEA_MID = (55, 165, 190)
SEA_DEEP = (30, 95, 135)
# 自然
PALM_GREEN = (45, 115, 80)
SAND_LIGHT = (250, 245, 238)
SAND = (238, 220, 200)
CORAL = (255, 115, 90)
CORAL_SOFT = (255, 175, 155)
GOLD = (220, 185, 130)
# 中性色
WHITE = (255, 255, 255)
TEXT_DARK = (35, 45, 55)
TEXT_GRAY = (110, 120, 130)
TEXT_LIGHT_GRAY = (160, 165, 170)
ACCENT_BLUE = (70, 145, 175)

# 中文字体
CHINESE_FONT = "/System/Library/Fonts/Hiragino Sans GB.ttc"

def draw_gradient_bg(img):
    """精致天空渐变"""
    draw = ImageDraw.Draw(img)
    for y in range(int(HEIGHT * 0.55)):
        ratio = y / (HEIGHT * 0.55)
        r = int(SKY_TOP[0] + (255 - SKY_TOP[0]) * ratio * 0.15)
        g = int(SKY_TOP[1] + (215 - SKY_TOP[1]) * ratio * 0.25)
        b = int(SKY_TOP[2] + (165 - SKY_TOP[2]) * ratio * 0.12)
        draw.line([(0, y), (WIDTH, y)], fill=(r, g, b))

    # 下半部分 - 暖色调
    for y in range(int(HEIGHT * 0.55), HEIGHT):
        ratio = (y - HEIGHT * 0.55) / (HEIGHT * 0.45)
        r = int(235 + (SKY_BOTTOM[0] - 235) * ratio * 0.35)
        g = int(215 + (SKY_BOTTOM[1] - 215) * ratio * 0.4)
        b = int(195 + (SKY_BOTTOM[2] - 195) * ratio * 0.25)
        draw.line([(0, y), (WIDTH, y)], fill=(r, g, b))
    return img

def draw_rounded_rect(draw, coords, radius, fill):
    """绘制圆角矩形"""
    x1, y1, x2, y2 = coords
    r = radius
    draw.rectangle([x1+r, y1, x2-r, y2], fill=fill)
    draw.rectangle([x1, y1+r, x2, y2-r], fill=fill)
    draw.pieslice([x1, y1, x1+2*r, y1+2*r], 180, 270, fill=fill)
    draw.pieslice([x2-2*r, y1, x2, y1+2*r], 270, 360, fill=fill)
    draw.pieslice([x1, y2-2*r, x1+2*r, y2], 90, 180, fill=fill)
    draw.pieslice([x2-2*r, y2-2*r, x2, y2], 0, 90, fill=fill)

def draw_circle(draw, cx, cy, r, fill):
    """绘制圆形"""
    draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=fill)

def draw_waves(draw, y_base, layers):
    """绘制精致波浪"""
    for i, (amp, freq, color, alpha) in enumerate(layers):
        offset = i * 8
        for x in range(0, WIDTH, 3):
            y = y_base + offset + amp * math.sin(2*math.pi*x/(WIDTH/freq) + i*0.6)
            draw.line([(x, y), (x, y+2)], fill=color)

def draw_palm(draw, x, base_y, height, color):
    """绘制棕榈树"""
    # 树干 - 微微弯曲
    points = [(x, base_y)]
    for t in range(0, int(height), 5):
        curve = 3 * math.sin(t / height * math.pi)
        px = x - curve
        py = base_y - t
        points.append((px, py))
    points.append((x - 3, base_y - height))
    for i in range(len(points) - 1):
        draw.line([points[i], points[i+1]], fill=color, width=8 - i//10)

    # 叶子 - 优雅的弧线
    leaf_data = [
        (-75, 110, 0.3),
        (-50, 130, 0.4),
        (-25, 100, 0.35),
        (0, 120, 0.45),
        (25, 105, 0.35),
        (50, 90, 0.3),
        (72, 70, 0.25),
    ]
    for angle, length, droop in leaf_data:
        rad = math.radians(angle)
        tip_x = x - 3 + length * math.cos(rad)
        tip_y = base_y - height + length * math.sin(rad) * (1 - droop)

        # 绘制扇形叶片
        leaf_points = []
        for t in range(int(length)):
            t_ratio = t / length
            leaf_rad = rad - (0.3 - t_ratio * 0.3) * (1 if angle < 0 else -1)
            leaf_droop = droop * t_ratio * 30
            lx = x - 3 + t * math.cos(rad) + leaf_droop * math.sin(rad) * 0.1
            ly = base_y - height + t * math.sin(rad) * (1 - droop) + leaf_droop
            leaf_points.append((lx, ly))
        leaf_points.append((tip_x, tip_y))
        for t in range(len(leaf_points) - 1, 0, -1):
            t_ratio = t / len(leaf_points)
            leaf_rad = rad + (0.3 - t_ratio * 0.3) * (1 if angle < 0 else -1)
            leaf_droop = droop * t_ratio * 30
            lx = x - 3 + t * math.cos(rad) + leaf_droop * math.sin(rad) * 0.1
            ly = base_y - height + t * math.sin(rad) * (1 - droop) + leaf_droop
            leaf_points.append((lx, ly))
        if len(leaf_points) > 2:
            draw.polygon(leaf_points, fill=color)

def create_poster():
    img = Image.new('RGB', (WIDTH, HEIGHT), SKY_TOP)
    img = draw_gradient_bg(img)
    draw = ImageDraw.Draw(img)

    # === 字体设置 ===
    f_title = ImageFont.truetype(CHINESE_FONT, 54)
    f_subtitle = ImageFont.truetype(CHINESE_FONT, 24)
    f_section = ImageFont.truetype(CHINESE_FONT, 22)
    f_body = ImageFont.truetype(CHINESE_FONT, 15)
    f_small = ImageFont.truetype(CHINESE_FONT, 13)
    f_tag = ImageFont.truetype(CHINESE_FONT, 12)
    f_price = ImageFont.truetype(CHINESE_FONT, 14)

    margin = 50
    content_w = WIDTH - margin * 2

    # === 顶部标题区 ===
    y = 55

    # 假期标签
    tag_w = 155
    draw_rounded_rect(draw, [WIDTH//2 - tag_w//2, y, WIDTH//2 + tag_w//2, y + 32], 16, CORAL)
    draw.text((WIDTH//2, y + 16), "2026清明假期", font=f_tag, fill=WHITE, anchor="mm")

    # 主标题
    y += 60
    draw.text((WIDTH//2, y), "海南万宁", font=f_title, fill=WHITE, anchor="mm")

    y += 65
    draw.text((WIDTH//2, y), "WANNING HAINAN", font=f_subtitle, fill=WHITE, anchor="mm")

    y += 40
    draw.text((WIDTH//2, y), "旅游攻略", font=f_subtitle, fill=(255,255,255,200), anchor="mm")

    # 时间和地点
    y += 38
    draw.text((WIDTH//2, y), "海南省万宁市 · 4月4日 - 4月6日", font=f_small, fill=(255,255,255,180), anchor="mm")

    # 天气信息
    y += 35
    # 温度
    draw_rounded_rect(draw, [WIDTH//2 - 115, y, WIDTH//2 - 5, y + 30], 15, SEA_MID)
    draw.text((WIDTH//2 - 60, y + 15), "25-28°C", font=f_tag, fill=WHITE, anchor="mm")
    # 天气
    draw_rounded_rect(draw, [WIDTH//2 + 5, y, WIDTH//2 + 115, y + 30], 15, PALM_GREEN)
    draw.text((WIDTH//2 + 60, y + 15), "晴天 紫外线强", font=f_tag, fill=WHITE, anchor="mm")

    # === 波浪分隔线 ===
    wave_y = 380
    wave_layers = [
        (6, 1.5, SEA_LIGHT, 160),
        (10, 2.0, SEA_MID, 130),
        (14, 2.5, SEA_DEEP, 100),
    ]
    draw_waves(draw, wave_y, wave_layers)

    # === 关于万宁 ===
    sec_y = 430

    # 左侧大卡片
    card_l = margin
    card_w = 440
    card_h = 155
    draw_rounded_rect(draw, [card_l, sec_y, card_l + card_w, sec_y + card_h], 16, SAND_LIGHT)

    draw.text((card_l + 25, sec_y + 22), "关于万宁", font=f_section, fill=TEXT_DARK)

    desc_lines = [
        '被《国家地理》评为"中国最美海湾"',
        "年均气温24°C，109公里海岸线",
        "冲浪、潜水、帆船的绝佳目的地",
    ]
    for i, line in enumerate(desc_lines):
        draw.text((card_l + 25, sec_y + 55 + i * 24), line, font=f_body, fill=TEXT_GRAY)

    # 底部数据
    data_items = [("109km", "海岸线"), ("30+", "酒店"), ("3-5天", "建议")]
    for i, (num, label) in enumerate(data_items):
        dx = card_l + 25 + i * 130
        draw.text((dx, sec_y + 120), num, font=f_section, fill=SEA_DEEP)
        draw.text((dx, sec_y + 145), label, font=f_small, fill=TEXT_GRAY)

    # 右侧交通卡片
    card_r = margin + card_w + 25
    card_r_w = WIDTH - margin - card_w - 25 * 2
    draw_rounded_rect(draw, [card_r, sec_y, card_r + card_r_w, sec_y + card_h], 16, SAND_LIGHT)

    draw.text((card_r + 25, sec_y + 22), "交通方式", font=f_section, fill=TEXT_DARK)

    transport = [
        ("✈", "飞机", "海口美兰 → 高铁50分"),
        ("🚄", "高铁", "三亚出发约40分钟"),
        ("🚗", "自驾", "三亚出发约1.5h"),
    ]
    for i, (icon, t, d) in enumerate(transport):
        tx = card_r + 25 + i * 145
        ty = sec_y + 55
        draw.text((tx, ty), icon, font=f_body, fill=SEA_MID)
        draw.text((tx, ty + 22), t, font=f_tag, fill=TEXT_DARK)
        draw.text((tx, ty + 40), d, font=f_small, fill=TEXT_GRAY)

    # === 必去景点 ===
    sec2_y = sec_y + card_h + 30

    draw.text((margin, sec2_y), "必去景点", font=f_section, fill=TEXT_DARK)

    attractions = [
        ("日月湾", "冲浪圣地", "林俊杰/肖战同款", "浪最大", "免费"),
        ("神州半岛", "高尔夫天堂", "消失的她取景", "日落美", "免费"),
        ("石梅湾", "玻璃海", "浮潜深潜", "上岛150元", "1天"),
        ("兴隆植物园", "咖啡发源地", "可品鉴咖啡", "门票45元", "3小时"),
    ]

    attr_y = sec2_y + 35
    attr_w = content_w // 2 - 12
    attr_h = 85

    for idx, (name, tag1, tag2, time, cost) in enumerate(attractions):
        row = idx // 2
        col = idx % 2
        ax = margin + col * (attr_w + 20)
        ay = attr_y + row * (attr_h + 15)

        # 卡片背景
        draw_rounded_rect(draw, [ax, ay, ax + attr_w, ay + attr_h], 12, SEA_DEEP)

        # 景点名称
        draw.text((ax + 15, ay + 12), name, font=f_section, fill=WHITE)

        # 标签
        draw_rounded_rect(draw, [ax + 15, ay + 38, ax + 70, ay + 54], 5, CORAL)
        draw.text((ax + 42, ay + 46), time, font=f_small, fill=WHITE, anchor="mm")
        draw_rounded_rect(draw, [ax + 78, ay + 38, ax + 140, ay + 54], 5, ACCENT_BLUE)
        draw.text((ax + 109, ay + 46), cost, font=f_small, fill=WHITE, anchor="mm")

        # 描述
        draw.text((ax + 15, ay + 62), tag2, font=f_small, fill=(180, 200, 215))

    # === 本地美食 ===
    sec3_y = attr_y + 2 * (attr_h + 15) + 25

    draw.text((margin, sec3_y), "本地美食", font=f_section, fill=TEXT_DARK)

    foods = [
        ("和乐蟹", "¥150-200", "万宁特产"),
        ("港北对虾", "¥80-120", "个头硕大"),
        ("清补凉", "¥10-15", "清热解暑"),
        ("椰子鸡", "¥100-150", "文昌鸡"),
        ("兴隆咖啡", "¥15-30", "东南亚风味"),
        ("热带水果", "¥5-20", "芒果莲雾"),
    ]

    food_y = sec3_y + 32
    food_w = content_w // 3 - 12
    food_h = 80

    for idx, (name, price, desc) in enumerate(foods):
        row = idx // 3
        col = idx % 3
        fx = margin + col * (food_w + 18)
        fy = food_y + row * (food_h + 12)

        draw_rounded_rect(draw, [fx, fy, fx + food_w, fy + food_h], 10, SAND)

        # 圆形图标背景
        draw_circle(draw, fx + 30, fy + 25, 18, CORAL_SOFT)

        draw.text((fx + 55, fy + 12), name, font=f_body, fill=TEXT_DARK)
        draw.text((fx + food_w - 50, fy + 12), price, font=f_price, fill=CORAL)
        draw.text((fx + 55, fy + 35), desc, font=f_small, fill=TEXT_GRAY)

    # === 住宿推荐 ===
    sec4_y = food_y + 2 * (food_h + 12) + 25

    draw.text((margin, sec4_y), "住宿推荐", font=f_section, fill=TEXT_DARK)

    hotels = [
        ("石梅湾威斯汀度假酒店", "¥1200+", "私人沙滩", "无边泳池"),
        ("神州半岛君悦酒店", "¥1000+", "科罗娜日落", "海景房"),
        ("日月湾森林客栈", "¥400+", "冲浪主题", "氛围好"),
        ("兴隆希尔顿逸林", "¥600+", "温泉SPA", "含早餐"),
    ]

    hotel_y = sec4_y + 32
    hotel_w = content_w // 2 - 10
    hotel_h = 68

    for idx, (name, price, feat1, feat2) in enumerate(hotels):
        row = idx // 2
        col = idx % 2
        hx = margin + col * (hotel_w + 20)
        hy = hotel_y + row * (hotel_h + 12)

        draw_rounded_rect(draw, [hx, hy, hx + hotel_w, hy + hotel_h], 10, SAND_LIGHT)

        draw.text((hx + 18, hy + 12), name, font=f_body, fill=TEXT_DARK)
        draw.text((hx + hotel_w - 50, hy + 12), price, font=f_price, fill=CORAL)

        # 特色标签
        draw_rounded_rect(draw, [hx + 18, hy + 38, hx + 88, hy + 54], 5, SEA_MID)
        draw.text((hx + 53, hy + 46), feat1, font=f_small, fill=WHITE, anchor="mm")
        draw_rounded_rect(draw, [hx + 95, hy + 38, hx + 165, hy + 54], 5, PALM_GREEN)
        draw.text((hx + 130, hy + 46), feat2, font=f_small, fill=WHITE, anchor="mm")

    # === 出行准备 ===
    sec5_y = hotel_y + 2 * (hotel_h + 12) + 25

    draw.text((margin, sec5_y), "出行准备", font=f_section, fill=TEXT_DARK)

    items = [
        ("防晒", "防晒霜SPF50+、防晒喷雾"),
        ("泳具", "泳衣、冲浪服、潜水袜"),
        ("装备", "墨镜、帽子、防晒衣"),
        ("电器", "防水袋、充电宝、GoPro"),
        ("药品", "创可贴、驱蚊液、肠胃药"),
        ("证件", "身份证、学生证（优惠）"),
    ]

    item_y = sec5_y + 32
    for i, (cat, detail) in enumerate(items):
        ix = margin + (i % 3) * 330
        iy = item_y + (i // 3) * 32

        # 圆点
        draw.ellipse([ix, iy + 4, ix + 7, iy + 11], fill=CORAL)
        draw.text((ix + 15, iy + 3), cat, font=f_body, fill=TEXT_DARK)
        draw.text((ix + 70, iy + 3), detail, font=f_small, fill=TEXT_GRAY)

    # === 底部沙滩装饰 ===
    sand_y = 1550

    # 沙滩渐变
    for y in range(sand_y, HEIGHT):
        ratio = (y - sand_y) / (HEIGHT - sand_y)
        r = int(235 + (245 - 235) * ratio)
        g = int(218 + (238 - 218) * ratio)
        b = int(198 + (235 - 198) * ratio)
        draw.line([(0, y), (WIDTH, y)], fill=(r, g, b))

    # 沙滩波纹
    for i in range(5):
        wave_y_pos = sand_y + 25 + i * 15
        for x in range(0, WIDTH, 5):
            off = 4 * math.sin(2*math.pi*x/200 + i*0.7)
            alpha = 60 - i * 10
            draw.point((x, wave_y_pos + off), fill=(255, 255, 255, alpha if alpha > 10 else 10))

    # 左侧棕榈树
    draw_palm(draw, 100, HEIGHT - 60, 260, PALM_GREEN)

    # 右侧棕榈树
    draw_palm(draw, WIDTH - 110, HEIGHT - 60, 200, PALM_GREEN)

    # 底部文字
    draw.text((WIDTH//2, HEIGHT - 65), "海南万宁 · 期待与您相遇", font=f_subtitle, fill=(100, 90, 80), anchor="mm")
    draw.text((WIDTH//2, HEIGHT - 30), "WANNING HAINAN", font=f_small, fill=(140, 130, 120), anchor="mm")

    # 装饰角线
    draw.line([(40, HEIGHT - 80), (40, HEIGHT - 35)], fill=CORAL, width=2)
    draw.line([(WIDTH - 40, HEIGHT - 80), (WIDTH - 40, HEIGHT - 35)], fill=CORAL, width=2)

    return img

if __name__ == "__main__":
    img = create_poster()
    output_path = "/Users/mi/Desktop/Claude Code/Chatbox/chat UI/docs/清明万宁旅游攻略海报.png"
    img.save(output_path, "PNG", quality=95)
    print(f"海报已保存至: {output_path}")
