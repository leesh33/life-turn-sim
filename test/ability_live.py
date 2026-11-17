"""역량(🧠)·행운(🍀) 라이브 검증 — 390×664 / 390×844

확인하는 것
  ① 시작 화면: 가로 넘침 0, 문서 높이가 뷰포트를 넘지 않음
  ② 플레이 화면: 능력치 7개가 HUD에 다 보이고(잘림 없이) 가로 넘침 0,
     이벤트 카드와 첫 선택지가 스크롤 없이 보임
  ③ 선택 후 델타 배지에 역량/행운이 뜨고 값이 실제로 변함
  ④ 졸업 결산: 능력치 7칸 + 비교 행 8개(7능력치 + 종합), 역량·행운 행에 평균/상위%
  ⑤ 명예의 전당: 기록 카드에 역량·행운 표시
  ⑥ 80세 엔딩: 역량/행운 칸 표시
  ⑦ 콘솔/페이지 에러 0

사용:
  python3 test/ability_live.py --url http://127.0.0.1:8099/index.html --out /workspace/downloads/life-ability
  python3 test/ability_live.py --url https://life-turn-sim.vercel.app/ --out ...
"""
import argparse
import functools
import json
import os
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from playwright.sync_api import sync_playwright

CHROME = "/workspace/.cache/ms-playwright/chromium-1134/chrome-linux/chrome"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ATK = "/workspace/.local/atklibs/usr/lib/x86_64-linux-gnu"
if os.path.isdir(ATK):
    os.environ["LD_LIBRARY_PATH"] = ATK + (":" + os.environ["LD_LIBRARY_PATH"] if os.environ.get("LD_LIBRARY_PATH") else "")

# 14세로 시작해 '첫 코딩' 이벤트를 현재 이벤트로 고정 (역량 +4 / 체력 -2 선택지)
DRIVE_CODE = """() => {
  const s = window.Life.newGame({ name: '상훈', gender: '남', startAge: 14 });
  s.current = { eventId: 'ab_first_code', chosen: null, event: null };
  s.used = ['ab_first_code'];
  s.lastSeen = { ab_first_code: 0 };
  window.Life.save(s);
  return { age: s.age, intel: s.stats.intel, luck: s.stats.luck };
}"""

# 13세 12개월차 직전까지 진행 → 다음 턴에 초등학교 졸업 결산이 열린다
DRIVE_GRAD = """() => {
  const s = window.Life.newGame({ name: '상훈', gender: '남', startAge: 1 });
  let guard = 0;
  while (guard++ < 4000) {
    if (s.age === 13 && s.month === 12) break;
    const ev = window.Life.currentEvent(s);
    window.Life.choose(s, Math.floor(Math.random() * ev.choices.length));
    const r = window.Life.advance(s);
    if (r.graduation) window.Life.graduate(s, false);
  }
  window.Life.save(s);
  return { age: s.age, month: s.month, intel: s.stats.intel, luck: s.stats.luck };
}"""

