/* ─────────────────────────────────────────────
   sync.js — ☁️ 구글 로그인 · 클라우드 동기화 (선택)
   ─────────────────────────────────────────────
   · 로그인 없이도 그대로 논다. 로그인은 "기기를 바꿔도 이어서" 쓰고 싶을 때만.
   · 로그인하면 아래 네 가지를 Supabase(life_sim_user_state)에 합쳐서 올리고 내려받는다.
       - 진행 중 인생(lifeTurnSim.save.v1)
       - 명예의 전당(lifeTurnSim.hall.v1)      ← 카메오 인물도 전당 기록에서 나온다
       - 칭호 도감(lifeTurnSim.titles.v1)
       - 직업·인연 도감(lifeTurnSim.codex.v1)   ← 2026-11-28 추가
   · 합치기(merge)는 잃지 않는 쪽으로 한다.
       - 전당: id 기준 합집합(같은 기록은 한 번만)
       - 칭호: id 기준 합집합(먼저 딴 기록을 남긴다)
       - 진행 중 인생: 마지막으로 저장한 쪽(updatedAt). 다만 지금 이 화면에서
         플레이 중이면 이 기기의 인생이 이긴다(플레이 도중에 남의 기록으로 갈아치우지 않게).
   · 저장은 RPC life_sim_put_state 하나로만. revised_at 이 더 과거면 서버가 무시하고
     지금 상태를 돌려주므로, 앱은 돌려받은 값과 다르면 한 번 더 합쳐 올린다.
   · 인증은 Supabase GoTrue 의 OAuth(PKCE) 를 fetch 로 직접 부른다(외부 스크립트 없음).
   ───────────────────────────────────────────── */
