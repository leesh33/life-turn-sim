#!/usr/bin/env python3
"""🧬 이전 회차 인물 — 브라우저 검증 (로컬 · 라이브 공용)

  node test/mkcameo-states.js                                  # 단계별 저장본 만들기
  python3 test/cameo_ui.py --serve .                            # 로컬
  python3 test/cameo_ui.py --url https://life-turn-sim.vercel.app/ --tag live

하는 일 (390×844 실제 화면)
  1. 명예의 전당에 1회차 '상훈'(80세 완주) 기록을 넣고, '희연'으로 8세 인생을 시작한다
  2. 실제로 플레이해 만난 카메오 등장 장면 — 배지·이름·이전 인생 기록 안내줄
  3. 친구 → 연인 → 부부로 이어 가며 화면과 관계 상태를 확인
  4. 인생 일지 🧬 표시 · 인생 요약의 '이전 회차의 인연' · 명예의 전당 기록 줄
  5. 콘솔 오류 0건

※ 이 환경은 페이지를 여러 번 다시 열면 리소스가 모자라(net::ERR_INSUFFICIENT_RESOURCES)
   스크립트가 빠진다. 그래서 단계마다 브라우저를 새로 띄워 페이지는 한 번만 열고,
   상태는 test/mkcameo-states.js 가 만든 저장본을 심는다(README 의 저장본 주입 방식).
"""
import argparse
import functools
import json
import os
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from playwright.sync_api import sync_playwright

CHROME = "/workspace/.cache/ms-playwright/chromium-1134/chrome-linux/chrome"
STATE_FILE = "/workspace/scratch/cameo-states.json"


