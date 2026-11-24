#!/usr/bin/env python3
"""건강 위기 → 조기 엔딩 실화면 확인 (390×844).

  python3 test/health_ui.py --serve . --tag local
  python3 test/health_ui.py --url https://life-turn-sim.vercel.app/ --tag live

하는 일
  1. 위독 직전 저장본(체력 3 · 부담 2)을 심고 이어하기
  2. '버티고 또 나간다' → 다음 1개월 → 위독 경고(토스트 · 체력 붉은 바)
  3. '겨우 일어난다' → 다음 1개월 → 건강 악화 조기 엔딩 화면
  4. 엔딩에 '건강 악화로 N세' · 등급 · 결과 카드 · 명예의 전당 조기 탭 · 가로 넘침 0
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
    ap.add_argument("--save", default="/workspace/verify-shots/health.json")
    ap.add_argument("--out", default="/workspace/verify-shots")
    args = ap.parse_args()

    httpd = None
    url = args.url
    if args.serve:
        httpd, url = serve(os.path.abspath(args.serve))
    save = json.load(open(args.save, encoding="utf-8"))
    os.makedirs(args.out, exist_ok=True)

    errors = []
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME if os.path.exists(CHROME) else None,
                              args=["--no-sandbox"])
        pg = b.new_page(viewport={"width": W, "height": H}, device_scale_factor=2,
                        is_mobile=True, has_touch=True)
        pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.add_init_script("""
            try { localStorage.setItem('lifeTurnSim.save.v1', %s); } catch (e) {}
        """ % json.dumps(json.dumps(save, ensure_ascii=False)))
        pg.goto(url, wait_until="load")
        pg.wait_for_timeout(1000)

        check("위독 직전 저장본으로 '이어하기'", pg.is_visible("#resumeCard"))
        pg.click("#resumeCard")
        pg.wait_for_timeout(900)
        check("35세 위독 상태로 이어짐", "35" in pg.inner_text("#ageLabel"), pg.inner_text("#ageLabel"))
        body = pg.inner_text("#stageInner")
        check("위독 사건 카드가 뜬다", "몸이 버티지 못합니다" in body,
              [l for l in body.split("\n") if "몸이" in l][:1])
        check("체력 칸이 위험 표시(⚠️)",
              "⚠️" in pg.inner_text("#stats") and pg.eval_on_selector_all(
                  ".stat.danger", "els => els.length") >= 1)
        pg.screenshot(path=f"{args.out}/health-{args.tag}-01-crisis.png")

        # 버티기 → 다음 달: 위독 경고 토스트
        pg.click("#choices .choice:last-child")
        pg.wait_for_timeout(300)
        pg.click("#advanceBtn")
        pg.wait_for_timeout(1500)
        toast = pg.inner_text("#toast") if pg.query_selector("#toast") else ""
        check("위독 경고 토스트가 뜬다", ("체력" in toast and ("위험" in toast or "끝" in toast)), toast)
        pg.screenshot(path=f"{args.out}/health-{args.tag}-02-warning.png")

        # 한 번 더 버티면 조기 엔딩
        body = pg.inner_text("#stageInner")
        if "쓰러졌습니다" in body:
            pg.click("#choices .choice:last-child")
        else:
            pg.click("#choices .choice:first-child")
        pg.wait_for_timeout(300)
        pg.click("#advanceBtn")
        pg.wait_for_timeout(1600)

        ending = pg.query_selector("#screen-ending")
        visible = ending.is_visible() if ending else False
        text = pg.inner_text("#screen-ending") if ending else ""
        check("건강 악화 엔딩 화면이 뜬다", visible, (text or "")[:50].replace("\n", " "))
        check("'건강 악화로 35세' 문구", "건강 악화로" in text and "35세" in text,
              [l for l in text.split("\n") if "건강 악화" in l][:1])
        check("80세 회고가 아니라 몸의 회고", "몸이 먼저" in text or "병원 복도" in text,
              [l for l in text.split("\n") if "몸" in l][:2])
        check("등급·총점·재산", "점" in text and "재산" in text)
        check("결과 카드 버튼", bool(pg.query_selector("#endShare")) or "결과 카드" in text)
        check("명예의 전당 '조기' 기록 안내", "건강 조기 엔딩" in text,
              [l for l in text.split("\n") if "명예의 전당" in l][:1])
        over = pg.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
        check("엔딩 화면 가로 넘침 0", over <= 0, f"{over}px")
        pg.screenshot(path=f"{args.out}/health-{args.tag}-03-ending.png", full_page=True)

        # 전당 '조기' 탭에 기록이 보이는가
        pg.click("#endHall")
        pg.wait_for_timeout(700)
        hall = pg.inner_text("#screen-hall")
        check("전당에 건강 조기 엔딩 기록", "건강 악화" in hall, [l for l in hall.split("\n") if "건강" in l][:2])
        tabs = pg.inner_text("#hallTabs") if pg.query_selector("#hallTabs") else ""
        check("전당 탭에 '조기'가 있다", "조기" in tabs, tabs.replace("\n", " "))
        pg.screenshot(path=f"{args.out}/health-{args.tag}-04-hall.png")

        check("콘솔 오류 0건", len(errors) == 0, " / ".join(errors[:3]))
        b.close()

    if httpd:
        httpd.shutdown()
    fails = len([r for r in results if not r[0]])
    print(f"\n건강 위기 화면 검사: {len(results)} 항목 · 실패 {fails} 건")
    raise SystemExit(1 if fails else 0)


if __name__ == "__main__":
    main()
