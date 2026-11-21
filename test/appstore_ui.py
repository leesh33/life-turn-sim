#!/usr/bin/env python3
"""🚀 App Store 출시 전 최종 정비 — 화면 검증 (로컬 · 라이브 공용)

  python3 test/appstore_ui.py --serve .                 # 로컬
  python3 test/appstore_ui.py --url https://life-turn-sim.vercel.app/ --tag live

하는 일 (390×844 중심)
  1. 광고 지면이 화면에 없다 — 하단 스폰서 배너·「광고 보고」 문구·프로토타입 광고 모달(2.1)
  2. 되돌리기/다시 뽑기/긴급 회복이 광고 모달 없이 바로 동작한다
  3. 전체 랭킹 0명일 때 안내 문구(「아직 0명 — 첫 참가자를 기다리는 중」·「첫 번째 주인공」)
  4. 로그인 상태의 명예의 전당에 「계정 및 클라우드 기록 삭제」 → 2단계 확인 모달 →
     「삭제」 입력 뒤 실행 → 새로 열린 시작 화면에 완료 안내(가짜 RPC 응답으로 검증)
  5. Apple 로그인 버튼은 플래그가 꺼져 있으면 없다 · 콘솔 오류 0건 · Gmarket Sans 유지
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

SESSION_JS = (
    "(() => { try {"
    " if (sessionStorage.getItem('seeded')) return;"     # 새로고침 때 다시 심지 않는다
    " sessionStorage.setItem('seeded', '1');"
    " const s = { access_token: 'fake-token', refresh_token: 'fake-refresh',"
    "   expires_at: Date.now() + 3600 * 1000,"
    "   user: { id: 'u-test', email: 'andy@example.com', user_metadata: { full_name: '상훈' } } };"
    " localStorage.clear();"
    " localStorage.setItem('lifeTurnSim.auth.session.v1', JSON.stringify(s));"
    " localStorage.setItem('lifeTurnSim.save.v1', JSON.stringify({ name: '폰', updatedAt: 1,"
    "   age: 25, month: 1, history: [{}], v: 5, flags: {}, used: [], lastSeen: {}, current: null,"
    "   cameos: [], grad: null, stats: { hp: 80, mental: 80, charm: 50, asset: 0, social: 50,"
    "   intel: 50, luck: 50 } }));"
    " localStorage.setItem('lifeTurnSim.hall.v1', JSON.stringify({ v: 1, seeded: true,"
    "   records: [{ id: 'local-1', mine: true, ts: 6, score: 66, name: '폰 기록', key: 'life80',"
    "     stageLabel: '80세 완주', title: '폰 기록', grade: 'B',"
    "     stats: { hp: 50, mental: 50, charm: 50, asset: 0, social: 50, intel: 50, luck: 50 } }] }));"
    " } catch (e) {} })();"
)


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
        "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
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

    def new_page(p, size, init=None, empty_rank=False, deletion=True):
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

        def handler(route, request):
            calls.append({"url": request.url, "method": request.method, "body": request.post_data})
            u = request.url
            if request.method == "OPTIONS":
                route.fulfill(status=204, headers=cors())
                return
            if "/auth/v1/logout" in u:
                route.fulfill(status=204, headers=cors())
                return
            if "/rest/v1/rpc/life_sim_delete_my_account" in u:
                route.fulfill(status=200, headers=cors(), body=json.dumps({
                    "ok": True, "account_deleted": True, "kept_for_other_apps": False,
                    "state_rows": 1, "leaderboard_rows": 2}))
                return
            if "/rest/v1/rpc/life_sim_leaderboard_list" in u:
                route.fulfill(status=200, headers=cors(), body=json.dumps(
                    {"total": 0, "entries": [], "me": None} if empty_rank else
                    {"total": 28, "entries": [
                        {"rank": 1, "character_name": "상훈", "score": 88.4, "net_assets": 320000000,
                         "final_age": 80, "grade": "S", "generation": 1, "scenario": "kr",
                         "title": "인생의 주인공", "mine": True, "display_name": "익명 플레이어"}],
                     "me": {"best_score": 88.4, "rank": 1, "total": 28, "top_percent": 3}}))
                return
            if "/rest/v1/rpc/life_sim_put_state" in u:
                body = json.loads(request.post_data or "{}")
                route.fulfill(status=200, headers=cors(), body=json.dumps(body.get("p_data")))
                return
            if "/rest/v1/life_sim_user_state" in u:
                route.fulfill(status=200, headers=cors(), body=json.dumps([
                    {"data": {"v": 1, "at": 500, "save": None, "saveAt": 500,
                              "hall": {"v": 1, "seeded": True, "records": []}, "titles": {}, "device": "x"},
                     "revised_at": 500}]))
                return
            route.fulfill(status=404, headers=cors(), body=json.dumps({"message": "no"}))
        page.route(SUPA + "/**", handler)
        return browser, page, errors, calls

    with sync_playwright() as p:
        # ── ① 플레이 화면 — 광고 지면 없음 · 보상 버튼이 바로 동작 ────────────
        browser, page, errors, calls = new_page(p, (390, 844))
        page.goto(url, wait_until="networkidle")
        page.wait_for_timeout(400)
        ok("시작 화면 — 스폰서 배너 없음", not page.locator("#adZone").is_visible())
        page.click("#startBtn")
        page.wait_for_timeout(600)
        box = page.evaluate("() => { const z = document.getElementById('adZone');"
                            " const r = z.getBoundingClientRect();"
                            " return { hidden: z.hidden, visible: !!(z.offsetWidth || z.offsetHeight || r.height) }; }")
        ok("하단 광고 배너는 감춰져 있다", box["hidden"] and not box["visible"], box)
        ok("화면에 AD 배지 없음", page.locator(".ad-tag").count() == 0 or
           page.locator(".ad-tag").first.is_hidden())
        subs = page.eval_on_selector_all("#rewardBar .rb-sub", "els => els.map(e => e.textContent.trim())")
        ok("보상 버튼 문구에 「광고 보고」 없음", all("광고" not in s for s in subs), subs)
        ok("보상 버튼 3개가 그대로", len(subs) == 3, subs)
        # 첫 선택 → 결과 → 되돌리기(광고 모달 없이 바로)
        page.locator(".choice").first.click()
        page.wait_for_timeout(700)
        undo = page.locator("#rewardUndo")
        ok("되돌리기 버튼 활성", undo.is_enabled(), undo.inner_text().replace("\n", " / "))
        if undo.is_enabled():
            undo.click()
            page.wait_for_timeout(500)
            modal = page.evaluate("() => { const m = document.getElementById('adModal');"
                                  " return { hidden: m.hidden, visible: !!(m.offsetWidth || m.offsetHeight) }; }")
            ok("되돌리기 — 광고 모달이 뜨지 않는다", modal["hidden"] and not modal["visible"], modal)
            toast = page.locator("#toast").inner_text() if page.locator("#toast").count() else ""
            ok("되돌리기 — 바로 적용 안내", "되돌렸" in toast, toast)
        ok("플레이 화면 콘솔 오류 0건", not errors, errors[:2])
        page.screenshot(path=os.path.join(outdir, f"appstore-play-{tag}.png"))
        browser.close()

        # ── ② 전체 랭킹 0명 — 안내 문구 ────────────────────────────────
        browser, page, errors, calls = new_page(p, (390, 844), empty_rank=True)
        page.goto(url, wait_until="networkidle")
        page.wait_for_timeout(400)
        page.click("#hallBtnStart")
        page.wait_for_timeout(400)
        page.click("#hallViews .hall-view[data-view='global']")
        page.wait_for_timeout(900)
        ok("0명 — 머리말 안내", "아직 0명" in page.locator("#hallSub").inner_text(),
           page.locator("#hallSub").inner_text())
        ok("0명 — 참가자 수 표시", "아직 0명" in page.locator("#lgCount").inner_text(),
           page.locator("#lgCount").inner_text())
        empty = page.locator("#lgBody").inner_text()
        ok("0명 — 첫 주인공 안내", "첫 번째 주인공" in empty, empty.replace("\n", " / ")[:120])
        ok("0명 — 콘솔 오류 0건", not errors, errors[:2])
        page.screenshot(path=os.path.join(outdir, f"appstore-rank-empty-{tag}.png"))
        browser.close()

        # ── ③ 로그인 상태 — 계정 삭제 2단계 → 실행 → 완료 안내 ──────────────
        browser, page, errors, calls = new_page(p, (390, 844), init=SESSION_JS)
        page.goto(url, wait_until="networkidle")
        page.wait_for_timeout(1500)
        ok("Apple 로그인 버튼은 플래그 꺼짐 상태에서 없다",
           page.locator("#syncRow .sync-pill.apple").count() == 0)
        ok("구글 로그인 상태 표시", "동기화" in page.locator("#syncRow .sync-pill").first.inner_text(),
           page.locator("#syncRow .sync-pill").first.inner_text())
        page.click("#hallBtnStart")
        page.wait_for_timeout(600)
        ok("전당 — 계정 삭제 버튼이 보인다", page.locator("#acctRow").is_visible() and
           page.locator("#acctDel").is_visible(), page.locator("#acctDel").inner_text())
        page.click("#acctDel")
        page.wait_for_timeout(400)
        ok("1단계 — 삭제 안내 모달", page.locator("#acctModal").is_visible() and
           page.locator("#amNext").is_visible() and page.locator("#amConfirm").is_hidden(),
           page.locator("#amTitle").inner_text())
        ok("1단계 — 무엇이 지워지는지 안내", "전체 랭킹" in page.locator("#acctModal").inner_text())
        page.screenshot(path=os.path.join(outdir, f"appstore-delete-step1-{tag}.png"))
        page.click("#amNext")
        page.wait_for_timeout(300)
        ok("2단계 — 「삭제」 입력 칸", page.locator("#amStep2").is_visible() and
           page.locator("#amWord").is_visible() and page.locator("#amConfirm").is_visible())
        ok("2단계 — 입력 전에는 실행 불가", page.locator("#amConfirm").is_disabled())
        page.fill("#amWord", "삭제")
        page.wait_for_timeout(200)
        ok("2단계 — 「삭제」를 쓰면 실행 가능", page.locator("#amConfirm").is_enabled())
        page.screenshot(path=os.path.join(outdir, f"appstore-delete-step2-{tag}.png"))
        page.click("#amConfirm")
        page.wait_for_timeout(1100)
        ok("삭제 실행 — 서버 함수 호출", any("life_sim_delete_my_account" in c["url"] for c in calls),
           [c["url"] for c in calls if "delete_my_account" in c["url"]])
        ok("삭제 실행 — 시작 화면으로 돌아온다", page.locator("#screen-start").is_visible())
        toast = page.locator("#toast").inner_text() if page.locator("#toast").count() else ""
        ok("삭제 실행 — 완료 안내", "삭제했습니다" in toast, toast)
        keys = page.evaluate("() => Object.keys(localStorage).filter(k => k.indexOf('lifeTurnSim') === 0)")
        ok("삭제 실행 — 기기 기록·세션 삭제", "lifeTurnSim.auth.session.v1" not in keys, keys)
        ok("삭제 뒤 콘솔 오류 0건", not errors, errors[:2])
        page.screenshot(path=os.path.join(outdir, f"appstore-delete-done-{tag}.png"))
        browser.close()

        # ── ④ 글꼴·레이아웃 — Gmarket Sans 유지 ─────────────────────────
        browser, page, errors, calls = new_page(p, (390, 844))
        page.goto(url, wait_until="networkidle")
        page.wait_for_timeout(900)
        font = page.evaluate("() => getComputedStyle(document.body).fontFamily")
        ok("Gmarket Sans 유지", "Gmarket" in font, font)
        ok("콘솔 오류 0건", not errors, errors[:2])
        browser.close()

    print(f"\nApp Store 화면 검사: {sum(results)} / {len(results)} 통과")
    return 0 if all(results) else 1


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--url")
    ap.add_argument("--serve")
    ap.add_argument("--port", type=int, default=8793)
    ap.add_argument("--out", default="test/shots")
    ap.add_argument("--tag", default="local")
    a = ap.parse_args()
    if a.serve:
        serve(os.path.abspath(a.serve), a.port)
        url = f"http://127.0.0.1:{a.port}/"
    else:
        url = a.url
    raise SystemExit(run(url, a.out, a.tag))
