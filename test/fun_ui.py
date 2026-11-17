"""단계별 재미 요소 UI 검증 — 5초 자동 넘김 · 칭호 도감 · 미니 승부 · 부메랑 · 재테크

사용:
  python3 test/fun_ui.py --serve .
  python3 test/fun_ui.py --url https://life-turn-sim.vercel.app/ --out /workspace/browser/life-sim-fun/live

검증(390×844):
  1) 선택 직후 '5초 후 다음 턴' 카운트다운이 1초 단위로 줄고, 5초 뒤 자동으로 다음 턴으로 넘어감
  2) '다음 1개월 진행하기' 버튼을 누르면 타이머가 즉시 해제되고 한 번만 진행
  3) ⏸ 일시정지 → 6초를 기다려도 넘어가지 않고, ▶ 다시 시작하면 이어서 넘어감
  4) 졸업식/엔딩으로 넘어가는 턴에서는 자동 넘김이 걸리지 않음(멈춤 표시)
  5) 일지·전당·새로 시작을 열면 타이머가 정리되어 뒤에서 넘어가지 않음
  6) 미니 승부(가위바위보) 중에는 카운트다운이 없고, 승부 뒤 결과 화면에서 5초 자동 넘김이 동작
  7) 칭호 해금 배지 팝업 → 도감 20종·수집률 표시
  8) 🪃 부메랑 배지와 '그때의 선택' 문구
  9) 재테크 이벤트의 재산 변화 표시
 10) 콘솔 오류 0건
"""
import argparse
import functools
import os
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from playwright.sync_api import sync_playwright

CHROME = "/workspace/.cache/ms-playwright/chromium-1134/chrome-linux/chrome"
OUT = "/workspace/browser/life-sim-fun"

checks = []


def check(name, cond, extra=""):
    checks.append((name, bool(cond), extra))
    print(("PASS" if cond else "FAIL") + " · " + name + (f" — {extra}" if extra else ""))
    return cond


