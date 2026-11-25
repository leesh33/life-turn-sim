#!/usr/bin/env python3
"""2026-11-25 수정분 실화면 검사 (390×844) — 라이브/로컬 모두.

  python3 test/fixes_ui.py --url https://life-turn-sim.vercel.app/ --tag live --out /workspace/verify-shots
  python3 test/fixes_ui.py --serve . --tag local --out /workspace/verify-shots --saves /workspace/.tmp

하는 일
  1. 시작 화면 — 이름 칸 안내문이 '나', 출발 시나리오 '기본 한국 현실'이 🏠
  2. 고3 원서 — 수능 당일 '명문대'가 켜진 저장본에서 원서 '전문대'를 고르면
     고교 졸업 결산 태그에 '전문대 진학'만 남는가 (명문대/지방대 중복 0)
  3. 24세 결산 — 전문대 저장본의 졸업식 이름이 '전문대 졸업식'인가
  4. 다시 뽑기 — 취직(마일스톤) 화면에서 버튼이 '중요한 사건'으로 꺼져 있는가
  5. 가로 넘침 0 · 스크린샷 저장
"""
import argparse
import functools
import json
import os
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from playwright.sync_api import sync_playwright

CHROME = "/workspace/.cache/ms-playwright/chromium-1134/chrome-linux/chrome"
W, H = 390, 844
KEY = "lifeTurnSim.save.v1"
results = []


def check(name, ok, detail=""):
    results.append((ok, name, detail))
    print(("PASS · " if ok else "FAIL · ") + name + (" — " + str(detail) if detail != "" else ""))


def serve(root):
    handler = functools.partial(SimpleHTTPRequestHandler, directory=root)
    handler.log_message = lambda *a, **k: None
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, f"http://127.0.0.1:{httpd.server_address[1]}/"


def read_save(folder, name):
    with open(os.path.join(folder, "save-%s.json" % name), encoding="utf-8") as f:
        return f.read()


def page_with(ctx, url, save_text):
    pg = ctx.new_page()
    if save_text is not None:
        pg.add_init_script("try { localStorage.setItem(%s, %s); } catch (e) {}"
                           % (json.dumps(KEY), json.dumps(save_text)))
    pg.goto(url, wait_until="load")
    pg.wait_for_timeout(900)
    return pg


def resume(pg):
    """이어하기 카드가 그려질 때까지 기다렸다 누른다.
    부팅이 느리거나 첫 로드에서 저장본을 못 읽은 판은 한 번 새로고침해 다시 심는다."""
    try:
        pg.wait_for_selector("#resumeCard", state="visible", timeout=6000)
    except Exception:
        pg.reload(wait_until="load")
        pg.wait_for_timeout(1000)
        pg.wait_for_selector("#resumeCard", state="visible", timeout=15000)
    pg.click("#resumeCard")
    pg.wait_for_timeout(800)


def no_overflow(pg):
    return pg.evaluate("() => document.documentElement.scrollWidth <= window.innerWidth + 1")


