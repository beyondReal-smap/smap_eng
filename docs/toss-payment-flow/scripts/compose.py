# 캡처(1440x900)에 브라우저 크롬 + 작업표시줄을 합성해 1440x1040 프레임을 만든다 (personafit compose.py 기반).
# 틀(tpl/frame.png)은 personafit 제출본의 합성 프레임에서 가져왔고, URL·시각만 다시 그린다.
import datetime, os, sys
from PIL import Image, ImageDraw, ImageFont
S = os.path.dirname(os.path.abspath(__file__))
TPL = Image.open(f"{S}/tpl/frame.png").convert("RGB")
FONT = "/home/jin/.local/lib/python3.12/site-packages/pykrx/NanumBarunGothic.ttf"
PILL, BAR, URL_TXT = (241, 243, 244), (32, 32, 32), (32, 33, 36)
TOP, BOT = TPL.crop((0, 0, 1440, 94)), TPL.crop((0, 994, 1440, 1040))
f_url, f_t1, f_t2 = ImageFont.truetype(FONT, 19), ImageFont.truetype(FONT, 17), ImageFont.truetype(FONT, 15)
now = datetime.datetime.now()
t1 = f"{'오전' if now.hour < 12 else '오후'} {now.hour % 12 or 12}:{now.minute:02d}"
t2 = now.strftime("%Y-%m-%d")
SHOTS = {
    "01.png": "eng.smap.site", "02.png": "eng.smap.site/legal/business",
    "03.png": "eng.smap.site/legal/refund", "04.png": "eng.smap.site/legal/refund",
    "05.png": "eng.smap.site/login", "06.png": "eng.smap.site/subscribe",
    "07.png": "eng.smap.site/subscribe", "08.png": "eng.smap.site/subscribe",
}
os.makedirs(f"{S}/frames", exist_ok=True)
bot = BOT.copy(); d = ImageDraw.Draw(bot)
d.rectangle([1200, 0, 1440, 46], fill=BAR)
d.text((1376, 8), t1, font=f_t1, fill=(255, 255, 255), anchor="ra")
d.text((1376, 27), t2, font=f_t2, fill=(255, 255, 255), anchor="ra")
# 탭 제목·아이콘을 하루책으로 교체 (틀에는 PersonaFit 탭이 그려져 있다)
TAB_BG = TPL.getpixel((300, 22))
ICON = Image.open("/home/jin/projects/eng/public/book_icon.png").convert("RGBA").resize((20, 20))
f_tab = ImageFont.truetype(FONT, 16)
for name in (sys.argv[1:] or SHOTS):
    top = TOP.copy(); d = ImageDraw.Draw(top)
    d.rectangle([20, 9, 336, 37], fill=TAB_BG)
    top.paste(ICON, (24, 13), ICON)
    d.text((52, 13), "하루책 | 아이 맞춤 영어 동화", font=f_tab, fill=(32, 33, 36))
    d.rectangle([172, 53, 1370, 84], fill=PILL); d.text((176, 57), SHOTS[name], font=f_url, fill=URL_TXT)
    body = Image.open(f"{S}/shots/{name}").convert("RGB").resize((1440, 900))
    out = Image.new("RGB", (1440, 1040), "white")
    out.paste(top, (0, 0)); out.paste(body, (0, 94)); out.paste(bot, (0, 994))
    out.save(f"{S}/frames/{name}"); print("ok", name)
