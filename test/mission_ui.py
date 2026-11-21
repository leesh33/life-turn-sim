"""전 연령대 미션 출발선 — 라이브/로컬 화면 검증 (390×844 등 모바일 뷰포트)

확인하는 것
  a) 시작 나이(14·20·35세 등)를 골라 인생을 시작하면 미션 카드가 30~45%에서 뜨는가
  b) 목표 문구가 능력치 + 숫자(달성/돌파)로 읽히고, 카드가 넘치지 않는가
  c) 선택을 몇 번 쌓으면 진행률이 움직이는가(100%로 시작하지 않는가)
  d) 콘솔·페이지 에러 0, 가로 넘침 0

사용:
  python3 test/mission_ui.py --url https://life-turn-sim.vercel.app/ --tag live
  python3 test/mission_ui.py --serve            # 로컬 정적 서버
"""
import argparse
import functools
import json
import os
import re
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from playwright.sync_api import sync_playwright

CHROME = "/workspace/.cache/ms-playwright/chromium-1134/chrome-linux/chrome"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = "/workspace/downloads/life-sim-mission"
ATK = "/workspace/.local/atklibs/usr/lib/x86_64-linux-gnu"
if os.path.isdir(ATK):
    os.environ["LD_LIBRARY_PATH"] = ATK + (":" + os.environ.get("LD_LIBRARY_PATH") if os.environ.get("LD_LIBRARY_PATH") else "")

results = []


def check(name, cond, extra=None):
    results.append(f"{'PASS' if cond else 'FAIL'} · {name}" + (f" — {extra}" if extra not in (None, "") else ""))
    return cond


MISSION = """() => {
  const card = document.getElementById('avMission');
  if (!card) return null;
  const bar = card.querySelector('.am-bar > i');
  const r = card.getBoundingClientRect();
  const vw = window.innerWidth;
  return {
    label: (card.querySelector('.am-chip') || {}).textContent || '',
    goal: (card.querySelector('.am-goal') || {}).textContent || '',
    pctText: (card.querySelector('.am-pct') || {}).textContent || '',
    aria: card.getAttribute('aria-label') || '',
    barWidth: bar ? bar.style.width : '',
    done: card.getAttribute('data-done'),
    box: { left: +r.left.toFixed(1), right: +r.right.toFixed(1), top: +r.top.toFixed(1), h: +r.height.toFixed(1) },
    vw: vw,
    scrollW: document.documentElement.scrollWidth,
    age: (document.getElementById('ageLabel') || {}).textContent || '',
    goalEl: (card.querySelector('.am-goal') || {}).getBoundingClientRect ? (() => {
      const g = card.querySelector('.am-goal').getBoundingClientRect();
      return { left: +g.left.toFixed(1), right: +g.right.toFixed(1) };
    })() : null
  };
}"""

MAXW = """() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)"""


def start_game(pg, age):
    pg.click("#screen-start .age-card[data-age='%d']" % age)
    pg.click("#startBtn")
    pg.wait_for_selector("#avatarCard", timeout=15000)
    pg.wait_for_timeout(500)


def play_turns(pg, n):
    for _ in range(n):
        try:
            pg.click("#choices .choice:not([disabled])", timeout=4000)
        except Exception:
            return False
        pg.wait_for_timeout(250)
        try:
            pg.click("#advanceBtn", timeout=4000)
        except Exception:
            return False
        pg.wait_for_timeout(350)
    return True


