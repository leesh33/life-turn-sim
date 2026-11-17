"""💬 제안·제보 게시판 검증 — 390 뷰포트에서 진입 버튼·모달·작성·공감·중복 방지

사용:
  python3 test/feedback.py --serve .            # 로컬 서빙 (기본)
  python3 test/feedback.py --url https://life-turn-sim.vercel.app/

확인 항목
  1. 시작 화면 상단 '🏆 명예의 전당' + '💬 제안·제보' 두 버튼이 겹치지 않고 한 줄에 들어감
  2. 플레이 화면 상단 바의 4개 버튼이 잘리거나 밀리지 않음 (390×664 포함)
  3. 모달 열기 → 탭(이벤트 제안 / 버그·오타 제보) · 정렬(최신순 / 공감순) · 목록 로드
  4. 빈 글 검증(에러 문구), 실제 글 작성 → Supabase 저장 후 목록 맨 위에 표시
  5. 👍 공감 → 카운트 +1, 같은 기기에서 두 번째 누름은 차단(localStorage)
  6. 콘솔 에러 0건
"""

import argparse
import functools
import json
import os
import sys
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from playwright.sync_api import sync_playwright

CHROME = "/workspace/.cache/ms-playwright/chromium-1134/chrome-linux/chrome"

SB_MEASURE = """() => {
  const bar = document.querySelector('.statusbar');
  const actions = document.querySelector('.sb-actions');
  const who = document.querySelector('.sb-who');
  const btns = Array.from(document.querySelectorAll('.sb-actions .ghost-btn'));
  const vw = window.innerWidth;
  const barRect = bar.getBoundingClientRect();
  const actRect = actions.getBoundingClientRect();
  const whoRect = who.getBoundingClientRect();
  return {
    viewport: vw,
    bar: { left: Math.round(barRect.left), right: Math.round(barRect.right) },
    actions: { left: Math.round(actRect.left), right: Math.round(actRect.right), width: Math.round(actRect.width) },
    who: { left: Math.round(whoRect.left), right: Math.round(whoRect.right) },
    buttons: btns.map(b => ({ id: b.id, text: b.textContent.trim(), w: Math.round(b.getBoundingClientRect().width) })),
    overlapWho: whoRect.right > actRect.left + 0.5,
    overflowRight: actRect.right > vw + 0.5,
    wrap: new Set(btns.map(b => Math.round(b.getBoundingClientRect().top))).size > 1
  };
}"""

START_MEASURE = """() => {
  const top = document.querySelector('.brand-top');
  const hall = document.getElementById('hallBtnStart');
  const fb = document.getElementById('fbBtnStart');
  const h1 = document.querySelector('.brand h1');
  const vw = window.innerWidth;
  const t = top.getBoundingClientRect();
  const h = h1.getBoundingClientRect();
  const a = hall.getBoundingClientRect();
  const b = fb.getBoundingClientRect();
  // h1 은 블록이라 박스 폭이 화면 전체다 — 실제 글자 범위(text rect)로 겹침을 본다
  const range = document.createRange();
  range.selectNodeContents(h1);
  const textRect = range.getBoundingClientRect();
  return {
    viewport: vw,
    top: { left: Math.round(t.left), right: Math.round(t.right), width: Math.round(t.width) },
    hall: { left: Math.round(a.left), right: Math.round(a.right) },
    fb: { left: Math.round(b.left), right: Math.round(b.right) },
    titleRight: Math.round(textRect.right),
    titleBottom: Math.round(textRect.bottom),
    buttonsTop: Math.round(Math.min(a.top, b.top)),
    overlapTitle: textRect.right > a.left + 0.5 && textRect.bottom > Math.min(a.top, b.top) + 0.5,
    overlapEachOther: a.right > b.left + 0.5,
    overflowRight: t.right > vw + 0.5,
    sameRow: Math.abs(a.top - b.top) < 1
  };
}"""


def wait_cards(page, minimum=1, timeout=9000):
    """게시판 목록이 실제로 도착할 때까지 기다린다 (로딩/에러 상태 구분)."""
    try:
        page.wait_for_function(
            "(n) => document.querySelectorAll('.fb-card').length >= n || !!document.querySelector('.fb-state-error')",
            arg=minimum, timeout=timeout)
    except Exception:
        pass


