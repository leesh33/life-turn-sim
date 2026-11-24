#!/usr/bin/env python3
"""결과 카드(📸 저장·공유) 실화면 검사 — 390×844 · 라이브/로컬 모두.

  python3 test/sharecard_ui.py --url https://life-turn-sim.vercel.app/ --tag live --out /workspace/verify-shots
  python3 test/sharecard_ui.py --serve . --tag local --out /workspace/verify-shots

하는 일
  1. 80세 직전 저장본(/workspace/end-save.json)을 심고 이어하기 → 마지막 달 → 엔딩
  2. 엔딩 화면의 `📸 결과 카드` 버튼이 보이고 390 안에 들어오는지 · 가로 넘침 0
  3. 버튼 → 미리보기 시트 → 카드 이미지(1080×1350) → 모달 스크린샷 · 카드 PNG 저장
  4. `이미지 저장` → PNG 다운로드(파일 이름·크기) 확인
  5. `공유하기` → 공유 시트 미지원(데스크톱 크로미움)이면 저장으로 폴백하는지
  6. 플레이 화면 `요약` 버튼으로도 같은 카드가 열리는지
  7. 카드 내용(이름·나이·등급·재산 표기·워터마크)이 model 과 맞는지
"""
import argparse
import base64
import functools
import json
import os
import re
import struct
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from playwright.sync_api import sync_playwright

CHROME = "/workspace/.cache/ms-playwright/chromium-1134/chrome-linux/chrome"
W, H = 390, 844
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


def png_size(path):
    with open(path, "rb") as f:
        head = f.read(24)
    if head[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    return struct.unpack(">II", head[16:24])


def to_ending(pg):
    pg.click("#resumeCard")
    pg.wait_for_timeout(800)
    pg.click("#choices .choice:not([disabled])")
    pg.wait_for_timeout(350)
    pg.click("#advanceBtn")
    pg.wait_for_timeout(1800)


SHARE_MOCK = """(() => {
  try {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: (d) => !!(d && d.files && d.files.length) });
    Object.defineProperty(navigator, 'share', { configurable: true, value: (d) => {
      window.__shared = { title: d.title, text: d.text,
        files: Array.from(d.files || []).map((f) => ({ name: f.name, type: f.type, size: f.size })) };
      return Promise.resolve();
    } });
  } catch (e) {}
})();"""


def share_path(url, save, args):
    """모바일 사파리처럼 navigator.share 가 있는 화면 — 공유 버튼이 뜨고 파일이 실린다"""
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME if os.path.exists(CHROME) else None,
                                    args=["--no-sandbox"])
        _share_flow(browser, url, save, args)
        browser.close()


def _share_flow(browser, url, save, args):
    ctx = browser.new_context(viewport={"width": W, "height": H}, device_scale_factor=2,
                              is_mobile=True, has_touch=True)
    pg = ctx.new_page()
    pg.add_init_script(SHARE_MOCK)
    pg.add_init_script("""
        try { localStorage.setItem('lifeTurnSim.save.v1', %s); } catch (e) {}
    """ % json.dumps(json.dumps(save, ensure_ascii=False)))
    pg.goto(url, wait_until="load")
    pg.wait_for_timeout(900)
    pg.click("#resumeCard")
    pg.wait_for_timeout(800)
    pg.click("#choices .choice:not([disabled])")
    pg.wait_for_timeout(350)
    pg.click("#advanceBtn")
    pg.wait_for_timeout(1800)
    pg.click("#endShare")
    pg.wait_for_timeout(700)
    check("공유 시트가 되는 기기면 공유 버튼이 보인다", pg.is_visible("#smShare"))
    note = pg.inner_text("#smNote")
    check("공유 안내 문구", "카카오톡" in note, note)
    pg.screenshot(path=os.path.join(args.out, f"sharecard-{args.tag}-03-share.png"))
    pg.click("#smShare")
    pg.wait_for_timeout(900)
    shared = pg.evaluate("() => window.__shared || null")
    files = (shared or {}).get("files") or []
    check("navigator.share({files}) 우선 사용", bool(files) and files[0]["name"].endswith(".png") and
          files[0]["type"] == "image/png" and files[0]["size"] > 20000,
          files[0] if files else shared)
    check("공유 글에 카드 숫자", bool(shared) and "80세" in shared["text"] and "life-turn-sim" in shared["text"],
          (shared or {}).get("text", "").replace("\n", " / "))
    ctx.close()


