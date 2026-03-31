#!/usr/bin/env python3
"""
清明海南万宁旅游攻略海报 - 精简内容版
"""

from PIL import Image, ImageDraw, ImageFont
import math

WIDTH = 1080
HEIGHT = 1920

# 色彩系统
SKY_TOP = (95, 155, 198)
SKY_BOTTOM = (255, 220, 175)
SEA_CYAN = (55, 175, 190)
SEA_DEEP = (28, 82, 120)
PALM_GREEN = (38, 105, 72)
SAND = (235, 220, 200)
CORAL = (255, 105, 85)
CORAL_SOFT = (255, 175, 155)
GOLD = (215, 185, 130)
WHITE = (255, 255, 255)
TEXT_DARK = (30, 40, 50)
TEXT_GRAY = (100, 110, 120)
LIGHT_BG = (248, 250, 252)

CHINESE_FONT = "/System/Library/Fonts/Hiragino Sans GB.ttc"

def create_gradient(img):
    draw = ImageDraw.Draw(img)
    for y in range(HEIGHT):
        if y < HEIGHT * 0.45:
            ratio = y / (HEIGHT * 0.45)
            r = int(SKY_TOP[0] + (255 - SKY_TOP[0]) * ratio * 0.1)
            g = int(SKY_TOP[1] + (200 - SKY_TOP[1]) * ratio * 0.2)
            b = int(SKY_TOP[2] + (150 - SKY_TOP[2]) * ratio * 0.1)
        else:
            ratio = (y - HEIGHT * 0.45) / (HEIGHT * 0.55)
            r = int(200 + (SKY_BOTTOM[0] - 200) * ratio * 0.4)
            g = int(195 + (SKY_BOTTOM[1] - 195) * ratio * 0.5)
            b = int(180 + (SKY_BOTTOM[2] - 180) * ratio * 0.3)
        draw.line([(0, y), (WIDTH, y)], fill=(r, g, b))
    return img

