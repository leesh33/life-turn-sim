/* ─────────────────────────────────────────────
   engine.js — 게임 상태 · 이벤트 선택 · 스탯 · 저장 · 엔딩 요약
   (빌드 도구 없이 동작하는 순수 브라우저 스크립트)
   ───────────────────────────────────────────── */
(function (global) {
  'use strict';

  var SAVE_KEY = 'lifeTurnSim.save.v1';
  var SAVE_VERSION = 3;      // v1(일차 단위) → v2(개월차) → v3(졸업 결산·명예의 전당)
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

  /* ── 졸업 결산 체크포인트 ──
     각 나이의 12개월차 턴을 마치고 다음 나이로 넘어가는 순간, 졸업 결산이 열린다.
     7세 유치원 · 13세 초등학교 · 16세 중학교 · 19세 고등학교 · 24세 대학교. */
  var GRADUATIONS = [
    { key: 'kindergarten', age: 7,  emoji: '🐥', name: '유치원 졸업식',   label: '유치원 졸업 엔딩',   short: '유치원 졸업',   stageId: 'infancy',    years: 7, next: '초등학교' },
    { key: 'elementary',   age: 13, emoji: '🎒', name: '초등학교 졸업식', label: '초등학교 졸업 엔딩', short: '초등학교 졸업', stageId: 'elementary', years: 6, next: '중학교' },
    { key: 'middle',       age: 16, emoji: '📐', name: '중학교 졸업식',   label: '중학교 졸업 엔딩',   short: '중학교 졸업',   stageId: 'middle',     years: 3, next: '고등학교' },
    { key: 'high',         age: 19, emoji: '🎓', name: '고등학교 졸업식', label: '고등학교 졸업 엔딩', short: '고등학교 졸업', stageId: 'high',       years: 3, next: '대학교' },
    { key: 'college',      age: 24, emoji: '🏛️', name: '대학교 졸업식',   label: '대학교 졸업 엔딩',   short: '대학교 졸업',   stageId: 'college',    years: 5, next: '사회' }
  ];
  var GRAD_BY_AGE = {}, GRAD_BY_KEY = {};
  GRADUATIONS.forEach(function (g) { GRAD_BY_AGE[g.age] = g; GRAD_BY_KEY[g.key] = g; });

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
  function round1(v) { return Math.round(v * 10) / 10; }
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

  /* ── 조건 판정 도우미 ──
     이벤트는 나이(minAge/maxAge)뿐 아니라 플래그와 스탯으로도 갈래를 나눈다.
       requireFlags : '책벌레' | ['책벌레','동아리_주도'] | { 진로_예술: true, 성별: '여' }
       excludeFlags : 같은 모양. 하나라도 걸리면 후보에서 빠진다.
       minStat/maxStat : { charm: 62 } 처럼 스탯 하한/상한
       weight       : 숫자 또는 function (s) → 숫자 (같은 나이대 안에서도 확률이 달라진다) */
  function flagMatch(cond, flags) {
    if (!cond) return true;
    if (typeof cond === 'string') return !!flags[cond];
    if (Array.isArray(cond)) {
      for (var i = 0; i < cond.length; i++) { if (!flags[cond[i]]) return false; }
      return true;
    }
    if (typeof cond === 'object') {
      for (var k in cond) {
        if (cond[k] === true) { if (!flags[k]) return false; }
        else if (flags[k] !== cond[k]) return false;
      }
      return true;
    }
    return true;
  }

  function flagAny(cond, flags) {
    if (!cond) return false;
    if (typeof cond === 'string') return !!flags[cond];
    if (Array.isArray(cond)) {
      for (var i = 0; i < cond.length; i++) { if (flags[cond[i]]) return true; }
      return false;
    }
    if (typeof cond === 'object') {
      for (var k in cond) {
        if (cond[k] === true) { if (flags[k]) return true; }
        else if (flags[k] === cond[k]) return true;
      }
      return false;
    }
    return false;
  }

  function minStatOk(bounds, stats) {
    if (!bounds) return true;
    for (var k in bounds) {
      var v = stats[k];
      if (v === undefined) return false;
      if (v < bounds[k]) return false;
    }
    return true;
  }

  function maxStatOk(bounds, stats) {
    if (!bounds) return true;
    for (var k in bounds) {
      var v = stats[k];
      if (v === undefined) return false;
      if (v > bounds[k]) return false;
    }
    return true;
  }

  function passes(ev, s) {
    if (!ageOk(ev, s.age)) return false;
    if (ev.requireFlags && !flagMatch(ev.requireFlags, s.flags)) return false;
    if (ev.excludeFlags && flagAny(ev.excludeFlags, s.flags)) return false;
    if (ev.minStat && !minStatOk(ev.minStat, s.stats)) return false;
    if (ev.maxStat && !maxStatOk(ev.maxStat, s.stats)) return false;
    if (!ev.when) return true;
    try { return !!ev.when(s); } catch (err) { return false; }
  }

  function used(s, id) { return s.used.indexOf(id) !== -1; }

  // weight 는 숫자 또는 function(s). 스탯·플래그에 따라 같은 이벤트도 확률이 달라진다.
  function weightOf(ev, s) {
    var w = ev.weight;
    if (typeof w === 'function') { try { w = w(s); } catch (e) { w = 1; } }
    return (typeof w === 'number' && w > 0) ? w : 1;
  }

  function weightedPick(s, list) {
    var total = 0, i;
    for (i = 0; i < list.length; i++) total += weightOf(list[i], s);
    var r = rand(s) * total;
    for (i = 0; i < list.length; i++) {
      r -= weightOf(list[i], s);
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
    if (milestones.length) {
      // 인생의 갈림길(fork)은 같은 달의 다른 마일스톤보다 먼저 내민다
      var forks = [];
      for (i = 0; i < milestones.length; i++) if (milestones[i].fork) forks.push(milestones[i]);
      return weightedPick(s, forks.length ? forks : milestones);
    }

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
    s.grad = null;
    s.endingKind = null;
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
      endingKind: null,
      grad: null,
      hallId: null,
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
  /* ── 선택 효과 ──
     스탯은 0~100이고, 높은 구간에서는 같은 +3도 덜 오른다(고수준 체감).
     그래서 한 번 잘 골랐다고 100에 붙지 않고, 노력이 계속 필요하다. */
  function gainFactor(before) {
    if (before >= 95) return 0.25;
    if (before >= 88) return 0.5;
    if (before >= 80) return 0.8;
    return 1;
  }

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
        var add = v > 0 ? v * gainFactor(before) : v;
        s.stats[k] = clamp(before + add, 0, 100);
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

  /* ── 미니 승부 ──
     선택지에 `mini: { type, win:{result,effects,set}, lose:{...} }` 가 붙으면
     앱이 먼저 미니게임을 열고, 승패(opts.miniWin)를 정한 뒤 엔진에 넘긴다.
     opts 없이 부르면(테스트·자동 진행) 기본 효과만 적용된다. */
  function mergeDeltas(target, extra) {
    Object.keys(extra || {}).forEach(function (k) {
      target[k] = (target[k] || 0) + extra[k];
    });
    return target;
  }

  function branchOf(choice, miniWin) {
    if (!choice || !choice.mini || typeof miniWin !== 'boolean') return null;
    return miniWin ? choice.mini.win : choice.mini.lose;
  }

  // set 은 객체 또는 function(s) → 객체 (결과에 따라 플래그가 갈리는 선택지용)
  function setOf(spec, s) {
    if (!spec) return null;
    if (typeof spec === 'function') {
      try { spec = spec(s) || {}; } catch (e) { return null; }
    }
    return spec;
  }

  function choose(s, index, opts) {
    var ev = currentEvent(s);
    if (!ev || s.current.chosen !== null) return null;
    var choice = ev.choices[index];
    if (!choice) return null;

    var miniWin = opts && typeof opts.miniWin === 'boolean' ? opts.miniWin : null;
    var branch = branchOf(choice, miniWin);

    // 되돌리기를 위해 선택 전 상태를 담아둔다
    s.undo = snapshotForUndo(s);

    // 플래그 먼저 (결과 문구가 플래그를 참조할 수 있음)
    var setSpec = setOf(choice.set, s);
    if (setSpec) {
      Object.keys(setSpec).forEach(function (k) { s.flags[k] = setSpec[k]; });
    }
    var branchSet = branch ? setOf(branch.set, s) : null;
    if (branchSet) {
      Object.keys(branchSet).forEach(function (k) { s.flags[k] = branchSet[k]; });
    }
    var deltas = resolveEffects(s, choice.effects);
    if (branch && branch.effects) mergeDeltas(deltas, resolveEffects(s, branch.effects));
    if (choice.queue) {
      var q = Array.isArray(choice.queue) ? choice.queue : [choice.queue];
      q.forEach(function (id) { s.queue.push(id); });
    }
    var resultText = typeof choice.result === 'function' ? choice.result(s) : choice.result;
    if (branch && branch.result) {
      resultText = typeof branch.result === 'function' ? branch.result(s) : branch.result;
    }

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
      deltas: deltas,
      setKeys: (setSpec ? Object.keys(setSpec) : []).concat(branchSet ? Object.keys(branchSet) : []),
      mini: choice.mini && typeof miniWin === 'boolean' ? { type: choice.mini.type, win: miniWin } : null
    };
    s.history.push(entry);
    s.current = {
      eventId: ev.id, chosen: index, result: resultText, deltas: deltas,
      event: ev.__generic ? ev : null,
      mini: entry.mini
    };
    return { entry: entry, deltas: deltas, result: resultText, mini: entry.mini };
  }

  /* ── 과거의 부메랑 ──
     중·노년 이벤트에 `boomerang: true` 와 `callback: ['플래그', ...]` 를 달면,
     그 플래그를 남긴 **가장 이른 선택**을 기록에서 찾아 돌려준다.
     (예: 12세 4개월차 '그림을 그리기 시작했다') */
  function boomerangOf(s, ev) {
    if (!s || !ev || !ev.boomerang) return null;
    var cond = ev.callback;
    var list = typeof cond === 'string' ? [cond]
      : Array.isArray(cond) ? cond
      : (cond && Array.isArray(cond.flags)) ? cond.flags : [];
    if (!list.length || !Array.isArray(s.history)) return null;
    for (var i = 0; i < s.history.length; i++) {
      var item = s.history[i];
      var keys = item && item.setKeys ? item.setKeys : [];
      for (var j = 0; j < list.length; j++) {
        if (keys.indexOf(list[j]) !== -1) {
          return {
            age: item.age, month: item.month, turn: item.turn,
            title: item.title || '', choice: item.choice || '',
            flag: list[j]
          };
        }
      }
    }
    return null;
  }

  /* ── 자연 변화 ──
     예전에는 달이 바뀔 때마다 네 스탯을 기준선(53~57) 쪽으로 당기는
     '생활 소모(applyDrift)'가 있었다. 아무 선택도 하지 않았는데 매달 스탯이
     깎여 억울하다는 제보가 있어 그 기능은 없앴다.
     - 보통 범위(88 미만)의 스탯은 선택의 효과로만 변한다. 달이 바뀌어도 그대로다.
     - 88 이상의 최고치는 달마다 아주 조금씩 '유지 노력'만큼 내려간다(아래 applyUpkeep).
       이게 없으면 10년쯤 지나 네 스탯이 모두 100에 붙어 버려 선택이 의미를 잃는다.
     - 45세부터는 생일에만 아주 조금씩 자연 노화가 더해진다. */

  var AGING = [
    { from: 45, hp: 1, mental: 0, charm: 0 },
    { from: 62, hp: 1, mental: 0, charm: 1 },
    { from: 72, hp: 1, mental: 1, charm: 1 }
  ];

  // 생일마다 자연 노화 — 45세부터 해가 바뀔 때만 조금씩
  function applyAging(s) {
    var rule = null;
    for (var i = 0; i < AGING.length; i++) if (s.age >= AGING[i].from) rule = AGING[i];
    if (!rule) return;
    s.stats.hp = clamp(s.stats.hp - rule.hp, 0, 100);
    s.stats.mental = clamp(s.stats.mental - rule.mental, 0, 100);
    s.stats.charm = clamp(s.stats.charm - rule.charm, 0, 100);
  }

  /* ── 최고치 유지 ──
     88을 넘긴 스탯만 아주 천천히 88 쪽으로 내려간다.
     (한 달에 최대 1.4 정도 · 보통 스탯에는 전혀 영향이 없다.) */
  var UPKEEP = { from: 88, rate: 0.12 };
  function applyUpkeep(s) {
    ['hp', 'mental', 'charm', 'social'].forEach(function (key) {
      var cur = s.stats[key];
      if (cur === undefined || cur <= UPKEEP.from) return;
      s.stats[key] = clamp(cur + (UPKEEP.from - cur) * UPKEEP.rate, 0, 100);
    });
  }

  function advance(s) {
    if (!s.current || s.current.chosen === null) return { ok: false };
    if (s.ended) return { ok: false };

    var prevAge = s.age;
    var birthday = false;
    if (s.month >= LAST_MONTH) { s.age += 1; s.month = 1; birthday = true; }
    else { s.month += 1; }
    s.turn += 1;
    // 보통 범위의 스탯은 건드리지 않는다 — 선택의 결과만 남긴다
    applyUpkeep(s);
    if (birthday) applyAging(s);

    if (s.age > END_AGE) {
      s.ended = true;
      s.endingKind = 'life';
      s.current = null;
      registerLife(s);
      return { ok: true, ended: true, birthday: birthday, graduation: null };
    }

    // 졸업 결산: 7·13·16·19·24세의 12개월차를 마치고 다음 나이로 넘어간 순간
    var gradDef = birthday ? GRAD_BY_AGE[prevAge] : null;
    if (gradDef) {
      s.grad = { key: gradDef.key, age: prevAge, registered: false, stats: statSnapshot(s.stats) };
    }

    var ev = pickEvent(s);
    s.current = { eventId: ev.id, chosen: null, event: ev.__generic ? ev : null };
    s.used.push(ev.id);
    s.lastSeen[ev.id] = s.turn;
    return { ok: true, ended: false, birthday: birthday, event: ev, graduation: gradDef ? gradDef.key : null };
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
    if (s.grad === undefined) s.grad = null;
    if (s.endingKind === undefined) s.endingKind = null;
    if (s.hallId === undefined) s.hallId = null;
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
    '예술가': 'K-예술가',
    '작가': 'K-작가',
    '요리사': 'K-셰프',
    '프로게이머': 'K-게이머',
    '체육인': 'K-체육인',
    '스타트업 창업자': 'K-창업가',
    '대학원생': 'K-대학원생',
    '군인': 'K-군인',
    '무직': 'K-백수'
  };

  /* ── 인생의 갈래(아키타입) ──
     플레이 중 실제로 남긴 플래그를 보고 엔딩의 얼굴을 고른다.
     위에서부터 먼저 맞는 것을 쓴다(구체적인 갈래가 일반론보다 앞). */
  var ARCHETYPES = [
    { key: 'artist',   emoji: '🎨', label: '평생 붓을 놓지 않은 화가',
      variants: ['팔리지 않아도 계속 그린 화가', '마지막까지 물감 냄새가 나던 화가'],
      signals: ['예술가_길', '작품활동', '전시회', '그림_재능'],
      when: function (f) { return !!(f.예술가_길 && (f.작품활동 || f.전시회)); } },
    { key: 'musician', emoji: '🎻', label: '마지막까지 무대에 선 연주자',
      variants: ['줄이 끊어져도 계속 친 연주자', '연습실 형광등을 그리워한 연주자'],
      signals: ['음악가_길', '밴드', '밴드_활동', '음악_재능'],
      when: function (f) { return !!(f.음악가_길 || f.밴드_활동); } },
    { key: 'writer',   emoji: '✍️', label: '원고지를 마지막까지 채운 작가',
      variants: ['버린 원고가 더 많은 작가', '누군가의 책장에 꽂힌 작가'],
      signals: ['글쓰기_길', '책_출간', '글_습관', '글쓰기_재능'],
      when: function (f) { return !!(f.글쓰기_길 || f.책_출간); } },
    { key: 'researcher', emoji: '🔬', label: '실험실에서 늙은 연구자',
      variants: ['실패한 실험이 더 많았던 연구자', '논문 한 편에 몇 해를 넣은 연구자'],
      signals: ['연구원_길', '학회_논문', '대학원_진학', '과학_영재', '진로_공학'],
      when: function (f) { return !!(f.연구원_길 || f.학회_논문); } },
    { key: 'doctor',   emoji: '🩺', label: '진료실을 지킨 의사',
      variants: ['새벽 호출에 달려간 의사', '환자 이름을 기억하는 의사'],
      signals: ['의사_길', '의대_진학', '진로_의학'],
      when: function (f) { return !!(f.의사_길 || f.의대_진학); } },
    { key: 'teacher',  emoji: '📖', label: '제자 이름을 다 기억하는 교사',
      variants: ['칠판 가루가 묻은 교사', '마지막 졸업생을 보낸 교사'],
      signals: ['교사_길', '교육_길', '진로_교육'],
      when: function (f) { return !!(f.교사_길 || f.교육_길); } },
    { key: 'public',   emoji: '🏛️', label: '민원실 삼십 년의 공직자',
      variants: ['서류 한 장으로 하루를 바꾼 공직자', '정년 날 도장을 선물받은 공직자'],
      signals: ['공무원_길', '공직_길'],
      when: function (f) { return !!(f.공무원_길 || f.공직_길); } },
    { key: 'founder',  emoji: '🚀', label: '회사를 세 번 일으킨 창업가',
      variants: ['문을 닫을 뻔한 가게를 지킨 창업가', '월급날을 한 번도 놓치지 않은 창업가'],
      signals: ['창업_길', '창업', '사업체', '창업준비'],
      when: function (f) { return !!(f.창업_길 || f.창업 || f.사업체) && !f.창업_실패; } },
    { key: 'engineer', emoji: '💻', label: '코드로 세상을 만진 개발자',
      variants: ['밤새 빌드를 돌린 개발자', '내 코드가 나보다 오래 산 개발자'],
      signals: ['개발_길', '코딩', '코딩_전문', '진로_공학'],
      when: function (f) { return !!(f.개발_길 || f.코딩_전문 || f.전공_공학); } },
    { key: 'athlete',  emoji: '🏃', label: '몸으로 살아온 체육인',
      variants: ['기록보다 습관이 오래간 체육인', '무릎이 망가져도 아침마다 뛴 체육인'],
      signals: ['체육_길', '선수_경력', '진로_체육', '축구부'],
      when: function (f) { return !!(f.체육_길 || f.선수_경력 || f.진로_체육); } },
    { key: 'chef',     emoji: '🍳', label: '주방을 지킨 요리사',
      variants: ['새벽 시장에서 하루를 연 요리사', '손등에 화상 자국이 남은 요리사'],
      signals: ['요리_길', '식당_운영', '요리_씨앗'],
      when: function (f) { return !!(f.요리_길 || f.식당_운영); } },
    { key: 'pro',      emoji: '🎮', label: '게임으로 밥 먹고산 사람',
      variants: ['새벽까지 랭크를 올린 사람', '손목이 욱신거리는 프로게이머'],
      signals: ['프로게이머_길', '게임_전문', '게임고수'],
      when: function (f) { return !!(f.프로게이머_길 || f.게임_전문); } },
    { key: 'fisher',   emoji: '🎣', label: '강가에서 하루를 보내는 낚시광',
      variants: ['안개 낀 강가에 앉아 있던 낚시광', '잡은 것보다 버린 시간이 많던 낚시광'],
      signals: ['낚시광', '낚시_취미'],
      when: function (f) { return !!(f.낚시광 || f.낚시_취미); } },
    { key: 'gardener', emoji: '🌱', label: '손에 흙 묻은 정원사',
      variants: ['심은 나무가 자기보다 커진 정원사', '봄마다 새싹을 기다린 정원사'],
      signals: ['정원사', '텃밭'],
      when: function (f) { return !!(f.정원사 || f.텃밭); } },
    { key: 'traveler', emoji: '✈️', label: '지도를 들고 다닌 여행가',
      variants: ['낯선 공항에서 표를 다시 짜던 여행가', '짐을 싸며 버리는 법을 배운 여행가'],
      signals: ['여행가', '세계일주', '유학_경험'],
      when: function (f) { return !!(f.여행가 || f.세계일주); } },
    { key: 'youtuber', emoji: '📹', label: '구독자와 함께 늙은 크리에이터',
      variants: ['카메라 앞에서 혼잣말하던 크리에이터', '댓글 한 줄에 계속 찍은 크리에이터'],
      signals: ['유튜버', '크리에이터_길', '영상_씨앗'],
      when: function (f) { return !!(f.유튜버 || f.크리에이터_길); } },
    { key: 'volunteer', emoji: '🤝', label: '남을 돕다 늙은 사람',
      variants: ['고맙다는 말에 더 도운 사람', '남의 일에 하루를 쓴 사람'],
      signals: ['봉사_길', '기부'],
      when: function (f) { return !!(f.봉사_길 || f.기부); } },
    { key: 'villager', emoji: '🏞️', label: '산골에서 살아낸 사람',
      variants: ['서울을 떠나 짐을 줄인 사람', '마당에 채소를 심은 사람'],
      signals: ['귀촌', '전원생활'],
      when: function (f) { return !!(f.귀촌 || f.전원생활); } },
    { key: 'family',   emoji: '🏠', label: '가족만 바라보고 산 사람',
      variants: ['식탁의 얼굴들을 평생 본 사람', '아이들 키우다 내 이름을 잊은 사람'],
      signals: ['자녀수', '자녀', '결혼', '가족_화합'],
      when: function (f) { return (f.자녀수 || 0) >= 2 && !f.창업 && !f.예술가_길; } }
  ];

  // 같은 갈래라도 판마다 다른 얼굴이 나오게 — 이름·시작점으로 정해지는 고정 추첨
  function titleHash(s) {
    var str = [s && s.name, s && s.createdAt, s && s.startAge, s && s.age].join('|');
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0);
  }

  // 얼굴은 '가장 많이 남긴 흔적'이 정한다. (축구부·진로_체육·체육_길 3개 > 글쓰기_길 1개)
  function archetypeOf(s) {
    if (!s || !s.flags) return null;
    var best = null, bestScore = -1;
    for (var i = 0; i < ARCHETYPES.length; i++) {
      var a = ARCHETYPES[i], hit = false;
      try { hit = !!a.when(s.flags); } catch (e) { hit = false; }
      if (!hit) continue;
      var score = 0, sig = a.signals || [];
      for (var j = 0; j < sig.length; j++) { if (s.flags[sig[j]]) score++; }
      if (score > bestScore) { best = a; bestScore = score; }
    }
    if (!best) return null;
    var labels = [best.label].concat(best.variants || []);
    return { key: best.key, emoji: best.emoji, label: labels[titleHash(s) % labels.length] };
  }

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
    if (f.창업_실패) return '창업의 쓴맛을 본';
    if (f.창업) return '창업의 쓴맛을 본';
    if (f.야근러 && st.mental < 40) return '야근에 인생을 갈아넣은';
    if (f.야근러) return '밤샘을 밥 먹듯 한';
    if ((f.이직횟수 || 0) >= 3) return '회사를 세 번 갈아탄';
    if ((f.자녀수 || 0) >= 2) return '두 아이를 키워낸';
    if ((f.자녀수 || 0) === 1) return '한 아이를 키워낸';
    if (f.주식손실) return '주식에 재산을 맡긴';
    if (f.사업체 && st.asset >= 20000) return '가게를 일군';
    if (f.임원) return '임원까지 오른';
    if (f.부모_간병) return '부모를 마지막까지 간병한';
    if (f.유학_경험) return '낯선 나라에서 살아본';
    if (f.일탈_경험) return '한 번 크게 넘어진';
    if (f.첫사랑_기억 && f.결혼) return '첫사랑을 잊지 못한';
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
    var arch = archetypeOf(s);
    if (arch) return originPhrase(s) + ' ' + arch.label;
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
    '유튜버': '유튜브 채널', '승진': '승진', '명퇴': '명예퇴직',
    '책벌레': '책벌레', '골목대장': '골목대장', '예체능': '예체능', '코딩': '코딩',
    '과학영재': '과학 영재', '축구부': '축구부', '밴드': '밴드', '학생회': '학생회',
    '게임고수': '게임 고수', '첫사랑_기억': '첫사랑', '진로_예술': '예술 진로',
    '진로_공학': '공학 진로', '진로_의학': '의학 진로', '진로_인문': '인문 진로',
    '진로_체육': '체육 진로', '진로_창업': '창업 진로', '진로_교육': '교육 진로',
    '진로_미디어': '미디어 진로', '일탈_경험': '한 번의 일탈', '동아리_주도': '동아리 주도',
    '예술가_길': '예술가의 길', '연구원_길': '연구자의 길', '창업_길': '창업가의 길',
    '교사_길': '교사의 길', '의사_길': '의사의 길', '공무원_길': '공직의 길',
    '개발_길': '개발자의 길', '체육_길': '체육인의 길', '요리_길': '요리사의 길',
    '음악가_길': '음악가의 길', '글쓰기_길': '글쓰는 삶', '프로게이머_길': '프로게이머',
    '유학_경험': '유학', '인턴_경험': '인턴', '학회_논문': '학회 논문',
    '사업체': '가게 운영', '임원': '임원', '부모_간병': '부모 간병',
    '자녀_독립': '자녀 독립', '손주': '손주', '연금': '연금 생활',
    '낚시광': '낚시광', '정원사': '정원사', '여행가': '여행가', '회고록': '회고록',
    '기부': '기부', '봉사_길': '봉사', '귀촌': '귀촌', '텃밭': '텃밭',
    '투자_경험': '투자', '건강_관리': '건강 관리', '건강_경고': '건강 경고',
    '작품활동': '작품 활동', '전시회': '전시회', '책_출간': '책 출간'
  };

  function summary(s) {
    var g = gradeOf(s);
    var st = s.stats;
    var arch = archetypeOf(s);
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
      archetype: arch ? { key: arch.key, emoji: arch.emoji, label: arch.label } : null,
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

  /* ═════════════ 졸업 결산 · 능력치 비교 · 명예의 전당 ═════════════ */

  // 종합 점수(0~100) — 네 스탯 평균 55점 + 재산 45점. 졸업 시점 비교·전당 점수에 공통으로 쓴다.
  function scoreOfStats(st) {
    var gauge = (st.hp + st.mental + st.charm + st.social) / 4;
    var assetScore = st.asset > 0 ? clamp((Math.log10(st.asset + 1) / 4.6) * 45, 0, 45) : 0;
    return clamp(gauge * 0.55 + assetScore, 0, 100);
  }

  function refTable(key, name) {
    var d = global.LIFE_REFDIST;
    if (!d || !d[key] || !d[key][name]) return null;
    return d[key][name];
  }

  // 기준 분포(시뮬레이션 표본의 0~100 백분위표)에서 '나보다 낮은 사람의 비율'을 구한다
  function refBelow(key, name, v) {
    var t = refTable(key, name);
    if (!t || !t.p || !t.p.length) return null;
    var p = t.p;
    if (v <= p[0]) return 0;
    if (v >= p[p.length - 1]) return 100;
    for (var i = 0; i < p.length - 1; i++) {
      if (v >= p[i] && v <= p[i + 1]) {
        var span = p[i + 1] - p[i];
        return i + (span > 0 ? (v - p[i]) / span : 0);
      }
    }
    return 50;
  }

  function topPercent(key, name, v) {
    var b = refBelow(key, name, v);
    if (b === null) return null;
    return clamp(Math.round(100 - b), 1, 100);
  }

  function gradeFromTop(top) {
    if (top === null) return { grade: 'B', label: '평균 권' };
    if (top <= 5) return { grade: 'S', label: '상위 5%' };
    if (top <= 15) return { grade: 'A', label: '상위 15%' };
    if (top <= 40) return { grade: 'B', label: '상위 40%' };
    if (top <= 70) return { grade: 'C', label: '상위 70%' };
    return { grade: 'D', label: '하위 30%' };
  }

  function impactOf(h) {
    var impact = 0;
    Object.keys(h.deltas || {}).forEach(function (k) {
      var v = h.deltas[k];
      impact += (k === 'asset') ? Math.min(3, Math.abs(v) / 300) : Math.abs(v);
    });
    return impact + (h.milestone ? 4 : 0);
  }

  function statSnapshot(st) {
    return { hp: st.hp, mental: st.mental, charm: st.charm, social: st.social, asset: st.asset };
  }

  function diffText(key, diff) {
    if (diff === null || diff === undefined) return '';
    if (key === 'asset') return (diff >= 0 ? '+' : '-') + formatAsset(Math.abs(diff));
    return (diff >= 0 ? '+' : '') + diff;
  }

  /* ── 졸업 결산 정보 ── */
  function gradInfo(s) {
    if (!s || !s.grad) return null;
    var def = GRAD_BY_KEY[s.grad.key];
    if (!def) return null;
    var st = s.grad.stats || statSnapshot(s.stats);
    var stage = stageOf(def.age);
    var entries = (s.history || []).filter(function (h) { return h.age >= stage.from && h.age <= stage.to; });
    var highlights = entries.slice().sort(function (a, b) { return impactOf(b) - impactOf(a); }).slice(0, 3);

    var flags = [];
    entries.forEach(function (h) {
      (h.setKeys || []).forEach(function (k) {
        if (s.flags[k] && flags.indexOf(k) === -1) flags.push(k);
      });
    });

    var rows = STATS.map(function (each) {
      var v = st[each.key];
      var t = refTable(def.key, each.key);
      var avg = t ? t.mean : null;
      var diff = avg === null ? null : Math.round(v - avg);
      return {
        key: each.key,
        label: each.label,
        value: v,
        disp: displayStat(each.key, v),
        avg: avg,
        avgDisp: avg === null ? null : displayStat(each.key, avg),
        diff: diff,
        diffDisp: diff === null ? null : diffText(each.key, diff),
        top: topPercent(def.key, each.key, v),
        pct: statPct(each.key, v),
        avgPct: avg === null ? null : statPct(each.key, avg)
      };
    });

    var score = scoreOfStats(st);
    var tScore = refTable(def.key, 'score');
    var total = {
      key: 'score',
      label: '종합 점수',
      value: score,
      disp: String(Math.round(score)),
      avg: tScore ? tScore.mean : null,
      avgDisp: tScore ? String(Math.round(tScore.mean)) : null,
      diff: tScore ? Math.round(score - tScore.mean) : null,
      top: topPercent(def.key, 'score', score),
      pct: score,
      avgPct: tScore ? tScore.mean : null
    };
    total.diffDisp = diffText('score', total.diff);

    var gr = gradeFromTop(total.top);
    var rank = hallRank(def.key, score);
    // 아직 등록 전이면 '나까지 포함한' 인원으로 보여준다 (등록 뒤에는 이미 내 기록이 들어 있다)
    var hallNow = (s.grad && s.grad.registered) ? rank
      : { count: rank.count + 1, rank: rank.rank, best: rank.best };

    return {
      key: def.key,
      def: def,
      stage: stage,
      age: def.age,
      month: LAST_MONTH,
      name: s.name,
      title: buildTitle(s),
      endingLabel: def.label,
      stats: statSnapshot(st),
      rows: rows,
      total: total,
      score: score,
      grade: gr.grade,
      gradeLabel: gr.label,
      highlights: highlights,
      count: entries.length,
      flags: flags.map(function (k) { return FLAG_LABEL[k] || String(k).replace(/_/g, ' '); }).slice(0, 4),
      sampleSize: (refTable(def.key, 'score') || {}).n || null,
      hall: hallNow
    };
  }

  /* ── 명예의 전당 (localStorage) ── */
  var HALL_KEY = 'lifeTurnSim.hall.v1';
  var HALL_MAX = 240;

  function hallState() {
    var d = null;
    try { d = JSON.parse(global.localStorage.getItem(HALL_KEY) || 'null'); } catch (e) { d = null; }
    if (!d || !Array.isArray(d.records)) d = { v: 1, seeded: false, records: [] };
    return d;
  }
  function hallWrite(d) {
    try { global.localStorage.setItem(HALL_KEY, JSON.stringify(d)); } catch (e) {}
  }
  function hallSeed(d) {
    if (d.seeded) return d;
    var seeds = global.LIFE_HALL_SEEDS || [];
    for (var i = 0; i < seeds.length; i++) {
      var sd = seeds[i], dup = false;
      for (var j = 0; j < d.records.length; j++) { if (d.records[j].id === sd.id) { dup = true; break; } }
      if (!dup) d.records.push(Object.assign({}, sd));
    }
    d.seeded = true;
    return d;
  }
  function hallRecords() {
    var d = hallState();
    if (!d.seeded) { hallSeed(d); hallWrite(d); }
    return d.records;
  }
  function hallSorted(list) {
    return list.slice().sort(function (a, b) {
      return (b.score || 0) - (a.score || 0) || (a.ts || 0) - (b.ts || 0);
    });
  }
  function hallOf(key) {
    return hallSorted(hallRecords().filter(function (r) { return r.key === key; }));
  }
  function hallRank(key, score) {
    var list = hallOf(key);
    var better = list.filter(function (r) { return (r.score || 0) > score; }).length;
    return { count: list.length, rank: better + 1, best: list[0] || null };
  }
  function hallAdd(rec) {
    var d = hallSeed(hallState());
    rec.id = 'r' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e4).toString(36);
    rec.ts = Date.now();
    rec.mine = true;
    d.records.push(rec);
    while (d.records.length > HALL_MAX) {
      var oldest = -1, oldestTs = Infinity;
      for (var i = 0; i < d.records.length; i++) {
        var r = d.records[i];
        if (!r.mine) continue;
        if ((r.ts || 0) < oldestTs) { oldestTs = r.ts || 0; oldest = i; }
      }
      if (oldest < 0) break;
      d.records.splice(oldest, 1);
    }
    hallWrite(d);
    return rec;
  }
  function hallMine() {
    return hallSorted(hallRecords().filter(function (r) { return r.mine; }));
  }
  function hallBestMine() {
    return hallMine()[0] || null;
  }

  /* ── 졸업하기 / 계속 살기 ── */
  function graduate(s, register) {
    if (!s || !s.grad) return null;
    var info = gradInfo(s);
    if (!register) {
      s.grad = null;
      s.endingKind = null;
      return { ok: true, continued: true, info: info };
    }
    if (!s.grad.registered) {
      var rec = hallAdd({
        kind: 'graduation',
        key: info.def.key,
        stageLabel: info.def.short,
        age: info.def.age,
        score: round1(info.score),
        grade: info.grade,
        top: info.total.top,
        title: info.title,
        name: s.name,
        stats: statSnapshot(info.stats)
      });
      s.grad.registered = true;
      s.hallId = rec.id;
      info.hall = hallRank(info.def.key, info.score);
    }
    s.ended = true;
    s.endingKind = 'graduation';
    s.current = null;
    return { ok: true, ended: true, info: info };
  }

  // 80세를 넘기면 80세 완주 기록을 자동으로 남긴다
  function registerLife(s) {
    if (!s || s.hallId) return null;
    var sum = summary(s);
    var rec = hallAdd({
      kind: 'life',
      key: 'life80',
      stageLabel: '80세 완주',
      age: END_AGE,
      score: round1(scoreOfStats(s.stats)),
      grade: sum.grade,
      top: null,
      title: sum.title,
      name: s.name,
      stats: statSnapshot(s.stats)
    });
    s.hallId = rec.id;
    return rec;
  }

  /* ═════════════ 회고 편지 — 실제 기록으로 만드는 8~10줄 ═════════════ */
  function recallRand(seedStr) {
    var h = 2166136261;
    for (var i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () {
      h = Math.imul(h ^ (h >>> 15), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };
  }
  function recallPick(rnd, arr) { return arr[Math.floor(rnd() * arr.length)]; }

  var RECALL_OPEN = {
    kindergarten: [
      '작은 손에 크레파스를 쥐고, 도화지 가득 해를 그리던 아이.',
      '낮잠에서 깬 오후, 창밖으로는 벌써 몇 번째 봄이 지나가고 있었습니다.',
      '이름표를 붙인 사물함 앞에서, 세상은 아직 내 키만 했습니다.'
    ],
    elementary: [
      '책가방이 몸집보다 커 보이던 봄이 있었습니다.',
      '운동장 모래가 신발 안으로 들어오던 날들, 그것이 6년이었습니다.',
      '급식실 냄새와 종이 울리던 소리로 기억되는 시간이었습니다.'
    ],
    middle: [
      '처음 입은 교복 소매가 조금 길었습니다.',
      '사춘기라는 이름의 계절을, 아무에게도 말하지 못한 채 지나왔습니다.',
      '사물함 문을 열면 사춘기 냄새가 났습니다. 그 냄새도 이제는 그립습니다.'
    ],
    high: [
      '야자 끝난 밤공기를 마시며, 별이 아니라 시계를 봤습니다.',
      '3년 내내 누군가의 등을 바라보며 달려온 시간이었습니다.',
      '새벽 6시의 교실, 형광등이 켜지기 전의 어둠이 아직 기억납니다.'
    ],
    college: [
      '캠퍼스 잔디에 앉아 처음으로 내일을 스스로 정해본 시절.',
      '졸업증명서 한 장이, 몇 해의 밤낮을 접어 넣은 종이가 되었습니다.',
      '도서관 창가 자리, 음료수 캔, 그리고 이름 모를 누군가의 필기 소리.'
    ],
    life80: [
      '여든 번의 봄을 지나, 이제 창가에 앉아 지나온 길을 셉니다.',
      '손등의 주름 사이로, 그 시절의 햇빛이 아직 남아 있습니다.',
      '긴 하루를 살아낸 사람의 저녁처럼, 방 안이 조용합니다.'
    ]
  };

  var RECALL_CLOSE = {
    kindergarten: [
      '이제 앞니 빠진 입으로, 교실 문을 나섭니다.',
      '크레파스는 다 닳았지만, 그리고 싶은 것은 아직 많습니다.'
    ],
    elementary: [
      '이제 더 큰 교실로 걸어갑니다. 책가방은 이제 제법 잘 어울립니다.',
      '6년의 종이 울렸습니다. 마지막 종소리는 조금 길게 들렸습니다.'
    ],
    middle: [
      '교복 소매는 이제 맞습니다. 사람은 조금 늘었습니다.',
      '이제 교문을 나서면, 세상이 조금 더 넓어집니다.'
    ],
    high: [
      '이제 교문을 나섭니다. 세상은 아직 나를 모르지만, 나도 아직 나를 모릅니다.',
      '3년의 마지막 종이 울렸습니다. 가방은 가볍고, 마음은 무겁습니다.'
    ],
    college: [
      '이제 학생이라는 이름을 내려놓고, 내 이름으로 서야 합니다.',
      '졸업식장을 나서는 발걸음이, 처음 걷는 길처럼 낯섭습니다.'
    ],
    life80: [
      '긴 인생이었습니다. 잘 살았는지는 아직 모르겠지만, 살아냈습니다.',
      '이제 남은 것은 기억뿐입니다. 그것으로 충분합니다.'
    ]
  };

  /* 갈래별 회고 한 줄 — 실제로 그 길을 걸은 사람에게만 나온다 */
  var BRANCH_LINES = {
    artist: [
      '손끝에 물감이 마르기 전에 또 다른 색을 올리던 밤들이 있었습니다. 그 밤들이 벽에 걸려 있습니다.',
      '팔리지 않는 그림도 계속 그렸습니다. 이제 와서 보니, 그 시간이 나를 지탱했습니다.'
    ],
    musician: [
      '줄이 끊어진 악기를 몇 번이나 고쳤습니다. 무대의 조명보다 연습실 형광등이 더 그립습니다.',
      '박자가 틀려도 멈추지 않았습니다. 인생도 그렇게 연주했습니다.'
    ],
    writer: [
      '원고를 세 번 버렸고 네 번째에야 마쳤습니다. 그 원고가 아직 책장에 꽂혀 있습니다.',
      '누군가 내 문장을 따라 읽어 주던 밤. 그 한 사람 덕분에 계속 썼습니다.'
    ],
    researcher: [
      '실패한 실험이 성공보다 많았습니다. 그래도 다음 날 다시 실험실 문을 열었습니다.',
      '논문 한 편에 내 인생 몇 년이 들어갔습니다. 그 숫자를 나는 후회하지 않습니다.'
    ],
    doctor: [
      '새벽 호출에 몇 번이나 뛰어나갔습니까. 그때 잡은 손의 온도가 아직 남아 있습니다.',
      '환자 이름을 다 기억하지는 못해도, 나를 찾아온 사람은 기억합니다.'
    ],
    teacher: [
      '칠판을 지우던 손에 분필 가루가 앉았습니다. 교실 창가 자리는 늘 누군가의 자리였습니다.',
      '졸업생이 찾아와 “선생님”이라고 불러 줄 때, 그게 내 월급이었습니다.'
    ],
    public: [
      '민원실 창구에서 삼십 년을 보냈습니다. 서류 한 장으로 사람의 하루가 바뀌는 걸 봤습니다.',
      '정년 날, 후배들이 도장을 선물했습니다. 그 도장은 아직 서랍에 있습니다.'
    ],
    founder: [
      '문을 닫을 뻔한 가게가 세 번이었습니다. 그때마다 다시 간판을 닦았습니다.',
      '직원들의 월급날을 한 번도 놓치지 않았습니다. 그게 내가 자랑할 수 있는 전부입니다.'
    ],
    engineer: [
      '밤새 돌린 빌드가 아침에 초록불이 되던 순간, 그게 내가 좋아한 순간입니다.',
      '내가 짠 코드는 나보다 오래 살아남았습니다. 그것도 한 방식의 불멸입니다.'
    ],
    athlete: [
      '무릎이 망가진 뒤에도 아침마다 뛰었습니다. 기록보다 습관이 오래 갔습니다.',
      '몸이 기억하는 것들이 있습니다. 그 감각은 은퇴 후에도 사라지지 않았습니다.'
    ],
    chef: [
      '새벽 시장에서 시작한 하루가 스물다섯 해였습니다. 손등의 화상 자국이 이력서입니다.',
      '단골이 “오늘도 그 맛”이라고 할 때, 그 한마디로 버텼습니다.'
    ],
    pro: [
      '새벽까지 랭크를 올렸습니다. 그 시절의 손목은 지금도 비 오는 날이면 욱신거립니다.',
      '게임을 그만두라는 말을 수도 없이 들었지만, 그 세계에서 나는 누군가였습니다.'
    ],
    fisher: [
      '낚싯대를 드리우고 반나절을 앉아 있었습니다. 잡은 것보다 버린 시간이 많았고, 그게 좋았습니다.',
      '물소리를 들으면 마음이 가라앉습니다. 그 소리를 평생 들었습니다.'
    ],
    gardener: [
      '손에 흙이 묻지 않는 날이 없었습니다. 심은 나무는 나보다 키가 커졌습니다.',
      '봄마다 새싹이 올라오는 걸 봤습니다. 그 반복이 내 인생의 답이었습니다.'
    ],
    traveler: [
      '낯선 공항에서 표를 다시 짜던 밤이 여러 번 있었습니다. 그 밤들이 내 지도가 됐습니다.',
      '짐을 싸는 법을 배우면서, 버리는 법도 배웠습니다.'
    ],
    youtuber: [
      '카메라 앞에서 혼잣말을 하던 시절이 있었습니다. 그 영상은 아직 서버 어딘가에 있습니다.',
      '구독자 한 명이 남긴 댓글을 아직 기억합니다. 그 문장이 계속하게 했습니다.'
    ],
    volunteer: [
      '남의 일에 하루를 쓰는 게 처음엔 어색했습니다. 어느새 내 하루가 그쪽으로 기울어 있었습니다.',
      '고맙다는 말을 받으려 한 게 아니었는데, 받고 나면 이상하게 마음이 따뜻했습니다.'
    ],
    villager: [
      '서울을 떠나던 날, 짐은 차 한 대에 다 들었습니다. 그 뒤로 사는 게 가벼워졌습니다.',
      '마당에 채소를 심고 이웃과 나눴습니다. 그 소소함이 마지막 자존심이 됐습니다.'
    ],
    family: [
      '아이들 키우느라 내 이름을 잠시 잊었습니다. 그래도 그 시간이 내 인생의 본론이었습니다.',
      '식탁에 앉은 네 사람의 얼굴을 평생 봤습니다. 그게 내가 고른 하루였습니다.'
    ]
  };

  // 실제 스탯·플래그·선택 기록으로 만드는 8~10줄 회고
  function recallLines(s, mode, info) {
    var key = mode === 'life' ? 'life80' : (info ? info.key : 'kindergarten');
    var age = mode === 'life' ? Math.min(s.age, END_AGE) : (info ? info.age : s.age);
    var st = mode === 'life' ? s.stats : (info ? info.stats : s.stats);
    var rnd = recallRand([s.name, s.createdAt, mode, key, Math.round(st.hp), Math.round(st.mental)].join('|'));
    var lines = [];

    lines.push(recallPick(rnd, RECALL_OPEN[key] || RECALL_OPEN.kindergarten));

    if (mode === 'life') {
      lines.push('그 사이 세상은 몇 번이나 모습을 바꿨습니다. 나도 그렇게 바뀌었습니다.');
    } else {
      var stageName = info && info.stage ? info.stage.name : '학교';
      lines.push('그때 나는 ' + age + '세, ' + stageName + '의 마지막 달을 보내고 있었습니다.');
    }

    // 3~4줄: 실제로 겪은 사건에서 기억 한두 개
    var pool = (s.history || []).filter(function (h) { return h.age <= age; });
    if (mode !== 'life' && info) {
      var scoped = pool.filter(function (h) { return h.age >= info.stage.from && h.age <= info.stage.to; });
      if (scoped.length) pool = scoped.concat(pool.filter(function (h) { return h.age < info.stage.from; }));
    }
    var mem = pool.slice().sort(function (a, b) { return impactOf(b) - impactOf(a); }).slice(0, 2);
    mem.sort(function (a, b) { return a.age - b.age; });
    if (mem[0]) {
      lines.push(mem[0].age + '세 ' + mem[0].month + '개월차, ' + mem[0].title + '. 그날의 공기가 아직 남아 있습니다.');
    }
    if (mem[1]) {
      lines.push(mem[1].age + '세 ' + mem[1].month + '개월차의 ' + mem[1].title + ' — 그때는 그게 전부인 줄 알았습니다.');
    }

    // 5~6줄: 마음과 몸
    var mental = st.mental, hp = st.hp;
    lines.push(mental >= 78 ? '마음은 대체로 맑았습니다. 웃음이 잘 나는 사람이었고, 그 웃음이 하루를 버티게 했습니다.'
      : mental >= 58 ? '마음은 잔잔한 편이었습니다. 큰 파도 없이도 여기까지 왔습니다.'
      : mental >= 42 ? '마음이 눅눅해지는 날이 있었습니다. 다음 날이면 조금 말랐습니다.'
      : mental >= 26 ? '혼자 삼키는 밤이 많았습니다. 아무도 모르는, 그런 밤이었습니다.'
      : '마음의 바닥을 몇 번 보았습니다. 그래도 아침이면 다시 일어났습니다.');
    lines.push(hp >= 72 ? '몸은 말을 잘 들었습니다. 뛰어도 다음 날 아침은 어김없이 왔습니다.'
      : hp >= 52 ? '몸은 그럭저럭이었습니다. 아픈 날보다 괜찮은 날이 조금 많았습니다.'
      : hp >= 36 ? '몸이 자주 신호를 보냈지만, 대부분 모른 척 지나갔습니다.'
      : '몸이 먼저 지친 날들이 있었습니다. 그때는 그게 당연한 줄 알았습니다.');

    // 7줄: 사람과의 거리
    if (st.social >= 72) {
      lines.push('곁에 사람이 있었습니다. 이름을 부르면 돌아보는 얼굴이 몇 있었습니다.');
    } else if (st.social >= 52) {
      lines.push('친구 몇, 그 정도면 충분했습니다. 연락은 뜸해도 마음은 남았습니다.');
    } else if (st.social >= 36) {
      lines.push('사람 사이가 넓지도 좁지도 않았습니다. 그 거리가 편했습니다.');
    } else {
      lines.push('곁은 조용했습니다. 그 조용함이 편할 때도, 서운할 때도 있었습니다.');
    }

    // 8줄: 이 인생의 갈래 — 실제로 걸어온 길이 있으면 그 길의 문장을 쓴다
    var arch = mode === 'life' ? archetypeOf(s) : null;
    var branchPushed = false;
    if (arch) {
      var branchPool = BRANCH_LINES[arch.key];
      lines.push(branchPool ? recallPick(rnd, branchPool)
        : '한 갈래 길을 끝까지 걸었습니다. 돌아보니 그 길이 곧 나였습니다.');
      branchPushed = true;
    }

    // 8~9줄: 그 시절에 남은 이름표(플래그)
    var traitKeys = [];
    (s.history || []).forEach(function (h) {
      if (h.age > age) return;
      (h.setKeys || []).forEach(function (k) { if (s.flags[k] && traitKeys.indexOf(k) === -1) traitKeys.push(k); });
    });
    var traitKey = traitKeys.length ? traitKeys[traitKeys.length - 1] : null;
    if (!branchPushed) {
      if (traitKey) {
        var traitName = FLAG_LABEL[traitKey] || (s.flags[traitKey] === true ? traitKey : String(s.flags[traitKey]));
        lines.push('그 시절을 설명하는 이름표가 하나 있었습니다 — ‘' + traitName + '’.');
      } else if (s.flags.직업 && mode === 'life') {
        lines.push('한때는 ‘' + s.flags.직업 + '’이라는 이름으로 불렸습니다. 그 이름도 이제는 추억입니다.');
      }
    }

    // 9줄: 남은 돈에 대한 한 줄
    if (mode === 'life') {
      if (st.asset >= 30000) lines.push('남긴 것은 ' + formatAsset(st.asset) + '. 숫자보다, 그 숫자를 만든 날들이 길었습니다.');
      else if (st.asset < 0) lines.push('빚도 남겼습니다. 부끄럽지만, 그것도 내가 살아온 흔적입니다.');
      else lines.push('남은 재산은 ' + formatAsset(st.asset) + '. 많지 않아도, 아쉽지 않습니다.');
      if ((s.flags.자녀수 || 0) > 0) lines.push('아이들은 이제 각자의 집에서 저녁을 먹습니다. 그것이 내가 남긴 가장 큰 재산입니다.');
    } else if (st.asset >= 1) {
      if (key === 'kindergarten') {
        lines.push('저금통 안에는 ' + formatAsset(st.asset) + '이 남아 있었습니다. 세지 않아도 알던 돈입니다.');
      } else if (key === 'elementary' || key === 'middle') {
        lines.push('통장에 ' + formatAsset(st.asset) + '이 남았습니다. 처음으로 내 돈이라는 걸 알았습니다.');
      } else {
        lines.push('통장 잔고는 ' + formatAsset(st.asset) + '. 그것이 내가 가진 전부였고, 부끄럽지 않았습니다.');
      }
    } else {
      lines.push('가진 것은 없었지만, 그게 부끄럽지 않은 나이였습니다.');
    }

    lines.push(recallPick(rnd, RECALL_CLOSE[key] || RECALL_CLOSE.kindergarten));
    return lines.slice(0, 10);
  }

  /* ── 공개 API ── */
  global.Life = {
    STAGES: STAGES,
    START_AGES: START_AGES,
    STATS: STATS,
    END_AGE: END_AGE,
    MONTHS: MONTHS,
    GRADUATIONS: GRADUATIONS,
    gradInfo: gradInfo,
    graduate: graduate,
    recall: function (s, mode) {
      var info = mode === 'life' ? null : gradInfo(s);
      return recallLines(s, mode === 'life' ? 'life' : 'grad', info);
    },
    hallRecords: hallRecords,
    hallOf: hallOf,
    hallRank: hallRank,
    hallMine: hallMine,
    hallBestMine: hallBestMine,
    hallSorted: hallSorted,
    scoreOfStats: scoreOfStats,
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
    archetypeOf: archetypeOf,
    ARCHETYPES: ARCHETYPES,
    flagMatch: flagMatch,
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
    boomerangOf: boomerangOf,
    canReroll: canReroll,
    reroll: reroll,
    canHeal: canHeal,
    heal: heal
  };
})(typeof window !== 'undefined' ? window : globalThis);