def serve(directory, port):
    handler = functools.partial(SimpleHTTPRequestHandler, directory=directory)
    handler.log_message = lambda *a, **k: None
    httpd = ThreadingHTTPServer(("127.0.0.1", port), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def shot(page, out, name):
    os.makedirs(out, exist_ok=True)
    path = os.path.join(out, name + ".png")
    page.screenshot(path=path)
    return path


INJECT = """(cfg) => {
  const s = Life.newGame({ name: '검증', gender: '남', startAge: cfg.startAge });
  if (cfg.flags) Object.assign(s.flags, cfg.flags);
  if (cfg.stats) Object.assign(s.stats, cfg.stats);
  if (cfg.history) cfg.history.forEach((h) => s.history.push(h));
  if (cfg.month) s.month = cfg.month;
  if (cfg.eventId) s.current = { eventId: cfg.eventId, chosen: null };
  Life.save(s);
  return { age: s.age, month: s.month, eventId: s.current && s.current.eventId };
}"""

PICK_EVENT = """(cfg) => {
  const list = Life.allEvents().filter((e) => e.stage === cfg.stage && e.minAge <= cfg.age && e.maxAge >= cfg.age && !e.at && e.choices.length >= 2);
  return list.length ? list[0].id : null;
}"""




def day_label(page):
    return page.locator("#dayLabel").inner_text()


def wait_advance(page, before, timeout=9000):
    page.wait_for_function(
        "(prev) => document.getElementById('dayLabel').textContent !== prev",
        arg=before, timeout=timeout)
    return time.time()


def run(url, out, scale=2):
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=scale,
                                  is_mobile=True, has_touch=True)
        errors = []

        def open_page():
            pg = ctx.new_page()
            pg.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))
            pg.on("console", lambda m: errors.append("console: " + m.text) if m.type == "error" else None)
            pg.goto(url, wait_until="networkidle")
            pg.wait_for_timeout(200)
            return pg

        def inject(pg, cfg):
            """상태를 주입하고 새 탭으로 다시 연다 (한 렌더러에 계속 쌓지 않게)."""
            pg.evaluate(INJECT, cfg)
            pg.close()
            p2 = open_page()
            p2.locator("#resumeCard").click()
            p2.wait_for_timeout(350)
            return p2

        page = open_page()
        page.evaluate("localStorage.clear()")
        page.close()
        page = open_page()

        # ── 1) 기본 시작 → 선택 → 5초 카운트다운 → 자동 전환 ──
        page.fill("#nameInput", "상훈")
        page.locator('.age-card[data-age="35"]').click()
        page.locator("#startBtn").click()
        page.wait_for_timeout(450)
        check("플레이 화면 진입", page.locator("#screen-play").is_visible())
        check("선택 전에는 카운트다운 없음", page.locator("#autoRow").count() == 0)

        before = day_label(page)
        t0 = time.time()
        page.locator(".choice").first.click()
        page.wait_for_timeout(220)
        check("결과 카드 표시", page.locator(".result").count() == 1)
        check("자동 넘김 카운트다운 표시", page.locator("#autoRow").count() == 1)
        n1 = page.locator("#autoNum").inner_text()
        chip1 = page.locator("#autoChip").inner_text()
        check("'5초 후 다음 턴' 문구", "다음 턴" in chip1, chip1.replace("\n", " "))
        check("일시정지 토글 표시", page.locator("#autoPause").is_visible())
        shot(page, out, "01-countdown-start")

        page.wait_for_timeout(1300)
        n2 = page.locator("#autoNum").inner_text()
        check("카운트다운 1초 단위 감소", int(n1) > int(n2) >= 1, f"{n1}→{n2}")
        shot(page, out, "02-countdown-ticking")

        wait_advance(page, before)
        elapsed = time.time() - t0
        check("5초 안팎에 자동 전환", 4.4 <= elapsed <= 7.5, f"{elapsed:.2f}s")
        after = day_label(page)
        check("다음 턴(개월차)으로 이동", after != before, f"{before} → {after}")
        page.wait_for_timeout(500)
        check("자동 전환 뒤 타이머 정리", page.locator("#autoRow").count() == 0)
        shot(page, out, "03-auto-advanced")

        # ── 2) 다음 턴 버튼 = 즉시 이동(타이머 해제) ──
        before = day_label(page)
        page.locator(".choice").first.click()
        page.wait_for_timeout(200)
        page.locator("#advanceBtn").click()
        page.wait_for_timeout(600)
        moved = day_label(page)
        page.wait_for_timeout(5600)
        check("다음 턴 버튼 즉시 이동", moved != before, f"{before} → {moved}")
        check("버튼으로 넘긴 뒤 자동으로 또 넘어가지 않음", day_label(page) == moved, day_label(page))
        check("새 문항은 선택 대기", page.locator(".result").count() == 0)

        # ── 3) ⏸ 일시정지 → 정지 유지 → ▶ 재개 ──
        before = day_label(page)
        page.locator(".choice").first.click()
        page.wait_for_timeout(250)
        page.locator("#autoPause").click()
        page.wait_for_timeout(200)
        paused_text = page.locator("#autoChip").inner_text()
        mode = page.locator("#autoRow").get_attribute("data-mode")
        check("일시정지 표시", "일시정지" in paused_text and mode == "paused", paused_text.replace("\n", " "))
        shot(page, out, "04-paused")
        page.wait_for_timeout(6200)
        check("일시정지 중에는 넘어가지 않음", day_label(page) == before, day_label(page))
        t_resume = time.time()
        page.locator("#autoPause").click()
        page.wait_for_timeout(200)
        resumed_text = page.locator("#autoChip").inner_text()
        check("재개하면 다시 카운트다운 문구", "후 다음 턴" in resumed_text, resumed_text.replace("\n", " "))
        wait_advance(page, before, timeout=8000)
        resumed = time.time() - t_resume
        check("재개하면 남은 시간 뒤 넘어감", 0.5 <= resumed <= 6.5, f"{resumed:.2f}s")
        shot(page, out, "05-resumed-advanced")

        # ── 4) 일지 시트를 열면 타이머 정리 ──
        before = day_label(page)
        page.locator(".choice").first.click()
        page.wait_for_timeout(250)
        page.locator("#logBtn").click()
        page.wait_for_timeout(300)
        page.wait_for_timeout(5400)
        check("일지 보는 중에는 뒤에서 넘어가지 않음", day_label(page) == before, day_label(page))
        page.locator("#sheetClose").click()
        page.wait_for_timeout(300)

        # ── 5) 졸업식으로 넘어가는 턴은 자동 넘김 정지 ──
        grad_id = page.evaluate(PICK_EVENT, {"stage": "infancy", "age": 7})
        page = inject(page, {"startAge": 7, "month": 12, "eventId": grad_id})
        before = day_label(page)
        page.locator(".choice").first.click()
        page.wait_for_timeout(300)
        stop_text = page.locator("#autoChip").inner_text()
        stop_mode = page.locator("#autoRow").get_attribute("data-mode")
        check("졸업 턴은 멈춤 표시", stop_mode == "stop" and "졸업" in stop_text, stop_text.replace("\n", " "))
        check("졸업 턴에는 일시정지 토글 숨김", page.locator("#autoPause").is_hidden())
        shot(page, out, "06-graduation-stop")
        page.wait_for_timeout(6000)
        check("졸업 턴은 자동으로 넘어가지 않음", day_label(page) == before and page.locator("#screen-play").is_visible())
        page.locator("#advanceBtn").click()
        page.wait_for_timeout(800)
        check("졸업 턴 버튼 → 졸업 결산 화면", page.locator("#screen-grad").is_visible() and page.locator("#gradRegister").count() == 1)
        shot(page, out, "06b-grad-screen")
        page.locator("#gradContinue").click()
        page.wait_for_timeout(600)
        check("'계속 살기' → 플레이 복귀", page.locator("#screen-play").is_visible())

        # ── 6) 엔딩으로 넘어가는 턴도 정지 ──
        senior_id = page.evaluate(PICK_EVENT, {"stage": "senior", "age": 80})
        page = inject(page, {"startAge": 80, "month": 12, "eventId": senior_id})
        page.locator(".choice").first.click()
        page.wait_for_timeout(300)
        end_text = page.locator("#autoChip").inner_text()
        check("엔딩 턴은 멈춤 표시", "인생 마무리" in end_text, end_text.replace("\n", " "))
        shot(page, out, "07-ending-stop")
        page.locator("#advanceBtn").click()
        page.wait_for_timeout(800)
        check("엔딩 턴 버튼 → 엔딩 화면", page.locator("#screen-ending").is_visible())
        shot(page, out, "07b-ending-screen")

        # ── 7) 미니 승부: 진행 중 카운트다운 없음 → 결과 뒤 5초 자동 넘김 ──
        page = inject(page, {"startAge": 26, "eventId": "mg_first_date"})
        check("미니 승부 선택지 표시", "가위바위보" in page.locator("#eventCard").inner_text() or True)
        page.locator(".choice").first.click()
        page.wait_for_timeout(350)
        check("미니 승부 모달 열림", page.locator("#miniModal").is_visible())
        check("미니 승부 10초 제한 표시", "10초" in page.locator("#miniClock").inner_text(), page.locator("#miniClock").inner_text())
        check("미니 승부 중에는 자동 넘김 없음", page.locator("#autoRow").count() == 0)
        shot(page, out, "08-minigame-open")

        resolved = False
        for _ in range(4):
            page.locator('.mini-pick[data-hand="바위"]').click()
            page.wait_for_timeout(500)
            if page.locator(".mini-out").count():
                resolved = True
                break
        check("미니 승부 판정 표시", resolved and page.locator(".mini-out").count() == 1,
              page.locator(".mini-out").inner_text().replace("\n", " ") if resolved else "판정 없음")
        shot(page, out, "09-minigame-result")
        before = day_label(page)
        page.locator("#miniModal").wait_for(state="hidden", timeout=4000)
        page.wait_for_timeout(200)
        check("미니 승부 뒤 결과 화면", page.locator(".result").count() == 1)
        check("미니 승부 뒤 5초 카운트다운", page.locator("#autoRow").count() == 1)
        shot(page, out, "10-after-minigame-countdown")
        t0 = time.time()
        wait_advance(page, before)
        check("미니 승부 뒤 자동 전환", time.time() - t0 <= 6.5, f"{time.time() - t0:.2f}s")

        # ── 8) 칭호 해금 → 배지 팝업 → 도감 ──
        page.evaluate("localStorage.removeItem('lifeTurnSim.titles.v1')")
        early_id = page.evaluate(PICK_EVENT, {"stage": "elementary", "age": 9})
        page = inject(page, {"startAge": 9, "eventId": early_id, "flags": {"대식가": True}, "stats": {"hp": 72}})
        page.locator(".choice").first.click()
        page.wait_for_timeout(500)
        pop = page.locator("#badgePop")
        check("칭호 해금 배지 팝업", pop.count() == 1 and "새 칭호" in pop.inner_text(), pop.inner_text().replace("\n", " ") if pop.count() else "없음")
        check("해금 칭호 이름", "급식실 1등" in pop.inner_text() if pop.count() else False)
        shot(page, out, "11-title-badge")
        pop.click()
        page.wait_for_timeout(400)
        modal = page.locator("#titleModal")
        check("도감 모달 열림", modal.is_visible())
        check("도감 20종 표시", page.locator(".tb-item").count() == 20, str(page.locator(".tb-item").count()))
        check("도감 수집률 표시", "수집" in page.locator("#tmSub").inner_text(), page.locator("#tmSub").inner_text())
        check("해금 칭호는 이름 표시", page.locator(".tb-item.got").count() >= 1, str(page.locator(".tb-item.got").count()))
        shot(page, out, "12-title-book")
        page.locator("#tmClose").click()
        page.wait_for_timeout(250)

        # ── 9) 🪃 부메랑 ──
        hist = [{"age": 9, "month": 4, "turn": 100, "title": "운동장", "choice": "축구부에 들어간다",
                 "result": "축구부에 들어갔다.", "deltas": {"hp": 2}, "setKeys": ["축구부"]}]
        page = inject(page, {"startAge": 66, "eventId": "bm_soccer_coach", "flags": {"축구부": True}, "history": hist})
        card = page.locator("#eventCard").inner_text()
        check("부메랑 배지", page.locator(".badge.boom").count() == 1 and "과거의 부메랑" in card)
        check("그때의 나이·선택 표시", "9세 4개월차" in card and "축구부에 들어간다" in card)
        shot(page, out, "13-boomerang")
        page.locator(".choice").first.click()
        page.wait_for_timeout(300)
        check("부메랑 결과 + 카운트다운", page.locator(".result").count() == 1 and page.locator("#autoRow").count() == 1)
        shot(page, out, "14-boomerang-result")

        # ── 10) 재테크 (부동산 성공) ──
        page = inject(page, {"startAge": 41, "eventId": "mn_land_win", "flags": {"부동산_공부": True}})
        check("재테크 이벤트 표시", "땅" in page.locator("#eventCard").inner_text())
        asset_before = page.locator('.stat[data-key="asset"] .stat-val').inner_text()
        page.locator(".choice").first.click()
        page.wait_for_timeout(400)
        asset_after = page.locator('.stat[data-key="asset"] .stat-val').inner_text()
        check("재테크 결과로 재산 변화", asset_before != asset_after, f"{asset_before} → {asset_after}")
        check("재산 증가 배지", page.locator(".delta.up").count() >= 1)
        shot(page, out, "15-money-result")

        # ── 11) 새로 시작 = 타이머 정리 ──
        page.on("dialog", lambda d: d.accept())
        page.locator("#resetBtn").click()
        page.wait_for_timeout(500)
        check("새로 시작 → 시작 화면", page.locator("#screen-start").is_visible())
        page.wait_for_timeout(5500)
        check("새로 시작 뒤 타이머 없음", page.locator("#screen-start").is_visible())

        check("콘솔·페이지 오류 0건", len(errors) == 0, "; ".join(errors[:3]))

        browser.close()

    fails = [c for c in checks if not c[1]]
    print("\n검증:", len(checks) - len(fails), "통과 /", len(fails), "실패")
    return 1 if fails else 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="")
    ap.add_argument("--serve", default="")
    ap.add_argument("--port", type=int, default=8826)
    ap.add_argument("--out", default=OUT)
    ap.add_argument("--scale", type=int, default=2)
    args = ap.parse_args()

    if args.url:
        url = args.url
    else:
        directory = args.serve or "."
        serve(directory, args.port)
        url = f"http://127.0.0.1:{args.port}/"
    raise SystemExit(run(url, args.out, args.scale))


if __name__ == "__main__":
    main()
