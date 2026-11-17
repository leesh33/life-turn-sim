"""졸업 결산·능력치 비교·명예의 전당 검증 (390×844)

사용: python3 test/grad.py [--url http://localhost:8099/index.html] [--out /workspace/downloads/life-sim-grad]
"""
import argparse
import os
import sys
from playwright.sync_api import sync_playwright

CHROME = "/workspace/.cache/ms-playwright/chromium-1134/chrome-linux/chrome"

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


def fresh(page, url):
    """새 문서로 열고 시작 화면이 그려질 때까지 기다린다 (라이브는 스크립트 28개 로딩)."""
    for attempt in range(2):
        page.goto(url, wait_until="networkidle")
        try:
            page.wait_for_selector("#ageGrid .age-card", timeout=30000)
            page.wait_for_timeout(300)
            return
        except Exception:
            if attempt == 1:
                raise


def run(url, outdir):
    os.makedirs(outdir, exist_ok=True)
    shots, problems = [], []

    def shot(page, name, full=False):
        path = os.path.join(outdir, f"{name}-390x844.png")
        page.screenshot(path=path, full_page=full)
        shots.append(path)
        return path

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox", "--disable-dev-shm-usage"])
        page = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2,
                                is_mobile=True, has_touch=True)
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append("console.error: " + m.text) if m.type == "error" else None)

        page.goto(url, wait_until="networkidle")
        page.evaluate("localStorage.clear()")
        fresh(page, url)

        shot(page, "01-start")
        if page.title() != "인생 한 턴":
            problems.append("title 불일치: " + page.title())
        if "인생 한 턴" not in page.locator(".brand h1").inner_text():
            problems.append("헤더 명칭 불일치: " + page.locator(".brand h1").inner_text())

        # ── 7세 12개월차 → 졸업 결산 ──
        info = page.evaluate(DRIVE, 7)
        print("7세 12개월차 준비:", info)
        fresh(page, url)
        page.click("#resumeCard")
        page.wait_for_timeout(500)
        page.locator(".choice").first.click()
        page.wait_for_timeout(300)
        page.click("#advanceBtn")
        page.wait_for_timeout(900)
        shot(page, "02-grad7-top")
        grad_name = page.locator(".grad-name").inner_text()
        if "유치원" not in grad_name:
            problems.append("7세 졸업식 명칭 불일치: " + grad_name)
        lines = page.locator(".recall-body p").all_inner_texts()
        print("회고 줄 수:", len(lines))
        if not (7 <= len(lines) <= 10):
            problems.append(f"회고 줄 수 이상: {len(lines)}")
        rows = page.locator(".cmp-row").count()
        print("비교 행 수:", rows)
        if rows != 8:
            problems.append(f"비교 행 수 이상: {rows}")

        # 결산 화면에서 새로고침해도 결산이 유지되는지
        fresh(page, url)
        page.click("#resumeCard")
        page.wait_for_timeout(500)
        if page.locator(".grad-name").count() != 1:
            problems.append("새로고침 후 졸업 결산 미복원")
        page.locator(".cmp-card").scroll_into_view_if_needed()
        page.wait_for_timeout(300)
        shot(page, "03-grad7-compare")
        page.locator("#gradContinue").scroll_into_view_if_needed()
        page.wait_for_timeout(300)
        shot(page, "04-grad7-actions")
        # 계속 살기
        page.click("#gradContinue")
        page.wait_for_timeout(500)
        age_label = page.locator("#ageLabel").inner_text()
        if age_label != "8세":
            problems.append("계속 살기 후 나이 이상: " + age_label)
        shot(page, "05-after-continue")

        # ── 13세 12개월차 → 초등학교 졸업 결산 ──
        page.evaluate(DRIVE, 13)
        fresh(page, url)
        page.click("#resumeCard")
        page.wait_for_timeout(400)
        page.locator(".choice").first.click()
        page.wait_for_timeout(300)
        page.click("#advanceBtn")
        page.wait_for_timeout(900)
        grad_name = page.locator(".grad-name").inner_text()
        if "초등학교" not in grad_name:
            problems.append("13세 졸업식 명칭 불일치: " + grad_name)
        shot(page, "06-grad13")
        page.click("#gradRegister")
        page.wait_for_timeout(2400)
        shot(page, "07-grad-ending")
        ending_text = page.locator("#endingScroll").inner_text()
        if "명예의 전당" not in ending_text:
            problems.append("졸업 엔딩에 전당 문구 없음")

        # 명예의 전당 화면
        page.click("#endHall")
        page.wait_for_timeout(900)
        shot(page, "08-hall")
        mine = page.locator(".hall-row.mine").count()
        if mine < 1:
            problems.append("전당에 내 기록 없음")
        best = page.locator(".hall-row.best").count()
        if best != 1:
            problems.append(f"내 최고 기록 하이라이트 수 이상: {best}")
        # 단계 탭
        page.locator('.hall-tab[data-tab="elementary"]').click()
        page.wait_for_timeout(400)
        shot(page, "09-hall-elementary")
        page.click("#hallBack")
        page.wait_for_timeout(400)

        # 시작 화면 → 전당
        fresh(page, url)
        shot(page, "10-start-hallbtn")
        page.click("#hallBtnStart")
        page.wait_for_timeout(500)
        shot(page, "11-hall-from-start")
        if page.locator(".hall-tab").count() != 7:
            problems.append("전당 탭 수 이상")
        page.evaluate("localStorage.clear()")
        fresh(page, url)

        # ── 엔진 레벨: 5개 졸업 시점 모두 발동 + 80세 완주 ──
        seq = page.evaluate("""() => {
          const s = window.Life.newGame({ name: '상훈', gender: '남', startAge: 1 });
          const seen = [];
          let guard = 0;
          while (!s.ended && guard++ < 1400) {
            const ev = window.Life.currentEvent(s);
            window.Life.choose(s, Math.floor(Math.random() * ev.choices.length));
            const r = window.Life.advance(s);
            if (r.graduation) {
              const info = window.Life.gradInfo(s);
              seen.push({ key: r.graduation, age: info.age, name: info.def.name,
                          score: Math.round(info.score), top: info.total.top,
                          recall: window.Life.recall(s, 'grad').length,
                          text: window.Life.recall(s, 'grad')[0] });
              window.Life.graduate(s, false);
            }
          }
          return { seen, ended: s.ended, age: s.age, hall: window.Life.hallMine().length };
        }""")
        print("졸업 순서:", [x["name"] for x in seq["seen"]])
        if [x["age"] for x in seq["seen"]] != [7, 13, 16, 19, 24]:
            problems.append("졸업 체크포인트 이상: " + str([x["age"] for x in seq["seen"]]))
        for x in seq["seen"]:
            if not (7 <= x["recall"] <= 10):
                problems.append(f"회고 줄 수 이상({x['key']}): {x['recall']}")
        if not seq["ended"] or seq["age"] != 81:
            problems.append("80세 완주 실패")
        if seq["hall"] < 1:
            problems.append("80세 완주 기록 미등록")

        # ── 80세 엔딩 화면 (회고 포함) ──
        page.evaluate("""() => {
          const s = window.Life.newGame({ name: '상훈', gender: '여', startAge: 35 });
          let guard = 0;
          while (!s.ended && guard++ < 1400) {
            const ev = window.Life.currentEvent(s);
            window.Life.choose(s, Math.floor(Math.random() * ev.choices.length));
            const r = window.Life.advance(s);
            if (r.graduation) window.Life.graduate(s, false);
          }
          window.Life.save(s);
        }""")
        fresh(page, url)
        page.click("#resumeCard")
        page.wait_for_timeout(600)
        shot(page, "12-life80-ending-top")
        lines80 = page.locator(".recall-body p").all_inner_texts()
        print("80세 회고 줄 수:", len(lines80))
        if not (7 <= len(lines80) <= 10):
            problems.append(f"80세 회고 줄 수 이상: {len(lines80)}")
        page.locator(".recall-card").scroll_into_view_if_needed()
        page.wait_for_timeout(300)
        shot(page, "13-life80-recall")

        print("\n콘솔 에러:", errors if errors else "없음")
        if errors:
            problems.append(f"콘솔 에러 {len(errors)}건")
        page.close()
        browser.close()

    print("\n=== 결과:", "PASS" if not problems else "FAIL", "===")
    for pr in problems:
        print(" -", pr)
    print("스크린샷:", len(shots), "장")
    return 0 if not problems else 1


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://localhost:8099/index.html")
    ap.add_argument("--out", default="/workspace/downloads/life-sim-grad")
    a = ap.parse_args()
    sys.exit(run(a.url, a.out))