# 35세 시작으로 80세까지 완주한 엔딩 저장본
DRIVE_LIFE = """() => {
  const s = window.Life.newGame({ name: '상훈', gender: '여', startAge: 35 });
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

MEASURE_PLAY = """() => {
  const vw = window.innerWidth, vh = window.innerHeight;
  const stats = Array.from(document.querySelectorAll('.stat'));
  const clipped = stats.filter(el => {
    const label = el.querySelector('.stat-label'), val = el.querySelector('.stat-val');
    return (label && label.scrollWidth > label.clientWidth + 1) ||
           (val && val.scrollWidth > val.clientWidth + 1) ||
           el.getBoundingClientRect().height === 0;
  }).map(el => el.dataset.key);
  const stage = document.querySelector('#stage');
  const card = document.querySelector('.event-card');
  const firstChoice = document.querySelector('.choice');
  const sb = document.querySelector('.statusbar').getBoundingClientRect();
  const cardRect = card ? card.getBoundingClientRect() : null;
  const fcRect = firstChoice ? firstChoice.getBoundingClientRect() : null;
  const stageRect = stage.getBoundingClientRect();
  const wide = Array.from(document.querySelectorAll('body *')).filter(el => {
    const b = el.getBoundingClientRect();
    return b.width > 0 && (b.right > vw + 1 || b.left < -1);
  }).slice(0, 5).map(el => (el.className || el.tagName) + ':' + Math.round(el.getBoundingClientRect().right));
  return {
    viewport: { w: vw, h: vh },
    docScrollW: document.documentElement.scrollWidth,
    docScrollH: document.documentElement.scrollHeight,
    statusbarH: Math.round(sb.height),
    statsCount: stats.length,
    statKeys: stats.map(el => el.dataset.key),
    statLabels: stats.map(el => (el.querySelector('.stat-label') || {}).textContent),
    statValues: stats.map(el => (el.querySelector('.stat-val') || {}).textContent),
    statClipped: clipped,
    stageH: Math.round(stageRect.height),
    stageScroll: { sh: stage.scrollHeight, ch: stage.clientHeight },
    cardTop: cardRect ? Math.round(cardRect.top) : null,
    cardBottom: cardRect ? Math.round(cardRect.bottom) : null,
    cardVisible: cardRect ? (cardRect.top >= stageRect.top - 1 && cardRect.top < vh) : false,
    firstChoiceVisible: fcRect ? (fcRect.top >= stageRect.top - 1 && fcRect.bottom <= stageRect.bottom + 1) : false,
    horizontalOverflow: wide,
    deltas: Array.from(document.querySelectorAll('.delta')).map(el => el.textContent.trim())
  };
}"""


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args, **kwargs):
        pass


def serve(directory, port):
    httpd = ThreadingHTTPServer(("127.0.0.1", port), functools.partial(Quiet, directory=directory))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def open_start(page, url):
    for attempt in range(2):
        page.goto(url, wait_until="domcontentloaded")
        try:
            page.wait_for_selector("#ageGrid .age-card", timeout=30000)
            page.wait_for_timeout(250)
            return
        except Exception:
            if attempt == 1:
                raise


def run(url, outdir, sizes):
    os.makedirs(outdir, exist_ok=True)
    problems, shots, report = [], [], {}

    def shot(page, name, size):
        p = os.path.join(outdir, f"{name}-{size}.png")
        page.screenshot(path=p)
        shots.append(p)
        return p

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME,
                                    args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"])
        for (w, h) in sizes:
            size = f"{w}x{h}"
            info = {}
            page = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=2,
                                    is_mobile=True, has_touch=True)
            errors = []
            page.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))
            page.on("console", lambda m: errors.append("console: " + m.text) if m.type == "error" else None)

            # ① 시작 화면
            open_start(page, url)
            page.evaluate("() => localStorage.clear()")
            open_start(page, url)
            m = page.evaluate("""() => ({
              docScrollW: document.documentElement.scrollWidth,
              docScrollH: document.documentElement.scrollHeight,
              innerW: window.innerWidth, innerH: window.innerHeight,
              cards: document.querySelectorAll('.age-card').length,
              startBtnBottom: Math.round(document.querySelector('#startBtn').getBoundingClientRect().bottom)
            })""")
            info["start"] = m
            shot(page, "01-start", size)
            if m["docScrollW"] > m["innerW"]:
                problems.append(f"[{size}] 시작 화면 가로 넘침 {m['docScrollW']} > {m['innerW']}")
            if m["docScrollH"] > m["innerH"] + 1:
                problems.append(f"[{size}] 시작 화면 세로 넘침 {m['docScrollH']} > {m['innerH']}")

            # ② 플레이 화면 (14세 시작)
            page.click('.age-card[data-age="14"]')
            page.fill("#nameInput", "상훈")
            page.click("#startBtn")
            page.wait_for_selector(".event-card")
            page.wait_for_timeout(400)
            m = page.evaluate(MEASURE_PLAY)
            info["play"] = m
            shot(page, "02-play", size)
            if m["statsCount"] != 7:
                problems.append(f"[{size}] HUD 능력치 {m['statsCount']}개 (7개여야 함)")
            for need in ["체력", "멘탈", "매력", "호감도", "역량", "행운", "재산"]:
                if need not in m["statLabels"]:
                    problems.append(f"[{size}] HUD에 {need} 없음: {m['statLabels']}")
            if m["statClipped"]:
                problems.append(f"[{size}] HUD에서 잘린 능력치: {m['statClipped']}")
            if m["docScrollW"] > m["viewport"]["w"]:
                problems.append(f"[{size}] 플레이 화면 가로 넘침 {m['docScrollW']}")
            if m["horizontalOverflow"]:
                problems.append(f"[{size}] 가로로 넘친 요소: {m['horizontalOverflow']}")
            if not m["cardVisible"] or not m["firstChoiceVisible"]:
                problems.append(f"[{size}] 카드/첫 선택지가 화면 밖 (card {m['cardTop']}~{m['cardBottom']}, stage {m['stageH']})")

            # ③ 역량·행운 델타 배지
            saved = page.evaluate(DRIVE_CODE)
            open_start(page, url)
            page.click("#resumeCard")
            page.wait_for_selector(".event-card")
            page.wait_for_timeout(300)
            ev_title = page.locator(".event-title").inner_text() if page.locator(".event-title").count() else ""
            page.locator(".choice").first.click()
            page.wait_for_timeout(450)
            m = page.evaluate(MEASURE_PLAY)
            info["delta"] = {"badges": m["deltas"], "title": ev_title, "before": saved}
            shot(page, "03-delta", size)
            if not any("역량" in d for d in m["deltas"]):
                problems.append(f"[{size}] 역량 델타 배지 없음: {m['deltas']}")
            after = page.evaluate("() => ({ intel: window.Life.load().stats.intel, luck: window.Life.load().stats.luck })")
            info["delta"]["after"] = after
            if not (after["intel"] > saved["intel"]):
                problems.append(f"[{size}] 역량이 오르지 않음 {saved['intel']} → {after['intel']}")

            # 행운 배지도 한 번 — 'ab_lucky_clover'(5~7세) 선택 0
            page.evaluate("""() => {
              const s = window.Life.newGame({ name: '상훈', gender: '여', startAge: 5 });
              s.current = { eventId: 'ab_lucky_clover', chosen: null, event: null };
              s.used = ['ab_lucky_clover']; s.lastSeen = { ab_lucky_clover: 0 };
              window.Life.save(s);
            }""")
            open_start(page, url)
            page.click("#resumeCard")
            page.wait_for_selector(".event-card")
            page.wait_for_timeout(250)
            page.locator(".choice").first.click()
            page.wait_for_timeout(450)
            m = page.evaluate(MEASURE_PLAY)
            info["delta_luck"] = m["deltas"]
            if not any("행운" in d for d in m["deltas"]):
                problems.append(f"[{size}] 행운 델타 배지 없음: {m['deltas']}")

            # ④ 졸업 결산
            page.evaluate(DRIVE_GRAD)
            open_start(page, url)
            page.click("#resumeCard")
            page.wait_for_selector(".event-card")
            page.wait_for_timeout(300)
            page.locator(".choice").first.click()
            page.wait_for_timeout(250)
            page.click("#advanceBtn")
            page.wait_for_timeout(900)
            m = page.evaluate("""() => {
              const cells = Array.from(document.querySelectorAll('.gs-cell')).map(el => el.innerText.replace(/\\n/g, ' ').trim());
              const rows = Array.from(document.querySelectorAll('.cmp-row')).map(el => el.innerText.replace(/\\n/g, ' ').trim());
              return { gradName: (document.querySelector('.grad-name') || {}).innerText,
                       cells, rowCount: rows.length, rows,
                       statLabels: Array.from(document.querySelectorAll('.cmp-label')).map(el => el.innerText.trim()) };
            }""")
            info["grad"] = m
            shot(page, "04-grad", size)
            if len(m["cells"]) != 7:
                problems.append(f"[{size}] 졸업 결산 능력치 칸 {len(m['cells'])}개 (7개여야 함): {m['cells']}")
            if m["rowCount"] != 8:
                problems.append(f"[{size}] 비교 행 {m['rowCount']}개 (8개여야 함): {m['statLabels']}")
            for need in ["역량", "행운"]:
                if need not in m["statLabels"]:
                    problems.append(f"[{size}] 비교 행에 {need} 없음: {m['statLabels']}")
            intelRows = [r for r in m["rows"] if r.startswith("역량")]
            if not intelRows or "상위" not in intelRows[0] or "평균" not in intelRows[0]:
                problems.append(f"[{size}] 역량 비교 행에 평균/상위% 없음: {intelRows}")
            page.locator(".cmp-card").scroll_into_view_if_needed()
            page.wait_for_timeout(250)
            shot(page, "05-grad-compare", size)

            # ⑤ 명예의 전당 (결산에서 등록 → 엔딩 → 전당)
            page.click("#gradRegister")
            page.wait_for_timeout(1400)
            page.click("#endHall")
            page.wait_for_timeout(700)
            m = page.evaluate("""() => {
              const rows = Array.from(document.querySelectorAll('.hall-row')).slice(0, 4)
                .map(el => el.innerText.replace(/\\n/g, ' ').trim());
              return { rows, count: document.querySelectorAll('.hall-row').length };
            }""")
            info["hall"] = m
            shot(page, "06-hall", size)
            if not m["rows"] or not any("역량" in r and "행운" in r for r in m["rows"]):
                problems.append(f"[{size}] 전당 기록에 역량·행운 없음: {m['rows'][:1]}")

            # ⑥ 80세 엔딩
            page.evaluate(DRIVE_LIFE)
            open_start(page, url)
            page.click("#resumeCard")
            page.wait_for_timeout(700)
            m = page.evaluate("""() => {
              const stats = Array.from(document.querySelectorAll('.end-stat')).map(el => el.innerText.replace(/\\n/g, ' ').trim());
              const recall = Array.from(document.querySelectorAll('.recall-body p')).map(el => el.innerText.trim());
              return { stats, recall, text: (document.querySelector('#endingScroll') || {}).innerText || '' };
            }""")
            info["ending"] = {"stats": m["stats"], "recallCount": len(m["recall"]),
                              "recallHead": " / ".join(m["recall"][:10])[:200]}
            shot(page, "07-ending", size)
            if not any("역량 / 행운" in s for s in m["stats"]):
                problems.append(f"[{size}] 엔딩에 역량/행운 칸 없음: {m['stats']}")
            if not (8 <= len(m["recall"]) <= 10):
                problems.append(f"[{size}] 80세 회고 줄 수 {len(m['recall'])}")

            info["errors"] = errors[:8]
            if errors:
                problems.append(f"[{size}] 콘솔/페이지 에러 {len(errors)}건: {errors[:3]}")
            page.close()

            page2 = None
            report[size] = info

        browser.close()

    print(json.dumps(report, ensure_ascii=False, indent=1))
    print("\n=== 결과:", "PASS" if not problems else "FAIL", "===")
    for pr in problems:
        print(" -", pr)
    print("스크린샷:", len(shots), "장")
    for s in shots:
        print("  ", s)
    return 0 if not problems else 1


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="")
    ap.add_argument("--out", default="/workspace/downloads/life-ability")
    ap.add_argument("--sizes", default="390x664,390x844")
    ap.add_argument("--serve", action="store_true", help="이 저장소를 8099 포트로 띄워 검사")
    a = ap.parse_args()
    sizes = [tuple(int(x) for x in s.split("x")) for s in a.sizes.split(",")]
    httpd = None
    url = a.url
    if a.serve or not url:
        httpd = serve(ROOT, 8099)
        url = "http://127.0.0.1:8099/index.html"
    code = run(url, a.out, sizes)
    if httpd:
        httpd.shutdown()
    raise SystemExit(code)
