"""라이브(390×844) 검증 — 메모리 제약 때문에 단계별로 나눠 실행한다.

사용:
  python3 test/grad_live.py --phase a    # 시작 화면 + 7세 유치원 졸업 결산
  python3 test/grad_live.py --phase b    # 13세 초등학교 졸업 → 전당 등록 → 엔딩 → 전당 화면
  python3 test/grad_live.py --phase c    # 80세 엔딩 + 회고
"""
import argparse
import os
import sys
from playwright.sync_api import sync_playwright

CHROME = "/workspace/.cache/ms-playwright/chromium-1134/chrome-linux/chrome"
URL = "https://life-turn-sim.vercel.app/"

DRIVE = """([targetAge, startAge]) => {
  const s = window.Life.newGame({ name: '상훈', gender: '남', startAge: startAge || 1 });
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

LIFE = """(startAge) => {
  const s = window.Life.newGame({ name: '상훈', gender: '여', startAge });
  let guard = 0;
  while (!s.ended && guard++ < 1400) {
    const ev = window.Life.currentEvent(s);
    window.Life.choose(s, Math.floor(Math.random() * ev.choices.length));
    const r = window.Life.advance(s);
    if (r.graduation) window.Life.graduate(s, false);
  }
  window.Life.save(s);
  return { ended: s.ended, age: s.age };
}"""


def fresh(page):
    page.goto("about:blank")
    page.wait_for_timeout(200)
    for attempt in range(2):
        page.goto(URL, wait_until="domcontentloaded")
        try:
            page.wait_for_selector("#ageGrid .age-card", timeout=30000)
            page.wait_for_timeout(300)
            return
        except Exception:
            if attempt == 1:
                raise


def run(phase, outdir):
    os.makedirs(outdir, exist_ok=True)
    problems, shots = [], []

    def shot(page, name):
        path = os.path.join(outdir, f"{name}-390x844.png")
        page.screenshot(path=path)
        shots.append(path)
        return path

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--renderer-process-limit=2"])
        page = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2,
                                is_mobile=True, has_touch=True)
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append("console.error: " + m.text) if m.type == "error" else None)

        fresh(page)
        page.evaluate("localStorage.clear()")
        fresh(page)

        if phase == "a":
            shot(page, "01-start")
            if page.title() != "인생 한 턴":
                problems.append("title 불일치: " + page.title())
            if "인생 한 턴" not in page.locator(".brand h1").inner_text():
                problems.append("헤더 명칭 불일치")
            print("7세 준비:", page.evaluate(DRIVE, [7, 1]))
            fresh(page)
            page.click("#resumeCard")
            page.wait_for_timeout(400)
            page.locator(".choice").first.click()
            page.wait_for_timeout(300)
            page.click("#advanceBtn")
            page.wait_for_timeout(1000)
            shot(page, "02-grad7-top")
            if "유치원" not in page.locator(".grad-name").inner_text():
                problems.append("7세 졸업식 명칭 불일치")
            lines = page.locator(".recall-body p").all_inner_texts()
            print("회고 줄 수:", len(lines))
            if not (7 <= len(lines) <= 10):
                problems.append("회고 줄 수 이상")
            page.locator(".cmp-card").scroll_into_view_if_needed()
            page.wait_for_timeout(300)
            shot(page, "03-grad7-compare")
            if page.locator(".cmp-row").count() != 6:
                problems.append("비교 행 수 이상")
            page.locator("#gradContinue").scroll_into_view_if_needed()
            page.wait_for_timeout(300)
            shot(page, "04-grad7-actions")
            page.click("#gradContinue")
            page.wait_for_timeout(500)
            if page.locator("#ageLabel").inner_text() != "8세":
                problems.append("계속 살기 후 나이 이상")
            shot(page, "05-after-continue")

        elif phase == "b":
            print("13세 준비:", page.evaluate(DRIVE, [13, 8]))
            fresh(page)
            page.click("#resumeCard")
            page.wait_for_timeout(400)
            page.locator(".choice").first.click()
            page.wait_for_timeout(300)
            page.click("#advanceBtn")
            page.wait_for_timeout(1000)
            if "초등학교" not in page.locator(".grad-name").inner_text():
                problems.append("13세 졸업식 명칭 불일치")
            shot(page, "06-grad13")
            page.click("#gradRegister")
            page.wait_for_timeout(2400)
            shot(page, "07-grad-ending")
            if "명예의 전당" not in page.locator("#endingScroll").inner_text():
                problems.append("졸업 엔딩에 전당 문구 없음")
            page.click("#endHall")
            page.wait_for_timeout(900)
            shot(page, "08-hall")
            if page.locator(".hall-row.mine").count() < 1:
                problems.append("전당에 내 기록 없음")
            if page.locator(".hall-row.best").count() != 1:
                problems.append("내 최고 기록 하이라이트 이상")
            page.locator('.hall-tab[data-tab="elementary"]').click()
            page.wait_for_timeout(500)
            shot(page, "09-hall-elementary")
            page.click("#hallBack")
            page.wait_for_timeout(400)
            fresh(page)
            shot(page, "10-start-with-hall")
            page.click("#hallBtnStart")
            page.wait_for_timeout(700)
            shot(page, "11-hall-from-start")
            if page.locator(".hall-tab").count() != 7:
                problems.append("전당 탭 수 이상")

        elif phase == "c":
            print("80세 준비:", page.evaluate(LIFE, 60))
            fresh(page)
            page.click("#resumeCard")
            page.wait_for_timeout(700)
            shot(page, "12-life80-ending")
            lines = page.locator(".recall-body p").all_inner_texts()
            print("80세 회고 줄 수:", len(lines))
            if not (7 <= len(lines) <= 10):
                problems.append("80세 회고 줄 수 이상")
            page.locator(".recall-card").scroll_into_view_if_needed()
            page.wait_for_timeout(300)
            shot(page, "13-life80-recall")

        print("콘솔 에러:", errors if errors else "없음")
        hard = [e for e in errors if "ERR_INSUFFICIENT_RESOURCES" not in e]
        if hard:
            problems.append(f"콘솔 에러 {len(hard)}건")
        browser.close()

    print("=== 결과:", "PASS" if not problems else "FAIL", "===")
    for pr in problems:
        print(" -", pr)
    print("스크린샷:", len(shots), "장")
    return 0 if not problems else 1


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--phase", default="a")
    ap.add_argument("--out", default="/workspace/downloads/life-sim-grad-live")
    a = ap.parse_args()
    sys.exit(run(a.phase, a.out))
