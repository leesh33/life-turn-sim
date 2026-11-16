"""시작 화면 → 플레이 화면 스모크 테스트 (JS 오류·레이아웃 회귀 확인)

사용: python3 test/smoke.py [--serve DIR]
"""
import argparse
import functools
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from playwright.sync_api import sync_playwright

CHROME = "/workspace/.cache/ms-playwright/chromium-1134/chrome-linux/chrome"


def serve(directory, port):
    handler = functools.partial(SimpleHTTPRequestHandler, directory=directory)
    handler.log_message = lambda *a, **k: None
    httpd = ThreadingHTTPServer(("127.0.0.1", port), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def run(directory, port):
    httpd = serve(directory, port)
    url = f"http://127.0.0.1:{port}/"
    problems = []
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        for w, h in ((390, 664), (390, 844)):
            page = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=2,
                                    is_mobile=True, has_touch=True)
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.on("console", lambda m: errors.append("console: " + m.text) if m.type == "error" else None)
            page.goto(url, wait_until="networkidle")
            page.evaluate("localStorage.clear()")
            page.reload(wait_until="networkidle")
            page.wait_for_timeout(300)

            # 이름·성별 입력 후 시작
            page.fill("#nameInput", "상훈")
            page.locator('#genderChips .chip[data-g="여"]').click()
            page.locator('.age-card[data-age="25"]').click()
            page.locator("#startBtn").click()
            page.wait_for_timeout(600)
            play_ok = page.locator("#screen-play").is_visible()
            title = page.locator(".card-title").inner_text()
            choices = page.locator(".choice").count()
            page.locator(".choice").first.click()
            page.wait_for_timeout(400)
            page.screenshot(path=f"/workspace/browser/life-sim/start-fit/smoke-play-{w}x{h}.png")

            # 저장 후 시작 화면 복귀 → 이어하기 카드 상태
            page.reload(wait_until="networkidle")
            page.wait_for_timeout(400)
            resume_visible = page.locator("#resumeCard").is_visible()
            has_resume = page.evaluate("() => document.getElementById('screen-start').classList.contains('has-resume')")
            page.screenshot(path=f"/workspace/browser/life-sim/start-fit/smoke-resume-{w}x{h}.png")

            print(f"[{w}x{h}] play={play_ok} title={title!r} choices={choices} "
                  f"resume={resume_visible} hasResumeClass={has_resume} errors={errors or 'none'}")
            problems += errors
            page.close()
        browser.close()
    httpd.shutdown()
    print("PROBLEMS:", problems or "none")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--serve", default="/workspace/life-sim-web")
    ap.add_argument("--port", type=int, default=8822)
    a = ap.parse_args()
    run(a.serve, a.port)
