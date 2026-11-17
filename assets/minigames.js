/* ─────────────────────────────────────────────
   minigames.js — 청년기의 10초 미니 승부
   ─────────────────────────────────────────────
   소개팅·면접·알바·운명 분기 같은 선택지에 붙는 짧은 승부.
     MiniGame.open(cfg, state, function (win) { ... })
   · cfg.type : 'dice' | 'timing' | 'rps'
   · cfg.win / cfg.lose : { result, effects, set } — 엔진이 그대로 적용한다
   · 제한 시간 10초. 시간이 다 지나면 패배로 처리한다.
   · 미니 승부가 도는 동안에는 5초 자동 넘김 타이머가 없다(결과가 아직 없다).
   ───────────────────────────────────────────── */
(function (global) {
  'use strict';

  var LIMIT = 10000;          // 10초
  var state = null;           // { cfg, done, ended, timer, tick, playing }

  function $(id) { return document.getElementById(id); }

  function ensureDom() {
    if ($('miniModal')) return;
    var wrap = document.createElement('div');
    wrap.className = 'mini-modal';
    wrap.id = 'miniModal';
    wrap.hidden = true;
    wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML =
      '<div class="mini-card" role="dialog" aria-modal="true" aria-labelledby="miniTitle">' +
        '<div class="mini-head">' +
          '<span class="mini-kicker">⚡ 미니 승부</span>' +
          '<span class="mini-clock" id="miniClock">10초</span>' +
        '</div>' +
        '<h3 class="mini-title" id="miniTitle">승부</h3>' +
        '<p class="mini-desc" id="miniDesc"></p>' +
        '<div class="mini-stage" id="miniStage"></div>' +
        '<div class="mini-foot" id="miniFoot"></div>' +
        '<div class="mini-track"><i id="miniBar"></i></div>' +
        '<p class="mini-note">10초 안에 승부를 내세요 · 결과에 따라 스탯과 갈래가 달라집니다</p>' +
      '</div>';
    document.getElementById('app').appendChild(wrap);
  }

  function setClock(ms) {
    var clock = $('miniClock');
    var bar = $('miniBar');
    if (clock) clock.textContent = Math.max(0, Math.ceil(ms / 1000)) + '초';
    if (bar) bar.style.width = Math.max(0, (ms / LIMIT) * 100).toFixed(1) + '%';
  }

  function stopClock() {
    if (!state) return;
    clearInterval(state.tick);
    state.tick = null;
  }

  function open(cfg, gameState, done) {
    ensureDom();
    state = { cfg: cfg || {}, done: done, ended: false, timer: null, tick: null, playing: false };

    var modal = $('miniModal');
    $('miniTitle').textContent = cfg.title || '미니 승부';
    $('miniDesc').textContent = cfg.desc || '짧은 승부가 이번 달의 방향을 바꿉니다.';
    $('miniStage').innerHTML = '';
    $('miniStage').className = 'mini-stage';
    $('miniFoot').innerHTML = '';
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');

    var left = LIMIT;
    setClock(left);
    var last = Date.now();
    state.tick = setInterval(function () {
      var now = Date.now();
      left -= (now - last);
      last = now;
      setClock(left);
      if (left <= 0) finish(false, '10초가 지나 기회를 놓쳤습니다');
    }, 100);

    if (cfg.type === 'timing') buildTiming();
    else if (cfg.type === 'rps') buildRps();
    else buildDice();
  }

  function finish(win, detail) {
    if (!state || state.ended) return;
    state.ended = true;
    stopClock();
    if (state.timer) { clearTimeout(state.timer); state.timer = null; }
    if (state.raf) { cancelAnimationFrame(state.raf); state.raf = null; }

    var stage = $('miniStage');
    var foot = $('miniFoot');
    if (foot) foot.innerHTML = '';
    if (stage) {
      var banner = document.createElement('div');
      banner.className = 'mini-out ' + (win ? 'win' : 'lose');
      banner.innerHTML = '<b>' + (win ? '승리' : '패배') + '</b><span>' + (detail || '') + '</span>';
      stage.appendChild(banner);
    }
    var done = state.done;
    var wait = 1150;
    state.timer = setTimeout(function () {
      state.timer = null;
      var modal = $('miniModal');
      if (modal) {
        modal.hidden = true;
        modal.setAttribute('aria-hidden', 'true');
      }
      state = null;
      if (typeof done === 'function') done(!!win);
    }, wait);
  }

  /* ── 주사위 2개 대결 ── */
  function dieFace(n) {
    var faces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    return faces[n - 1] || '⚀';
  }

  function buildDice() {
    var stage = $('miniStage');
    stage.innerHTML =
      '<div class="mini-duel">' +
        '<div class="duel-side"><span class="duel-who">나</span>' +
          '<div class="duel-dice" id="myDice"><i>⚀</i><i>⚀</i></div>' +
          '<span class="duel-sum" id="mySum">–</span></div>' +
        '<div class="duel-vs">대</div>' +
        '<div class="duel-side"><span class="duel-who">상대</span>' +
          '<div class="duel-dice" id="opDice"><i>⚀</i><i>⚀</i></div>' +
          '<span class="duel-sum" id="opSum">–</span></div>' +
      '</div>';
    var foot = $('miniFoot');
    foot.innerHTML = '<button type="button" class="btn primary mini-action" id="miniRoll">주사위 굴리기</button>';
    $('miniRoll').addEventListener('click', function () {
      if (!state || state.playing || state.ended) return;
      state.playing = true;
      var btn = $('miniRoll');
      btn.disabled = true;
      btn.textContent = '굴리는 중…';
      var ticks = 0;
      var spin = setInterval(function () {
        ticks += 1;
        renderDice(randD2(), randD2());
        if (ticks >= 9) {
          clearInterval(spin);
          var mine = randD2(), theirs = randD2();
          renderDice(mine, theirs);
          if (mine === theirs) {
            btn.textContent = '동점 — 한 번 더';
            setTimeout(function () {
              if (!state || state.ended) return;
              var m2 = randD2(), t2 = randD2();
              renderDice(m2, t2);
              var a = m2[0] + m2[1], b = t2[0] + t2[1];
              if (a === b) finish(false, '두 번 다 비겼습니다 · 내 ' + a + ' · 상대 ' + b);
              else if (a > b) finish(true, '한 번 더 굴려 내 ' + a + ' · 상대 ' + b);
              else finish(false, '한 번 더 굴렀지만 내 ' + a + ' · 상대 ' + b);
            }, 800);
            return;
          }
          settle(mine, theirs);
        }
      }, 80);
    });
  }

  function randD2() {
    return [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
  }

  function renderDice(mine, theirs) {
    var my = $('myDice'), op = $('opDice');
    if (my) my.innerHTML = '<i>' + dieFace(mine[0]) + '</i><i>' + dieFace(mine[1]) + '</i>';
    if (op) op.innerHTML = '<i>' + dieFace(theirs[0]) + '</i><i>' + dieFace(theirs[1]) + '</i>';
    if ($('mySum')) $('mySum').textContent = mine[0] + mine[1];
    if ($('opSum')) $('opSum').textContent = theirs[0] + theirs[1];
  }

  function settle(mine, theirs) {
    var a = mine[0] + mine[1], b = theirs[0] + theirs[1];
    if (a > b) finish(true, '내 ' + a + ' · 상대 ' + b);
    else if (a < b) finish(false, '내 ' + a + ' · 상대 ' + b);
    else finish(false, '마지막까지 비겼습니다 · 내 ' + a + ' · 상대 ' + b);
  }

  /* ── 가위바위보 ── */
  var RPS = { 가위: '✌️', 바위: '✊', 보: '✋' };
  var RPS_BEATS = { 가위: '보', 바위: '가위', 보: '바위' };

  function buildRps() {
    var stage = $('miniStage');
    stage.innerHTML =
      '<div class="mini-duel">' +
        '<div class="duel-side"><span class="duel-who">나</span>' +
          '<div class="duel-hand" id="myHand">❔</div></div>' +
        '<div class="duel-vs">대</div>' +
        '<div class="duel-side"><span class="duel-who">상대</span>' +
          '<div class="duel-hand" id="opHand">❔</div></div>' +
      '</div>' +
      '<p class="mini-line" id="rpsLine">손을 고르세요</p>';
    var foot = $('miniFoot');
    foot.innerHTML = Object.keys(RPS).map(function (k) {
      return '<button type="button" class="btn mini-pick" data-hand="' + k + '">' + RPS[k] + ' ' + k + '</button>';
    }).join('');
    foot.classList.add('three');
    Array.prototype.forEach.call(foot.querySelectorAll('.mini-pick'), function (b) {
      b.addEventListener('click', function () {
        if (!state || state.playing || state.ended) return;
        state.playing = true;
        var mine = b.dataset.hand;
        var keys = Object.keys(RPS);
        var theirs = keys[Math.floor(Math.random() * keys.length)];
        if ($('myHand')) $('myHand').textContent = RPS[mine];
        if ($('opHand')) $('opHand').textContent = RPS[theirs];
        var line = $('rpsLine');
        if (mine === theirs) {
          state.playing = false;
          state.draws = (state.draws || 0) + 1;
          if (line) line.textContent = '무승부 — 한 번 더 (비긴 횟수 ' + state.draws + ')';
          if (state.draws >= 3) finish(false, '세 번 비겼으니 이번엔 상대가 가져갔습니다');
          return;
        }
        var win = RPS_BEATS[mine] === theirs;
        if (line) line.textContent = mine + ' 대 ' + theirs;
        finish(win, mine + ' · 상대 ' + theirs);
      });
    });
  }

  /* ── 타이밍 게이지 ── */
  function buildTiming() {
    var stage = $('miniStage');
    stage.innerHTML =
      '<div class="gauge"><div class="gauge-zone" id="gaugeZone"></div>' +
        '<i class="gauge-marker" id="gaugeMarker"></i></div>' +
      '<p class="mini-line" id="rpsLine">초록 구간에서 멈추세요</p>';
    var foot = $('miniFoot');
    foot.innerHTML = '<button type="button" class="btn primary mini-action" id="miniStop">멈추기</button>';

    var pos = 0, dir = 1, speed = 0.028, raf = null, last = null;
    function loop(ts) {
      if (!state || state.ended) return;
      if (last === null) last = ts;
      var dt = Math.min(64, ts - last);
      last = ts;
      pos += dir * speed * dt / 16;
      if (pos > 100) { pos = 100; dir = -1; }
      if (pos < 0) { pos = 0; dir = 1; }
      var marker = $('gaugeMarker');
      if (marker) marker.style.left = pos.toFixed(2) + '%';
      state.raf = requestAnimationFrame(loop);
    }
    state.pos = function () { return pos; };
    state.raf = requestAnimationFrame(loop);

    $('miniStop').addEventListener('click', function () {
      if (!state || state.playing || state.ended) return;
      state.playing = true;
      if (state.raf) { cancelAnimationFrame(state.raf); state.raf = null; }
      var hit = pos >= 38 && pos <= 62;
      var near = pos >= 30 && pos <= 70;
      finish(hit, '게이지 ' + Math.round(pos) + '% 지점에서 멈췄습니다' + (hit ? '' : near ? ' · 조금만 더 가운데로' : ''));
    });
  }

  global.MiniGame = {
    LIMIT: LIMIT,
    open: open
  };
})(typeof window !== 'undefined' ? window : globalThis);
