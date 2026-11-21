/* ─────────────────────────────────────────────
   admin.js — 📊 인생 한 턴 어드민 (/admin.html)
   ─────────────────────────────────────────────
   · 접속자 통계만 보여 주는 작은 관리자 화면입니다.
   · 로그인(☁️ Google)과 세션은 assets/sync.js 의 CloudSync 를 그대로 씁니다 —
     앱(index.html)에서 로그인했으면 그 세션이 그대로 살아 있습니다.
   · 통계는 Supabase RPC `app_visit_stats('life-turn', days)` 로만 받습니다.
     DB 함수가 `auth.jwt() ->> 'email'` 로 **관리자인지 다시 확인**하므로,
     화면의 이메일 목록은 버튼·안내를 보여 줄지 정하는 데만 씁니다.
   · 14일 / 30일 추이는 외부 차트 라이브러리 없이 div 막대로 그립니다.
   ───────────────────────────────────────────── */
(function (global) {
  'use strict';

  var SUPABASE_URL = 'https://zdcdvjlssncsawpqsjwe.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_pLkbspw3eIAOO41uVSr-tA_9Asecqzq';
  var RPC_STATS = 'app_visit_stats';
  var APP_ID = 'life-turn';
  var ADMIN_EMAILS = ['andy.leesh33@gmail.com', 'shhy@kakao.com'];
  var DAY_OPTIONS = [14, 30];

  var state = { days: 14, data: null, loading: false, gate: '', message: '', who: '' };

  function $(id) { return global.document ? global.document.getElementById(id) : null; }
  function el(tag, cls, text) {
    var node = global.document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = String(text);
    return node;
  }
  function cloud() { return global.CloudSync || null; }
  function session() {
    var c = cloud();
    try { return c && typeof c.session === 'function' ? c.session() : null; } catch (e) { return null; }
  }
  function email() {
    var c = cloud();
    try { return c && typeof c.email === 'function' ? String(c.email() || '') : ''; } catch (e) { return ''; }
  }
  function isAdminEmail(value) {
    var v = String(value == null ? '' : value).trim().toLowerCase();
    return !!v && ADMIN_EMAILS.indexOf(v) >= 0;
  }
  function num(v) { return typeof v === 'number' && isFinite(v) ? v : Number(v) || 0; }
  function shortDay(value) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
    return m ? m[2] + '.' + m[3] : '';
  }
  function comma(v) { return String(Math.round(num(v))).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  /** 막대 높이(%)·라벨 — daily 배열을 그대로 그릴 수 있게 다듬는다 */
  function buildBars(daily, days) {
    var list = Array.isArray(daily) ? daily : [];
    var max = 1;
    for (var i = 0; i < list.length; i++) max = Math.max(max, num(list[i] && list[i].visitors));
    var every = days > 20 ? 5 : 3;
    return list.map(function (row, index) {
      var visitors = num(row && row.visitors);
      var views = num(row && row.views);
      var height = Math.round((visitors / max) * 100);
      return {
        date: String((row && row.date) || ''),
        label: shortDay(row && row.date),
        visitors: visitors,
        views: views,
        height: visitors > 0 ? Math.max(4, height) : 0,
        showLabel: index === list.length - 1 || index % every === 0
      };
    });
  }

  function fetchStats(days, token) {
    var doFetch = typeof global.fetch === 'function' ? global.fetch : null;
    if (!doFetch) return Promise.reject(new Error('네트워크를 쓸 수 없어요'));
    return doFetch(SUPABASE_URL + '/rest/v1/rpc/' + RPC_STATS, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_app_id: APP_ID, p_days: days })
    }).then(function (res) {
      return res.text().then(function (raw) {
        var body = null;
        try { body = raw ? JSON.parse(raw) : null; } catch (e) { body = null; }
        return { ok: !!res.ok, status: res.status, body: body };
      });
    });
  }

  /* ── 화면 ── */
  function showGate(kind, message) {
    state.gate = kind;
    state.message = message || '';
    var gate = $('adminGate');
    var stats = $('adminStats');
    if (stats) stats.hidden = kind !== '';
    if (!gate) return;
    gate.hidden = kind === '';
    gate.innerHTML = '';
    if (kind === 'signedOut') {
      gate.appendChild(el('p', 'gate-lead', '관리자 계정으로 로그인해 주세요'));
      gate.appendChild(el('p', 'gate-sub', '인생 한 턴을 플레이할 때 쓰는 Google 계정으로 로그인하면 통계를 볼 수 있어요.'));
      var btn = el('button', 'gate-btn', 'Google로 로그인');
      btn.type = 'button';
      btn.addEventListener('click', function () {
        var c = cloud();
        if (!c || typeof c.signIn !== 'function') return toast('로그인을 시작할 수 없어요');
        c.signIn('google').catch(function () { toast('로그인을 시작하지 못했어요'); });
      });
      gate.appendChild(btn);
    } else if (kind === 'denied') {
      gate.appendChild(el('p', 'gate-lead', '이 계정에는 어드민 권한이 없어요'));
      gate.appendChild(el('p', 'gate-sub', '로그인한 계정: ' + (email() || '알 수 없음')));
      var out = el('button', 'gate-btn ghost', '다른 계정으로 로그인');
      out.type = 'button';
      out.addEventListener('click', function () {
        var c = cloud();
        if (c && typeof c.signOut === 'function') c.signOut();
        setTimeout(function () { location.reload(); }, 200);
      });
      gate.appendChild(out);
    } else if (kind === 'error') {
      gate.appendChild(el('p', 'gate-lead', '통계를 불러오지 못했어요'));
      gate.appendChild(el('p', 'gate-sub', message || '잠시 뒤 다시 시도해 주세요.'));
      var retry = el('button', 'gate-btn', '다시 시도');
      retry.type = 'button';
      retry.addEventListener('click', function () { load(state.days); });
      gate.appendChild(retry);
    }
  }

  function renderChart(daily, days) {
    var box = $('visitChart');
    if (!box) return;
    var bars = buildBars(daily, days);
    box.innerHTML = '';
    if (!bars.length) {
      box.appendChild(el('p', 'chart-empty', '아직 기록이 없어요.'));
      return;
    }
    bars.forEach(function (bar) {
      var col = el('div', 'bar-col');
      col.setAttribute('role', 'img');
      col.setAttribute('aria-label', bar.label + ' 접속자 ' + bar.visitors + '명 · 조회 ' + bar.views + '회');
      col.appendChild(el('span', 'bar-value', bar.visitors > 0 ? bar.visitors : ''));
      var track = el('span', 'bar-track');
      var fill = el('span', 'bar-fill' + (bar.visitors > 0 ? '' : ' zero'));
      fill.style.height = (bar.visitors > 0 ? bar.height : 2) + '%';
      track.appendChild(fill);
      col.appendChild(track);
      col.appendChild(el('span', 'bar-day', bar.showLabel ? bar.label : ''));
      box.appendChild(col);
    });
    var hint = $('chartHint');
    if (hint) hint.textContent = '막대 = 그날 접속한 사람 수(순 방문자) · 최근 ' + days + '일 · 한국 시간 기준';
  }

  function render() {
    var data = state.data || {};
    var today = $('kpiToday');
    var total = $('kpiTotal');
    var who = $('adminWho');
    if (today) today.textContent = data.today_visitors != null ? comma(data.today_visitors) : '—';
    if (total) total.textContent = data.total_visitors != null ? comma(data.total_visitors) : '—';
    if (who) who.textContent = email() ? email() + ' · 관리자' : '';
    var sub = $('adminSub');
    if (sub && data.today_views != null) sub.textContent = '오늘 조회 ' + comma(data.today_views) + '회 · 누적 조회 ' + comma(data.total_views) + '회';
    var buttons = global.document ? global.document.querySelectorAll('.range-btn') : [];
    for (var i = 0; i < buttons.length; i++) {
      var on = num(buttons[i].getAttribute('data-days')) === num(state.days);
      buttons[i].classList.toggle('active', on);
      buttons[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    if (state.gate === '') {
      renderChart(data.daily, num(data.days) || state.days);
      showGate('');
    }
  }

  function toast(message) {
    var node = $('adminToast');
    if (!node) return;
    node.textContent = message;
    node.hidden = false;
    global.setTimeout(function () { node.hidden = true; }, 2600);
  }

  function load(days) {
    state.days = DAY_OPTIONS.indexOf(num(days)) >= 0 ? num(days) : 14;
    state.loading = true;
    if (!session()) {
      showGate('signedOut');
      return Promise.resolve(null);
    }
    if (!isAdminEmail(email())) {
      showGate('denied');
      return Promise.resolve(null);
    }
    var c = cloud();
    if (!c || typeof c.token !== 'function') {
      showGate('error', '로그인 정보를 읽을 수 없어요.');
      return Promise.resolve(null);
    }
    return c.token().then(function (token) {
      return fetchStats(state.days, token);
    }).then(function (res) {
      if (res.ok) {
        state.data = res.body || {};
        showGate('');
        render();
        return state.data;
      }
      var body = res.body || {};
      var message = String(body.message || body.error_description || '');
      if (res.status === 404 || body.code === 'PGRST202' || /does not exist|schema cache/i.test(message)) {
        showGate('error', '통계 DB 가 아직 준비되지 않았어요. Supabase SQL Editor 에서 supabase/app_visits.sql 을 실행해 주세요.');
      } else if (res.status === 401 || res.status === 403) {
        showGate('denied');
      } else {
        showGate('error', message || '잠시 뒤 다시 시도해 주세요.');
      }
      return null;
    }).catch(function () {
      showGate('error', '네트워크에 연결하지 못했어요.');
      return null;
    }).then(function (out) {
      state.loading = false;
      return out;
    });
  }

  function wire() {
    var buttons = global.document ? global.document.querySelectorAll('.range-btn') : [];
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function (e) {
        var days = num(e.currentTarget.getAttribute('data-days'));
        if (days === state.days) return;
        load(days);
      });
    }
    var refresh = $('adminRefresh');
    if (refresh) refresh.addEventListener('click', function () { load(state.days); });
    var out = $('adminSignOut');
    if (out) out.addEventListener('click', function () {
      var c = cloud();
      if (c && typeof c.signOut === 'function') c.signOut();
      state.data = null;
      global.setTimeout(function () { showGate('signedOut'); }, 150);
    });
  }

  function start() {
    if (!global.document) return;
    wire();
    // OAuth 리다이렉트로 돌아온 경우(?code=…) — sync.js 가 세션을 마무리하게 한다
    if (/[?&](code|error_description)=/.test(String(global.location ? global.location.search : ''))) {
      var c = cloud();
      if (c && typeof c.start === 'function') {
        c.start();
        // 세션이 저장될 시간을 조금 준 뒤 통계를 부른다
        global.setTimeout(function () { load(state.days); }, 600);
        return;
      }
    }
    load(state.days);
  }

  global.LifeAdmin = {
    start: start,
    load: load,
    buildBars: buildBars,
    shortDay: shortDay,
    isAdminEmail: isAdminEmail,
    _test: {
      state: state,
      buildBars: buildBars,
      shortDay: shortDay,
      fetchStats: fetchStats,
      DAY_OPTIONS: DAY_OPTIONS,
      ADMIN_EMAILS: ADMIN_EMAILS,
      setState: function (patch) { Object.keys(patch || {}).forEach(function (k) { state[k] = patch[k]; }); }
    }
  };

  if (typeof global.document !== 'undefined' && global.document) {
    if (global.document.readyState === 'loading') {
      global.document.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
