"""역량(🧠)·행운(🍀) 라이브 검증 — 390×664 / 390×844

확인하는 것
  a) 시작 화면: 가로 넘침 0, 문서 높이가 뷰포트를 넘지 않음
     플레이 화면: 능력치 7개가 HUD에 다 보이고(잘림 없이) 가로 넘침 0,
     이벤트 카드와 첫 선택지가 스크롤 없이 보임
     역량·행운 델타 배지가 뜨고 실제 값이 오름
  b) 졸업 결산: 능력치 7칸 + 비교 행 8개(7능력치 + 종합), 역량·행운 행에 평균/상위%
     명예의 전당: 기록 카드에 역량·행운 표시
  c) 80세 엔딩: 역량/행운 칸 + 회고 8~10줄
  항상) 콘솔/페이지 에러 0

메모리가 빠듯한 환경(라이브 40개 스크립트)에서는 페이지를 새로 열 때마다 렌더러가
리소스를 다시 잡느라 실패하므로, 저장본을 init script 로 심어 두고 **페이지당 한 번만**
이동한다. 단계는 --phase 로 나눠 돌린다.

준비: node test/mkability-states.js   (downloads/life-ability-states.json)
사용:
  python3 test/ability_live.py --serve --phase a
  python3 test/ability_live.py --url https://life-turn-sim.vercel.app/ --phase b --out ...
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
STATES = os.path.join(ROOT, "..", "downloads", "life-ability-states.json")
ATK = "/workspace/.local/atklibs/usr/lib/x86_64-linux-gnu"
if os.path.isdir(ATK):
    os.environ["LD_LIBRARY_PATH"] = ATK + (":" + os.environ["LD_LIBRARY_PATH"] if os.environ.get("LD_LIBRARY_PATH") else "")

MEASURE_START = """() => ({
  docScrollW: document.documentElement.scrollWidth,
  docScrollH: document.documentElement.scrollHeight,
  innerW: window.innerWidth, innerH: window.innerHeight,
  cards: document.querySelectorAll('.age-card').length,
  resume: !!document.querySelector('#resumeCard') && !document.querySelector('#resumeCard').hidden
})"""

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
    statusbarH: Math.round(sb.height),
    statsCount: stats.length,
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


def open_page(browser, url, w, h, scale, save=None, clear=False):
    page = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=scale,
                            is_mobile=True, has_touch=True)
    script = "try{localStorage.removeItem('lifeTurnSim.save.v1');localStorage.removeItem('lifeTurnSim.hall.v1');}catch(e){}"
    if save is not None:
        script += "\ntry{localStorage.setItem('lifeTurnSim.save.v1', %s);}catch(e){}" % json.dumps(json.dumps(save))
    page.add_init_script(script)
    page.goto(url, wait_until="domcontentloaded")
    page.wait_for_selector("#ageGrid .age-card", timeout=45000)
    page.wait_for_timeout(350)
    return page


def resume(page):
    page.click("#resumeCard")
    page.wait_for_selector(".event-card")
    page.wait_for_timeout(350)


def run(url, outdir, sizes, scale=2, phase="all"):
    os.makedirs(outdir, exist_ok=True)
    problems, shots, report = [], [], {}
    with open(STATES, encoding="utf-8") as fh:
        pack = json.load(fh)
    key = pack.get("key", "lifeTurnSim.save.v1")
    st = {k: v["save"] for k, v in pack["states"].items()}

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME,
                                    args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"])
        for (w, h) in sizes:
            size = f"{w}x{h}"
            info = {}

            def run_page(tag, save, body, clear=False):
                page = open_page(browser, url, w, h, scale, save=save, clear=clear)
                errors = []
                page.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))
                page.on("console", lambda m: errors.append("console: " + m.text) if m.type == "error" else None)

                def shot(name):
                    path = os.path.join(outdir, f"{name}-{size}.png")
                    page.screenshot(path=path)
                    shots.append(path)
                    return path

                try:
                    body(page, shot)
                finally:
                    if errors:
                        problems.append(f"[{size}] 콘솔/페이지 에러 {len(errors)}건: {errors[:3]}")
                    info.setdefault("errors", {})[tag] = errors[:6]
                    page.close()

            # ── a) 시작 + 플레이 + 델타 ──
            if phase in ("all", "a"):
                def start_play(page, shot):
                    m = page.evaluate(MEASURE_START)
                    info["start"] = m
                    shot("01-start")
                    if m["docScrollW"] > m["innerW"]:
                        problems.append(f"[{size}] 시작 화면 가로 넘침 {m['docScrollW']} > {m['innerW']}")
                    if m["docScrollH"] > m["innerH"] + 1:
                        problems.append(f"[{size}] 시작 화면 세로 넘침 {m['docScrollH']} > {m['innerH']}")
                    if m["resume"]:
                        problems.append(f"[{size}] 새로 시작인데 이어하기 카드가 떠 있음")
                    page.click('.age-card[data-age="14"]')
                    page.fill("#nameInput", "상훈")
                    page.click("#startBtn")
                    page.wait_for_selector(".event-card")
                    page.wait_for_timeout(450)
                    m = page.evaluate(MEASURE_PLAY)
                    info["play"] = m
                    shot("02-play")
                    if m["statsCount"] != 7:
                        problems.append(f"[{size}] HUD 능력치 {m['statsCount']}개 (7개여야 함)")
                    for need in ["체력", "멘탈", "매력", "호감도", "역량", "행운", "재산"]:
                        if need not in m["statLabels"]:
                            problems.append(f"[{size}] HUD에 {need} 없음: {m['statLabels']}")
                    if m["statClipped"]:
                        problems.append(f"[{size}] HUD에서 잘린 능력치: {m['statClipped']}")
                    if m["docScrollW"] > m["viewport"]["w"] or m["horizontalOverflow"]:
                        problems.append(f"[{size}] 플레이 화면 가로 넘침 {m['docScrollW']} {m['horizontalOverflow']}")
                    if not m["cardVisible"] or not m["firstChoiceVisible"]:
                        problems.append(f"[{size}] 카드/첫 선택지가 화면 밖 (card {m['cardTop']}~{m['cardBottom']}, stage {m['stageH']})")
                run_page("start", None, start_play, clear=True)

                def intel_delta(page, shot):
                    resume(page)
                    title = page.locator(".event-title").inner_text() if page.locator(".event-title").count() else ""
                    before = page.evaluate("() => window.Life.load().stats.intel")
                    page.locator(".choice").first.click()
                    page.wait_for_timeout(500)
                    m = page.evaluate(MEASURE_PLAY)
                    after = page.evaluate("() => window.Life.load().stats.intel")
                    info["delta_intel"] = {"event": title, "badges": m["deltas"], "before": before, "after": after}
                    shot("03-delta-intel")
                    if not any("역량" in d for d in m["deltas"]):
                        problems.append(f"[{size}] 역량 델타 배지 없음: {m['deltas']} ({title})")
                    if not (after > before):
                        problems.append(f"[{size}] 역량이 오르지 않음 {before} → {after}")
                run_page("intel", st["code14"], intel_delta)

                def luck_delta(page, shot):
                    resume(page)
                    before = page.evaluate("() => window.Life.load().stats.luck")
                    page.locator(".choice").first.click()
                    page.wait_for_timeout(500)
                    m = page.evaluate(MEASURE_PLAY)
                    after = page.evaluate("() => window.Life.load().stats.luck")
                    info["delta_luck"] = {"badges": m["deltas"], "before": before, "after": after}
                    shot("04-delta-luck")
                    if not any("행운" in d for d in m["deltas"]):
                        problems.append(f"[{size}] 행운 델타 배지 없음: {m['deltas']}")
                    if not (after > before):
                        problems.append(f"[{size}] 행운이 오르지 않음 {before} → {after}")
                run_page("luck", st["luck5"], luck_delta)

            # ── b) 졸업 결산 + 전당 ──
            if phase in ("all", "b"):
                def grad_flow(page, shot):
                    resume(page)
                    page.locator(".choice").first.click()
                    page.wait_for_timeout(300)
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
                    shot("05-grad")
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
                    shot("06-grad-compare")

                    page.click("#gradRegister")
                    page.wait_for_timeout(1400)
                    page.click("#endHall")
                    page.wait_for_timeout(800)
                    m = page.evaluate("""() => {
                      const rows = Array.from(document.querySelectorAll('.hall-row')).slice(0, 4)
                        .map(el => el.innerText.replace(/\\n/g, ' ').trim());
                      return { rows, count: document.querySelectorAll('.hall-row').length };
                    }""")
                    info["hall"] = m
                    shot("07-hall")
                    if not m["rows"] or not any("역량" in r and "행운" in r for r in m["rows"]):
                        problems.append(f"[{size}] 전당 기록에 역량·행운 없음: {m['rows'][:1]}")
                run_page("grad", st["grad13"], grad_flow)

            # ── c) 80세 엔딩 ──
            if phase in ("all", "c"):
                def ending(page, shot):
                    # 완주한 저장본은 이어하기를 누르면 플레이가 아니라 엔딩 화면이 열린다
                    page.click("#resumeCard")
                    page.wait_for_selector("#endingScroll .ending-card", timeout=20000)
                    page.wait_for_timeout(500)
                    m = page.evaluate("""() => {
                      const stats = Array.from(document.querySelectorAll('.end-stat')).map(el => el.innerText.replace(/\\n/g, ' ').trim());
                      const recall = Array.from(document.querySelectorAll('.recall-body p')).map(el => el.innerText.trim());
                      return { stats, recallCount: recall.length, recall };
                    }""")
                    info["ending"] = m
                    shot("08-ending")
                    if not any("역량 / 행운" in s for s in m["stats"]):
                        problems.append(f"[{size}] 엔딩에 역량/행운 칸 없음: {m['stats']}")
                    if not (8 <= m["recallCount"] <= 10):
                        problems.append(f"[{size}] 80세 회고 줄 수 {m['recallCount']}")
                run_page("life80", st["life80"], ending)

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
    ap.add_argument("--scale", type=int, default=2)
    ap.add_argument("--phase", default="all", choices=["all", "a", "b", "c"])
    ap.add_argument("--serve", action="store_true", help="이 저장소를 8099 포트로 띄워 검사")
    a = ap.parse_args()
    sizes = [tuple(int(x) for x in s.split("x")) for s in a.sizes.split(",")]
    httpd = None
    url = a.url
    if a.serve or not url:
        httpd = serve(ROOT, 8099)
        url = "http://127.0.0.1:8099/index.html"
    code = run(url, a.out, sizes, a.scale, a.phase)
    if httpd:
        httpd.shutdown()
    raise SystemExit(code)
