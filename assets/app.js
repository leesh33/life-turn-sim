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

  var LABEL = { hp: '체력', mental: '멘탈', charm: '매력', asset: '재산', social: '호감도' };

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
  }

  function startGame() {
    var name = $('nameInput').value.trim() || '상훈';
    state = Life.newGame({ name: name, gender: pickedGender, startAge: pickedAge });
    Life.save(state);
    showScreen('play');
    renderGame();
    toast('인생이 시작되었습니다');
  }

  /* ── 화면 전환 ── */
  function showScreen(name) {
    ['start', 'play', 'ending', 'grad', 'hall'].forEach(function (n) {
      var el = $('screen-' + n);
      if (el) el.classList.toggle('active', n === name);
    });
    var st = $('screen-' + name);
    if (st) st.scrollTop = 0;
    screenName = name;
  }

  /* ── 플레이 화면 ── */
  function renderGame() {
    if (!state) return;
    $('whoName').textContent = state.name;
    $('ageLabel').textContent = state.age + '세';
    $('dayLabel').textContent = state.month + '개월차';
    $('logCount').textContent = state.history.length;
    renderStats();
    renderEvent(false);
    renderRewards();
    $('advanceBtn').disabled = !(state.current && state.current.chosen !== null);
  }

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

  function renderEvent(animate) {
    var ev = Life.currentEvent(state);
    if (!ev) return;
    var stage = Life.stageOf(state.age);
    var chosen = state.current ? state.current.chosen : null;
    var isChosen = chosen !== null && chosen !== undefined;

    var badges = '<span class="badge age">' + state.age + '세 · ' + state.month + '개월차</span>';
    if (ev.milestone) badges += '<span class="badge milestone">★ 마일스톤</span>';
    badges += '<span class="badge place">' + esc(ev.place || stage.name) + '</span>';

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
        '<p class="next-hint">아래 버튼으로 다음 달로 넘어가세요</p>' +
        '</div>';
    }

    $('stageInner').innerHTML =
      '<article class="event-card' + (animate ? '' : ' noanim') + '" id="eventCard">' +
      '<div class="card-badges">' + badges + '</div>' +
      '<h2 class="card-title">' + esc(title) + '</h2>' +
      '<p class="card-text">' + esc(text).replace(/\n/g, '<br>') + '</p>' +
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

  function stageNote(stage) {
    var lifePct = Math.min(100, Math.max(1, ((state.age - 1 + (state.month - 1) / 12) / (Life.END_AGE - 1)) * 100));
    return '<div class="stage-note">' +
      '<span>' + stage.emoji + ' ' + esc(stage.name) + '</span>' +
      '<span class="sn-bar"><i style="width:' + lifePct.toFixed(1) + '%"></i></span>' +
      '<span>' + state.age + ' / ' + Life.END_AGE + '세</span>' +
      '</div>';
  }

  function pickChoice(index) {
    var res = Life.choose(state, index);
    if (!res) return;
    Life.save(state);
    renderStats();
    pulseStats(res.deltas);
    renderEvent(true);
    renderRewards();
    $('advanceBtn').disabled = false;
    $('logCount').textContent = state.history.length;
    if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) {} }
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
    var r = Life.rewardState(state);
    var ok = kind === 'undo' ? r.canUndo : kind === 'reroll' ? r.canReroll : r.canHeal;
    if (!ok) { toast(REWARD_HINT[kind] || '지금은 쓸 수 없어요'); return; }
    if (typeof window.showRewardedAd !== 'function') { toast('광고 모듈을 찾지 못했습니다'); return; }
    window.showRewardedAd(kind, applyReward);
  }

  function applyReward(kind) {
    if (!state) return;
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
      renderStats();
      renderRewards();
      pulseStats({ hp: 1, mental: 1 });
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
    if (!state || !state.current || state.current.chosen === null) return;
    var res = Life.advance(state);
    if (!res.ok) return;
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
      renderEvent(true);
      renderRewards();
      $('advanceBtn').disabled = true;
      $('stage').scrollTop = 0;
      if (res.birthday) toast('🎂 ' + state.age + '세가 되었습니다');
    }, 250);
  }

  /* ── 인생 일지 ── */
  function openSheet() {
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
          '<div class="tl-when">' + item.age + '세 · ' + item.month + '개월차' + (item.place ? ' · ' + esc(item.place) : '') + '</div>' +
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
    var recs = Life.hallRecords();
    var mine = recs.filter(function (r) { return r.mine; });
    var bestMine = Life.hallBestMine();
    var list = hallTab === 'all' ? Life.hallSorted(recs) : Life.hallOf(hallTab);

    $('hallSub').textContent = '졸업·완주 기록 ' + recs.length + '건 · 내 기록 ' + mine.length + '건';

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
          '<div class="hr-stats">체력 ' + num(r.stats.hp) + ' · 멘탈 ' + num(r.stats.mental) +
            ' · 매력 ' + num(r.stats.charm) + ' · 호감도 ' + num(r.stats.social) +
            ' · 재산 ' + esc(Life.formatAsset(r.stats.asset)) + '</div>' +
        '</div>' +
        '<div class="hr-score"><b>' + scoreText(r.score) + '</b>' +
          '<i class="g-' + String(r.grade || 'B').toLowerCase() + '">' + esc(r.grade || '-') + '</i>' +
          '<span>' + (r.top ? '상위 ' + r.top + '%' : '완주') + '</span></div>' +
        '</div>';
    }).join('');

    $('hallBody').innerHTML = pin + rows +
      '<p class="hall-fine">기본 기록은 게임 밸런스 시뮬레이션에서 뽑은 가상 인물의 기록입니다.<br>' +
      '내 기록은 이 브라우저에만 저장됩니다.</p>';
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

  function bindHall() {
    $('hallBack').addEventListener('click', closeHall);
    $('hallTabs').addEventListener('click', function (e) {
      var btn = e.target.closest('.hall-tab');
      if (!btn) return;
      hallTab = btn.dataset.tab;
      renderHall();
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
        '<h2 class="end-title">' + esc(sum.title) + '</h2>' +
        '<p class="end-summary">' + esc(sum.oneLiner) + '</p>' +
        '<div class="end-stats">' +
          '<div class="end-stat"><div class="es-label">마지막 나이</div><div class="es-val">' + sum.finalAge + '세</div></div>' +
          '<div class="end-stat"><div class="es-label">남은 재산</div><div class="es-val">' + esc(Life.formatAsset(sum.stats.asset)) + '</div></div>' +
          '<div class="end-stat"><div class="es-label">체력 / 멘탈</div><div class="es-val">' + Math.round(sum.stats.hp) + ' / ' + Math.round(sum.stats.mental) + '</div></div>' +
          '<div class="end-stat"><div class="es-label">매력 / 호감도</div><div class="es-val">' + Math.round(sum.stats.charm) + ' / ' + Math.round(sum.stats.social) + '</div></div>' +
          '<div class="end-stat wide"><div class="es-label">쌓인 선택</div><div class="es-val">' + sum.turns + '개</div></div>' +
        '</div>' +
        '<div class="end-brand">🎲 인생 한 턴</div>' +
      '</div>' +
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
      '</div>';

    $('endingScroll').innerHTML = html;
    showScreen('ending');

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
          '<div class="end-stat wide"><div class="es-label">명예의 전당 순위</div><div class="es-val">' +
            hall.count + '명 중 ' + hall.rank + '위 · 상위 ' + (info.total.top || 50) + '%</div></div>' +
        '</div>' +
        '<div class="end-brand">🎲 인생 한 턴</div>' +
      '</div>' +
      recallCard(recall, '그 시절의 나에게', info.age + '세 · ' + def.short) +
      (highlights ? '<div class="end-section-title">인생 하이라이트</div><div class="highlights">' + highlights + '</div>' : '') +
      (tags ? '<div class="end-section-title">남은 것들</div><div class="tag-cloud">' + tags + '</div>' : '') +
      '<div class="end-actions">' +
        '<button class="btn primary" id="endRestart">새 인생 시작하기</button>' +
        '<button class="btn log" id="endLog">📖 일지</button>' +
      '</div>' +
      '<div class="end-actions second">' +
        '<button class="btn log" id="endHall">🏆 명예의 전당</button>' +
      '</div>';

    $('endingScroll').innerHTML = html;
    showScreen('ending');
    $('endRestart').addEventListener('click', resetGame);
    $('endLog').addEventListener('click', function () {
      if (!state.history.length) return;
      openSheet();
    });
    $('endHall').addEventListener('click', function () { openHall('ending'); });
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

    ['rewardUndo', 'rewardReroll', 'rewardHeal'].forEach(function (id) {
      var btn = $(id);
      if (!btn) return;
      btn.addEventListener('click', function () { requestReward(btn.dataset.reason); });
    });
    initAdZone();
    bindHall();
  }

  window.addEventListener('DOMContentLoaded', function () {
    renderStart();
    bindStart();
    bind();
    // 저장된 게임이 있으면 바로 이어서 열지 않고 시작 화면에서 선택하게 둔다.
  });
})();
