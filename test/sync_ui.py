#!/usr/bin/env python3
"""☁️ 구글 로그인 · 클라우드 동기화 — 화면 검증 (로컬 · 라이브 공용)

  python3 test/sync_ui.py --serve .                 # 로컬
  python3 test/sync_ui.py --url https://life-turn-sim.vercel.app/ --tag live

하는 일 (390×664 · 390×844)
  1. 시작 화면 — 「Google로 로그인」 칩·안내줄·개인정보처리방침/이용약관 링크가 보이고,
     한 화면에 그대로 들어간다(390×664 스크롤 0), 콘솔 오류 0건
  2. 로그인하지 않으면 Supabase 를 부르지 않는다(요청 0건)
  3. 칩을 누르면 Supabase authorize 로 간다 — provider=google · PKCE(S256) · redirect_to=이 페이지
     (요청은 가로채 가짜 페이지로 응답 — 실제 구글 계정으로 로그인하지 않는다)
  4. 로그인한 상태(가짜 응답) — 내려받아 합치고 「동기화됨 · 상훈」 표시,
     전당 화면에서 이메일이 보이고, 로그아웃하면 칩이 로그인으로 돌아간다
  5. /privacy.html · /terms.html — 제목·본문·돌아가기 링크, 콘솔 오류 0건
"""
import argparse
import functools
import json
import os
import threading
import urllib.parse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from playwright.sync_api import sync_playwright

CHROME = "/workspace/.cache/ms-playwright/chromium-1134/chrome-linux/chrome"
SUPA = "https://zdcdvjlssncsawpqsjwe.supabase.co"

CLOUD_ROW = {
    "data": {
        "v": 1, "at": 500,
        "save": {"name": "아이패드", "updatedAt": 9_000_000_000_000, "age": 40, "month": 2,
                 "history": [{}, {}, {}], "v": 5, "current": {"eventId": "eve_1"}, "stats": {"hp": 60, "mental": 60, "charm": 60,
                                                              "asset": 0, "social": 60, "intel": 50, "luck": 50},
                 "flags": {}, "used": [], "lastSeen": {}, "cameos": [], "grad": None},
        "saveAt": 9_000_000_000_000,
        "hall": {"v": 1, "seeded": True,
                 "records": [{"id": "cloud-1", "mine": True, "ts": 5, "score": 77, "name": "상훈",
                              "key": "life80", "stageLabel": "80세 완주", "title": "클라우드 기록",
                              "grade": "A", "stats": {"hp": 60, "mental": 60, "charm": 60,
                                                       "asset": 0, "social": 60, "intel": 50, "luck": 50}}]},
        "titles": {"first_love": {"at": 3}},
        "device": "ipad"
    },
    "revised_at": 500
}


