"""개월차·연령고증 라이브 검증 (390×844)

사용: python3 test/verify_months.py [--url http://localhost:8099/index.html] [--out /workspace/downloads/life-sim-months]
확인 항목
 ① 1세 · 1개월차 → 진행 시 1세 · 2개월차
 ② 3세 이상에서 새벽 수유(및 영아기 전용 이벤트) 미노출
 ③ 콘솔 에러 0건
 ④ 이벤트 총 개수 / 폴백(조용한 한 달) 미노출
"""
import argparse
import json
import os
from playwright.sync_api import sync_playwright

CHROME = "/workspace/.cache/ms-playwright/chromium-1134/chrome-linux/chrome"
INFANT_ONLY_TITLES = ["새벽 수유", "이유식 시간", "배밀이 시작", "조리원 퇴소", "돌잔치 — 돌잡이", "태어났습니다"]


def run(url, outdir):
    os.makedirs(outdir, exist_ok=True)
    shots, problems = [], []

    def shot(page, name):
        path = os.path.join(outdir, f"{name}-390x844.png")
        page.screenshot(path=path)
        shots.append(path)
        return path

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        page = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2,
                                is_mobile=True, has_touch=True)
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append("console.error: " + m.text) if m.type == "error" else None)

        page.goto(url, wait_until="networkidle")
        page.evaluate("localStorage.clear()")
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(400)
        shot(page, "m01-start")

        total = page.evaluate("window.LIFE_EVENTS.length")
        problems.append(f"이벤트 총 {total}개")
        dup = page.evaluate("""() => {
            const ids = window.LIFE_EVENTS.map(e => e.id);
            return ids.length - new Set(ids).size;
        }""")
        problems.append(f"중복 id {dup}건")

        # ① 1세 시작 → 1개월차
        page.locator('.age-card[data-age="1"]').click()
        page.fill("#nameInput", "상훈")
        page.locator("#startBtn").click()
        page.wait_for_timeout(600)
        first = page.locator(".badge.age").inner_text()
        status = page.locator("#dayLabel").inner_text()
        problems.append(f"첫 화면 상태바: {page.locator('#ageLabel').inner_text()} · {status} / 카드 배지: {first}")
        if "1개월차" not in status or "1개월차" not in first:
            problems.append("FAIL: 첫 화면이 1개월차가 아님")
        shot(page, "m02-month1")

        # 선택 → 결과 → 진행
        page.locator(".choice").first.click()
        page.wait_for_timeout(400)
        shot(page, "m03-month1-result")
        page.locator("#advanceBtn").click()
        page.wait_for_timeout(700)
        second = page.locator("#dayLabel").inner_text()
        problems.append(f"진행 후 상태바: {page.locator('#ageLabel').inner_text()} · {second}")
        if second != "2개월차":
            problems.append(f"FAIL: 진행 후 2개월차가 아님 ({second})")
        shot(page, "m04-month2")

        # 12개월차까지 진행해 다음 해로 넘어가는지 확인
        seen_titles = []
        for _ in range(12):
            if not page.locator(".choice").first.is_enabled():
                break
            page.locator(".choice").first.click()
            page.wait_for_timeout(120)
            seen_titles.append(page.locator(".card-title").inner_text())
            page.locator("#advanceBtn").click()
            page.wait_for_timeout(260)
        problems.append(f"12턴 후: {page.locator('#ageLabel').inner_text()} · {page.locator('#dayLabel').inner_text()}")
        shot(page, "m05-year2")

        # 일지
        page.locator("#logBtn").click()
        page.wait_for_timeout(400)
        shot(page, "m06-journal")
        page.locator("#sheetClose").click()
        page.wait_for_timeout(300)

        # ② 3세 시작: 24개월을 넘겨도 영아기 이벤트가 나오지 않아야 한다
        page.evaluate("localStorage.clear()")
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(300)
        page.locator('.age-card[data-age="1"]').click()
        page.fill("#nameInput", "고증")
        page.locator("#startBtn").click()
        page.wait_for_timeout(400)
        # 3세까지 빠르게 진행 (엔진을 직접 호출해 24개월 분량을 소화)
        leak = page.evaluate("""() => {
            const s = window.Life.newGame({ name: '고증', gender: '여', startAge: 1 });
            // 3세 1개월차까지 진행
            let guard = 0;
            while (!s.ended && s.age < 3 && guard++ < 200) {
                window.Life.choose(s, 0);
                window.Life.advance(s);
            }
            const bad = [];
            const titles = ['새벽 수유','이유식 시간','배밀이 시작','조리원 퇴소','태어났습니다'];
            for (let i = 0; i < 24 && !s.ended; i++) {
                const ev = window.Life.currentEvent(s);
                const t = typeof ev.title === 'function' ? ev.title(s) : ev.title;
                if (s.age >= 3 && titles.includes(t)) bad.push(s.age + '세:' + t);
                if (s.age >= 4 && ev.maxAge !== undefined && ev.maxAge < s.age) bad.push('나이초과:' + ev.id);
                window.Life.choose(s, 0);
                window.Life.advance(s);
            }
            return { age: s.age, bad };
        }""")
        problems.append(f"3세 이후 영아기 이벤트 노출: {leak['bad'] if leak['bad'] else '없음'} (도달 {leak['age']}세)")
        if leak["bad"]:
            problems.append("FAIL: 3세 이상에서 영아기 이벤트 노출")

        # 폴백 측정: 엔진으로 1세부터 80세까지 3회
        fb = page.evaluate("""() => {
            let fallback = 0, turns = 0, samples = [];
            for (let r = 0; r < 3; r++) {
                const s = window.Life.newGame({ name: '검증', gender: '여', startAge: 1 });
                let guard = 0;
                while (!s.ended && guard++ < 2000) {
                    const ev = window.Life.currentEvent(s);
                    if (ev.__generic) { fallback++; if (samples.length < 5) samples.push(s.age + '세 ' + s.month + '개월차 ' + (typeof ev.title === 'function' ? ev.title(s) : ev.title)); }
                    window.Life.choose(s, Math.floor(Math.random() * ev.choices.length));
                    window.Life.advance(s);
                }
                turns += s.history.length;
            }
            return { fallback, turns, samples };
        }""")
        problems.append(f"1~80세 3회 완주({fb['turns']}턴) 폴백 {fb['fallback']}회 {fb['samples'] if fb['samples'] else ''}")
        if fb["fallback"]:
            problems.append("FAIL: 폴백 이벤트 발생")

        # 3세 화면 스크린샷 (실제 UI)
        page.evaluate("localStorage.clear()")
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(300)
        page.locator('.age-card[data-age="8"]').click()
        page.fill("#nameInput", "상훈")
        page.locator("#startBtn").click()
        page.wait_for_timeout(500)
        shot(page, "m07-elementary")

        # 인생 요약 화면
        page.locator("#summaryBtn").click()
        page.wait_for_timeout(500)
        shot(page, "m08-summary")

        problems.append(f"콘솔 에러 {len(errors)}건" + (": " + json.dumps(errors[:5], ensure_ascii=False) if errors else ""))
        if errors:
            problems.append("FAIL: 콘솔 에러 발생")
        browser.close()

    print("\n".join(problems))
    print("\n스크린샷:")
    for s in shots:
        print(" -", s)
    fails = [p for p in problems if p.startswith("FAIL")]
    print("\n판정:", "FAIL" if fails else "PASS")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://localhost:8099/index.html")
    ap.add_argument("--out", default="/workspace/downloads/life-sim-months")
    a = ap.parse_args()
    run(a.url, a.out)
