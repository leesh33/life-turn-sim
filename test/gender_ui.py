"""성별 선택 · 14가지 성장 캐릭터 검증 (로컬/라이브 · Playwright)

확인하는 것
  a) 시작 화면에 성별 선택(남/여/랜덤)이 있고, 기본값이 안전하게 잡히는가
  b) 고른 성별이 인생에 그대로 들어가 캐릭터에 반영되는가 (유아기 · 라벨)
  c) 7단계 × 남/여 = 14가지 캐릭터가 단계마다 다른가 (aria-label + 그림 해시)
  d) 마지막에 고른 성별이 다음 방문에서도 칩에 남아 있는가
  e) 엔딩 화면에도 마지막 나이·성별 캐릭터가 나오는가
  f) 390×844 에서 가로 넘침 0 · 콘솔/페이지 에러 0
  항상) 콘솔·페이지 에러 0

사용:
  python3 test/gender_ui.py --serve
  python3 test/gender_ui.py --url https://life-turn-sim.vercel.app/ --tag live --dsf 1
"""
import argparse
import functools
import hashlib
import json
import os
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from playwright.sync_api import sync_playwright

CHROME = "/workspace/.cache/ms-playwright/chromium-1134/chrome-linux/chrome"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATES = os.path.join(ROOT, "..", "downloads", "life-avatar-states.json")
OUT = "/workspace/downloads/life-sim-gender"
ATK = "/workspace/.local/atklibs/usr/lib/x86_64-linux-gnu"
if os.path.isdir(ATK):
    os.environ["LD_LIBRARY_PATH"] = ATK + (":" + os.environ.get("LD_LIBRARY_PATH") if os.environ.get("LD_LIBRARY_PATH") else "")

results = []


def check(name, cond, extra=None):
    results.append(f"{'PASS' if cond else 'FAIL'} · {name}" + (f" — {extra}" if extra not in (None, "") else ""))
    return cond


MEASURE = """() => {
  const card = document.getElementById('avatarCard');
  const svg = card ? card.querySelector('.av-svg') : null;
  const vw = window.innerWidth;
  const wide = Array.from(document.querySelectorAll('#screen-play *')).filter(el => {
    const b = el.getBoundingClientRect();
    return b.width > 0 && (b.right > vw + 0.6 || b.left < -0.6);
  }).slice(0, 6).map(el => (el.id || el.className || el.tagName) + ':' + Math.round(el.getBoundingClientRect().right));
  return {
    vw,
    label: svg ? svg.getAttribute('aria-label') : null,
    html: svg ? svg.outerHTML : null,
    imgs: card ? card.querySelectorAll('img, image').length : -1,
    wide,
    stageScroll: (() => { const s = document.getElementById('stage'); return s ? +(s.scrollHeight - s.clientHeight).toFixed(1) : 0; })(),
    chips: Array.from(document.querySelectorAll('#genderChips .chip')).map(c => ({
      g: c.dataset.g, active: c.classList.contains('active'), pressed: c.getAttribute('aria-pressed')
    }))
  };
}"""

END_MEASURE = """() => {
  const box = document.querySelector('.end-avatar');
  const svg = box ? box.querySelector('.av-svg') : null;
  const vw = window.innerWidth;
  const wide = Array.from(document.querySelectorAll('#screen-ending *')).filter(el => {
    const b = el.getBoundingClientRect();
    return b.width > 0 && (b.right > vw + 0.6 || b.left < -0.6);
  }).slice(0, 6).map(el => (el.id || el.className || el.tagName) + ':' + Math.round(el.getBoundingClientRect().right));
  return {
    has: !!box,
    label: svg ? svg.getAttribute('aria-label') : null,
    caption: box ? box.querySelector('span').textContent.trim() : null,
    wide,
    screen: (document.getElementById('screen-ending') || {}).className
  };
}"""


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *a, **k):
        pass


def serve(directory):
    handler = functools.partial(Quiet, directory=directory)
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return "http://127.0.0.1:%d/" % httpd.server_address[1]


def pick_gender(pg, gender):
    pg.locator(f'#genderChips .chip[data-g="{gender}"]').click()
    pg.wait_for_timeout(120)


def start_game(pg, gender, age=1):
    pick_gender(pg, gender)
    pg.locator(f'.age-card[data-age="{age}"]').click()
    pg.locator("#startBtn").click()
    pg.wait_for_timeout(450)


