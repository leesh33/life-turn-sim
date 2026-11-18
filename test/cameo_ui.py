#!/usr/bin/env python3
"""🧬 이전 회차 인물 — 브라우저 검증 (로컬 · 라이브 공용)

  python3 test/cameo_ui.py --serve .            # 로컬
  python3 test/cameo_ui.py --url https://life-turn-sim.vercel.app/ --tag live

하는 일
  1. 명예의 전당에 1회차 '상훈'(80세 완주) 기록을 넣는다
  2. '희연'으로 8세 인생을 시작한다 (시작 안내 토스트에 인물 수가 뜨는지)
  3. 실제 엔진으로 달을 넘겨 카메오 등장 장면을 만나고, 화면을 그려 스크린샷
  4. 친구 → 연인 → 부부로 이어 가며 관계 상태를 확인
  5. 인생 일지·인생 요약에 인연이 남는지, 콘솔 오류 0건인지 확인
"""
import argparse
import functools
import json
import os
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from playwright.sync_api import sync_playwright

CHROME = "/workspace/.cache/ms-playwright/chromium-1134/chrome-linux/chrome"

SANGHUN = {
    "id": "r-sanghun-1", "kind": "life", "key": "life80", "stageLabel": "80세 완주", "age": 80,
    "score": 71.4, "grade": "A", "top": None,
    "title": "우렁찬 울음으로 시작해 인맥 하나로 먹고사는 K-기획자",
    "name": "상훈", "gender": "남", "ts": 1700000000000, "mine": True,
    "stats": {"hp": 64, "mental": 71, "charm": 66, "social": 84, "intel": 79, "luck": 55, "asset": 32000},
}


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

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        page = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2,
                                is_mobile=True, has_touch=True)
        errors = []
        page.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))
        page.on("console", lambda m: errors.append("console: " + m.text) if m.type == "error" else None)
        page.goto(url, wait_until="networkidle")
        page.wait_for_timeout(300)

        # 1) 전당에 1회차 기록 주입
        page.evaluate(
            """(rec) => {
                localStorage.clear();
                localStorage.setItem('lifeTurnSim.hall.v1',
                  JSON.stringify({ v: 1, seeded: true, records: [rec] }));
            }""", SANGHUN)
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(300)

        # 2) 희연 · 8세 · 여 로 시작 (실제 UI 조작)
        page.fill("#nameInput", "희연")
        page.click('#genderChips .chip[data-g="여"]')
        page.click('.age-card[data-age="8"]')
        page.click("#startBtn")
        page.wait_for_timeout(500)
        age_label = page.inner_text("#ageLabel")
        toast = page.inner_text("#toast")
        ok("희연 · 8세로 인생 시작", "8세" in age_label, age_label)
        ok("시작 안내에 이전 인생 인물 1명", "1명" in toast, toast)
        page.screenshot(path=args.out + "/01-start-cameo-toast-" + args.tag + ".png")

        # 3) 실제 엔진으로 달을 넘겨 카메오 등장 장면을 만난다 (앱과 같은 상태·같은 저장본)
        seen = page.evaluate(
            """() => {
                let s = Life.load();
                const seen = [];
                for (let i = 0; i < 40 && !s.ended; i++) {
                  const ev = Life.currentEvent(s);
                  seen.push(ev.id + '@' + s.age);
                  if (String(ev.id).indexOf('cm_') === 0) break;
                  Life.choose(s, 0);
                  Life.advance(s);
                }
                Life.save(s);
                return { seen: seen, id: s.current && s.current.eventId, age: s.age, month: s.month,
                         cameos: s.cameos.map(c => c.name + '/' + c.rel) };
            }""")
        ok("플레이 중 카메오 장면 도달", str(seen["id"]).startswith("cm_"), json.dumps(seen, ensure_ascii=False)[:160])

        page.reload(wait_until="networkidle")
        page.click("#resumeCard")
        page.wait_for_timeout(400)
        badge = page.inner_text("#eventCard")
        ok("카드에 '이전 회차 인물' 배지", "이전 회차 인물" in badge, badge.split("\n")[0][:40])
        ok("상훈의 실제 이름이 장면에 나옴", "상훈" in badge, "")
        note = page.inner_text(".cameo-note")
        ok("이전 인생 기록 안내줄", "80세 완주" in note and "억대 재산" in note, note.replace("\n", " / ")[:90])
        page.screenshot(path=args.out + "/02-cameo-meet-" + args.tag + ".png")

        # 4) 친구 → 연인 → 부부
        #    (등장 장면의 선택지가 실제로 친구가 되는지 — 판정은 능력치가 가른다)
        page.evaluate(
            """() => { const s = Life.load(); s.stats.social = 88; s.stats.charm = 85; s.stats.mental = 80;
                      s.stats.luck = 80; Life.save(s); }""")
        page.reload(wait_until="networkidle")
        page.click("#resumeCard")
        page.wait_for_timeout(300)
        page.click("#choices .choice[data-i='0']")
        page.wait_for_timeout(600)
        rel = page.evaluate("() => Life.load().cameos[0].rel")
        ok("먼저 말을 걸어 친구가 됨", rel == "friend", rel)
        page.screenshot(path=args.out + "/03-cameo-friend-" + args.tag + ".png")

        # 30세 몇 년 만의 연락 → 연인
        page.evaluate(
            """() => { const s = Life.load(); s.age = 30; s.month = 6;
                      s.current = { eventId: 'cm_reunion', chosen: null }; Life.save(s); }""")
        page.reload(wait_until="networkidle")
        page.click("#resumeCard")
        page.wait_for_timeout(300)
        page.click("#choices .choice[data-i='0']")
        page.wait_for_timeout(600)
        rel = page.evaluate("() => Life.load().cameos[0].rel")
        ok("몇 년 만의 연락 → 연인", rel == "dating", rel)
        page.screenshot(path=args.out + "/04-cameo-dating-" + args.tag + ".png")

        # 36세 진지한 이야기 → 부부
        page.evaluate(
            """() => { const s = Life.load(); s.age = 36; s.month = 5;
                      s.current = { eventId: 'cm_deepen', chosen: null }; Life.save(s); }""")
        page.reload(wait_until="networkidle")
        page.click("#resumeCard")
        page.wait_for_timeout(300)
        page.click("#choices .choice[data-i='0']")
        page.wait_for_timeout(600)
        rel = page.evaluate("() => Life.load().cameos[0].rel")
        flags = page.evaluate("() => { const s = Life.load(); return { m: !!s.flags.결혼, b: !!s.flags.배우자 }; }")
        ok("진지한 이야기 → 부부", rel == "married", rel)
        ok("결혼·배우자 플래그", flags["m"] and flags["b"], json.dumps(flags))
        page.screenshot(path=args.out + "/05-cameo-married-" + args.tag + ".png")

        # 5) 인생 일지에 🧬 표시
        page.click("#logBtn")
        page.wait_for_timeout(400)
        log_text = page.inner_text("#sheetBody")
        ok("인생 일지에 '이전 회차' 표시", "이전 회차" in log_text, "이전 회차" if "이전 회차" in log_text else "없음")
        page.screenshot(path=args.out + "/06-cameo-log-" + args.tag + ".png")
        page.click("#sheetClose")
        page.wait_for_timeout(300)

        # 6) 인생 요약에 인연
        page.click("#summaryBtn")
        page.wait_for_timeout(500)
        end_text = page.inner_text("#endingScroll")
        ok("인생 요약에 '이전 회차의 인연 · 부부'", "이전 회차의 인연" in end_text and "부부" in end_text, "")
        page.screenshot(path=args.out + "/07-cameo-summary-" + args.tag + ".png")

        # 7) 80세 완주로 마무리 — 전당 기록에 인연이 남는다
        page.evaluate(
            """() => { const s = Life.load(); s.age = 80; s.month = 12;
                      s.current = { eventId: 'cm_married_life', chosen: 0, result: 'x' };
                      Life.advance(s); Life.save(s); return s.ended; }""")
        page.reload(wait_until="networkidle")
        page.click("#resumeCard")
        page.wait_for_timeout(500)
        page.click("#endHall")
        page.wait_for_timeout(600)
        hall_text = page.inner_text("#hallBody")
        mine = page.evaluate("() => Life.hallMine().map(r => ({n: r.name, c: r.cameo && r.cameo.rel}))")
        ok("명예의 전당 기록에 인연", any(m["c"] == "married" for m in mine), json.dumps(mine, ensure_ascii=False))
        page.screenshot(path=args.out + "/08-hall-cameo-" + args.tag + ".png")

        ok("콘솔 오류 0건", len(errors) == 0, "; ".join(errors[:3]))
        browser.close()

    if httpd:
        httpd.shutdown()

    failed = [r for r in results if not r[0]]
    print("\n=== %d / %d 통과 ===" % (len(results) - len(failed), len(results)))
    print("=== 결과:", "FAIL" if failed else "PASS", "===")
    print("스크린샷:", args.out)
    return 0 if not failed else 1


if __name__ == "__main__":
    raise SystemExit(main())
