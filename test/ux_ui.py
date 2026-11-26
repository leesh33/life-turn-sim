#!/usr/bin/env python3
"""인생 한 턴 — 390×844 UX 점검(2026-11-26) 수정 확인 · 증거 캡처

  python3 test/ux_ui.py --serve . --tag local
  python3 test/ux_ui.py --url https://life-turn-sim.vercel.app/ --tag live

확인하는 것 (REPORT.md 의 L1~L10)
  L7 상태바 — 8자 이름이 잘리지 않고, 전당·새로 시작은 ⋯ 메뉴 안
  L9 시작 화면 35세 타일이 한 칸 폭으로 가운데
  L3 1세 표기가 '생후 N개월'
  L1 칭호 팝업이 상태바·능력치를 덮지 않고, 카드를 눌러도 화면이 바뀌지 않으며, 2.5초 뒤 사라짐
  L2/L12 '한 달이 지났습니다'가 사건 카드·선택지를 덮지 않음
  L4 진행 중 '요약' — 닫기 줄 · 현재 나이 · 등급/결과 카드 없음
  L5 전당 탭 8개가 2줄로 다 보임
  L6 종료 화면 아바타 나이 = 마지막 나이(80)
"""
import argparse
import functools
import json
import os
import shutil
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from playwright.sync_api import sync_playwright

# 헤드리스 크로미움이 쓰는 공유 라이브러리(nss·atk 등)를 컨테이너 안에서 찾게 한다
for _d in ("/workspace/.local/nss/root/usr/lib/x86_64-linux-gnu",
           "/workspace/.local/chromelibs/root/usr/lib/x86_64-linux-gnu",
           "/workspace/.local/atklibs/usr/lib/x86_64-linux-gnu",
           "/workspace/.local/sysroot/usr/lib/x86_64-linux-gnu"):
    if os.path.isdir(_d):
        os.environ["LD_LIBRARY_PATH"] = _d + (":" + os.environ["LD_LIBRARY_PATH"] if os.environ.get("LD_LIBRARY_PATH") else "")

CHROME = "/workspace/.cache/ms-playwright/chromium-1134/chrome-linux/chrome"
W, H = 390, 844
OUT = "/workspace/downloads/ux-audit/fixed-life"
BEFORE = "/workspace/downloads/ux-audit"
results = []

DRIVE = """(targetAge) => {
  const s = window.Life.newGame({ name: '상훈', gender: '남', startAge: 1 });
  let guard = 0;
  while (guard++ < 4000) {
    if (s.age === targetAge && s.month === 12) break;
    const ev = window.Life.currentEvent(s);
    window.Life.choose(s, Math.floor(Math.random() * ev.choices.length));
    const r = window.Life.advance(s);
    if (r.graduation) window.Life.graduate(s, false);
  }
  window.Life.save(s);
  return { age: s.age, month: s.month, turns: s.history.length };
}"""


def check(name, ok, detail=""):
    results.append((ok, name, detail))
    print(("PASS · " if ok else "FAIL · ") + name + (" — " + str(detail) if detail != "" else ""))


def serve(root):
    handler = functools.partial(SimpleHTTPRequestHandler, directory=root)
    handler.log_message = lambda *a, **k: None
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, f"http://127.0.0.1:{httpd.server_address[1]}/"


def rect(pg, sel):
    return pg.evaluate(
        """(sel) => { const e = document.querySelector(sel); if (!e) return null;
             const r = e.getBoundingClientRect();
             return {x:r.x,y:r.y,w:r.width,h:r.height,top:r.top,bottom:r.bottom,left:r.left,right:r.right}; }""",
        sel,
    )


