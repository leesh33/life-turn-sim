#!/usr/bin/env python3
"""🏆 명예의 전당 상단 겹침 — 화면 검증 (로컬 · 라이브 공용)

  python3 test/hall_sync_ui.py --serve .            # 로컬
  python3 test/hall_sync_ui.py --url https://life-turn-sim.vercel.app/ --tag live

하는 일 (390×844 · 390×664)
  1. 전당 화면의 로그인 안내 줄(#hallSyncRow)이 자기 높이를 지킨다 —
     그려진 내용의 아래끝이 `내 전당 | 전체 랭킹` 탭(#hallViews) 위를 넘지 않는다(겹침 0px)
  2. 로그인하지 않은 줄 · 로그인한 줄(칩 + 이름·이메일 + 로그아웃) 둘 다
  3. 화면이 짧아도(390×664) 줄은 그대로이고, 남는 세로 공간은 전당 목록(.hall-pane)이 스크롤로 가져간다
  4. 가로 넘침 0 · 콘솔 오류 0
"""
import argparse
import functools
import json
import os
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from playwright.sync_api import sync_playwright

CHROME = "/workspace/.cache/ms-playwright/chromium-1134/chrome-linux/chrome"
SUPA = "https://zdcdvjlssncsawpqsjwe.supabase.co"

SESSION = (
    "(() => { try {"
    " localStorage.setItem('lifeTurnSim.auth.session.v1', JSON.stringify({"
    "   access_token: 'fake-token', refresh_token: 'fake-refresh',"
    "   expires_at: Date.now() + 3600 * 1000,"
    "   user: { id: 'u-test', email: 'andy.lee@example.com', user_metadata: { full_name: '이상훈' } } }));"
    " localStorage.setItem('lifeTurnSim.hall.v1', JSON.stringify({ v: 1, seeded: true, records: ["
    "   { id: 'local-1', mine: true, ts: 6, score: 66, name: '폰 기록', key: 'life80',"
    "     stageLabel: '80세 완주', title: '폰 기록', grade: 'B',"
    "     stats: { hp: 50, mental: 50, charm: 50, asset: 0, social: 50, intel: 50, luck: 50 } }] }));"
    " } catch (e) {} })();"
)

# 안내 줄이 탭 위로 넘어 그려지는지 — 줄의 박스가 아니라 '실제로 그려진 내용'의 아래끝을 본다.
MEASURE = """() => {
  const row = document.querySelector('#hallSyncRow');
  const views = document.querySelector('#hallViews');
  const pane = document.querySelector('#hallMineView');
  if (!row || !views) return null;
  const box = (el) => { const b = el.getBoundingClientRect();
    return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), height: +b.height.toFixed(1) }; };
  let painted = row.getBoundingClientRect().bottom;
  for (const el of row.querySelectorAll('*')) {
    const b = el.getBoundingClientRect();
    if (b.bottom > painted) painted = b.bottom;
  }
  return {
    row: box(row), views: box(views),
    rowShrunk: row.scrollHeight - row.clientHeight,
    overlap: Math.max(0, painted - views.getBoundingClientRect().top),
    paneScroll: pane ? pane.scrollHeight - pane.clientHeight : 0,
    screenOverflow: (() => { const s = document.querySelector('#screen-hall');
      return s ? s.scrollHeight - s.clientHeight : 0; })(),
    paneBottom: pane ? +pane.getBoundingClientRect().bottom.toFixed(1) : 0,
    vh: window.innerHeight,
    scrollW: document.documentElement.scrollWidth,
    text: row.innerText.replace(/\\n/g, ' ')
  };
}"""


