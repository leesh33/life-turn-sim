"""플레이 화면 HUD/카드 높이 측정 (로컬 정적 서버) — 390×664 / 390×844

사용: python3 test/measure.py [--sizes 390x664,390x844] [--out DIR]
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
# 이 샌드박스에는 libatk 계열이 없어 직접 받아 둔 라이브러리를 붙인다 (chromium 실행용)
ATK = "/workspace/.local/atklibs/usr/lib/x86_64-linux-gnu"
if os.path.isdir(ATK):
    os.environ["LD_LIBRARY_PATH"] = ATK + (":" + os.environ["LD_LIBRARY_PATH"] if os.environ.get("LD_LIBRARY_PATH") else "")

MEASURE = """() => {
  const q = (s) => document.querySelector(s);
  const r = (s) => { const el = q(s); if (!el) return null; const b = el.getBoundingClientRect();
    return { top: Math.round(b.top), bottom: Math.round(b.bottom), h: Math.round(b.height), w: Math.round(b.width) }; };
  const stats = Array.from(document.querySelectorAll('.stat'));
  const rows = {};
  stats.forEach(el => {
    const b = el.getBoundingClientRect();
    const key = Math.round(b.top);
    rows[key] = (rows[key] || 0) + 1;
  });
  const stage = q('#stage');
  const inner = q('#stageInner');
  const card = q('.event-card');
  const choices = Array.from(document.querySelectorAll('.choice'));
  const lastChoice = choices[choices.length - 1];
  const vh = window.innerHeight, vw = window.innerWidth;
  const overflows = Array.from(document.querySelectorAll('body *')).filter(el => {
    const b = el.getBoundingClientRect();
    return b.right > vw + 1 || b.left < -1;
  }).slice(0, 6).map(el => el.className || el.tagName);
  return {
    viewport: { w: vw, h: vh },
    docScrollW: document.documentElement.scrollWidth,
    docScrollH: document.documentElement.scrollHeight,
    statusbar: r('.statusbar'),
    statCount: stats.length,
    statRows: rows,
    statCard: r('.stat'),
    stage: r('#stage'),
    stageScroll: stage ? { sh: stage.scrollHeight, ch: stage.clientHeight } : null,
    inner: r('#stageInner'),
    card: r('.event-card'),
    choiceCount: choices.length,
    lastChoiceBottom: lastChoice ? Math.round(lastChoice.getBoundingClientRect().bottom) : null,
    advanceBtn: r('#advanceBtn'),
    paidbar: r('#rewardBar'),
    adzone: r('#adZone'),
    horizontalOverflow: overflows
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sizes", default="390x664,390x844")
    ap.add_argument("--out", default=os.path.join(ROOT, "..", "verify-shots", "hud"))
    ap.add_argument("--shot", default="1")
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    sizes = [tuple(int(x) for x in s.split("x")) for s in args.sizes.split(",")]
    httpd = serve(ROOT, 8833)
    url = "http://127.0.0.1:8833/index.html"
    out = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox", "--disable-dev-shm-usage"])
        for (w, h) in sizes:
            page = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=2,
                                    is_mobile=True, has_touch=True)
            errors = []
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(url, wait_until="domcontentloaded")
            page.wait_for_selector("#ageGrid .age-card")
            page.evaluate("() => { localStorage.clear(); }")
            page.reload(wait_until="domcontentloaded")
            page.wait_for_selector("#ageGrid .age-card")
            # 14세 시작으로 진행 (카드·선택지가 가장 긴 편)
            page.click('.age-card[data-age="14"]')
            page.fill("#nameInput", "상훈")
            page.click("#startBtn")
            page.wait_for_selector(".event-card")
            page.wait_for_timeout(350)
            m = page.evaluate(MEASURE)
            m["errors"] = errors[:]
            out[f"{w}x{h}"] = m
            if args.shot == "1":
                path = os.path.join(args.out, f"play-{w}x{h}.png")
                page.screenshot(path=path)
                m["shot"] = path
            page.close()
        browser.close()
    httpd.shutdown()
    print(json.dumps(out, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
