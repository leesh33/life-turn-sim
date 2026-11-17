/* ─────────────────────────────────────────────
   minigames.js — 5~10초 미니 승부 (전 연령)
   ─────────────────────────────────────────────
   소개팅·면접·알바·시합·손주 놀이 같은 선택지에 붙는 짧은 승부.
     MiniGame.open(cfg, state, function (win) { ... })
   · cfg.type : 'dice' | 'timing' | 'rps' | 'coin' | 'highlow' | 'math'
   · cfg.win / cfg.lose : { result, effects, set } — 엔진이 그대로 적용한다
   · 제한 시간은 기본 10초, math(암산)는 7초. 시간이 다 지나면 패배로 처리한다.
   · 미니 승부가 도는 동안에는 5초 자동 넘김 타이머가 없다(결과가 아직 없다).
   ───────────────────────────────────────────── */
(function (global) {
  'use strict';

  var DEFAULT_LIMIT = 10000;          // 10초
  var TYPE_LIMIT = { math: 7000 };    // 암산은 7초
  var state = null;                   // { cfg, done, ended, timer, tick, limit, playing }

  function $(id) { return document.getElementById(id); }

  function limitOf(cfg) {
    if (cfg && typeof cfg.limit === 'number' && cfg.limit > 0) return cfg.limit;
    if (cfg && TYPE_LIMIT[cfg.type]) return TYPE_LIMIT[cfg.type];
    return DEFAULT_LIMIT;
  }

  /* ── 행운(luck)이 승부 확률을 민다 ──
     행운 50 이면 정직한 확률, 100 이면 +25%p, 0 이면 -25%p.
     엔진의 Life.luckBias 와 같은 식을 쓴다(한 곳에서 정의). */
  function luckOf(gameState) {
    var st = gameState && gameState.stats ? gameState.stats : null;
    if (!st) return null;
    if (global.Life && typeof global.Life.luckBias === 'function') return global.Life.luckBias(st);
    var v = typeof st.luck === 'number' ? st.luck : 50;
    return Math.max(-0.25, Math.min(0.25, (v - 50) / 50 * 0.25));
  }
  function biasNow() { return state && typeof state.bias === 'number' ? state.bias : 0; }
  // 앞면/뒷면, 가위바위보처럼 '고른 쪽이 이기는가'를 확률로 정하는 승부
  function luckWin() { return Math.random() < 0.5 + biasNow(); }

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
        '<p class="mini-note" id="miniNote">10초 안에 승부를 내세요 · 결과에 따라 스탯과 갈래가 달라집니다</p>' +
      '</div>';
    document.getElementById('app').appendChild(wrap);
  }

  function setClock(ms) {
    var clock = $('miniClock');
    var bar = $('miniBar');
    var limit = state && state.limit ? state.limit : DEFAULT_LIMIT;
    if (clock) clock.textContent = Math.max(0, Math.ceil(ms / 1000)) + '초';
    if (bar) bar.style.width = Math.max(0, (ms / limit) * 100).toFixed(1) + '%';
  }

  function stopClock() {
    if (!state) return;
    clearInterval(state.tick);
    state.tick = null;
  }

  function open(cfg, gameState, done) {
    ensureDom();
    state = { cfg: cfg || {}, done: done, ended: false, timer: null, tick: null, playing: false };
    state.limit = limitOf(state.cfg);
    state.bias = luckOf(gameState) || 0;
    state.luck = gameState && gameState.stats && typeof gameState.stats.luck === 'number'
      ? Math.round(gameState.stats.luck) : null;

    var modal = $('miniModal');
    $('miniTitle').textContent = state.cfg.title || '미니 승부';
    $('miniDesc').textContent = state.cfg.desc || '짧은 승부가 이번 달의 방향을 바꿉니다.';
    $('miniStage').innerHTML = '';
    $('miniStage').className = 'mini-stage';
    $('miniFoot').className = 'mini-foot';   // 이전 승부의 3열 클래스가 남지 않게
    $('miniFoot').innerHTML = '';
    if ($('miniNote')) {
      $('miniNote').textContent = (state.limit / 1000) + '초 안에 승부를 내세요 · 결과에 따라 스탯과 갈래가 달라집니다' +
        (state.luck === null || state.luck === undefined ? '' : ' · 🍀 행운 ' + state.luck + ' 이 승률에 반영됩니다');
    }
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');

    var left = state.limit;
    setClock(left);
    var last = Date.now();
    state.tick = setInterval(function () {
      var now = Date.now();
      left -= (now - last);
      last = now;
      setClock(left);
      if (left <= 0) finish(false, (state ? state.limit / 1000 : 10) + '초가 지나 기회를 놓쳤습니다');
    }, 100);

    if (state.cfg.type === 'timing') buildTiming();
    else if (state.cfg.type === 'rps') buildRps();
    else if (state.cfg.type === 'coin') buildCoin();
    else if (state.cfg.type === 'highlow') buildHighlow();
    else if (state.cfg.type === 'math') buildMath();
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
    if (foot) {
      foot.innerHTML = '';
      foot.className = 'mini-foot';
    }
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

  function lockButtons(scope) {
    if (!scope) return;
    Array.prototype.forEach.call(scope.querySelectorAll('button'), function (b) { b.disabled = true; });
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
        if (!state || state.ended) { clearInterval(spin); return; }
        ticks += 1;
        renderDice(randD2(), randD2());
        if (ticks >= 9) {
          clearInterval(spin);
          var my = randD2();
          // 행운이 높으면 한 번 더 굴려 좋은 쪽을, 낮으면 나쁜 쪽을 쓴다
          var lucky = false;
          if (biasNow() > 0 && Math.random() < biasNow()) {
            var better = randD2();
            if (better[0] + better[1] > my[0] + my[1]) { my = better; lucky = true; }
          } else if (biasNow() < 0 && Math.random() < -biasNow()) {
            var worse = randD2();
            if (worse[0] + worse[1] < my[0] + my[1]) { my = worse; lucky = true; }
          }
          var theirs = randD2();
          renderDice(my, theirs);
          if (lucky && $('miniNote')) {
            $('miniNote').textContent = biasNow() > 0
              ? '🍀 행운이 주사위를 한 번 더 굴렸습니다'
              : '🌧️ 행운이 손을 놓았습니다';
          }
          (function (mine, op) {
            var a = mine[0] + mine[1], b = op[0] + op[1];
            if (a === b) {
              btn.textContent = '동점 — 한 번 더';
              setTimeout(function () {
                if (!state || state.ended) return;
                var m2 = randD2(), t2 = randD2();
                renderDice(m2, t2);
                var a2 = m2[0] + m2[1], b2 = t2[0] + t2[1];
                if (a2 === b2) finish(false, '두 번 다 비겼습니다 · 내 ' + a2 + ' · 상대 ' + b2);
                else if (a2 > b2) finish(true, '한 번 더 굴려 내 ' + a2 + ' · 상대 ' + b2);
                else finish(false, '한 번 더 굴렀지만 내 ' + a2 + ' · 상대 ' + b2);
              }, 800);
              return;
            }
            settle(mine, op);
          })(my, theirs);
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
    foot.classList.add('three');
    foot.innerHTML = Object.keys(RPS).map(function (k) {
      return '<button type="button" class="btn mini-pick" data-hand="' + k + '">' + RPS[k] + ' ' + k + '</button>';
    }).join('');
    Array.prototype.forEach.call(foot.querySelectorAll('.mini-pick'), function (b) {
      b.addEventListener('click', function () {
        if (!state || state.playing || state.ended) return;
        state.playing = true;
        var mine = b.dataset.hand;
        var keys = Object.keys(RPS);
        // 행운이 높으면 상대가 지는 손을, 낮으면 이기는 손을 낸다 (가끔 비긴다)
        var roll = Math.random(), p = 0.5 + biasNow(), theirs;
        if (roll < 0.06) theirs = mine;
        else if (roll < 0.06 + 0.94 * p) theirs = RPS_BEATS[mine];
        else theirs = RPS_BEATS[RPS_BEATS[mine]] || keys[Math.floor(Math.random() * keys.length)];
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

  /* ── 동전 던지기 (앞/뒤 양자택일) ── */
  function buildCoin() {
    var stage = $('miniStage');
    stage.innerHTML =
      '<div class="coin-wrap"><div class="coin" id="coinEl"><span class="coin-face front">앞</span>' +
        '<span class="coin-face back">뒤</span></div></div>' +
      '<p class="mini-line" id="coinLine">앞면일지 뒷면일지, 마음을 정하세요</p>';
    var foot = $('miniFoot');
    foot.innerHTML =
      '<button type="button" class="btn mini-pick" data-side="앞">앞면</button>' +
      '<button type="button" class="btn mini-pick" data-side="뒤">뒷면</button>';
    Array.prototype.forEach.call(foot.querySelectorAll('.mini-pick'), function (b) {
      b.addEventListener('click', function () {
        if (!state || state.playing || state.ended) return;
        state.playing = true;
        var picked = b.dataset.side;
        lockButtons(foot);
        if ($('coinLine')) $('coinLine').textContent = picked + '면을 골랐습니다 · 동전이 떠오릅니다…';
        var coin = $('coinEl');
        // 행운이 앞면/뒷면을 고른 쪽으로 민다 (행운 100 → 75%)
        var landed = luckWin() ? picked : (picked === '앞' ? '뒤' : '앞');
        if (coin) {
          coin.classList.add('flipping');
          if (landed === '뒤') coin.classList.add('show-back');
        }
        state.timer = setTimeout(function () {
          if (!state || state.ended) return;
          state.timer = null;
          if (coin) coin.classList.remove('flipping');
          var win = picked === landed;
          if ($('coinLine')) $('coinLine').textContent = '동전은 ' + landed + '면이 나왔습니다';
          finish(win, picked + '면을 골랐고 ' + landed + '면이 나왔습니다');
        }, 800);
      });
    });
  }

  /* ── 카드 하이로우 ── */
  var CARD_RANK = function (n) {
    if (n === 1) return 'A';
    if (n === 11) return 'J';
    if (n === 12) return 'Q';
    if (n === 13) return 'K';
    return String(n);
  };

  // 행운이 높으면 고른 쪽(높다/낮다)의 카드가 나올 확률이 올라간다
  function luckyCard(cur, guess) {
    var hi = [], lo = [], n;
    for (n = 1; n <= 13; n++) { if (n > cur) hi.push(n); else if (n < cur) lo.push(n); }
    var want = guess === 'high' ? hi : lo;
    var other = guess === 'high' ? lo : hi;
    var roll = Math.random();
    if (roll < 0.5 + biasNow() && want.length) return want[Math.floor(Math.random() * want.length)];
    if (other.length) return other[Math.floor(Math.random() * other.length)];
    return cur;
  }

  function buildHighlow() {
    var cur = 1 + Math.floor(Math.random() * 13);
    state.highlow = { cur: cur, ties: 0 };
    var stage = $('miniStage');
    stage.innerHTML =
      '<div class="hl-row">' +
        '<div class="hl-card" id="hlCard"><span class="hl-rank">' + CARD_RANK(cur) + '</span>' +
          '<span class="hl-suit">♠</span></div>' +
        '<div class="hl-next" id="hlNext">?</div>' +
      '</div>' +
      '<p class="mini-line" id="hlLine">다음 카드가 더 높을까요, 낮을까요?</p>';
    var foot = $('miniFoot');
    foot.innerHTML =
      '<button type="button" class="btn mini-pick" data-guess="high">높다 ▲</button>' +
      '<button type="button" class="btn mini-pick" data-guess="low">낮다 ▼</button>';
    Array.prototype.forEach.call(foot.querySelectorAll('.mini-pick'), function (b) {
      b.addEventListener('click', function () {
        if (!state || state.playing || state.ended) return;
        state.playing = true;
        lockButtons(foot);
        var guess = b.dataset.guess;
        var next = luckyCard(state.highlow.cur, guess);
        state.highlow.ties += 1;
        // 같은 숫자가 나오면 한 번만 다시 뽑는다 (그래도 같으면 무승부 → 패배)
        if (next === state.highlow.cur && state.highlow.ties < 2) {
          next = luckyCard(state.highlow.cur, guess);
        }
        if ($('hlNext')) {
          $('hlNext').className = 'hl-next open';
          $('hlNext').innerHTML = '<span class="hl-rank">' + CARD_RANK(next) + '</span><span class="hl-suit">♥</span>';
        }
        var line = $('hlLine');
        var win;
        if (next === state.highlow.cur) {
          win = false;
          if (line) line.textContent = '같은 숫자가 나왔습니다 (' + CARD_RANK(next) + ')';
          return finish(false, CARD_RANK(state.highlow.cur) + ' 다음에 ' + CARD_RANK(next));
        }
        win = (guess === 'high' && next > state.highlow.cur) || (guess === 'low' && next < state.highlow.cur);
        if (line) line.textContent = CARD_RANK(state.highlow.cur) + ' → ' + CARD_RANK(next) + (win ? ' · 맞혔습니다' : ' · 틀렸습니다');
        finish(win, CARD_RANK(state.highlow.cur) + ' 다음은 ' + CARD_RANK(next));
      });
    });
  }

  /* ── 초스피드 암산 (3지선다) ── */
  function buildMath() {
    state.math = makeMathQuestion();
    var q = state.math;
    var stage = $('miniStage');
    stage.innerHTML =
      '<div class="math-box"><span class="math-q">' + q.text + '</span></div>' +
      '<p class="mini-line" id="mathLine">정답을 고르세요</p>';
    var foot = $('miniFoot');
    foot.classList.add('three');
    foot.innerHTML = q.options.map(function (v) {
      return '<button type="button" class="btn mini-pick math-pick" data-v="' + v + '">' + v + '</button>';
    }).join('');
    Array.prototype.forEach.call(foot.querySelectorAll('.math-pick'), function (b) {
      b.addEventListener('click', function () {
        if (!state || state.playing || state.ended) return;
        state.playing = true;
        lockButtons(foot);
        var picked = Number(b.dataset.v);
        var win = picked === q.answer;
        if ($('mathLine')) $('mathLine').textContent = win ? '정답!' : '정답은 ' + q.answer + '입니다';
        finish(win, q.text + ' 정답 ' + q.answer + (win ? '' : ' · 내 답 ' + picked));
      });
    });
  }

  function makeMathQuestion() {
    var kind = Math.floor(Math.random() * 3);
    var a, b, answer, text;
    if (kind === 0) {
      a = 11 + Math.floor(Math.random() * 78);
      b = 11 + Math.floor(Math.random() * 78);
      answer = a + b;
      text = a + ' + ' + b + ' = ?';
    } else if (kind === 1) {
      a = 30 + Math.floor(Math.random() * 69);
      b = 11 + Math.floor(Math.random() * Math.min(28, a - 10));
      answer = a - b;
      text = a + ' − ' + b + ' = ?';
    } else {
      a = 2 + Math.floor(Math.random() * 8);
      b = 2 + Math.floor(Math.random() * 8);
      answer = a * b;
      text = a + ' × ' + b + ' = ?';
    }
    var options = [answer];
    var guard = 0;
    while (options.length < 3 && guard++ < 80) {
      var delta = (Math.floor(Math.random() * 8) + 1) * (Math.random() < 0.5 ? -1 : 1);
      var cand = answer + delta;
      if (cand > 0 && options.indexOf(cand) === -1) options.push(cand);
    }
    while (options.length < 3) options.push(answer + options.length * 3 + 1);
    // 섞기
    for (var i = options.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = options[i]; options[i] = options[j]; options[j] = t;
    }
    return { text: text, answer: answer, options: options };
  }

  /* ── 타이밍 게이지 ── */
  function buildTiming() {
    var stage = $('miniStage');
    stage.innerHTML =
      '<div class="gauge"><div class="gauge-zone" id="gaugeZone"></div>' +
        '<i class="gauge-marker" id="gaugeMarker"></i></div>' +
      '<p class="mini-line" id="timingLine">초록 구간에서 멈추세요</p>';
    var foot = $('miniFoot');
    foot.innerHTML = '<button type="button" class="btn primary mini-action" id="miniStop">멈추기</button>';

    var pos = 0, dir = 1, speed = 0.028, last = null;
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
    LIMIT: DEFAULT_LIMIT,
    limitOf: limitOf,
    open: open
  };
})(typeof window !== 'undefined' ? window : globalThis);
