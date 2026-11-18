"""성장 아바타 · 말풍선 · 미션 · 스탯 팝업 검증 (로컬/라이브)

확인하는 것
  a) 아바타 카드가 능력치 줄 아래·사건 카드 바로 위에 있는가 (겹침·넘침 없이)
  b) 말풍선·미션(목표·%)이 지금 상태를 말하는가 — 나이대 7단계 모두
  c) 선택하면 스탯 팝업(+5 / -15만)이 뜨고, 배치가 흔들리지 않은 뒤 사라지는가
  d) 미션 달성 순간 달성 표시·토스트·보너스가 걸리는가
  e) .paidbar / .bottombar 와 겹치지 않고 가로 넘침이 0인가
  항상) 콘솔·페이지 에러 0

준비: node test/mkavatar-states.js   (downloads/life-avatar-states.json)
사용:
  python3 test/avatar_ui.py --serve
  python3 test/avatar_ui.py --url https://life-turn-sim.vercel.app/ --tag live
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
STATES = os.path.join(ROOT, "..", "downloads", "life-avatar-states.json")
OUT = "/workspace/downloads/life-sim-avatar"
ATK = "/workspace/.local/atklibs/usr/lib/x86_64-linux-gnu"
if os.path.isdir(ATK):
    os.environ["LD_LIBRARY_PATH"] = ATK + (":" + os.environ.get("LD_LIBRARY_PATH") if os.environ.get("LD_LIBRARY_PATH") else "")

results = []


def check(name, cond, extra=None):
    results.append(f"{'PASS' if cond else 'FAIL'} · {name}" + (f" — {extra}" if extra not in (None, "") else ""))
    return cond


MEASURE = """() => {
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect();
    return { top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), left: +r.left.toFixed(1),
             right: +r.right.toFixed(1), h: +r.height.toFixed(1) }; };
  const vw = window.innerWidth, vh = window.innerHeight;
  const card = document.getElementById('avatarCard');
  const ev = document.getElementById('eventCard');
  const stats = document.getElementById('stats');
  const wide = Array.from(document.querySelectorAll('#screen-play *')).filter(el => {
    const b = el.getBoundingClientRect();
    return b.width > 0 && (b.right > vw + 0.6 || b.left < -0.6);
  }).slice(0, 6).map(el => (el.id || el.className || el.tagName) + ':' + Math.round(el.getBoundingClientRect().right));
  const inter = (a, b) => {
    if (!a || !b) return 0;
    const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return ix > 0.5 && iy > 0.5 ? +(ix * iy).toFixed(1) : 0;
  };
  return {
    vw, vh,
    avatar: box(card), event: box(ev), stats: box(stats),
    paidbar: box(document.getElementById('rewardBar')),
    bottombar: box(document.querySelector('.bottombar')),
    bubble: card ? card.querySelector('.av-bubble').textContent.trim() : null,
    svgLabel: card ? card.querySelector('.av-svg').getAttribute('aria-label') : null,
    svgImgs: card ? card.querySelectorAll('img, image').length : -1,
    missionGoal: card ? card.querySelector('.am-goal').textContent.trim() : null,
    missionPct: card ? card.querySelector('.am-pct').textContent.trim() : null,
    missionDone: card ? card.querySelector('.av-mission').dataset.done : null,
    stageScroll: (() => { const s = document.getElementById('stage'); return s ? +(s.scrollHeight - s.clientHeight).toFixed(1) : 0; })(),
    wide,
    overlapPaid: inter(box(card), box(document.getElementById('rewardBar'))),
    overlapBottom: inter(box(card), box(document.querySelector('.bottombar')))
  };
}"""

POPUP = """() => {
  const pops = Array.from(document.querySelectorAll('.stat-pop')).map(el => {
    const r = el.getBoundingClientRect();
    const cell = el.closest('.stat');
    return { text: el.textContent, key: cell ? cell.dataset.key : null,
             top: +r.top.toFixed(1), right: +r.right.toFixed(1), left: +r.left.toFixed(1) };
  });
  const stats = document.getElementById('stats');
  const cell = document.querySelector('.stat');
  const abs = Array.from(document.querySelectorAll('.stat-pop')).every(el => getComputedStyle(el).position === 'absolute');
  return { count: pops.length, pops, absolute: abs,
           statsH: stats ? +stats.getBoundingClientRect().height.toFixed(1) : null,
           cellH: cell ? +cell.getBoundingClientRect().height.toFixed(1) : null,
           vw: window.innerWidth };
}"""


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *a, **k):
        pass


def serve(directory):
    handler = functools.partial(Quiet, directory=directory)
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return "http://127.0.0.1:%d/" % httpd.server_address[1]


def run_page(pg, name, url, states, out, tag, size):
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" else None)
    w, h = size

    # ── ① 새 인생으로 플레이 화면 열기 ──
    pg.goto(url, wait_until="networkidle")
    pg.evaluate("localStorage.clear()")
    pg.reload(wait_until="networkidle")
    pg.wait_for_timeout(250)
    pg.locator('.age-card[data-age="25"]').click()
    pg.locator("#startBtn").click()
    pg.wait_for_timeout(450)

    m = pg.evaluate(MEASURE)
    tagm = f"{w}x{h}"
    check(f"[{tagm}] 아바타 카드가 있다", m["avatar"] is not None)
    check(f"[{tagm}] 카드가 사건 카드 위", m["event"] and m["avatar"] and m["avatar"]["bottom"] <= m["event"]["top"] + 0.6,
          f"아바타 {m['avatar'] and m['avatar']['bottom']} / 사건 {m['event'] and m['event']['top']}")
    check(f"[{tagm}] 카드가 능력치 줄 아래", m["stats"] and m["avatar"] and m["avatar"]["top"] >= m["stats"]["bottom"] - 0.6,
          f"능력치 {m['stats'] and m['stats']['bottom']} / 아바타 {m['avatar'] and m['avatar']['top']}")
    check(f"[{tagm}] 가로 넘침 0", m["wide"] == [], str(m["wide"]))
    check(f"[{tagm}] 하단 바와 겹치지 않음", m["overlapPaid"] == 0 and m["overlapBottom"] == 0,
          f"paid {m['overlapPaid']} / bottom {m['overlapBottom']}")
    check(f"[{tagm}] 말풍선 문구", bool(m["bubble"]) and len(m["bubble"]) <= 40, m["bubble"])
    check(f"[{tagm}] 미션 목표·% 표시", bool(m["missionGoal"]) and "%" in (m["missionPct"] or ""),
          f"{m['missionGoal']} {m['missionPct']}")
    check(f"[{tagm}] 인라인 SVG (외부 이미지 없음)", m["svgImgs"] == 0 and bool(m["svgLabel"]), m["svgLabel"])
    pg.screenshot(path=os.path.join(out, f"{tag}-{tagm}-play.png"))

    # ── ② 선택 → 스탯 팝업 ──
    before = pg.evaluate(POPUP)
    pg.locator(".choice").first.click()
    pg.wait_for_timeout(230)
    after = pg.evaluate(POPUP)
    check(f"[{tagm}] 선택하면 스탯 팝업이 뜬다", after["count"] > 0,
          ", ".join(p["text"] + "→" + str(p["key"]) for p in after["pops"]))
    check(f"[{tagm}] 팝업이 화면 안에 있다", all(0 <= p["left"] and p["right"] <= after["vw"] + 0.6 for p in after["pops"]),
          str([(p["left"], p["right"]) for p in after["pops"]]))
    check(f"[{tagm}] 팝업은 absolute 라 배치를 밀지 않는다",
          after["absolute"] and after["statsH"] == before["statsH"] and after["cellH"] == before["cellH"],
          f"능력치 줄 {before['statsH']} → {after['statsH']} · 칸 {before['cellH']} → {after['cellH']}")
    pg.screenshot(path=os.path.join(out, f"{tag}-{tagm}-pop.png"))
    pg.wait_for_timeout(1200)
    check(f"[{tagm}] 팝업은 잠시 뒤 사라진다", pg.evaluate(POPUP)["count"] == 0)

    # ── ③ 몇 턴 더 — 미션 % 가 실제로 움직이는가 ──
    seen = {m["missionPct"]}
    bands = {m["svgLabel"]}
    for _ in range(4):
        if pg.locator("#autoPause").count():
            try:
                pg.locator("#autoPause").click(timeout=800)
            except Exception:
                pass
        pg.locator("#advanceBtn").click()
        pg.wait_for_timeout(420)
        if pg.locator(".choice").count():
            pg.locator(".choice").first.click()
            pg.wait_for_timeout(320)
            cur = pg.evaluate(MEASURE)
            seen.add(cur["missionPct"])
            bands.add(cur["svgLabel"])
    check(f"[{tagm}] 미션 진행률이 턴마다 움직인다", len(seen) > 1, " / ".join(sorted(x for x in seen if x)))
    pg.screenshot(path=os.path.join(out, f"{tag}-{tagm}-turns.png"))

    # ── ④ 미션 달성 연출 (매력 69.6 → 70) ──
    ms = states.get("mission20")
    if ms is not None:
        pg.evaluate("(s) => localStorage.setItem('lifeTurnSim.save.v1', s)", json.dumps(ms))
        pg.reload(wait_until="networkidle")
        pg.wait_for_timeout(300)
        pg.locator("#resumeCard").click()
        pg.wait_for_timeout(350)
        pre = pg.evaluate(MEASURE)
        check(f"[{tagm}] 달성 직전엔 미달성 표시", pre["missionDone"] == "0" and pre["missionPct"] == "99%",
              f"{pre['missionGoal']} {pre['missionPct']}")
        pg.locator(".choice").first.click()
        pg.wait_for_timeout(260)
        done = pg.evaluate(MEASURE)
        toast = pg.evaluate("document.getElementById('toast').textContent")
        pg.screenshot(path=os.path.join(out, f"{tag}-{tagm}-mission.png"))
        check(f"[{tagm}] 미션 달성 표시", done["missionDone"] == "1" and done["missionPct"] == "달성 ✓",
              str(done["missionPct"]))
        check(f"[{tagm}] 달성 토스트", "미션 달성" in toast and "보너스" in toast, toast)
        check(f"[{tagm}] 달성 뒤에도 겹침 없음", done["overlapPaid"] == 0 and done["overlapBottom"] == 0,
              f"paid {done['overlapPaid']} / bottom {done['overlapBottom']}")
        check(f"[{tagm}] 달성 축하 말풍선", "미션 달성" in (done["bubble"] or ""), done["bubble"])

    # ── ⑤ 나이대 7단계 — 단계마다 아바타·말풍선·미션이 바뀌는가 ──
    for key, st in states.items():
        if not key.startswith("stage"):
            continue
        pg.evaluate("(s) => localStorage.setItem('lifeTurnSim.save.v1', s)", json.dumps(st))
        pg.reload(wait_until="networkidle")
        pg.wait_for_timeout(260)
        if not pg.locator("#resumeCard").is_visible():
            check(f"[{tagm}] {key} 이어하기", False, "이어하기 카드가 안 보임")
            continue
        pg.locator("#resumeCard").click()
        pg.wait_for_timeout(320)
        m2 = pg.evaluate(MEASURE)
        check(f"[{tagm}] {key} 아바타·말풍선·미션", bool(m2["svgLabel"]) and bool(m2["bubble"]) and bool(m2["missionGoal"]),
              f"{m2['svgLabel']} · {m2['bubble']} · {m2['missionGoal']} {m2['missionPct']}")
        check(f"[{tagm}] {key} 겹침·넘침 없음", m2["wide"] == [] and m2["overlapPaid"] == 0 and m2["overlapBottom"] == 0,
              str(m2["wide"]))
        pg.locator("#avatarCard").screenshot(path=os.path.join(out, f"{tag}-{tagm}-{key}.png"))

    check(f"[{tagm}] 콘솔·페이지 에러 0", errs == [], str(errs[:3]))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url")
    ap.add_argument("--serve", action="store_true")
    ap.add_argument("--states", default=STATES)
    ap.add_argument("--out", default=OUT)
    ap.add_argument("--tag", default="local")
    ap.add_argument("--sizes", default="390x844,430x932,390x664")
    args = ap.parse_args()

    url = args.url or serve(ROOT)
    os.makedirs(args.out, exist_ok=True)
    states = json.load(open(args.states)) if os.path.exists(args.states) else {}
    sizes = [tuple(int(v) for v in s.split("x")) for s in args.sizes.split(",")]

    with sync_playwright() as p:
        br = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        for w, h in sizes:
            pg = br.new_page(viewport={"width": w, "height": h}, device_scale_factor=2,
                             is_mobile=True, has_touch=True)
            try:
                run_page(pg, f"{w}x{h}", url, states, args.out, args.tag, (w, h))
            finally:
                pg.close()
        br.close()

    print("\n".join(results))
    fails = [r for r in results if r.startswith("FAIL")]
    print(f"\n아바타 UI 검사: {len(results)} 항목 · 실패 {len(fails)} 건")
    if fails:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
