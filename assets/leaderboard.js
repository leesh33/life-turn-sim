/* ─────────────────────────────────────────────
   leaderboard.js — 🏆 전체 유저 익명 랭킹 (Phase 2)
   ─────────────────────────────────────────────
   · 로그인한 사람의 인생 기록을 Supabase(life_sim_leaderboard)에 올리고,
     모두의 기록을 총점·자산 순으로 읽어 온다.
   · 공개되는 것은 캐릭터 이름 · 엔딩 칭호 · 점수 · 자산 · 나이 · 대수 · 시나리오뿐이다.
     이메일·실명은 보내지도 저장하지도 않는다(닉네임은 기본 '익명 플레이어').
   · 엔딩(졸업 등록·80세 완주)에서 자동으로 올린다 — 단, 로그인했고 자동 등록이 켜져 있을 때만.
     끄면 아무것도 올라가지 않고, 「내 기록 올리기」로 직접 올릴 수 있다.
   · 서버 RPC: life_sim_leaderboard_list / _submit / _clear (supabase/life_sim_leaderboard.sql)
   · SQL 을 아직 실행하지 않았거나 네트워크가 막히면 조용히 실패하고,
     화면은 '준비 중' 안내와 이 기기 기록 기준 백분위로 대신한다.
   ───────────────────────────────────────────── */
