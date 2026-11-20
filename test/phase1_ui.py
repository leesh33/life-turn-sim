#!/usr/bin/env python3
"""Phase 1 화면 검증 — 출발 시나리오 · 가문 이어받기 · 효과음 토글 · 엔딩 결과 카드
(로컬 · 라이브 공용)

  node test/mkphase1-states.js                               # 단계별 저장본 만들기
  python3 test/phase1_ui.py --serve .                        # 로컬
  python3 test/phase1_ui.py --url https://life-turn-sim.vercel.app/ --tag live

하는 일 (390×844 실제 화면)
  1. 시작 화면 — 시나리오 칩 4개가 390 폭 한 줄에 다 들어오고, 누르면 선택·안내가 바뀐다
  2. 가문 이어받기 — 전당 기록이 있을 때만 줄이 보이고, 모달에서 상훈(2대)을 고르면 요약이 바뀐다
  3. 재벌가 + 가문으로 시작 — 저장본에 scenario/legacy/대수, 안내 토스트, 상단 🔊 토글(끄면 🔇·저장)
  4. 엔딩 — 📸 결과 카드 → 미리보기(1080×1350) → 이미지 저장 → 받은 PNG 크기·파일명 확인
  5. 390×664 시작 화면 — 시나리오 줄이 붙어도 스크롤 없이 한 화면
  6. 콘솔 오류 0건

※ 이 환경은 페이지를 여러 번 다시 열면 리소스가 모자라 스크립트가 빠진다.
   그래서 단계마다 브라우저를 새로 띄워 페이지는 한 번만 열고, 상태는
   test/mkphase1-states.js 가 만든 저장본을 심는다(README 의 저장본 주입 방식).
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


def serve(directory, port):
    handler = functools.partial(SimpleHTTPRequestHandler, directory=directory)
    handler.log_message = lambda *a, **k: None
    httpd = ThreadingHTTPServer(("127.0.0.1", port), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def png_size(path):
    """PNG 헤더에서 가로·세로를 읽는다 (PIL 없이)."""
    with open(path, "rb") as f:
        head = f.read(33)
    if head[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    width = int.from_bytes(head[16:20], "big")
    height = int.from_bytes(head[20:24], "big")
    return width, height


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--serve", default=None)
    ap.add_argument("--url", default=None)
    ap.add_argument("--out", default="/workspace/downloads/life-sim-phase1")
    ap.add_argument("--tag", default="local")
    args = ap.parse_args()

    with open(STATE_FILE, encoding="utf-8") as f:
        st = json.load(f)

    httpd = None
    if args.serve:
        httpd = serve(args.serve, 8878)
        url = "http://127.0.0.1:8878/"
    else:
        url = args.url
    os.makedirs(args.out, exist_ok=True)

    results = []

    def ok(name, cond, extra=""):
        results.append((bool(cond), name, extra))
        print(("PASS" if cond else "FAIL") + " · " + name + ((" — " + str(extra)) if extra else ""))

    def session(p, hall, save, titles, fn, size=(390, 844), dsf=2):
        """브라우저를 새로 띄워 페이지를 한 번만 연다 (저장본 주입)"""
        browser = p.chromium.launch(executable_path=CHROME,
                                    args=["--no-sandbox", "--disable-dev-shm-usage"])
        ctx = browser.new_context(viewport={"width": size[0], "height": size[1]},
                                  device_scale_factor=dsf, is_mobile=True, has_touch=True,
                                  accept_downloads=True)
        data = {"hall": json.dumps(hall, ensure_ascii=False),
                "save": json.dumps(save, ensure_ascii=False) if save else None,
                "titles": json.dumps(titles, ensure_ascii=False) if titles else None}
        # 첫 로드에서만 저장본을 심는다 — 새로고침 뒤에는 그 판에서 바꾽 값(음소거 등)을 지키기 위해
        ctx.add_init_script(
            "(() => { const data = " + json.dumps(data) + ";"
            " try {"
            "   if (sessionStorage.getItem('phase1-seeded')) return;"
            "   sessionStorage.setItem('phase1-seeded', '1');"
            "   localStorage.clear();"
            "   localStorage.setItem('lifeTurnSim.hall.v1', data.hall);"
            "   if (data.save) localStorage.setItem('lifeTurnSim.save.v1', data.save);"
            "   if (data.titles) localStorage.setItem('lifeTurnSim.titles.v1', data.titles);"
            " } catch (e) {} })();")
        page = ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))
        page.on("console", lambda m: errors.append("console: " + m.text) if m.type == "error" else None)
        page.goto(url, wait_until="load")
        page.wait_for_timeout(600)
        try:
            fn(page)
        finally:
            browser.close()
        return errors

    shot = lambda name: args.out + "/" + name + "-" + args.tag + ".png"
    all_errors = []

    with sync_playwright() as p:
        # ① 시작 화면 — 시나리오 칩 · 가문 줄
        def step_start(page):
            chips = page.eval_on_selector_all(".scenario-chip", "els => els.map(e => e.dataset.sc)")
            ok("출발 시나리오 칩 4개", chips == ["kr", "imf", "chaebol", "dirt"], ",".join(chips))
            row = page.evaluate("""() => { const r = document.getElementById('scenarioRow');
                return { scroll: r.scrollWidth, client: r.clientWidth }; }""")
            ok("390 폭에서 네 칩이 한 줄에 다 보임", row["scroll"] <= row["client"] + 1,
               f"{row['scroll']}/{row['client']}")
            ok("기본 안내 = 한국 현실", "균형" in page.inner_text("#scenarioHint"),
               page.inner_text("#scenarioHint"))
            page.click('.scenario-chip[data-sc="dirt"]')
            page.wait_for_timeout(200)
            ok("흙수저 선택 → 활성 칩", page.eval_on_selector('.scenario-chip[data-sc="dirt"]',
                                                       "e => e.classList.contains('active')"))
            ok("흙수저 안내로 바뀜", "빚에서 시작" in page.inner_text("#scenarioHint"),
               page.inner_text("#scenarioHint"))
            page.click('.scenario-chip[data-sc="chaebol"]')
            page.wait_for_timeout(200)
            ok("가문 줄 보임 (전당에 내 기록 2건)", page.is_visible("#legacyRow"),
               page.inner_text("#legacyName"))
            ok("가문 줄 기본값 = 새 인물로 시작", "새 인물로 시작" in page.inner_text("#legacyName"),
               page.inner_text("#legacyName"))
            page.screenshot(path=shot("01-start-scenarios"))
            page.click("#legacyRow")
            page.wait_for_timeout(350)
            items = page.eval_on_selector_all(".lm-item", "els => els.map(e => e.dataset.rec)")
            ok("가문 모달 — 새 인물 + 2명", len(items) == 3 and items[0] == "", len(items))
            ok("모달에 유산·재능 안내", "유산 1,920만원" in page.inner_text("#lmList") and
               "사람이 따르는 집안" in page.inner_text("#lmList"), "")
            ok("모달에 부모님 줄", "부모님: 상훈 ♥ 희연" in page.inner_text("#lmList"), "")
            page.screenshot(path=shot("02-legacy-modal"))
            page.click('.lm-item[data-rec="r-sanghun-1"]')
            page.wait_for_timeout(300)
            ok("상훈 선택 → 2대 가문", "2대" in page.inner_text("#legacyName") and
               "1,920만원" in page.inner_text("#legacySub"), page.inner_text("#legacySub"))
            page.screenshot(path=shot("03-start-legacy-on"))

            # 재벌가 + 가문으로 시작
            page.fill("#nameInput", "유솔")
            page.click('#genderChips .chip[data-g="여"]')
            page.click(".age-card[data-age='1']")
            page.click("#startBtn")
            page.wait_for_timeout(600)
            toast = page.inner_text("#toast")
            ok("시작 안내에 부모님·대수", "부모님: 상훈 ♥ 희연" in toast and "2대" in toast, toast)
            saved = page.evaluate("() => JSON.parse(localStorage.getItem('lifeTurnSim.save.v1'))")
            ok("저장본: 시나리오 = chaebol", saved.get("scenario") == "chaebol", saved.get("scenario"))
            ok("저장본: 가문·대수 2대", saved.get("generation") == 2 and (saved.get("legacy") or {}).get("heir") == 1920,
               json.dumps({"gen": saved.get("generation"), "legacy": (saved.get("legacy") or {}).get("family")},
                          ensure_ascii=False))
            ok("저장본: 재산 = 1억 + 유산 1,920만", saved["stats"]["asset"] == 11920, saved["stats"]["asset"])
            ok("저장본: 시나리오·가문 플래그", "시나리오_재벌" in saved["flags"] and "가문_이어받음" in saved["flags"],
               ",".join(k for k in saved["flags"] if k.startswith("시나리오") or k.startswith("가문")))

            # 🔊 효과음 토글
            ok("상단 바에 🔊 버튼", page.is_visible("#sfxBtn"), page.inner_text("#sfxBtn"))
            ok("기본은 켜짐", page.inner_text("#sfxBtn").strip() == "🔊", page.inner_text("#sfxBtn"))
            page.click("#sfxBtn")
            page.wait_for_timeout(250)
            ok("누르면 🔇 로 바뀜", page.inner_text("#sfxBtn").strip() == "🔇", page.inner_text("#sfxBtn"))
            muted = page.evaluate("() => JSON.parse(localStorage.getItem('lifeTurnSim.sfx.v1') || '{}')")
            ok("음소거가 저장됨", muted.get("muted") is True, json.dumps(muted))
            page.screenshot(path=shot("04-play-muted"))
            page.reload(wait_until="load")
            page.wait_for_timeout(500)
            icon = page.evaluate("() => (document.getElementById('sfxBtn').textContent || '').trim()")
            ok("새로 열어도 🔇 유지", icon == "🔇", icon)
            page.click("#resumeCard")
            page.wait_for_timeout(500)
            page.click("#sfxBtn")
            page.wait_for_timeout(200)
            ok("다시 누르면 🔊", page.inner_text("#sfxBtn").strip() == "🔊", page.inner_text("#sfxBtn"))
            bar = page.evaluate("""() => { const a = document.querySelector('.sb-actions');
                const w = document.querySelector('.sb-who');
                return { overflow: a.getBoundingClientRect().right > innerWidth,
                         overlap: w.getBoundingClientRect().right > a.getBoundingClientRect().left + 0.5 }; }""")
            ok("상단 바 넘침·겹침 0", (not bar["overflow"]) and (not bar["overlap"]), json.dumps(bar))

        all_errors += session(p, st["hall"], None, None, step_start)

        # ② 엔딩 — 결과 카드 저장
        def step_ending(page):
            page.click("#resumeCard")
            page.wait_for_timeout(600)
            ok("엔딩 화면", page.is_visible("#screen-ending"))
            ok("결과 카드 버튼", page.is_visible("#endShare"), page.inner_text("#endShare").replace("\n", " "))
            page.screenshot(path=shot("05-ending"))
            page.evaluate("() => { document.getElementById('endingScroll').scrollTop = 99999; }")
            page.wait_for_timeout(300)
            page.click("#endShare")
            page.wait_for_timeout(700)
            ok("결과 카드 미리보기 열림", page.is_visible("#shareModal"), page.inner_text("#smSub"))
            src = page.get_attribute("#smImg", "src") or ""
            ok("미리보기가 PNG data URL", src.startswith("data:image/png"), src[:24])
            nat = page.evaluate("""() => { const i = document.getElementById('smImg');
                return { w: i.naturalWidth, h: i.naturalHeight }; }""")
            ok("카드 원본 1080×1350", nat["w"] == 1080 and nat["h"] == 1350, f"{nat['w']}×{nat['h']}")
            page.screenshot(path=shot("06-share-card"))
            with page.expect_download() as dl:
                page.click("#smSave")
            download = dl.value
            path = os.path.join(args.out, "card-" + args.tag + ".png")
            download.save_as(path)
            size = png_size(path)
            ok("저장 파일명", download.suggested_filename == "인생한턴_유솔_80세.png",
               download.suggested_filename)
            ok("저장된 PNG 1080×1350", size == (1080, 1350), size)
            ok("저장된 PNG 용량", os.path.getsize(path) > 40000, f"{os.path.getsize(path) // 1024}KB")

        all_errors += session(p, st["hall"], st["ending"], st["titles"], step_ending)

        # ③ 졸업 엔딩 — 결과 카드가 '졸업' 카드로
        def step_grad(page):
            page.click("#resumeCard")
            page.wait_for_timeout(600)
            ok("졸업 엔딩 화면", page.is_visible("#screen-ending") and "졸업" in page.inner_text(".ending-card"),
               page.inner_text(".ending-card")[:40])
            page.evaluate("() => { document.getElementById('endingScroll').scrollTop = 99999; }")
            page.wait_for_timeout(200)
            ok("졸업 엔딩에도 결과 카드 버튼", page.is_visible("#endShare"))
            page.click("#endShare")
            page.wait_for_timeout(700)
            nat = page.evaluate("() => { const i = document.getElementById('smImg');"
                                " return { w: i.naturalWidth, h: i.naturalHeight,"
                                " sub: document.getElementById('smSub').textContent }; }")
            ok("졸업 카드 1080×1350", nat["w"] == 1080 and nat["h"] == 1350, "%s×%s" % (nat["w"], nat["h"]))
            ok("졸업 카드 파일명", "인생한턴_유솔_19세.png" in nat["sub"], nat["sub"])
            page.screenshot(path=shot("08-grad-share-card"))
            page.click("#smClose")
            page.wait_for_timeout(250)
            ok("미리보기 닫힘", not page.is_visible("#shareModal"))

        all_errors += session(p, st["hall"], st["gradEnding"], st["titles"], step_grad)

        # ④ 390×664 — 시작 화면 한 화면
        def step_small(page):
            m = page.evaluate("""() => { const sc = document.querySelector('.start-scroll');
                const row = document.getElementById('scenarioRow');
                return { overflow: sc.scrollHeight - sc.clientHeight,
                         chips: row.getBoundingClientRect().bottom,
                         btn: document.getElementById('startBtn').getBoundingClientRect().bottom }; }""")
            ok("390×664 시작 화면 스크롤 0", m["overflow"] <= 0, f"넘침 {m['overflow']}px")
            ok("390×664 시작 버튼이 화면 안", m["btn"] <= 664, f"{round(m['btn'])}px")
            page.screenshot(path=shot("07-start-664"))

        all_errors += session(p, st["hall"], None, None, step_small, size=(390, 664), dsf=2)

    real_errors = [e for e in all_errors if "favicon" not in e]
    ok("콘솔 오류 0건", len(real_errors) == 0, "; ".join(real_errors[:3]))

    if httpd:
        httpd.shutdown()

    failed = [r for r in results if not r[0]]
    print("\n=== Phase 1 화면 검증 " + str(len(results) - len(failed)) + " / " + str(len(results)) + " 통과 ===")
    print("=== 결과:", "FAIL" if failed else "PASS", "===")
    print("스크린샷:", args.out)
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
