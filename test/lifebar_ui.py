"""인생 진행도 막대(🍼 유아기 ─── 1 / 80세)가 하단 도크 바로 위에 붙었는지 측정

사용:
  python3 test/lifebar_ui.py --serve --out ../downloads/life-sim-lifebar            # 로컬
  python3 test/lifebar_ui.py --url https://life-turn-sim.vercel.app/ \
      --out ../downloads/life-sim-lifebar --tag live                                # 라이브

측정값
  - lifebar / adzone / rewardBar / bottombar : 각 상자의 top·bottom·height
  - barToDock      : 진행도 줄 아래끝 → 도크(인생 일지 버튼) 위끝 간격(px)
  - barOverStage   : 진행도 줄이 스테이지(이벤트 카드 영역) 안에 있는지 (False 여야 함)
  - overlaps        : 하단 요소끼리 겹치는지
  - horizontalOverflow : 화면 밖으로 나간 요소
"""
import argparse
import functools
import json
import os
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from playwright.sync_api import sync_playwright

CHROME = "/workspace/.cache/ms-playwright/chromium-1134/chrome-linux/chrome"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ATK = "/workspace/.local/atklibs/usr/lib/x86_64-linux-gnu"
if os.path.isdir(ATK):
    os.environ["LD_LIBRARY_PATH"] = ATK + (":" + os.environ["LD_LIBRARY_PATH"] if os.environ.get("LD_LIBRARY_PATH") else "")

MEASURE = """() => {
  const q = (s) => document.querySelector(s);
  const box = (el) => { if (!el) return null; const b = el.getBoundingClientRect();
    return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), h: +b.height.toFixed(1),
             left: +b.left.toFixed(1), right: +b.right.toFixed(1) }; };
  const bar = q('#lifeBar'), zone = q('#adZone'), rw = q('#rewardBar'), bottom = q('.bottombar');
  const log = q('#logBtn'), adv = q('#advanceBtn'), stage = q('#stage'), note = q('.stage-note');
  const bb = box(bar), zb = box(zone), rb = box(rw), botb = box(bottom), lb = box(log);
  const overlaps = [];
  [[bar, rw], [bar, zone], [bar, bottom], [zone, rw], [zone, bottom]].forEach(([a, b]) => {
    if (!a || !b || a.hidden || b.hidden) return;
    const A = a.getBoundingClientRect(), B = b.getBoundingClientRect();
    const ix = Math.min(A.right, B.right) - Math.max(A.left, B.left);
    const iy = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
    if (ix > 0.5 && iy > 0.5) overlaps.push([a.id || a.className, b.id || b.className,
      +ix.toFixed(1), +iy.toFixed(1)]);
  });
  const vw = window.innerWidth, vh = window.innerHeight;
  const overflows = Array.from(document.querySelectorAll('#screen-play *')).filter(el => {
    const b = el.getBoundingClientRect();
    return b.width > 0 && (b.right > vw + 1 || b.left < -1 || b.bottom > vh + 1);
  }).slice(0, 8).map(el => el.id || el.className || el.tagName);
  return {
    viewport: { w: vw, h: vh },
    lifeBarText: note ? note.textContent.replace(/\\s+/g, ' ').trim() : null,
    stage: box(stage),
    lifebar: bb,
    adzoneHidden: !!(zone && zone.hidden),
    adzone: zb,
    rewardBar: rb,
    bottombar: botb,
    logBtn: lb,
    advanceBtn: box(adv),
    // 진행도 막대가 스테이지 스크롤 영역 안에 들어 있는가? (false 여야 한다)
    barInStage: !!(stage && bar && stage.contains(bar)),
    // 아래끝 → 도크 버튼 위끝 간격
    barToDock: bb && lb ? +(lb.top - bb.bottom).toFixed(1) : null,
    doorToDock: botb ? +(botb.top - (bb ? bb.bottom : 0)).toFixed(1) : null,
    stageToBar: bb && rb ? +(bb.top - (rb ? rb.bottom : 0)).toFixed(1) : null,
    horizontalOverflow: overflows,
    overlaps
  };
}"""


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args, **kwargs):
        pass


def serve(directory, port):
    handler = functools.partial(Quiet, directory=directory)
    httpd = ThreadingHTTPServer(("127.0.0.1", port), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def play(page, url, age):
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(url, wait_until="domcontentloaded")
    page.wait_for_selector("#ageGrid .age-card", timeout=20000)
    page.evaluate("() => { try { localStorage.clear(); } catch (e) {} }")
    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector("#ageGrid .age-card", timeout=20000)
    page.click(f'.age-card[data-age="{age}"]')
    page.fill("#nameInput", "상훈")
    page.click("#startBtn")
    page.wait_for_selector(".event-card", timeout=20000)
    page.wait_for_timeout(500)
    return errors


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--serve", action="store_true")
    ap.add_argument("--url", default=None)
    ap.add_argument("--out", default=os.path.join(ROOT, "..", "downloads", "life-sim-lifebar"))
    ap.add_argument("--tag", default="local")
    ap.add_argument("--age", type=int, default=1)
    ap.add_argument("--sizes", default="390x844")
    args = ap.parse_args()

    os.makedirs(args.out, exist_ok=True)
    httpd = serve(ROOT, 8843) if args.serve else None
    url = args.url or "http://127.0.0.1:8843/index.html"

    out = []
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox", "--disable-dev-shm-usage"])
        for size in args.sizes.split(","):
            vw, vh = (int(x) for x in size.split("x"))
            for banner in ("hidden", "shown"):
                page = browser.new_page(viewport={"width": vw, "height": vh}, device_scale_factor=2,
                                        is_mobile=True, has_touch=True)
                if banner == "hidden":
                    page.add_init_script("try { localStorage.setItem('lifeTurnSim.bannerClosed','1'); } catch (e) {}")
                else:
                    page.add_init_script("try { localStorage.removeItem('lifeTurnSim.bannerClosed'); } catch (e) {}")
                errors = play(page, url, args.age)
                page.wait_for_timeout(250)
                res = page.evaluate(MEASURE)
                res["errors"] = errors[:]
                res["url"] = url
                res["banner"] = banner
                res["size"] = size
                shot = os.path.join(args.out, f"{args.tag}-{size}-{banner}.png")
                page.screenshot(path=shot)
                res["shot"] = shot
                a = page.evaluate("""() => {
                  const s = document.querySelector('#rewardBar').getBoundingClientRect();
                  const b = document.querySelector('.bottombar').getBoundingClientRect();
                  return { x: 0, y: Math.max(0, s.top - 16), width: window.innerWidth,
                           height: Math.min(window.innerHeight - Math.max(0, s.top - 16), b.bottom - s.top + 24) };
                }""")
                crop = os.path.join(args.out, f"{args.tag}-{size}-{banner}-dock.png")
                page.screenshot(path=crop, clip=a)
                res["crop"] = crop
                out.append(res)
                page.close()
        browser.close()
    if httpd:
        httpd.shutdown()
    print(json.dumps(out, ensure_ascii=False, indent=1))
    with open(os.path.join(args.out, f"measure-{args.tag}.json"), "w") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
