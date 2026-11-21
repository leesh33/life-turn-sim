#!/usr/bin/env python3
"""🔤 Gmarket Sans 적용 검증 — 폰트 로드 · 390×844 레이아웃(2줄 밀림·잘림·겹침)

  python3 test/font_ui.py --serve .                 # 로컬
  python3 test/font_ui.py --url https://life-turn-sim.vercel.app/ --tag live

하는 일
  1. `document.fonts` 에 Gmarket Sans(Medium·Bold)가 실제로 올라왔는지, body 가 그 글꼴로 그려지는지
  2. 화면마다(시작·플레이·결과·전당 내/전체·엔딩·결과 카드) 390×844 에서
     · 가로 넘침 0 (문서 scrollWidth ≤ 390)
     · 한 줄이어야 하는 곳이 두 줄로 밀리지 않았는지 (줄 수 = 높이 ÷ 줄간격)
     · 글자가 칸 밖으로 잘리지 않았는지 (scrollWidth > clientWidth)
     · 요소끼리 겹치지 않았는지 (상단 이름줄 ↔ 버튼줄, 하단 도크)
  3. 화면별 스크린샷 저장
"""
import argparse
import functools
import json
import os
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from playwright.sync_api import sync_playwright

CHROME = "/workspace/.cache/ms-playwright/chromium-1134/chrome-linux/chrome"
STATE_FILE = "/workspace/scratch/phase1-states.json"
ATK = "/workspace/.local/atklibs/usr/lib/x86_64-linux-gnu"
if os.path.isdir(ATK):
    os.environ["LD_LIBRARY_PATH"] = ATK + (":" + os.environ["LD_LIBRARY_PATH"] if os.environ.get("LD_LIBRARY_PATH") else "")

# 한 줄이어야 하는 곳 — (이름, 선택자)
ONE_LINE = [
    ("시작·칭호 도감", "#titleBtnStart"),
    ("시작·명예의 전당", "#hallBtnStart"),
    ("시작·제안 제보", "#fbBtnStart"),
    ("시작·시나리오 안내", "#scenarioHint"),
    ("시작·성별 칩", "#genderChips .chip:first-child"),
    ("시작·인생 시작 버튼", "#startBtn"),
    ("플레이·이름", "#whoName"),
    ("플레이·나이", ".sb-age"),
    ("플레이·전당", "#hallBtnPlay"),
    ("플레이·제보", "#fbBtnPlay"),
    ("플레이·요약", "#summaryBtn"),
    ("플레이·새로 시작", "#resetBtn"),
    ("능력치·라벨", ".stat:first-child .stat-label"),
    ("능력치·값", ".stat:first-child .stat-val"),
    ("보상·되돌리기", "#rewardUndo .rb-main"),
    ("보상·되돌리기 안내", "#rewardUndo .rb-sub"),
    ("보상·다시 뽑기", "#rewardReroll .rb-main"),
    ("보상·다시 뽑기 안내", "#rewardReroll .rb-sub"),
    ("보상·긴급 회복", "#rewardHeal .rb-main"),
    ("보상·긴급 회복 안내", "#rewardHeal .rb-sub"),
    ("하단·인생 일지", "#logBtn"),
    ("하단·다음 진행", "#advanceBtn"),
]

# 글자가 잘리면 안 되는 칸 — (이름, 선택자)
NO_CLIP = [
    ("시작·나이 카드 이름", ".age-card .ac-age"),
    ("시작·나이 카드 설명", ".age-card .ac-label"),
    ("시작·시나리오 칩", ".scenario-chip"),
    ("플레이·이름", "#whoName"),
    ("능력치·값", ".stat-val"),
    ("능력치·라벨", ".stat-label"),
    ("진행도·문구", ".lifebar .stage-note"),
    ("보상·안내", ".reward-btn .rb-sub"),
    ("하단·인생 일지", "#logBtn"),
    ("전당·보기 탭", ".hall-view"),
    ("전당·정렬 탭", ".lg-sort"),
]