def overlap(a, b):
    if not a or not b:
        return 0
    ox = max(0, min(a["right"], b["right"]) - max(a["left"], b["left"]))
    oy = max(0, min(a["bottom"], b["bottom"]) - max(a["top"], b["top"]))
    return ox * oy


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--serve", default=None)
    ap.add_argument("--url", default=None)
    ap.add_argument("--tag", default="local")
    ap.add_argument("--save", default="/workspace/end-save.json")
    args = ap.parse_args()

    os.makedirs(OUT, exist_ok=True)
    httpd = None
    url = args.url
    if args.serve:
        httpd, url = serve(os.path.abspath(args.serve))
    save = json.load(open(args.save, encoding="utf-8"))

    errors = []
    tag = args.tag
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME if os.path.exists(CHROME) else None,
                              args=["--no-sandbox", "--disable-dev-shm-usage"])

        def fresh():
            ctx = b.new_context(viewport={"width": W, "height": H}, device_scale_factor=2,
                                is_mobile=True, has_touch=True, locale="ko-KR",
                                timezone_id="Asia/Seoul")
            pg = ctx.new_page()
            pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            pg.on("pageerror", lambda e: errors.append(str(e)))
            return ctx, pg

        def shot(pg, name):
            path = os.path.join(OUT, f"{tag}-{name}-390x844.png")
            pg.screenshot(path=path)
            return path

        # ─────────── ① 시작 화면 · 상태바 · 1세 표기 ───────────
        ctx, pg = fresh()
        pg.goto(url, wait_until="load")
        pg.wait_for_timeout(900)
        shot(pg, "01-start")

        card1 = rect(pg, '.age-card[data-age="1"]')
        card35 = rect(pg, '.age-card[data-age="35"]')
        check("L9 35세 타일이 한 칸 폭(1세 타일과 같은 폭)",
              card1 and card35 and abs(card1["w"] - card35["w"]) <= 1,
              f'1세 {card1["w"]:.0f}px · 35세 {card35["w"]:.0f}px' if card1 and card35 else "없음")
        check("L9 35세 타일이 가운데 정렬",
              card35 and abs((card35["left"] + card35["right"]) / 2 - W / 2) <= 1.5,
              f'중심 {((card35["left"] + card35["right"]) / 2):.1f}px' if card35 else "없음")

        longname = "가나다라마바사아"
        pg.click('.age-card[data-age="1"]')
        pg.fill("#nameInput", longname)
        pg.click("#startBtn")
        pg.wait_for_timeout(1000)
        shot(pg, "02-play-infant")

        # 칭호 팝업이 뜬 순간·사라진 순간을 정확히 재기 위한 관측기(첫 해금부터 잡는다)
        pg.evaluate("""() => {
          window.__badgeLog = {added:null, removed:null};
          const obs = new MutationObserver(( ms) => {
            ms.forEach(m => {
              m.addedNodes.forEach(n => { if (n.id === 'badgePop') window.__badgeLog.added = performance.now(); });
              m.removedNodes.forEach(n => { if (n.id === 'badgePop') window.__badgeLog.removed = performance.now(); });
            });
          });
          obs.observe(document.getElementById('app'), {childList:true});
        }""")

        name_w = pg.evaluate("""() => { const e = document.getElementById('whoName');
            return {text:e.textContent, clientW:e.clientWidth, scrollW:e.scrollWidth}; }""")
        check("L7 8자 이름이 잘리지 않는다", name_w["scrollW"] <= name_w["clientW"] + 1,
              f'{name_w["text"]} · {name_w["clientW"]}px / 필요 {name_w["scrollW"]}px')
        check("L7 상태바 한 줄에 3버튼 + ⋯ 메뉴",
              pg.is_visible("#fbBtnPlay") and pg.is_visible("#summaryBtn") and pg.is_visible("#moreBtn")
              and not pg.is_visible("#resetBtn"),
              "제보·요약·⋯ 보임 / 새로 시작은 접힘")
        sb = pg.evaluate("""() => { const s=document.getElementById('ageLabel'), d=document.getElementById('dayLabel');
            return {age:s.textContent, day:d.textContent}; }""")
        check("L3 상태바 1세는 '생후 1개월'", sb["age"] == "" and sb["day"] == "생후 1개월", f'{sb["age"]} · {sb["day"]}')
        badge = pg.inner_text("#eventCard .badge.age")
        check("L3 사건 배지도 '생후 1개월'", badge.strip() == "생후 1개월", badge)

        # ⋯ 메뉴
        pg.click("#moreBtn")
        pg.wait_for_timeout(150)
        check("L7 ⋯ 메뉴가 열린다", pg.is_visible("#hallBtnPlay") and pg.is_visible("#resetBtn"),
              "전당·새로 시작")
        pg.keyboard.press("Escape")
        pg.wait_for_timeout(150)

        # ─────────── ② 전환 표시 vs 사건 카드 (L2) ───────────
        pg.click("#choices .choice:not([disabled])")
        pg.wait_for_timeout(500)
        pg.click("#advanceBtn")
        worst = 0
        seen_pill_visible = False
        samples = []
        new_card_with_pill = 0
        for _ in range(24):
            info = pg.evaluate("""() => {
              const tw = document.querySelector('.timewarp');
              const card = document.getElementById('eventCard');
              const ch = document.querySelector('#choices .choice');
              const cs = tw ? getComputedStyle(tw) : null;
              const r = (e) => { if(!e) return null; const b=e.getBoundingClientRect(); return {left:b.left,top:b.top,right:b.right,bottom:b.bottom}; };
              return {op: cs ? parseFloat(cs.opacity) : 0, tw: r(tw), card: card && !card.classList.contains('leaving') ? r(card) : null, ch: r(ch)};
            }""")
            if info["op"] > 0.05:
                seen_pill_visible = True
                ov = max(overlap(info["tw"], info["ch"]), overlap(info["tw"], info["card"]))
                if ov > 0 and info["card"]:
                    new_card_with_pill += 1
                worst = max(worst, ov)
            samples.append(round(info["op"], 2))
            pg.wait_for_timeout(50)
        check("L2 전환 표시가 떠 있는 동안 새 사건 카드·선택지와 겹치지 않음", new_card_with_pill == 0,
              f"새 카드와 겹친 샘플 {new_card_with_pill}개 · 겹친 면적 {worst:.0f}px² · opacity {samples[:12]}")
        check("L2 전환 표시는 실제로 뜬다(회귀 방지)", seen_pill_visible, "관측됨")
        pg.wait_for_timeout(300)
        check("L2 새 사건 카드가 그려졌다", pg.is_visible("#choices .choice"), pg.inner_text("#eventCard .card-title")[:30])
        shot(pg, "03-transition-done")

        # ─────────── ③ 칭호 배지 팝업 (L1) ───────────
        pop_seen = False
        t_seen = None
        pop_click_ok = False
        for turn in range(16):
            if pg.query_selector("#badgePop"):
                pop_seen = True
                t_seen = time.time()
                break
            try:
                pg.click("#choices .choice:not([disabled])", timeout=3000)
            except Exception:
                break
            pg.wait_for_timeout(650)
            if pg.is_visible("#advanceBtn") and not pg.is_disabled("#advanceBtn"):
                pg.click("#advanceBtn")
                pg.wait_for_timeout(700)
        if pop_seen:
            shot(pg, "04-badge-pop")
            pop = rect(pg, "#badgePop")
            status = rect(pg, ".statusbar")
            dock = rect(pg, ".bottombar")
            check("L1 칭호 팝업이 상태바·능력치를 덮지 않음", pop and status and pop["top"] >= status["bottom"] - 1,
                  f'팝업 top {pop["top"]:.0f} ≥ 상태바 bottom {status["bottom"]:.0f}' if pop and status else "없음")
            check("L1 칭호 팝업이 하단 도크 위", pop and dock and pop["bottom"] <= dock["top"] + 2,
                  f'팝업 bottom {pop["bottom"]:.0f} ≤ 도크 top {dock["top"]:.0f}' if pop and dock else "없음")
            # 카드 가운데(버튼 바깥)를 눌러야 화면이 그대로여야 한다
            cx, cy = pop["left"] + pop["w"] * 0.35, pop["top"] + pop["h"] * 0.5
            pg.mouse.click(cx, cy)
            pg.wait_for_timeout(200)
            pop_click_ok = pg.is_visible("#screen-play") and not pg.is_visible("#titleModal")
            check("L1 팝업 카드를 눌러도 화면이 바뀌지 않음", pop_click_ok,
                  "플레이 화면 유지" if pop_click_ok else "화면이 바뀜")
            # 뜬 순간부터 2.5초(+ 접힘 애니메이션) 안에 사라져야 한다
            while time.time() - t_seen < 4.2 and pg.query_selector("#badgePop"):
                pg.wait_for_timeout(80)
            log = pg.evaluate("() => window.__badgeLog")
            lived = (log["removed"] - log["added"]) if log and log["added"] and log["removed"] else None
            check("L1 칭호 팝업이 2.5초 안에 사라짐(접힘 포함 3.2초 이내)",
                  pg.query_selector("#badgePop") is None and lived is not None and 2400 <= lived <= 3400,
                  f"화면에 떠 있던 시간 {lived:.0f}ms" if lived else "사라진 시각을 재지 못함")
        else:
            check("L1 칭호 배지 팝업 관측", False, "16턴 안에 칭호가 해금되지 않음")

        # '도감 →' 버튼 — 새 판에서 첫 칭호가 떴을 때 바로 누른다
        pop_btn_ok = False
        ctx_b, pg_b = fresh()
        pg_b.goto(url, wait_until="load")
        pg_b.wait_for_timeout(800)
        pg_b.click('.age-card[data-age="1"]')
        pg_b.fill("#nameInput", "도감테스트")
        pg_b.click("#startBtn")
        pg_b.wait_for_timeout(900)
        for turn in range(12):
            if pg_b.query_selector("#badgePop"):
                try:
                    pg_b.click("#badgePop .bp-open")
                    pg_b.wait_for_timeout(400)
                    pop_btn_ok = pg_b.is_visible("#titleModal")
                except Exception as e:
                    print("  (도감 버튼 클릭 예외:", e, ")")
                break
            if pg_b.query_selector("#choices .choice:not([disabled])"):
                pg_b.click("#choices .choice:not([disabled])", timeout=3000)
                pg_b.wait_for_timeout(650)
            if pg_b.is_visible("#advanceBtn") and not pg_b.is_disabled("#advanceBtn"):
                pg_b.click("#advanceBtn")
                pg_b.wait_for_timeout(700)
        check("L1 '도감 →' 버튼은 도감을 연다", pop_btn_ok, "칭호 도감 열림" if pop_btn_ok else "관측 못함")
        ctx_b.close()

        # ─────────── ④ 진행 중 요약 (L4) ───────────
        pg.wait_for_timeout(200)
        if not pg.is_visible("#screen-play"):
            pg.evaluate("() => window.scrollTo(0,0)")
        pg.click("#summaryBtn")
        pg.wait_for_timeout(500)
        shot(pg, "05-summary-top")
        check("L4 요약 화면에 고정 닫기 줄(✕ 플레이로)", pg.is_visible("#endHead") and pg.is_visible("#endClose"),
              pg.inner_text("#endClose") if pg.query_selector("#endClose") else "없음")
        body = pg.inner_text("#endingScroll")
        check("L4 진행 중에는 '현재 나이'", "현재 나이" in body and "마지막 나이" not in body,
              "현재 나이 ✓" if "현재 나이" in body else body[:60])
        check("L4 진행 중에는 등급·결과 카드 없음",
              pg.query_selector("#endingScroll .grade-row") is None and pg.query_selector("#endShare") is None,
              "등급 줄·결과 카드 없음")
        check("L4 진행 중 표시(진행 중 칩)", pg.is_visible(".sum-live"), pg.inner_text(".sum-live")[:40] if pg.query_selector(".sum-live") else "")
        pg.click("#endClose")
        pg.wait_for_timeout(400)
        check("L4 닫기 → 플레이 화면 복귀", pg.is_visible("#screen-play") and pg.is_visible("#eventCard"))

        # ─────────── ⑤ 전당 탭 8개 (L5) ───────────
        pg.click("#moreBtn")
        pg.wait_for_timeout(150)
        pg.click("#hallBtnPlay")
        pg.wait_for_timeout(600)
        shot(pg, "06-hall-tabs")
        tabs = pg.evaluate("""() => {
          const list = [...document.querySelectorAll('#hallTabs .hall-tab')];
          const rows = new Set(list.map(t => Math.round(t.getBoundingClientRect().top)));
          return {n: list.length, rows: rows.size,
                  right: Math.max(...list.map(t => t.getBoundingClientRect().right)),
                  labels: list.map(t => t.textContent.trim())};
        }""")
        check("L5 전당 탭 8개", tabs["n"] == 8, " · ".join(tabs["labels"]))
        check("L5 탭이 2줄로 접혀 모두 보인다", tabs["rows"] == 2, f'{tabs["rows"]}줄')
        check("L5 마지막 탭이 화면 안에 있다", tabs["right"] <= W, f'오른쪽 끝 {tabs["right"]:.1f}px ≤ {W}')
        pg.click("#hallBack")
        pg.wait_for_timeout(500)

        # ─────────── ⑥ 종료 화면 나이 (L6) ───────────
        ctx.close()
        ctx2, pg2 = fresh()
        pg2.add_init_script("""
            try { localStorage.setItem('lifeTurnSim.save.v1', %s); } catch (e) {}
        """ % json.dumps(json.dumps(save, ensure_ascii=False)))
        pg2.goto(url, wait_until="load")
        pg2.wait_for_timeout(900)
        pg2.click("#resumeCard")
        pg2.wait_for_timeout(900)
        pg2.click("#choices .choice:not([disabled])")
        pg2.wait_for_timeout(500)
        pg2.click("#advanceBtn")
        pg2.wait_for_timeout(1800)
        shot(pg2, "07-ending")
        end = pg2.inner_text("#endingScroll")
        avatar_age = pg2.inner_text(".end-avatar span") if pg2.query_selector(".end-avatar span") else ""
        check("L6 아바타 나이 = 마지막 나이 80", "80세의 모습" in avatar_age and "81" not in avatar_age, avatar_age)
        check("L6 종료 화면 '마지막 나이 80세'", "마지막 나이" in end and "80세" in end, "마지막 나이 80세" if "80세" in end else "")
        check("L10 요약 문장 구분자 통일", " · " in end and not any(
            s in end for s in ["멘탈 56,", "매력 60,", "호감도 70,"]), "쉼표 나열 없음")
        check("L6 종료 화면에는 닫기 줄이 없다(진짜 엔딩)", not pg2.is_visible("#endHead"))
        check("종료 화면 등급·결과 카드 유지", pg2.query_selector(".grade-row") is not None and pg2.query_selector("#endShare") is not None)
        ctx2.close()

        # ─────────── ⑦ 졸업 결산 전환 (L12) ───────────
        ctx3, pg3 = fresh()
        pg3.goto(url, wait_until="load")
        pg3.wait_for_timeout(900)
        pg3.evaluate(DRIVE, 7)
        pg3.reload(wait_until="load")
        pg3.wait_for_timeout(900)
        pg3.click("#resumeCard")
        pg3.wait_for_timeout(900)
        pg3.click("#choices .choice:not([disabled])")
        pg3.wait_for_timeout(500)
        pg3.click("#advanceBtn")
        pill_on_grad = 0
        pill_seen = False
        for _ in range(26):
            info = pg3.evaluate("""() => {
              const tw = document.querySelector('.timewarp');
              const cs = tw ? getComputedStyle(tw) : null;
              const grad = document.getElementById('screen-grad');
              const hero = document.querySelector('#gradScroll .grad-hero, #gradScroll .recall-card');
              const gs = grad ? getComputedStyle(grad) : null;
              const r = (e) => { if(!e) return null; const b=e.getBoundingClientRect(); return {left:b.left,top:b.top,right:b.right,bottom:b.bottom}; };
              return {op: cs ? parseFloat(cs.opacity) : 0, tw: r(tw), hero: r(hero),
                      gradOn: !!gs && gs.display !== 'none'};
            }""")
            if info["op"] > 0.05:
                pill_seen = True
                if info["gradOn"] and overlap(info["tw"], info["hero"]) > 0:
                    pill_on_grad += 1
            pg3.wait_for_timeout(50)
        pg3.wait_for_timeout(400)
        shot(pg3, "09-grad")
        check("L12 졸업 결산이 전환 표시와 겹치지 않음", pill_seen and pill_on_grad == 0,
              f"겹친 샘플 {pill_on_grad}개")
        check("L12 졸업 결산 화면 도착", pg3.is_visible("#screen-grad"), pg3.inner_text("#gradScroll .grad-name") if pg3.query_selector("#gradScroll .grad-name") else "")
        ctx3.close()

        check("콘솔·페이지 오류 0", len(errors) == 0, " / ".join(errors[:3]))
        b.close()

    if httpd:
        httpd.shutdown()

    fails = [r for r in results if not r[0]]
    print(f"\nUX 라이브 확인: {len(results) - len(fails)} / {len(results)} 통과 · 스크린샷 {OUT}")
    if fails:
        print("실패: " + " / ".join(r[1] for r in fails))
        raise SystemExit(1)


if __name__ == "__main__":
    main()