def run_sizes(pg, sizes, url, tag, ages, turns, out):
    os.makedirs(out, exist_ok=True)
    report = {}
    for w, h in sizes:
        pg.set_viewport_size({"width": w, "height": h})
        for age in ages:
            errors = []
            pg.on("console", lambda m: errors.append(m.text) if m.type == "error" and "Failed to load resource" not in m.text else None)
            pg.on("pageerror", lambda e: errors.append(str(e)))
            pg.goto(url, wait_until="load")
            pg.wait_for_timeout(600)
            start_game(pg, age)
            m0 = pg.evaluate(MISSION)
            key = f"{age}세·{w}x{h}"
            report[key] = {"start": m0}
            if not m0:
                check(f"{key} 미션 카드", False, "카드 없음")
                continue
            pct = int(re.sub(r"[^0-9]", "", m0["pctText"]) or -1)
            check(f"{key} 미션 {pct}% (30~45%)", 30 <= pct <= 45, f"{m0['label']} · {m0['goal']}")
            check(f"{key} 목표 문구", bool(re.match(r"^(호감도|역량|매력|체력|멘탈) \d+ (달성|돌파)$", m0["goal"].strip())), m0["goal"])
            check(f"{key} 70% 미만에서 출발", pct < 70, f"{pct}%")
            check(f"{key} 가로 넘침 없음", pg.evaluate(MAXW) <= w + 1, f"{pg.evaluate(MAXW)} ≤ {w}")
            check(f"{key} 목표 줄 카드 안에 들어옴", m0["box"]["right"] <= w + 0.6 and (m0["goalEl"] or {}).get("right", 0) <= w + 0.6,
                  f'카드 {m0["box"]["right"]} / 목표 {m0.get("goalEl", {}).get("right")}')
            pg.screenshot(path=os.path.join(out, f"{tag}-{age}-{w}x{h}.png"))
            # 몇 턴 쌓아 진행률이 움직이는지
            moved = play_turns(pg, turns)
            m1 = pg.evaluate(MISSION)
            report[key]["after"] = m1
            if moved and m1:
                pct1 = int(re.sub(r"[^0-9]", "", m1["pctText"]) or -1)
                check(f"{key} 선택을 쌓으면 진행률이 움직임", m1["done"] == "0" or pct1 == 100,
                      f"{pct}% → {m1['pctText']} ({m1['goal']})")
                pg.screenshot(path=os.path.join(out, f"{tag}-{age}-{w}x{h}-after.png"))
            check(f"{key} 콘솔 에러 없음", len(errors) == 0, " / ".join(errors[:3]))
    return report


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url")
    ap.add_argument("--serve", action="store_true")
    ap.add_argument("--tag", default="local")
    ap.add_argument("--sizes", default="390x844")
    ap.add_argument("--ages", default="14,20,35")
    ap.add_argument("--turns", type=int, default=6)
    ap.add_argument("--dsf", type=int, default=2)
    ap.add_argument("--out", default=OUT)
    args = ap.parse_args()

    sizes = [tuple(int(x) for x in s.lower().split("x")) for s in args.sizes.split(",")]
    ages = [int(a) for a in args.ages.split(",")]
    url = args.url
    httpd = None
    if args.serve or not url:
        handler = functools.partial(SimpleHTTPRequestHandler, directory=ROOT)
        httpd = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        threading.Thread(target=httpd.serve_forever, daemon=True).start()
        url = f"http://127.0.0.1:{httpd.server_port}/index.html"

    with sync_playwright() as p:
        br = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox", "--disable-dev-shm-usage"])
        ctx = br.new_context(viewport={"width": sizes[0][0], "height": sizes[0][1]}, device_scale_factor=args.dsf,
                             is_mobile=True, has_touch=True, locale="ko-KR", timezone_id="Asia/Seoul")
        pg = ctx.new_page()
        report = run_sizes(pg, sizes, url, args.tag, ages, args.turns, args.out)
        ctx.close()
        br.close()
    if httpd:
        httpd.shutdown()

    os.makedirs(args.out, exist_ok=True)
    with open(os.path.join(args.out, f"{args.tag}-report.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=1)
    print("\n".join(results))
    fails = [r for r in results if r.startswith("FAIL")]
    print(f"\n미션 화면 검사: {len(results)} 항목 · 실패 {len(fails)} 건 — {url}")
    raise SystemExit(1 if fails else 0)


if __name__ == "__main__":
    main()
