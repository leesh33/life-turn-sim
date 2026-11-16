"""Playwright 390x844 검증 스크립트 (로컬/배포 공용)

사용: python3 test/shots.py [--url http://...] [--out shots]
"""
import argparse
import os
import sys
from playwright.sync_api import sync_playwright

CHROME = "/workspace/.cache/ms-playwright/chromium-1134/chrome-linux/chrome"


def run(url, outdir, prefix):
    os.makedirs(outdir, exist_ok=True)
    shots = []

    def shot(page, name, full=False):
        path = os.path.join(outdir, f"{prefix}{name}-390x844.png")
        page.screenshot(path=path, full_page=full)
        shots.append(path)
        return path

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        page = browser.new_page(viewport={"width": 390, "height": 844},
                                device_scale_factor=2,
                                user_agent=("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) "
                                            "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"),
                                is_mobile=True, has_touch=True)
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append("console." + m.type + ": " + m.text) if m.type == "error" else None)

        page.goto(url, wait_until="networkidle")
        page.wait_for_timeout(600)

        # ① 시작 화면
        shot(page, "01-start")
        dims = page.evaluate("() => ({w: innerWidth, h: innerHeight, dpr: devicePixelRatio})")
        age_cards = page.locator(".age-card").count()
        start_text = page.locator("h1").inner_text()

        # 시작: 1세 선택 → 인생 시작
        page.locator('.age-card[data-age="1"]').click()
        page.fill("#nameInput", "상훈")
        page.locator("#startBtn").click()
        page.wait_for_timeout(700)

        # ② 1세 1일 손발가락 이벤트
        shot(page, "02-birth")
        birth_title = page.locator(".card-title").inner_text()
        birth_text = page.locator(".card-text").inner_text()
        birth_badges = page.locator(".event-card .badge").all_inner_texts()

        # 선택: 네
        page.locator(".choice").first.click()
        page.wait_for_timeout(600)
        shot(page, "03-birth-result")
        birth_result = page.locator(".result-text").inner_text()
        birth_deltas = page.locator(".deltas .delta").all_inner_texts()

        # ③ 30일 진행 → 1세 30일 조리원 분유 이벤트
        page.locator("#advanceBtn").click()
        page.wait_for_timeout(900)
        shot(page, "04-day30")
        day30_title = page.locator(".card-title").inner_text()
        day30_text = page.locator(".card-text").inner_text()
        day30_age = page.locator("#ageLabel").inner_text() + " " + page.locator("#dayLabel").inner_text()

        # 분유 50ml 선택
        page.locator(".choice").nth(1).click()
        page.wait_for_timeout(600)
        shot(page, "05-day30-result")
        day30_result = page.locator(".result-text").inner_text()
        day30_deltas = page.locator(".deltas .delta").all_inner_texts()

        # 몇 턴 더 진행해 일지에 쌓기
        for _ in range(3):
            page.locator("#advanceBtn").click()
            page.wait_for_timeout(700)
            page.locator(".choice").first.click()
            page.wait_for_timeout(500)

        # ④ 타임라인 일지
        page.locator("#logBtn").click()
        page.wait_for_timeout(700)
        shot(page, "06-timeline")
        timeline_items = page.locator(".tl-item").count()
        timeline_titles = page.locator(".tl-title").all_inner_texts()
        page.locator("#sheetClose").click()
        page.wait_for_timeout(400)

        # ⑤ 인생 요약
        page.locator("#summaryBtn").click()
        page.wait_for_timeout(700)
        shot(page, "07-summary")
        summary_title = page.locator(".end-title").inner_text()
        page.locator("#endContinue").click()
        page.wait_for_timeout(400)

        # 저장 유지 확인 (새로고침 후 이어하기)
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(700)
        resume_visible = page.locator("#resumeCard").is_visible()
        shot(page, "08-reload-resume")

        browser.close()

    print("URL:", url)
    print("viewport:", dims)
    print("start screen: h1=%r, age cards=%d" % (start_text.replace("\n", " / "), age_cards))
    print("01 birth: title=%r badges=%r" % (birth_title, birth_badges))
    print("   text=%r" % birth_text.replace("\n", " "))
    print("02 chosen(네): result=%r deltas=%r" % (birth_result, birth_deltas))
    print("03 day30: %s title=%r" % (day30_age, day30_title))
    print("   text=%r" % day30_text.replace("\n", " "))
    print("04 chosen(50ml): result=%r deltas=%r" % (day30_result, day30_deltas))
    print("05 timeline items=%d titles=%r" % (timeline_items, timeline_titles))
    print("06 summary title=%r" % summary_title)
    print("07 resume card visible after reload:", resume_visible)
    print("errors:", errors or "none")
    print("shots:", *shots, sep="\n  ")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://127.0.0.1:8811/")
    ap.add_argument("--out", default="/workspace/browser/life-sim")
    ap.add_argument("--prefix", default="")
    a = ap.parse_args()
    run(a.url, a.out, a.prefix)