def inject_state(pg, st):
    pg.evaluate("""(json) => {
      localStorage.setItem('lifeTurnSim.save.v1', json);
      const c = document.getElementById('resumeCard');
      c.hidden = false;
      c.click();
    }""", json.dumps(st))
    pg.wait_for_timeout(320)


def run_page(pg, url, states, out, tag, size, dsf):
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" else None)
    w, h = size
    tagm = f"{w}x{h}"

    pg.goto(url, wait_until="networkidle")
    pg.evaluate("localStorage.clear()")
    pg.reload(wait_until="domcontentloaded")
    pg.wait_for_timeout(450)

    # ── a) 시작 화면의 성별 선택 ──
    m = pg.evaluate(MEASURE)
    chips = m["chips"]
    check(f"[{tagm}] 성별 선택 칩 3개(남·여·랜덤)", [c["g"] for c in chips] == ["남", "여", "랜덤"], str([c["g"] for c in chips]))
    check(f"[{tagm}] 기본 성별은 남 (세이브 없음)", [c["g"] for c in chips if c["active"]] == ["남"],
          str([c["g"] for c in chips if c["active"]]))
    pg.screenshot(path=os.path.join(out, f"{tag}-{tagm}-01-start.png"))
    pg.locator('.age-card[data-age="1"]').click()
    pg.screenshot(path=os.path.join(out, f"{tag}-{tagm}-02-start-pick.png"))

    # ── b) 여성으로 시작 → 유아기 여아 캐릭터 ──
    start_game(pg, "여", 1)
    girlBaby = pg.evaluate(MEASURE)
    check(f"[{tagm}] 여성으로 시작하면 여성 캐릭터", (girlBaby["label"] or "").startswith("여성"),
          girlBaby["label"])
    check(f"[{tagm}] 유아기 단계", "유아기" in (girlBaby["label"] or ""), girlBaby["label"])
    check(f"[{tagm}] 인라인 SVG (외부 이미지 없음)", girlBaby["imgs"] == 0)
    check(f"[{tagm}] 가로 넘침 0 (유아기·여)", girlBaby["wide"] == [], str(girlBaby["wide"]))
    pg.screenshot(path=os.path.join(out, f"{tag}-{tagm}-03-play-girl-baby.png"))
    girlHash = hashlib.sha1((girlBaby["html"] or "").encode()).hexdigest()[:10]

    # 남자로 새 인생 — 같은 유아기에서 그림이 달라야 한다
    pg.evaluate("localStorage.removeItem('lifeTurnSim.save.v1')")
    pg.reload(wait_until="domcontentloaded")
    pg.wait_for_timeout(400)
    check(f"[{tagm}] 마지막 성별(여)이 칩에 남음",
          [c["g"] for c in pg.evaluate(MEASURE)["chips"] if c["active"]] == ["여"],
          str([c["g"] for c in pg.evaluate(MEASURE)["chips"] if c["active"]]))
    start_game(pg, "남", 1)
    boyBaby = pg.evaluate(MEASURE)
    check(f"[{tagm}] 남성으로 시작하면 남성 캐릭터", (boyBaby["label"] or "").startswith("남성"), boyBaby["label"])
    boyHash = hashlib.sha1((boyBaby["html"] or "").encode()).hexdigest()[:10]
    check(f"[{tagm}] 같은 유아기라도 남녀 그림이 다름", girlHash != boyHash, f"여 {girlHash} / 남 {boyHash}")
    pg.screenshot(path=os.path.join(out, f"{tag}-{tagm}-04-play-boy-baby.png"))

    # ── c) 7단계 × 남/여 ──
    pages = [(k, v) for k, v in states.items() if k.startswith("stage")]
    seen = {}
    for key, st in pages:
        for g in ("남", "여"):
            var = dict(st)
            var["gender"] = g
            inject_state(pg, var)
            mm = pg.evaluate(MEASURE)
            label = mm["label"] or ""
            check(f"[{tagm}] {key} {g} 라벨", label.startswith("남성" if g == "남" else "여성") and "모습" in label, label)
            check(f"[{tagm}] {key} {g} 넘침·에러 없음", mm["wide"] == [], str(mm["wide"]))
            seen[f"{key}-{g}"] = hashlib.sha1((mm["html"] or "").encode()).hexdigest()[:10]
            if g == "여":
                pg.locator("#avatarCard").screenshot(path=os.path.join(out, f"{tag}-{tagm}-{key}-{g}.png"))
    check(f"[{tagm}] 14가지 그림이 모두 다름", len(set(seen.values())) == 14, f"{len(set(seen.values()))}종")
    for key, _ in pages:
        check(f"[{tagm}] {key} 남녀 그림 다름", seen[f"{key}-남"] != seen[f"{key}-여"],
              f"{seen[f'{key}-남']} / {seen[f'{key}-여']}")

    # ── d) 졸업 결산에도 그 시점의 캐릭터 ──
    driven = pg.evaluate("""() => {
      const s = window.Life.newGame({ name: '졸업생', gender: '여', startAge: 1 });
      let guard = 0;
      while (guard++ < 4000 && !s.grad && !s.ended) {
        const ev = window.Life.currentEvent(s);
        if (!ev) break;
        window.Life.choose(s, Math.floor(Math.random() * ev.choices.length));
        const r = window.Life.advance(s);
        if (r.graduation) break;
      }
      window.Life.save(s);
      return { age: s.age, month: s.month, gender: s.gender, grad: !!s.grad };
    }""")
    check(f"[{tagm}] 8세 12개월 졸업 저장본", driven["age"] == 8 and driven["grad"] is True, str(driven))
    pg.reload(wait_until="domcontentloaded")
    pg.wait_for_timeout(500)
    pg.locator("#resumeCard").click()
    pg.wait_for_timeout(400)
    gm = pg.evaluate("""() => {
      const box = document.querySelector('.grad-avatar');
      const svg = box ? box.querySelector('.av-svg') : null;
      return { has: !!box, label: svg ? svg.getAttribute('aria-label') : null,
               screen: (document.getElementById('screen-grad') || {}).className };
    }""")
    check(f"[{tagm}] 졸업 화면에 캐릭터", gm["has"] and bool(gm["label"]), str(gm))
    check(f"[{tagm}] 졸업 캐릭터는 그 나이·성별", (gm["label"] or "").startswith("여성") and "유아기" in (gm["label"] or ""),
          str(gm["label"]))
    pg.screenshot(path=os.path.join(out, f"{tag}-{tagm}-04b-grad.png"))

    # ── e) 엔딩에도 마지막 나이·성별 캐릭터 ──
    endState = dict(pages[-1][1])
    endState.update({"age": 80, "month": 12, "gender": "여", "ended": True, "endingKind": "life", "grad": None})
    inject_state(pg, endState)
    pg.wait_for_timeout(350)
    em = pg.evaluate(END_MEASURE)
    check(f"[{tagm}] 엔딩 화면에 캐릭터", em["has"] and bool(em["label"]), str(em["label"]))
    check(f"[{tagm}] 엔딩 캐릭터가 마지막 나이·성별", (em["label"] or "").startswith("여성") and "노년" in (em["label"] or ""),
          str(em["label"]))
    check(f"[{tagm}] 엔딩 캡션", "여성" in (em["caption"] or "") and "80세" in (em["caption"] or ""), str(em["caption"]))
    check(f"[{tagm}] 엔딩 가로 넘침 0", em["wide"] == [], str(em["wide"]))
    pg.screenshot(path=os.path.join(out, f"{tag}-{tagm}-05-ending.png"))

    check(f"[{tagm}] 콘솔·페이지 에러 0", errs == [], str(errs[:3]))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url")
    ap.add_argument("--serve", action="store_true")
    ap.add_argument("--states", default=STATES)
    ap.add_argument("--out", default=OUT)
    ap.add_argument("--tag", default="local")
    ap.add_argument("--sizes", default="390x844")
    ap.add_argument("--dsf", type=int, default=2)
    args = ap.parse_args()

    url = args.url or serve(ROOT)
    os.makedirs(args.out, exist_ok=True)
    states = json.load(open(args.states)) if os.path.exists(args.states) else {}
    sizes = [tuple(int(v) for v in s.split("x")) for s in args.sizes.split(",")]

    with sync_playwright() as p:
        br = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        for w, h in sizes:
            pg = br.new_page(viewport={"width": w, "height": h}, device_scale_factor=args.dsf,
                             is_mobile=True, has_touch=True)
            try:
                run_page(pg, url, states, args.out, args.tag, (w, h), args.dsf)
            finally:
                pg.close()
        br.close()

    print("\n".join(results))
    fails = [r for r in results if r.startswith("FAIL")]
    print(f"\n성별·캐릭터 UI 검사: {len(results)} 항목 · 실패 {len(fails)} 건")
    if fails:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