(function (global) {
  'use strict';

  var SUPABASE_URL = 'https://zdcdvjlssncsawpqsjwe.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_pLkbspw3eIAOO41uVSr-tA_9Asecqzq';

  var TABLE = 'life_sim_user_state';
  var RPC_PUT = 'life_sim_put_state';
  var RPC_WIPE = 'life_sim_delete_my_account';        // supabase/life_sim_account_delete.sql
  var RPC_LB_CLEAR = 'life_sim_leaderboard_clear';    // supabase/life_sim_leaderboard.sql

  var SAVE_KEY = 'lifeTurnSim.save.v1';
  var HALL_KEY = 'lifeTurnSim.hall.v1';
  var TITLES_KEY = 'lifeTurnSim.titles.v1';
  var CODEX_KEY = 'lifeTurnSim.codex.v1';     // 💼 직업 · 💕 인연 도감 (2026-11-28)

  var SESSION_KEY = 'lifeTurnSim.auth.session.v1';
  var PKCE_KEY = 'lifeTurnSim.auth.pkce.v1';
  var META_KEY = 'lifeTurnSim.sync.meta.v1';
  var DEVICE_KEY = 'lifeTurnSim.sync.device.v1';

  var VERSION = 1;
  var PUSH_DELAY = 1400;        // 저장 뒤 서버로 올리기까지 (연속 턴을 묶어서)
  var MINE_MAX = 240;           // 엔진 HALL_MAX 와 같은 값 — 내 기록은 최근 240건
  var B64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

  var EXPIRED_TEXT = '로그인이 만료됐어요 · 다시 로그인해 주세요';

  var status = { state: 'off', error: '', at: 0 };   // off | syncing | synced | error | expired
  var targets = [];             // 칩을 그릴 자리(시작 화면·전당)
  var pushTimer = null;
  var inflight = null;
  var refreshInflight = null;   // 동시에 만료된 토큰을 갱신하려는 요청은 하나로 합친다
  var dirty = false;
  var wrapped = false;
  var started = false;

  /* ── 잡동사니 ── */
  function now() { return Date.now(); }
  function num(v) { return typeof v === 'number' && isFinite(v) ? v : 0; }
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function store() {
    try { return global.localStorage || null; } catch (e) { return null; }
  }
  function readRaw(key) {
    var s = store();
    if (!s) return null;
    try { return s.getItem(key); } catch (e) { return null; }
  }
  function writeRaw(key, value) {
    var s = store();
    if (!s) return;
    try { s.setItem(key, value); } catch (e) { /* 사파리 프라이빗 모드 등 */ }
  }
  function removeRaw(key) {
    var s = store();
    if (!s) return;
    try { s.removeItem(key); } catch (e) {}
  }
  function readJson(key, fallback) {
    var raw = readRaw(key);
    if (!raw) return fallback;
    try {
      var v = JSON.parse(raw);
      return v == null ? fallback : v;
    } catch (e) { return fallback; }
  }
  function writeJson(key, value) {
    try { writeRaw(key, JSON.stringify(value)); } catch (e) {}
  }
  // 서버는 jsonb 라 키 순서를 바꿔 돌려준다 → 키 순서를 맞춰 놓고 비교한다
  // (순서만 달라도 "다르다"고 보면 저장을 한 번 더 하게 된다)
  function canon(v) {
    if (v == null || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(canon);
    var out = {}, keys = Object.keys(v).sort(), i;
    for (i = 0; i < keys.length; i++) out[keys[i]] = canon(v[keys[i]]);
    return out;
  }
  function same(a, b) {
    try { return JSON.stringify(canon(a)) === JSON.stringify(canon(b)); } catch (e) { return false; }
  }

  /* ── 세션 ── */
  function session() {
    var s = readJson(SESSION_KEY, null);
    if (!s || !s.access_token || !s.user || !s.user.id) return null;
    return s;
  }
  function sessionSave(tok) {
    var prev = session();
    var s = {
      access_token: tok.access_token,
      refresh_token: tok.refresh_token || (prev && prev.refresh_token) || '',
      expires_at: tok.expires_at ? num(tok.expires_at) * 1000
        : now() + (num(tok.expires_in) || 3600) * 1000,
      user: tok.user || (prev && prev.user) || null
    };
    writeJson(SESSION_KEY, s);
    return s;
  }
  function user() { var s = session(); return s ? s.user : null; }
  function displayName() {
    var u = user() || {};
    var m = u.user_metadata || {};
    var name = m.full_name || m.name || m.display_name || m.user_name || '';
    name = String(name || '').trim();
    if (!name && u.email) name = String(u.email).split('@')[0];
    return name || '내 계정';
  }
  function displayEmail() { var u = user() || {}; return String(u.email || ''); }

  /* ── PKCE (S256) ── */
  function randomString(len) {
    var out = '', i;
    var c = global.crypto || global.msCrypto;
    if (c && c.getRandomValues) {
      var bytes = new Uint8Array(len);
      c.getRandomValues(bytes);
      for (i = 0; i < len; i++) out += B64URL.charAt(bytes[i] % 64);
      return out;
    }
    for (i = 0; i < len; i++) out += B64URL.charAt(Math.floor(Math.random() * 64));
    return out;
  }
  function toB64Url(buf) {
    var bytes = new Uint8Array(buf), bin = '', i;
    for (i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return global.btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function challengeFor(verifier) {
    var subtle = global.crypto && global.crypto.subtle;
    if (!subtle) return Promise.resolve('');
    var enc = new global.TextEncoder().encode(verifier);
    return subtle.digest('SHA-256', enc).then(toB64Url);
  }

  /* ── HTTP ── */
  function api(path, opts) {
    opts = opts || {};
    var headers = {
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    };
    if (opts.token) headers.Authorization = 'Bearer ' + opts.token;
    if (opts.prefer) headers.Prefer = opts.prefer;
    return global.fetch(SUPABASE_URL + path, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body == null ? undefined : JSON.stringify(opts.body),
      cache: 'no-store',
      credentials: 'omit'
    }).then(function (res) {
      return res.text().then(function (text) {
        var data = null;
        try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
        if (!res.ok) {
          var msg = (data && (data.msg || data.message || data.error_description || data.error)) ||
            ('HTTP ' + res.status);
          var err = new Error(String(msg));
          err.status = res.status;
          err.data = data;
          throw err;
        }
        return data;
      });
    });
  }

  // 리프레시 토큰이 거절당했는가 — Supabase GoTrue 는 이 경우 401 이 아니라 400 으로 답한다
  //   (예: {code:400, error_code:'validation_failed', msg:'Refresh token is not valid'},
  //        'Invalid Refresh Token: Already Used')
  function refreshDead(e) {
    var st = e && e.status;
    return st === 400 || st === 401;
  }

  // 죽은 세션 정리 — 이 기기에서 로그인 정보만 지우고, 화면에는 다시 로그인할 수 있게 안내를 남긴다.
  // (예전에는 400 을 그대로 오류로만 보여 줘서, 죽은 리프레시 토큰을 든 채로
  //  '동기화 실패 · 다시 시도' 에 영원히 갇혔다)
  function expireSession() {
    removeRaw(SESSION_KEY);
    removeRaw(PKCE_KEY);
    if (pushTimer) { global.clearTimeout(pushTimer); pushTimer = null; }
    dirty = false;
    setStatus('expired', EXPIRED_TEXT);
  }

  function tokenRefresh() {
    if (refreshInflight) return refreshInflight;   // 같은 순간 여러 곳이 불러도 요청은 한 번만
    var s = session();
    if (!s || !s.refresh_token) return Promise.reject(new Error(EXPIRED_TEXT));
    var used = s.refresh_token;
    refreshInflight = api('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      body: { refresh_token: used }
    }).then(function (tok) {
      refreshInflight = null;
      return sessionSave(tok).access_token;
    }, function (e) {
      refreshInflight = null;
      // 이 요청이 실패하는 사이 다른 탭·기기가 먼저 갱신해 리프레시 토큰이 바뀌었으면
      // 저장소에 새로 들어온 세션으로 이어 간다(멀쩡한 로그인을 지우지 않는다).
      var fresh = session();
      if (fresh && fresh.refresh_token && fresh.refresh_token !== used &&
          fresh.expires_at - 60000 > now()) return fresh.access_token;
      if (refreshDead(e)) expireSession();   // 정말 만료됐다 → 다시 로그인 안내
      throw e;
    });
    return refreshInflight;
  }

  function token() {
    var s = session();
    if (!s) return Promise.reject(new Error(EXPIRED_TEXT));
    if (s.expires_at - 60000 > now()) return Promise.resolve(s.access_token);
    return tokenRefresh();
  }

  // 본인 행 읽기/쓰기. 401(만료)이면 한 번 더 시도한다 —
  // 그 사이 다른 탭이 토큰을 갱신해 두었으면 새 토큰을 그대로 쓰고, 아니면 한 번만 갱신한다.
  function withToken(fn, retried) {
    var used = '';
    return token().then(function (t) {
      used = t;
      return fn(t);
    }).catch(function (e) {
      if (!e || e.status !== 401 || retried) throw e;
      var s = session();
      if (!s) throw e;
      var next;
      if (s.access_token && s.access_token !== used && s.expires_at - 60000 > now()) {
        next = Promise.resolve(s.access_token);        // 다른 탭이 이미 갱신했다
      } else if (!s.refresh_token) {
        expireSession();
        throw e;
      } else {
        next = tokenRefresh();                         // 동시 호출은 하나로 합쳐진다
      }
      return next.then(function () { return withToken(fn, true); });
    });
  }

  function pull() {
    var uid = (user() || {}).id;
    if (!uid) return Promise.resolve(null);
    var path = '/rest/v1/' + TABLE + '?select=data,revised_at&user_id=eq.' + encodeURIComponent(uid);
    return withToken(function (t) {
      return api(path, { token: t });
    }).then(function (rows) {
      if (!Array.isArray(rows) || !rows.length) return null;
      var row = rows[0];
      return { data: row.data || null, revised_at: num(row.revised_at) };
    });
  }

  function put(bundle) {
    return withToken(function (t) {
      return api('/rest/v1/rpc/' + RPC_PUT, {
        method: 'POST',
        token: t,
        body: { p_data: bundle, p_revised_at: num(bundle.at) }
      });
    });
  }

  /* ── 로그인 / 로그아웃 ── */
  // 기본은 Google. Apple 은 assets/config.js 의 SHOW_APPLE_SIGNIN 이 켜졌을 때만 내보낸다.
  var PROVIDER_LABEL = { google: 'Google', apple: 'Apple' };

  /* ── iOS 앱(Expo WebView 래퍼) 다리 ─────────────────────────────
     앱은 페이지 스크립트보다 먼저 아래를 심는다.
       window.__LIFETURN_NATIVE__ = { shell: 'ios', appleAuth: true, appVersion: '1.0.0' }
     앱 안에서는 페이지가 외부 주소로 이동하지 않는다(로그인 창은 앱이 띄운다).
       · Apple  : 앱의 네이티브 Sign in with Apple → id_token → Supabase id_token grant
       · Google : 앱이 ASWebAuthenticationSession 으로 열고 `lifeturn://auth-callback` 로 돌아옴
     돌아온 주소는 앱이 window.LifeNative.oauthCallback(url) 로 넘겨 준다(PKCE verifier 는 이 페이지에 있음).
     웹에서는 지금처럼 페이지 이동(OAuth 리다이렉트) 방식 그대로. */
  var NATIVE_REDIRECT = 'lifeturn://auth-callback';

  function nativeInfo() {
    var n = global.__LIFETURN_NATIVE__;
    return (n && typeof n === 'object') ? n : null;
  }
  function nativeApp() { return !!(nativeInfo() && nativeInfo().shell); }
  function nativePost(msg) {
    try {
      if (global.ReactNativeWebView && typeof global.ReactNativeWebView.postMessage === 'function') {
        global.ReactNativeWebView.postMessage(JSON.stringify(msg));
        return true;
      }
    } catch (e) { /* 다리가 없으면 웹 방식으로 */ }
    return false;
  }

  function providerOn(name) {
    if (name === 'apple') {
      if (!(global.LifeFlags && global.LifeFlags.SHOW_APPLE_SIGNIN)) return false;
      // 앱 = 네이티브 Apple 로그인 · 웹 = 이 서비스 전용 Services ID 를 켰을 때만(지금은 꺼 둠)
      return !!(nativeInfo() && nativeInfo().appleAuth) ||
        !!(global.LifeFlags && global.LifeFlags.APPLE_SIGNIN_WEB);
    }
    return true;
  }

  function signIn(provider) {
    provider = provider === 'apple' ? 'apple' : 'google';
    if (!providerOn(provider)) {
      return Promise.reject(new Error(PROVIDER_LABEL[provider] + ' 로그인은 아직 준비 중입니다'));
    }
    var native = nativeApp() ? nativeInfo() : null;

    // 앱 · Apple — 네이티브 창을 띄우고 id_token 을 돌려받는다(PKCE 불필요)
    if (native && provider === 'apple') {
      setStatus('syncing');
      if (nativePost({ type: 'apple-signin' })) return Promise.resolve('lifeturn:apple-native');
      setStatus('off');
      return Promise.reject(new Error('Apple 로그인 창을 열지 못했습니다'));
    }

    var verifier = randomString(56);
    writeJson(PKCE_KEY, { verifier: verifier, at: now() });
    return challengeFor(verifier).then(function (challenge) {
      // 앱은 페이지 이동 대신 커스텀 스킴으로 돌아온다(앱이 브라우저 창을 닫고 주소를 넘겨 줌)
      var base = native ? NATIVE_REDIRECT
        : (global.location ? global.location.origin + global.location.pathname : '');
      var url = SUPABASE_URL + '/auth/v1/authorize?provider=' + provider +
        '&redirect_to=' + encodeURIComponent(base) +
        (challenge ? '&code_challenge=' + encodeURIComponent(challenge) + '&code_challenge_method=s256' : '');
      if (native) {
        setStatus('syncing');
        if (nativePost({ type: 'oauth', url: url })) return url;
        setStatus('off');
        throw new Error('로그인 창을 열지 못했습니다');
      }
      if (global.location) global.location.assign(url);
      return url;
    });
  }

  /* ── 앱에서 돌아온 로그인 응답 마무리 ── */
  // Google 등 OAuth: lifeturn://auth-callback?code=… → PKCE verifier 로 세션 교환
  function completeOAuthCallback(url) {
    var raw = String(url || '');
    var hash = '';
    var hashAt = raw.indexOf('#');
    if (hashAt >= 0) { hash = raw.slice(hashAt); raw = raw.slice(0, hashAt); }
    var qAt = raw.indexOf('?');
    var q = parseQuery(qAt >= 0 ? raw.slice(qAt) : '');
    var h = parseQuery(hash);
    var errText = [q.error, h.error, q.error_description, h.error_description]
      .filter(Boolean).join(' ');
    if (errText) {
      var reason = /access_denied|cancel/i.test(errText) ? '로그인을 취소했습니다' : errText;
      setStatus('error', reason);
      return Promise.reject(new Error(reason));
    }
    var done;
    if (q.code) {
      var pkce = readJson(PKCE_KEY, null) || {};
      done = api('/auth/v1/token?grant_type=pkce', {
        method: 'POST',
        body: { auth_code: q.code, code_verifier: pkce.verifier || '' }
      }).then(function (tok) { return sessionSave(tok); });
    } else if (h.access_token) {
      done = Promise.resolve(sessionSave({
        access_token: h.access_token,
        refresh_token: h.refresh_token,
        expires_in: num(h.expires_in) || 3600
      }));
    } else {
      return Promise.reject(new Error('로그인 응답에 코드가 없습니다'));
    }
    return done.then(function () {
      removeRaw(PKCE_KEY);
      setStatus('syncing');
      notifySignedIn();
      return syncNow().then(function () { return true; }, function () { return true; });
    }).catch(function (e) {
      setStatus('error', friendlyError(e));
      throw new Error(friendlyError(e));
    });
  }

  // Apple 네이티브 로그인: identity token 을 Supabase 세션으로 바꾼다
  //   (Supabase Apple provider Client IDs 에 앱 번들 ID com.odol.lifeturn 이 들어 있어야 통과)
  function completeAppleSignIn(idToken, nonce) {
    var token = String(idToken || '');
    if (!token) return Promise.reject(new Error('Apple 로그인 응답이 비어 있습니다'));
    setStatus('syncing');
    return api('/auth/v1/token?grant_type=id_token', {
      method: 'POST',
      body: { provider: 'apple', id_token: token, nonce: nonce ? String(nonce) : '' }
    }).then(function (tok) { return sessionSave(tok); }).then(function () {
      setStatus('syncing');
      notifySignedIn();
      return syncNow().then(function () { return true; }, function () { return true; });
    }).catch(function (e) {
      setStatus('error', friendlyError(e));
      throw new Error(friendlyError(e));
    });
  }

  function signOutLocal() {
    removeRaw(SESSION_KEY);
    removeRaw(PKCE_KEY);
    setStatus('off');
  }
  function signOut() {
    var s = session();
    setStatus('off');
    removeRaw(SESSION_KEY);
    removeRaw(PKCE_KEY);
    if (!s) return Promise.resolve();
    return api('/auth/v1/logout', { method: 'POST', token: s.access_token }).catch(function () { /* 토큰 만료 등 */ });
  }

  function parseQuery(qs) {
    var out = {};
    String(qs || '').replace(/^[?#]/, '').split('&').forEach(function (pair) {
      if (!pair) return;
      var i = pair.indexOf('=');
      var k = i < 0 ? pair : pair.slice(0, i);
      var v = i < 0 ? '' : pair.slice(i + 1);
      try { out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' ')); }
      catch (e) { out[k] = v; }
    });
    return out;
  }

  function cleanUrl() {
    try {
      var loc = global.location;
      var clean = loc.origin + loc.pathname;
      global.history.replaceState({}, '', clean);
    } catch (e) {}
  }

  // 구글에서 돌아온 주소(?code=...)를 토큰으로 바꾼다.
  function completeRedirect() {
    var loc = global.location;
    if (!loc) return Promise.resolve(false);
    var q = parseQuery(loc.search);
    var h = parseQuery(loc.hash);
    var errText = [q.error, h.error, q.error_description, h.error_description]
      .filter(Boolean).join(' ');
    if (!q.code && !h.access_token && !errText) return Promise.resolve(false);

    cleanUrl();
    if (errText) {
      var reason = /access_denied|cancel/i.test(errText) ? '로그인을 취소했습니다' : errText;
      setStatus('error', reason);
      return Promise.resolve(false);
    }

    var done;
    if (h.access_token) {
      done = Promise.resolve(sessionSave({
        access_token: h.access_token,
        refresh_token: h.refresh_token,
        expires_in: num(h.expires_in) || 3600
      }));
    } else {
      var pkce = readJson(PKCE_KEY, null) || {};
      done = api('/auth/v1/token?grant_type=pkce', {
        method: 'POST',
        body: { auth_code: q.code, code_verifier: pkce.verifier || '' }
      }).then(function (tok) { return sessionSave(tok); });
    }

    return done.then(function () {
      removeRaw(PKCE_KEY);
      setStatus('syncing');
      return true;
    }).catch(function (e) {
      setStatus('error', String((e && e.message) || '로그인에 실패했습니다'));
      return false;
    });
  }

  /* ── 로컬 ↔ 클라우드 합치기 ── */
  function deviceId() {
    var d = readRaw(DEVICE_KEY);
    if (d) return d;
    d = 'd' + now().toString(36) + '-' + randomString(8);
    writeRaw(DEVICE_KEY, d);
    return d;
  }

  function progressOf(s) {
    if (!s) return -1;
    var score = (s.ended ? 1 : 0) * 1e9;
    return score + (s.history ? s.history.length : 0) * 1000 + num(s.age) * 12 + num(s.month);
  }
  function stampOf(s, fallback) {
    if (s && typeof s.updatedAt === 'number') return s.updatedAt;
    return num(fallback);
  }

  function mergeHall(a, b) {
    a = a || {}; b = b || {};
    var seen = {}, out = [];
    function add(rec) {
      if (!rec || !rec.id || seen[rec.id]) return;
      seen[rec.id] = 1;
      out.push(rec);
    }
    (a.records || []).forEach(add);
    (b.records || []).forEach(add);

    // 내 기록은 최근 240건까지만 (가상 인물 시드 기록은 그대로 둔다)
    var mine = out.filter(function (r) { return r && r.mine; })
      .sort(function (x, y) { return num(y.ts) - num(x.ts); });
    var keepMine = {};
    mine.slice(0, MINE_MAX).forEach(function (r) { keepMine[r.id] = 1; });
    var records = out.filter(function (r) { return !r.mine || keepMine[r.id]; });

    return {
      v: 1,
      seeded: !!(a.seeded || b.seeded || records.length),
      records: records
    };
  }

  function mergeTitles(a, b) {
    var out = {};
    function putMap(m) {
      Object.keys(m || {}).forEach(function (id) {
        var rec = m[id];
        if (!rec) return;
        var prev = out[id];
        if (!prev) { out[id] = rec; return; }
        var pa = typeof prev.at === 'number' ? prev.at : Infinity;
        var ra = typeof rec.at === 'number' ? rec.at : Infinity;
        if (ra < pa) out[id] = rec;         // 먼저 딴 쪽을 남긴다
      });
    }
    putMap(a); putMap(b);
    return out;
  }

  // 💼 직업 · 💕 인연 도감도 칭호와 같은 규칙(먼저 만난 기록을 남긴다)
  function mergeCodex(a, b) { return mergeTitles(a, b); }

  function mergeBundles(local, cloud, opts) {
    local = local || {}; cloud = cloud || {}; opts = opts || {};

    var localAt = num(local.saveAt) || stampOf(local.save, 0);
    var cloudAt = num(cloud.saveAt) || stampOf(cloud.save, 0);

    // 플레이 중인 화면이 있으면 이 기기의 인생을 지킨다(플레이 도중에 남의 기록으로 갈아치우지 않게).
    // 그 밖에는 마지막으로 저장한 쪽, 시각이 같으면 더 많이 진행된 쪽.
    var takeLocal;
    if (opts.preferLocalRun && local.save) takeLocal = true;
    else if (localAt > cloudAt) takeLocal = true;
    else if (cloudAt > localAt) takeLocal = false;
    else takeLocal = progressOf(local.save) >= progressOf(cloud.save);

    var save = takeLocal ? (local.save || null) : (cloud.save || null);
    var saveAt = takeLocal ? localAt : cloudAt;
    if (!save) saveAt = Math.max(localAt, cloudAt);

    return {
      v: VERSION,
      at: Math.max(num(local.at), num(cloud.at)),
      save: save,
      saveAt: saveAt,
      hall: mergeHall(local.hall, cloud.hall),
      titles: mergeTitles(local.titles, cloud.titles),
      codex: mergeCodex(local.codex, cloud.codex),
      device: local.device || cloud.device || ''
    };
  }

  function bundleLocal() {
    var meta = readJson(META_KEY, {}) || {};
    var save = readJson(SAVE_KEY, null);
    var hall = readJson(HALL_KEY, null) || {};
    var titles = readJson(TITLES_KEY, null) || {};
    var codex = readJson(CODEX_KEY, null) || {};
    return {
      v: VERSION,
      at: num(meta.at),
      save: save || null,
      saveAt: num(meta.saveAt) || stampOf(save, 0),
      hall: { v: 1, seeded: !!hall.seeded, records: Array.isArray(hall.records) ? hall.records : [] },
      titles: (titles && typeof titles === 'object') ? titles : {},
      codex: (codex && typeof codex === 'object') ? codex : {},
      device: deviceId()
    };
  }

  function applyBundle(b) {
    if (!b) return;
    var written = false;
    if (b.save) {
      var prevSave = readRaw(SAVE_KEY);
      var nextSave = JSON.stringify(b.save);
      if (prevSave !== nextSave) { writeRaw(SAVE_KEY, nextSave); written = true; }
    } else if (readRaw(SAVE_KEY) !== null) {
      removeRaw(SAVE_KEY);
      written = true;
    }

    var hall = { v: 1, seeded: !!((b.hall || {}).seeded), records: (b.hall || {}).records || [] };
    if (!same(readJson(HALL_KEY, null), hall)) { writeJson(HALL_KEY, hall); written = true; }

    var titles = b.titles || {};
    if (!same(readJson(TITLES_KEY, null), titles)) { writeJson(TITLES_KEY, titles); written = true; }

    var codex = b.codex || {};
    if (!same(readJson(CODEX_KEY, null), codex)) { writeJson(CODEX_KEY, codex); written = true; }

    var meta = readJson(META_KEY, {}) || {};
    meta.at = Math.max(num(meta.at), num(b.at));
    meta.saveAt = num(b.saveAt) || num(meta.saveAt);
    writeJson(META_KEY, meta);

    return written;
  }

  /* ── 동기화 ── */
  function isPlaying() {
    try {
      if (global.LifeApp && typeof global.LifeApp.isPlaying === 'function') return !!global.LifeApp.isPlaying();
    } catch (e) { /* 앱이 아직 안 떴으면 로컬이 곧 진실 */ }
    return false;
  }

  function setStatus(state, error) {
    status.state = state;
    status.error = error || '';
    status.at = now();
    renderAll();
    try {
      if (typeof global.CustomEvent === 'function' && global.dispatchEvent) {
        global.dispatchEvent(new global.CustomEvent('life-sim-sync', {
          detail: { state: state, error: status.error, name: session() ? displayName() : '' }
        }));
      }
    } catch (e) {}
  }

  function notifyApplied() {
    try {
      if (typeof global.CustomEvent === 'function' && global.dispatchEvent) {
        global.dispatchEvent(new global.CustomEvent('life-sim-sync-applied', { detail: {} }));
      }
    } catch (e) {}
  }

  /* ── 🗑️ 계정 및 클라우드 기록 삭제(회원탈퇴) ──
     App Store 5.1.1(v). 두 갈래로 동작한다.
       1) 서버 함수 life_sim_delete_my_account 가 있으면 그것으로
          · life_sim_leaderboard · life_sim_user_state 의 본인 행을 지우고
          · 같은 계정을 쓰는 다른 앱(릴스핀)에 기록이 없을 때만 auth 계정까지 지운다
          (supabase/life_sim_account_delete.sql — 안 돌렸으면 2번으로)
       2) 함수가 없으면 앱이 아는 길로 지운다 — 랭킹 clear RPC + 본인 상태행 DELETE(RLS).
     끝나면 이 기기의 인생 한 턴 기록(lifeTurnSim.*)과 로그인 세션을 지운다.
     릴스핀은 다른 주소·다른 저장소라 이 기기 기록에는 손대지 않는다. */
  function num0(v) { return typeof v === 'number' && isFinite(v) ? v : 0; }

  function purgeLocal() {
    var keys = {};
    // ① 앱이 아는 키(열거가 안 되는 환경에서도 반드시 지운다)
    [SAVE_KEY, HALL_KEY, TITLES_KEY, CODEX_KEY, SESSION_KEY, PKCE_KEY, META_KEY, DEVICE_KEY,
      'lifeTurnSim.leaderboard.nick.v1', 'lifeTurnSim.leaderboard.auto.v1',
      'lifeTurnSim.leaderboard.sent.v1', 'lifeTurnSim.bannerClosed',
      'lifeTurnSim.scenario.v1', 'lifeTurnSim.flash.v1', 'lifeTurnSim.autoPaused'
    ].forEach(function (k) { keys[k] = 1; });
    // ② 나머지 lifeTurnSim.* 도 있으면 함께(릴스핀 등 다른 앱 키는 다른 접두사라 건드리지 않는다)
    var s = store();
    if (s) {
      try {
        for (var i = 0; i < (s.length || 0); i++) {
          var k = s.key ? s.key(i) : null;
          if (k && k.indexOf('lifeTurnSim') === 0) keys[k] = 1;
        }
      } catch (e) { /* 열거 불가 — ① 만으로 충분 */ }
    }
    Object.keys(keys).forEach(removeRaw);
  }

  function deletionOut(res, fallbackMode) {
    res = (res && typeof res === 'object') ? res : {};
    return {
      ok: true,
      mode: fallbackMode || 'rpc',
      accountDeleted: !!res.account_deleted,
      keptForOtherApps: !!res.kept_for_other_apps,
      stateRows: num0(res.state_rows),
      leaderboardRows: num0(res.leaderboard_rows)
    };
  }

  // 서버 함수가 아직 없을 때 — 앱이 아는 범위에서 지운다(릴스핀 테이블은 건드리지 않는다)
  function wipeByApp(t, uid) {
    var out = { ok: true, account_deleted: false, kept_for_other_apps: false,
      state_rows: 0, leaderboard_rows: 0 };
    return api('/rest/v1/rpc/' + RPC_LB_CLEAR, { method: 'POST', token: t, body: {} })
      .then(function (r) { out.leaderboard_rows = num0(r && r.removed); }, function () { /* 있으면 좋고 */ })
      .then(function () {
        return api('/rest/v1/' + TABLE + '?user_id=eq.' + encodeURIComponent(uid), {
          method: 'DELETE', token: t, prefer: 'return=representation'
        }).then(function (rows) {
          out.state_rows = Array.isArray(rows) ? rows.length : 0;
        });
      })
      .then(function () { return out; });
  }

  function deleteAccount() {
    var s = session();
    if (!s || !s.user || !s.user.id) return Promise.reject(new Error('다시 로그인한 뒤 시도해 주세요'));
    var uid = s.user.id;
    setStatus('syncing');
    return withToken(function (t) {
      return api('/rest/v1/rpc/' + RPC_WIPE, { method: 'POST', token: t, body: {} })
        .then(function (res) { return deletionOut(res, 'rpc'); })
        .catch(function (e) {
          if (e && e.status === 401) throw e;
          var msg = String((e && e.message) || '');
          var missing = (e && (e.status === 404 || e.status === 400)) &&
            /does not exist|schema cache|Could not find|not find/i.test(msg);
          if (!missing) throw e;
          return wipeByApp(t, uid).then(function (res) { return deletionOut(res, 'app'); });
        });
    }).then(function (out) {
      purgeLocal();
      removeRaw(SESSION_KEY);
      removeRaw(PKCE_KEY);
      setStatus('off');
      notifyDeleted(out);
      return out;
    }).catch(function (e) {
      setStatus(session() ? 'error' : 'off', friendlyError(e));
      throw new Error(friendlyError(e));
    });
  }

  function notifyDeleted(out) {
    try {
      if (typeof global.CustomEvent === 'function' && global.dispatchEvent) {
        global.dispatchEvent(new global.CustomEvent('life-sim-account-deleted', { detail: out || {} }));
      }
    } catch (e) {}
  }

  function notifySignedIn() {
    try {
      if (typeof global.CustomEvent === 'function' && global.dispatchEvent) {
        global.dispatchEvent(new global.CustomEvent('life-sim-sync-signed-in', {
          detail: { name: displayName() }
        }));
      }
    } catch (e) {}
  }

  function doSync() {
    var local = bundleLocal();
    return pull().then(function (row) {
      var cloud = row && row.data ? row.data : null;
      var merged = mergeBundles(local, cloud, { preferLocalRun: isPlaying() });
      merged.at = Math.max(now(), num(merged.at), row ? num(row.revised_at) : 0, num(local.at)) + 1;
      merged.device = deviceId();
      applyBundle(merged);

      return put(merged).then(function (stored) {
        if (!stored || typeof stored !== 'object') return merged;
        // 서버가 더 새 상태를 갖고 있었다(내 revised_at 이 과거) → 한 번 더 합쳐 올린다
        if (same(stored, merged)) return merged;
        var again = mergeBundles(merged, stored, { preferLocalRun: isPlaying() });
        again.at = Math.max(num(merged.at), num(stored.at)) + 1;
        again.device = deviceId();
        applyBundle(again);
        return put(again).then(function () { return again; });
      });
    }).then(function (finalBundle) {
      var meta = readJson(META_KEY, {}) || {};
      meta.at = Math.max(num(meta.at), num(finalBundle && finalBundle.at));
      meta.saveAt = num((finalBundle && finalBundle.saveAt) || meta.saveAt);
      writeJson(META_KEY, meta);
      setStatus('synced');
      notifyApplied();
      return finalBundle;
    });
  }

  function syncNow() {
    if (!session()) {
      if (status.state !== 'expired') setStatus('off');   // 만료 안내는 그대로 두고 다시 로그인하게
      return Promise.resolve(null);
    }
    if (inflight) { dirty = true; return inflight; }
    setStatus('syncing');
    inflight = doSync().then(function (res) {
      inflight = null;
      if (!session()) return null;          // 도중에 만료돼 정리됐으면 만료 안내를 지우지 않는다
      if (dirty) { dirty = false; return syncNow(); }
      return res;
    }).catch(function (e) {
      inflight = null;
      dirty = false;
      if (!session()) {                     // 만료로 세션을 정리한 경우 → 다시 로그인 안내
        if (status.state !== 'expired') setStatus('expired', EXPIRED_TEXT);
        return null;
      }
      setStatus('error', friendlyError(e));
      return null;
    });
    return inflight;
  }

  function friendlyError(e) {
    var msg = String((e && e.message) || '');
    if (!msg || /Failed to fetch|NetworkError|Load failed/i.test(msg)) return '네트워크에 연결하지 못했습니다';
    if (refreshDead(e)) return EXPIRED_TEXT;
    if (e && e.status === 401) return '로그인 확인이 필요해요 · 다시 시도해 주세요';
    return msg.slice(0, 60);
  }

  // 모바일에서는 title 툴팁이 보이지 않는다 → 칩 아래에 짧은 사유를 글자로 남긴다
  function shortError(msg) {
    var v = String(msg || '').replace(/\s+/g, ' ').trim();
    if (v.length > 42) v = v.slice(0, 41).trim() + '…';
    return v;
  }

  function queuePush() {
    if (!session()) return;
    if (pushTimer) global.clearTimeout(pushTimer);
    pushTimer = global.setTimeout(function () {
      pushTimer = null;
      syncNow();
    }, PUSH_DELAY);
  }

  // 새 인생을 시작해 저장본을 지웠다는 사실도 클라우드에 남긴다(다른 기기에서 되살아나지 않게)
  function forgetRun() {
    var meta = readJson(META_KEY, {}) || {};
    meta.saveAt = now();
    meta.at = Math.max(num(meta.at), meta.saveAt) + 1;
    writeJson(META_KEY, meta);
    queuePush();
  }

  /* ── 화면(칩) ── */
  function render(el) {
    if (!el) return;
    var hall = el.getAttribute('data-sync-hall') === '1';
    var html;

    if (status.state === 'off' || status.state === 'expired') {
      var expired = status.state === 'expired';
      html = '<button type="button" class="sync-pill" data-sync="in">' +
          '<span class="sp-g" aria-hidden="true">G</span><span>Google로 로그인</span></button>';
      // Apple 로그인 — SHOW_APPLE_SIGNIN 이 켜졌을 때만 내보낸다
      if (providerOn('apple')) {
        html += '<button type="button" class="sync-pill apple" data-sync="apple">' +
          '<span class="sp-apple" aria-hidden="true">\uF8FF</span><span>Apple로 로그인</span></button>';
      }
      html += '<span class="sync-note' + (expired ? ' warn' : '') + '">' + esc(expired
          ? (status.error || EXPIRED_TEXT)
          : (hall
            ? '로그인하면 전당·칭호·진행이 기기 사이로 이어집니다 (선택)'
            : '로그인하면 기기 간에 이어집니다 (선택)')) + '</span>';
    } else {
      var label = status.state === 'syncing' ? '동기화 중…'
        : status.state === 'error' ? '동기화 실패 · 다시 시도' : '동기화됨';
      var who = displayName();
      var mail = displayEmail();
      var detail = hall && mail ? ' · ' + mail : '';
      // 실패 사유는 title 툴팁에만 두면 아이폰에서는 보이지 않는다 → 짧게 글자로도 남긴다
      var why = status.state === 'error' && status.error
        ? '<span class="sync-why">' + esc(shortError(status.error)) + '</span>' : '';
      html = '<button type="button" class="sync-pill on' + (status.state === 'error' ? ' err' : '') +
          '" data-sync="' + (status.state === 'error' ? 'retry' : 'info') + '"' +
          (status.error ? ' title="' + esc(status.error) + '"' : '') + '>' +
          '<span class="sp-cloud" aria-hidden="true">☁️</span><span>' + esc(label) + '</span></button>' +
        '<span class="sync-note">' + esc(who) + esc(detail) + '</span>' + why +
        '<button type="button" class="sync-out" data-sync="out">로그아웃</button>';
    }

    if (el.innerHTML !== html) el.innerHTML = html;
    el.setAttribute('data-state', status.state);
  }

  function renderAll() {
    targets = targets.filter(function (el) { return el && el.isConnected !== false; });
    targets.forEach(render);
  }

  function mount(el) {
    if (!el || targets.indexOf(el) >= 0) return;
    targets.push(el);
    if (!el.__syncBound) {
      el.__syncBound = true;
      el.addEventListener('click', function (e) {
        var btn = e.target.closest ? e.target.closest('[data-sync]') : null;
        if (!btn) return;
        var act = btn.getAttribute('data-sync');
        if (act === 'in') { e.preventDefault(); signIn('google'); }
        else if (act === 'apple') { e.preventDefault(); signIn('apple').catch(function (er) { setStatus('error', friendlyError(er)); }); }
        else if (act === 'out') { e.preventDefault(); signOut(); }
        else if (act === 'retry') { e.preventDefault(); syncNow(); }
      });
    }
    render(el);
  }

  /* ── 엔진에 걸기 ── */
  function wrapEngine() {
    var Life = global.Life;
    if (!Life || wrapped) return;

    if (typeof Life.save === 'function') {
      var origSave = Life.save;
      Life.save = function (s) {
        try {
          if (s && typeof s === 'object') {
            s.updatedAt = now();
            var meta = readJson(META_KEY, {}) || {};
            meta.saveAt = s.updatedAt;
            writeJson(META_KEY, meta);
          }
        } catch (e) {}
        var out = origSave.apply(this, arguments);
        queuePush();
        return out;
      };
    }

    if (typeof Life.clear === 'function') {
      var origClear = Life.clear;
      Life.clear = function () {
        var out = origClear.apply(this, arguments);
        forgetRun();
        return out;
      };
    }

    wrapped = true;
  }

  function start() {
    if (started) return;
    started = true;
    wrapEngine();

    var onVisible = function () {
      var s = session();
      if (!s) return;
      if (global.document && global.document.visibilityState === 'hidden') {
        // 앱이 곧 멈출 수 있는 순간에 토큰 갱신을 "시작"하면, iOS 가 페이지를 재우는 사이
        // 서버는 리프레시 토큰을 회전시켰는데 응답을 받지 못해 세션이 죽는다.
        // 그래서 아직 유효한 토큰일 때만 남은 저장을 흘려보낸다.
        if (!inflight && s.expires_at - 60000 > now()) syncNow();
      } else {
        syncNow();
      }
    };
    if (global.document && global.document.addEventListener) {
      global.document.addEventListener('visibilitychange', onVisible);
    }

    completeRedirect().then(function (signedIn) {
      if (signedIn) { notifySignedIn(); return syncNow(); }
      if (session()) {
        setStatus('syncing');
        return syncNow();
      }
      setStatus('off');
      return null;
    }).then(function () {
      renderAll();
    }, function () {
      renderAll();
    });
  }

  /* 앱(네이티브 래퍼)이 injectJavaScript 로 부르는 다리.
     예) window.LifeNative.oauthCallback('lifeturn://auth-callback?code=...')
         window.LifeNative.appleSignIn('<identityToken>', '<raw nonce>') */
  global.LifeNative = {
    oauthCallback: function (url) {
      completeOAuthCallback(url).then(function () {}, function () {});
      return 'ok';
    },
    appleSignIn: function (idToken, nonce) {
      completeAppleSignIn(idToken, nonce).then(function () {}, function () {});
      return 'ok';
    },
    native: nativeApp,
    appleReady: function () { return !!(nativeInfo() && nativeInfo().appleAuth); },
    signedIn: function () { return !!session(); },
    status: function () { return { state: status.state, error: status.error, at: status.at }; },
    redirect: NATIVE_REDIRECT
  };

  global.CloudSync = {
    start: start,
    mount: mount,
    renderAll: renderAll,
    syncNow: syncNow,
    signIn: signIn,
    signOut: signOut,
    deleteAccount: deleteAccount,
    forgetRun: forgetRun,
    session: session,
    token: token,              // 만료면 갱신까지 해서 유효한 액세스 토큰을 준다 (leaderboard.js 가 쓴다)
    status: function () { return { state: status.state, error: status.error, at: status.at }; },
    name: displayName,
    email: displayEmail,
    _test: {
      mergeBundles: mergeBundles,
      mergeHall: mergeHall,
      mergeTitles: mergeTitles,
      mergeCodex: mergeCodex,
      bundleLocal: bundleLocal,
      applyBundle: applyBundle,
      progressOf: progressOf,
      parseQuery: parseQuery,
      completeRedirect: completeRedirect,
      completeOAuthCallback: completeOAuthCallback,
      completeAppleSignIn: completeAppleSignIn,
      nativeApp: nativeApp,
      signIn: signIn,
      providerOn: providerOn,
      deleteAccount: deleteAccount,
      wipeByApp: wipeByApp,
      purgeLocal: purgeLocal,
      syncNow: syncNow,
      randomString: randomString,
      challengeFor: challengeFor,
      sessionSave: sessionSave,
      tokenRefresh: tokenRefresh,
      expireSession: expireSession,
      canon: canon,
      shortError: shortError,
      status: function () { return status; },
      config: { url: SUPABASE_URL, table: TABLE, rpc: RPC_PUT,
        wipe: RPC_WIPE, lbClear: RPC_LB_CLEAR,
        save: SAVE_KEY, hall: HALL_KEY, titles: TITLES_KEY, codex: CODEX_KEY,
        session: SESSION_KEY, meta: META_KEY, device: DEVICE_KEY }
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