def create_poster():
    global img
    img = Image.new('RGB', (WIDTH, HEIGHT), SKY_TOP)
    img = create_gradient(img)
    draw = ImageDraw.Draw(img)

    # 字体
    f_title = ImageFont.truetype(CHINESE_FONT, 52)
    f_sub = ImageFont.truetype(CHINESE_FONT, 22)
    f_sec = ImageFont.truetype(CHINESE_FONT, 22)
    f_body = ImageFont.truetype(CHINESE_FONT, 15)
    f_small = ImageFont.truetype(CHINESE_FONT, 13)
    f_tag = ImageFont.truetype(CHINESE_FONT, 12)

    # === 标题区 ===
    # 标签
    draw.rounded_rectangle([WIDTH//2-70, 40, WIDTH//2+70, 68], radius=14, fill=CORAL)
    draw.text((WIDTH//2, 54), "2026清明假期", font=f_tag, fill=WHITE, anchor="mm")

    # 主标题
    draw.text((WIDTH//2, 120), "海南万宁", font=f_title, fill=WHITE, anchor="mm")
    draw.text((WIDTH//2, 175), "旅游攻略", font=f_title, fill=WHITE, anchor="mm")

    # 副标题
    draw.text((WIDTH//2, 220), "海南省万宁市 · 4月4日-6日", font=f_sub, fill=(255,255,255,200), anchor="mm")

    # 天气
    weather_y = 260
    draw.rounded_rectangle([WIDTH//2-100, weather_y, WIDTH//2+100, weather_y+32], radius=16, fill=SEA_CYAN)
    draw.text((WIDTH//2, weather_y+16), "温度 25-28°C  晴天", font=f_tag, fill=WHITE, anchor="mm")

    # === 波浪分隔 ===
    wave_y = 320
    wave_img = Image.new('RGBA', (WIDTH, HEIGHT), (0,0,0,0))
    wave_draw = ImageDraw.Draw(wave_img)
    for layer_idx, (amp, freq, color, alpha) in enumerate([(5,1.2,SEA_CYAN,140),(8,1.5,SEA_DEEP,110),(12,2.0,(35,90,125),80)]):
        for x in range(0, WIDTH, 2):
            y_pos = wave_y + layer_idx*6 + amp * math.sin(2*math.pi*x/(WIDTH/freq) + layer_idx*0.5)
            wave_draw.line([(x,y_pos),(x,y_pos+3)], fill=color+(alpha,))
    img = Image.alpha_composite(img.convert('RGBA'), wave_img).convert('RGB')
    draw = ImageDraw.Draw(img)

    # === 关于万宁 ===
    sec_y = 360
    draw.text((40, sec_y), "关于万宁", font=f_sec, fill=TEXT_DARK)
    desc = '万宁位于海南岛东南部，被《国家地理》评为"中国最美海湾"。年均气温24°C，'
    desc2 = "拥有109公里海岸线，是冲浪、潜水、帆船的绝佳目的地。建议游玩3-5天。"
    draw.text((40, sec_y+30), desc, font=f_body, fill=TEXT_GRAY)
    draw.text((40, sec_y+50), desc2, font=f_body, fill=TEXT_GRAY)

    # 数据条
    data_y = sec_y + 85
    data_items = [("109km", "海岸线"), ("30+", "酒店"), ("3h", "高铁直达")]
    for i, (num, label) in enumerate(data_items):
        dx = 40 + i * 160
        draw.text((dx, data_y), num, font=f_sec, fill=SEA_DEEP)
        draw.text((dx, data_y+28), label, font=f_small, fill=TEXT_GRAY)

    # === 交通 ===
    trans_y = sec_y + 130
    draw.text((40, trans_y), "交通方式", font=f_sec, fill=TEXT_DARK)
    trans = [
        ("飞机", "海口美兰 → 高铁50分"),
        ("高铁", "三亚出发约40分钟"),
        ("自驾", "三亚出发约1.5h"),
    ]
    for i, (t, d) in enumerate(trans):
        tx = 40 + i * 330
        draw.rounded_rectangle([tx, trans_y+28, tx+55, trans_y+52], radius=6, fill=SEA_CYAN)
        draw.text((tx+27, trans_y+40), t, font=f_tag, fill=WHITE, anchor="mm")
        draw.text((tx+65, trans_y+33), d, font=f_small, fill=TEXT_GRAY)

    # === 必去景点 ===
    sec2_y = 580
    draw.text((40, sec2_y), "必去景点", font=f_sec, fill=TEXT_DARK)

    attractions = [
        ("日月湾", "冲浪圣地，林俊杰/肖战同款", "10月-3月浪最大", "免费"),
        ("神州半岛", "《消失的她》取景地", "科罗娜日落超美", "接驳车免费"),
        ("石梅湾", "玻璃海，浮潜深潜", "加井岛上岛150元", "建议1天"),
        ("兴隆植物园", "咖啡发源地，可品鉴", "门票45元", "建议3小时"),
    ]

    card_w, card_h = 480, 70
    for idx, (name, desc, time, cost) in enumerate(attractions):
        row = idx // 2
        col = idx % 2
        cx = 40 + col * (card_w + 30)
        cy = sec2_y + 30 + row * (card_h + 12)

        draw.rounded_rectangle([cx, cy, cx+card_w, cy+card_h], radius=10, fill=SEA_DEEP)

        # 名称
        draw.text((cx+15, cy+12), name, font=f_sec, fill=WHITE)
        # 标签
        draw.rounded_rectangle([cx+15, cy+38, cx+75, cy+55], radius=5, fill=CORAL)
        draw.text((cx+45, cy+46), time[:4], font=f_small, fill=WHITE, anchor="mm")
        # 描述
        draw.text((cx+90, cy+15), desc, font=f_small, fill=(180,200,215))
        # 花费
        draw.text((cx+90, cy+35), cost, font=f_small, fill=GOLD)

    # === 美食 ===
    sec3_y = 850
    draw.text((40, sec3_y), "本地美食", font=f_sec, fill=TEXT_DARK)

    foods = [
        ("和乐蟹", "¥150-200", "万宁特产，蟹黄饱满"),
        ("港北对虾", "¥80-120", "个头硕大"),
        ("清补凉", "¥10-15", "椰奶打底，清热解暑"),
        ("椰子鸡", "¥100-150", "文昌鸡配椰子水"),
        ("兴隆咖啡", "¥15-30", "东南亚风味"),
        ("热带水果", "¥5-20", "芒果莲雾释迦"),
    ]

    food_w = 310
    for idx, (name, price, desc) in enumerate(foods):
        row = idx // 3
        col = idx % 3
        fx = 40 + col * (food_w + 20)
        fy = sec3_y + 30 + row * 70

        draw.rounded_rectangle([fx, fy, fx+food_w, fy+60], radius=8, fill=SAND)

        draw.text((fx+12, fy+10), name, font=f_sec, fill=TEXT_DARK)
        draw.text((fx+food_w-60, fy+10), price, font=f_tag, fill=CORAL)
        draw.text((fx+12, fy+35), desc, font=f_small, fill=TEXT_GRAY)

    # === 住宿 ===
    sec4_y = 1070
    draw.text((40, sec4_y), "住宿推荐", font=f_sec, fill=TEXT_DARK)

    hotels = [
        ("石梅湾威斯汀", "¥1200+", "私人沙滩无边泳池"),
        ("神州半岛君悦", "¥1000+", "科罗娜日落"),
        ("日月湾森林客栈", "¥400+", "冲浪主题氛围好"),
        ("兴隆希尔顿逸林", "¥600+", "温泉spa含早"),
    ]

    hotel_w = 490
    for idx, (name, price, feat) in enumerate(hotels):
        row = idx // 2
        col = idx % 2
        hx = 40 + col * (hotel_w + 30)
        hy = sec4_y + 30 + row * 75

        draw.rounded_rectangle([hx, hy, hx+hotel_w, hy+65], radius=8, fill=LIGHT_BG)

        draw.text((hx+15, hy+12), name, font=f_sec, fill=TEXT_DARK)
        draw.text((hx+hotel_w-65, hy+12), price, font=f_tag, fill=CORAL)
        draw.text((hx+15, hy+38), feat, font=f_small, fill=TEXT_GRAY)

    # === 出行准备 ===
    sec5_y = 1280
    draw.text((40, sec5_y), "出行准备", font=f_sec, fill=TEXT_DARK)

    items = [
        ("防晒：防晒霜SPF50+、防晒喷雾"),
        ("泳具：泳衣、冲浪服、潜水袜"),
        ("装备：墨镜、帽子、防晒衣"),
        ("电器：防水袋、充电宝、GoPro"),
        ("药品：创可贴、驱蚊液、肠胃药"),
        ("证件：身份证、学生证（景区优惠）"),
    ]

    for i, item in enumerate(items):
        ix = 40 + (i % 2) * 510
        iy = sec5_y + 30 + (i // 2) * 35
        draw.ellipse([ix, iy+2, ix+6, iy+8], fill=CORAL)
        draw.text((ix+15, iy+2), item, font=f_small, fill=TEXT_GRAY)

    # === 底部沙滩 ===
    sand_y = 1430
    sand = Image.new('RGB', (WIDTH, HEIGHT - sand_y), SAND)
    img.paste(sand, (0, sand_y))
    draw = ImageDraw.Draw(img)

    # 沙滩波纹
    for i in range(4):
        y = sand_y + 20 + i * 12
        for x in range(0, WIDTH, 4):
            off = 4 * math.sin(2*math.pi*x/180 + i)
            draw.point((x, y+off), fill=(255,255,255,50-(i*10)))

    # 棕榈树
    def draw_palm(x, base_y, h):
        for w in range(7, 2, -1):
            draw.line([(x, base_y), (x-2, base_y-h)], fill=PALM_GREEN, width=w)
        for angle, length in [(-65,90),(-35,110),(-5,80),(25,100),(55,75),(80,55)]:
            rad = math.radians(angle)
            for t in range(int(length)):
                px = x-2 + t*math.cos(rad)
                py = base_y-h + t*math.sin(rad)*0.3
                lw = max(1, int((1-t/length)*3))
                for off in [-1,1]:
                    lx = px + off*lw*math.cos(math.radians(angle+90))
                    ly = py + off*lw*math.sin(math.radians(angle+90))*0.5
                    draw.line([(px,py),(lx,ly)], fill=PALM_GREEN, width=1)

    draw_palm(90, HEIGHT-40, 220)
    draw_palm(WIDTH-100, HEIGHT-40, 180)

    # 底部文字
    draw.text((WIDTH//2, HEIGHT-55), "海南万宁 · 期待与您相遇", font=f_sub, fill=(120,110,100), anchor="mm")
    draw.text((WIDTH//2, HEIGHT-25), "WANNING HAINAN", font=f_small, fill=(150,140,130), anchor="mm")

    return img

if __name__ == "__main__":
    img = create_poster()
    output_path = "/Users/mi/Desktop/Claude Code/Chatbox/chat UI/docs/清明万宁旅游攻略海报.png"
    img.save(output_path, "PNG", quality=100)
    print(f"海报已保存至: {output_path}")
