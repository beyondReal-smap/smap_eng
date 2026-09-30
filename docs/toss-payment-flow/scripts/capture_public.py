# 하루책(eng.smap.site) 카드사 심사용 공개 페이지 캡처 (1440x900) — personafit capture.py 기반
import asyncio, sys
from playwright.async_api import async_playwright
BASE = "https://eng.smap.site"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
OUT = sys.argv[1]
async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch(executable_path="/home/jin/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome")
        ctx = await br.new_context(viewport={"width":1440,"height":900}, user_agent=UA,
                                   locale="ko-KR", timezone_id="Asia/Seoul", device_scale_factor=1)
        pg = await ctx.new_page()
        await pg.goto(BASE, wait_until="networkidle")          # 01 홈 하단(footer)
        await pg.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await pg.wait_for_timeout(1500); await pg.screenshot(path=f"{OUT}/01.png")
        await pg.goto(f"{BASE}/legal/business", wait_until="networkidle")   # 02 사업자정보
        await pg.wait_for_timeout(1200); await pg.screenshot(path=f"{OUT}/02.png")
        await pg.goto(f"{BASE}/legal/refund", wait_until="networkidle")     # 03 환불정책 상단
        await pg.wait_for_timeout(1200); await pg.screenshot(path=f"{OUT}/03.png")
        el = pg.get_by_role("heading", name="3. 별 환불 기준")               # 04 별 환불 기준 표
        await el.scroll_into_view_if_needed(); await pg.evaluate("window.scrollBy(0, -120)")
        await pg.wait_for_timeout(800); await pg.screenshot(path=f"{OUT}/04.png")
        await pg.goto(f"{BASE}/login", wait_until="networkidle")            # 05 로그인
        await pg.wait_for_timeout(1500); await pg.screenshot(path=f"{OUT}/05.png")
        await br.close()
asyncio.run(main())
