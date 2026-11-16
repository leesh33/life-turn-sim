"""시작 화면 한 화면 맞춤 검증 — 여러 뷰포트에서 스크롤 여부 측정 + 스크린샷

사용: python3 test/start_fit.py [--url URL] [--out DIR] [--prefix P] [--sizes 390x664,390x844]

측정값
  - docScroll / docClient : 문서 전체 scrollHeight / innerHeight
  - panel                 : .start-scroll 의 scrollHeight / clientHeight (스크롤 필요 여부)
  - bottomGap             : 시작 버튼 하단과 뷰포트 하단 사이 여백(px)
  - cardsVisible          : 나이 카드 7개가 모두 뷰포트 안에 완전히 보이는지
"""
import argparse
import functools
import json
import os
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from playwright.sync_api import sync_playwright

CHROME = "/workspace/.cache/ms-playwright/chromium-1134/chrome-linux/chrome"

def serve(directory, port):
    """같은 프로세스에서 정적 서버를 띄운다(별도 데몬 없이)."""
    handler = functools.partial(SimpleHTTPRequestHandler, directory=directory)
    handler.log_message = lambda *a, **k: None
    httpd = ThreadingHTTPServer(("127.0.0.1", port), handler)
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    return httpd

MEASURE = """() => {
  const q = (s) => document.querySelector(s);
  const scroll = q('.start-scroll');
  const btn = q('#startBtn');
  const cards = Array.from(document.querySelectorAll('.age-card'));
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const btnRect = btn.getBoundingClientRect();
  const hidden = cards.filter(c => {
    const r = c.getBoundingClientRect();
    return r.top < 0 || r.bottom > vh || r.left < 0 || r.right > vw || r.height === 0;
  });
  const headings = ['.brand-mark', '.brand h1', '.brand-sub', '.section-label', '#ageGrid', '.name-row', '#startBtn', '.fine']
    .map(sel => {
      const el = q(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { sel, top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) };
    }).filter(Boolean);
  const gridStyle = getComputedStyle(q('#ageGrid'));
  const panelRect = scroll.getBoundingClientRect();
  const form = q('.start-form');
  const formRect = form.getBoundingClientRect();
  return {
    viewport: { w: vw, h: vh },
    docScroll: document.documentElement.scrollHeight,
    docClient: document.documentElement.clientHeight,
    panelScroll: scroll.scrollHeight,
    panelClient: scroll.clientHeight,
    panelOverflow: scroll.scrollHeight - scroll.clientHeight,
    bottomGap: Math.round(vh - btnRect.bottom),
    btnBottom: Math.round(btnRect.bottom),
    cardsCount: cards.length,
    cardsClipped: hidden.map(c => c.dataset.age),
    cardHeights: cards.map(c => Math.round(c.getBoundingClientRect().height)),
    gridRowGap: gridStyle.rowGap,
    blocks: headings,
    contentHeight: Math.round(scroll.scrollHeight),
    voidGap: Math.round(panelRect.bottom - formRect.bottom),
    scrollTop: scroll.scrollTop
  };
}"""


def run(url, outdir, prefix, sizes, serve_dir=None, port=8821, resume=False):
    os.makedirs(outdir, exist_ok=True)
    httpd = None
    if serve_dir:
        httpd = serve(serve_dir, port)
        url = f"http://127.0.0.1:{port}/"
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        for size in sizes:
            w, h = (int(x) for x in size.lower().split("x"))
            page = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=2,
                                    is_mobile=True, has_touch=True)
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(url, wait_until="networkidle")
            page.evaluate("localStorage.clear()")
            if resume:
                page.evaluate("""() => {
                    const s = window.Life.newGame({name: '상훈', gender: '남', startAge: 25});
                    window.Life.save(s);
                }""")
            page.reload(wait_until="networkidle")
            page.wait_for_timeout(500)
            m = page.evaluate(MEASURE)
            m["errors"] = errors
            results.append(m)
            path = os.path.join(outdir, f"{prefix}start-{w}x{h}.png")
            page.screenshot(path=path)
            m["shot"] = path
            print(json.dumps(m, ensure_ascii=False, indent=2))
            print(f"[SUMMARY] {w}x{h}: panel {m['panelScroll']}/{m['panelClient']} (overflow {m['panelOverflow']}), "
                  f"btnBottom {m['btnBottom']} / vh {h}, slack {m['panelClient'] - m['panelScroll']}px, voidGap {m['voidGap']}px, "
                  f"clipped {m['cardsClipped'] or 'none'}")
            page.close()
        browser.close()
    if httpd:
        httpd.shutdown()
    return results


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://127.0.0.1:8821/")
    ap.add_argument("--out", default="/workspace/browser/life-sim/start-fit")
    ap.add_argument("--prefix", default="")
    ap.add_argument("--sizes", default="390x664,390x844")
    ap.add_argument("--serve", default=None, help="이 디렉터리를 프로세스 내부 서버로 서빙")
    ap.add_argument("--port", type=int, default=8821)
    ap.add_argument("--resume", action="store_true", help="저장된 인생(이어하기 카드)이 있는 상태로 측정")
    a = ap.parse_args()
    run(a.url, a.out, a.prefix, a.sizes.split(","), a.serve, a.port, a.resume)
