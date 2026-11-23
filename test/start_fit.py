"""시작 화면 한 화면 맞춤 검증 — 여러 뷰포트에서 스크롤 여부 측정 + 스크린샷

사용: python3 test/start_fit.py [--url URL] [--out DIR] [--prefix P] [--sizes 390x664,390x844]
                              [--insets T,B] [--native] [--resume] [--legacy]

  --insets 47,34  안전영역(노치·홈 인디케이터)을 흉내 낸다. **iOS 앱(Expo WebView)은
                  화면을 꽉 채우므로 뷰포트는 844·852 인데 실제로 쓸 수 있는 높이는
                  안전영역만큼 줄어든다** — 이 값을 넣지 않으면 앱 화면을 재현하지 못한다.
  --native        앱이 심는 window.__LIFETURN_NATIVE__ 를 넣어 Apple 로그인 칩까지 그린다.
  --legacy        가문 이어받기 줄까지 띄운 최악 상태(전당에 내 기록이 있을 때).

측정값
  - docScroll / docClient : 문서 전체 scrollHeight / innerHeight
  - panel                 : .start-scroll 의 scrollHeight / clientHeight (스크롤 필요 여부)
  - bottomGap             : 시작 버튼 하단과 뷰포트 하단 사이 여백(px)
  - cardsVisible          : 나이 카드 7개가 모두 뷰포트 안에 완전히 보이는지
  - clipped               : 필수 요소(이름·성별 포함)가 스크롤 영역의 보이는 끝을 넘어 잘렸는지
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

MEASURE = """(required) => {
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
  const scrollFloor = scroll.getBoundingClientRect().bottom;
  const bad = [];
  for (const sel of required) {
    const el = q(sel);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (el.closest('.start-scroll')) {
      if (r.bottom > scrollFloor + 0.5 || r.top < 0) bad.push([sel, Math.round(r.top), Math.round(r.bottom)]);
    } else if (r.bottom > vh + 0.5) {
      bad.push([sel, Math.round(r.top), Math.round(r.bottom), 'below-viewport']);
    }
  }
  const legalEl = q('.legal-links');
  const legalBottom = legalEl ? Math.round(legalEl.getBoundingClientRect().bottom) : null;
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
    scrollTop: scroll.scrollTop,
    scrollFloor: Math.round(scrollFloor),
    requiredClipped: bad,
    slack: legalBottom == null ? null : Math.round(scrollFloor - legalBottom),
    hasResume: q('#screen-start').classList.contains('has-resume'),
    hasLegacy: q('#screen-start').classList.contains('has-legacy')
  };
}"""

REQUIRED = [
  '.brand-top', '.brand-mark', '.brand h1', '.brand-sub', '.section-label', '#ageGrid',
  '.scenario-block', '.legacy-row', '.name-row', '#nameInput', '#genderChips',
  '#startBtn', '.sync-row', '.legal-links'
]


def run(url, outdir, prefix, sizes, serve_dir=None, port=8821, resume=False,
        insets=(0, 0), native=False, legacy=False):
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
            if native:
                page.add_init_script(
                    "window.__LIFETURN_NATIVE__ = {shell:'ios', platform:'ios', appleAuth:true,"
                    " appVersion:'1.0.0', webBase:'https://life-turn-sim.vercel.app/'};")
            if insets[0] or insets[1]:
                page.add_init_script(
                    "document.addEventListener('DOMContentLoaded',()=>{"
                    "const s=document.createElement('style');"
                    f"s.textContent=':root{{--safe-t:{insets[0]}px;--safe-b:{insets[1]}px}}';"
                    "document.head.appendChild(s);});")
            page.goto(url, wait_until="networkidle")
            page.evaluate("localStorage.clear()")
            if resume:
                page.evaluate("""() => {
                    const s = window.Life.newGame({name: '상훈', gender: '남', startAge: 25});
                    window.Life.save(s);
                }""")
            page.reload(wait_until="networkidle")
            page.wait_for_timeout(500)
            if legacy:
                page.evaluate("""() => {
                    const r = document.querySelector('#legacyRow');
                    if (r) r.hidden = false;
                    document.querySelector('#screen-start').classList.add('has-legacy');
                }""")
                page.wait_for_timeout(150)
            m = page.evaluate(MEASURE, REQUIRED)
            m["errors"] = errors
            results.append(m)
            tag = f"{w}x{h}" + (f"-safe{insets[0]}+{insets[1]}" if any(insets) else "") + ("-app" if native else "")
            path = os.path.join(outdir, f"{prefix}start-{tag}.png")
            page.screenshot(path=path)
            m["shot"] = path
            print(json.dumps(m, ensure_ascii=False, indent=2))
            print(f"[SUMMARY] {w}x{h} inset {insets[0]}/{insets[1]}: panel {m['panelScroll']}/{m['panelClient']} "
                  f"(overflow {m['panelOverflow']}), btnBottom {m['btnBottom']} / vh {h}, "
                  f"slack {m['panelClient'] - m['panelScroll']}px, bottomSlack {m['slack']}px, "
                  f"wellCut {m['requiredClipped'] or 'none'}, clipped {m['cardsClipped'] or 'none'}")
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
    ap.add_argument("--legacy", action="store_true", help="가문 이어받기 줄까지 뜬 상태로 측정")
    ap.add_argument("--insets", default="0,0", help="안전영역 흉내 (예: 47,34 · 59,34)")
    ap.add_argument("--native", action="store_true", help="앱(WebView) 환경 — Apple 로그인 칩까지")
    a = ap.parse_args()
    run(a.url, a.out, a.prefix, a.sizes.split(","), a.serve, a.port, a.resume,
        tuple(int(x) for x in a.insets.split(",")), a.native, a.legacy)
