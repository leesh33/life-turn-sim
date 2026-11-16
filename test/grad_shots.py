"""라이브 390×844 스크린샷 — 저장본을 주입해 졸업 결산/전당/80세 엔딩 화면을 촬영한다.

준비: node test/mkstate.js  →  downloads/life-states.json
사용: python3 test/grad_shots.py [--url https://life-turn-sim.vercel.app/] [--out /workspace/downloads/life-sim-grad-live]
"""
import argparse
import json
import os
import sys
from playwright.sync_api import sync_playwright

CHROME = "/workspace/.cache/ms-playwright/chromium-1134/chrome-linux/chrome"
STATES = "/workspace/downloads/life-states.json"


def run(url, outdir):
    os.makedirs(outdir, exist_ok=True)
    data = json.load(open(STATES))
    problems, shots = [], []

    def shot(page, name):
        path = os.path.join(outdir, f"{name}-390x844.png")
        page.screenshot(path=path)
        shots.append(path)
        return path

    def open_page(page):
        last = None
        for attempt in range(4):
            try:
                page.goto("about:blank")
                page.wait_for_timeout(300)
                page.goto(url, wait_until="domcontentloaded")
                page.wait_for_selector("#ageGrid .age-card", timeout=25000)
                page.wait_for_timeout(300)
                return
            except Exception as exc:      # 환경 리소스 부족으로 첫 로드가 실패하는 경우가 있다
                last = exc
                page.wait_for_timeout(1500)
        raise last

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME,
                                    args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu",
                                          "--renderer-process-limit=2"])
        page = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=1,
                                is_mobile=True, has_touch=True)
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append("console.error: " + m.text) if m.type == "error" else None)

        open_page(page)
        page.evaluate("localStorage.clear()")

        # ── 13세 초등학교 졸업 결산 ──
        page.evaluate("""([save]) => {
          localStorage.setItem('lifeTurnSim.save.v1', save);
        }""", [json.dumps(data["elementary"]["save"])])
        open_page(page)
        page.click("#resumeCard")
        page.wait_for_timeout(700)
        if page.locator(".grad-name").count() != 1:
            problems.append("졸업 결산 화면이 열리지 않음")
        grad = page.locator(".grad-name").inner_text()
        print("졸업식:", grad)
        shot(page, "06-grad13-top")
        lines = page.locator(".recall-body p").all_inner_texts()
        print("회고 줄 수:", len(lines))
        if not (7 <= len(lines) <= 10):
            problems.append("회고 줄 수 이상")
        page.locator(".cmp-card").scroll_into_view_if_needed()
        page.wait_for_timeout(300)
        shot(page, "07-grad13-compare")
        rows = page.locator(".cmp-row").count()
        print("비교 행 수:", rows)
        if rows != 6:
            problems.append("비교 행 수 이상")
        page.locator("#gradRegister").scroll_into_view_if_needed()
        page.wait_for_timeout(300)
        shot(page, "08-grad13-actions")
        page.locator("#gradContinue").scroll_into_view_if_needed()
        page.wait_for_timeout(300)
        shot(page, "08b-grad13-buttons")
        page.click("#gradRegister")
        page.wait_for_timeout(2400)
        shot(page, "09-grad-ending")
        if "명예의 전당" not in page.locator("#endingScroll").inner_text():
            problems.append("졸업 엔딩에 전당 문구 없음")

        # ── 명예의 전당 ──
        page.click("#endHall")
        page.wait_for_timeout(900)
        shot(page, "10-hall")
        if page.locator(".hall-row.mine").count() < 1:
            problems.append("전당에 내 기록 없음")
        if page.locator(".hall-row.best").count() != 1:
            problems.append("내 최고 기록 하이라이트 이상")
        page.locator('.hall-tab[data-tab="elementary"]').click()
        page.wait_for_timeout(500)
        shot(page, "11-hall-elementary")
        page.click("#hallBack")
        page.wait_for_timeout(400)

        # ── 80세 완주 엔딩 ──
        page.evaluate("""([save, hall]) => {
          localStorage.setItem('lifeTurnSim.save.v1', save);
          if (hall) localStorage.setItem('lifeTurnSim.hall.v1', hall);
        }""", [json.dumps(data["life80"]["save"]), json.dumps(data["life80"]["hall"])])
        open_page(page)
        page.click("#resumeCard")
        page.wait_for_timeout(800)
        shot(page, "12-life80-ending")
        lines = page.locator(".recall-body p").all_inner_texts()
        print("80세 회고 줄 수:", len(lines))
        if not (7 <= len(lines) <= 10):
            problems.append("80세 회고 줄 수 이상")
        page.locator(".recall-card").scroll_into_view_if_needed()
        page.wait_for_timeout(300)
        shot(page, "13-life80-recall")

        # 시작 화면(전당 버튼) — 새로 시작 상태
        page.evaluate("localStorage.clear()")
        open_page(page)
        shot(page, "01-start")

        hard = [e for e in errors if "ERR_INSUFFICIENT_RESOURCES" not in e]
        print("콘솔 에러:", hard if hard else "없음(환경 리소스 경고 제외)")
        if hard:
            problems.append(f"콘솔 에러 {len(hard)}건")
        browser.close()

    print("=== 결과:", "PASS" if not problems else "FAIL", "===")
    for pr in problems:
        print(" -", pr)
    print("스크린샷:", len(shots))
    return 0 if not problems else 1


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="https://life-turn-sim.vercel.app/")
    ap.add_argument("--out", default="/workspace/downloads/life-sim-grad-live")
    a = ap.parse_args()
    sys.exit(run(a.url, a.out))
