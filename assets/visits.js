/* ─────────────────────────────────────────────
   visits.js — 📊 익명 접속자 기록 (어드민 통계용)
   ─────────────────────────────────────────────
   · 첫 화면을 열 때 **한 번** Supabase RPC `app_visit_track('life-turn', visitor_id)` 를 부릅니다.
     (DB: supabase/app_visits.sql — 릴스핀과 같은 프로젝트 `zdcdvjlssncsawpqsjwe`)
   · visitor_id — 이 기기에서 처음 만든 **임의의 UUID**. 이메일·위치·기기 정보는 보내지 않습니다.
     localStorage(`lifeTurnSim.visit.id.v1`)에 남아 다시 열어도 같은 사람으로 세어집니다.
     (같은 날 여러 번 열면 한 줄에 조회수만 늘어납니다 · 하루 한 사람 = 한 줄)
   · 로그인과 무관합니다(비로그인 포함). 실패하면 **조용히** 넘어갑니다 — 게임에는 영향 없음.
   · 관리자 여부(명예의 전당의 📊 어드민 버튼)는 이메일 목록으로만 **보여 줄지** 정하고,
     실제 통계는 서버(DB 함수 `app_visit_stats`)가 다시 확인합니다.
   ───────────────────────────────────────────── */
(function (global) {
  'use strict';

  var SUPABASE_URL = 'https://zdcdvjlssncsawpqsjwe.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_pLkbspw3eIAOO41uVSr-tA_9Asecqzq';
  var RPC_TRACK = 'app_visit_track';
  var APP_ID = 'life-turn';
  var VISIT_KEY = 'lifeTurnSim.visit.id.v1';
  var PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

  /* 앱 쪽(reelpin App.js)의 ADMIN_EMAILS 와 같은 목록 — 화면에서 버튼을 보여 줄지에만 쓴다 */
  var ADMIN_EMAILS = ['andy.leesh33@gmail.com', 'shhy@kakao.com'];

  var started = false;
  var last = null;

  function store() {
    try { return global.localStorage || null; } catch (e) { return null; }
  }

  function readId() {
    var s = store();
    if (!s) return '';
    try {
      var raw = s.getItem(VISIT_KEY);
      return PATTERN.test(String(raw || '')) ? String(raw) : '';
    } catch (e) {
      return '';
    }
  }

  function saveId(id) {
    var s = store();
    if (!s) return;
    try { s.setItem(VISIT_KEY, id); } catch (e) { /* 프라이버시 모드·용량 초과 → 이번 실행만 */ }
  }

  /** UUID v4 모양 (crypto.randomUUID 가 있으면 그대로, 없으면 직접) */
  function randomId() {
    var c = global.crypto || global.msCrypto;
    if (c && typeof c.randomUUID === 'function') {
      try { return c.randomUUID(); } catch (e) { /* 아래로 */ }
    }
    var hex = '0123456789abcdef';
    var out = '';
    for (var i = 0; i < 36; i++) {
      if (i === 8 || i === 13 || i === 18 || i === 23) { out += '-'; continue; }
      if (i === 14) { out += '4'; continue; }
      if (i === 19) { out += '89ab'[Math.floor(Math.random() * 4)]; continue; }
      out += hex[Math.floor(Math.random() * 16)];
    }
    return out;
  }

  /** 이 기기의 방문자 id — 없으면 만들어 저장한다. */
  function visitorId() {
    var saved = readId();
    if (saved) return saved;
    var fresh = randomId();
    if (!PATTERN.test(fresh)) fresh = 'life-turn-' + String(Date.now()) + '-' + String(Math.floor(Math.random() * 1e9));
    saveId(fresh);
    return fresh;
  }

  function isAdmin(email) {
    var v = String(email == null ? '' : email).trim().toLowerCase();
    return !!v && ADMIN_EMAILS.indexOf(v) >= 0;
  }

  function track() {
    if (started) return Promise.resolve({ ok: false, reason: 'already-tracked' });
    started = true;
    var id = visitorId();
    if (!PATTERN.test(id)) {
      started = false;
      return Promise.resolve({ ok: false, reason: 'invalid-visitor' });
    }
    var doFetch = typeof global.fetch === 'function' ? global.fetch : null;
    if (!doFetch) return Promise.resolve({ ok: false, reason: 'no-fetch' });
    return doFetch(SUPABASE_URL + '/rest/v1/rpc/' + RPC_TRACK, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_app_id: APP_ID, p_visitor_id: id })
    }).then(function (res) {
      if (!res || !res.ok) { last = { ok: false, reason: 'http-' + (res ? res.status : 'none') }; return last; }
      return res.json().then(function (data) {
        last = { ok: true, data: data || null };
        return last;
      }, function () {
        last = { ok: true, data: null };
        return last;
      });
    }, function () {
      last = { ok: false, reason: 'network' };
      return last;
    });
  }

  global.LifeVisits = {
    track: track,
    visitorId: visitorId,
    isAdmin: isAdmin,
    ADMIN_EMAILS: ADMIN_EMAILS,
    config: { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, appId: APP_ID, rpc: RPC_TRACK, key: VISIT_KEY },
    _test: {
      randomId: randomId,
      readId: readId,
      saveId: saveId,
      reset: function () { started = false; last = null; },
      last: function () { return last; }
    }
  };

  /* 첫 화면이 그려질 때 한 번 기록한다 (테스트처럼 document 가 없으면 부르지 않는다) */
  if (typeof global.document !== 'undefined' && global.document && typeof global.document.addEventListener === 'function') {
    if (global.document.readyState === 'loading') {
      global.document.addEventListener('DOMContentLoaded', function () { track(); });
    } else {
      track();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
