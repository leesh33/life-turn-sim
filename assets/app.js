/* ─────────────────────────────────────────────
   app.js — 화면 렌더링과 조작
   ───────────────────────────────────────────── */
(function () {
  'use strict';

  var Life = window.Life;
  var state = null;
  var pickedAge = 1;
  var pickedGender = '남';

  var LABEL = { hp: '체력', mental: '멘탈', charm: '매력', asset: '재산', social: '호감도' };

  function $(id) { return document.getElementById(id); }
  function h(str) { return String(str == null ? '' : str); }
  function esc(str) {
    return h(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
      $('resumeMeta').textContent = saved.history.length + '개의 선택 · ' + (saved.ended ? '엔딩' : '진행 중');
    } else {
      card.hidden = true;
    }
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
      if (state.ended) { renderEnding(true); return; }
      showScreen('play');
      renderGame();
    });
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
    ['start', 'play', 'ending'].forEach(function (n) {
      $('screen-' + n).classList.toggle('active', n === name);
    });
    var st = $('screen-' + name);
    if (st) st.scrollTop = 0;
  }

  /* ── 플레이 화면 ── */
  function renderGame() {
    if (!state) return;
    $('whoName').textContent = state.name;
    $('ageLabel').textContent = state.age + '세';
    $('dayLabel').textContent = state.day + '일차';
    $('logCount').textContent = state.history.length;
    renderStats();
    renderEvent(false);
    $('advanceBtn').disabled = !(state.current && state.current.chosen !== null);
  }

  function renderStats() {
    var box = $('stats');
    box.innerHTML = Life.STATS.map(function (st) {
      var v = state.stats[st.key];
      var pct = Life.statPct(st.key, v);
      var cls = st.key === 'asset' && v < 0 ? ' style="background:#c2413a"' : '';
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

    var badges = '<span class="badge age">' + state.age + '세 · ' + state.day + '일차</span>';
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
        '<p class="next-hint">아래 버튼으로 다음 30일을 진행하세요</p>' +
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
    var lifePct = Math.min(100, Math.max(1, ((state.age - 1 + (state.day - 1) / 360) / (Life.END_AGE - 1)) * 100));
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
    $('advanceBtn').disabled = false;
    $('logCount').textContent = state.history.length;
    if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) {} }
  }

  function timewarp() {
    var node = document.querySelector('.timewarp');
    if (!node) {
      node = document.createElement('div');
      node.className = 'timewarp';
      node.innerHTML = '<span>30일이 지났습니다</span>';
      $('app').appendChild(node);
    }
    node.classList.remove('run');
    void node.offsetWidth;
    node.classList.add('run');
  }

  function advance() {
    if (!state || !state.current || state.current.chosen === null) return;
    var prevAge = state.age;
    var res = Life.advance(state);
    if (!res.ok) return;
    Life.save(state);

    if (res.ended) { renderEnding(true); return; }

    timewarp();
    var card = $('eventCard');
    if (card) card.classList.add('leaving');

    setTimeout(function () {
      $('ageLabel').textContent = state.age + '세';
      $('dayLabel').textContent = state.day + '일차';
      $('logCount').textContent = state.history.length;
      renderStats();
      renderEvent(true);
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
          '<div class="tl-when">' + item.age + '세 · ' + item.day + '일차' + (item.place ? ' · ' + esc(item.place) : '') + '</div>' +
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

  /* ── 엔딩 / 인생 요약 ── */
  function renderEnding(isFinal) {
    var sum = Life.summary(state);
    var gradeClass = sum.grade.toLowerCase();

    var highlights = sum.highlights.map(function (hl) {
      return '<div class="highlight">' +
        '<div class="h-when">' + hl.age + '세 · ' + hl.day + '일차 · ' + esc(hl.place || '') + '</div>' +
        '<div class="h-title">' + esc(hl.title) + '</div>' +
        '<div class="h-text">' + esc(hl.result) + '</div>' +
        '</div>';
    }).join('');

    var tags = sum.tags.map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('');

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
      '</div>' +
      (highlights ? '<div class="end-section-title">인생 하이라이트</div><div class="highlights">' + highlights + '</div>' : '') +
      (tags ? '<div class="end-section-title">남은 것들</div><div class="tag-cloud">' + tags + '</div>' : '') +
      '<div class="end-actions">' +
        (isFinal
          ? '<button class="btn primary" id="endRestart">새 인생 시작하기</button>'
          : '<button class="btn primary" id="endContinue">계속 살기 →</button>') +
        '<button class="btn log" id="endLog">📖 일지</button>' +
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
  }

  window.addEventListener('DOMContentLoaded', function () {
    renderStart();
    bindStart();
    bind();
    // 저장된 게임이 있으면 바로 이어서 열지 않고 시작 화면에서 선택하게 둔다.
  });
})();
