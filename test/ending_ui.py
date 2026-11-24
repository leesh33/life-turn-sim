#!/usr/bin/env python3
"""80세 엔딩(인생 요약) 실화면 확인 — 저장본을 심고 마지막 한 달을 진행한다.

  python3 test/ending_ui.py --url https://life-turn-sim.vercel.app/ --tag live --save /workspace/end-save.json

하는 일
  1. 저장본(lifeTurnSim.save.v1)을 심고 새로 열기 → '이어하기' 카드가 뜨는지
  2. 이어하기 → 80세 12개월차 사건 → 선택 → '다음 1개월' → 엔딩 화면
  3. 엔딩 화면에 등급·점수·재산·칭호·결과 카드 버튼이 있는지 · 콘솔 오류 0 · 가로 넘침 0
"""
import argparse
import functools
import json
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
    handler.log_message = lambda *a, **k: None
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, f"http://127.0.0.1:{httpd.server_address[1]}/"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--serve", default=None)
    ap.add_argument("--url", default=None)
    ap.add_argument("--tag", default="local")
    ap.add_argument("--save", default="/workspace/end-save.json")
    args = ap.parse_args()

    httpd = None
    url = args.url
    if args.serve:
        httpd, url = serve(os.path.abspath(args.serve))
    save = json.load(open(args.save, encoding="utf-8"))

    errors = []
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME if os.path.exists(CHROME) else None, args=["--no-sandbox"])
        pg = b.new_page(viewport={"width": W, "height": H}, device_scale_factor=2, is_mobile=True, has_touch=True)
        pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.add_init_script("""
            try {
              localStorage.setItem('lifeTurnSim.save.v1', %s);
            } catch (e) {}
        """ % json.dumps(json.dumps(save, ensure_ascii=False)))
        pg.goto(url, wait_until="load")
        pg.wait_for_timeout(900)

        check("저장본을 심으면 '이어하기' 카드가 뜬다", pg.is_visible("#resumeCard"),
              pg.inner_text("#resumeMeta") if pg.query_selector("#resumeMeta") else "")
        pg.click("#resumeCard")
        pg.wait_for_timeout(900)
        label = pg.inner_text("#ageLabel") if pg.query_selector("#ageLabel") else ""
        check("80세로 이어짐", "80" in label, label)
        pg.screenshot(path=f"/workspace/verify-shots/ending-{args.tag}-01.png")

        # 마지막 달 선택 → 다음 1개월 → 엔딩
        pg.click("#choices .choice:not([disabled])")
        pg.wait_for_timeout(400)
        pg.click("#advanceBtn")
        pg.wait_for_timeout(1600)

        ending = pg.query_selector("#screen-ending")
        visible = ending.is_visible() if ending else False
        text = pg.inner_text("#screen-ending") if ending else ""
        check("80세 뒤 엔딩 화면이 뜬다", visible, (text or "")[:60].replace("\n", " "))
        check("엔딩에 등급·점수", ("S" in text or "A" in text or "B" in text or "C" in text or "D" in text) and "점" in text,
              [l for l in text.split("\n") if "점" in l][:1])
        check("엔딩에 남은 재산", "재산" in text, [l for l in text.split("\n") if "재산" in l][:1])
        check("결과 카드 버튼 있음", bool(pg.query_selector("#cardBtn")) or "결과 카드" in text)
        over = pg.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
        check("엔딩 화면 가로 넘침 0", over <= 0, f"{over}px")
        pg.screenshot(path=f"/workspace/verify-shots/ending-{args.tag}-02-ending.png", full_page=True)
        check("콘솔 오류 0건", len(errors) == 0, " / ".join(errors[:3]))
        b.close()

    if httpd:
        httpd.shutdown()
    fails = len([r for r in results if not r[0]])
    print(f"\n엔딩 화면 검사: {len(results)} 항목 · 실패 {fails} 건")
    raise SystemExit(1 if fails else 0)


if __name__ == "__main__":
    main()