def serve(directory, port):
    handler = functools.partial(SimpleHTTPRequestHandler, directory=directory)
    handler.log_message = lambda *a, **k: None
    httpd = ThreadingHTTPServer(("127.0.0.1", port), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--serve", default=None)
    ap.add_argument("--url", default=None)
    ap.add_argument("--out", default="/workspace/downloads/life-sim-cameo")
    ap.add_argument("--tag", default="local")
    args = ap.parse_args()

    with open(STATE_FILE, encoding="utf-8") as f:
        st = json.load(f)

    httpd = None
    if args.serve:
        httpd = serve(args.serve, 8877)
        url = "http://127.0.0.1:8877/"
    else:
        url = args.url
    os.makedirs(args.out, exist_ok=True)

    results = []

    def ok(name, cond, extra=""):
        results.append((bool(cond), name, extra))
        print(("PASS" if cond else "FAIL") + " · " + name + ((" — " + str(extra)) if extra else ""))

    def session(p, hall, save, fn):
        """브라우저를 새로 띄워 페이지를 한 번만 연다 (저장본 주입)"""
        browser = p.chromium.launch(executable_path=CHROME,
                                    args=["--no-sandbox", "--disable-dev-shm-usage"])
        ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=1,
                                  is_mobile=True, has_touch=True)
        data = {"hall": json.dumps(hall, ensure_ascii=False),
                "save": json.dumps(save, ensure_ascii=False) if save else None}
        ctx.add_init_script(
            "(() => { const data = " + json.dumps(data) + ";"
            " try { localStorage.clear();"
            "   localStorage.setItem('lifeTurnSim.hall.v1', data.hall);"
            "   if (data.save) localStorage.setItem('lifeTurnSim.save.v1', data.save);"
            " } catch (e) {} })();")
        page = ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))
        page.on("console", lambda m: errors.append("console: " + m.text) if m.type == "error" else None)
        page.goto(url, wait_until="load")
        page.wait_for_timeout(500)
        try:
            fn(page)
        finally:
            browser.close()
        return errors

    shot = lambda name: args.out + "/" + name + "-" + args.tag + ".png"
    all_errors = []

    with sync_playwright() as p:
        # ① 희연 · 8세 · 여 — 시작 안내에 이전 인생 인물 수
        def step_start(page):
            page.fill("#nameInput", "희연")
            page.click('#genderChips .chip[data-g="여"]')
            page.click('.age-card[data-age="8"]')
            page.click("#startBtn")
            page.wait_for_timeout(500)
            ok("희연 · 8세로 인생 시작", "8세" in page.inner_text("#ageLabel"), page.inner_text("#ageLabel"))
            toast = page.inner_text("#toast")
            ok("시작 안내에 이전 인생 인물 1명", "1명" in toast, toast)
            page.screenshot(path=shot("01-start-cameo-toast"))

        all_errors += session(p, st["hall"], None, step_start)

        # ② 카메오 등장 장면 — 실제로 플레이해 만난 상태
        def step_meet(page):
            page.click("#resumeCard")
            page.wait_for_timeout(500)
            card = page.inner_text("#eventCard")
            ok("카드에 '이전 회차 인물' 배지", "이전 회차 인물" in card, page.inner_text(".card-badges"))
            ok("상훈의 실제 이름이 장면에 나옴", "상훈" in page.inner_text(".card-text"), "")
            note = page.inner_text(".cameo-note")
            ok("이전 인생 기록 안내줄", "80세 완주" in note and "억대 재산" in note, note.replace("\n", " / "))
            page.screenshot(path=shot("02-cameo-meet"))
            page.click("#choices .choice[data-i='0']")
            page.wait_for_timeout(700)
            rel = page.evaluate("() => Life.load().cameos[0].rel")
            ok("먼저 말을 걸어 친구가 됨", rel == "friend", rel)
            result = page.inner_text(".result-text")
            ok("결과 문구에 상훈의 이름", "상훈" in result, result[:50])
            page.screenshot(path=shot("03-cameo-friend"))

        all_errors += session(p, st["hall"], st["meet"], step_meet)

        # ③ 몇 년 만의 연락 → 연인
        def step_dating(page):
            page.click("#resumeCard")
            page.wait_for_timeout(500)
            ok("재회 장면 제목", "연락" in page.inner_text(".card-title"), page.inner_text(".card-title"))
            page.screenshot(path=shot("04-cameo-reunion"))
            page.click("#choices .choice[data-i='0']")
            page.wait_for_timeout(700)
            rel = page.evaluate("() => Life.load().cameos[0].rel")
            ok("몇 년 만의 연락 → 연인", rel == "dating", rel)
            page.screenshot(path=shot("05-cameo-dating"))

        all_errors += session(p, st["hall"], st["dating"], step_dating)

        # ④ 진지한 이야기 → 부부 · 일지 · 요약
        def step_married(page):
            page.click("#resumeCard")
            page.wait_for_timeout(500)
            page.click("#choices .choice[data-i='0']")
            page.wait_for_timeout(800)
            rel = page.evaluate("() => Life.load().cameos[0].rel")
            flags = page.evaluate("() => { const s = Life.load(); return { m: !!s.flags.결혼, b: !!s.flags.배우자 }; }")
            ok("진지한 이야기 → 부부", rel == "married", rel)
            ok("결혼·배우자 플래그", flags["m"] and flags["b"], json.dumps(flags))
            page.screenshot(path=shot("06-cameo-married"))

            page.click("#logBtn")
            page.wait_for_timeout(500)
            log_text = page.inner_text("#sheetBody")
            ok("인생 일지에 '이전 회차' 표시", "이전 회차" in log_text, "표시 있음" if "이전 회차" in log_text else "없음")
            page.screenshot(path=shot("07-cameo-log"))
            page.click("#sheetClose")
            page.wait_for_timeout(300)

            page.click("#summaryBtn")
            page.wait_for_timeout(600)
            end_text = page.inner_text("#endingScroll")
            ok("인생 요약에 '이전 회차의 인연 · 부부'", "이전 회차의 인연" in end_text and "부부" in end_text, "")
            page.screenshot(path=shot("08-cameo-summary"))

        all_errors += session(p, st["hall"], st["married"], step_married)

        # ⑤ 80세 완주 — 전당 기록에 인연이 남는다
        def step_hall(page):
            page.click("#resumeCard")
            page.wait_for_timeout(600)
            page.click("#endHall")
            page.wait_for_timeout(700)
            mine = page.evaluate("() => Life.hallMine().map(r => ({n: r.name, c: r.cameo && r.cameo.rel}))")
            ok("명예의 전당 기록에 인연", any(m["c"] == "married" for m in mine), json.dumps(mine, ensure_ascii=False))
            ok("전당 기록 줄에 🧬 표시", "🧬" in page.inner_text("#hallBody"), "")
            page.screenshot(path=shot("09-hall-cameo"))

        all_errors += session(p, st["hallAfter"], st["ended"], step_hall)

    ok("콘솔 오류 0건", len(all_errors) == 0, "; ".join(all_errors[:3]))

    if httpd:
        httpd.shutdown()

    failed = [r for r in results if not r[0]]
    print("\n=== %d / %d 통과 ===" % (len(results) - len(failed), len(results)))
    print("=== 결과:", "FAIL" if failed else "PASS", "===")
    print("스크린샷:", args.out)
    return 0 if not failed else 1


if __name__ == "__main__":
    raise SystemExit(main())
