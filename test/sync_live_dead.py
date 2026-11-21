#!/usr/bin/env python3
"""라이브 실서버 확인 — 진짜 Supabase 에 죽은 리프레시 토큰을 들고 가서
400(Refresh token is not valid)을 실제로 받았을 때 화면이 어떻게 되는지 본다.

가짜 응답을 가로채지 않는다(요청/응답 모두 실서버). 기기에 남은 세션만 심는다.
"""
import json
import os
import sys

from playwright.sync_api import sync_playwright

CHROME = "/workspace/.cache/ms-playwright/chromium-1134/chrome-linux/chrome"
URL = "https://life-turn-sim.vercel.app/"
OUT = "/workspace/browser/life-sim-sync"

INIT = """
(() => { try {
  const s = { access_token: 'stale-access-token', refresh_token: 'stale-refresh-token',
    expires_at: Date.now() - 5000,
    user: { id: 'stale-user', email: 'andy.leesh33@gmail.com', user_metadata: { full_name: 'Andy Lee' } } };
  localStorage.clear();
  localStorage.setItem('lifeTurnSim.auth.session.v1', JSON.stringify(s));
} catch (e) {} })();
"""

results = []


def ok(name, cond, extra=""):
    results.append(bool(cond))
    print(("PASS" if cond else "FAIL") + " · " + name + ((" — " + str(extra)) if extra else ""))


os.makedirs(OUT, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME, args=["--no-sandbox", "--disable-dev-shm-usage"])
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=1,
                              is_mobile=True, has_touch=True)
    ctx.add_init_script(INIT)
    page = ctx.new_page()
    errors = []
    net = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("response", lambda r: net.append({"url": r.url, "status": r.status}) if "supabase.co" in r.url else None)
    page.goto(URL, wait_until="networkidle")
    page.wait_for_timeout(2500)

    row = page.locator("#syncRow").inner_text().replace("\n", " ")
    ok("실서버 400 → 다시 로그인 안내", "다시 로그인" in row, row)
    ok("로그인 칩이 돌아온다", "Google로 로그인" in row)
    ok("세션을 정리했다", page.evaluate("() => localStorage.getItem('lifeTurnSim.auth.session.v1')") is None)
    refresh = [n for n in net if "grant_type=refresh_token" in n["url"]]
    ok("실서버 리프레시 응답은 400", refresh and refresh[0]["status"] == 400,
       refresh[0] if refresh else "요청 없음")
    ok("되풀이 요청 없음(1회)", len(refresh) == 1, f"{len(refresh)}회")
    ok("'동기화 실패 · 다시 시도' 로 남지 않는다", "동기화 실패" not in row, row)
    ok("JS 오류 0건", not [e for e in errors if "Failed to load resource" not in e],
       [e for e in errors if "Failed to load resource" not in e][:2])
    page.screenshot(path=os.path.join(OUT, "live-real-400-390x844.png"))

    # 만료 안내 뒤 다시 시도해도 실서버를 부르지 않는다
    before = len([n for n in net if "supabase.co" in n["url"]])
    page.evaluate("() => window.CloudSync.syncNow()")
    page.wait_for_timeout(800)
    after = len([n for n in net if "supabase.co" in n["url"]])
    ok("다시 시도해도 요청 0건", after == before, f"{after - before}건")
    browser.close()

print(f"\n실서버 확인: {len(results)} 항목 · 실패 {results.count(False)} 건")
sys.exit(1 if results.count(False) else 0)
