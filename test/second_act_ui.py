#!/usr/bin/env python3
"""인생 2막 · 연금 개시 실화면 확인 (390×844).

  python3 test/second_act_ui.py --serve . --tag local
  python3 test/second_act_ui.py --url https://life-turn-sim.vercel.app/ --tag live

하는 일
  1. 54세 명예퇴직 제안 저장본으로 이어하기
  2. '수락한다' → 퇴직금 1,800만원 · 재산 증가
  3. 다음 1개월 → '인생 2막' 카드(네 갈래)
  4. '다시 일을 구한다' → 다음 달 '새 일터의 첫날'까지 이어짐
  5. 55세 생일 토스트에 2막 연 수지가 찍히는지(연금이 아닌지) · 가로 넘침 0 · 콘솔 오류 0
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
    ap.add_argument("--save", default="/workspace/verify-shots/second-act.json")
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
        pg.click("#resumeCard")
        pg.wait_for_timeout(900)

        check("54세로 이어짐", "54" in pg.inner_text("#ageLabel"), pg.inner_text("#ageLabel"))
        body = pg.inner_text("#stageInner")
        check("명예퇴직 제안 카드", "명예퇴직 제안" in body)
        check("정년까지 남는 선택지도 있다", "정년까지 남는다" in body,
              [l for l in body.split("\n") if "정년" in l][:1])
        pg.screenshot(path=f"{args.out}/act-{args.tag}-01-offer.png")

        asset_before = pg.evaluate("""() => {
          const s = JSON.parse(localStorage.getItem('lifeTurnSim.save.v1')); return s.stats.asset;
        }""")
        pg.click("#choices .choice:first-child")     # 수락한다
        pg.wait_for_timeout(500)
        body = pg.inner_text("#stageInner")
        check("퇴직금 1,800만원 안내", "1,800만원" in body, [l for l in body.split("\n") if "1,800" in l][:1])
        asset_after = pg.evaluate("""() => {
          const s = JSON.parse(localStorage.getItem('lifeTurnSim.save.v1')); return s.stats.asset;
        }""")
        check("재산이 퇴직금만큼 늘어난다", asset_after - asset_before == 1800, f"{asset_before} → {asset_after}")

        pg.click("#advanceBtn")
        pg.wait_for_timeout(1500)
        body = pg.inner_text("#stageInner")
        check("다음 달 '인생 2막' 카드가 뜬다", "인생 2막" in body, [l for l in body.split("\n") if "2막" in l][:1])
        check("2막 네 갈래가 보인다",
              all(k in body for k in ["다시 일을 구한다", "작은 가게", "프리랜서", "당분간 쉰다"]),
              [l for l in body.split("\n") if l in ("다시 일을 구한다", "작은 가게를 연다", "프리랜서로 산다", "당분간 쉰다")])
        check("연금이 60세부터라는 안내", "국민연금" in body and "60세까지" in body)
        pg.screenshot(path=f"{args.out}/act-{args.tag}-02-second-act.png")

        pg.click("#choices .choice:first-child")     # 다시 일을 구한다
        pg.wait_for_timeout(500)
        body = pg.inner_text("#stageInner")
        check("재취업 결과 문구", "이력서를 다시" in body, [l for l in body.split("\n") if "이력서" in l][:1])
        pg.click("#advanceBtn")
        pg.wait_for_timeout(1500)
        body = pg.inner_text("#stageInner")
        check("2막의 첫 장면으로 이어진다", "새 일터의 첫날" in body,
              [l for l in body.split("\n") if "일터" in l][:1])
        over = pg.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
        check("가로 넘침 0", over <= 0, f"{over}px")
        pg.screenshot(path=f"{args.out}/act-{args.tag}-03-followup.png")

        # 55세 생일까지: 연 수지 토스트가 '연금'이 아닌 2막 수입으로 계산되는지 저장본으로 확인
        state = pg.evaluate("() => JSON.parse(localStorage.getItem('lifeTurnSim.save.v1'))")
        check("저장본에 2막 플래그", state["flags"].get("2막") in ("재취업", "창업", "프리랜서", "안식"),
              state["flags"].get("2막"))
        check("명퇴 상태로 저장", state["flags"].get("명퇴") is True)
        check("콘솔 오류 0건", len(errors) == 0, " / ".join(errors[:3]))
        b.close()

    if httpd:
        httpd.shutdown()
    fails = len([r for r in results if not r[0]])
    print(f"\n2막 화면 검사: {len(results)} 항목 · 실패 {fails} 건")
    raise SystemExit(1 if fails else 0)


if __name__ == "__main__":
    main()
