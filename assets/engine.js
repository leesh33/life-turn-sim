/* ─────────────────────────────────────────────
   engine.js — 게임 상태 · 이벤트 선택 · 스탯 · 저장 · 엔딩 요약
   (빌드 도구 없이 동작하는 순수 브라우저 스크립트)
   ───────────────────────────────────────────── */
(function (global) {
  'use strict';

  var SAVE_KEY = 'lifeTurnSim.save.v1';
  var SAVE_VERSION = 2;      // v1(일차 단위) → v2(개월차 단위)
  var END_AGE = 80;          // 이 나이를 넘기면 인생 요약(엔딩)
  var MONTHS = 12;           // 한 살 = 12개월차
  var LAST_MONTH = 12;       // 한 살의 마지막 이벤트 개월차

  var STAGES = [
    { id: 'infancy',    name: '유아기',   emoji: '🍼', from: 1,  to: 7,  accent: '#E0653C' },
    { id: 'elementary', name: '초등학교', emoji: '🎒', from: 8,  to: 13, accent: '#3C7BD9' },
    { id: 'middle',     name: '중학교',   emoji: '📐', from: 14, to: 16, accent: '#7C5CD6' },
    { id: 'high',       name: '고등학교', emoji: '📚', from: 17, to: 19, accent: '#2C8C7A' },
    { id: 'college',    name: '대학교',   emoji: '🎓', from: 20, to: 24, accent: '#C9871F' },
    { id: 'work',       name: '사회생활', emoji: '💼', from: 25, to: 34, accent: '#3B5BA5' },
    { id: 'family',     name: '가정',     emoji: '🏠', from: 35, to: 49, accent: '#C2547A' },
    { id: 'midlife',    name: '중년',     emoji: '🌗', from: 50, to: 64, accent: '#5B6B7C' },
    { id: 'senior',     name: '노년',     emoji: '🍂', from: 65, to: 80, accent: '#8A7355' }
  ];

  var START_AGES = [
    { age: 1,  label: '출산',            emoji: '👶', wide: 0, desc: '태어난 날부터' },
    { age: 8,  label: '초등학교 입학',   emoji: '🎒', wide: 0, desc: '첫 책가방' },
    { age: 14, label: '중학교 입학',     emoji: '📐', wide: 0, desc: '새 교복' },
    { age: 17, label: '고등학교 입학',   emoji: '📚', wide: 0, desc: '3년의 압박' },
    { age: 20, label: '대학교 입학',     emoji: '🎓', wide: 0, desc: '첫 자유' },
    { age: 25, label: '취직',            emoji: '💼', wide: 0, desc: '첫 사원증' },
    { age: 35, label: '결혼',            emoji: '💍', wide: 1, desc: '두 사람의 시작' }
  ];

  var STATS = [
    { key: 'hp',     label: '체력' },
    { key: 'mental', label: '멘탈' },
    { key: 'charm',  label: '매력' },
    { key: 'asset',  label: '재산' },
    { key: 'social', label: '호감도' }
  ];

  // 시작 스탯은 50~60대 — 한두 번의 선택으로 100이 되지 않게 낮게 잡는다
  var PRESETS = {
    1:  { stats: { hp: 60, mental: 62, charm: 52, social: 58, asset: 0 },
          flags: {} },
    8:  { stats: { hp: 62, mental: 58, charm: 54, social: 56, asset: 5 },
          flags: { 초등학생: true } },
    14: { stats: { hp: 64, mental: 54, charm: 57, social: 54, asset: 12 },
          flags: { 중학생: true } },
    17: { stats: { hp: 62, mental: 51, charm: 59, social: 54, asset: 20 },
          flags: { 고등학생: true } },
    20: { stats: { hp: 61, mental: 55, charm: 60, social: 57, asset: 60 },
          flags: { 대학생: true, 문과: true } },
    25: { stats: { hp: 59, mental: 54, charm: 59, social: 58, asset: 850 },
          flags: { 대졸: true, 문과: true, 직업: '대기업 기획자' } },
    35: { stats: { hp: 56, mental: 55, charm: 58, social: 60, asset: 9500 },
          flags: { 대졸: true, 문과: true, 직업: '대기업 기획자' } }
  };

  /* ── 유틸 ── */
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function rand(s) {
    var t = (s.rngState = (s.rngState + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function randInt(s, min, max) { return min + Math.floor(rand(s) * (max - min + 1)); }
  function pick(s, arr) { return arr[Math.floor(rand(s) * arr.length)]; }

  function stageOf(age) {
    for (var i = 0; i < STAGES.length; i++) {
      if (age >= STAGES[i].from && age <= STAGES[i].to) return STAGES[i];
    }
    return age < 1 ? STAGES[0] : STAGES[STAGES.length - 1];
  }

  function formatAsset(v) {
    var n = Math.round(v);
    if (!n) return '0원';
    var neg = n < 0;
    n = Math.abs(n);
    var str;
    if (n >= 10000) {
      var eok = Math.floor(n / 10000), man = n % 10000;
      str = eok + '억' + (man ? ' ' + man.toLocaleString('ko-KR') : '') + '만원';
    } else {
      str = n.toLocaleString('ko-KR') + '만원';
    }
    return (neg ? '-' : '') + str;
  }

  function statPct(key, v) {
    if (key === 'asset') {
      if (v <= 0) return 3;
      return clamp((Math.log10(v + 1) / 4.6) * 100, 4, 100);
    }
    return clamp(v, 0, 100);
  }

  // 상단 상태바용 짧은 재산 표기
  function compactAsset(v) {
    var n = Math.round(v);
    if (!n) return '0원';
    var sign = n < 0 ? '-' : '';
    var abs = Math.abs(n);
    if (abs >= 10000) return sign + (abs / 10000).toFixed(abs >= 100000 ? 0 : 1) + '억';
    if (abs >= 1000) return sign + (abs / 1000).toFixed(1) + '천만';
    return sign + abs.toLocaleString('ko-KR') + '만';
  }

  function displayStat(key, v) {
    if (key === 'asset') return compactAsset(v);
    return String(Math.round(v));
  }

  /* ── 이벤트 접근 ── */
  function allEvents() {
    return (global.LIFE_EVENTS || []).filter(function (e) { return e && e.id; });
  }
  var _index = null, _indexLen = -1;
  function byId(id) {
    var list = allEvents();
    if (!_index || _indexLen !== list.length) {
      _index = {};
      for (var i = 0; i < list.length; i++) _index[list[i].id] = list[i];
      _indexLen = list.length;
    }
    return _index[id] || null;
  }

  function matchesAt(ev, age, month) {
    if (!ev.at) return false;
    var list = Array.isArray(ev.at[0]) ? ev.at : [ev.at];
    for (var i = 0; i < list.length; i++) {
      if (list[i][0] === age && list[i][1] === month) return true;
    }
    return false;
  }

  // 나이 고증: minAge/maxAge 밖이면 아예 후보에서 뺀다 (새벽 수유가 3세에 나오지 않게)
  function ageOk(ev, age) {
    if (ev.minAge !== undefined && ev.minAge !== null && age < ev.minAge) return false;
    if (ev.maxAge !== undefined && ev.maxAge !== null && age > ev.maxAge) return false;
    return true;
  }

  function passes(ev, s) {
    if (!ageOk(ev, s.age)) return false;
    if (!ev.when) return true;
    try { return !!ev.when(s); } catch (err) { return false; }
  }

  function used(s, id) { return s.used.indexOf(id) !== -1; }

  function weightedPick(s, list) {
    var total = 0, i;
    for (i = 0; i < list.length; i++) total += (list[i].weight || 1);
    var r = rand(s) * total;
    for (i = 0; i < list.length; i++) {
      r -= (list[i].weight || 1);
      if (r <= 0) return list[i];
    }
    return list[list.length - 1];
  }

  var GENERIC = {
    infancy: [
      { title: '평범한 하루', text: '딱히 사건은 없었습니다. 낮잠을 자고, 밥을 먹고, 또 잤습니다. 이런 날이 쌓여 한 살이 됩니다.', place: '일상' },
      { title: '또 하루', text: '낮에는 놀고 밤에는 자고. 부모님은 내가 하루가 다르게 큰다고 합니다.', place: '일상' },
      { title: '조용한 한 달', text: '별일 없이 한 달이 지나갔습니다. 아무 일 없는 게 제일 좋은 일이라는 말도 있죠.', place: '일상' }
    ],
    school: [
      { title: '지나간 한 달', text: '학원, 학교, 숙제, 잠. 달력이 한 장 넘어갔는데 기억나는 건 별로 없습니다.', place: '일상' },
      { title: '시험 기간', text: '책상을 정리하고 계획표를 세웠습니다. 계획표의 절반은 지켜졌습니다.', place: '일상' },
      { title: '아무 일 없던 달', text: '친구들과 웃고, 선생님께 혼나고, 그렇게 한 달이 지나갔습니다.', place: '일상' }
    ],
    adult: [
      { title: '평범한 한 달', text: '출근하고, 밥 먹고, 집에 오고. 통장 잔고는 조금 바뀌고, 마음은 조금 닳았습니다.', place: '일상' },
      { title: '숨 가쁜 한 달', text: '일정은 빽빽했는데 남은 건 피로뿐입니다. 이런 달도 인생입니다.', place: '일상' },
      { title: '조용한 달', text: '별일 없이 흘러갔습니다. 그런 달이 있어야 다음 달을 견딥니다.', place: '일상' }
    ],
    late: [
      { title: '느린 한 달', text: '아침에 일어나 걷고, 밥을 먹고, 누웠습니다. 요즘은 시간이 물처럼 흐릅니다.', place: '일상' },
      { title: '한 달이 지나고', text: 'TV를 켜두고 졸았습니다. 뉴스가 낯선 이름들로 채워져 있습니다.', place: '일상' },
      { title: '익숙한 하루', text: '약 먹을 시간을 세 번 확인했습니다. 익숙해지는 것들이 늘어납니다.', place: '일상' }
    ]
  };

  // 일상 이벤트의 선택지도 '한쪽이 오르면 한쪽이 빠지는' 맞바꿈으로 둔다
  var GENERIC_CHOICES = {
    infancy: [
      { label: '그냥 잔다', result: '자는 동안 몸이 자랐습니다. 오늘 하루는 아무것도 기억나지 않습니다.', effects: { hp: 2, mental: -1 } },
      { label: '부모님을 부른다', result: '안아 올려졌습니다. 사람 손이 좋다는 걸 몸으로 압니다.', effects: { social: 2, hp: -1 } },
      { label: '혼자 놀잇감을 만진다', result: '한 시간을 뒤적였습니다. 세상은 만져지는 것이라는 걸 알았습니다.', effects: { mental: 1, social: -1 } }
    ],
    school: [
      { label: '숙제부터 끝낸다', result: '밤 11시에 끝냈습니다. 마음은 편하지만 몸이 무겁습니다.', effects: { mental: 1, hp: -1 } },
      { label: '친구들과 어울린다', result: '웃다가 집에 왔습니다. 숙제는 내일의 나에게 맡깁니다.', effects: { social: 2, mental: -1 } },
      { label: '일찍 자고 푹 쉰다', result: '열 시간을 잤습니다. 다음 날 아무도 나를 기억하지 않습니다.', effects: { hp: 2, social: -1 } }
    ],
    adult: [
      { label: '일단 버틴다', result: '해야 할 일을 해냈습니다. 대신 몸이 하루만큼 낡았습니다.', effects: { mental: 1, hp: -1 } },
      { label: '사람을 챙긴다', result: '점심을 같이 먹고 커피를 샀습니다. 집에 오니 내 일은 그대로입니다.', effects: { social: 2, mental: -1 } },
      { label: '몸을 먼저 챙긴다', result: '일찍 누웠습니다. 약속 하나를 미뤘습니다.', effects: { hp: 2, social: -1 } }
    ],
    late: [
      { label: '조용히 보낸다', result: '아무 일도 없는 하루. 그런 하루가 요즘 제일 좋습니다.', effects: { mental: 1, hp: -1 } },
      { label: '이웃과 마주 앉는다', result: '한 시간을 이야기했습니다. 돌아와서는 조금 피곤합니다.', effects: { social: 2, hp: -1 } },
      { label: '몸을 돌본다', result: '스트레칭을 하고 일찍 잤습니다. 오늘은 아무도 만나지 않았습니다.', effects: { hp: 2, social: -1 } }
    ]
  };

  function genericEvent(s) {
    var stage = stageOf(s.age);
    var bucketId = stage.id === 'infancy' ? 'infancy'
      : (s.age <= 24 ? 'school' : (s.age <= 64 ? 'adult' : 'late'));
    var bucket = GENERIC[bucketId];
    var g = bucket[randInt(s, 0, bucket.length - 1)];
    return {
      id: '__generic_' + s.age + '_' + s.month + '_' + s.turn,
      stage: stage.id,
      place: g.place,
      title: g.title,
      text: g.text,
      choices: GENERIC_CHOICES[bucketId],
      __generic: true
    };
  }

  /* ── 이벤트 선택 ── */
  function pickEvent(s) {
    var list = allEvents(), i, ev;

    // 1) 마일스톤 (해당 나이·개월차 고정 이벤트)
    var milestones = [];
    for (i = 0; i < list.length; i++) {
      ev = list[i];
      if (matchesAt(ev, s.age, s.month) && !used(s, ev.id) && passes(ev, s)) milestones.push(ev);
    }
    if (milestones.length) return weightedPick(s, milestones);

    // 2) 예약된 후속 이벤트 (앞선 선택의 결과)
    while (s.queue && s.queue.length) {
      var qid = s.queue.shift();
      ev = byId(qid);
      if (ev && passes(ev, s)) return ev;
    }

    // 3) 돌발 이벤트 (가끔)
    var anyPool = [];
    for (i = 0; i < list.length; i++) {
      ev = list[i];
      if (ev.stage === 'any' && !ev.at && passes(ev, s) && !used(s, ev.id)) anyPool.push(ev);
    }
    if (anyPool.length && rand(s) < (s.stats.mental <= 30 ? 0.55 : 0.22)) return weightedPick(s, anyPool);

    // 4) 해당 생애 단계의 아직 안 쓴 이벤트
    var stage = stageOf(s.age).id;
    var fresh = [], repeatables = [], all = [];
    for (i = 0; i < list.length; i++) {
      ev = list[i];
      if (ev.at || ev.stage === 'any') continue;
      if (ev.stage !== stage) continue;
      if (!passes(ev, s)) continue;
      all.push(ev);
      if (!used(s, ev.id)) fresh.push(ev);
      else if (ev.repeatable) {
        var last = s.lastSeen[ev.id];
        if (last === undefined || s.turn - last >= 5) repeatables.push(ev);
      }
    }
    if (fresh.length) return weightedPick(s, fresh);
    if (repeatables.length) return weightedPick(s, repeatables);
    return genericEvent(s);
  }

  /* ── 보상형 광고(프로토타입) ──
     되돌리기·다시 뽑기·긴급 회복의 '효과'만 엔진에 둔다.
     광고를 보여주는 부분은 assets/ads.js 의 showRewardedAd 훅이 맡는다. */
  var REWARD = {
    healAmount: 12,      // 긴급 회복량 (체력·멘탈 각각)
    healLimit: 3,        // 한 판에 회복 최대 횟수
    healThreshold: 30    // 체력 또는 멘탈이 이 값 이하일 때만 활성화
  };

  function canUndo(s) {
    return !!(s && s.undo && s.history && s.history.length);
  }

  function snapshotForUndo(s) {
    return {
      age: s.age, month: s.month, turn: s.turn, ended: s.ended,
      stats: Object.assign({}, s.stats),
      flags: Object.assign({}, s.flags),
      used: s.used.slice(),
      lastSeen: Object.assign({}, s.lastSeen),
      queue: s.queue.slice(),
      historyLen: s.history.length,
      current: s.current ? Object.assign({}, s.current) : null,
      rngState: s.rngState
    };
  }

  // 직전 선택을 되돌린다 (선택 전 상태로 복원)
  function undo(s) {
    if (!canUndo(s)) return null;
    var snap = s.undo;
    s.undo = null;
    s.age = snap.age; s.month = snap.month; s.turn = snap.turn; s.ended = false;
    s.stats = Object.assign({}, snap.stats);
    s.flags = Object.assign({}, snap.flags);
    s.used = snap.used.slice();
    s.lastSeen = Object.assign({}, snap.lastSeen);
    s.queue = snap.queue.slice();
    s.history = s.history.slice(0, snap.historyLen);
    s.current = snap.current ? Object.assign({}, snap.current) : null;
    s.rngState = snap.rngState;
    return s.current ? currentEvent(s) : null;
  }

  function canReroll(s) {
    return !!(s && !s.ended && s.current && s.current.chosen === null);
  }

  // 현재 이벤트를 다른 이벤트로 바꾼다
  function reroll(s) {
    if (!canReroll(s)) return null;
    var prev = currentEvent(s);
    var ev = pickEvent(s);
    if (!ev || (prev && ev.id === prev.id)) return null;
    s.current = { eventId: ev.id, chosen: null, event: ev.__generic ? ev : null };
    s.used.push(ev.id);
    s.lastSeen[ev.id] = s.turn;
    if (!s.rewards) s.rewards = { heal: 0, reroll: 0, undo: 0 };
    s.rewards.reroll += 1;
    return ev;
  }

  function canHeal(s) {
    if (!s || s.ended || !s.stats) return false;
    if (!s.rewards) s.rewards = { heal: 0, reroll: 0, undo: 0 };
    if (s.rewards.heal >= REWARD.healLimit) return false;
    return Math.min(s.stats.hp, s.stats.mental) <= REWARD.healThreshold;
  }

  // 위기 탈출: 체력·멘탈을 조금 끌어올린다
  function heal(s) {
    if (!canHeal(s)) return null;
    s.rewards.heal += 1;
    var before = { hp: s.stats.hp, mental: s.stats.mental };
    s.stats.hp = clamp(s.stats.hp + REWARD.healAmount, 0, 100);
    s.stats.mental = clamp(s.stats.mental + REWARD.healAmount, 0, 100);
    return {
      hp: Math.round(s.stats.hp - before.hp),
      mental: Math.round(s.stats.mental - before.mental),
      left: REWARD.healLimit - s.rewards.heal
    };
  }

  function rewardState(s) {
    if (s && !s.rewards) s.rewards = { heal: 0, reroll: 0, undo: 0 };
    return {
      canUndo: canUndo(s),
      canReroll: canReroll(s),
      canHeal: canHeal(s),
      healLeft: s && s.rewards ? REWARD.healLimit - s.rewards.heal : REWARD.healLimit,
      healAmount: REWARD.healAmount,
      healThreshold: REWARD.healThreshold
    };
  }

  /* ── 상태 생성 ── */
  function newGame(opts) {
    opts = opts || {};
    var startAge = Number(opts.startAge) || 1;
    var preset = PRESETS[startAge] || PRESETS[1];
    var rng = Math.floor(Math.random() * 1e9) + 1;
    var gender = opts.gender === '랜덤' || !opts.gender
      ? (Math.random() < 0.5 ? '남' : '여')
      : opts.gender;

    var s = {
      v: SAVE_VERSION,
      name: (opts.name || '').trim() || '나',
      gender: gender,
      startAge: startAge,
      age: startAge,
      month: 1,
      turn: 0,
      rngState: rng,
      stats: Object.assign({}, preset.stats),
      flags: Object.assign({}, preset.flags),
      used: [],
      lastSeen: {},
      queue: [],
      history: [],
      current: null,
      ended: false,
      undo: null,
      rewards: { heal: 0, reroll: 0, undo: 0 },
      createdAt: Date.now()
    };
    var first = pickEvent(s);
    s.current = { eventId: first.id, chosen: null, event: first.__generic ? first : null };
    s.used.push(first.id);
    s.lastSeen[first.id] = s.turn;
    return s;
  }

  /* ── 선택 처리 ── */
  function resolveEffects(s, spec) {
    var deltas = {};
    if (!spec) return deltas;
    if (typeof spec === 'function') spec = spec(s) || {};
    Object.keys(spec).forEach(function (k) {
      var v = spec[k];
      if (Array.isArray(v)) v = randInt(s, v[0], v[1]);
      if (typeof v !== 'number' || !v) return;
      if (k === 'asset') {
        s.stats.asset = Math.round(s.stats.asset + v);
        deltas.asset = (deltas.asset || 0) + v;
      } else if (s.stats[k] !== undefined) {
        var before = s.stats[k];
        s.stats[k] = clamp(before + v, 0, 100);
        var diff = Math.round(s.stats[k] - before);
        if (diff) deltas[k] = (deltas[k] || 0) + diff;
      }
    });
    return deltas;
  }

  function currentEvent(s) {
    if (!s.current) return null;
    if (s.current.event) return s.current.event;
    var ev = byId(s.current.eventId);
    if (ev) return ev;
    // 저장된 이벤트가 사라진 경우 방어
    var fresh = pickEvent(s);
    s.current = { eventId: fresh.id, chosen: null, event: fresh.__generic ? fresh : null };
    return fresh;
  }

  function choose(s, index) {
    var ev = currentEvent(s);
    if (!ev || s.current.chosen !== null) return null;
    var choice = ev.choices[index];
    if (!choice) return null;

    // 되돌리기를 위해 선택 전 상태를 담아둔다
    s.undo = snapshotForUndo(s);

    // 플래그 먼저 (결과 문구가 플래그를 참조할 수 있음)
    if (choice.set) {
      Object.keys(choice.set).forEach(function (k) { s.flags[k] = choice.set[k]; });
    }
    var deltas = resolveEffects(s, choice.effects);
    if (choice.queue) {
      var q = Array.isArray(choice.queue) ? choice.queue : [choice.queue];
      q.forEach(function (id) { s.queue.push(id); });
    }
    var resultText = typeof choice.result === 'function' ? choice.result(s) : choice.result;

    var entry = {
      turn: s.turn,
      age: s.age,
      month: s.month,
      eventId: ev.id,
      title: typeof ev.title === 'function' ? ev.title(s) : (ev.title || ''),
      situation: typeof ev.text === 'function' ? ev.text(s) : (ev.text || ''),
      place: ev.place || '',
      milestone: !!ev.milestone,
      choice: typeof choice.label === 'function' ? choice.label(s) : choice.label,
      result: resultText || '',
      deltas: deltas
    };
    s.history.push(entry);
    s.current = { eventId: ev.id, chosen: index, result: resultText, deltas: deltas, event: ev.__generic ? ev : null };
    return { entry: entry, deltas: deltas, result: resultText };
  }

  /* ── 자연 변화(생활 소모) ──
     매달(1개월)이 지나면 네 스탯은 각자의 기준선(baseline) 쪽으로 조금씩 당겨진다.
     - 기준선보다 높으면 천천히 빠지고(관리하지 않은 호감도·체력이 그렇다),
     - 기준선보다 낮으면 아주 천천히 회복된다.
     그래서 100을 유지하려면 계속 신경 써야 하고, 한 선택으로 100을 찍어도 오래 못 간다. */
  var DRIFT = {
    hp:     { base: 57, rate: 0.030, age: [[40, -2], [52, -4], [62, -7], [72, -10]] },
    mental: { base: 55, rate: 0.050, age: [[45, -2], [60, -5]] },
    charm:  { base: 53, rate: 0.020, age: [[55, -3], [70, -6]] },
    social: { base: 55, rate: 0.045, age: [[65, -2]] }
  };

  function driftTarget(key, age) {
    var d = DRIFT[key];
    var target = d.base;
    for (var i = 0; i < d.age.length; i++) if (age >= d.age[i][0]) target = d.base + d.age[i][1];
    return target;
  }

  function applyDrift(s) {
    Object.keys(DRIFT).forEach(function (key) {
      var cur = s.stats[key];
      if (cur === undefined) return;
      var target = driftTarget(key, s.age);
      var next = cur + (target - cur) * DRIFT[key].rate;
      s.stats[key] = clamp(next, 0, 100);
    });
  }

  var AGING = [
    { from: 45, hp: 1, mental: 0, charm: 0 },
    { from: 62, hp: 1, mental: 0, charm: 1 },
    { from: 72, hp: 1, mental: 1, charm: 1 }
  ];

  // 생일마다 자연 노화 — 스탯이 저절로 100에 달라붙지 않게
  function applyAging(s) {
    var rule = null;
    for (var i = 0; i < AGING.length; i++) if (s.age >= AGING[i].from) rule = AGING[i];
    if (!rule) return;
    s.stats.hp = clamp(s.stats.hp - rule.hp, 0, 100);
    s.stats.mental = clamp(s.stats.mental - rule.mental, 0, 100);
    s.stats.charm = clamp(s.stats.charm - rule.charm, 0, 100);
  }

  function advance(s) {
    if (!s.current || s.current.chosen === null) return { ok: false };
    if (s.ended) return { ok: false };

    var birthday = false;
    if (s.month >= LAST_MONTH) { s.age += 1; s.month = 1; birthday = true; }
    else { s.month += 1; }
    s.turn += 1;
    applyDrift(s);
    if (birthday) applyAging(s);

    if (s.age > END_AGE) {
      s.ended = true;
      s.current = null;
      return { ok: true, ended: true, birthday: birthday };
    }

    var ev = pickEvent(s);
    s.current = { eventId: ev.id, chosen: null, event: ev.__generic ? ev : null };
    s.used.push(ev.id);
    s.lastSeen[ev.id] = s.turn;
    return { ok: true, ended: false, birthday: birthday, event: ev };
  }

  /* ── 저장 ── */
  function save(s) {
    try { global.localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) {}
  }

  // 예전 저장본(일차 단위 v1)을 개월차 단위(v2)로 옮긴다.
  function dayToMonth(d) {
    if (typeof d !== 'number' || isNaN(d)) return 1;
    if (d === 1) return 1;
    return clamp(Math.round(d / 30) + 1, 1, MONTHS);
  }

  function migrate(s) {
    if (!s) return s;
    if (s.v === SAVE_VERSION && s.month !== undefined) return s;
    if (s.month === undefined) s.month = dayToMonth(s.day);
    s.month = clamp(s.month || 1, 1, MONTHS);
    delete s.day;
    (s.history || []).forEach(function (h) {
      if (h && h.month === undefined) h.month = dayToMonth(h.day);
      if (h) delete h.day;
    });
    if (s.undo && s.undo.month === undefined) {
      s.undo.month = dayToMonth(s.undo.day);
      delete s.undo.day;
    }
    s.v = SAVE_VERSION;
    return s;
  }

  function load() {
    try {
      var raw = global.localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      var s = migrate(JSON.parse(raw));
      if (!s || !s.stats) return null;
      if (!s.ended && !s.current) return null;
      return s;
    } catch (e) { return null; }
  }
  function clear() {
    try { global.localStorage.removeItem(SAVE_KEY); } catch (e) {}
  }

  /* ── 엔딩 / 요약 ── */
  var CAREER_NOUN = {
    '대기업 기획자': 'K-기획자',
    '스타트업 개발자': 'K-개발자',
    '공무원': 'K-공무원',
    '중소기업 사원': 'K-직장인',
    '자영업자': 'K-자영업자',
    '프리랜서': 'K-프리랜서',
    '교사': 'K-교사',
    '의사': 'K-의사',
    '연구원': 'K-연구원',
    '무직': 'K-백수'
  };

  function originPhrase(s) {
    var f = s.flags;
    if (f.우렁찬_아기) return '우렁찬 울음으로 시작해';
    if (f.조용한_아기) return '조용한 아기로 태어나';
    if (f.대식가) return '분유 50ml로 쑥쑥 큰';
    if (f.소식가) return '분유 30ml로 조금씩 큰';
    if (s.startAge >= 25) return '첫 사원증을 달던 날부터';
    if (s.startAge >= 20) return '캠퍼스에서 인생을 시작해';
    if (s.startAge >= 14) return '교복을 입던 날부터';
    if (s.startAge >= 8) return '책가방을 처음 멘 날부터';
    return '평범하게 태어나';
  }

  function modifierPhrase(s) {
    var f = s.flags, st = s.stats;
    if (f.은퇴 && st.asset >= 40000) return '조기 은퇴한';
    if (f.집있음 && f.청약당첨) return '청약 한 방으로 집주인이 된';
    if (f.창업) return '창업의 쓴맛을 본';
    if (f.야근러 && st.mental < 40) return '야근에 인생을 갈아넣은';
    if (f.야근러) return '밤샘을 밥 먹듯 한';
    if ((f.이직횟수 || 0) >= 3) return '회사를 세 번 갈아탄';
    if ((f.자녀수 || 0) >= 2) return '두 아이를 키워낸';
    if ((f.자녀수 || 0) === 1) return '한 아이를 키워낸';
    if (f.주식손실) return '주식에 재산을 맡긴';
    if (st.social >= 80) return '인맥 하나로 먹고사는';
    if (st.mental >= 85) return '멘탈이 강철인';
    if (f.재수생) return '한 번 더 도전한';
    return '평범하게 살아낸';
  }

  function careerPhrase(s) {
    var job = s.flags.직업;
    if (!job) return 'K-청년';
    return CAREER_NOUN[job] || job;
  }

  function buildTitle(s) {
    return originPhrase(s) + ' ' + modifierPhrase(s) + ' ' + careerPhrase(s);
  }

  function gradeOf(s) {
    var st = s.stats;
    var gauge = (st.hp + st.mental + st.charm + st.social) / 4;
    var assetScore = st.asset > 0 ? clamp((Math.log10(st.asset + 1) / 4.6) * 45, 0, 45) : 0;
    var score = gauge * 0.55 + assetScore + (s.history.filter(function (h) { return h.milestone; }).length * 0.3);
    score = clamp(score, 0, 100);
    if (score >= 78) return { grade: 'S', label: '전설의 인생', score: score };
    if (score >= 66) return { grade: 'A', label: '성공한 인생', score: score };
    if (score >= 54) return { grade: 'B', label: '탄탄한 인생', score: score };
    if (score >= 42) return { grade: 'C', label: '평범한 인생', score: score };
    return { grade: 'D', label: '파란만장한 인생', score: score };
  }

  var FLAG_LABEL = {
    '문과': '문과', '이과': '이과', '특목고': '특목고', '재수생': '재수생',
    '수능_명문': '명문대 진학', '수능_지방': '지방대 진학', '전문대': '전문대 진학',
    '군필': '군필', '청약통장': '청약통장', '청약당첨': '청약 당첨', '집있음': '내 집 마련',
    '결혼': '결혼', '자녀': '자녀', '야근러': '야근러', '워라밸러': '워라밸 수호자',
    '주식': '주식투자', '주식손실': '주식 손실', '은퇴': '은퇴', '창업': '창업',
    '유튜버': '유튜브 채널', '승진': '승진', '명퇴': '명예퇴직'
  };

  function summary(s) {
    var g = gradeOf(s);
    var st = s.stats;
    var tags = [];
    Object.keys(FLAG_LABEL).forEach(function (k) {
      if (s.flags[k]) tags.push(FLAG_LABEL[k]);
    });
    if (s.flags.직업) tags.unshift(s.flags.직업);
    if ((s.flags.자녀수 || 0) >= 2) tags.push('자녀 ' + s.flags.자녀수 + '명');

    var highlights = s.history.slice().map(function (h) {
      var impact = 0;
      Object.keys(h.deltas || {}).forEach(function (k) {
        var v = h.deltas[k];
        impact += (k === 'asset') ? Math.min(3, Math.abs(v) / 300) : Math.abs(v);
      });
      return { h: h, impact: impact + (h.milestone ? 4 : 0) };
    }).sort(function (a, b) { return b.impact - a.impact; }).slice(0, 3).map(function (x) { return x.h; });

    var oneLiner = buildOneLiner(s, g);

    return {
      title: buildTitle(s),
      grade: g.grade,
      gradeLabel: g.label,
      score: Math.round(g.score),
      oneLiner: oneLiner,
      finalAge: Math.min(s.age, END_AGE),
      turns: s.history.length,
      stats: st,
      tags: tags.slice(0, 12),
      highlights: highlights,
      career: s.flags.직업 || null
    };
  }

  function buildOneLiner(s, g) {
    var st = s.stats;
    var parts = [];
    parts.push('체력 ' + Math.round(st.hp) + ', 멘탈 ' + Math.round(st.mental) +
      ', 매력 ' + Math.round(st.charm) + ', 호감도 ' + Math.round(st.social));
    parts.push('남은 재산은 ' + formatAsset(st.asset));
    var tail = [];
    if (st.mental <= 30) tail.push('멘탈은 조금 상했지만');
    else if (st.mental >= 80) tail.push('멘탈은 아직 쌩쌩하고');
    if (st.social >= 80) tail.push('주변에 사람이 많습니다');
    else if (st.social <= 35) tail.push('곁은 조용합니다');
    if (st.asset >= 30000) tail.push('통장이 든든합니다');
    else if (st.asset < 0) tail.push('빚이 남아 있습니다');
    var sentence = parts.join(' · ') + '.';
    if (tail.length) sentence += ' ' + tail.join(', ') + '.';
    return sentence;
  }

  /* ── 공개 API ── */
  global.Life = {
    STAGES: STAGES,
    START_AGES: START_AGES,
    STATS: STATS,
    END_AGE: END_AGE,
    MONTHS: MONTHS,
    ageOk: ageOk,
    migrate: migrate,
    stageOf: stageOf,
    newGame: newGame,
    currentEvent: currentEvent,
    choose: choose,
    advance: advance,
    save: save,
    load: load,
    clear: clear,
    summary: summary,
    formatAsset: formatAsset,
    compactAsset: compactAsset,
    displayStat: displayStat,
    statPct: statPct,
    byId: byId,
    allEvents: allEvents,
    rand: rand,
    clamp: clamp,
    REWARD: REWARD,
    rewardState: rewardState,
    canUndo: canUndo,
    undo: undo,
    canReroll: canReroll,
    reroll: reroll,
    canHeal: canHeal,
    heal: heal
  };
})(typeof window !== 'undefined' ? window : globalThis);