LINES_JS = """(sel) => { const el = document.querySelector(sel); if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const range = document.createRange(); range.selectNodeContents(el);
    const tops = [...range.getClientRects()].filter(x => x.width > 0.5).map(x => x.top).sort((a, b) => a - b);
    let lines = 0, last = -1e9;
    for (const t of tops) { if (t - last > 6) { lines += 1; last = t; } }
    return {lines: Math.max(1, lines), h: Math.round(r.height), sw: el.scrollWidth, cw: el.clientWidth,
            font: cs.fontFamily.split(',')[0], weight: cs.fontWeight, text: el.textContent.trim().slice(0, 24)}; }"""

LINES_JS_ALL = """(sel) => [...document.querySelectorAll(sel)].map(el => {
    const range = document.createRange(); range.selectNodeContents(el);
    const tops = [...range.getClientRects()].filter(x => x.width > 0.5).map(x => x.top).sort((a, b) => a - b);
    let lines = 0, last = -1e9;
    for (const t of tops) { if (t - last > 6) { lines += 1; last = t; } }
    return {t: el.textContent.trim().slice(0, 24), lines: Math.max(1, lines), sw: el.scrollWidth, cw: el.clientWidth}; })"""

PROBE = """
() => {
  const out = { lines: {}, clip: [], overflow: [], vw: innerWidth, vh: innerHeight };
  const lineInfo = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || cs.visibility === 'hidden' || cs.display === 'none') return null;
    let lh = parseFloat(cs.lineHeight);
    if (!isFinite(lh)) lh = parseFloat(cs.fontSize) * 1.2;
    return {
      w: Math.round(r.width), h: Math.round(r.height), lh: Math.round(lh),
      lines: Math.max(1, Math.round(r.height / lh)),
      sw: el.scrollWidth, cw: el.clientWidth,
      font: cs.fontFamily.split(',')[0].replace(/["']/g, ''),
      weight: cs.fontWeight,
      text: (el.textContent || '').trim().slice(0, 40)
    };
  };
  document.querySelectorAll('*').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width && (r.right > innerWidth + 0.6 || r.left < -0.6)) {
      if (!el.closest('#screen-ending, #screen-grad, .sheet')) {
        out.overflow.push({ cls: (el.className || el.tagName).toString().slice(0, 50),
                            left: Math.round(r.left), right: Math.round(r.right) });
      }
    }
  });
  return out;
}
"""


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
    ap.add_argument("--out", default="/workspace/browser/life-sim/font-390x844")
    ap.add_argument("--tag", default="local")
    args = ap.parse_args()

    if args.serve:
        serve(args.serve, 8893)
        url = "http://127.0.0.1:8893/"
    else:
        url = args.url
    os.makedirs(args.out, exist_ok=True)

    with open(STATE_FILE, encoding="utf-8") as f:
        st = json.load(f)

    results = []

    def ok(name, cond, extra=""):
        results.append((bool(cond), name, extra))
        print(("PASS" if cond else "FAIL") + " · " + name + ((" — " + str(extra)) if extra else ""))

    def shot(page, name):
        page.screenshot(path=os.path.join(args.out, name + "-" + args.tag + ".png"))

    all_errors = []

    def session(p, fn, save=None, hall=None, titles=None, size=(390, 844)):
        browser = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox", "--disable-dev-shm-usage"])
        ctx = browser.new_context(viewport={"width": size[0], "height": size[1]}, device_scale_factor=2,
                                  is_mobile=True, has_touch=True,
                                  user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) "
                                             "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1")
        init = "(() => { try {"
        if hall:
            init += " localStorage.setItem('lifeTurnSim.hall.v1', " + json.dumps(json.dumps(hall, ensure_ascii=False)) + ");"
        if save:
            init += " localStorage.setItem('lifeTurnSim.save.v1', " + json.dumps(json.dumps(save, ensure_ascii=False)) + ");"
        if titles:
            init += " localStorage.setItem('lifeTurnSim.titles.v1', " + json.dumps(json.dumps(titles)) + ");"
        init += " } catch (e) {} })();"
        ctx.add_init_script(init)

        def on_list(route):
            body = route.request.post_data_json or {}
            sort = body.get("p_sort", "score")
            entries = [
                {"character_name": "다", "display_name": "익명 플레이어", "title": "빠른 사업가로 남은 사람",
                 "archetype": "사업가", "final_age": 80, "grade": "S", "score": 88.2, "net_assets": 9000,
                 "scenario": "kr", "generation": 1, "mine": False, "rank": 1},
                {"character_name": "상훈", "display_name": "꼬야네", "title": "우렁찬 울음으로 시작한 K-기획자",
                 "archetype": "사람을 모으는 사람", "final_age": 80, "grade": "A", "score": 71.4, "net_assets": 32000,
                 "scenario": "chaebol", "generation": 2, "mine": True, "rank": 2},
                {"character_name": "나", "display_name": "익명 플레이어", "title": "조용한 낚시광",
                 "archetype": "", "final_age": 80, "grade": "B", "score": 55.0, "net_assets": 12000,
                 "scenario": "imf", "generation": 1, "mine": False, "rank": 3},
            ]
            if sort == "assets":
                entries = sorted(entries, key=lambda e: -e["net_assets"])
            body_out = {"sort": sort, "limit": 30, "total": 3, "entries": entries,
                        "me": {"signed_in": False, "best_score": 71.4, "total": 3, "better": 1, "rank": 2,
                               "top_percent": 34}}
            route.fulfill(status=200, content_type="application/json", body=json.dumps(body_out, ensure_ascii=False))

        ctx.route("**/rest/v1/rpc/life_sim_leaderboard_list", on_list)
        ctx.route("**/rest/v1/rpc/life_sim_put_state", lambda r: r.fulfill(status=200, content_type="application/json", body="{}"))
        ctx.route("**/rest/v1/life_sim_user_state**", lambda r: r.fulfill(status=200, content_type="application/json", body="[]"))

        page = ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))
        page.on("console", lambda m: errors.append("console: " + m.text) if m.type == "error" else None)
        page.goto(url, wait_until="networkidle")
        page.wait_for_timeout(500)
        try:
            fn(page)
        finally:
            all_errors.extend(errors)
            browser.close()
        return errors

    with sync_playwright() as p:
        # ── ① 시작 화면 ──────────────────────────────────────────
        def step_start(page):
            page.evaluate("() => document.fonts.ready")
            fonts = page.evaluate("""() => {
                const list = [...document.fonts].map(f => ({family: f.family, weight: f.weight, status: f.status}));
                const cs = getComputedStyle(document.body);
                return {
                  list,
                  body: cs.fontFamily,
                  check400: document.fonts.check('400 16px "Gmarket Sans"'),
                  check500: document.fonts.check('500 16px "Gmarket Sans"'),
                  check700: document.fonts.check('700 16px "Gmarket Sans"'),
                  loaded: [...document.fonts].filter(f => f.status === 'loaded').length,
                  failed: [...document.fonts].filter(f => f.status !== 'loaded').length
                };
            }""")
            gm = [f for f in fonts["list"] if "Gmarket" in f["family"]]
            ok("Gmarket Sans @font-face 등록", len(gm) >= 2, ", ".join(f["family"] + "/" + f["weight"] + "/" + f["status"] for f in gm))
            page.evaluate('() => document.fonts.load(\'500 16px "Gmarket Sans"\')')
            loaded500 = page.evaluate('() => document.fonts.check(\'500 16px "Gmarket Sans"\')')
            ok("Gmarket Sans 400(본문 Medium) 로드", fonts["check400"], fonts["check400"])
            ok("Gmarket Sans 500 로드", loaded500, loaded500)
            ok("Gmarket Sans 700 로드", fonts["check700"], fonts["check700"])
            ok("body 가 Gmarket Sans 로 그림", fonts["body"].strip().startswith('"Gmarket Sans"') or
               fonts["body"].strip().startswith("'Gmarket Sans'") or fonts["body"].strip().startswith("Gmarket Sans"),
               fonts["body"][:80])

            probe = page.evaluate(PROBE)
            ok("시작 화면 가로 넘침 0", not probe["overflow"], probe["overflow"][:4])
            for label, sel in ONE_LINE[:6]:
                info = page.evaluate(LINES_JS, sel)
                ok(f"{label} 한 줄", info and info["lines"] == 1 and info["sw"] <= info["cw"] + 1, info)
            # 나이 카드 7개 · 시나리오 칩 4개가 다 보이는지
            cards = page.eval_on_selector_all(".age-card", "els => els.filter(e => e.getBoundingClientRect().height).length")
            chips = page.eval_on_selector_all(".scenario-chip", "els => els.length")
            ok("시작 나이 카드 7개", cards == 7, cards)
            ok("출발 시나리오 칩", chips >= 4, chips)
            row = page.evaluate("""() => { const r = document.getElementById('scenarioRow');
                return { scroll: r.scrollWidth, client: r.clientWidth }; }""")
            ok("시나리오 칩 4개가 390 폭 한 줄(스크롤 0)", row["scroll"] <= row["client"] + 1,
               f"{row['scroll']}/{row['client']}")
            start_fit = page.evaluate("""() => { const sc = document.querySelector('.start-scroll');
                return { overflow: sc.scrollHeight - sc.clientHeight,
                         btn: Math.round(document.getElementById('startBtn').getBoundingClientRect().bottom) }; }""")
            ok("시작 화면 390×844 스크롤 0", start_fit["overflow"] <= 0, start_fit)
            shot(page, "01-start")

            # 시나리오 선택 상태도 한 줄인지
            page.evaluate("() => document.querySelectorAll('.scenario-chip')[1]?.click()")
            page.wait_for_timeout(250)
            hint = page.inner_text("#scenarioHint")
            ok("시나리오 안내가 바뀜", bool(hint), hint)
            shot(page, "02-start-scenario")

            # 시작 → 플레이
            page.fill("#nameInput", "상훈")
            page.click('#genderChips .chip[data-g="남"]')
            page.click(".age-card[data-age='25']")
            page.click("#startBtn")
            page.wait_for_timeout(700)
            ok("플레이 화면 진입", page.is_visible("#screen-play"))

            probe = page.evaluate(PROBE)
            ok("플레이 화면 가로 넘침 0", not probe["overflow"], probe["overflow"][:4])
            for label, sel in ONE_LINE[6:]:
                info = page.evaluate(LINES_JS, sel)
                ok(f"{label} 한 줄", info and info["lines"] == 1 and info["sw"] <= info["cw"] + 1, info)
            # 상단 이름줄 ↔ 버튼줄 겹침
            bar = page.evaluate("""() => { const a = document.querySelector('.sb-actions'), w = document.querySelector('.sb-who');
                const ar = a.getBoundingClientRect(), wr = w.getBoundingClientRect();
                return {overflow: ar.right > innerWidth + 0.5, overlap: wr.right > ar.left + 0.5,
                        wrap: Math.round(ar.top) > Math.round(wr.top) + 2}; }""")
            ok("상단 바 넘침·겹침·두 줄 0", not bar["overflow"] and not bar["overlap"] and not bar["wrap"], bar)
            # 능력치 7칸 한 줄
            stat_rows = page.evaluate("""() => { const tops = new Set([...document.querySelectorAll('.stat')].map(e => Math.round(e.getBoundingClientRect().top))); return tops.size; }""")
            ok("능력치 7칸 한 줄", stat_rows == 1, stat_rows)
            shot(page, "03-play")

            # 선택지 → 결과
            page.locator(".choice").first.click()
            page.wait_for_timeout(500)
            ok("결과 표시", page.is_visible(".result"))
            shot(page, "04-play-result")

            # 하단 도크 겹침 (진행도 ↔ 버튼줄)
            dock = page.evaluate("""() => { const lb = document.querySelector('.lifebar'), bb = document.querySelector('.bottombar');
                if (!lb || !bb) return null; const a = lb.getBoundingClientRect(), b = bb.getBoundingClientRect();
                return {gap: Math.round(b.top - a.bottom), lbBottom: Math.round(a.bottom), bbTop: Math.round(b.top),
                        inView: Math.round(b.bottom) <= innerHeight + 1}; }""")
            ok("하단 진행도·도크 겹침 0", dock and dock["gap"] >= 0 and dock["inView"], dock)

        all_errors += session(p, step_start, hall=st["hall"], titles=st["titles"])

        # ── ② 엔딩 · 결과 카드 ────────────────────────────────────
        def step_ending(page):
            page.click("#resumeCard")
            page.wait_for_timeout(700)
            ok("엔딩 화면", page.is_visible("#screen-ending"))
            shot(page, "05-ending")
            page.evaluate("() => { document.getElementById('endingScroll').scrollTop = 99999; }")
            page.wait_for_timeout(300)
            shot(page, "06-ending-bottom")
            if page.is_visible("#endShare"):
                page.click("#endShare")
                page.wait_for_timeout(900)
                ok("결과 카드 미리보기", page.is_visible("#shareModal"))
                shot(page, "07-share-card")
                page.click("#smClose")
                page.wait_for_timeout(250)

        all_errors += session(p, step_ending, hall=st["hall"], save=st["ending"], titles=st["titles"])

        # ── ③ 명예의 전당 (내 전당 · 전체 랭킹) ─────────────────────
        def step_hall(page):
            page.click("#hallBtnStart")
            page.wait_for_timeout(400)
            probe = page.evaluate(PROBE)
            ok("전당 가로 넘침 0", not probe["overflow"], probe["overflow"][:4])
            shot(page, "08-hall-mine")
            page.click('.hall-view[data-view="global"]')
            page.wait_for_timeout(800)
            probe = page.evaluate(PROBE)
            ok("전체 랭킹 가로 넘침 0", not probe["overflow"], probe["overflow"][:4])
            for label, sel in [("전당·보기 탭", ".hall-view"), ("전당·정렬 탭", ".lg-sort")]:
                info = page.evaluate(LINES_JS_ALL, sel)
                ok(f"{label} 두 줄 아님", all(i["lines"] <= 1 for i in info) and all(i["sw"] <= i["cw"] + 1 for i in info), info)
            shot(page, "09-hall-global")

        all_errors += session(p, step_hall, hall=st["hall"], titles=st["titles"])

        # ── ④ 390×664 — 아이폰 사파리(주소창 포함) 한 화면 ──────────
        def step_small(page):
            m = page.evaluate("""() => { const sc = document.querySelector('.start-scroll');
                const row = document.getElementById('scenarioRow');
                return { overflow: sc.scrollHeight - sc.clientHeight,
                         chips: row.scrollWidth - row.clientWidth,
                         btn: Math.round(document.getElementById('startBtn').getBoundingClientRect().bottom) }; }""")
            ok("390×664 시작 화면 스크롤 0", m["overflow"] <= 0, m["overflow"])
            ok("390×664 시나리오 칩 한 줄", m["chips"] <= 1, m["chips"])
            ok("390×664 시작 버튼이 화면 안", m["btn"] <= 664, f"{m['btn']}px")
            shot(page, "10-start-390x664")

        all_errors += session(p, step_small, hall=st["hall"], titles=st["titles"], size=(390, 664))

    print()
    ok("콘솔 오류 0건", not all_errors, all_errors[:3])
    failed = [r for r in results if not r[0]]
    print(("전체 통과" if not failed else f"{len(failed)}개 실패") + f" · {len(results)}개 검사 · 스크린샷 {args.out}")
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
