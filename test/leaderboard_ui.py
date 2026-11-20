#!/usr/bin/env python3
"""🏆 전체 랭킹 화면 검증 — 전당의 `내 전당 | 전체 랭킹` 탭 (로컬 · 라이브 공용)

  python3 test/leaderboard_ui.py --serve .            # 로컬 (목록·등록은 흉내)
  python3 test/leaderboard_ui.py --url https://life-turn-sim.vercel.app/ --tag live

하는 일 (390×844 실제 화면)
  1. 전당에 보기 전환 두 개가 있고 기본은 `내 전당`
  2. `전체 랭킹` — 정렬 토글 · 1~3위 메달 · 내 기록 강조 · 상위 % 배지 · 개인정보 안내
  3. `자산 순` 으로 바꾸면 자산 큰 순서로 다시 그린다(요청 p_sort=assets)
  4. 로그인하면 랭킹 이름·자동 등록 줄이 나타나고, 이름 저장이 남는다
  5. `내 최고 기록 올리기` → 등록 RPC(이메일 없음) → 안내 토스트
  6. 390 폭에서 가로 넘침 0 · 콘솔 오류 0
  7. 라이브: 실서버 목록이 오류 없이 그려진다(비어 있으면 빈 안내)
"""
import argparse
import functools
import json
import os
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from playwright.sync_api import sync_playwright

CHROME = "/workspace/.cache/ms-playwright/chromium-1134/chrome-linux/chrome"

# 전당에 남아 있는 내 기록 2건 (아직 전체 랭킹에 안 올린 상태)
HALL = {"v": 1, "seeded": True, "records": [
    {"id": "r-sanghun-1", "kind": "life", "key": "life80", "stageLabel": "80세 완주", "age": 80,
     "score": 71.4, "grade": "A", "top": None,
     "title": "우렁찬 울음으로 시작해 인맥 하나로 먹고사는 K-기획자",
     "archetype": "사람을 모으는 사람", "name": "상훈", "gender": "남", "ts": 1700000000000,
     "mine": True, "generation": 2, "scenario": "chaebol",
     "stats": {"hp": 64, "mental": 71, "charm": 66, "social": 84, "intel": 79, "luck": 55, "asset": 32000}},
    {"id": "r-jiwoo-1", "kind": "life", "key": "life80", "stageLabel": "80세 완주", "age": 80,
     "score": 66.1, "grade": "A", "top": None, "title": "강가에서 하루를 보내는 낚시광",
     "archetype": "느긋한 사람", "name": "지우", "gender": "여", "ts": 1700000900000,
     "mine": True, "generation": 1, "scenario": "kr",
     "stats": {"hp": 58, "mental": 66, "charm": 61, "social": 70, "intel": 63, "luck": 58, "asset": 12000}}
]}

# 서버가 돌려줄 전체 랭킹 (3명)
ENTRIES = [
    {"character_name": "다", "display_name": "익명 플레이어", "title": "빠른 사업가로 남은 사람",
     "archetype": "사업가", "final_age": 80, "grade": "S", "score": 88.2, "net_assets": 9000,
     "scenario": "kr", "generation": 1, "mine": False},
    {"character_name": "상훈", "display_name": "꼬야네", "title": "우렁찬 울음으로 시작한 K-기획자",
     "archetype": "사람을 모으는 사람", "final_age": 80, "grade": "A", "score": 71.4, "net_assets": 32000,
     "scenario": "chaebol", "generation": 2, "mine": True},
    {"character_name": "나", "display_name": "익명 플레이어", "title": "조용한 낚시광",
     "archetype": "", "final_age": 80, "grade": "B", "score": 55.0, "net_assets": 12000,
     "scenario": "imf", "generation": 1, "mine": False},
]


def list_body(sort):
    order = sorted(ENTRIES, key=(lambda e: (-e["net_assets"], -e["score"])) if sort == "assets"
                   else (lambda e: (-e["score"], -e["net_assets"])))
    entries = [dict(e, rank=i) for i, e in enumerate(order, 1)]
    return {"sort": sort, "limit": 30, "total": len(entries), "entries": entries,
            "me": {"signed_in": True, "best_score": 71.4, "total": 3, "better": 1, "rank": 2, "top_percent": 34}}