def serve(directory, port):
    handler = functools.partial(SimpleHTTPRequestHandler, directory=directory)
    handler.log_message = lambda *a, **k: None
    httpd = ThreadingHTTPServer(("127.0.0.1", port), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def run(url, outdir, sizes, serve_dir=None, port=8831, keep_post=False):
    os.makedirs(outdir, exist_ok=True)
    httpd = None
    if serve_dir:
        httpd = serve(serve_dir, port)
        url = f"http://127.0.0.1:{port}/"

    problems = []
    results = {}
    stamp = time.strftime("%H%M%S")

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        for size in sizes:
            w, hh = (int(x) for x in size.lower().split("x"))
            ctx = browser.new_context(viewport={"width": w, "height": hh}, device_scale_factor=2,
                                      is_mobile=True, has_touch=True)
            page = ctx.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.on("console", lambda m: errors.append("console:" + m.text) if m.type == "error" else None)
            page.goto(url, wait_until="networkidle")
            page.evaluate("localStorage.clear()")
            page.reload(wait_until="networkidle")
            page.wait_for_timeout(400)

            start = page.evaluate(START_MEASURE)
            results[f"{w}x{hh}-start"] = start
            if start["overflowRight"]:
                problems.append(f"{size}: 시작 화면 제안·제보 버튼이 화면 밖 ({start['top']['right']} > {w})")
            if start["overlapEachOther"]:
                problems.append(f"{size}: 명예의 전당과 제안·제보 버튼이 겹침")
            if start["overlapTitle"]:
                problems.append(f"{size}: 제안·제보 버튼이 타이틀과 겹침")
            if not start["sameRow"]:
                problems.append(f"{size}: 상단 두 버튼이 한 줄이 아님")

            # 시작 화면에서 게시판 열기
            page.click("#fbBtnStart")
            page.wait_for_timeout(300)
            if page.is_hidden("#fbModal"):
                problems.append(f"{size}: 시작 화면에서 제보 모달이 열리지 않음")
            wait_cards(page)
            cards = page.eval_on_selector_all(".fb-card", "els => els.length")
            if cards < 1:
                state = page.eval_on_selector(".fb-list", "el => (el.textContent || '').trim().slice(0, 80)")
                problems.append(f"{size}: 게시판 목록이 비어 있음 (불러오기 실패 가능) — {state!r}")
            if hh == 664:
                page.screenshot(path=os.path.join(outdir, f"{stamp}-01-feedback-start-390x664.png"))
            page.click("#fbClose")
            page.wait_for_timeout(300)

            # 플레이 화면
            page.fill("#nameInput", "상훈")
            page.click("#startBtn")
            page.wait_for_timeout(500)
            sb = page.evaluate(SB_MEASURE)
            results[f"{w}x{hh}-sb"] = sb
            if sb["overflowRight"]:
                problems.append(f"{size}: 플레이 상단 버튼이 화면 밖으로 넘침 (right {sb['actions']['right']} > {sb['viewport']})")
            if sb["overlapWho"]:
                problems.append(f"{size}: 플레이 상단 버튼이 이름·나이를 침범")
            if sb["wrap"]:
                problems.append(f"{size}: 플레이 상단 버튼이 두 줄로 접힘")

            page.click("#fbBtnPlay")
            page.wait_for_timeout(300)
            if page.is_hidden("#fbModal"):
                problems.append(f"{size}: 플레이 화면에서 제보 모달이 열리지 않음")

            # 탭 전환
            page.click("#fbTabBug")
            wait_cards(page)
            bug_cards = page.eval_on_selector_all(".fb-card", "els => els.length")
            page.click("#fbTabIdea")
            wait_cards(page)

            # 정렬 토글
            page.click("#fbSort .fb-sort-btn[data-sort=like]")
            wait_cards(page)
            like_cards = page.eval_on_selector_all(".fb-card", "els => els.length")
            page.click("#fbSort .fb-sort-btn[data-sort=new]")
            wait_cards(page)

            if bug_cards < 1:
                problems.append(f"{size}: 버그·오타 제보 탭에 글이 없음 (탭 전환 로드 실패 가능)")

            if hh == 844:
                page.screenshot(path=os.path.join(outdir, f"{stamp}-02-feedback-play-390x844.png"))

                # 작성 검증: 빈 글
                page.click("#fbWrite")
                page.wait_for_timeout(300)
                page.click("#fbSubmit")
                page.wait_for_timeout(300)
                err = page.eval_on_selector("#fbError", "el => el.hidden ? '' : el.textContent")
                if not err:
                    problems.append("빈 글 제출이 막히지 않음 (검증 문구 없음)")
                page.screenshot(path=os.path.join(outdir, f"{stamp}-03-feedback-form-390x844.png"))

                # 실제 작성
                title = f"검증용 제안 {stamp}"
                body = "390x844 게시판 검증 스크립트가 남긴 글입니다. Supabase 저장 확인용."
                page.fill("#fbHead", title)
                page.fill("#fbContent", body)
                page.fill("#fbAuthor", "검증봇")
                page.click("#fbSubmit")
                page.wait_for_timeout(500)
                try:
                    page.wait_for_function(
                        "(n) => { const t = document.querySelector('.fb-card .fb-card-title'); return !!t && t.textContent === n; }",
                        arg=title, timeout=15000)
                except Exception:
                    pass
                first = page.eval_on_selector(".fb-card .fb-card-title", "el => el.textContent") if page.query_selector(".fb-card .fb-card-title") else ""
                if first != title:
                    problems.append(f"작성한 글이 목록 맨 위에 보이지 않음 (맨 위: {first!r})")
                saved_id = page.eval_on_selector(".fb-card", "el => el.dataset.id") if page.query_selector(".fb-card") else ""
                results["posted"] = {"title": title, "id": saved_id}
                page.screenshot(path=os.path.join(outdir, f"{stamp}-04-feedback-posted-390x844.png"))

                # 공감
                like_before = page.eval_on_selector(".fb-card .fb-like", "el => el.textContent.trim()")
                page.click(".fb-card .fb-like")
                page.wait_for_timeout(1500)
                like_after = page.eval_on_selector(".fb-card .fb-like", "el => el.textContent.trim()")
                if like_before.replace(" ", "") == like_after.replace(" ", ""):
                    problems.append(f"공감 카운트가 증가하지 않음 ({like_before} → {like_after})")
                liked_flag = page.eval_on_selector(".fb-card .fb-like", "el => el.className")
                if "liked" not in liked_flag:
                    problems.append("공감 후 버튼이 liked 상태가 아님")
                # 같은 기기에서 다시 눌러도 증가하지 않아야 한다
                page.eval_on_selector(".fb-card .fb-like", "el => { el.disabled = false; el.click(); }")
                page.wait_for_timeout(800)
                like_again = page.eval_on_selector(".fb-card .fb-like", "el => el.textContent.trim()")
                if like_again != like_after:
                    problems.append(f"같은 기기에서 공감이 두 번 올라감 ({like_after} → {like_again})")
                page.screenshot(path=os.path.join(outdir, f"{stamp}-05-feedback-liked-390x844.png"))

            results[f"{size}-cards"] = {"idea": cards, "bug": bug_cards, "likeSort": like_cards}
            if errors:
                problems.append(f"{size}: 콘솔/페이지 에러 {errors}")

            ctx.close()
        browser.close()

    if httpd:
        httpd.shutdown()

    print(json.dumps(results, ensure_ascii=False, indent=2))
    if problems:
        print("\n=== FAIL ===")
        for pr in problems:
            print(" -", pr)
        return 1
    print("\n=== PASS — 진입 버튼/모달/탭/정렬/작성/공감/중복 방지 모두 정상 ===")
    return 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://127.0.0.1:8831/")
    ap.add_argument("--out", default="/workspace/browser/life-sim/feedback")
    ap.add_argument("--sizes", default="390x664,390x844")
    ap.add_argument("--serve", default=None)
    ap.add_argument("--port", type=int, default=8831)
    ap.add_argument("--keep-post", action="store_true")
    a = ap.parse_args()
    sys.exit(run(a.url, a.out, a.sizes.split(","), a.serve, a.port, a.keep_post))
