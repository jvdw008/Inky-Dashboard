#!/usr/bin/env python3
import sys, json, textwrap, os
from PIL import Image, ImageDraw, ImageFont
from waveshare_epd import epd4in26

WIDTH = 800
HEIGHT = 480

BLACK = 0
WHITE = 255

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.path.join(BASE_DIR, "fonts")

FONT_PATH_BOLD = os.path.join(FONT_DIR, "NotoSans-Bold.ttf")
FONT_PATH_TEXT = os.path.join(FONT_DIR, "NotoSans-Regular.ttf")
FONT_PATH_RSS_TITLE = os.path.join(FONT_DIR, "Merriweather_36pt-Medium.ttf")
FONT_PATH_RSS_TEXT = os.path.join(FONT_DIR, "Merriweather_36pt-Light.ttf")

font_ToolbarTextLeft = ImageFont.truetype(FONT_PATH_TEXT, 32)
font_ToolbarTextRight = ImageFont.truetype(FONT_PATH_BOLD, 32)
font_ToDoTitle = ImageFont.truetype(FONT_PATH_BOLD, 52)
font_ToDoText = ImageFont.truetype(FONT_PATH_TEXT, 28)
font_RssHeader = ImageFont.truetype(FONT_PATH_BOLD, 52)
font_RssTitle = ImageFont.truetype(FONT_PATH_RSS_TITLE, 34)
font_RssText = ImageFont.truetype(FONT_PATH_RSS_TEXT, 30)

# -------------------------
# EPD helpers
# -------------------------

def init_epd_full():
    epd = epd4in26.EPD()
    epd.init()
    epd.Clear()
    return epd

# -------------------------
# Homepage
# -------------------------

def render_homepage(payload):
    epd = init_epd_full()

    image = Image.new("1", (WIDTH, HEIGHT), WHITE)
    draw = ImageDraw.Draw(image)

    draw_header(draw, payload)
    draw_todos(draw, payload.get("todos", []))

    # RIGHT PANE: RSS or IMAGE
    if payload.get("image"):
        draw_slideshow_image(image, payload["image"])
    elif payload.get("rss"):
        draw_rss(draw, payload["rss"])

    epd.display(epd.getbuffer(image))
    epd.sleep()

def draw_header(draw, payload):
    draw.text(
        (10, 1),
        "http://" + payload.get("hostname", "") + ":3000/settings.html",
        font=font_ToolbarTextLeft,
        fill=BLACK,
    )
    draw.text(
        (WIDTH - 205, 1),
        payload.get("time", ""),
        font=font_ToolbarTextRight,
        fill=BLACK,
    )

    draw.line((0, 48, WIDTH, 48), fill=BLACK)
    draw.line((WIDTH // 2, 56, WIDTH // 2, HEIGHT), fill=BLACK)

def draw_todos(draw, todos):
    x = 10
    y = 50
    draw.text((130, y), "Today", font=font_ToDoTitle, fill=BLACK)
    y += 70

    for item in todos:
        wrapped = textwrap.wrap(item["text"], width=26)
        lines = wrapped[:2]

        if len(wrapped) > 2:
            last = lines[-1]
            lines[-1] = last[:-3] + "…" if len(last) > 3 else "…"

        for i, line in enumerate(lines):
            if i == 0:
                prefix = "• "
                draw.text((x, y), f"{prefix}{line}", font=font_ToDoText, fill=BLACK)

                if item.get("done"):
                    bbox = draw.textbbox((x, y), f"{prefix}{line}", font=font_ToDoText)
                    y_mid = (bbox[1] + bbox[3]) // 2
                    draw.line((bbox[0] + 20, y_mid - 4, bbox[2], y_mid - 4), fill=BLACK, width=2)
            else:
                indent = draw.textbbox((0, 0), "• ", font=font_ToDoText)[2]
                draw.text((x + indent, y), line, font=font_ToDoText, fill=BLACK)

            y += 30
        y += 10

def draw_slideshow_image(base_image, image_path):
    try:
        img = Image.open(image_path)

        # Convert to grayscale first
        img = img.convert("L")

        # Right pane dimensions
        pane_x = WIDTH // 2 + 10
        pane_y = 56
        pane_w = WIDTH // 2 - 20
        pane_h = HEIGHT - pane_y - 10

        # Preserve aspect ratio
        img.thumbnail((pane_w, pane_h), Image.BICUBIC)

        # Apply Floyd–Steinberg dithering to 1-bit
        img = img.convert("1", dither=Image.FLOYDSTEINBERG)

        # Center inside pane
        x = pane_x + (pane_w - img.width) // 2
        y = pane_y + (pane_h - img.height) // 2

        base_image.paste(img, (x, y))

    except Exception as e:
        print("[EPD] Image render failed:", e)

def draw_rss(draw, rss):
    x = WIDTH // 2 + 10
    y = 50
    draw.text((x, y), "Breaking news", font=font_RssHeader, fill=BLACK)
    y += 70

    for line in textwrap.wrap(rss.get("title", ""), width=22)[:10]:
        draw.text((x, y), line, font=font_RssTitle, fill=BLACK)
        y += 38

    y += 10

    for line in textwrap.wrap(rss.get("text", ""), width=26)[:10]:
        draw.text((x, y), line, font=font_RssText, fill=BLACK)
        y += 32

# -------------------------
# CLI entry
# -------------------------

if __name__ == "__main__":
    mode = sys.argv[1]

    if mode == "boot":
        data = json.loads(sys.argv[2])
        message = data.get("message", "Booting...")

        epd = init_epd_full()

        image = Image.new("1", (WIDTH, HEIGHT), WHITE)
        draw = ImageDraw.Draw(image)

        bbox = draw.textbbox((0, 0), message, font=font_ToDoTitle)
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]

        x = (WIDTH - w) // 2
        y = (HEIGHT - h) // 2

        draw.text((x, y), message, font=font_ToDoTitle, fill=BLACK)

        epd.display(epd.getbuffer(image))
        epd.sleep()
        sys.exit(0)

    elif mode == "render":
        payload = json.loads(sys.argv[2])
        render_homepage(payload)