def serve(directory, port):
    handler = functools.partial(SimpleHTTPRequestHandler, directory=directory)
    handler.log_message = lambda *a, **k: None
    httpd = ThreadingHTTPServer(("127.0.0.1", port), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def cors(extra=None):
    h = {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "*",
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "content-type": "application/json",
    }
    if extra:
        h.update(extra)
    return h


def run(url, outdir, tag):
    os.makedirs(outdir, exist_ok=True)
    results = []

    def ok(name, cond, extra=""):
        results.append(bool(cond))
        print(("PASS" if cond else "FAIL") + " · " + name + ((" — " + str(extra)) if extra else ""))

    def new_page(p, size, init=None, routes=None):
        w, h = size
        browser = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox", "--disable-dev-shm-usage"])
        ctx = browser.new_context(viewport={"width": w, "height": h}, device_scale_factor=1,
                                  is_mobile=True, has_touch=True)
        if init:
            ctx.add_init_script(init)
        page = ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        calls = []
        unmatched = []
        if routes is not None:
            def handler(route, request):
                calls.append({"url": request.url, "method": request.method,
                              "body": request.post_data})
                u = request.url
                if request.method == "OPTIONS":
                    route.fulfill(status=204, headers=cors())
                    return
                if "/auth/v1/authorize" in u:
                    route.fulfill(status=200, headers=cors({"content-type": "text/html"}),
                                  body="<html><body>가짜 구글 로그인</body></html>")
                    return
                if "/auth/v1/logout" in u:
                    route.fulfill(status=204, headers=cors())
                    return
                if "/rest/v1/rpc/life_sim_put_state" in u:
                    body = json.loads(request.post_data or "{}")
                    route.fulfill(status=200, headers=cors(), body=json.dumps(body.get("p_data")))
                    return
                if "/rest/v1/life_sim_user_state" in u:
                    route.fulfill(status=200, headers=cors(), body=json.dumps([CLOUD_ROW]))
                    return
                unmatched.append(u)
                route.fulfill(status=404, headers=cors(), body=json.dumps({"message": "no"}))
            page.route(SUPA + "/**", handler)
        return browser, page, errors, calls, unmatched

    with sync_playwright() as p:
        # ── ① 시작 화면 (390×664) ─────────────────────────────
        for w, h in [(390, 664), (390, 844)]:
            browser, page, errors, calls, unmatched = new_page(p, (w, h), routes=True)
            page.goto(url, wait_until="networkidle")
            page.wait_for_timeout(400)
            pill = page.locator("#syncRow .sync-pill")
            note = page.locator("#syncRow .sync-note")
            legal = page.locator(".legal-links a")
            ok(f"{w}×{h} · 로그인 칩이 보인다", pill.count() == 1, pill.first.inner_text() if pill.count() else "없음")
            ok(f"{w}×{h} · 칩 문구", "Google로 로그인" in (pill.first.inner_text() if pill.count() else ""))
            ok(f"{w}×{h} · 안내줄(선택)", "선택" in (note.first.inner_text() if note.count() else ""),
               note.first.inner_text() if note.count() else "")
            ok(f"{w}×{h} · 약관 링크 2개", legal.count() == 2,
               " / ".join(legal.nth(i).inner_text() for i in range(legal.count())))
            ok(f"{w}×{h} · 링크 주소", legal.nth(0).get_attribute("href") == "privacy.html"
               and legal.nth(1).get_attribute("href") == "terms.html")
            fit = page.evaluate("() => { const s = document.querySelector('.start-scroll');"
                                " const b = document.querySelector('#startBtn').getBoundingClientRect();"
                                " return { overflow: s.scrollHeight - s.clientHeight, btnBottom: Math.round(b.bottom),"
                                " vh: window.innerHeight, cards: [...document.querySelectorAll('.age-card')]"
                                ".filter(c => { const r = c.getBoundingClientRect();"
                                " return r.top < 0 || r.bottom > window.innerHeight; }).length }; }")
            ok(f"{w}×{h} · 한 화면에 들어간다", fit["overflow"] <= 0 and fit["cards"] == 0,
               f"overflow {fit['overflow']}px · 버튼 하단 {fit['btnBottom']} / {fit['vh']} · 잘린 카드 {fit['cards']}")
            ok(f"{w}×{h} · 로그인 전엔 Supabase 요청 0건", len(calls) == 0, f"{len(calls)}건")
            ok(f"{w}×{h} · 콘솔 오류 0건", not errors, errors[:2])
            page.screenshot(path=os.path.join(outdir, f"sync-start-{w}x{h}-{tag}.png"))
            browser.close()

        # ── ② 칩 → Supabase authorize (PKCE) ─────────────────
        browser, page, errors, calls, unmatched = new_page(p, (390, 844), routes=True)
        page.goto(url, wait_until="networkidle")
        page.wait_for_timeout(300)
        page.click("#syncRow .sync-pill")
        page.wait_for_timeout(900)
        auth = [c for c in calls if "/auth/v1/authorize" in c["url"]]
        ok("로그인을 누르면 authorize 로 간다", len(auth) >= 1, auth[0]["url"][:90] if auth else "요청 없음")
        q = urllib.parse.parse_qs(urllib.parse.urlparse(auth[0]["url"]).query) if auth else {}
        ok("provider=google", q.get("provider", [""])[0] == "google", q.get("provider"))
        ok("PKCE S256", q.get("code_challenge_method", [""])[0] == "s256", q.get("code_challenge_method"))
        ok("code_challenge 43자", len(q.get("code_challenge", [""])[0]) == 43,
           len(q.get("code_challenge", [""])[0]))
        redirect_to = q.get("redirect_to", [""])[0]
        ok("돌아올 주소는 이 페이지", redirect_to.rstrip("/") == url.rstrip("/"), redirect_to)
        ok("authorize 콘솔 오류 0건", not errors, errors[:2])
        page.screenshot(path=os.path.join(outdir, f"sync-login-tap-{tag}.png"))
        browser.close()

        # ── ③ 로그인 상태 — 내려받아 합치고 표시 ─────────────
        init = (
            "(() => { try {"
            " const s = { access_token: 'fake-token', refresh_token: 'fake-refresh',"
            "   expires_at: Date.now() + 3600 * 1000,"
            "   user: { id: 'u-test', email: 'andy@example.com', user_metadata: { full_name: '상훈' } } };"
            " localStorage.clear();"
            " localStorage.setItem('lifeTurnSim.auth.session.v1', JSON.stringify(s));"
            " localStorage.setItem('lifeTurnSim.save.v1', JSON.stringify({ name: '폰', updatedAt: 1,"
            "   age: 25, month: 1, history: [{}], v: 5, flags: {}, used: [], lastSeen: {}, current: null,"
            "   cameos: [], grad: null, stats: { hp: 50, mental: 50, charm: 50, asset: 0, social: 50,"
            "   intel: 50, luck: 50 } }));"
            " localStorage.setItem('lifeTurnSim.hall.v1', JSON.stringify({ v: 1, seeded: true,"
            "   records: [{ id: 'local-1', mine: true, ts: 6, score: 66, name: '폰 기록', key: 'life80',"
            "     stageLabel: '80세 완주', title: '폰 기록', grade: 'B',"
            "     stats: { hp: 50, mental: 50, charm: 50, asset: 0, social: 50, intel: 50, luck: 50 } }] }));"
            " } catch (e) {} })();"
        )
        browser, page, errors, calls, unmatched = new_page(p, (390, 844), init=init, routes=True)
        page.goto(url, wait_until="networkidle")
        page.wait_for_timeout(1500)
        chip = page.locator("#syncRow .sync-pill")
        note = page.locator("#syncRow .sync-note")
        ok("로그인하면 『동기화됨』", "동기화됨" in (chip.first.inner_text() if chip.count() else ""),
           chip.first.inner_text() if chip.count() else "없음")
        ok("닉네임 표시", "상훈" in (note.first.inner_text() if note.count() else ""),
           note.first.inner_text() if note.count() else "")
        ok("로그아웃 버튼", page.locator("#syncRow .sync-out").count() == 1)
        state = page.evaluate("() => ({ save: window.Life.load(), hall: window.Life.hallRecords().length,"
                             " titles: Object.keys(window.TitleBook.owned()).length })")
        ok("서버의 더 최근 인생을 받는다", state["save"] and state["save"].get("name") == "아이패드",
           state["save"].get("name") if state["save"] else "없음")
        ok("전당은 양쪽 기록을 합친다", state["hall"] >= 2, f"{state['hall']}건")
        ok("칭호도 합쳐진다", state["titles"] >= 1, f"{state['titles']}개")
        ok("이 기기 기록도 남아 있다", page.evaluate(
            "() => window.Life.hallRecords().some(r => r.id === 'local-1')"))
        page.screenshot(path=os.path.join(outdir, f"sync-signed-in-{tag}.png"))

        page.click("#hallBtnStart")
        page.wait_for_timeout(500)
        hall_row = page.locator("#hallSyncRow")
        ok("전당 화면에도 상태 줄", hall_row.count() == 1)
        hall_text = hall_row.inner_text() if hall_row.count() else ""
        ok("전당에서 이메일까지 보인다", "andy@example.com" in hall_text, hall_text.replace("\n", " "))
        page.screenshot(path=os.path.join(outdir, f"sync-hall-{tag}.png"))

        page.click("#hallSyncRow .sync-out")
        page.wait_for_timeout(400)
        ok("로그아웃하면 칩이 로그인으로", "Google로 로그인" in page.locator("#hallSyncRow").inner_text())
        ok("로그아웃하면 세션을 지운다", page.evaluate(
            "() => localStorage.getItem('lifeTurnSim.auth.session.v1')") is None)
        ok("로그아웃해도 내 기록은 남는다", page.evaluate("() => window.Life.hallRecords().length") >= 2)
        ok("가짜 응답 밖의 요청 없음", not unmatched, unmatched[:3])
        ok("로그인·동기화 중 콘솔 오류 0건", not errors, errors[:3])
        browser.close()

        # ── ④ 약관 페이지 ────────────────────────────────────
        for path_, title_word in [("privacy.html", "개인정보처리방침"), ("terms.html", "이용약관")]:
            browser, page, errors, calls, unmatched = new_page(p, (390, 844))
            page.goto(urllib.parse.urljoin(url, path_), wait_until="networkidle")
            h1 = page.locator("h1").first.inner_text()
            ok(f"{path_} · 제목", title_word in h1, h1)
            ok(f"{path_} · 본문 길이", page.locator("main p").count() >= 5,
               f"{page.locator('main p').count()}문단")
            ok(f"{path_} · 돌아가기 링크", page.locator("a.back").first.get_attribute("href") == "./")
            ok(f"{path_} · 운영자 문의처", "andy.leesh33@gmail.com" in page.content())
            ok(f"{path_} · 콘솔 오류 0건", not errors, errors[:2])
            page.screenshot(path=os.path.join(outdir, f"legal-{path_}-{tag}.png"), full_page=True)
            page.click("a.back")
            page.wait_for_timeout(300)
            ok(f"{path_} · 돌아가면 게임", page.locator("#screen-start").count() == 1)
            browser.close()

    print(f"\n화면 검사: {len(results)} 항목 · 실패 {results.count(False)} 건")
    print("스크린샷:", outdir)
    if results.count(False):
        raise SystemExit(1)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--serve", default=None)
    ap.add_argument("--url", default=None)
    ap.add_argument("--out", default="/workspace/browser/life-sim-sync")
    ap.add_argument("--tag", default="local")
    a = ap.parse_args()
    httpd = None
    target = a.url
    if a.serve:
        httpd = serve(a.serve, 8879)
        target = "http://127.0.0.1:8879/"
    if not target:
        raise SystemExit("--serve 또는 --url 이 필요합니다")
    try:
        run(target, a.out, a.tag)
    finally:
        if httpd:
            httpd.shutdown()
