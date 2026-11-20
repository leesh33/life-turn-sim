/* ─────────────────────────────────────────────
   app.js — 화면 렌더링과 조작
   「인생 한 턴」
   ───────────────────────────────────────────── */
(function () {
  'use strict';

  var Life = window.Life;
  var state = null;
  var pickedAge = 1;
  var pickedGender = '남';
  var screenName = 'start';
  var hallReturn = 'start';
  var hallTab = 'all';

  /* ── 🏆 전체 랭킹(전당 두 번째 탭) 상태 ── */
  var hallView = 'mine';        // mine | global
  var lgSort = 'score';         // score | assets
  var lgData = null;
  var lgLoading = false;
  var lgError = '';
  var lgToastOnce = false;

  /* ── 출발 시나리오 · 가문 이어받기 (2026-11-20) ──
     시작 화면에서 고른 값은 Life.newGame({ scenario, legacy }) 로 넘긴다.
     마지막에 고른 시나리오는 localStorage 에 남겨 다음 판의 기본값으로 쓴다. */
  var SCENARIO_KEY = 'lifeTurnSim.scenario.v1';
  var pickedScenario = 'kr';
  var pickedLegacy = null;
  try {
    var savedScenario = localStorage.getItem(SCENARIO_KEY);
    if (savedScenario && Life && Life.scenarioOf(savedScenario).id === savedScenario) pickedScenario = savedScenario;
  } catch (e) {}

  /* ── 5초 자동 넘김 ──
     결과 화면이 뜨면 5초 카운트다운 뒤 다음 턴으로 넘어간다.
     · 기존 '다음 1개월 진행하기' 버튼 = 타이머를 끄고 즉시 이동
     · ⏸ 일시정지 토글 = 남은 시간을 붙잡아 두고 멈춤(다시 누르면 재개)
     · 졸업식·엔딩으로 넘어가는 턴에서는 자동 넘김이 걸리지 않는다
     · 화면을 벗어나거나(전당·일지·요약·새로 시작) 탭이 숨겨지면 타이머를 정리한다 */
  var AUTO_SECONDS = 5;
  var AUTO_PAUSED_KEY = 'lifeTurnSim.autoPaused';
  var auto = { tick: null, deadline: 0, remain: 0, running: false, paused: false };
  try { auto.paused = localStorage.getItem(AUTO_PAUSED_KEY) === '1'; } catch (e) {}

  var LABEL = { hp: '체력', mental: '멘탈', charm: '매력', asset: '재산', social: '호감도', intel: '역량', luck: '행운' };

  function $(id) { return document.getElementById(id); }
  function h(str) { return String(str == null ? '' : str); }
  function esc(str) {
    return h(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function num(v) { return Math.round(v); }
  // 점수는 소수 한 자리까지 (반올림해 같은 숫자처럼 보이는 서로 다른 기록을 구분)
  function scoreText(v) {
    var n = Math.round((v || 0) * 10) / 10;
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
  }

  /* ── 시작 화면 ── */
  function renderStart() {
    var grid = $('ageGrid');
    grid.innerHTML = Life.START_AGES.map(function (a) {
      return '<button type="button" class="age-card' + (a.age === pickedAge ? ' selected' : '') +
        '" data-age="' + a.age + '" data-wide="' + a.wide + '">' +
        '<span class="ac-emoji">' + a.emoji + '</span>' +
        '<span class="ac-body"><span class="ac-age">' + a.age + '세</span>' +
        '<span class="ac-label">' + a.label + '</span></span>' +
        '</button>';
    }).join('');

    var saved = Life.load();
    var card = $('resumeCard');
    document.getElementById('screen-start').classList.toggle('has-resume', !!saved);
    if (saved) {
      card.hidden = false;
      $('resumeName').textContent = saved.name + ' · ' + saved.age + '세';
      $('resumeMeta').textContent = saved.history.length + '개의 선택 · ' +
        (saved.ended ? '엔딩' : (saved.grad ? '졸업 결산' : '진행 중'));
    } else {
      card.hidden = true;
    }

    var mine = Life.hallMine();
    var hallBtn = $('hallBtnStart');
    if (hallBtn) hallBtn.textContent = '🏆 명예의 전당' + (mine.length ? ' ' + mine.length : '');

    renderScenarios();
    renderLegacy();
  }

  /* ── 출발 시나리오 칩 ── */
  function renderScenarios() {
    var row = $('scenarioRow');
    if (!row || !Life || !Life.SCENARIOS) return;
    row.innerHTML = Life.SCENARIOS.map(function (sc) {
      var on = sc.id === pickedScenario;
      return '<button type="button" class="scenario-chip' + (on ? ' active' : '') + '"' +
        ' data-sc="' + sc.id + '" aria-pressed="' + (on ? 'true' : 'false') + '"' +
        ' title="' + esc(sc.desc) + '">' +
        '<span class="sc-emoji" aria-hidden="true">' + sc.emoji + '</span>' + esc(sc.short) + '</button>';
    }).join('');
    var hint = $('scenarioHint');
    if (hint) hint.textContent = Life.scenarioOf(pickedScenario).hint || '';
  }

  /* ── 가문 이어받기 줄 (전당에 내 기록이 있을 때만 보인다) ── */
  function ancestorsNow() {
    if (!Life || typeof Life.ancestors !== 'function') return [];
    try { return Life.ancestors() || []; } catch (e) { return []; }
  }

  function currentAncestor(list) {
    if (!pickedLegacy) return null;
    var all = list || ancestorsNow();
    for (var i = 0; i < all.length; i++) if (all[i].recId === pickedLegacy) return all[i];
    return null;
  }

  function renderLegacy() {
    var row = $('legacyRow');
    if (!row) return;
    var list = ancestorsNow();
    var startScreen = $('screen-start');
    if (!list.length) {
      row.hidden = true;
      pickedLegacy = null;
      if (startScreen) startScreen.classList.remove('has-legacy');
      return;
    }
    var cur = currentAncestor(list);
    if (pickedLegacy && !cur) pickedLegacy = null;
    row.hidden = false;
    // 가문 줄이 한 줄 더 차지하므로 시작 화면 머리를 조금 더 압축한다(styles.css .has-legacy)
    if (startScreen) startScreen.classList.add('has-legacy');
    row.classList.toggle('on', !!cur);
    $('legacyName').textContent = cur
      ? '가문 이어받기 · ' + cur.name + ' (' + cur.gen + '대)'
      : '새 인물로 시작';
    $('legacySub').textContent = cur
      ? cur.family + ' · 유산 ' + cur.heirText + ' · ' + cur.bonus.label + ' +' + cur.bonus.amount
      : '이전 회차의 재산·재능을 물려받아 시작할 수 있어요';
  }

  function openLegacyModal() {
    var list = ancestorsNow();
    if (!list.length) { toast('이어받을 가문이 아직 없어요'); return; }
    var html = '<button type="button" class="lm-item' + (pickedLegacy ? '' : ' active') + '" data-rec="">' +
      '<div class="lm-top"><span class="lg-emoji" aria-hidden="true">👤</span>' +
        '<span class="lm-name">새 인물로 시작</span>' +
        (pickedLegacy ? '' : '<span class="lm-check">✓ 선택됨</span>') + '</div>' +
      '<div class="lm-meta">가문 없이 처음부터 · 물려받는 것 없음</div>' +
      '</button>';
    list.forEach(function (a) {
      var on = pickedLegacy === a.recId;
      var meta = [];
      if (a.stageLabel) meta.push(a.stageLabel);
      if (a.age) meta.push(a.age + '세');
      if (a.grade) meta.push(a.grade + '등급');
      meta.push('남긴 재산 ' + a.assetText);
      html += '<button type="button" class="lm-item' + (on ? ' active' : '') + '" data-rec="' + esc(a.recId) + '">' +
        '<div class="lm-top"><span class="lm-gen">' + a.gen + '대</span>' +
          '<span class="lm-name">' + esc(a.name) + '</span>' +
          (on ? '<span class="lm-check">✓ 선택됨</span>' : '') + '</div>' +
        '<div class="lm-meta">' + esc(meta.join(' · ')) + '</div>' +
        (a.title ? '<div class="lm-title">' + esc(a.title) + '</div>' : '') +
        (a.spouse ? '<div class="lm-family">👪 ' + esc(a.family) + '</div>' : '') +
        '<div class="lm-gain"><span>유산 ' + esc(a.heirText) + '</span>' +
          '<span>' + esc(a.trait) + ' · ' + esc(a.bonus.label) + ' +' + a.bonus.amount + '</span></div>' +
        '</button>';
    });
    $('lmList').innerHTML = html;
    $('lmList').scrollTop = 0;
    $('legacyModal').hidden = false;
    $('legacyModal').setAttribute('aria-hidden', 'false');
  }

  function closeLegacyModal() {
    $('legacyModal').hidden = true;
    $('legacyModal').setAttribute('aria-hidden', 'true');
  }

  function pickLegacy(recId) {
    pickedLegacy = recId || null;
    closeLegacyModal();
    renderLegacy();
    var cur = currentAncestor();
    toast(cur ? '🧬 ' + cur.family + ' · ' + cur.gen + '대' : '새 인물로 시작합니다');
  }

  function bindStart() {
    $('ageGrid').addEventListener('click', function (e) {
      var btn = e.target.closest('.age-card');
      if (!btn) return;
      pickedAge = Number(btn.dataset.age);
      Array.prototype.forEach.call(document.querySelectorAll('.age-card'), function (c) {
        c.classList.toggle('selected', Number(c.dataset.age) === pickedAge);
      });
    });

    $('scenarioRow').addEventListener('click', function (e) {
      var chip = e.target.closest('.scenario-chip');
      if (!chip) return;
      pickedScenario = chip.dataset.sc;
      renderScenarios();
      if (window.Sfx) window.Sfx.pick();
    });

    $('legacyRow').addEventListener('click', openLegacyModal);
    $('lmClose').addEventListener('click', closeLegacyModal);
    $('legacyModal').addEventListener('click', function (e) {
      if (e.target === $('legacyModal')) closeLegacyModal();
    });
    $('lmList').addEventListener('click', function (e) {
      var item = e.target.closest('.lm-item');
      if (!item) return;
      pickLegacy(item.dataset.rec || null);
    });

    $('genderChips').addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip) return;
      pickedGender = chip.dataset.g;
      Array.prototype.forEach.call(document.querySelectorAll('#genderChips .chip'), function (c) {
        c.classList.toggle('active', c === chip);
      });
    });

    $('startBtn').addEventListener('click', startGame);
    $('nameInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); startGame(); }
    });
    $('resumeCard').addEventListener('click', function () {
      var saved = Life.load();
      if (!saved) { renderStart(); return; }
      state = saved;
      if (saved.ended) { renderEnding(true); return; }
      if (saved.grad) { renderGrad(); return; }
      showScreen('play');
      renderGame();
    });
    $('hallBtnStart').addEventListener('click', openHall);
    var fbStart = $('fbBtnStart');
    if (fbStart) fbStart.addEventListener('click', openFeedback);
  }

  /* ── 💬 제안·제보 게시판 ──
     지금 플레이 중인 이름·나이·개월차·사건 제목을 넘겨
     버그 제보의 '발생 위치/나이'를 자동으로 채운다. */
  function openFeedback() {
    autoClear();
    if (!window.Feedback) { toast('게시판을 불러오지 못했습니다'); return; }
    var ctx = { screen: screenName, name: '익명', age: null, month: null, eventTitle: '' };
    if (state) {
      ctx.name = state.name || '익명';
      ctx.age = state.age;
      ctx.month = state.month;
      try {
        var ev = Life.currentEvent(state);
        if (ev) ctx.eventTitle = typeof ev.title === 'function' ? ev.title(state) : ev.title;
      } catch (e) { /* 이벤트를 못 찾아도 나이·개월차는 넘긴다 */ }
    }
    window.Feedback.open(ctx);
  }

  function startGame() {
    var name = $('nameInput').value.trim() || '상훈';
    var legacyId = currentAncestor() ? pickedLegacy : null;
    state = Life.newGame({
      name: name,
      gender: pickedGender,
      startAge: pickedAge,
      scenario: pickedScenario,
      legacy: legacyId
    });
    try { localStorage.setItem(SCENARIO_KEY, pickedScenario); } catch (e) {}
    Life.save(state);
    showScreen('play');
    renderGame();
    if (window.Sfx) window.Sfx.turn();
    var cameoCount = state.cameos ? state.cameos.length : 0;
    var bits = [];
    if (state.legacy) bits.push('🧬 ' + state.legacy.family + ' · ' + state.legacy.gen + '대');
    else if (state.scenario && state.scenario !== 'kr') {
      var sc = Life.scenarioOf(state.scenario);
      bits.push(sc.emoji + ' ' + sc.name);
    }
    if (cameoCount) bits.push('이전 인생 인물 ' + cameoCount + '명');
    toast(bits.length ? bits.join(' · ') + ' — 인생이 시작되었습니다' : '인생이 시작되었습니다');
  }

  /* ── 화면 전환 ── */
  function showScreen(name) {
    if (name !== 'play') autoClear();
    ['start', 'play', 'ending', 'grad', 'hall'].forEach(function (n) {
      var el = $('screen-' + n);
      if (el) el.classList.toggle('active', n === name);
    });
    var st = $('screen-' + name);
    if (st) st.scrollTop = 0;
    screenName = name;
  }

  /* ── 5초 자동 넘김 동작부 ── */
  function autoClear() {
    clearInterval(auto.tick);
    auto.tick = null;
    auto.running = false;
  }

  function autoPaint(remain) {
    var num = $('autoNum');
    var fill = $('autoFill');
    var chip = $('autoChip');
    var secs = Math.max(0, Math.ceil(remain / 1000));
    if (num) num.textContent = secs;
    if (fill) fill.style.width = Math.max(0, Math.min(100, (remain / (AUTO_SECONDS * 1000)) * 100)).toFixed(1) + '%';
    if (chip) chip.classList.toggle('urgent', remain <= 2000);
  }

  function autoRun() {
    auto.running = true;
    auto.deadline = Date.now() + auto.remain;
    clearInterval(auto.tick);
    var row = $('autoRow');
    if (row) row.dataset.mode = 'run';
    var label = $('autoLabel');
    if (label) label.innerHTML = '<span id="autoNum">' + Math.max(1, Math.ceil(auto.remain / 1000)) + '</span>초 후 다음 턴';
    var btn = $('autoPause');
    if (btn) { btn.textContent = '⏸ 일시정지'; btn.setAttribute('aria-pressed', 'false'); btn.hidden = false; }
    autoPaint(auto.remain);
    auto.tick = setInterval(function () {
      auto.remain = auto.deadline - Date.now();
      if (auto.remain <= 0) {
        auto.remain = 0;
        autoClear();
        advance();
        return;
      }
      autoPaint(auto.remain);
    }, 100);
  }

  function autoPausedState() {
    var row = $('autoRow');
    if (row) row.dataset.mode = 'paused';
    var label = $('autoLabel');
    if (label) {
      label.innerHTML = auto.remain > 0
        ? '⏸ 일시정지됨 · <span id="autoNum">' + Math.ceil(auto.remain / 1000) + '</span>초 남음'
        : '⏸ 일시정지됨 · 자동 넘김 꺼짐';
    }
    var btn = $('autoPause');
    if (btn) { btn.textContent = '▶ 다시 시작'; btn.setAttribute('aria-pressed', 'true'); }
    var chip = $('autoChip');
    if (chip) chip.classList.remove('urgent');
  }

  function autoStopState(kind) {
    var row = $('autoRow');
    if (row) row.dataset.mode = 'stop';
    var label = $('autoLabel');
    if (label) {
      label.innerHTML = kind === 'grad'
        ? '🎓 다음은 졸업 결산 — 버튼으로 넘어가세요'
        : '🌅 다음은 인생 마무리 — 버튼으로 넘어가세요';
    }
    var btn = $('autoPause');
    if (btn) btn.hidden = true;
    var fill = $('autoFill');
    if (fill) fill.style.width = '0%';
  }

  // 다음 진행이 졸업식/엔딩이면 자동 넘김을 걸지 않는다(멈춰야 하는 화면)
  function autoPendingStop() {
    if (!state || !state.current || state.current.chosen === null) return null;
    if (state.month < Life.MONTHS) return null;
    if (state.age + 1 > Life.END_AGE) return 'ending';
    for (var i = 0; i < Life.GRADUATIONS.length; i++) {
      if (Life.GRADUATIONS[i].age === state.age) return 'grad';
    }
    return null;
  }

  function autoArm() {
    autoClear();
    var row = $('autoRow');
    if (!row || !state || !state.current || state.current.chosen === null) return;
    var btn = $('autoPause');
    if (btn) btn.hidden = false;
    var stop = autoPendingStop();
    if (stop) { autoStopState(stop); return; }
    auto.remain = AUTO_SECONDS * 1000;
    if (auto.paused) { auto.remain = 0; autoPausedState(); return; }
    autoRun();
  }

  function autoToggle() {
    var row = $('autoRow');
    if (!row) return;
    var mode = row.dataset.mode;
    if (mode === 'stop') return;
    if (mode === 'paused') {
      // 재개 — 사용자가 직접 자동 넘김을 다시 켜는 경우
      auto.paused = false;
      try { localStorage.setItem(AUTO_PAUSED_KEY, '0'); } catch (e) {}
      if (auto.remain <= 0) auto.remain = AUTO_SECONDS * 1000;
      autoRun();
      return;
    }
    // 멈춤 — 남은 시간을 붙잡아 둔다 (다음 결과에도 적용되는 설정으로 저장)
    auto.paused = true;
    try { localStorage.setItem(AUTO_PAUSED_KEY, '1'); } catch (e) {}
    if (auto.running) auto.remain = Math.max(1, auto.deadline - Date.now());
    autoClear();
    autoPausedState();
  }

  /* ── 플레이 화면 ── */
  function renderGame() {
    autoClear();
    if (!state) return;
    missionFlash = false;
    $('whoName').textContent = state.name;
    $('ageLabel').textContent = state.age + '세';
    $('dayLabel').textContent = state.month + '개월차';
    $('logCount').textContent = state.history.length;
    renderStats();
    renderEvent(false);
    renderRewards();
    $('advanceBtn').disabled = !(state.current && state.current.chosen !== null);
  }

  // 기록에 없는 능력치(역량·행운이 없던 시절의 전당 기록)는 '-' 로 보여준다
  function statNum(v) { return typeof v === 'number' && !isNaN(v) ? Math.round(v) : '-'; }

  function renderStats() {
    var box = $('stats');
    box.innerHTML = Life.STATS.map(function (st) {
      var v = state.stats[st.key];
      var pct = Life.statPct(st.key, v);
      return '<div class="stat" data-key="' + st.key + '">' +
        '<div class="stat-label">' + st.label + '</div>' +
        '<div class="stat-val">' + esc(Life.displayStat(st.key, v)) + '</div>' +
        '<div class="stat-bar"><i style="width:' + pct.toFixed(1) + '%' + (st.key === 'asset' && v < 0 ? ';background:#c2413a' : '') + '"></i></div>' +
        '</div>';
    }).join('');
  }

  function pulseStats(deltas) {
    Object.keys(deltas || {}).forEach(function (k) {
      var node = document.querySelector('.stat[data-key="' + k + '"]');
      if (!node) return;
      node.classList.add('pulse');
      setTimeout(function () { node.classList.remove('pulse'); }, 700);
    });
  }

  function badgeDelta(k, v) {
    var up = v > 0;
    var label = LABEL[k] || k;
    var amount = k === 'asset'
      ? (up ? '+' : '-') + Life.formatAsset(Math.abs(v))
      : (up ? '+' : '') + v;
    return '<span class="delta ' + (up ? 'up' : 'down') + '">' + label + ' ' + amount + '</span>';
  }

  function autoRowHtml() {
    return '<div class="auto-row" id="autoRow" data-mode="run">' +
      '<span class="auto-chip" id="autoChip"><span class="auto-label" id="autoLabel">' +
        '<span id="autoNum">' + AUTO_SECONDS + '</span>초 후 다음 턴</span></span>' +
      '<button type="button" class="auto-pause" id="autoPause" aria-pressed="false">⏸ 일시정지</button>' +
      '</div>' +
      '<div class="auto-bar"><i id="autoFill"></i></div>';
  }

  /* ═════════ 성장 아바타 · 말풍선 · 단기 미션 ═════════
     능력치 줄 아래(사건 카드 위)에 한 줄로 붙는다.
     · 아바타는 인라인 SVG(assets/avatar.js) — 나이대·표정·소품이 지금 상태를 따른다
     · 말풍선은 나이대·능력치·직전 선택 결과를 한두 줄로 말한다
     · 미션은 나이대마다 하나, 진행률은 지금 능력치에서 바로 계산한다 */
  var lastBandId = null;
  var missionFlash = false;

  function avatarCardHtml() {
    if (!window.LifeAvatar || !state) return '';
    var A = window.LifeAvatar;
    var band = A.bandOf(state.age);
    var m = A.mission(state);
    var line = A.speech(state, { justDone: missionFlash });
    var animate = band.id !== lastBandId;
    lastBandId = band.id;
    var pct = m.done ? 100 : Math.max(3, Math.min(100, m.pct));
    return '<section class="avatar-card' + (animate ? '' : ' noanim') + (m.done ? ' done' : '') +
      (missionFlash ? ' flash' : '') + '" id="avatarCard" aria-label="성장 아바타">' +
      '<div class="av-tile">' + A.svg(state) + '</div>' +
      '<div class="av-body">' +
        '<div class="av-bubble"><span>' + esc(line) + '</span></div>' +
        '<div class="av-mission" id="avMission" data-done="' + (m.done ? '1' : '0') + '"' +
          ' aria-label="' + esc(m.label + ' ' + m.goal + ' ' + (m.done ? '달성' : m.pct + '퍼센트')) + '">' +
          '<span class="am-chip">🎯 ' + esc(m.label) + '</span>' +
          '<span class="am-goal">' + esc(m.goal) + '</span>' +
          '<span class="am-pct">' + (m.done ? '달성 ✓' : (m.inDebt ? m.curText : m.pct + '%')) + '</span>' +
          '<span class="am-bar"><i style="width:' + pct.toFixed(1) + '%"></i></span>' +
        '</div>' +
      '</div>' +
      '</section>';
  }

  /* 능력치 팝업 — 바뀐 카드 바로 위에서 +5 / -15만 이 떠올랐다 사라진다 */
  function deltaText(k, v) {
    var abs = Math.abs(v);
    if (k === 'asset') {
      var t = window.LifeAvatar ? window.LifeAvatar.manText(abs) : Math.abs(Math.round(v)) + '만';
      return (v > 0 ? '+' : '−') + t;
    }
    return (v > 0 ? '+' : '−') + Math.round(abs);
  }

  function popStatDeltas(deltas, delay) {
    Object.keys(deltas || {}).forEach(function (k) {
      var v = deltas[k];
      if (!v) return;
      var wait = delay || 0;
      var run = function () {
        var cell = document.querySelector('.stat[data-key="' + k + '"]');
        if (!cell) return;
        var el = document.createElement('span');
        el.className = 'stat-pop ' + (v > 0 ? 'up' : 'down') + (k === 'asset' ? ' money' : '') + (wait ? ' late' : '');
        el.textContent = deltaText(k, v);
        el.setAttribute('aria-hidden', 'true');
        cell.appendChild(el);
        setTimeout(function () { if (el.parentNode) el.remove(); }, 1100);
      };
      if (wait) setTimeout(run, wait); else run();
    });
  }

  /* 아바타 카드만 다시 그린다 — 회복처럼 사건 카드는 그대로 두고 상태만 바뀔 때 */
  function refreshAvatar() {
    var el = $('avatarCard');
    if (!el || !window.LifeAvatar || !state) return;
    var host = document.createElement('div');
    host.innerHTML = avatarCardHtml();
    var next = host.firstElementChild;
    if (next && el.parentNode) el.parentNode.replaceChild(next, el);
  }

  /* 미션 달성 검사 — 새로 달성했으면 보너스를 주고 축하 토스트를 띄운다 */
  function checkMissionNow() {
    if (!window.LifeAvatar || !state) return null;
    var got = window.LifeAvatar.checkMission(state);
    if (!got) return null;
    missionFlash = true;
    if (window.Sfx) window.Sfx.mission();
    toast('🎯 ' + got.label + ' 달성! ' + got.bonusLabel + ' 보너스');
    if (navigator.vibrate) { try { navigator.vibrate([10, 40, 14]); } catch (e) {} }
    return got;
  }

  function renderEvent(animate, fresh) {
    var ev = Life.currentEvent(state);
    if (!ev) return;
    var stage = Life.stageOf(state.age);
    var chosen = state.current ? state.current.chosen : null;
    var isChosen = chosen !== null && chosen !== undefined;
    var boom = Life.boomerangOf(state, ev);

    var badges = '<span class="badge age">' + state.age + '세 · ' + state.month + '개월차</span>';
    if (ev.cameo) badges += '<span class="badge cameo">🧬 이전 회차 인물</span>';
    if (ev.boomerang) badges += '<span class="badge boom">🪃 과거의 부메랑</span>';
    if (ev.milestone) badges += '<span class="badge milestone">★ 마일스톤</span>';
    badges += '<span class="badge place">' + esc(ev.place || stage.name) + '</span>';

    var boomHtml = '';
    if (ev.boomerang) {
      boomHtml = '<div class="boom-note">' +
        (boom
          ? '<div class="boom-when">🪃 <b>' + boom.age + '세 ' + boom.month + '개월차</b>의 선택이 돌아왔습니다</div>' +
            '<p class="boom-choice">‘' + esc(boom.choice) + '’</p>'
          : '<div class="boom-when">🪃 오래전의 선택이 돌아왔습니다</div>') +
        (ev.boomerangNote ? '<p class="boom-line">' + esc(ev.boomerangNote) + '</p>' : '') +
        '</div>';
    }

    var title = typeof ev.title === 'function' ? ev.title(state) : ev.title;
    var text = typeof ev.text === 'function' ? ev.text(state) : ev.text;
    var choices = ev.choices.map(function (c, i) {
      var label = typeof c.label === 'function' ? c.label(state) : c.label;
      var dim = isChosen && chosen !== i ? ' dim' : '';
      var sel = isChosen && chosen === i ? ' chosen' : '';
      return '<button type="button" class="choice' + dim + sel + '" data-i="' + i + '"' +
        (isChosen ? ' disabled' : '') + '>' +
        '<span class="num">' + (i + 1) + '</span><span>' + esc(label) + '</span></button>';
    }).join('');

    var resultHtml = '';
    if (isChosen) {
      var deltas = state.current.deltas || {};
      var deltaKeys = Object.keys(deltas);
      resultHtml =
        '<div class="result">' +
        '<div class="result-label">결과</div>' +
        '<p class="result-text">' + esc(state.current.result) + '</p>' +
        (deltaKeys.length
          ? '<div class="deltas">' + deltaKeys.map(function (k) { return badgeDelta(k, deltas[k]); }).join('') + '</div>'
          : '<div class="deltas"><span class="delta up">변화 없음</span></div>') +
        (fresh ? autoRowHtml() : '<p class="next-hint">아래 버튼으로 다음 달로 넘어가세요</p>') +
        '</div>';
    }

    $('stageInner').innerHTML =
      avatarCardHtml() +
      '<article class="event-card' + (animate ? '' : ' noanim') + '" id="eventCard">' +
      '<div class="card-badges">' + badges + '</div>' +
      '<h2 class="card-title">' + esc(title) + '</h2>' +
      '<p class="card-text">' + esc(text).replace(/\n/g, '<br>') + '</p>' +
      (ev.cameo ? cameoNoteHtml() : '') +
      boomHtml +
      '<div class="choices' + (isChosen ? ' locked' : '') + '" id="choices">' + choices + '</div>' +
      resultHtml +
      '</article>' +
      stageNote(stage);

    if (!isChosen) {
      $('choices').addEventListener('click', function (e) {
        var btn = e.target.closest('.choice');
        if (!btn || btn.disabled) return;
        pickChoice(Number(btn.dataset.i));
      });
    }
  }

  /* 🧬 이전 회차 인물 안내줄 — 카드 위에 그 사람의 지난 인생 기록을 짧게 붙인다 */
  function cameoNoteHtml() {
    if (!Life.cameoNote) return '';
    var n = Life.cameoNote(state);
    if (!n) return '';
    return '<div class="cameo-note">' +
      '<div class="cameo-who">🧬 이전 인생의 기록 — <b>' + esc(n.name) + '</b>' +
        (n.rel && n.rel !== 'none' && n.relLabel ? ' · ' + esc(n.relLabel) : '') + '</div>' +
      (n.record ? '<p class="cameo-line">' + esc(n.record) + '</p>' : '') +
      '</div>';
  }

  function stageNote(stage) {
    var lifePct = Math.min(100, Math.max(1, ((state.age - 1 + (state.month - 1) / 12) / (Life.END_AGE - 1)) * 100));
    return '<div class="stage-note">' +
      '<span>' + stage.emoji + ' ' + esc(stage.name) + '</span>' +
      '<span class="sn-bar"><i style="width:' + lifePct.toFixed(1) + '%"></i></span>' +
      '<span>' + state.age + ' / ' + Life.END_AGE + '세</span>' +
      '</div>';
  }

  function pickChoice(index) {
    if (!state) return;
    if (window.Sfx) window.Sfx.pick();
    var ev = Life.currentEvent(state);
    var choice = ev && ev.choices ? ev.choices[index] : null;
    // 미니 승부가 붙은 선택지는 먼저 승부를 본다 (이때는 결과가 아직 없으므로 자동 넘김 타이머도 없다)
    if (choice && choice.mini && window.MiniGame) {
      autoClear();
      window.MiniGame.open(choice.mini, state, function (win) {
        resolveChoice(index, win);
      });
      return;
    }
    resolveChoice(index, null);
  }

  function resolveChoice(index, miniWin) {
    var res = Life.choose(state, index, typeof miniWin === 'boolean' ? { miniWin: miniWin } : undefined);
    if (!res) return;
    if (window.Sfx) {
      if (miniWin === true) window.Sfx.win();
      else if (miniWin === false) window.Sfx.lose();
      else window.Sfx.deltas(res.deltas);
    }
    var mission = checkMissionNow();
    Life.save(state);
    renderStats();
    pulseStats(res.deltas);
    popStatDeltas(res.deltas);
    if (mission) popStatDeltas(mission.deltas, 420);
    renderEvent(true, true);
    missionFlash = false;
    renderRewards();
    $('advanceBtn').disabled = false;
    $('logCount').textContent = state.history.length;
    if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) {} }
    autoArm();
    revealResult();
    checkTitles();
  }

  // 결과가 화면 밖으로 밀렸으면 결과·카운트다운이 보이게 스크롤한다
  function revealResult() {
    setTimeout(function () {
      var stage = $('stage'), row = $('autoRow');
      if (!stage || !row) return;
      var sr = stage.getBoundingClientRect();
      var rr = row.getBoundingClientRect();
      if (rr.bottom > sr.bottom - 10) {
        stage.scrollTop = stage.scrollTop + (rr.bottom - sr.bottom) + 26;
      }
    }, 60);
  }

  /* ── 보상형 광고 ── */
  var REWARD_HINT = {
    undo: '지금은 되돌릴 선택이 없어요',
    reroll: '선택을 하기 전에만 다시 뽑을 수 있어요',
    heal: '체력·멘탈이 30 이하일 때 쓸 수 있어요'
  };

  function renderRewards() {
    var bar = $('rewardBar');
    if (!bar || !state) return;
    var r = Life.rewardState(state);
    var undo = $('rewardUndo'), reroll = $('rewardReroll'), heal = $('rewardHeal');

    undo.disabled = !r.canUndo;
    undo.querySelector('.rb-sub').textContent = r.canUndo ? '광고 보고 1턴 전으로' : '기록 없음';

    reroll.disabled = !r.canReroll;
    reroll.querySelector('.rb-sub').textContent = r.canReroll ? '광고 보고 다시 뽑기' : '지금은 불가';

    heal.disabled = !r.canHeal;
    var healSub = heal.querySelector('.rb-sub');
    if (r.healLeft <= 0) healSub.textContent = '이번 판 소진';
    else if (r.canHeal) healSub.textContent = '광고 보고 +' + r.healAmount + ' (' + r.healLeft + '회 남음)';
    else healSub.textContent = '체력·멘탈 ' + r.healThreshold + ' 이하';
  }

  function requestReward(kind) {
    if (!state) return;
    autoClear();
    var r = Life.rewardState(state);
    var ok = kind === 'undo' ? r.canUndo : kind === 'reroll' ? r.canReroll : r.canHeal;
    if (!ok) { toast(REWARD_HINT[kind] || '지금은 쓸 수 없어요'); return; }
    if (typeof window.showRewardedAd !== 'function') { toast('광고 모듈을 찾지 못했습니다'); return; }
    window.showRewardedAd(kind, applyReward);
  }

  function applyReward(kind) {
    if (!state) return;
    autoClear();
    if (kind === 'undo') {
      var ev = Life.undo(state);
      Life.save(state);
      if (!ev) { toast('되돌릴 기록이 없습니다'); renderRewards(); return; }
      renderGame();
      $('ageLabel').textContent = state.age + '세';
      $('dayLabel').textContent = state.month + '개월차';
      $('logCount').textContent = state.history.length;
      $('advanceBtn').disabled = true;
      toast('⏪ 직전 선택을 되돌렸습니다');
      return;
    }
    if (kind === 'reroll') {
      var next = Life.reroll(state);
      Life.save(state);
      if (!next) { toast('다른 사건을 찾지 못했습니다'); return; }
      renderStats();
      renderEvent(true);
      renderRewards();
      $('advanceBtn').disabled = true;
      $('stage').scrollTop = 0;
      toast('🎲 다른 사건이 나타났습니다');
      return;
    }
    if (kind === 'heal') {
      var res = Life.heal(state);
      Life.save(state);
      if (!res) { toast('지금은 회복할 수 없습니다'); return; }
      var mission = checkMissionNow();
      Life.save(state);
      renderStats();
      pulseStats({ hp: 1, mental: 1 });
      popStatDeltas({ hp: res.hp, mental: res.mental });
      if (mission) popStatDeltas(mission.deltas, 420);
      refreshAvatar();
      missionFlash = false;
      renderRewards();
      toast('💊 체력 +' + res.hp + ' · 멘탈 +' + res.mental + ' (남은 ' + res.left + '회)');
    }
  }

  var BANNER_KEY = 'lifeTurnSim.bannerClosed';
  function initAdZone() {
    var zone = $('adZone');
    if (!zone) return;
    var closed = false;
    try { closed = localStorage.getItem(BANNER_KEY) === '1'; } catch (e) {}
    zone.hidden = closed;
    var btn = $('adZoneClose');
    if (btn) {
      btn.addEventListener('click', function () {
        zone.hidden = true;
        try { localStorage.setItem(BANNER_KEY, '1'); } catch (e) {}
        toast('배너를 접었습니다 (아래 버튼은 그대로)');
      });
    }
  }

  function timewarp() {
    var node = document.querySelector('.timewarp');
    if (!node) {
      node = document.createElement('div');
      node.className = 'timewarp';
      node.innerHTML = '<span>한 달이 지났습니다</span>';
      $('app').appendChild(node);
    }
    node.classList.remove('run');
    void node.offsetWidth;
    node.classList.add('run');
  }

  function advance() {
    autoClear();
    if (!state || !state.current || state.current.chosen === null) return;
    if (window.Sfx) window.Sfx.turn();
    var res = Life.advance(state);
    if (!res.ok) return;
    var mission = res.ended ? null : checkMissionNow();
    Life.save(state);

    if (res.ended) { renderEnding(true); return; }

    $('ageLabel').textContent = state.age + '세';
    $('dayLabel').textContent = state.month + '개월차';
    $('logCount').textContent = state.history.length;

    // 졸업 결산 — 12개월차 턴을 마치고 다음 나이로 넘어간 순간
    if (res.graduation) {
      timewarp();
      setTimeout(renderGrad, 220);
      return;
    }

    timewarp();
    var card = $('eventCard');
    if (card) card.classList.add('leaving');

    setTimeout(function () {
      renderStats();
      if (mission) popStatDeltas(mission.deltas, 260);
      renderEvent(true);
      missionFlash = false;
      renderRewards();
      $('advanceBtn').disabled = true;
      $('stage').scrollTop = 0;
      if (res.birthday && !mission) toast('🎂 ' + state.age + '세가 되었습니다');
    }, 250);
  }

  /* ── 인생 일지 ── */
  function openSheet() {
    autoClear();
    var body = $('sheetBody');
    if (!state.history.length) {
      body.innerHTML = '<div class="tl-empty">아직 기록이 없습니다.<br>첫 선택을 하면 여기에 쌓입니다.</div>';
    } else {
      var html = '';
      var lastAge = null;
      state.history.forEach(function (item) {
        if (item.age !== lastAge) {
          if (lastAge !== null) html += '<div class="tl-birth">' + item.age + '세</div>';
          lastAge = item.age;
        }
        var dk = Object.keys(item.deltas || {});
        html += '<div class="tl-item">' +
          '<div class="tl-when">' + item.age + '세 · ' + item.month + '개월차' + (item.place ? ' · ' + esc(item.place) : '') +
            (item.cameo ? ' · 🧬 이전 회차' : '') + '</div>' +
          '<div class="tl-title">' + esc(item.title) + '</div>' +
          '<span class="tl-choice">' + esc(item.choice) + '</span>' +
          '<div class="tl-result">' + esc(item.result) + '</div>' +
          (dk.length ? '<div class="tl-deltas">' + dk.map(function (k) { return badgeDelta(k, item.deltas[k]); }).join('') + '</div>' : '') +
          '</div>';
      });
      body.innerHTML = html;
    }
    $('sheetSub').textContent = state.name + ' · ' + state.age + '세 · 기록 ' + state.history.length + '개';
    $('sheet').hidden = false;
    $('sheet').setAttribute('aria-hidden', 'false');
    $('overlay').hidden = false;
    body.scrollTop = body.scrollHeight;
  }

  function closeSheet() {
    $('sheet').hidden = true;
    $('sheet').setAttribute('aria-hidden', 'true');
    $('overlay').hidden = true;
  }

  /* ═════════════ 졸업 결산 화면 ═════════════ */
  function recallCard(lines, title, when) {
    return '<div class="recall-card">' +
      '<div class="recall-head"><span class="recall-kicker">회고</span><span class="recall-when">' + esc(when) + '</span></div>' +
      '<h3 class="recall-title">' + esc(title) + '</h3>' +
      '<div class="recall-body">' +
      lines.map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('') +
      '</div></div>';
  }

  /* 🧬 이전 회차의 인연 — 엔딩·요약에 함께 적는다 */
  function cameoEndHtml(c) {
    if (!c) return '';
    return '<div class="end-cameo">' +
      '<div class="ec-head">🧬 이전 회차의 인연</div>' +
      '<div class="ec-body"><b>' + esc(c.name) + '</b>' +
        (c.relLabel ? ' · ' + esc(c.relLabel) : '') + '</div>' +
      (c.record ? '<div class="ec-record">' + esc(c.record) + '</div>' : '') +
      '</div>';
  }

  function cmpRow(r, total) {
    var diffCls = r.diff === null ? '' : (r.diff >= 0 ? ' up' : ' down');
    var pct = Math.max(0, Math.min(100, r.pct));
    var avgPct = r.avgPct === null || r.avgPct === undefined ? null : Math.max(0, Math.min(100, r.avgPct));
    return '<div class="cmp-row' + (total ? ' total' : '') + '">' +
      '<div class="cmp-line">' +
        '<span class="cmp-label">' + esc(r.label) + '</span>' +
        '<span class="cmp-val">' + esc(r.disp) + '</span>' +
        (r.diffDisp ? '<span class="cmp-diff' + diffCls + '">' + esc(r.diffDisp) + '</span>' : '') +
        (r.top !== null ? '<span class="cmp-pct">상위 ' + r.top + '%</span>' : '') +
      '</div>' +
      '<div class="cmp-barrow">' +
        '<div class="cmp-bar"><i style="width:' + pct.toFixed(1) + '%"></i>' +
          (avgPct === null ? '' : '<u style="left:' + avgPct.toFixed(1) + '%"></u>') +
        '</div>' +
        (r.avgDisp ? '<span class="cmp-avg">평균 ' + esc(r.avgDisp) + '</span>' : '') +
      '</div>' +
    '</div>';
  }

  function renderGrad() {
    var info = Life.gradInfo(state);
    if (!info) { renderGame(); showScreen('play'); return; }
    var recall = Life.recall(state, 'grad');
    var def = info.def;

    var stats = '<div class="grad-stats">' + Life.STATS.map(function (st) {
      return '<div class="gs-cell"><span class="gs-label">' + st.label + '</span>' +
        '<b>' + esc(Life.displayStat(st.key, info.stats[st.key])) + '</b></div>';
    }).join('') + '</div>';

    var highlights = info.highlights.slice(0, 2).map(function (hl) {
      return '<div class="grad-memory"><span>' + hl.age + '세 · ' + hl.month + '개월차' +
        (hl.place ? ' · ' + esc(hl.place) : '') + '</span>' +
        '<b>' + esc(hl.title) + '</b></div>';
    }).join('');

    var tags = info.flags.map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('');

    var hall = info.hall || { count: 0, rank: 1, best: null };
    var hallHtml = '<div class="grad-hall">' +
      '<div class="gh-head">🏆 명예의 전당 <span>' + esc(def.short) + '</span></div>' +
      '<div class="gh-rank">지금 기록이면 <b>' + hall.count + '명 중 ' + hall.rank + '위</b></div>' +
      (hall.best ? '<div class="gh-best">1위 ' + esc(hall.best.name) + ' · ' + Math.round(hall.best.score) + '점 · ' +
        esc(hall.best.title) + '</div>' : '') +
      '<button type="button" class="gh-link" id="gradHallBtn">전당 전체 보기 →</button>' +
      '</div>';

    var html =
      '<div class="grad-hero">' +
        '<div class="gh-emoji">' + def.emoji + '</div>' +
        '<div class="grad-kicker">' + info.age + '세 · 12개월차 · ' + esc(def.short) + '</div>' +
        '<h2 class="grad-name">' + esc(def.name) + '</h2>' +
        '<p class="grad-sub">' + esc(info.stage.name) + ' ' + def.years + '년 · 선택 ' + info.count + '개</p>' +
        stats +
      '</div>' +
      recallCard(recall, '그 시절의 나에게', info.age + '세 · ' + def.short) +
      (highlights || tags ? '<div class="grad-sec">이 시절의 기억</div>' +
        '<div class="grad-memories">' + highlights + '</div>' +
        (tags ? '<div class="tag-cloud grad-tags">' + tags + '</div>' : '') : '') +
      '<div class="grad-sec">또래와 비교하면</div>' +
      '<div class="cmp-card">' +
        '<p class="cmp-note">같은 시점에 졸업한 <b>' + (info.sampleSize ? info.sampleSize.toLocaleString('ko-KR') : '수백') +
          '명</b>의 평균과 비교했어요. 회색 선이 평균입니다.</p>' +
        info.rows.map(function (r) { return cmpRow(r, false); }).join('') +
        cmpRow(info.total, true) +
      '</div>' +
      hallHtml +
      '<div class="grad-actions">' +
        '<button type="button" class="btn primary big" id="gradRegister">🏆 여기서 졸업하고 명예의 전당에 등록하기</button>' +
        '<button type="button" class="btn outline" id="gradContinue">➡️ 계속 살기 (80세까지 도전)</button>' +
        '<p class="fine">등록하면 이 인생은 ' + esc(def.label) + '으로 마무리되고, 기록은 이 브라우저의 명예의 전당에 남습니다.</p>' +
      '</div>';

    $('gradScroll').innerHTML = html;
    showScreen('grad');
    $('gradScroll').scrollTop = 0;

    $('gradRegister').addEventListener('click', function () {
      var res = Life.graduate(state, true);
      if (!res || !res.ended) return;
      Life.save(state);
      toast('🏆 명예의 전당에 등록했습니다');
      renderEnding(true);
    });
    $('gradContinue').addEventListener('click', function () {
      Life.graduate(state, false);
      Life.save(state);
      showScreen('play');
      renderGame();
      toast(def.emoji + ' ' + def.short + '을 마치고 계속 살아갑니다');
    });
    $('gradHallBtn').addEventListener('click', function () { openHall('grad'); });
  }

  /* ═════════════ 명예의 전당 ═════════════ */
  var HALL_TAB_LABEL = { kindergarten: '유치원', elementary: '초등', middle: '중학', high: '고교', college: '대학', life80: '완주' };
  var HALL_TABS = [{ key: 'all', label: '전체' }]
    .concat(Life.GRADUATIONS.map(function (g) {
      return { key: g.key, label: HALL_TAB_LABEL[g.key] || g.short };
    }))
    .concat([{ key: 'life80', label: '완주' }]);

  function openHall(from) {
    autoClear();
    hallReturn = from || screenName;
    renderHall();
    showScreen('hall');
  }

  function closeHall() {
    var back = hallReturn || 'start';
    hallReturn = 'start';
    if (back === 'play' && state) { showScreen('play'); renderGame(); return; }
    if (back === 'grad' && state && state.grad) { renderGrad(); return; }
    if (back === 'ending' && state && state.ended) { renderEnding(true); return; }
    showScreen('start');
    renderStart();
  }

  function renderHall() {
    // 보기 전환: 내 전당 | 🏆 전체 랭킹
    var viewBtns = $('hallViews') ? $('hallViews').querySelectorAll('.hall-view') : [];
    for (var i = 0; i < viewBtns.length; i++) {
      var onView = viewBtns[i].dataset.view === hallView;
      viewBtns[i].classList.toggle('active', onView);
      viewBtns[i].setAttribute('aria-selected', onView ? 'true' : 'false');
    }
    if ($('hallMineView')) $('hallMineView').hidden = hallView !== 'mine';
    if ($('hallGlobalView')) $('hallGlobalView').hidden = hallView !== 'global';
    if (hallView === 'global') {
      $('hallSub').textContent = '전체 유저 익명 랭킹' +
        (lgData && lgData.total != null ? ' · ' + lgData.total + '명 참가' : '');
      renderHallGlobal();
      return;
    }
    renderHallMine();
  }

  function renderHallMine() {
    var recs = Life.hallRecords();
    var mine = recs.filter(function (r) { return r.mine; });
    var bestMine = Life.hallBestMine();
    var list = hallTab === 'all' ? Life.hallSorted(recs) : Life.hallOf(hallTab);

    $('hallSub').textContent = '졸업·완주 기록 ' + recs.length + '건 · 내 기록 ' + mine.length + '건';

    if (window.TitleBook) {
      var tp = window.TitleBook.progress();
      $('hallTitles').innerHTML = '<span class="ht-emoji">🏅</span>' +
        '<span class="ht-body"><b>칭호·인연 도감</b>' +
        '<span>' + tp.got + ' / ' + tp.total + ' 수집 · ' + tp.pct + '%</span></span>' +
        '<span class="ht-go">보기 →</span>';
      $('hallTitles').hidden = false;
    }

    $('hallTabs').innerHTML = HALL_TABS.map(function (t) {
      return '<button type="button" class="hall-tab' + (hallTab === t.key ? ' active' : '') +
        '" data-tab="' + t.key + '">' + esc(t.label) + '</button>';
    }).join('');

    var pin = '';
    if (bestMine) {
      var pinRank = Life.hallRank(bestMine.key, bestMine.score);
      pin = '<button type="button" class="hall-pin" id="hallPin">' +
        '<div class="hp-line"><span class="hp-badge">내 최고 기록</span>' +
          '<span class="hp-stage">' + esc(bestMine.stageLabel) + ' · ' + Math.round(bestMine.score) + '점</span></div>' +
        '<div class="hp-title">' + esc(bestMine.title) + '</div>' +
        '<div class="hp-meta">내 기록 ' + mine.length + '건 · 이 단계 ' + pinRank.count + '명 중 ' + pinRank.rank + '위 · 눌러서 보기 →</div>' +
        '</button>';
    }

    if (!list.length) {
      $('hallBody').innerHTML = pin + '<div class="hall-empty">아직 이 단계의 기록이 없습니다.<br>' +
        '졸업 결산에서 「명예의 전당에 등록하기」를 고르면 여기에 남습니다.</div>';
      bindPin(bestMine);
      return;
    }

    var rows = list.map(function (r, i) {
      var isBest = bestMine && r.id === bestMine.id;
      var medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : String(i + 1);
      return '<div class="hall-row' + (r.mine ? ' mine' : '') + (isBest ? ' best' : '') + '">' +
        '<div class="hr-rank">' + medal + '</div>' +
        '<div class="hr-body">' +
          '<div class="hr-line1"><b>' + esc(r.name) + '</b>' +
            (r.mine ? '<span class="hr-mine">' + (isBest ? '내 최고 기록' : '내 기록') + '</span>' : '') +
            '<span class="hr-stage">' + esc(r.stageLabel) + '</span></div>' +
          '<div class="hr-title">' + esc(r.title) + '</div>' +
          (r.cameo ? '<div class="hr-cameo">🧬 ' + esc(r.cameo.name) + ' · ' + esc(r.cameo.relLabel || '') + '</div>' : '') +
          '<div class="hr-stats">체력 ' + statNum(r.stats.hp) + ' · 멘탈 ' + statNum(r.stats.mental) +
            ' · 매력 ' + statNum(r.stats.charm) + ' · 호감도 ' + statNum(r.stats.social) + '</div>' +
          '<div class="hr-stats">역량 ' + statNum(r.stats.intel) + ' · 행운 ' + statNum(r.stats.luck) +
            ' · 재산 ' + esc(Life.formatAsset(r.stats.asset || 0)) + '</div>' +
        '</div>' +
        '<div class="hr-score"><b>' + scoreText(r.score) + '</b>' +
          '<i class="g-' + String(r.grade || 'B').toLowerCase() + '">' + esc(r.grade || '-') + '</i>' +
          '<span>' + (r.top ? '상위 ' + r.top + '%' : '완주') + '</span></div>' +
        '</div>';
    }).join('');

    $('hallBody').innerHTML = pin + rows +
      '<p class="hall-fine">기본 기록은 게임 밸런스 시뮬레이션에서 뽑은 가상 인물의 기록입니다.<br>' +
      '내 기록은 이 브라우저에 저장됩니다 · Google로 로그인하면 기기 사이로 이어집니다.</p>';
    $('hallBody').scrollTop = 0;
    bindPin(bestMine);
  }

  function bindPin(bestMine) {
    var pin = $('hallPin');
    if (!pin || !bestMine) return;
    pin.addEventListener('click', function () {
      hallTab = bestMine.key;
      renderHall();
    });
  }

  /* ═════════════ 🏆 전체 랭킹 ═════════════
     로그인한 사람의 기록만 서버(life_sim_leaderboard)에 올라간다 — 캐릭터 이름·엔딩 칭호·
     점수·자산·나이·대수·시나리오뿐이고 이메일·실명은 보내지 않는다.
     로그인하지 않았어도 모두의 기록은 볼 수 있고, '내 기록'만 이 기기 최고 기록으로 비교한다. */
  function setHallView(view) {
    hallView = view === 'global' ? 'global' : 'mine';
    renderHall();
    if (hallView === 'global' && !lgData && !lgLoading) loadGlobal();
  }

  function loadGlobal() {
    var LB = window.Leaderboard;
    if (!LB || lgLoading) return;
    lgLoading = true;
    lgError = '';
    renderHallGlobal();
    LB.list(lgSort).then(function (data) {
      lgLoading = false;
      lgData = data || null;
      renderHallGlobal();
      if (hallView === 'global' && screenName === 'hall') {
        $('hallSub').textContent = '전체 유저 익명 랭킹 · ' + ((lgData && lgData.total) || 0) + '명 참가';
      }
    }).catch(function (e) {
      lgLoading = false;
      lgError = (e && e.message) || '전체 랭킹을 불러오지 못했습니다';
      renderHallGlobal();
    });
  }

  function scenarioShort(id) {
    try { return Life.scenarioOf(id).short || ''; } catch (e) { return ''; }
  }

  function renderHallGlobal() {
    var LB = window.Leaderboard;
    if (!LB) return;
    var signed = LB.signedIn();

    // 정렬 토글
    var btns = $('lgSorts') ? $('lgSorts').querySelectorAll('.lg-sort') : [];
    for (var i = 0; i < btns.length; i++) {
      var onSort = btns[i].dataset.sort === lgSort;
      btns[i].classList.toggle('active', onSort);
      btns[i].setAttribute('aria-pressed', onSort ? 'true' : 'false');
    }

    // 로그인했을 때만 이름·자동 등록 줄을 보여 준다
    $('lgTools').hidden = !signed;
    $('lgAutoRow').hidden = !signed;
    if (signed) {
      var input = $('lgNick');
      if (document.activeElement !== input) input.value = LB.nick();
      input.placeholder = LB.profileName() || '익명 플레이어';
      $('lgAuto').checked = LB.auto();
    }
    var pending = signed && typeof LB.pendingRecords === 'function' ? LB.pendingRecords(1).length : 0;
    $('lgActs').hidden = !signed || !pending;
    $('lgClear').hidden = !signed || !(typeof LB.sentCount === 'function' && LB.sentCount() > 0);

    var data = lgData;
    var best = LB.localBest();
    var me = (data && data.me) || null;
    var myScore = me && typeof me.best_score === 'number' ? me.best_score : (best ? best.score : null);
    var pct = null;
    if (me && me.top_percent != null) pct = me.top_percent;
    else if (myScore != null) pct = LB.localTopPercent(myScore);

    $('lgMeBadge').textContent = signed ? (me ? '내 최고' : '내 기록') : '이 기기 최고';
    $('lgMyScore').textContent = myScore == null ? '—' : scoreText(myScore);
    $('lgMyPct').textContent = pct == null ? '—' : '상위 ' + pct + '%';

    var sub;
    if (signed) {
      sub = (me && me.total)
        ? me.rank + '위 / 전체 ' + me.total + '명 · ' + LB.nick()
        : '아직 올린 기록이 없습니다 · 엔딩(졸업·80세 완주)에서 자동으로 올라갑니다';
    } else if (best) {
      sub = 'Google로 로그인하면 내 기록이 전체 랭킹에 오릅니다 · 지금은 이 기기 최고 기록과 비교합니다';
    } else {
      sub = 'Google로 로그인하면 내 기록이 전체 랭킹에 오릅니다 (위에서 로그인)';
    }
    $('lgMySub').textContent = sub;
    $('lgCount').textContent = data && data.total != null ? data.total + '명' : '—';

    var html;
    if (lgLoading && !data) {
      html = '<div class="hall-empty">전체 랭킹을 불러오는 중…</div>';
    } else if (lgError) {
      html = '<div class="hall-empty">' + esc(lgError) + '<br>' +
        (signed ? '잠시 뒤 다시 열어 보세요.' : '로그인하지 않아도 모두의 기록은 볼 수 있습니다.') + '</div>';
    } else if (!data || !(data.entries || []).length) {
      html = '<div class="hall-empty">아직 등록된 기록이 없습니다.<br>' +
        (signed ? '이 인생의 주인공이 되어 보세요!' : 'Google로 로그인하면 첫 기록의 주인공이 될 수 있습니다.') + '</div>';
    } else {
      html = (data.entries || []).map(function (r) {
        var rank = r.rank || 0;
        var medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : String(rank);
        var big = lgSort === 'assets' ? Life.formatAsset(r.net_assets) : scoreText(r.score);
        var small = lgSort === 'assets' ? scoreText(r.score) + '점' : Life.formatAsset(r.net_assets);
        var meta = [esc(r.grade || '-')];
        if (r.archetype) meta.push(esc(r.archetype));
        var scn = scenarioShort(r.scenario);
        if (scn) meta.push(esc(scn));
        if (r.display_name && r.display_name !== '익명 플레이어' && r.display_name !== r.character_name) {
          meta.push('플레이어 ' + esc(r.display_name));
        }
        return '<div class="lg-row' + (r.mine ? ' mine' : '') + (rank > 0 && rank <= 3 ? ' top' : '') + '">' +
          '<div class="lg-rank">' + medal + '</div>' +
          '<div class="lg-main">' +
            '<div class="lg-line1"><b>' + esc(r.character_name) + '</b>' +
              '<span class="lg-gen">' + (r.generation > 1 ? r.generation + '대' : '1대') + '</span>' +
              '<span class="lg-age">' + Math.round(r.final_age || 0) + '세</span>' +
              (r.mine ? '<span class="lg-mine">내 기록</span>' : '') + '</div>' +
            (r.title ? '<div class="lg-title">' + esc(r.title) + '</div>' : '') +
            '<div class="lg-meta">' + meta.join(' · ') + '</div>' +
          '</div>' +
          '<div class="lg-score"><b>' + big + '</b><span>' + small + '</span></div>' +
          '</div>';
      }).join('') +
        '<p class="hall-fine">전체 랭킹은 로그인한 플레이어가 등록한 기록입니다.<br>' +
        '이메일은 공개되지 않고, 캐릭터 이름·점수·자산만 보입니다.</p>';
    }
    $('lgBody').innerHTML = html;
    $('lgBody').scrollTop = 0;
  }

  function saveNick() {
    var LB = window.Leaderboard;
    if (!LB) return;
    var v = LB.setNick($('lgNick').value);
    $('lgNick').value = v;
    toast('랭킹 이름을 「' + v + '」로 저장했습니다 · 다음에 올리는 기록부터 적용');
    renderHallGlobal();
  }

  function bindHall() {
    $('hallBack').addEventListener('click', closeHall);
    $('hallTabs').addEventListener('click', function (e) {
      var btn = e.target.closest('.hall-tab');
      if (!btn) return;
      hallTab = btn.dataset.tab;
      renderHall();
    });

    // 내 전당 | 🏆 전체 랭킹
    $('hallViews').addEventListener('click', function (e) {
      var btn = e.target.closest('.hall-view');
      if (!btn) return;
      setHallView(btn.dataset.view);
    });

    // 총점 순 | 자산 순
    $('lgSorts').addEventListener('click', function (e) {
      var btn = e.target.closest('.lg-sort');
      if (!btn) return;
      var next = btn.dataset.sort === 'assets' ? 'assets' : 'score';
      if (next === lgSort && lgData) return;
      lgSort = next;
      lgData = null;
      renderHall();
      loadGlobal();
    });

    $('lgNickSave').addEventListener('click', saveNick);
    $('lgClear').addEventListener('click', function () {
      var LB = window.Leaderboard;
      if (!LB) return;
      if (!window.confirm('전체 랭킹에 올린 내 기록을 모두 지울까요?')) return;
      LB.clearMine().then(function (res) {
        toast((res && res.removed ? res.removed + '건' : '내 기록을') + ' 전체 랭킹에서 지웠습니다');
        lgData = null;
        loadGlobal();
      }).catch(function (e) {
        toast('지우지 못했습니다 · ' + ((e && e.message) || '잠시 뒤 다시'));
      });
    });
    $('lgUpload').addEventListener('click', function () {
      var LB = window.Leaderboard;
      if (!LB) return;
      var btn = $('lgUpload');
      btn.disabled = true;
      LB.submitBest(3).then(function (res) {
        btn.disabled = false;
        if (!res || !res.results || !res.results.length) toast('올릴 기록이 없습니다');
        lgData = null;
        loadGlobal();
      }).catch(function (e) {
        btn.disabled = false;
        toast('올리지 못했습니다 · ' + ((e && e.message) || '잠시 뒤 다시'));
      });
    });
    $('lgNick').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); saveNick(); }
    });
    $('lgAuto').addEventListener('change', function () {
      if (!window.Leaderboard) return;
      var on = window.Leaderboard.setAuto($('lgAuto').checked);
      toast(on ? '🏆 새 기록을 자동으로 올립니다' : '🏆 자동 등록을 껐습니다');
    });
  }

  /* ── 엔딩 / 인생 요약 ── */
  function renderEnding(isFinal) {
    if (!state) return;
    if (state.grad && state.grad.registered) { renderGradEnding(); return; }
    var sum = Life.summary(state);
    var gradeClass = sum.grade.toLowerCase();

    var highlights = sum.highlights.map(function (hl) {
      return '<div class="highlight">' +
        '<div class="h-when">' + hl.age + '세 · ' + hl.month + '개월차 · ' + esc(hl.place || '') + '</div>' +
        '<div class="h-title">' + esc(hl.title) + '</div>' +
        '<div class="h-text">' + esc(hl.result) + '</div>' +
        '</div>';
    }).join('');

    var tags = sum.tags.map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('');

    var lifeRank = Life.hallRank('life80', Life.scoreOfStats(state.stats));

    var html =
      '<div class="grade-row">' +
        '<div class="grade ' + gradeClass + '">' + sum.grade + '</div>' +
        '<div><div class="g-meta">' + esc(sum.gradeLabel) + ' · 총점 ' + sum.score + '</div>' +
        '<div class="g-meta">' + (isFinal ? '인생을 마쳤습니다' : '여기까지의 인생') + '</div></div>' +
      '</div>' +
      '<div class="ending-card">' +
        '<div class="end-kicker">' + (isFinal ? '당신의 인생은' : '지금까지의 인생은') + '</div>' +
        (sum.archetype ? '<div class="end-arch">' + sum.archetype.emoji + ' ' + esc(sum.archetype.label) + '</div>' : '') +
        '<h2 class="end-title">' + esc(sum.title) + '</h2>' +
        '<p class="end-summary">' + esc(sum.oneLiner) + '</p>' +
        '<div class="end-stats">' +
          '<div class="end-stat"><div class="es-label">마지막 나이</div><div class="es-val">' + sum.finalAge + '세</div></div>' +
          '<div class="end-stat"><div class="es-label">남은 재산</div><div class="es-val">' + esc(Life.formatAsset(sum.stats.asset)) + '</div></div>' +
          '<div class="end-stat"><div class="es-label">체력 / 멘탈</div><div class="es-val">' + Math.round(sum.stats.hp) + ' / ' + Math.round(sum.stats.mental) + '</div></div>' +
          '<div class="end-stat"><div class="es-label">매력 / 호감도</div><div class="es-val">' + Math.round(sum.stats.charm) + ' / ' + Math.round(sum.stats.social) + '</div></div>' +
          '<div class="end-stat wide"><div class="es-label">역량 / 행운</div><div class="es-val">' + Math.round(sum.stats.intel) + ' / ' + Math.round(sum.stats.luck) + '</div></div>' +
          '<div class="end-stat wide"><div class="es-label">쌓인 선택</div><div class="es-val">' + sum.turns + '개</div></div>' +
        '</div>' +
        '<div class="end-brand">🎲 인생 한 턴</div>' +
      '</div>' +
      cameoEndHtml(sum.cameo) +
      (isFinal ? recallCard(Life.recall(state, 'life'), '여든 살의 나에게', '80세 · 인생 회고') : '') +
      (highlights ? '<div class="end-section-title">인생 하이라이트</div><div class="highlights">' + highlights + '</div>' : '') +
      (tags ? '<div class="end-section-title">남은 것들</div><div class="tag-cloud">' + tags + '</div>' : '') +
      (isFinal && lifeRank.count
        ? '<div class="end-hall">🏆 명예의 전당 · 80세 완주 <b>' + lifeRank.count + '명 중 ' + lifeRank.rank + '위</b></div>'
        : '') +
      '<div class="end-actions">' +
        (isFinal
          ? '<button class="btn primary" id="endRestart">새 인생 시작하기</button>'
          : '<button class="btn primary" id="endContinue">계속 살기 →</button>') +
        '<button class="btn log" id="endLog">📖 일지</button>' +
      '</div>' +
      '<div class="end-actions second">' +
        '<button class="btn log" id="endHall">🏆 명예의 전당</button>' +
        '<button class="btn log share-card" id="endShare" aria-label="결과 카드 저장 또는 공유">' +
          '<b>📸 결과 카드</b><span>저장 · 공유</span></button>' +
      '</div>';

    $('endingScroll').innerHTML = html;
    showScreen('ending');
    if (isFinal && window.Sfx) window.Sfx.ending();

    var cont = $('endContinue');
    if (cont) cont.addEventListener('click', function () { showScreen('play'); renderGame(); });
    var restart = $('endRestart');
    if (restart) restart.addEventListener('click', resetGame);
    $('endLog').addEventListener('click', function () {
      if (!state.history.length) return;
      openSheet();
    });
    var hb = $('endHall');
    if (hb) hb.addEventListener('click', function () { openHall('ending'); });
    var sh = $('endShare');
    if (sh) sh.addEventListener('click', openShareCard);
  }

  /* ═════════════ 📸 엔딩 결과 카드 ═════════════
     1080×1350 카드를 canvas 로 그리고, 미리보기에서 저장(PNG) 또는 공유(모바일 공유 시트). */
  function openShareCard() {
    if (!state) return;
    if (!window.ShareCard) { toast('결과 카드를 만들 수 없습니다'); return; }
    var canvas = window.ShareCard.render(state);
    if (!canvas) { toast('이 브라우저에서는 카드를 만들 수 없습니다'); return; }
    try {
      $('smImg').src = canvas.toDataURL('image/png');
    } catch (e) { toast('카드를 그리지 못했습니다'); return; }
    $('smSub').textContent = '1080×1350 · PNG · ' + window.ShareCard.filename(state);
    $('smShare').hidden = !window.ShareCard.canShareFiles();
    $('shareModal').hidden = false;
    $('shareModal').setAttribute('aria-hidden', 'false');
  }

  function closeShareCard() {
    $('shareModal').hidden = true;
    $('shareModal').setAttribute('aria-hidden', 'true');
    $('smImg').removeAttribute('src');
  }

  function renderGradEnding() {
    var info = Life.gradInfo(state);
    if (!info) { renderEnding(false); return; }
    var def = info.def;
    var recall = Life.recall(state, 'grad');
    var sum = Life.summary(state);
    var hall = info.hall || { count: 0, rank: 1, best: null };

    var highlights = sum.highlights.map(function (hl) {
      return '<div class="highlight">' +
        '<div class="h-when">' + hl.age + '세 · ' + hl.month + '개월차 · ' + esc(hl.place || '') + '</div>' +
        '<div class="h-title">' + esc(hl.title) + '</div>' +
        '<div class="h-text">' + esc(hl.result) + '</div></div>';
    }).join('');
    var tags = sum.tags.map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('');

    var html =
      '<div class="grade-row">' +
        '<div class="grade ' + info.grade.toLowerCase() + '">' + info.grade + '</div>' +
        '<div><div class="g-meta">' + esc(info.gradeLabel) + ' · 종합 ' + Math.round(info.score) + '점</div>' +
        '<div class="g-meta">' + esc(def.short) + ' · 명예의 전당 등록 완료</div></div>' +
      '</div>' +
      '<div class="ending-card grad-ending">' +
        '<div class="end-kicker">' + def.emoji + ' ' + esc(def.label) + '</div>' +
        '<h2 class="end-title">' + esc(info.title) + '</h2>' +
        '<p class="end-summary">' + esc(sum.oneLiner) + '</p>' +
        '<div class="end-stats">' +
          '<div class="end-stat"><div class="es-label">졸업 나이</div><div class="es-val">' + info.age + '세</div></div>' +
          '<div class="end-stat"><div class="es-label">남은 재산</div><div class="es-val">' + esc(Life.formatAsset(info.stats.asset)) + '</div></div>' +
          '<div class="end-stat"><div class="es-label">체력 / 멘탈</div><div class="es-val">' + Math.round(info.stats.hp) + ' / ' + Math.round(info.stats.mental) + '</div></div>' +
          '<div class="end-stat"><div class="es-label">매력 / 호감도</div><div class="es-val">' + Math.round(info.stats.charm) + ' / ' + Math.round(info.stats.social) + '</div></div>' +
          '<div class="end-stat wide"><div class="es-label">역량 / 행운</div><div class="es-val">' + Math.round(info.stats.intel) + ' / ' + Math.round(info.stats.luck) + '</div></div>' +
          '<div class="end-stat wide"><div class="es-label">명예의 전당 순위</div><div class="es-val">' +
            hall.count + '명 중 ' + hall.rank + '위 · 상위 ' + (info.total.top || 50) + '%</div></div>' +
        '</div>' +
        '<div class="end-brand">🎲 인생 한 턴</div>' +
      '</div>' +
      cameoEndHtml(sum.cameo) +
      recallCard(recall, '그 시절의 나에게', info.age + '세 · ' + def.short) +
      (highlights ? '<div class="end-section-title">인생 하이라이트</div><div class="highlights">' + highlights + '</div>' : '') +
      (tags ? '<div class="end-section-title">남은 것들</div><div class="tag-cloud">' + tags + '</div>' : '') +
      '<div class="end-actions">' +
        '<button class="btn primary" id="endRestart">새 인생 시작하기</button>' +
        '<button class="btn log" id="endLog">📖 일지</button>' +
      '</div>' +
      '<div class="end-actions second">' +
        '<button class="btn log" id="endHall">🏆 명예의 전당</button>' +
        '<button class="btn log share-card" id="endShare" aria-label="결과 카드 저장 또는 공유">' +
          '<b>📸 결과 카드</b><span>저장 · 공유</span></button>' +
      '</div>';

    $('endingScroll').innerHTML = html;
    showScreen('ending');
    if (window.Sfx) window.Sfx.ending();
    $('endRestart').addEventListener('click', resetGame);
    $('endLog').addEventListener('click', function () {
      if (!state.history.length) return;
      openSheet();
    });
    $('endHall').addEventListener('click', function () { openHall('ending'); });
    $('endShare').addEventListener('click', openShareCard);
  }

  /* ═════════════ 칭호·인연 도감 ═════════════ */
  var badgeTimer = null;

  function checkTitles() {
    if (!window.TitleBook || !state) return;
    var got = window.TitleBook.check(state);
    if (got.length) {
      if (window.Sfx) window.Sfx.title();
      showTitleBadge(got);
    }
  }

  function showTitleBadge(titles) {
    var old = $('badgePop');
    if (old) old.remove();
    var t = titles[0];
    if (!t) return;
    var extra = titles.length > 1 ? ' · 외 ' + (titles.length - 1) + '개' : '';
    var pop = document.createElement('div');
    pop.className = 'badge-pop';
    pop.id = 'badgePop';
    pop.setAttribute('role', 'status');
    pop.innerHTML =
      '<div class="bp-emoji">' + t.emoji + '</div>' +
      '<div class="bp-body">' +
        '<div class="bp-kicker">🏅 새 칭호' + esc(extra) + '</div>' +
        '<div class="bp-name">' + esc(t.name) + '</div>' +
        '<div class="bp-desc">' + esc(t.desc) + '</div>' +
      '</div>' +
      '<span class="bp-open">도감 →</span>';
    pop.addEventListener('click', function () {
      clearTimeout(badgeTimer);
      pop.remove();
      openTitleBook();
    });
    $('app').appendChild(pop);
    requestAnimationFrame(function () { pop.classList.add('show'); });
    clearTimeout(badgeTimer);
    badgeTimer = setTimeout(function () {
      pop.classList.remove('show');
      setTimeout(function () { if (pop.parentNode) pop.remove(); }, 320);
    }, 4200);
  }

  function ensureTitleModal() {
    var modal = $('titleModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'title-modal';
    modal.id = 'titleModal';
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML =
      '<header class="tm-top">' +
        '<button type="button" class="tm-close" id="tmClose" aria-label="닫기">✕</button>' +
        '<div class="tm-title-box">' +
          '<h2>🏅 칭호·인연 도감</h2>' +
          '<p id="tmSub">—</p>' +
        '</div>' +
      '</header>' +
      '<div class="tm-progress"><i id="tmBar"></i></div>' +
      '<div class="tm-body" id="tmBody"></div>' +
      '<p class="tm-note">해금한 칭호는 이 브라우저에 남습니다 · 새 인생을 시작해도 그대로예요</p>';
    $('app').appendChild(modal);
    $('tmClose').addEventListener('click', closeTitleBook);
    modal.addEventListener('click', function (e) { if (e.target === modal) closeTitleBook(); });
    return modal;
  }

  function openTitleBook() {
    if (!window.TitleBook) return;
    var modal = ensureTitleModal();
    var prog = window.TitleBook.progress();
    var owned = window.TitleBook.owned();
    $('tmSub').textContent = prog.got + ' / ' + prog.total + ' 수집 · ' + prog.pct + '%';
    $('tmBar').style.width = Math.max(2, prog.pct) + '%';
    $('tmBody').innerHTML = window.TitleBook.LIST.map(function (t) {
      var rec = owned[t.id];
      var when = rec ? (rec.age + '세 ' + (rec.month || 1) + '개월차' + (rec.name ? ' · ' + rec.name : '')) :
        (t.ages[0] === t.ages[1] ? t.ages[0] + '세에 해금' : t.ages[0] + '~' + t.ages[1] + '세에 해금');
      return '<div class="tb-item' + (rec ? ' got' : '') + '">' +
        '<div class="tb-emoji">' + (rec ? t.emoji : '🔒') + '</div>' +
        '<div class="tb-body">' +
          '<div class="tb-name">' + (rec ? esc(t.name) : '???') +
            '<span class="tb-kind">' + esc(t.kind) + '</span></div>' +
          '<div class="tb-desc">' + (rec ? esc(t.desc) : '아직 만나지 못한 칭호입니다') + '</div>' +
          '<div class="tb-when">' + esc(when) + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    $('tmBody').scrollTop = 0;
  }

  function closeTitleBook() {
    var modal = $('titleModal');
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
  }

  /* ── 토스트 ── */
  var toastTimer = null;
  function toast(msg) {
    var node = $('toast');
    node.textContent = msg;
    node.hidden = false;
    node.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      node.classList.remove('show');
      setTimeout(function () { node.hidden = true; }, 260);
    }, 1900);
  }

  /* ── 새로 시작 ── */
  function resetGame() {
    autoClear();
    if (state && state.history.length && !state.ended) {
      if (!window.confirm('지금 인생을 지우고 처음부터 시작할까요?')) return;
    }
    Life.clear();
    state = null;
    closeSheet();
    showScreen('start');
    renderStart();
    window.scrollTo(0, 0);
    $('screen-start').scrollTop = 0;
  }

  /* ── 바인딩 ── */
  function bind() {
    $('advanceBtn').addEventListener('click', advance);
    $('logBtn').addEventListener('click', openSheet);
    $('sheetClose').addEventListener('click', closeSheet);
    $('overlay').addEventListener('click', closeSheet);
    $('summaryBtn').addEventListener('click', function () {
      if (!state) return;
      renderEnding(false);
    });
    $('resetBtn').addEventListener('click', resetGame);
    $('hallBtnPlay').addEventListener('click', function () { openHall('play'); });
    var fbPlay = $('fbBtnPlay');
    if (fbPlay) fbPlay.addEventListener('click', openFeedback);

    ['rewardUndo', 'rewardReroll', 'rewardHeal'].forEach(function (id) {
      var btn = $(id);
      if (!btn) return;
      btn.addEventListener('click', function () { requestReward(btn.dataset.reason); });
    });
    initAdZone();
    bindHall();
    initSfx();

    // 📸 결과 카드 미리보기 · 저장 · 공유
    $('smClose').addEventListener('click', closeShareCard);
    $('shareModal').addEventListener('click', function (e) {
      if (e.target === $('shareModal')) closeShareCard();
    });
    $('smSave').addEventListener('click', function () {
      if (!state || !window.ShareCard) return;
      window.ShareCard.download(state).then(function (r) {
        toast(r && r.ok ? '📸 결과 카드를 저장했습니다' : '저장하지 못했습니다');
      });
    });
    $('smShare').addEventListener('click', function () {
      if (!state || !window.ShareCard) return;
      window.ShareCard.share(state).then(function (r) {
        if (!r) return;
        if (r.mode === 'share') toast('공유 시트를 열었습니다');
        else if (r.mode === 'cancel') return;
        else if (r.ok) toast('📸 이미지로 저장했습니다');
        else toast('공유하지 못했습니다');
      });
    });

    // 칭호 도감 진입 (시작 화면 · 플레이 화면)
    var tbStart = $('titleBtnStart');
    if (tbStart) tbStart.addEventListener('click', openTitleBook);
    var tbHall = $('hallTitles');
    if (tbHall) tbHall.addEventListener('click', openTitleBook);

    // ☁️ 구글 로그인 · 동기화 칩 (시작 화면 · 명예의 전당)
    if (window.CloudSync) {
      window.CloudSync.mount($('syncRow'));
      window.CloudSync.mount($('hallSyncRow'));
    }

    // 결과 카드 안의 ⏸ 일시정지 토글 (카드가 다시 그려져도 살아 있게 위임)
    $('stageInner').addEventListener('click', function (e) {
      if (e.target.closest('#autoPause')) { e.preventDefault(); autoToggle(); }
    });

    // 탭을 떠나면 타이머를 멈춘다 (돌아왔을 때 모르는 사이 넘어가 있지 않게)
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && auto.running) {
        auto.remain = Math.max(1, auto.deadline - Date.now());
        autoClear();
        if ($('autoRow')) autoPausedState();
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeTitleBook();
        closeShareCard();
        closeLegacyModal();
      }
    });
  }

  /* ── 🔊 효과음 토글 (상단 바) ──
     기본은 켜짐. 누를 때마다 켜고 끄며, 상태는 localStorage 에 남는다.
     iOS 사파리는 사용자 제스처 전에 소리를 막으므로, 처음 화면을 건드리는 순간 연다. */
  function initSfx() {
    var btn = $('sfxBtn');
    if (!window.Sfx) { if (btn) btn.hidden = true; return; }
    if (!window.Sfx.supported()) { if (btn) btn.hidden = true; return; }
    paintSfx();
    if (btn) {
      btn.addEventListener('click', function () {
        window.Sfx.unlock();
        var muted = window.Sfx.toggle();
        paintSfx();
        toast(muted ? '🔇 효과음을 꼈습니다' : '🔊 효과음을 켰습니다');
      });
    }
    var once = function () {
      window.Sfx.unlock();
      document.removeEventListener('pointerdown', once);
      document.removeEventListener('keydown', once);
    };
    document.addEventListener('pointerdown', once, { passive: true });
    document.addEventListener('keydown', once);
  }

  function paintSfx() {
    var btn = $('sfxBtn');
    if (!btn || !window.Sfx) return;
    var muted = window.Sfx.isMuted();
    btn.textContent = muted ? '🔇' : '🔊';
    btn.classList.toggle('off', muted);
    btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
    btn.setAttribute('aria-label', muted ? '효과음 켜기' : '효과음 끄기');
  }

  window.addEventListener('DOMContentLoaded', function () {
    renderStart();
    bindStart();
    bind();

    // ☁️ 동기화가 화면을 다시 그릴 수 있게 앱 상태를 열어 둔다
    //   (플레이 중에는 이 기기의 인생을 지키는 판단에 쓰인다)
    window.LifeApp = {
      isPlaying: function () { return !!state && screenName === 'play'; },
      screen: function () { return screenName; }
    };
    window.addEventListener('life-sim-sync-applied', function () {
      if (screenName === 'start') renderStart();
      else if (screenName === 'hall') renderHall();
      if (window.CloudSync) window.CloudSync.renderAll();
    });
    window.addEventListener('life-sim-sync-signed-in', function () {
      renderStart();
      toast('☁️ Google 계정과 연결했습니다');
    });
    if (window.CloudSync) window.CloudSync.start();

    // 🏆 전체 랭킹 — 엔딩에서 기록이 생기면(로그인 + 자동 등록 켜짐) 서버로 올린다
    if (window.Leaderboard) window.Leaderboard.start();
    window.addEventListener('life-sim-leaderboard-submitted', function (e) {
      var d = e.detail || {};
      toast('🏆 전체 랭킹에 올렸습니다' + (d.rank ? ' · ' + d.rank + '위' : ''));
      if (hallView === 'global' && screenName === 'hall') { lgData = null; loadGlobal(); }
    });
    window.addEventListener('life-sim-leaderboard-failed', function (e) {
      if (lgToastOnce) return;
      lgToastOnce = true;
      var d = e.detail || {};
      toast('전체 랭킹 등록 실패 · ' + (d.error || '잠시 뒤 다시 시도해 주세요'));
    });

    // 저장된 게임이 있으면 바로 이어서 열지 않고 시작 화면에서 선택하게 둔다.
  });
})();