(function (global) {
  'use strict';

  var SUPABASE_URL = 'https://zdcdvjlssncsawpqsjwe.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_pLkbspw3eIAOO41uVSr-tA_9Asecqzq';

  var RPC_LIST = 'life_sim_leaderboard_list';
  var RPC_SUBMIT = 'life_sim_leaderboard_submit';
  var RPC_CLEAR = 'life_sim_leaderboard_clear';

  var NICK_KEY = 'lifeTurnSim.leaderboard.nick.v1';
  var AUTO_KEY = 'lifeTurnSim.leaderboard.auto.v1';
  var SENT_KEY = 'lifeTurnSim.leaderboard.sent.v1';

  var DEFAULT_NICK = '익명 플레이어';
  var LIMIT = 30;
  var MAX_SENT = 60;

  var state = { loading: false, error: '', at: 0, data: null };

  /* ── 잡동사니 ── */
  function now() { return Date.now(); }
  function num(v) { return typeof v === 'number' && isFinite(v) ? v : 0; }
  function store() { try { return global.localStorage || null; } catch (e) { return null; } }
  function readJson(key, fallback) {
    var s = store();
    if (!s) return fallback;
    try {
      var raw = s.getItem(key);
      if (!raw) return fallback;
      var v = JSON.parse(raw);
      return v == null ? fallback : v;
    } catch (e) { return fallback; }
  }
  function writeJson(key, value) {
    var s = store();
    if (!s) return;
    try { s.setItem(key, JSON.stringify(value)); } catch (e) {}
  }
  function dispatch(name, detail) {
    try {
      if (typeof global.CustomEvent === 'function' && typeof global.dispatchEvent === 'function') {
        global.dispatchEvent(new global.CustomEvent(name, { detail: detail || {} }));
      }
    } catch (e) {}
  }

  /* ── 로그인 상태 (sync.js 가 있으면 그 세션을 그대로 본다) ── */
  function session() {
    try {
      if (global.CloudSync && typeof global.CloudSync.session === 'function') return global.CloudSync.session();
    } catch (e) {}
    return null;
  }
  function signedIn() { return !!session(); }
  function userId() { var s = session(); return (s && s.user && s.user.id) || ''; }

  /* ── 닉네임 ── */
  function nick() {
    var v = readJson(NICK_KEY, null);
    var s = typeof v === 'string' ? v : (v && typeof v.nick === 'string' ? v.nick : '');
    s = clean(s, 12);
    return s || DEFAULT_NICK;
  }
  function setNick(value) {
    var s = clean(value, 12) || DEFAULT_NICK;
    writeJson(NICK_KEY, s);
    return s;
  }
  // 구글 프로필 이름(있을 때만). 이메일 앞부분으로 대신하지 않는다.
  function profileName() {
    var s = session() || {};
    var u = s.user || {};
    var m = u.user_metadata || {};
    var name = m.full_name || m.name || m.display_name || m.user_name || '';
    return clean(name, 12);
  }

  /* ── 이름 다듬기 (서버의 life_sim_lb_clean 과 같은 규칙) ── */
  function clean(text, max) {
    var v = String(text == null ? '' : text);
    v = v.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/g, '');   // 이메일 모양 제거
    v = v.replace(/[\u0000-\u001F\u007F]/g, ' ');             // 제어문자
    v = v.replace(/\s+/g, ' ').trim();
    if (max && v.length > max) v = v.slice(0, max).trim();
    return v;
  }

  /* ── 자동 등록 (기본 켜짐 · 로그인했을 때만 동작) ── */
  function auto() {
    var v = readJson(AUTO_KEY, null);
    if (v === false || v === 'off' || (v && v.on === false)) return false;
    return true;
  }
  function setAuto(on) {
    writeJson(AUTO_KEY, !!on);
    return !!on;
  }

  /* ── 이미 올린 기록 (같은 인생을 다시 올리지 않게) ── */
  function sentMap() {
    var m = readJson(SENT_KEY, null);
    return (m && typeof m === 'object') ? m : {};
  }
  function markSent(runKey, info) {
    var m = sentMap();
    m[runKey] = { at: now(), score: num(info && info.score), rank: num(info && info.rank) };
    var keys = Object.keys(m);
    if (keys.length > MAX_SENT) {
      keys.sort(function (a, b) { return num(m[a].at) - num(m[b].at); });
      keys.slice(0, keys.length - MAX_SENT).forEach(function (k) { delete m[k]; });
    }
    writeJson(SENT_KEY, m);
  }
  function isSent(runKey) { return !!sentMap()[runKey]; }
  function sentCount() { return Object.keys(sentMap()).length; }

  /* ── 엔진 점수 공식 (engine.js lifeScore 와 같은 식 · 2026-11-28 동기화) ──
     예전에는 이 파일과 Supabase 함수가 옛 공식(여섯 게이지 평균 × 0.55 + 재산 몫 최대 45,
     log10/4.6)을 검증에 쓰고 있었다. 앱의 엔진은 2026-11-25에
     ‘게이지 평균 × 0.40 + 재산 점수(0~56, log10/5.3 의 제곱)’으로 통일됐으므로
     검증도 그 식으로 맞춘다. (예: 재산 1억 · 게이지 낮음 = 32점대도 정상 기록이다) */
  var SCORE = { gauge: 0.40, asset: 56, assetLog: 5.3, tolerance: 0.6 };
  function assetScoreOf(assets) {
    if (!(assets > 0)) return 0;
    var norm = Math.log10(assets + 1) / SCORE.assetLog;
    return Math.max(0, Math.min(SCORE.asset, norm * norm * SCORE.asset));
  }
  // 기록의 능력치로 점수를 다시 매긴다 — 옛 공식으로 저장된 전당 기록도 서버와 같은 값이 된다
  function scoreOfRecord(rec) {
    rec = rec || {};
    var st = rec.stats || {};
    var hasGauges = global.Life && typeof global.Life.scoreOfStats === 'function' &&
      ['hp', 'mental', 'charm', 'social', 'intel', 'luck'].every(function (k) { return typeof st[k] === 'number'; });
    if (hasGauges) {
      try { return Math.round(global.Life.scoreOfStats(st) * 10) / 10; } catch (e) { /* 아래 기존 값 */ }
    }
    return Math.round(num(rec.score) * 10) / 10;
  }

  /* ── 서버에 보낼 한 건 만들기 ── */
  function payloadOf(rec, nickName) {
    rec = rec || {};
    var st = rec.stats || {};
    return {
      p_run_key: String(rec.id || ''),
      p_character_name: clean(rec.name, 24),
      p_title: clean(rec.title, 90),
      p_archetype: clean(rec.archetype, 24),
      p_final_age: Math.round(num(rec.age)),
      p_grade: String(rec.grade || 'B').toUpperCase().slice(0, 1),
      p_score: scoreOfRecord(rec),
      p_net_assets: Math.round(num(st.asset)),
      p_scenario: String(rec.scenario || 'kr').toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'kr',
      p_generation: Math.max(1, Math.round(num(rec.generation) || 1)),
      p_display_name: clean(nickName, 20) || DEFAULT_NICK
    };
  }

  // 서버가 거부할 값은 미리 걸러 낸다(왕복 없이 안내).
  function validate(p) {
    if (!p || typeof p !== 'object') return { ok: false, reason: '기록이 없습니다' };
    if (!p.p_run_key) return { ok: false, reason: '기록 id 가 없습니다' };
    if (!p.p_character_name) return { ok: false, reason: '캐릭터 이름이 없습니다' };
    if (/@/.test(p.p_character_name) || /@/.test(p.p_display_name)) return { ok: false, reason: '이메일은 공개할 수 없습니다' };
    if (!(p.p_score >= 0 && p.p_score <= 100)) return { ok: false, reason: '점수는 0~100 사이여야 합니다' };
    if (p.p_net_assets < -1000000 || p.p_net_assets > 100000000) return { ok: false, reason: '재산 값이 범위를 벗어났습니다' };
    if (p.p_final_age < 0 || p.p_final_age > 120) return { ok: false, reason: '나이는 0~120 사이여야 합니다' };
    var a = assetScoreOf(p.p_net_assets);
    // 게이지 몫은 0~40 — 그 범위를 벗어난 조합은 서버도 거절한다
    if (p.p_score < a - SCORE.tolerance || p.p_score > 40 + a + SCORE.tolerance) {
      return { ok: false, reason: '점수와 재산이 맞지 않습니다' };
    }
    return { ok: true };
  }

  /* ── HTTP ── */
  // 인증이 필요한 요청의 토큰 — sync.js 가 있으면 만료 시 갱신까지 맡긴다.
  // (동시에 여러 곳이 갱신을 부르면 GoTrue 의 리프레시 토큰 회전 때문에 한쪽이 400 으로 거절당한다.
  //  sync.js 의 token() 은 그 갱신을 하나로 합쳐 두었다.)
  function authToken() {
    try {
      if (global.CloudSync && typeof global.CloudSync.token === 'function') {
        return Promise.resolve(global.CloudSync.token());
      }
    } catch (e) { /* 아래 기본 경로 */ }
    var s = session();
    if (!s || !s.access_token) return Promise.reject(new Error('로그인이 필요합니다'));
    return Promise.resolve(s.access_token);
  }

  function api(path, opts) {
    opts = opts || {};
    var headers = { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
    var ready = Promise.resolve();
    if (opts.auth) {
      ready = authToken().then(function (t) { headers.Authorization = 'Bearer ' + t; });
    }
    return ready.then(function () {
      return global.fetch(SUPABASE_URL + path, {
        method: opts.method || 'POST',
        headers: headers,
        body: opts.body == null ? undefined : JSON.stringify(opts.body),
        cache: 'no-store',
        credentials: 'omit'
      }).then(function (res) {
        return res.text().then(function (text) {
          var data = null;
          try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
          if (!res.ok) {
            var msg = (data && (data.message || data.msg || data.hint || data.error_description || data.error)) || ('HTTP ' + res.status);
            var err = new Error(String(msg));
            err.status = res.status;
            err.code = (data && data.code) || '';
            throw err;
          }
          return data;
        });
      });
    });
  }

  function tokenValid() {
    var s = session();
    if (!s || !s.access_token) return false;
    return !(s.expires_at && s.expires_at - 60000 <= now());
  }

  /* ── 목록 읽기 ── */
  function fetchList(sort) {
    var p = { p_sort: sort === 'assets' ? 'assets' : 'score', p_limit: LIMIT };
    var best = localBest();
    if (best && typeof best.score === 'number') p.p_my_best_score = Math.round(best.score * 10) / 10;
    state.loading = true;
    state.error = '';
    return api('/rest/v1/rpc/' + RPC_LIST, { body: p }).then(function (data) {
      state.loading = false;
      state.at = now();
      state.data = data || null;
      return data;
    }).catch(function (e) {
      state.loading = false;
      state.at = now();
      state.error = friendly(e);
      throw e;
    });
  }

  function friendly(e) {
    var msg = String((e && e.message) || '');
    if (!msg || /Failed to fetch|NetworkError|Load failed/i.test(msg)) return '네트워크에 연결하지 못했습니다';
    if (e && (e.status === 400 || e.status === 401) && /refresh token|invalid_grant|expired/i.test(msg)) {
      return '로그인이 만료됐어요 · 다시 로그인해 주세요';
    }
    if (e && (e.status === 404 || /does not exist|schema cache|not find/i.test(msg))) return '전체 랭킹 서버가 아직 준비 중입니다';
    if (e && e.status === 401) {
      return signedIn() ? '로그인이 만료됐어요 · 다시 로그인해 주세요' : '로그인이 필요합니다';
    }
    return msg.slice(0, 80);
  }

  /* ── 등록 ── */
  function submitRecord(rec) {
    if (!signedIn()) return Promise.reject(new Error('로그인이 필요합니다'));
    var payload = payloadOf(rec, nick());
    var v = validate(payload);
    if (!v.ok) return Promise.reject(new Error(v.reason));
    return api('/rest/v1/rpc/' + RPC_SUBMIT, { body: payload, auth: true }).then(function (res) {
      markSent(payload.p_run_key, { score: payload.p_score, rank: res && res.rank });
      var out = { ok: true, id: res && res.id, rank: res && res.rank, total: res && res.total,
        score: payload.p_score, name: payload.p_character_name };
      dispatch('life-sim-leaderboard-submitted', out);
      return out;
    }).catch(function (e) {
      var out = { ok: false, error: friendly(e), name: payload.p_character_name };
      dispatch('life-sim-leaderboard-failed', out);
      throw e;
    });
  }

  // 이 기기 전당에서 아직 안 올린 내 기록 중 점수 높은 것부터 n건
  function pendingRecords(n) {
    var Life = global.Life;
    var list = [];
    try { list = (Life && typeof Life.hallMine === 'function' ? Life.hallMine() : []) || []; } catch (e) { list = []; }
    var sent = sentMap();
    return list.filter(function (r) { return r && r.id && !sent[r.id]; }).slice(0, n || 1);
  }

  function submitBest(n) {
    var list = pendingRecords(n || 1);
    if (!list.length) return Promise.resolve({ ok: true, skipped: true });
    var chain = Promise.resolve(null);
    var done = [];
    list.forEach(function (r) {
      chain = chain.then(function () {
        return submitRecord(r).then(function (res) { done.push(res); }).catch(function () {});
      });
    });
    return chain.then(function () { return { ok: done.length > 0, results: done }; });
  }

  function clearMine() {
    if (!signedIn()) return Promise.reject(new Error('로그인이 필요합니다'));
    return api('/rest/v1/rpc/' + RPC_CLEAR, { body: {}, auth: true }).then(function (res) {
      writeJson(SENT_KEY, {});
      return res;
    });
  }

  /* ── 이 기기 기록 기준 백분위 (서버가 없을 때 대신) ── */
  function localBest() {
    try {
      if (global.Life && typeof global.Life.hallBestMine === 'function') return global.Life.hallBestMine();
    } catch (e) {}
    return null;
  }
  function localTopPercent(score) {
    if (score == null || !isFinite(num(score))) return null;
    var v = num(score);
    // 1) 완주(life80) 기준 분포가 있으면 그것으로
    var d = global.LIFE_REFDIST;
    var t = d && d.life80 && d.life80.score;
    if (t && t.p && t.p.length > 1) {
      var p = t.p, i;
      if (v <= p[0]) return 100;
      if (v >= p[p.length - 1]) return 1;
      for (i = 0; i < p.length - 1; i++) {
        if (v >= p[i] && v <= p[i + 1]) {
          var span = p[i + 1] - p[i];
          var below = i + (span > 0 ? (v - p[i]) / span : 0);
          return Math.max(1, Math.min(100, Math.round(100 - below)));
        }
      }
    }
    // 2) 없으면 이 기기 전당 기록(가상 인물 시드 포함)에서 몇 명보다 위인지로 센다
    var recs = [];
    try {
      if (global.Life && typeof global.Life.hallRecords === 'function') recs = global.Life.hallRecords() || [];
    } catch (e) { recs = []; }
    if (recs.length < 8) return null;   // 표본이 너무 적으면 백분위를 말하지 않는다
    var better = 0;
    for (var j = 0; j < recs.length; j++) if (num(recs[j] && recs[j].score) > v) better++;
    return Math.max(1, Math.min(100, Math.ceil((100 * better) / recs.length)));
  }

  /* ── 엔진에서 새 기록이 생기면 ── */
  function onHallAdd(rec) {
    if (!rec || !rec.id) return;
    if (!signedIn()) return;          // 로그인 전에는 아무것도 올리지 않는다
    if (!auto()) return;
    // 토큰이 만료 임박이면 동기화가 갱신할 때까지 기다린다(중복 시도 방지)
    if (!tokenValid()) return;
    submitRecord(rec).catch(function () { /* 화면 이벤트로만 알린다 */ });
  }

  function start() {
    if (global.document && typeof global.addEventListener === 'function') {
      global.addEventListener('life-sim-hall-add', function (e) {
        onHallAdd(e && e.detail);
      });
    }
  }

  global.Leaderboard = {
    start: start,
    nick: nick,
    setNick: setNick,
    profileName: profileName,
    auto: auto,
    setAuto: setAuto,
    signedIn: signedIn,
    list: fetchList,
    submitRecord: submitRecord,
    submitBest: submitBest,
    pendingRecords: pendingRecords,
    isSent: isSent,
    sentCount: sentCount,
    clearMine: clearMine,
    localBest: localBest,
    localTopPercent: localTopPercent,
    clean: clean,
    status: function () { return { loading: state.loading, error: state.error, at: state.at, data: state.data }; },
    _test: {
      payloadOf: payloadOf,
      validate: validate,
      assetScoreOf: assetScoreOf,
      clean: clean,
      localTopPercent: localTopPercent,
      onHallAdd: onHallAdd,
      friendly: friendly,
      authToken: authToken,
      sentMap: sentMap,
      markSent: markSent,
      config: { url: SUPABASE_URL, list: RPC_LIST, submit: RPC_SUBMIT, clear: RPC_CLEAR,
        nick: NICK_KEY, auto: AUTO_KEY, sent: SENT_KEY, limit: LIMIT, defaultNick: DEFAULT_NICK }
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