def run(url, outdir, tag):
    os.makedirs(outdir, exist_ok=True)
    results = []

    def ok(name, cond, extra=""):
        results.append(bool(cond))
        print(("PASS" if cond else "FAIL") + " · " + name + ((" — " + str(extra)) if extra else ""))

    def open_hall(p, size, signed_in=False):
        w, h = size
        browser = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox", "--disable-dev-shm-usage"])
        ctx = browser.new_context(viewport={"width": w, "height": h}, device_scale_factor=1,
                                  is_mobile=True, has_touch=True)
        if signed_in:
            ctx.add_init_script(SESSION)
        page = ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        if signed_in:
            # 로그인 상태는 서버를 부르므로, 시험에서는 빈 상태로 응답한다(바깥 요청 없음)
            page.route(SUPA + "/**", lambda route, req: route.fulfill(
                status=200, headers={"access-control-allow-origin": "*",
                                     "access-control-allow-headers": "*",
                                     "content-type": "application/json"},
                body=json.dumps([{"data": {"v": 1, "at": 0}, "revised_at": 0}])))
        page.goto(url, wait_until="load")
        page.wait_for_timeout(700 if signed_in else 300)
        page.click("#hallBtnStart")
        page.wait_for_timeout(500)
        return browser, page, errors

    with sync_playwright() as p:
        for size in [(390, 844), (390, 664)]:
            for signed_in in (False, True):
                label = "%d×%d · %s" % (size[0], size[1], "로그인" if signed_in else "로그인 전")
                browser, page, errors = open_hall(p, size, signed_in)
                m = page.evaluate(MEASURE)
                ok(f"{label} · 전당 상태 줄이 있다", m is not None)
                if not m:
                    browser.close()
                    continue
                ok(f"{label} · 줄이 자기 높이를 지킨다", m["rowShrunk"] <= 0,
                   f"내용 {m['row']['height']}px · 잘림 {m['rowShrunk']}px · {m['text']}")
                ok(f"{label} · 탭과 겹치지 않는다", m["overlap"] <= 0.5,
                   f"겹침 {m['overlap']}px · 줄 하단 {m['row']['bottom']} / 탭 상단 {m['views']['top']}")
                ok(f"{label} · 탭 높이 41px 안팎", 34 <= m["views"]["height"] <= 48, f"{m['views']['height']}px")
                ok(f"{label} · 전당 화면이 넘치지 않는다", m["screenOverflow"] <= 0 and m["paneBottom"] <= m["vh"] + 0.5,
                   f"화면 넘침 {m['screenOverflow']}px · 목록 하단 {m['paneBottom']} / {m['vh']}")
                ok(f"{label} · 가로 넘침 0", m["scrollW"] <= size[0], f"{m['scrollW']}px")
                ok(f"{label} · 콘솔 오류 0건", not errors, errors[:2])
                page.screenshot(path=os.path.join(outdir, f"hall-sync-{size[0]}x{size[1]}-"
                                                          f"{'in' if signed_in else 'off'}-{tag}.png"))
                browser.close()

    print(f"\n화면 검사: {len(results)} 항목 · 실패 {results.count(False)} 건")
    passing = all(results)
    print("=== 결과: " + ("PASS ===" if passing else "FAIL ==="))
    print("스크린샷: " + outdir)
    return passing


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--serve", help="로컬 정적 폴더 (예: .)")
    ap.add_argument("--url", help="라이브 주소")
    ap.add_argument("--out", default="/workspace/browser/life-sim-hall-sync")
    ap.add_argument("--tag", default="local")
    a = ap.parse_args()

    httpd = None
    if a.serve:
        handler = functools.partial(SimpleHTTPRequestHandler, directory=a.serve)
        handler.log_message = lambda *x, **k: None
        httpd = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        threading.Thread(target=httpd.serve_forever, daemon=True).start()
        url = "http://127.0.0.1:%d/index.html" % httpd.server_address[1]
    else:
        url = a.url
    try:
        passing = run(url, a.out, a.tag)
    finally:
        if httpd:
            httpd.shutdown()
    raise SystemExit(0 if passing else 1)


if __name__ == "__main__":
    main()
