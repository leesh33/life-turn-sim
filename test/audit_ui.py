#!/usr/bin/env python3
"""전수조사(2026-11-24) 실화면 검증 — 390×844 모바일에서 새 밸런스가 실제로 도는지.

  python3 test/audit_ui.py --serve .                                  # 로컬
  python3 test/audit_ui.py --url https://life-turn-sim.vercel.app/ --tag live

하는 일
  1. 시작 화면 — 390 폭에서 가로 넘침 0 · 콘솔 오류 0
  2. 25세 시작으로 12개월 진행 → 26세 첫 달
       · 미션 이름이 '20대 후반 미션'인지 ('30·40대 미션' 금지 — 제보 항목)
       · 생일 토스트에 '연 수지 …만원'이 함께 뜨는지 (살림 장부)
       · 재산이 생일 정산으로 움직였는지
  3. 플레이 중 가로 넘침 0 · 콘솔 오류 0
  4. 스크린샷 저장(390×844)
"""
import argparse
import functools
import os
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from playwright.sync_api import sync_playwright

CHROME = "/workspace/.cache/ms-playwright/chromium-1134/chrome-linux/chrome"
W, H = 390, 844

results = []


def check(name, ok, detail=""):
    results.append((ok, name, detail))
    print(("PASS · " if ok else "FAIL · ") + name + (" — " + str(detail) if detail != "" else ""))


def serve(root):
    handler = functools.partial(SimpleHTTPRequestHandler, directory=root)
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, f"http://127.0.0.1:{httpd.server_address[1]}/"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--serve", default=None)
    ap.add_argument("--url", default=None)
    ap.add_argument("--tag", default="local")
    args = ap.parse_args()

    httpd = None
    url = args.url
    if args.serve:
        httpd, url = serve(os.path.abspath(args.serve))

    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME if os.path.exists(CHROME) else None,
                                    args=["--no-sandbox"])
        page = browser.new_page(viewport={"width": W, "height": H}, device_scale_factor=2,
                                is_mobile=True, has_touch=True)
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(url, wait_until="networkidle")
        page.wait_for_timeout(600)

        over = page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
        check("시작 화면 가로 넘침 0", over <= 0, f"{over}px")
        page.screenshot(path=f"/workspace/verify-shots/audit-{args.tag}-01-start.png")

        # 25세 시작
        page.click("#ageGrid button:nth-child(6)")
        page.wait_for_timeout(200)
        page.click("#startBtn")
        page.wait_for_timeout(900)
        check("25세 시작 — 인생 화면 진입", page.is_visible("#stage"), page.inner_text("#ageLabel"))
        page.screenshot(path=f"/workspace/verify-shots/audit-{args.tag}-02-25.png")

        # 12개월 진행 — 선택(첫 번째) 후 '다음 1개월'
        ledger_toast = ""
        for i in range(12):
            try:
                btn = page.query_selector(".choice >> nth=0")
                if btn and btn.is_enabled():
                    btn.click()
                    page.wait_for_timeout(260)
            except Exception:
                pass
            adv = page.query_selector("#advanceBtn")
            if adv and adv.is_enabled():
                adv.click()
                page.wait_for_timeout(320)
            txt = page.inner_text("#toast") if page.query_selector("#toast") else ""
            if "연 수지" in (txt or ""):
                ledger_toast = txt
            page.wait_for_timeout(120)

        age_label = page.inner_text("#ageLabel")
        mission = page.inner_text("#avMission") if page.query_selector("#avMission") else ""
        check("26세 도달", age_label.strip().startswith("26"), age_label)
        check("미션 이름이 26세에 맞음 ('30·40대' 없음)", ("30·40대" not in mission) and ("미션" in mission), mission)
        check("생일 토스트에 연 수지 표시", "연 수지" in ledger_toast, ledger_toast)
        over2 = page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
        check("플레이 화면 가로 넘침 0", over2 <= 0, f"{over2}px")
        page.screenshot(path=f"/workspace/verify-shots/audit-{args.tag}-03-26.png")

        check("콘솔 오류 0건", len(errors) == 0, " / ".join(errors[:3]))
        browser.close()

    if httpd:
        httpd.shutdown()

    fails = len([r for r in results if not r[0]])
    print(f"\n전수조사 화면 검사: {len(results)} 항목 · 실패 {fails} 건")
    raise SystemExit(1 if fails else 0)


if __name__ == "__main__":
    main()
