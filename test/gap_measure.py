"""하단 두 줄(보상형 광고 줄 ↔ 인생 일지/다음 진행 줄) 사이 여백 측정

사용:
  python3 test/gap_measure.py --serve --out ../downloads/life-sim-gap        # 로컬
  python3 test/gap_measure.py --url https://life-turn-sim.vercel.app/ --out ../downloads/life-sim-gap --tag live
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
  const box = (el) => { if (!el) return null; const b = el.getBoundingClientRect();
    return { top: +b.top.toFixed(2), bottom: +b.bottom.toFixed(2), left: +b.left.toFixed(2),
             right: +b.right.toFixed(2), w: +b.width.toFixed(2), h: +b.height.toFixed(2) }; };
  const bar = document.querySelector('#rewardBar');
  const bottom = document.querySelector('.bottombar');
  const zone = document.querySelector('#adZone');
  const undo = document.querySelector('#rewardUndo');
  const log = document.querySelector('#logBtn');
  const adv = document.querySelector('#advanceBtn');
  const rb = box(bar), bb = box(bottom), ub = box(undo), lb = box(log), ab = box(adv);
  const csBar = getComputedStyle(bar), csBottom = getComputedStyle(bottom);
  const vw = window.innerWidth, vh = window.innerHeight;
  const overflows = Array.from(document.querySelectorAll('#screen-play *')).filter(el => {
    const b = el.getBoundingClientRect();
    return b.width > 0 && (b.right > vw + 1 || b.left < -1);
  }).slice(0, 8).map(el => el.id || el.className || el.tagName);
  const overlaps = [];
  const pairs = [[undo, log], [undo, adv]];
  pairs.forEach(([a, b]) => {
    if (!a || !b) return;
    const A = a.getBoundingClientRect(), B = b.getBoundingClientRect();
    const ix = Math.min(A.right, B.right) - Math.max(A.left, B.left);
    const iy = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
    if (ix > 0.5 && iy > 0.5) overlaps.push([a.id, b.id, +ix.toFixed(1), +iy.toFixed(1)]);
  });
  return {
    viewport: { w: vw, h: vh },
    docScrollW: document.documentElement.scrollWidth,
    docScrollH: document.documentElement.scrollHeight,
    rewardBar: rb,
    bottombar: bb,
    adzoneHidden: !!zone && zone.hidden,
    adzone: box(zone),
    undoBtn: ub, logBtn: lb, advanceBtn: ab,
    // 두 줄 '실제 보이는 상자' 사이 간격 (되돌리기 버튼 아래끝 → 인생 일지 버튼 위끝)
    gapVisual: +(lb.top - ub.bottom).toFixed(2),
    // 컨테이너 사이 간격 (보상바 아래끝 → 하단바 위끝)
    gapContainers: +(bb.top - rb.bottom).toFixed(2),
    rewardBarPadding: [csBar.paddingTop, csBar.paddingRight, csBar.paddingBottom, csBar.paddingLeft],
    bottombarPadding: [csBottom.paddingTop, csBottom.paddingRight, csBottom.paddingBottom, csBottom.paddingLeft],
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


def play(page, url):
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(url, wait_until="domcontentloaded")
    page.wait_for_selector("#ageGrid .age-card", timeout=20000)
    page.evaluate("() => { try { localStorage.clear(); } catch (e) {} }")
    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector("#ageGrid .age-card", timeout=20000)
    page.click('.age-card[data-age="14"]')
    page.fill("#nameInput", "상훈")
    page.click("#startBtn")
    page.wait_for_selector(".event-card", timeout=20000)
    page.wait_for_timeout(500)
    return errors


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--serve", action="store_true")
    ap.add_argument("--url", default=None)
    ap.add_argument("--out", default=os.path.join(ROOT, "..", "downloads", "life-sim-gap"))
    ap.add_argument("--tag", default="local")
    ap.add_argument("--banner", default="hidden", choices=["hidden", "shown"])
    ap.add_argument("--size", default="390x844")
    args = ap.parse_args()

    os.makedirs(args.out, exist_ok=True)
    httpd = serve(ROOT, 8841) if args.serve else None
    url = args.url or "http://127.0.0.1:8841/index.html"

    result = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox", "--disable-dev-shm-usage"])
        vw, vh = (int(x) for x in args.size.split("x"))
        page = browser.new_page(viewport={"width": vw, "height": vh}, device_scale_factor=2,
                                is_mobile=True, has_touch=True)
        if args.banner == "hidden":
            page.add_init_script("try { localStorage.setItem('lifeTurnSim.bannerClosed','1'); } catch (e) {}")
        errors = play(page, url)
        page.wait_for_timeout(300)
        result = page.evaluate(MEASURE)
        result["errors"] = errors[:]
        result["url"] = url
        shot = os.path.join(args.out, f"{args.tag}-{args.size}-{args.banner}.png")
        page.screenshot(path=shot)
        result["shot"] = shot
        # 두 줄 영역만 잘라 저장 (시각 비교용)
        clip = page.evaluate("""() => {
          const a = document.querySelector('#rewardBar').getBoundingClientRect();
          const b = document.querySelector('.bottombar').getBoundingClientRect();
          return { x: 0, y: Math.max(0, a.top - 24), width: window.innerWidth, height: Math.min(window.innerHeight - Math.max(0, a.top - 24), b.bottom - a.top + 40) };
        }""")
        crop = os.path.join(args.out, f"{args.tag}-{args.size}-{args.banner}-crop.png")
        page.screenshot(path=crop, clip=clip)
        result["crop"] = crop
        page.close()
        browser.close()
    if httpd:
        httpd.shutdown()
    print(json.dumps(result, ensure_ascii=False, indent=1))
    with open(os.path.join(args.out, f"measure-{args.tag}-{args.size}-{args.banner}.json"), "w") as f:
        json.dump(result, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
