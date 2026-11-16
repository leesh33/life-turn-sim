"""추가 검증: 25세 취직 화면 · 엔딩 화면 · 재시작

사용: python3 test/shots2.py [--url ...] [--out ...] [--prefix ...]
"""
import argparse
import os
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
        page = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2,
                                is_mobile=True, has_touch=True)
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append("console.error: " + m.text) if m.type == "error" else None)

        page.goto(url, wait_until="networkidle")
        page.evaluate("localStorage.clear()")
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(400)

        # 25세 취직으로 시작 → 첫 이벤트(회사 선택)
        page.locator('.age-card[data-age="25"]').click()
        page.fill("#nameInput", "상훈")
        page.locator("#startBtn").click()
        page.wait_for_timeout(600)
        shot(page, "10-start25-job")
        job_title = page.locator(".card-title").inner_text()
        job_choices = page.locator(".choice").all_inner_texts()
        page.locator(".choice").first.click()
        page.wait_for_timeout(500)
        shot(page, "11-start25-result")

        # 엔딩까지 헤드리스로 진행한 뒤 저장 → 이어하기로 엔딩 화면 확인
        page.evaluate("""() => {
            const s = window.Life.newGame({name: '상훈', gender: '남', startAge: 25});
            let guard = 0;
            while (!s.ended && guard++ < 4000) {
                const ev = window.Life.currentEvent(s);
                window.Life.choose(s, Math.floor(Math.random() * ev.choices.length));
                window.Life.advance(s);
            }
            window.Life.save(s);
            return s.history.length;
        }""")
        turns = page.evaluate("() => (window.Life.load()||{}).history ? window.Life.load().history.length : 0")
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(500)
        shot(page, "12-resume-card")
        page.locator("#resumeCard").click()
        page.wait_for_timeout(800)
        shot(page, "13-ending")
        ending_title = page.locator(".end-title").inner_text()
        ending_grade = page.locator(".grade").inner_text()
        ending_kicker = page.locator(".end-kicker").inner_text()

        # 일지 열기
        page.locator("#endLog").click()
        page.wait_for_timeout(700)
        shot(page, "14-ending-log")
        page.locator("#sheetClose").click()
        page.wait_for_timeout(300)

        # 새 인생 시작
        page.locator("#endRestart").click()
        page.wait_for_timeout(600)
        shot(page, "15-restart")

        browser.close()

    print("URL:", url)
    print("25세 첫 이벤트:", job_title)
    print("  선택지:", job_choices)
    print("엔딩까지 선택 수:", turns)
    print("엔딩 타이틀:", ending_title)
    print("  등급:", ending_grade, "| kicker:", ending_kicker)
    print("errors:", errors or "none")
    print("shots:", *shots, sep="\n  ")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://127.0.0.1:8811/")
    ap.add_argument("--out", default="/workspace/browser/life-sim")
    ap.add_argument("--prefix", default="")
    a = ap.parse_args()
    run(a.url, a.out, a.prefix)