def summary_card(pg):
    """플레이 화면의 '요약'으로도 같은 결과 카드가 열린다"""
    pg.click("#summaryBtn")
    pg.wait_for_timeout(600)
    ok_btn = bool(pg.query_selector("#endShare")) and pg.is_visible("#endShare")
    check("요약 화면에도 📸 결과 카드 버튼", ok_btn)
    pg.click("#endShare")
    pg.wait_for_timeout(600)
    nat = pg.evaluate("() => { const i = document.getElementById('smImg'); return [i.naturalWidth, i.naturalHeight]; }")
    check("요약에서 연 카드도 1080×1350", nat == [1080, 1350], nat)
    pg.click("#smClose")
    pg.wait_for_timeout(250)
    pg.click("#endContinue")
    pg.wait_for_timeout(700)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--serve", default=None)
    ap.add_argument("--url", default=None)
    ap.add_argument("--tag", default="local")
    ap.add_argument("--out", default="/workspace/verify-shots")
    ap.add_argument("--save", default="/workspace/end-save.json")
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)

    httpd = None
    url = args.url
    if args.serve:
        httpd, url = serve(os.path.abspath(args.serve))
    save = json.load(open(args.save, encoding="utf-8"))

    errors = []
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME if os.path.exists(CHROME) else None, args=["--no-sandbox"])
        ctx = b.new_context(viewport={"width": W, "height": H}, device_scale_factor=2,
                            is_mobile=True, has_touch=True, accept_downloads=True)
        pg = ctx.new_page()
        pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.add_init_script("""
            try { localStorage.setItem('lifeTurnSim.save.v1', %s); } catch (e) {}
        """ % json.dumps(json.dumps(save, ensure_ascii=False)))
        pg.goto(url, wait_until="load")
        pg.wait_for_timeout(900)

        pg.click("#resumeCard")
        pg.wait_for_timeout(800)
        summary_card(pg)

        pg.click("#choices .choice:not([disabled])")
        pg.wait_for_timeout(350)
        pg.click("#advanceBtn")
        pg.wait_for_timeout(1800)
        text = pg.inner_text("#screen-ending")
        check("80세 뒤 엔딩 화면", pg.is_visible("#screen-ending"), text[:50].replace("\n", " "))

        btn = pg.query_selector("#endShare")
        check("엔딩에 📸 결과 카드 버튼", bool(btn) and btn.is_visible())
        if btn:
            box = btn.bounding_box()
            check("버튼이 390 화면 안 (가로)", box and box["x"] >= 0 and box["x"] + box["width"] <= W + 0.5,
                  f"{box}")
        over = pg.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
        check("엔딩 가로 넘침 0", over <= 0, f"{over}px")
        pg.screenshot(path=os.path.join(args.out, f"sharecard-{args.tag}-01-ending.png"))
        pg.eval_on_selector("#endShare", "el => el.scrollIntoView({block: 'center'})")
        pg.wait_for_timeout(350)
        pg.screenshot(path=os.path.join(args.out, f"sharecard-{args.tag}-01b-buttons.png"))

        # ── 미리보기 시트 ──
        pg.click("#endShare")
        pg.wait_for_timeout(700)
        check("미리보기 시트가 열린다", pg.is_visible("#shareModal"))
        sub = pg.inner_text("#smSub")
        check("시트 머리에 1080×1350·파일 이름", "1080×1350" in sub and ".png" in sub, sub)
        nat = pg.evaluate("() => { const i = document.getElementById('smImg'); return [i.naturalWidth, i.naturalHeight, i.complete]; }")
        check("카드 이미지 1080×1350", nat[0] == 1080 and nat[1] == 1350, nat)
        mbox = pg.evaluate("""() => { const r = document.getElementById('shareModal').getBoundingClientRect();
            const c = document.querySelector('#shareModal .sm-card').getBoundingClientRect();
            return {w: r.width, h: r.height, cw: c.width, ch: c.height}; }""")
        check("시트가 화면(390×844) 안에 들어온다", mbox["cw"] <= W and mbox["ch"] <= H, mbox)
        note = pg.inner_text("#smNote")
        check("미리보기에 저장 방법 안내(길게 누르기)", "길게" in note, note)
        over = pg.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
        check("미리보기 가로 넘침 0", over <= 0, f"{over}px")
        pg.screenshot(path=os.path.join(args.out, f"sharecard-{args.tag}-02-preview.png"))

        # 카드 PNG 저장 (미리보기에 실제로 그려진 이미지)
        src = pg.evaluate("() => document.getElementById('smImg').src")
        card_path = os.path.join(args.out, f"sharecard-{args.tag}-card.png")
        if src.startswith("data:image/png;base64,"):
            with open(card_path, "wb") as f:
                f.write(base64.b64decode(src.split(",", 1)[1]))
            check("카드 PNG 저장", png_size(card_path) == (1080, 1350), card_path)
        else:
            check("카드 PNG 저장", False, src[:40])

        # 카드 내용 — model 과 대조
        model = pg.evaluate("() => { const s = JSON.parse(localStorage.getItem('lifeTurnSim.save.v1')); return window.ShareCard.model(s); }")
        check("카드 model — 이름", model and model["name"], model and model["name"])
        check("카드 model — 나이/등급/재산", model and model["finalAge"] == 80 and model["grade"] and model["asset"],
              model and f"{model['finalAge']}세 · {model['grade']} · {model['asset']['text']}")
        check("재산 표기 규칙 (억/만/원)",
              model and re.search(r"(억|만|원)$", model["asset"]["text"]) is not None,
              model and model["asset"]["text"])
        check("카드 model — 워터마크", model and model["brand"] == "인생 한 턴", model and model["brand"])

        # ── 저장 버튼 → 다운로드 ──
        with pg.expect_download(timeout=8000) as dl_info:
            pg.click("#smSave")
        dl = dl_info.value
        dl_path = os.path.join(args.out, f"sharecard-{args.tag}-download.png")
        dl.save_as(dl_path)
        size = png_size(dl_path)
        check("이미지 저장 → PNG 다운로드", size == (1080, 1350), f"{dl.suggested_filename} · {size}")
        check("파일 이름 규칙", dl.suggested_filename.startswith("인생한턴_") and dl.suggested_filename.endswith(".png"),
              dl.suggested_filename)

        # ── 공유 버튼 → 시트 미지원이면 저장으로 폴백 ──
        share_btn_hidden = pg.evaluate("() => document.getElementById('smShare').hidden")
        check("공유 시트 미지원이면 공유 버튼 숨김", share_btn_hidden is True, share_btn_hidden)
        if not share_btn_hidden:
            with pg.expect_download(timeout=8000) as dl2_info:
                pg.click("#smShare")
            check("공유 → 저장 폴백", True, dl2_info.value.suggested_filename)

        pg.click("#smClose")
        pg.wait_for_timeout(300)
        check("닫기 → 시트 사라짐", not pg.is_visible("#shareModal"))

        # ── 플레이 화면 요약 버튼으로도 ──
        pg.click("#endRestart")
        pg.wait_for_timeout(900)
        check("새 인생 시작 → 시작 화면", pg.is_visible("#screen-start"))

        check("콘솔 오류 0건", len(errors) == 0, " / ".join(errors[:3]))
        b.close()

    share_path(url, save, args)

    if httpd:
        httpd.shutdown()
    fails = len([r for r in results if not r[0]])
    print(f"\n결과 카드 화면 검사: {len(results)} 항목 · 실패 {fails} 건")
    raise SystemExit(1 if fails else 0)


if __name__ == "__main__":
    main()