def make_session():
    return {"access_token": "test-token", "refresh_token": "test-refresh",
            "expires_at": int(time.time() * 1000) + 3600 * 1000,
            "user": {"id": "00000000-0000-0000-0000-000000000001", "email": "andy@example.com",
                     "user_metadata": {"full_name": "상훈"}}}


def serve(directory, port):
    handler = functools.partial(SimpleHTTPRequestHandler, directory=directory)
    handler.log_message = lambda *a, **k: None
    httpd = ThreadingHTTPServer(("127.0.0.1", port), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--serve", default=None)
    ap.add_argument("--url", default=None)
    ap.add_argument("--out", default="/workspace/downloads/life-sim-phase2")
    ap.add_argument("--tag", default="local")
    args = ap.parse_args()

    httpd = None
    if args.serve:
        httpd = serve(args.serve, 8881)
        url = "http://127.0.0.1:8881/"
        live = False
    else:
        url = args.url
        live = True
    os.makedirs(args.out, exist_ok=True)

    results = []

    def ok(name, cond, extra=""):
        results.append((bool(cond), name, extra))
        print(("PASS" if cond else "FAIL") + " · " + name + ((" — " + str(extra)) if extra else ""))

    shot = lambda name: args.out + "/" + name + "-" + args.tag + ".png"
    all_errors = []

    def session(p, signed_in, fn):
        browser = p.chromium.launch(executable_path=CHROME,
                                    args=["--no-sandbox", "--disable-dev-shm-usage"])
        ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2,
                                  is_mobile=True, has_touch=True)
        init = "(() => { try { localStorage.setItem('lifeTurnSim.hall.v1', " + json.dumps(json.dumps(HALL, ensure_ascii=False)) + ");"
        if signed_in:
            init += " localStorage.setItem('lifeTurnSim.auth.session.v1', " + json.dumps(json.dumps(make_session())) + ");"
        init += " } catch (e) {} })();"
        ctx.add_init_script(init)

        # 서버 응답은 흉내 낸다(화면 확인용). 라이브에서는 흉내 내지 않는다.
        if not live:
            def on_list(route):
                body = route.request.post_data_json or {}
                route.fulfill(status=200, content_type="application/json",
                              body=json.dumps(list_body(body.get("p_sort", "score")), ensure_ascii=False))
            ctx.route("**/rest/v1/rpc/life_sim_leaderboard_list", on_list)
            ctx.route("**/rest/v1/rpc/life_sim_leaderboard_submit",
                      lambda r: r.fulfill(status=200, content_type="application/json",
                                          body=json.dumps({"ok": True, "id": "row-1", "created": True,
                                                           "rank": 1, "total": 3, "score": 71.4})))
            ctx.route("**/rest/v1/rpc/life_sim_leaderboard_clear",
                      lambda r: r.fulfill(status=200, content_type="application/json",
                                          body=json.dumps({"ok": True, "removed": 2})))
            ctx.route("**/rest/v1/rpc/life_sim_put_state",
                      lambda r: r.fulfill(status=200, content_type="application/json", body="{}"))
            ctx.route("**/rest/v1/life_sim_user_state**",
                      lambda r: r.fulfill(status=200, content_type="application/json", body="[]"))

        page = ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))
        page.on("console", lambda m: errors.append("console: " + m.text) if m.type == "error" else None)
        page.goto(url, wait_until="load")
        page.wait_for_timeout(700)
        try:
            fn(page)
        finally:
            browser.close()
        return errors

    def open_global(page):
        page.click("#hallBtnStart")
        page.wait_for_timeout(300)
        page.click('.hall-view[data-view="global"]')
        page.wait_for_timeout(700)

    with sync_playwright() as p:
        # ① 로그인하지 않은 사람 — 모두의 기록은 보이고, 내 기록은 이 기기 기준
        def step_guest(page):
            page.click("#hallBtnStart")
            page.wait_for_timeout(350)
            views = page.eval_on_selector_all(".hall-view", "els => els.map(e => e.textContent.trim())")
            ok("전당 보기 전환 두 개", views == ["내 전당", "🏆 전체 랭킹"], views)
            ok("기본은 내 전당", page.is_visible("#hallMineView") and page.eval_on_selector(
                '.hall-view[data-view="mine"]', "e => e.classList.contains('active')"))
            ok("전체 랭킹은 처음엔 숨김", not page.is_visible("#hallGlobalView"))
            ok("내 전당 목록 그대로", page.eval_on_selector_all("#hallBody .hall-row", "els => els.length") >= 2)

            page.click('.hall-view[data-view="global"]')
            page.wait_for_timeout(700)
            ok("전체 랭킹 화면으로 전환", page.is_visible("#hallGlobalView") and not page.is_visible("#hallMineView"))
            ok("제목에 참가 인원", "전체 유저 익명 랭킹" in page.inner_text(".hall-title-box"),
               page.inner_text("#hallSub"))
            ok("정렬 토글 두 개", page.eval_on_selector_all(".lg-sort", "els => els.map(e => e.textContent.trim())")
               == ["총점 순", "자산 순"])
            ok("참가 인원 표시", page.inner_text("#lgCount") == "3명", page.inner_text("#lgCount"))
            rows = page.eval_on_selector_all("#lgBody .lg-row", "els => els.length")
            ok("목록 3명", rows == 3, rows)
            medals = page.eval_on_selector_all("#lgBody .lg-rank", "els => els.map(e => e.textContent.trim())")
            ok("1~3위 메달", medals[:3] == ["🥇", "🥈", "🥉"], medals)
            first = page.inner_text("#lgBody .lg-row")
            ok("1위는 점수 1등", "다" in first and "88.2" in first, first.replace("\n", " "))
            ok("내 기록 강조", page.eval_on_selector_all("#lgBody .lg-row.mine", "els => els.length") == 1)
            ok("엔딩 칭호·나이·대수", "우렁찬 울음으로 시작한 K-기획자" in page.inner_text("#lgBody")
               and "80세" in page.inner_text("#lgBody") and "2대" in page.inner_text("#lgBody"))
            ok("상위 % 배지", page.inner_text("#lgMyPct") == "상위 34%", page.inner_text("#lgMyPct"))
            ok("내 최고 점수", page.inner_text("#lgMyScore") == "71.4", page.inner_text("#lgMyScore"))
            ok("로그인 안내(이 기기 기준)", "로그인" in page.inner_text("#lgMySub"), page.inner_text("#lgMySub"))
            ok("개인정보 안내", "이메일은 공개되지 않습니다" in page.inner_text("#lgPrivate"))
            ok("비로그인에는 이름·자동 등록 줄 없음",
               not page.is_visible("#lgTools") and not page.is_visible("#lgAutoRow"))
            ok("가로 넘침 0", page.evaluate("() => document.documentElement.scrollWidth <= window.innerWidth"),
               page.evaluate("() => [document.documentElement.scrollWidth, window.innerWidth]"))
            page.screenshot(path=shot("01-global-guest"))

            # 자산 순
            page.click('.lg-sort[data-sort="assets"]')
            page.wait_for_timeout(700)
            ok("자산 순 활성", page.eval_on_selector('.lg-sort[data-sort="assets"]',
                                                  "e => e.classList.contains('active')"))
            atxt = page.inner_text("#lgBody .lg-row")
            ok("자산 1위가 맨 위", "상훈" in atxt and "3억" in atxt, atxt.replace("\n", " "))
            ok("자산 순 점수도 함께 보임", "71.4" in atxt, atxt.replace("\n", " "))
            page.screenshot(path=shot("02-global-assets"))

            # 다시 내 전당
            page.click('.hall-view[data-view="mine"]')
            page.wait_for_timeout(300)
            ok("내 전당으로 돌아오기", page.is_visible("#hallMineView") and not page.is_visible("#hallGlobalView"))

        all_errors += session(p, False, step_guest)

        # ② 로그인한 사람 — 랭킹 이름·자동 등록·내 기록 올리기
        def step_member(page):
            open_global(page)
            ok("로그인하면 이름 줄이 보인다", page.is_visible("#lgTools") and page.is_visible("#lgAutoRow"))
            nick = page.input_value("#lgNick")
            ok("기본 랭킹 이름", nick == "익명 플레이어", nick)
            ok("자동 등록 기본 켜짐", page.is_checked("#lgAuto"))
            ok("내 기록 올리기 버튼", page.is_visible("#lgUpload"))
            page.screenshot(path=shot("03-global-member"))

            page.fill("#lgNick", "꼬야네")
            page.click("#lgNickSave")
            page.wait_for_timeout(300)
            saved = page.evaluate("() => localStorage.getItem('lifeTurnSim.leaderboard.nick.v1')")
            ok("랭킹 이름 저장", saved is not None and "꼬야네" in saved, saved)
            ok("저장 안내", "꼬야네" in page.inner_text("#toast"), page.inner_text("#toast"))

            page.uncheck("#lgAuto")
            page.wait_for_timeout(250)
            auto = page.evaluate("() => localStorage.getItem('lifeTurnSim.leaderboard.auto.v1')")
            ok("자동 등록 끄기 저장", auto == "false", auto)
            page.check("#lgAuto")
            page.wait_for_timeout(200)
            ok("자동 등록 다시 켜기", page.evaluate(
                "() => localStorage.getItem('lifeTurnSim.leaderboard.auto.v1')") == "true")

            bodies = []
            page.on("request", lambda r: bodies.append(r.post_data_json or {})
                    if "life_sim_leaderboard_submit" in r.url else None)
            page.click("#lgUpload")
            page.wait_for_timeout(900)
            ok("등록 요청 갔음", len(bodies) >= 1, len(bodies))
            if bodies:
                b = bodies[0]
                ok("등록 본문 — 캐릭터 이름", b.get("p_character_name") == "상훈", b.get("p_character_name"))
                ok("등록 본문 — 저장한 랭킹 이름", b.get("p_display_name") == "꼬야네", b.get("p_display_name"))
                ok("등록 본문 — 점수·재산", b.get("p_score") == 71.4 and b.get("p_net_assets") == 32000,
                   f"{b.get('p_score')}/{b.get('p_net_assets')}")
                ok("등록 본문에 이메일 없음", "@" not in json.dumps(b, ensure_ascii=False))
            ok("등록 안내 토스트", "전체 랭킹에 올렸습니다" in page.inner_text("#toast"), page.inner_text("#toast"))
            ok("올린 기록 표시 줄어듦", page.evaluate(
                "() => JSON.parse(localStorage.getItem('lifeTurnSim.leaderboard.sent.v1') || '{}')") != {})
            page.screenshot(path=shot("04-global-uploaded"))

            # 지우기 — 확인창을 거쳐 내 기록을 서버에서 지운다
            ok("지우기 버튼 보임", page.is_visible("#lgClear"))
            cleared = []
            page.on("request", lambda r: cleared.append(r.post_data_json or {})
                    if "life_sim_leaderboard_clear" in r.url else None)
            page.once("dialog", lambda d: d.accept())
            page.click("#lgClear")
            page.wait_for_timeout(800)
            ok("지우기 요청 갔음", len(cleared) >= 1, len(cleared))
            ok("지우기 안내", "지웠습니다" in page.inner_text("#toast"), page.inner_text("#toast"))
            ok("지운 뒤 올린 표시 비움", page.evaluate(
                "() => localStorage.getItem('lifeTurnSim.leaderboard.sent.v1')") == "{}")

        all_errors += session(p, True, step_member)

        # ③ 라이브 — 실서버 목록
        if live:
            def step_live(page):
                open_global(page)
                body = page.inner_text("#lgBody")
                rows = page.eval_on_selector_all("#lgBody .lg-row", "els => els.length")
                ok("실서버 목록이 그려짐", rows > 0 or "아직 등록된 기록이 없습니다" in body,
                   f"{rows}행 / {body[:40]}")
                ok("실서버 오류 안내 없음", "준비 중" not in body and "불러오지 못했습니다" not in body, body[:60])
                ok("가로 넘침 0", page.evaluate("() => document.documentElement.scrollWidth <= window.innerWidth"))
                page.screenshot(path=shot("05-global-live"))
            all_errors += session(p, False, step_live)

    ENV_NOISE = ("favicon", "ERR_INSUFFICIENT_RESOURCES", "ERR_ABORTED", "ERR_NETWORK_CHANGED")
    real_errors = [e for e in all_errors if not any(n in e for n in ENV_NOISE)]
    ok("콘솔 오류 0건", len(real_errors) == 0, "; ".join(real_errors[:3]))

    if httpd:
        httpd.shutdown()

    failed = [r for r in results if not r[0]]
    print("\n=== 전체 랭킹 화면 검증 " + str(len(results) - len(failed)) + " / " + str(len(results)) + " 통과 ===")
    print("=== 결과:", "FAIL" if failed else "PASS", "===")
    print("스크린샷:", args.out)
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