def run(browser, url, tag, out, saves):
    # ── 1) 시작 화면 ──
    ctx = browser.new_context(viewport={"width": W, "height": H}, device_scale_factor=2,
                              is_mobile=True, has_touch=True)
    pg = page_with(ctx, url, None)
    ph = pg.get_attribute("#nameInput", "placeholder")
    check("이름 칸 안내문이 '상훈'이 아니다", ph != "상훈", repr(ph))
    emojis = pg.eval_on_selector_all("#scenarioRow .scenario-chip", "els => els.map(e => e.textContent)")
    check("출발 시나리오에 국기 이모지 없음", all("🇰🇷" not in (t or "") for t in emojis),
          " / ".join((t or "").strip()[:12] for t in emojis[:4]))
    check("출발 시나리오 첫 칸이 🏠", bool(emojis) and "🏠" in emojis[0], (emojis[0] or "").strip()[:20] if emojis else "없음")
    check("시작 화면 가로 넘침 없음", no_overflow(pg))
    pg.screenshot(path=os.path.join(out, f"fixes-{tag}-01-start.png"))

    # ── 2) 고3 원서 → 고교 졸업 결산 태그 ──
    pg2 = page_with(ctx, url, read_save(saves, "csat19"))
    resume(pg2)
    check("이어하기 카드가 뜬다", True)
    ev_title = pg2.inner_text(".card-title") if pg2.query_selector(".card-title") else ""
    check("원서 접수 화면이 열린다", "원서" in ev_title, ev_title)
    labels = pg2.eval_on_selector_all("#choices .choice", "els => els.map(e => e.textContent)")
    idx = next((i for i, t in enumerate(labels) if "전문대" in t), None)
    check("원서에 '전문대 실용학과' 선택지", idx is not None, " / ".join((t or "").strip()[:14] for t in labels))
    pg2.click("#choices .choice:nth-child(%d)" % (idx + 1))
    pg2.wait_for_timeout(400)
    pg2.screenshot(path=os.path.join(out, f"fixes-{tag}-02-choice.png"))
    # 12개월차로 넘기고 → 생일(20세)에서 고교 졸업 결산
    for _ in range(3):
        if pg2.is_visible("#gradRegister"):
            break
        if pg2.is_visible("#advanceBtn"):
            pg2.click("#advanceBtn")
            pg2.wait_for_timeout(700)
        if pg2.is_visible("#choices .choice:not([disabled])"):
            pg2.click("#choices .choice:not([disabled])")
            pg2.wait_for_timeout(300)
    pg2.wait_for_timeout(500)
    kicker = pg2.inner_text(".grad-kicker") if pg2.query_selector(".grad-kicker") else ""
    tags = [t.strip() for t in pg2.eval_on_selector_all(".grad-tags .tag", "els => els.map(e => e.textContent)")]
    check("고교 졸업 결산이 열린다", "고등학교 졸업" in kicker, kicker)
    check("태그에 '전문대 진학'이 있다", any("전문대 진학" == t for t in tags), " / ".join(tags))
    check("태그에 '명문대 진학'이 남지 않는다", not any("명문대 진학" == t for t in tags), " / ".join(tags))
    check("태그에 '지방대 진학'이 남지 않는다", not any("지방대 진학" == t for t in tags), " / ".join(tags))
    check("진학 태그는 하나뿐", sum(1 for t in tags if "진학" in t) <= 1, " / ".join(tags))
    check("졸업 결산 가로 넘침 없음", no_overflow(pg2))
    pg2.screenshot(path=os.path.join(out, f"fixes-{tag}-03-grad-high.png"))
    if pg2.query_selector(".grad-tags"):
        pg2.locator(".grad-tags").scroll_into_view_if_needed()
    pg2.wait_for_timeout(400)
    pg2.screenshot(path=os.path.join(out, f"fixes-{tag}-03b-grad-tags.png"))
    pg2.close()

    # ── 3) 24세 전문대 결산 ──
    pg3 = page_with(ctx, url, read_save(saves, "college24"))
    resume(pg3)
    if pg3.is_visible("#choices .choice:not([disabled])"):
        pg3.click("#choices .choice:not([disabled])")
        pg3.wait_for_timeout(350)
    for _ in range(4):
        if pg3.is_visible("#gradRegister"):
            break
        if pg3.is_visible("#advanceBtn"):
            pg3.click("#advanceBtn")
            pg3.wait_for_timeout(700)
        if pg3.is_visible("#choices .choice:not([disabled])"):
            pg3.click("#choices .choice:not([disabled])")
            pg3.wait_for_timeout(300)
    pg3.wait_for_timeout(500)
    name = pg3.inner_text(".grad-name") if pg3.query_selector(".grad-name") else ""
    sub = pg3.inner_text(".grad-sub") if pg3.query_selector(".grad-sub") else ""
    check("24세 결산 이름이 '전문대 졸업식'", name.strip() == "전문대 졸업식", name)
    check("24세 결산 부제에 '전문대 2년'", "전문대 2년" in sub, sub)
    check("24세 결산에 '대학교 5년'이 없다", "대학교 5년" not in sub, sub)
    check("24세 결산 가로 넘침 없음", no_overflow(pg3))
    pg3.screenshot(path=os.path.join(out, f"fixes-{tag}-04-grad-college.png"))
    pg3.close()

    # ── 4) 다시 뽑기 — 마일스톤 ──
    pg4 = page_with(ctx, url, read_save(saves, "milestone25"))
    resume(pg4)
    title = pg4.inner_text(".card-title") if pg4.query_selector(".card-title") else ""
    sub = pg4.inner_text("#rewardReroll .rb-sub") if pg4.query_selector("#rewardReroll") else ""
    disabled = pg4.get_attribute("#rewardReroll", "disabled") is not None
    check("취직(마일스톤) 화면", "취직" in title, title)
    check("다시 뽑기 버튼이 꺼져 있다", disabled, "disabled=" + str(disabled))
    check("다시 뽑기 안내가 '중요한 사건'", "중요한 사건" in sub, sub)
    check("다시 뽑기 버튼 가로 넘침 없음", no_overflow(pg4))
    pg4.screenshot(path=os.path.join(out, f"fixes-{tag}-05-reroll.png"))
    pg4.close()

    # ── 5) 다시 뽑기 — 보통 사건은 남은 횟수와 함께 켜진다 ──
    pg5 = page_with(ctx, url, read_save(saves, "normal26"))
    resume(pg5)
    title5 = pg5.inner_text(".card-title") if pg5.query_selector(".card-title") else ""
    sub5 = pg5.inner_text("#rewardReroll .rb-sub") if pg5.query_selector("#rewardReroll") else ""
    en5 = pg5.get_attribute("#rewardReroll", "disabled") is None
    check("보통 사건에서는 다시 뽑기가 켜진다", en5, title5)
    check("다시 뽑기 안내에 남은 횟수(5회)", "5회" in sub5, sub5)
    pg5.screenshot(path=os.path.join(out, f"fixes-{tag}-06-reroll-ok.png"))
    pg5.close()
    ctx.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--serve", default=None)
    ap.add_argument("--url", default=None)
    ap.add_argument("--tag", default="local")
    ap.add_argument("--out", default="/workspace/verify-shots")
    ap.add_argument("--saves", default="/workspace/.tmp")
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)

    httpd = None
    url = args.url
    if args.serve:
        httpd, url = serve(args.serve)
    if not url:
        raise SystemExit("--url 또는 --serve 가 필요합니다")

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME if os.path.exists(CHROME) else None,
                                    args=["--no-sandbox"])
        run(browser, url, args.tag, args.out, args.saves)
        browser.close()
    if httpd:
        httpd.shutdown()

    fails = [r for r in results if not r[0]]
    print("\n실화면 검사: %d / %d 통과" % (len(results) - len(fails), len(results)))
    if fails:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
