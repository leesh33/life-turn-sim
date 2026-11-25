/* ─────────────────────────────────────────────
   engine.js — 게임 상태 · 이벤트 선택 · 스탯 · 저장 · 엔딩 요약
   (빌드 도구 없이 동작하는 순수 브라우저 스크립트)
   ───────────────────────────────────────────── */
(function (global) {
  'use strict';

  var SAVE_KEY = 'lifeTurnSim.save.v1';
  var SAVE_VERSION = 5;      // v1(일차 단위) → v2(개월차) → v3(졸업 결산·명예의 전당) → v4(역량·행운) → v5(이전 회차 인물 · 2026-11-20 출발 시나리오·가문 유산을 같은 v5 모양에 더함)
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

  /* ── 일곱 능력치 ──
     체력·멘탈·매력·호감도에 역량(🧠)과 행운(🍀)을 더했다.
     앞의 여섯 개는 0~100 게이지(선택의 효과·고수준 체감·최고치 유지가 모두 적용)이고,
     재산만 별도의 로그 눈금이다. 화면 순서도 이 순서를 그대로 쓴다. */
  var STATS = [
    { key: 'hp',     label: '체력',   emoji: '💪' },
    { key: 'mental', label: '멘탈',   emoji: '🧘' },
    { key: 'charm',  label: '매력',   emoji: '✨' },
    { key: 'social', label: '호감도', emoji: '🤝' },
    { key: 'intel',  label: '역량',   emoji: '🧠' },
    { key: 'luck',   label: '행운',   emoji: '🍀' },
    { key: 'asset',  label: '재산',   emoji: '💰' }
  ];
  var STAT_META = {};
  STATS.forEach(function (st) { STAT_META[st.key] = st; });

  // 0~100 게이지로 다루는 능력치 (재산 제외) — 유지·감쇠·종합 점수가 모두 이 목록을 쓴다
  var GAUGE_KEYS = ['hp', 'mental', 'charm', 'social', 'intel', 'luck'];
  function gaugeAvg(st) {
    var sum = 0;
    for (var i = 0; i < GAUGE_KEYS.length; i++) sum += (st[GAUGE_KEYS[i]] || 0);
    return sum / GAUGE_KEYS.length;
  }

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
  /* 역량(intel)은 나이가 들수록 조금씩 올라 출발하고(배운 것이 쌓인다),
     행운(luck)은 어느 시작점에서나 50 근처에서 흔들린다 — 타고나는 값에 가깝다.
     1세(출산)만은 예외다 — 신생아의 몸은 어른과 같은 60대일 수 없으므로
     체력 38·호감도 46 에서 출발한다(체력 30 이하 긴급 회복 조건에도 걸리지 않는다). */
  var PRESETS = {
    1:  { stats: { hp: 38, mental: 62, charm: 52, social: 46, intel: 44, luck: 52, asset: 0 },
          flags: {} },
    8:  { stats: { hp: 62, mental: 58, charm: 54, social: 56, intel: 48, luck: 50, asset: 5 },
          flags: { 초등학생: true } },
    14: { stats: { hp: 64, mental: 54, charm: 57, social: 54, intel: 52, luck: 51, asset: 12 },
          flags: { 중학생: true } },
    17: { stats: { hp: 62, mental: 51, charm: 59, social: 54, intel: 55, luck: 49, asset: 20 },
          flags: { 고등학생: true } },
    20: { stats: { hp: 61, mental: 55, charm: 60, social: 57, intel: 60, luck: 52, asset: 60 },
          flags: { 대학생: true, 문과: true } },
    25: { stats: { hp: 59, mental: 54, charm: 59, social: 58, intel: 62, luck: 50, asset: 850 },
          flags: { 대졸: true, 문과: true, 직업: '대기업 기획자' } },
    35: { stats: { hp: 56, mental: 55, charm: 58, social: 60, intel: 64, luck: 51, asset: 9500 },
          flags: { 대졸: true, 문과: true, 직업: '대기업 기획자' } }
  };

  /* ═════════════ 출발 시나리오 ═════════════
     같은 나이에서 시작해도 '어떤 집에서 태어났는가'가 첫 몇 해의 결을 바꾼다.
       · 재산은 배수(assetMul)와 고정값(assetAdd)으로, 능력치는 시작할 때 한 번만 더한다
         (이후의 고수준 체감·최고치 유지·노화 규칙은 모든 시나리오가 똑같이 따른다).
       · 시나리오 플래그(시나리오_재벌 등)로 그 집안에만 열리는 이벤트가 붙는다
         (assets/events/scenario.js) — 재벌가의 승계 압박, 흙수저의 아르바이트, 90년대생의 세대 서사.
       · 기본값('kr')은 지금까지의 균형을 그대로 둔다(아무것도 더하지 않는다). */
  var SCENARIOS = [
    { id: 'kr', emoji: '🏠', name: '기본 한국 현실', short: '한국 현실',
      desc: '평범한 집, 평범한 통장. 특별히 유리하지도 불리하지도 않은 출발입니다.',
      hint: '평범한 집 · 균형 잡힌 출발',
      stats: {}, assetMul: 1, assetAdd: 0, flags: {},
      intro: '평범한 집에서 인생이 시작되었습니다' },
    { id: 'imf', emoji: '📼', name: '90년대생', short: '90년대생',
      desc: '외환위기를 지난 부모 밑에서 자란 세대. 일찍 철들고, 운은 조금 비켜 갔습니다.',
      hint: '일찍 철듦 · 운은 조금 낮게',
      stats: { mental: -3, intel: 2, social: 1, luck: -2 }, assetMul: 0.7, assetAdd: 0,
      flags: { 시나리오_IMF: true },
      intro: '외환위기를 지나온 집에서 인생이 시작되었습니다' },
    { id: 'chaebol', emoji: '💎', name: '재벌가 막내', short: '재벌가 막내',
      desc: '태어날 때부터 통장이 있고 이름표가 따라붙습니다. 대신 비교와 기대도 함께 옵니다.',
      hint: '재산 1억 · 대신 압박이 크다',
      stats: { mental: -7, hp: -4, social: 6, charm: 5, intel: 3 }, assetMul: 1, assetAdd: 10000,
      flags: { 시나리오_재벌: true },
      intro: '이름표가 따라붙는 집에서 인생이 시작되었습니다' },
    { id: 'dirt', emoji: '🔥', name: '흙수저 자수성가', short: '흙수저',
      desc: '통장은 빚에서 시작합니다. 대신 몸과 마음이 일찍 단단해졌습니다.',
      hint: '빚에서 시작 · 몸과 마음은 단단',
      stats: { hp: 4, mental: 4, social: -3, charm: -2, intel: 1 }, assetMul: 0.1, assetAdd: -150,
      flags: { 시나리오_흙수저: true },
      intro: '가진 것 없이 인생이 시작되었습니다' }
  ];
  var SCENARIO_BY_ID = {};
  SCENARIOS.forEach(function (sc) { SCENARIO_BY_ID[sc.id] = sc; });

  function scenarioOf(id) {
    return SCENARIO_BY_ID[id] || SCENARIO_BY_ID.kr;
  }

  function scenarioBrief(id) {
    var sc = scenarioOf(id);
    return { id: sc.id, emoji: sc.emoji, name: sc.name, short: sc.short, desc: sc.desc, hint: sc.hint };
  }

  // 시작 상태에 시나리오를 얹는다 (능력치는 한 번만, 재산은 배수→고정값 순서)
  function applyScenario(s, sc) {
    var deltas = sc.stats || {};
    Object.keys(deltas).forEach(function (k) {
      if (s.stats[k] === undefined) return;
      s.stats[k] = clamp(s.stats[k] + deltas[k], 0, 100);
    });
    var mul = typeof sc.assetMul === 'number' ? sc.assetMul : 1;
    s.stats.asset = Math.round(s.stats.asset * mul + (sc.assetAdd || 0));
    Object.keys(sc.flags || {}).forEach(function (k) { s.flags[k] = sc.flags[k]; });
    s.scenario = sc.id;
    return s;
  }

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
      // '1억만원' 처럼 '억' 뒤에 '만원'이 겹치지 않게 — 만 아래 자리가 없으면 '억 원'만.
      //   10000 → '1억 원' · 12000 → '1억 2,000만 원' · 52851 → '5억 2,851만 원'
      var eok = Math.floor(n / 10000), man = n % 10000;
      str = eok + '억' + (man ? ' ' + man.toLocaleString('ko-KR') + '만' : '') + ' 원';
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
    if (abs >= 1000) {
      // 9,950만 이상은 반올림하면 10.0천만 — 그건 1억으로 읽는다
      if (abs >= 9950) return sign + '1억';
      return sign + (abs / 1000).toFixed(1) + '천만';
    }
    return sign + abs.toLocaleString('ko-KR') + '만';
  }

  function displayStat(key, v) {
    if (key === 'asset') return compactAsset(v);
    return String(Math.round(v));
  }

  /* ── 이벤트 접근 ── */
  var _all = null, _allLen = -1;
  function allEvents() {
    var src = global.LIFE_EVENTS || [];
    // 이벤트 배열은 페이지에서 한 번 만들어지고 바뀌지 않는다 — 매번 filter 하지 않는다
    // (턴마다 부르는 pickEvent 안에서 쓰이므로 여기서 거르면 2,200개 × 수백 번이 된다)
    if (!_all || _allLen !== src.length) {
      _all = src.filter(function (e) { return e && e.id; });
      _allLen = src.length;
    }
    return _all;
  }
  var _index = null, _indexLen = -1, _indexLast = null;
  function byId(id) {
    var list = allEvents();
    // 길이만 보면 '하나 빼고 하나 더하기'(push/pop 교체)를 놓친다 — 마지막 항목까지 본다
    var last = list.length ? list[list.length - 1] : null;
    if (!_index || _indexLen !== list.length || _indexLast !== last) {
      _index = {};
      for (var i = 0; i < list.length; i++) _index[list[i].id] = list[i];
      _indexLen = list.length;
      _indexLast = last;
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

  // 나이 조건만 빼고 나머지 조건(플래그·스탯·when)을 본다 — 마지막 후보 단계가 쓴다
  function passesBeyondAge(ev, s) {
    if (ev.requireFlags && !flagMatch(ev.requireFlags, s.flags)) return false;
    if (ev.excludeFlags && flagAny(ev.excludeFlags, s.flags)) return false;
    if (ev.minStat && !minStatOk(ev.minStat, s.stats)) return false;
    if (ev.maxStat && !maxStatOk(ev.maxStat, s.stats)) return false;
    if (!ev.when) return true;
    try { return !!ev.when(s); } catch (err) { return false; }
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

    // 1-b) 몸이 위험하면 건강 사건을 먼저 내민다 — 휴식·병원으로 대처할 기회를 준다
    //      (마일스톤은 그 나이에 꼭 필요한 사건이라 먼저 두고, 그 다음 순서다)
    if (s.stats && s.stats.hp <= HEALTH.warnHp) {
      var healthEv = healthEventFor(s);
      if (healthEv) return healthEv;
    }

    // 2) 예약된 후속 이벤트 (앞선 선택의 결과)
    while (s.queue && s.queue.length) {
      var qid = s.queue.shift();
      ev = byId(qid);
      // 같은 후속 사건이 두 번 예약돼도 한 번만 (이미 겪은 사건은 다시 내밀지 않는다)
      if (ev && !used(s, ev.id) && passes(ev, s)) return ev;
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
    var blocked = blockedInStage(s, stage);
    var fresh = [], relaxedFresh = [], repeatables = [], all = [];
    for (i = 0; i < list.length; i++) {
      ev = list[i];
      if (ev.at || ev.stage === 'any') continue;
      if (ev.stage !== stage) continue;
      if (!passes(ev, s)) continue;
      all.push(ev);
      if (!used(s, ev.id)) {
        // 본문까지 같은 사건은 두 번 겪지 않는다
        if (blocked.exact[contentKeyOf(ev, s)]) continue;
        // 같은 제목은 3년 안에 다시 쓰지 않되, 그 나이대 풀이 마르면(노년) 느슨하게 푼다
        // 마일스톤·갈림길은 그 나이에 꼭 필요한 사건이라 제목이 겹쳐도 내민다
        if (!ev.milestone && blocked.recent[titleOfEvent(ev, s)]) { relaxedFresh.push(ev); continue; }
        fresh.push(ev);
      } else if (ev.repeatable) {
        var last = s.lastSeen[ev.id];
        if (last === undefined || s.turn - last >= 5) repeatables.push(ev);
      }
    }
    if (fresh.length) return weightedPick(s, fresh);
    if (relaxedFresh.length) return weightedPick(s, relaxedFresh);
    if (repeatables.length) return weightedPick(s, repeatables);
    return genericEvent(s);
  }

  /* ── 같은 사건의 중복 노출 막기 ──
     레거시 세트(legacy-*·campus·career…)와 연쇄 세트(chain-*)에는 본문까지 같은 사건이
     두 벌 들어 있다(예: '후배의 승진' car34g·wk_w132, '첫 강의' col20a·cp_u01).
     두 벌이 같은 나이대 풀에 같이 들어가면 한 인생에서 같은 사건을 두 번 겪는다.
       · 본문까지 같으면 다시 쓰지 않는다(완전 중복).
       · 제목이 같으면 3년(36개월) 안에는 다시 쓰지 않는다(같은 시기 같은 제목의 다른 사건 방지).
     나이대별 풀이 좁은 노년(한 나이에 17~18개)을 굶기지 않도록 기간을 두는 것이다.
     반복 이벤트 `repeatable` 은 일부러 여러 번 나오는 사건이라 예외다. */
  var TITLE_COOLDOWN = 36;

  function titleOfEvent(ev, s) {
    if (!ev) return '';
    var t = typeof ev.title === 'function' ? ev.title(s) : ev.title;
    return typeof t === 'string' ? t.trim() : '';
  }

  function contentKeyOf(ev, s) {
    if (!ev) return '';
    var t = typeof ev.text === 'function' ? ev.text(s) : ev.text;
    return titleOfEvent(ev, s) + '||' + (typeof t === 'string' ? t.trim() : '');
  }

  // 이미 겪은 '완전 중복 본문'(인생 전체)과 '최근 3년 제목'(같은 단계)
  function blockedInStage(s, stage) {
    var exact = {}, recent = {};
    for (var i = 0; i < s.used.length; i++) {
      var id = s.used[i];
      var e = byId(id);
      if (!e) continue;
      var t = titleOfEvent(e, s);
      if (!t) continue;
      // 본문까지 같으면 단계가 달라도 다시 쓰지 않는다(레거시·연쇄 세트의 같은 사건)
      exact[contentKeyOf(e, s)] = 1;
      if (e.stage === stage) {
        var last = s.lastSeen[id];
        if (last === undefined || s.turn - last < TITLE_COOLDOWN) recent[t] = 1;
      }
    }
    return { exact: exact, recent: recent };
  }

  /* ── 보상형 광고(프로토타입) ──
     되돌리기·다시 뽑기·긴급 회복의 '효과'만 엔진에 둔다.
     광고를 보여주는 부분은 assets/ads.js 의 showRewardedAd 훅이 맡는다. */
  var REWARD = {
    healAmount: 12,      // 긴급 회복량 (체력·멘탈 각각)
    healLimit: 3,        // 한 판에 회복 최대 횟수
    healThreshold: 30,   // 체력 또는 멘탈이 이 값 이하일 때만 활성화
    rerollLimit: 5       // 한 판에 다시 뽑기 최대 횟수
  };

  function canUndo(s) {
    return !!(s && s.undo && s.history && s.history.length);
  }

  function snapshotForUndo(s) {
    return {
      age: s.age, month: s.month, turn: s.turn, ended: s.ended,
      stats: Object.assign({}, s.stats),
      flags: Object.assign({}, s.flags),
      health: JSON.parse(JSON.stringify(s.health || { burden: 0, strain: 0, months: 0, level: 'ok' })),
      cameos: JSON.parse(JSON.stringify(s.cameos || [])),
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
    if (snap.health) s.health = JSON.parse(JSON.stringify(snap.health));
    if (Array.isArray(snap.cameos)) s.cameos = JSON.parse(JSON.stringify(snap.cameos));
    s.used = snap.used.slice();
    s.lastSeen = Object.assign({}, snap.lastSeen);
    s.queue = snap.queue.slice();
    s.history = s.history.slice(0, snap.historyLen);
    s.current = snap.current ? Object.assign({}, snap.current) : null;
    s.rngState = snap.rngState;
    return s.current ? currentEvent(s) : null;
  }

  /* 다시 뽑기 가능 여부 + 못 하는 이유
     · 선택을 하기 전에만
     · 마일스톤(수능·입학·취직처럼 인생이 갈리는 장면)은 다시 뽑지 않는다
     · 한 판에 5회까지 */
  function rerollState(s) {
    var left = REWARD.rerollLimit - (s && s.rewards && s.rewards.reroll ? s.rewards.reroll : 0);
    if (left < 0) left = 0;
    var block = null;
    if (!s || s.ended || !s.current) block = 'ended';
    else if (s.current.chosen !== null) block = 'chosen';
    else {
      var ev = s.current.event || byId(s.current.eventId);
      if (ev && ev.milestone) block = 'milestone';
    }
    if (!block && left <= 0) block = 'limit';
    return { ok: !block, left: left, block: block };
  }

  function canReroll(s) {
    return rerollState(s).ok;
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
    var rr = rerollState(s);
    return {
      canUndo: canUndo(s),
      canReroll: rr.ok,
      rerollLeft: rr.left,
      rerollBlock: rr.block,
      rerollLimit: REWARD.rerollLimit,
      canHeal: canHeal(s),
      healLeft: s && s.rewards ? REWARD.healLimit - s.rewards.heal : REWARD.healLimit,
      healAmount: REWARD.healAmount,
      healThreshold: REWARD.healThreshold
    };
  }

  /* ═════════════ 가문 · 유산 이어받기 ═════════════
     명예의 전당에 남긴 '내가 살았던 인생' 중 하나를 골라 그 집안의 자녀로 시작한다.
       · 재산 : 그 인생의 순재산 중 6%만 물려받는다(최대 2,500만원).
                한 번의 상속으로 판이 끝나지 않게, 그리고 '빚'은 물려받지 않게 0에서 끊는다.
       · 특성 : 그 인생의 가장 높은 능력치 하나에 +3 (가문의 재능)
       · 대수 : 부모가 1대면 나는 2대, 부모가 2대면 나는 3대 — 전당 기록에 대수를 남긴다.
       · 부모님이 이전 회차 인물과 부부였다면 '부모님: OO ♥ XX' 가문 소개가 붙고,
         두 사람은 이번 인생의 인연 후보에서 빠진다(부모와 연애할 수는 없으니까). */
  var LEGACY_RATE = 0.06;     // 순재산의 6%
  var LEGACY_CAP = 2500;      // 최대 2,500만원 (만원 단위)
  var LEGACY_BONUS = 3;       // 가문의 재능 +3
  var LEGACY_TRAIT = {
    hp: '몸이 튼튼한 집안',
    mental: '쉽게 흔들리지 않는 집안',
    charm: '눈에 띄는 집안',
    social: '사람이 따르는 집안',
    intel: '머리 쓰는 집안',
    luck: '운이 따르는 집안'
  };

  function ancestorInfo(rec) {
    if (!rec) return null;
    var st = rec.stats || {};
    var asset = typeof st.asset === 'number' ? st.asset : 0;
    var top = topStatOf(st) || { key: 'mental', label: '멘탈', value: 50 };
    var heir = asset > 0 ? Math.round(Math.min(asset * LEGACY_RATE, LEGACY_CAP)) : 0;
    var spouse = rec.cameo && rec.cameo.rel === 'married' && rec.cameo.name ? rec.cameo.name : null;
    return {
      recId: rec.id || null,
      name: rec.name,
      gender: rec.gender || guessGender(rec.name),
      gen: (typeof rec.generation === 'number' && rec.generation > 0 ? rec.generation : 1) + 1,
      key: rec.key || '',
      stageLabel: rec.stageLabel || '',
      age: rec.age || null,
      score: typeof rec.score === 'number' ? Math.round(rec.score) : null,
      grade: rec.grade || '',
      title: rec.title || '',
      asset: Math.round(asset),
      assetText: formatAsset(asset),
      heir: heir,
      heirText: formatAsset(heir),
      bonus: { key: top.key, label: top.label, amount: LEGACY_BONUS },
      trait: LEGACY_TRAIT[top.key] || '가문의 재능',
      family: spouse ? '부모님: ' + rec.name + ' ♥ ' + spouse : '부모님: ' + rec.name,
      spouse: spouse,
      scenario: rec.scenario || 'kr'
    };
  }

  // 전당에 남긴 내 기록 = 이어받을 수 있는 가문 (최근 것부터)
  function ancestorsOf() {
    var list;
    try { list = hallRecords().filter(function (r) { return r && r.mine && r.name; }); } catch (e) { return []; }
    list = list.slice().sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
    return list.map(ancestorInfo).filter(Boolean);
  }

  // opts.legacy 는 전당 기록 id 문자열 또는 그 객체
  function legacyOf(opts) {
    if (!opts) return null;
    var id = typeof opts === 'string' ? opts : opts.recId;
    if (!id) return null;
    var rec = null;
    try {
      var all = hallRecords();
      for (var i = 0; i < all.length; i++) { if (all[i].id === id) { rec = all[i]; break; } }
    } catch (e) { return null; }
    if (!rec || !rec.mine) return null;
    return ancestorInfo(rec);
  }

  function applyLegacy(s, legacy) {
    s.stats.asset = Math.round(s.stats.asset + legacy.heir);
    if (legacy.bonus && s.stats[legacy.bonus.key] !== undefined) {
      s.stats[legacy.bonus.key] = clamp(s.stats[legacy.bonus.key] + legacy.bonus.amount, 0, 100);
    }
    s.flags.가문_이어받음 = true;
    s.generation = legacy.gen;
    s.legacy = {
      recId: legacy.recId,
      from: legacy.name,
      gen: legacy.gen,
      heir: legacy.heir,
      heirText: legacy.heirText,
      bonus: { key: legacy.bonus.key, label: legacy.bonus.label, amount: legacy.bonus.amount },
      trait: legacy.trait,
      family: legacy.family,
      spouse: legacy.spouse,
      parentTitle: legacy.title,
      stageLabel: legacy.stageLabel
    };
    return s;
  }

  function legacyBrief(legacy) {
    if (!legacy) return null;
    return {
      from: legacy.from,
      gen: legacy.gen,
      heir: legacy.heir,
      heirText: legacy.heirText,
      trait: legacy.trait,
      bonus: legacy.bonus,
      family: legacy.family,
      spouse: legacy.spouse,
      stageLabel: legacy.stageLabel
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
      cameos: [],
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
      health: { burden: 0, strain: 0, months: 0, level: 'ok' },
      scenario: 'kr',
      generation: 1,
      legacy: null,
      createdAt: Date.now()
    };
    // 출발 시나리오 → 가문 유산 순서로 얹는다 (유산이 마지막에 더해져야 상속액이 그대로 남는다)
    applyScenario(s, scenarioOf(opts.scenario));
    var legacy = legacyOf(opts.legacy);
    if (legacy) applyLegacy(s, legacy);
    // 이전 회차의 인물 — 전당에 남은 내 기록에서 데려온다 (없으면 빈 배열)
    // 부모가 된 기록(가문 이어받기)은 부모님이므로 이번 인생의 인연 후보에서 뺀다
    s.cameos = pastCameos(s.name, legacy ? [legacy.name, legacy.spouse] : []);
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
        var beforeAsset = s.stats.asset;
        var nextAsset = Math.round(beforeAsset + v);
        // 미성년자는 빚을 질 수 없다 — 어릴 적 문방구·간식 값이 통장을 마이너스로 만들지 않게.
        // (시나리오가 일부러 빚에서 시작한 경우(흙수저 −150)는 그 빚을 그대로 둔다)
        if (s.age < 20 && beforeAsset >= 0 && nextAsset < 0) nextAsset = 0;
        s.stats.asset = nextAsset;
        if (nextAsset !== beforeAsset) deltas.asset = (deltas.asset || 0) + (nextAsset - beforeAsset);
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
    // 이전 회차 인물과의 관계 진행 (cameoRel) — 결과 판정과 같은 상태를 읽는다
    if (ev.cameo && choice.cameoRel) {
      var relSpec = typeof choice.cameoRel === 'function' ? choice.cameoRel(s) : choice.cameoRel;
      var cameoIdx = typeof choice.cameoIndex === 'number' ? choice.cameoIndex : 0;
      setCameoRel(s, cameoIdx, relSpec);
    }
    var deltas = resolveEffects(s, choice.effects);
    if (branch && branch.effects) mergeDeltas(deltas, resolveEffects(s, branch.effects));
    // 위험한 몸으로 무리했는가 (체력이 위험 구간인데 −3 이상 깎은 선택)
    noteStrain(s, s.undo ? s.undo.stats.hp : s.stats.hp);
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
      cameo: !!ev.cameo,
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

  /* ── 살림 장부(연간 수지) ──
     지금까지 재산은 '이벤트가 준 만큼'만 움직였다. 그런데 사건은 대개 돈이 나가는 쪽이고
     (−62만원/사건) 들어오는 쪽은 드물어서, 80세까지 가면 재산이 −3억을 넘었다(전수조사 실측).
     그래서 매년 생일에 한 번, 그해의 수입과 지출을 정산한다(연봉 정산).
       · 수입: 직업별 연 수입 × 경력 곡선(30대 1.2 · 40대 1.35 · 50대 1.25)
       · 지출: 본인 생활비 + 배우자 + 자녀 수 + 집(대출 이자) + 차
       · 60세 이후(또는 은퇴·명퇴)는 연금으로 바뀌고, 자녀가 독립했으면 자녀 지출이 빠진다
     값은 만원 단위다. 무직·준비생은 수입 0에 생활비만 나가고, 학창 시절(25세 미만)은 부모가
     부양하던 시기라 장부를 쓰지 않는다(어릴 때 통장이 빚으로 시작하지 않게).
     ─────────────────────────────────────────────────────────── */
  var LEDGER = {
    // 직업별 연 수입(만원) — 25세 기준값. 경력 곡선을 곱한다.
    // 값은 '생활비를 빼기 전' 연 수입(만원)이다. 25세 대기업 기준 2,600 − 생활비 780 = 연 +1,820만원이라
    // 25세 시작(850만)이 35세에 약 1억 근처가 되고, 가정을 꾸리면 지출이 늘어 수지가 0 근처로 내려간다.
    // (수십 회 시뮬레이션으로 80세 잔액 중앙값이 1억 안팎이 되게 맞췄다 — tools/tune-ledger.js)
    income: {
      '대기업 기획자': 2600, '스타트업 개발자': 2300, '공무원': 2100, '중소기업 사원': 1800,
      '자영업자': 1900, '프리랜서': 1650, '교사': 2200, '의사': 4200, '연구원': 2300,
      '예술가': 1100, '작가': 1000, '요리사': 1750, '프로게이머': 1500, '체육인': 1600,
      '스타트업 창업자': 1950, '대학원생': 900, '군인': 1750, '무직': 0
    },
    incomeDefault: 1750,       // 위 목록에 없는 직업
    curve: [                   // 나이대별 경력 곡선(연봉 인상·정체)
      { from: 25, to: 29, mul: 1.0 },
      { from: 30, to: 39, mul: 1.2 },
      { from: 40, to: 49, mul: 1.35 },
      { from: 50, to: 59, mul: 1.25 },
      { from: 60, to: 200, mul: 1.0 }
    ],
    pension: 1450,             // 60세 이후 연금(국민연금 + 퇴직연금 연평균)
    living: 780,               // 본인 생활비
    spouse: 340,               // 배우자와 함께 사는 집의 생활비
    child: 380,                // 자녀 1명당(최대 2명까지 센다)
    home: 380,                 // 집이 있으면 드는 대출 이자·관리비
    car: 170                  // 차가 있으면 드는 유지비
  };
  var LEDGER_FROM = 25;        // 이 나이의 생일부터 장부를 쓴다
  var PENSION_FROM = 60;       // 이 나이부터는 연금 생활(국민연금 개시 — 54~59세는 '2막')

  function jobIncomeOf(job) {
    if (!job) return 0;
    if (LEDGER.income[job] !== undefined) return LEDGER.income[job];
    return LEDGER.incomeDefault;
  }

  function ledgerCurve(age) {
    for (var i = 0; i < LEDGER.curve.length; i++) {
      if (age >= LEDGER.curve[i].from && age <= LEDGER.curve[i].to) return LEDGER.curve[i].mul;
    }
    return 1;
  }

  // 그해의 수입·지출·수지 (만원). 25세 미만이면 null.
  /* ── 54~59세의 '인생 2막' ──
     명퇴·은퇴를 고르면 예전에는 곧바로 연금 수입으로 바뀌어 26년이 고정됐다.
     국민연금은 60세부터이므로, 그 전 6년은 2막의 수입으로 산다.
       · 재취업   : 새 일터의 연봉(경력 곡선 × 0.85 — 예전만큼은 아니다)
       · 프리랜서 : 프리랜서 연 수입 × 경력 곡선
       · 창업     : 자영업 연 수입 × 경력 곡선
       · 안식·구직: 수입 0 — 퇴직금과 모아 둔 돈으로 버틴다
     60세부터는 연금. 단 가게를 굴리는 사람은 그 수입이 연금보다 크면 그대로 간다. */
  function ledgerOf(s) {
    if (!s || !s.stats || s.age < LEDGER_FROM) return null;
    var f = s.flags || {};
    var pensionAge = s.age >= PENSION_FROM;
    var leftCompany = !!(f.은퇴 || f.명퇴);      // 회사를 나온 사람
    var second = leftCompany && !pensionAge;     // 54~59세: 퇴직금과 2막으로 사는 6년
    var job = f.직업 || null;
    var income = 0, label = '무직';

    if (pensionAge) {
      // 가게를 계속 굴리면 그 수입이 연금보다 크다 — 다만 나이가 들면 매출도 줄어든다
      if (f.창업 && !f.사업정리) { income = Math.round(jobIncomeOf('자영업자') * 0.8); label = '자영업'; }
      else { income = LEDGER.pension; label = '연금'; }
    } else if (second) {
      if (f.재취업) {
        income = Math.round(jobIncomeOf(job || '중소기업 사원') * ledgerCurve(s.age) * 0.85);
        label = '재취업';
      } else if (f.프리랜서_2막) {
        income = Math.round(jobIncomeOf('프리랜서') * ledgerCurve(s.age));
        label = '프리랜서';
      } else if (f.창업) {
        income = Math.round(jobIncomeOf('자영업자') * ledgerCurve(s.age));
        label = '자영업';
      } else {
        income = 0;                             // 안식·구직 — 퇴직금으로 버틴다
        label = '2막 준비';
      }
    } else if (f.창업 && !job) {
      income = Math.round(jobIncomeOf('자영업자') * ledgerCurve(s.age));
      label = '자영업';
    } else if (job) {
      income = Math.round(jobIncomeOf(job) * ledgerCurve(s.age));
      label = job;
    }

    var kids = Math.min(2, Math.max(0, Number(f.자녀수) || 0));
    // 자녀가 독립했으면(자녀_독립) 자녀 지출을 더하지 않는다
    if (f.자녀_독립) kids = 0;
    var cost = LEDGER.living;
    if (f.결혼) cost += LEDGER.spouse;
    if (pensionAge) {
      // 연금 생활: 자녀는 이미 독립했고, 집 대출은 줄고 차는 팔거나 줄인다
      cost += Math.round(LEDGER.home * 0.5 * (f.집있음 ? 1 : 0));
      cost += Math.round(LEDGER.living * 0.05);     // 병원·약값이 생활비에 조금 더 붙는다
    } else if (second) {
      // 2막에도 아이 교육·집·차는 그대로다. 다만 대출과 차량 부담은 조금 줄어든다
      cost += LEDGER.child * kids;
      if (f.집있음) cost += Math.round(LEDGER.home * 0.7);
      if (f.차있음 || f.전기차) cost += Math.round(LEDGER.car * 0.6);
      cost += Math.round(LEDGER.living * 0.03);
    } else {
      // 일하는 동안: 자녀 교육·생활비와 집 대출·차 유지비가 그대로 나간다
      cost += LEDGER.child * kids;
      if (f.집있음) cost += LEDGER.home;
      if (f.차있음 || f.전기차) cost += LEDGER.car;
    }
    return {
      income: income, cost: cost, net: income - cost,
      retired: pensionAge || leftCompany, pension: pensionAge, second: second, job: label
    };
  }

  // 생일마다 장부를 반영한다. 앱은 돌려받은 값을 '연 수지' 안내에 쓴다.
  function applyLedger(s) {
    var info = ledgerOf(s);
    if (!info) return null;
    if (info.net) s.stats.asset = Math.round(s.stats.asset + info.net);
    return info;
  }

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

  /* ── 해마다 바뀌는 운 ──
     행운은 선택으로만 오르내리면 거의 움직이지 않는 값이 된다(50 근처에 머문다).
     생일마다 ±3 정도 흔들리고, 흔들린 값은 50 쪽으로 조금씩 당겨진다.
     (운이 계속 극단으로 달리지 않으면서도 사람마다 다른 폭을 갖게 하는 장치) */
  var LUCK_DRIFT = 3;
  function applyLuckDrift(s) {
    if (s.stats.luck === undefined) return;
    var pull = (50 - s.stats.luck) * 0.12;
    s.stats.luck = clamp(s.stats.luck + pull + randInt(s, -LUCK_DRIFT, LUCK_DRIFT), 0, 100);
  }

  /* ── 최고치 유지 ──
     88을 넘긴 스탯만 아주 천천히 88 쪽으로 내려간다.
     (한 달에 최대 1.4 정도 · 보통 스탯에는 전혀 영향이 없다.)
     역량·행운도 같은 규칙을 따른다 — 머리도 운도 방치하면 조금씩 식는다. */
  var UPKEEP = { from: 88, rate: 0.12 };
  function applyUpkeep(s) {
    GAUGE_KEYS.forEach(function (key) {
      var cur = s.stats[key];
      if (cur === undefined || cur <= UPKEEP.from) return;
      s.stats[key] = clamp(cur + (UPKEEP.from - cur) * UPKEEP.rate, 0, 100);
    });
  }

  /* ═════════════ 건강 위기 · 조기 엔딩 ═════════════
     예전에는 체력이 0이 되어도 80세까지 갔다. 이제는 위험한 몸이 이어지면
     '건강 악화' 조기 엔딩으로 이어진다 — 단, 억울한 즉사가 아니라
     경고를 여러 번 주고, 대처할 선택지(휴식·병원·긴급 회복)를 먼저 내민다.
       · warnHp 28 이하 : '몸이 보내는 신호' 사건이 매달 먼저 뜬다(회복 선택지)
       · dangerHp 18 이하: 위험한 달 1점 · criticalHp 10 이하 2점 · 체력 0은 3점
       · 무리(체력 30 이하에서 체력을 3 이상 깎는 선택) 1회 = 1점
       · 누적 7점이면 인생이 여기서 끝난다(체력 0으로 3개월, 10 이하로 3~4개월 꼴)
       · 몸을 회복하면(28 초과) 매달 2점씩 풀린다 — 쉬면 살아난다
     '사람처럼' 플레이하면 거의 완주하고, 회복을 외면하고 계속 무리하면 일찍 끝난다.
     기준은 2026-11-24 밤에 한 단계 올렸다(22/12/5 · 8점 → 28/18/10 · 7점) —
     건강을 조금만 소홀히 해도 경고를 마주치고, 외면하면 실제로 일찍 끝나는 선. */
  var HEALTH = {
    warnHp: 28,
    dangerHp: 18,
    criticalHp: 10,
    zeroHp: 0,
    strainHp: 30,        // 이 이하로 지친 몸에 무리(−3 이상)를 또 얹으면 부담이 쌓인다
    burdenLimit: 7,
    recover: 2
  };

  function healthInit(s) {
    if (!s.health || typeof s.health !== 'object') {
      s.health = { burden: 0, strain: 0, months: 0, level: 'ok' };
    }
    var h = s.health;
    if (typeof h.burden !== 'number' || isNaN(h.burden)) h.burden = 0;
    if (typeof h.strain !== 'number' || isNaN(h.strain)) h.strain = 0;
    if (typeof h.months !== 'number' || isNaN(h.months)) h.months = 0;
    if (typeof h.level !== 'string') h.level = 'ok';
    return h;
  }

  // 이번 달 체력이 몸에 남기는 부담
  function healthRiskOf(hp) {
    if (hp <= HEALTH.zeroHp) return 3;
    if (hp <= HEALTH.criticalHp) return 2;
    if (hp <= HEALTH.dangerHp) return 1;
    return 0;
  }

  function healthLevelOf(hp) {
    if (hp <= HEALTH.criticalHp) return 'critical';
    if (hp <= HEALTH.dangerHp) return 'danger';
    if (hp <= HEALTH.warnHp) return 'warn';
    return 'ok';
  }

  // 상태를 읽기만 한다(앱·검사가 쓴다)
  function healthOf(s) {
    if (!s) return null;
    var h = healthInit(s);
    var hp = s.stats ? s.stats.hp : 100;
    return {
      level: healthLevelOf(hp),
      hp: Math.round(hp),
      burden: h.burden,
      strain: h.strain,
      months: h.months,
      limit: HEALTH.burdenLimit,
      left: Math.max(0, HEALTH.burdenLimit - h.burden)
    };
  }

  /* 지친 몸(체력 30 이하)에서 무리한 선택(체력 −3 이상)을 하면 부담이 하나 더 쌓인다.
     '회복 없이 무리할 때' 일찍 끝나는 이유가 이것이다. */
  function noteStrain(s, hpBefore) {
    if (!s || s.ended || !s.stats) return;
    if (hpBefore > HEALTH.strainHp) return;
    var lost = hpBefore - s.stats.hp;
    if (lost < 3) return;
    var h = healthInit(s);
    h.strain += 1;
    h.burden = Math.min(HEALTH.burdenLimit + 3, h.burden + 1);
  }

  // 한 달이 시작될 때 몸의 누적 부담을 갱신하고, 한계를 넘으면 조기 엔딩
  function applyHealth(s) {
    if (!s || !s.stats) return null;
    var h = healthInit(s);
    var prevLevel = h.level;
    var hp = s.stats.hp;
    var risk = healthRiskOf(hp);
    if (risk) {
      h.burden = Math.min(HEALTH.burdenLimit + 3, h.burden + risk);
      h.months += 1;
    } else {
      // 몸을 쉬면 부담이 풀린다 — 위험 구간을 벗어나면 빨리, 아직 지친 상태면 천천히
      h.burden = Math.max(0, h.burden - (hp > HEALTH.warnHp ? HEALTH.recover : 1));
      h.months = 0;
      if (hp > HEALTH.strainHp) h.strain = 0;
    }
    var level = healthLevelOf(hp);
    h.level = level;
    var info = {
      level: level,
      changed: level !== prevLevel,
      previous: prevLevel,
      hp: Math.round(hp),
      burden: h.burden,
      strain: h.strain,
      months: h.months,
      limit: HEALTH.burdenLimit,
      left: Math.max(0, HEALTH.burdenLimit - h.burden),
      ended: false
    };
    if (h.burden >= HEALTH.burdenLimit && s.age <= END_AGE && !s.ended) {
      s.ended = true;
      s.endingKind = 'health';
      s.current = null;
      info.ended = true;
      registerLife(s, 'health');
    }
    return info;
  }

  /* ── 건강 사건(휴식·병원) 고르기 ──
     `health: true` 로 표시한 사건 중 지금 체력에서 열리는 것 하나.
     급할수록 강한 사건(응급실)을 먼저 내밀고, 같은 사건은 두 달 연속 내밀지 않는다. */
  function healthEventFor(s) {
    var list = allEvents(), best = null, i;
    for (i = 0; i < list.length; i++) {
      var ev = list[i];
      if (!ev.health || !passes(ev, s)) continue;
      if (!ev.repeatable && used(s, ev.id)) continue;
      var last = s.lastSeen[ev.id];
      if (ev.repeatable && last !== undefined && s.turn - last < 2) continue;
      // crisisHp 가 작을수록 급한 사건이다 — 지금 체력에서 열리는 것 중 가장 급한 것을 고른다
      if (!best || (ev.crisisHp || 0) < (best.crisisHp || 0)) best = ev;
    }
    return best;
  }

  /* ── 행운의 몫 ──
     미니 승부(동전·가위바위보·주사위·카드)에서 행운 50을 기준으로
     승률을 -0.25 ~ +0.25 만큼 밀어 준다. 행운 100 이면 승률 75%, 0 이면 25%.
     (미니게임 화면과 테스트가 같은 함수를 쓴다) */
  var LUCK_SPAN = 0.25;
  function luckBias(stats) {
    var v = stats && typeof stats.luck === 'number' ? stats.luck : 50;
    return clamp((v - 50) / 50, -1, 1) * LUCK_SPAN;
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
    if (birthday) { applyAging(s); applyLuckDrift(s); }
    // 연 수지 정산(직장 생활 이후) — 생일에 한 번
    var ledger = birthday ? applyLedger(s) : null;
    // 몸의 누적 부담 — 위험한 달이 이어지면 여기서 인생이 끝난다
    var health = s.age <= END_AGE ? applyHealth(s) : null;

    if (s.ended) {
      return { ok: true, ended: true, birthday: birthday, graduation: null, ledger: ledger, health: health };
    }

    if (s.age > END_AGE) {
      s.ended = true;
      s.endingKind = 'life';
      s.current = null;
      registerLife(s);
      return { ok: true, ended: true, birthday: birthday, graduation: null, ledger: ledger };
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
    return { ok: true, ended: false, birthday: birthday, event: ev, graduation: gradDef ? gradDef.key : null, ledger: ledger, health: health };
  }

  /* ── 저장 ── */
  function save(s) {
    try { global.localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) {}
  }

  // 예전 저장본을 지금 모양으로 옮긴다 (v1 일차 → v2 개월차 → v3 졸업 결산 → v4 역량·행운)
  function dayToMonth(d) {
    if (typeof d !== 'number' || isNaN(d)) return 1;
    if (d === 1) return 1;
    return clamp(Math.round(d / 30) + 1, 1, MONTHS);
  }

  // 역량·행운이 없던 저장본은 50으로 채운다 (진행 중이던 인생이 끊기지 않게)
  function backfillStats(st) {
    if (!st) return st;
    if (typeof st.intel !== 'number' || isNaN(st.intel)) st.intel = 50;
    if (typeof st.luck !== 'number' || isNaN(st.luck)) st.luck = 50;
    st.intel = clamp(st.intel, 0, 100);
    st.luck = clamp(st.luck, 0, 100);
    return st;
  }

  function migrate(s) {
    if (!s) return s;
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
    backfillStats(s.stats);
    if (s.undo) backfillStats(s.undo.stats);
    if (s.grad && s.grad.stats) backfillStats(s.grad.stats);
    // 건강 위기(2026-11-24) — 예전 저장본은 0에서 시작한다
    healthInit(s);
    if (s.undo) healthInit(s.undo);
    // v5: 이전 회차 인물 — 예전 저장본은 불러올 때 전당에서 데려온다
    if (!Array.isArray(s.cameos)) s.cameos = pastCameos(s.name);
    // 2026-11-20: 출발 시나리오·가문 유산 (예전 저장본은 기본값으로 이어 간다)
    if (!s.scenario || !SCENARIO_BY_ID[s.scenario]) s.scenario = 'kr';
    if (s.legacy === undefined) s.legacy = null;
    if (typeof s.generation !== 'number' || s.generation < 1) {
      s.generation = s.legacy && s.legacy.gen ? s.legacy.gen : 1;
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
      when: function (f) { return (f.자녀수 || 0) >= 2 && !f.창업 && !f.예술가_길; } },

    /* ── 능력치로 갈리는 얼굴 ──
       역량·행운은 플래그와 다른 축이라 whenState 로 본다.
       플래그만으로 정해지는 갈래가 있으면 그쪽이 먼저다(신호 개수가 같으면 위가 이긴다). */
    { key: 'genius',   emoji: '🧠', label: '머리로 길을 만든 사람',
      variants: ['한 번 익힌 것은 잊지 않은 사람', '모르는 것을 끝까지 파고든 사람'],
      signals: ['코딩_전문', '학회_논문', '개발_길', '연구원_길'],
      whenState: function (s) { return s.stats.intel >= 90; } },
    { key: 'lucky',    emoji: '🍀', label: '행운을 끝까지 들고 간 사람',
      variants: ['마지막 한 수가 늘 통한 사람', '운이 한 번씩 문을 열어 준 사람'],
      signals: ['청약당첨', '복권', '투자_경험'],
      whenState: function (s) { return s.stats.luck >= 90; } },
    { key: 'rainy',    emoji: '🌧️', label: '운이 비켜 갈 때 버틴 사람',
      variants: ['한 끗이 늘 모자랐던 사람', '복은 남에게 갔지만 하루는 내가 산 사람'],
      signals: ['주식손실', '창업_실패', '청약_포기'],
      whenState: function (s) { return s.stats.luck <= 22; } }
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
      try {
        hit = !!(typeof a.when === 'function' ? a.when(s.flags) : false) ||
          !!(typeof a.whenState === 'function' && s.stats ? a.whenState(s) : false);
      } catch (e) { hit = false; }
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
    if (f.안식) return '명퇴 뒤 쉼을 택한';
    if (f.재취업) return '두 번 일한';
    if (f.프리랜서_2막) return '프리랜서로 이어간';
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
    if (st.luck <= 32) return '운이 비켜 간';
    if (st.intel >= 85) return '머리로 풀어낸';
    if (st.mental >= 85) return '멘탈이 강철인';
    if (f.재수생) return '한 번 더 도전한';
    return '평범하게 살아낸';
  }

  /* 나이대 기본 호칭 — 직업이 없을 때 전부 'K-청년' 으로 뭉개지 않게 나이·상태로 나눈다.
     (1세 인생 요약이 '평범하게 살아낸 K-청년' 으로 찍히던 문제) */
  function ageNoun(age, f) {
    f = f || {};
    if (!isFinite(age)) return 'K-청년';
    if (age <= 4) return '아기';
    if (age <= 7) return '유치원생';
    if (age <= 13) return '초등학생';
    if (age <= 16) return '중학생';
    if (age <= 19) return '고등학생';
    if (age <= 24) {
      if (f.대학원_진학) return '대학원생';
      // 수능·전문대 진학 흔적이 있으면 재학 중으로 본다
      if (f.수능_명문 || f.수능_지방 || f.전문대) return '대학생';
      return '청년';
    }
    if (age <= 34) return 'K-청년';
    if (age <= 49) return '중년';
    if (age <= 64) return '장년';
    return '시니어';
  }

  function careerPhrase(s) {
    var job = s.flags.직업;
    if (job) return CAREER_NOUN[job] || job;
    return ageNoun(s.age, s.flags);
  }

  function buildTitle(s) {
    var arch = archetypeOf(s);
    if (arch) return originPhrase(s) + ' ' + arch.label;
    return originPhrase(s) + ' ' + modifierPhrase(s) + ' ' + careerPhrase(s);
  }

  /* ── 인생 점수 ──
     능력치 평균(0~100) 에 0.25, 재산 점수(0~65) 에 1, 마일스톤 하나에 0.3 을 준다.
     · 살림 장부(2026-11-24) 전에는 재산이 늘 마이너스라 재산 점수가 0이었고,
       그래서 능력치만 좋으면 S 가 나왔다(전수조사: 312회 중 294회가 S).
     · 이제 재산이 살아 있는 값이므로 비중을 올리고 등급선을 다시 잡았다.
       실측 기준(80세 최종 재산): 5천만 안팎 B · 1~3억 A · 5억 이상 S · 빚으로 마치면 D.
       (능력치는 88~92에 몰려 변별력이 없어 비중을 낮추고, 재산 눈금을 넓게 잡았다) */
  function gradeOf(s) {
    var st = s.stats;
    var gauge = gaugeAvg(st);
    // 재산 점수는 20억에서 만점 — 4억에서 만점이던 때는 절반이 상한에 붙어 등급이 갈리지 않았다
    // 재산 점수는 20억에서 만점이되, 곡선을 아래로 볼록하게(제곱) 둔다 —
    // 로그만 쓰면 1억도 만점의 75%를 받아 등급이 위로 몰렸다.
    var assetNorm = st.asset > 0 ? Math.log10(st.asset + 1) / 5.3 : 0;
    var assetScore = clamp(assetNorm * assetNorm * 65, 0, 65);
    var score = gauge * 0.25 + assetScore + (s.history.filter(function (h) { return h.milestone; }).length * 0.3);
    score = clamp(score, 0, 100);
    if (score >= 78) return { grade: 'S', label: '전설의 인생', score: score };
    if (score >= 70) return { grade: 'A', label: '성공한 인생', score: score };
    if (score >= 63) return { grade: 'B', label: '탄탄한 인생', score: score };
    if (score >= 52) return { grade: 'C', label: '평범한 인생', score: score };
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
    '2막': '인생 2막', '재취업': '재취업', '프리랜서_2막': '프리랜서 2막', '안식': '안식',
    '퇴직금_정산': '퇴직금 정산', '정년_선택': '정년까지 재직',
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

    var highlights = s.history.slice().sort(byImpact).slice(0, 3);

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
      cameo: cameoSummary(s),
      career: s.flags.직업 || null,
      ending: s.endingKind || null,
      healthEnd: s.endingKind === 'health',
      health: healthOf(s),
      scenario: scenarioBrief(s.scenario),
      generation: s.generation || 1,
      legacy: legacyBrief(s.legacy)
    };
  }

  function buildOneLiner(s, g) {
    var st = s.stats;
    var parts = [];
    parts.push('체력 ' + Math.round(st.hp) + ', 멘탈 ' + Math.round(st.mental) +
      ', 매력 ' + Math.round(st.charm) + ', 호감도 ' + Math.round(st.social));
    parts.push('역량 ' + Math.round(st.intel) + ', 행운 ' + Math.round(st.luck));
    parts.push('남은 재산은 ' + formatAsset(st.asset));
    var tail = [];
    if (st.intel >= 80) tail.push('머리로 풀어낸 일이 많고');
    else if (st.intel <= 35) tail.push('머리보다 몸으로 부딪혀 왔고');
    if (st.luck >= 80) tail.push('웃을 일이 한 번씩은 생겼습니다');
    else if (st.luck <= 30) tail.push('운은 유난히 비켜 갔습니다');
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

  // 종합 점수(0~100) — 여섯 게이지 평균 55점 + 재산 45점. 졸업 비교·전당 점수에 공통으로 쓴다.
  function scoreOfStats(st) {
    var gauge = gaugeAvg(st);
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
    // 유아기(1~7세)의 마일스톤은 인생에서의 무게가 작다 — 같은 4점을 주면
    // 매 판 '1세 조리원 퇴소'가 하이라이트 1번을 차지한다.
    if (h.milestone) impact += (h.age <= 7 ? 1 : 4);
    return impact;
  }

  // 하이라이트 정렬: 점수가 같으면 뒤에 겪은 사건을 앞세운다(인생은 뒤로 갈수록 굵어진다)
  function byImpact(a, b) {
    var d = impactOf(b) - impactOf(a);
    if (Math.abs(d) > 1e-9) return d;
    if (b.age !== a.age) return b.age - a.age;
    if (b.month !== a.month) return b.month - a.month;
    return (b.turn || 0) - (a.turn || 0);
  }

  function statSnapshot(st) {
    return { hp: st.hp, mental: st.mental, charm: st.charm, social: st.social,
      intel: st.intel, luck: st.luck, asset: st.asset };
  }

  function diffText(key, diff) {
    if (diff === null || diff === undefined) return '';
    if (key === 'asset') return (diff >= 0 ? '+' : '-') + formatAsset(Math.abs(diff));
    return (diff >= 0 ? '+' : '') + diff;
  }

  /* ── 졸업 결산 정보 ── */
  /* ── 졸업식 문구 ──
     24세 졸업식은 '대학교 졸업식'으로 고정돼 있었다.
     전문대에 간 사람, 대학에 가지 않고 일찍 길을 고른 사람에게도 같은 문구가 나오면 어색하다.
     그 사람이 실제로 걸어온 길에 맞춰 이름·라벨·설명만 바꿔 준다(점수·전당 키는 그대로 college). */
  function gradDefFor(s, def) {
    if (!def || def.key !== 'college') return def;
    var f = (s && s.flags) || {};
    if (f.전문대) {
      return Object.assign({}, def, {
        emoji: '🎓', name: '전문대 졸업식', label: '전문대 졸업 엔딩', short: '전문대 졸업',
        years: 2, sub: '전문대 2년', stageLabel: '전문대'
      });
    }
    if (!(f.수능_명문 || f.수능_지방 || f.대학생 || f.대졸 || f.대학원_진학)) {
      return Object.assign({}, def, {
        emoji: '🧭', name: '스무 살의 결산', label: '스무 살 결산 엔딩', short: '스무 살 결산',
        years: 5, sub: '대학 대신 일찍 고른 길', stageLabel: '스무 살', recallKey: 'twenties'
      });
    }
    return def;
  }

  function gradInfo(s) {
    if (!s || !s.grad) return null;
    var def = gradDefFor(s, GRAD_BY_KEY[s.grad.key]);
    if (!def) return null;
    var st = s.grad.stats || statSnapshot(s.stats);
    var stage = stageOf(def.age);
    var entries = (s.history || []).filter(function (h) { return h.age >= stage.from && h.age <= stage.to; });
    var highlights = entries.slice().sort(byImpact).slice(0, 3);

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
  // 시드(가상 인물) 규칙이 바뀌면 올린다 — 이미 시드된 기기의 가상 인물 기록만 새 제목으로 맞춘다.
  //   2: 나이대 호칭 세분화(유치원생·초등학생·… )로 예전 'K-청년' 제목이 남아 있던 것을 정리
  var HALL_SEED_REV = 2;
  function hallSeed(d) {
    var seeds = global.LIFE_HALL_SEEDS || [];
    if (!d.seeded) {
      for (var i = 0; i < seeds.length; i++) {
        var sd = seeds[i], dup = false;
        for (var j = 0; j < d.records.length; j++) { if (d.records[j].id === sd.id) { dup = true; break; } }
        if (!dup) d.records.push(Object.assign({}, sd));
      }
      d.seeded = true;
      d.seedRev = HALL_SEED_REV;
      return d;
    }
    // 이미 시드된 기기 — 내 기록·순위는 그대로 두고 가상 인물(seed:true)의 제목만 갱신한다
    if (d.seedRev !== HALL_SEED_REV) {
      var byId = {};
      for (var k = 0; k < seeds.length; k++) byId[seeds[k].id] = seeds[k];
      for (var m = 0; m < d.records.length; m++) {
        var r = d.records[m], sd2 = r && r.seed ? byId[r.id] : null;
        if (sd2 && r.title !== sd2.title) r.title = sd2.title;
      }
      d.seedRev = HALL_SEED_REV;
    }
    return d;
  }
  function hallRecords() {
    var d = hallState();
    if (!d.seeded || d.seedRev !== HALL_SEED_REV) { hallSeed(d); hallWrite(d); }
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
  // 새 기록이 전당에 들어갔다는 사실을 앱(전체 랭킹 등)에 알린다
  function hallEmit(rec) {
    try {
      if (typeof global.dispatchEvent === 'function' && typeof global.CustomEvent === 'function') {
        global.dispatchEvent(new global.CustomEvent('life-sim-hall-add', { detail: rec }));
      }
    } catch (e) { /* 이벤트를 못 쓰는 환경(테스트 등)에서는 조용히 넘어간다 */ }
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
    hallEmit(rec);
    return rec;
  }
  function hallMine() {
    return hallSorted(hallRecords().filter(function (r) { return r.mine; }));
  }
  function hallBestMine() {
    return hallMine()[0] || null;
  }

  /* ═════════════ 이전 회차 인물 (공유 세계관 · 카메오) ═════════════
     명예의 전당에 남은 '내가 살았던 인생'의 인물이 다음 인생의 세계에 나타난다.
       · 후보  : 전당 기록 중 내 기록(r.mine). 이름이 지금 플레이어와 같으면 뺀다(나를 만나지 않게).
       · 인원  : 최근 기록부터 최대 3명(같은 이름은 최신 한 번만).
       · 관계  : none → friend(친구) → close(단짝) / dating(연인) → married(부부), 또는 parted(스쳐 간 인연).
       · 기록  : s.cameos[i].rel 에 남고, 일지·요약·전당 기록에 함께 실린다.
     gender가 없던 옛 전당 기록은 이름 끝자리로 짐작한다(같은 이름은 늘 같은 결과). */
  var CAMEO_MAX = 3;
  var CAMEO_REL_LABEL = {
    none: '아직 만나지 않음', friend: '친구', close: '단짝',
    dating: '연인', married: '부부', parted: '스쳐 간 인연'
  };
  var FEMALE_TAILS = '연 희 숙 자 미 혜 라 나 슬 빈 옥 순 화 솔 별 봄 린 아'.split(' ');
  var MALE_TAILS = '훈 준 호 석 철 욱 혁 환 범 찬 규 구 만 동 식 봉 길 성'.split(' ');

  function guessGender(name) {
    var n = String(name || '').replace(/\s+/g, '');
    if (!n) return '';
    var last = n.charAt(n.length - 1);
    var female = FEMALE_TAILS.indexOf(last) !== -1;
    var male = MALE_TAILS.indexOf(last) !== -1;
    if (female && !male) return '여';
    if (male && !female) return '남';
    var h = 0;
    for (var i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
    return h % 2 ? '여' : '남';
  }

  var TOP_VIBE = {
    hp: '몸을 먼저 움직이는 사람',
    mental: '무슨 일에도 표정이 잘 안 흔들리는 사람',
    charm: '눈에 띄는 사람',
    social: '누구와도 금방 친해지는 사람',
    intel: '무엇이든 이해가 빠른 사람',
    luck: '웬만한 일은 운으로 넘기는 사람'
  };

  function topStatOf(st) {
    var best = null;
    GAUGE_KEYS.forEach(function (k) {
      var v = st && typeof st[k] === 'number' ? st[k] : 0;
      if (!best || v > best.value) best = { key: k, label: STAT_META[k].label, value: Math.round(v) };
    });
    return best;
  }

  function wealthOf(asset) {
    var a = Math.round(asset || 0);
    if (a < 0) return { key: 'debt', noun: '빚' };
    if (a >= 30000) return { key: 'rich', noun: '억대 재산' };
    if (a >= 10000) return { key: 'well', noun: '만만찮은 재산' };
    if (a >= 1000) return { key: 'mid', noun: '천만원대 재산' };
    if (a > 0) return { key: 'small', noun: '소박한 살림' };
    return { key: 'bare', noun: '빈손' };
  }

  function cameoFromRecord(rec) {
    var st = rec.stats || {};
    var asset = typeof st.asset === 'number' ? st.asset : 0;
    return {
      recId: rec.id || null,
      name: rec.name,
      gender: rec.gender || guessGender(rec.name),
      title: rec.title || '',
      stageLabel: rec.stageLabel || (rec.key === 'life80' ? '80세 완주' : ''),
      age: rec.age || null,
      score: typeof rec.score === 'number' ? Math.round(rec.score) : null,
      grade: rec.grade || '',
      stats: {
        hp: Math.round(st.hp || 0), mental: Math.round(st.mental || 0),
        charm: Math.round(st.charm || 0), social: Math.round(st.social || 0),
        intel: Math.round(st.intel || 0), luck: Math.round(st.luck || 0),
        asset: Math.round(asset)
      },
      top: topStatOf(st),
      wealth: wealthOf(asset),
      rel: 'none',
      met: false
    };
  }

  // 이름이 같은 사람은 만나지 않는다 — 지금 플레이어와 겹치면 후보에서 뺀다
  // excludeNames: 가문을 이어받았을 때 부모가 된 이름(부모와 연애할 수는 없으니까)
  function pastCameos(name, excludeNames) {
    var list;
    try { list = hallRecords().filter(function (r) { return r && r.mine && r.name; }); } catch (e) { return []; }
    list = list.slice().sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
    var mineName = String(name || '').replace(/\s+/g, '');
    var skip = {};
    (excludeNames || []).forEach(function (n) {
      var k = String(n || '').replace(/\s+/g, '');
      if (k) skip[k] = true;
    });
    var out = [], seen = {};
    for (var i = 0; i < list.length; i++) {
      var rec = list[i];
      var key = String(rec.name).replace(/\s+/g, '');
      if (!key || key === mineName || skip[key]) continue;
      if (seen[key]) continue;
      seen[key] = true;
      out.push(cameoFromRecord(rec));
      if (out.length >= CAMEO_MAX) break;
    }
    return out;
  }

  function cameoOf(s, index) {
    if (!s || !Array.isArray(s.cameos) || !s.cameos.length) return null;
    var i = typeof index === 'number' ? index : 0;
    return s.cameos[i] || null;
  }

  // 이 사람과 연애·결혼으로 갈 수 있는가 (이성일 때만)
  function cameoCanRomance(s, c) {
    c = c || cameoOf(s);
    if (!c || !c.gender || !s || !s.gender) return false;
    return c.gender !== s.gender;
  }

  // 관계 진행 — 카메오 이벤트의 선택지(cameoRel)가 부른다
  function setCameoRel(s, index, rel) {
    var c = cameoOf(s, index);
    if (!c || !rel) return null;
    c.rel = rel;
    if (rel !== 'none') c.met = true;
    // 이전 회차의 인물과 맺어지면 게임의 가정 루트(배우자·자녀)가 함께 열린다
    if (rel === 'married') { s.flags.결혼 = true; s.flags.배우자 = true; }
    return c;
  }

  function cameoRecordLine(c) {
    if (!c) return '';
    var bits = [];
    if (c.stageLabel) bits.push(c.stageLabel);
    if (c.score !== null && c.score !== undefined) bits.push('종합 ' + c.score + '점');
    if (c.top) bits.push(c.top.label + ' ' + c.top.value);
    if (c.wealth && c.wealth.noun) bits.push(c.wealth.noun);
    return bits.join(' · ');
  }

  function cameoNote(s) {
    var c = cameoOf(s);
    if (!c) return null;
    return {
      name: c.name,
      gender: c.gender,
      record: cameoRecordLine(c),
      vibe: c.top ? (TOP_VIBE[c.top.key] || '') : '',
      rel: c.rel,
      relLabel: CAMEO_REL_LABEL[c.rel] || ''
    };
  }

  function cameoSummary(s) {
    var c = cameoOf(s);
    if (!c) return null;
    return {
      name: c.name,
      rel: c.rel,
      relLabel: CAMEO_REL_LABEL[c.rel] || '',
      record: cameoRecordLine(c),
      count: (s.cameos || []).length
    };
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
        archetype: (archetypeOf(s) || {}).label || '',
        name: s.name,
        gender: s.gender,
        cameo: cameoSummary(s),
        generation: s.generation || 1,
        scenario: s.scenario || 'kr',
        legacyFrom: s.legacy ? s.legacy.recId : null,
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
  // kind='health' 면 '건강 악화' 조기 엔딩으로, 마지막 나이와 함께 전당에 남긴다
  function registerLife(s, kind) {
    if (!s || s.hallId) return null;
    var sum = summary(s);
    var healthEnd = kind === 'health';
    var rec = hallAdd({
      kind: 'life',
      key: healthEnd ? 'life_health' : 'life80',
      stageLabel: healthEnd ? ('건강 악화 · ' + Math.min(s.age, END_AGE) + '세') : '80세 완주',
      age: healthEnd ? Math.min(s.age, END_AGE) : END_AGE,
      score: round1(scoreOfStats(s.stats)),
      grade: sum.grade,
      top: null,
      title: sum.title,
      archetype: sum.archetype ? sum.archetype.label : '',
      name: s.name,
      gender: s.gender,
      cameo: cameoSummary(s),
      generation: s.generation || 1,
      scenario: s.scenario || 'kr',
      legacyFrom: s.legacy ? s.legacy.recId : null,
      ending: healthEnd ? 'health' : 'life80',
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
    twenties: [
      '교실 대신 일터로 먼저 들어갔습니다. 배움은 그 뒤로도 계속됐습니다.',
      '친구들이 캠퍼스에 있을 때, 나는 다른 속도로 세상을 익혔습니다.',
      '스무 살의 몇 해는 이름 없이 지나갔습니다. 그 시간이 지금의 나를 받치고 있습니다.'
    ],
    life80: [
      '여든 번의 봄을 지나, 이제 창가에 앉아 지나온 길을 셉니다.',
      '손등의 주름 사이로, 그 시절의 햇빛이 아직 남아 있습니다.',
      '긴 하루를 살아낸 사람의 저녁처럼, 방 안이 조용합니다.'
    ],
    life_health: [
      '몸이 먼저 멈추겠다고 했습니다. 그날 아침, 창밖은 평소와 같았습니다.',
      '마지막으로 병원 복도에 앉아, 세상이 이렇게 조용한 줄 처음 알았습니다.'
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
    twenties: [
      '이제 스무 살의 몇 해를 마쳤습니다. 여기까지 온 것이 벅차고, 아직 남은 길이 길게 보입니다.',
      '학위 대신 경력이라는 이름으로 지난 몇 해를 묶었습니다. 그것도 내가 들고 가야 할 짐입니다.'
    ],
    life80: [
      '긴 인생이었습니다. 잘 살았는지는 아직 모르겠지만, 살아냈습니다.',
      '이제 남은 것은 기억뿐입니다. 그것으로 충분합니다.'
    ],
    life_health: [
      '인생은 여기서 접힙니다. 접힌 자리에 남은 것들이 아직 따뜻합니다.',
      '남은 시간이 아니라, 지나온 시간이 나를 덮었습니다.'
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
    ],
    genius: [
      '모르는 것이 있으면 잠을 줄여서라도 알아냈습니다. 그 습관 하나가 평생의 무기가 됐습니다.',
      '한 번 이해한 것은 오래 남았습니다. 남들이 외울 때 나는 이해했고, 그래서 안 잊었습니다.'
    ],
    lucky: [
      '중요한 순간에 한 번씩 운이 왔습니다. 그 문이 열렸을 때 들어갈 수 있게 준비해 둔 것은 나였습니다.',
      '복권처럼 우연은 잘 오지 않았지만, 이상하게 마지막 한 수는 늘 통했습니다.'
    ],
    rainy: [
      '한 끗씩 모자란 일이 많았습니다. 그래도 다음 날 아침은 어김없이 왔고, 나는 또 나갔습니다.',
      '운은 끝까지 비켜 갔습니다. 대신 버티는 법을 배웠고, 그건 아무도 빼앗지 못했습니다.'
    ]
  };

  // 실제 스탯·플래그·선택 기록으로 만드는 8~10줄 회고
  function recallLines(s, mode, info) {
    var wholeLife = mode === 'life' || mode === 'health';
    var key = mode === 'life' ? 'life80' : mode === 'health' ? 'life_health'
      : (info ? (info.def && info.def.recallKey ? info.def.recallKey : info.key) : 'kindergarten');
    var age = wholeLife ? Math.min(s.age, END_AGE) : (info ? info.age : s.age);
    var st = !wholeLife && info ? info.stats : s.stats;
    var rnd = recallRand([s.name, s.createdAt, mode, key, Math.round(st.hp), Math.round(st.mental)].join('|'));
    var lines = [];

    lines.push(recallPick(rnd, RECALL_OPEN[key] || RECALL_OPEN.kindergarten));

    if (wholeLife) {
      lines.push(mode === 'health'
        ? '몸이 먼저 멈추겠다고 했습니다. 그 말을 듣기까지 ' + age + '년이 걸렸습니다.'
        : '그 사이 세상은 몇 번이나 모습을 바꿨습니다. 나도 그렇게 바뀌었습니다.');
    } else {
      var stageName = info && info.def && info.def.stageLabel ? info.def.stageLabel
        : (info && info.stage ? info.stage.name : '학교');
      lines.push('그때 나는 ' + age + '세, ' + stageName + '의 마지막 달을 보내고 있었습니다.');
    }

    // 3~4줄: 실제로 겪은 사건에서 기억 한두 개
    var pool = (s.history || []).filter(function (h) { return h.age <= age; });
    if (!wholeLife && info) {
      // 졸업·엔딩 회고는 그 시기의 기억에서 고른다 — 고교 졸업 회고에
      // '1세 조리원 퇴소'가 끼어들지 않게, 앞 시기는 해당 시기가 비었을 때만 쓴다.
      var scoped = pool.filter(function (h) { return h.age >= info.stage.from && h.age <= info.stage.to; });
      if (scoped.length) pool = scoped;
    }
    var mem = pool.slice().sort(byImpact).slice(0, 2);
    mem.sort(function (a, b) { return a.age - b.age; });
    if (mem[0]) {
      lines.push(mem[0].age + '세 ' + mem[0].month + '개월차, ' + mem[0].title + '. 그날의 공기가 아직 남아 있습니다.');
    }
    if (mem[1]) {
      lines.push(mem[1].age + '세 ' + mem[1].month + '개월차의 ' + mem[1].title + ' — 그때는 그게 전부인 줄 알았습니다.');
    }

    // 5줄: 마음과 몸 (한 문장으로 묶어 역량·행운 줄 자리를 낸다)
    var mental = st.mental, hp = st.hp;
    var mindLine = mental >= 78 ? '마음은 대체로 맑았습니다. 웃음이 잘 나는 사람이었고, 그 웃음이 하루를 버티게 했습니다.'
      : mental >= 58 ? '마음은 잔잔한 편이었습니다. 큰 파도 없이도 여기까지 왔습니다.'
      : mental >= 42 ? '마음이 눅눅해지는 날이 있었습니다. 다음 날이면 조금 말랐습니다.'
      : mental >= 26 ? '혼자 삼키는 밤이 많았습니다. 아무도 모르는, 그런 밤이었습니다.'
      : '마음의 바닥을 몇 번 봤습니다. 그래도 아침이면 다시 일어났습니다.';
    var bodyLine = hp >= 72 ? '몸은 말을 잘 들었습니다.'
      : hp >= 52 ? '몸은 그럭저럭이었습니다.'
      : hp >= 36 ? '몸이 자주 신호를 보냈습니다.'
      : '몸이 먼저 지친 날들이 있었습니다.';
    lines.push(bodyLine + ' ' + mindLine);

    // 6줄: 머리와 운 — 새로 더한 두 능력치가 인생의 결을 어떻게 바꿨는지
    var intel = st.intel === undefined ? 50 : st.intel;
    var luck = st.luck === undefined ? 50 : st.luck;
    if (intel >= 80 && luck >= 72) {
      lines.push('머리로 길을 만들었고, 결정적인 순간엔 운이 문을 열어 주었습니다. 둘 다 내 것이었습니다.');
    } else if (intel >= 80) {
      lines.push('무엇이든 이해하고 익히는 데 오래 걸리지 않았습니다. 그 머리가 나를 여기까지 데려왔습니다.');
    } else if (intel <= 38) {
      lines.push('머리로 앞서는 편은 아니었습니다. 대신 몸으로 부딪혀서 배웠고, 그 배움은 잘 잊지 않았습니다.');
    } else if (luck >= 80) {
      lines.push('막힌 일이 마지막에 한 번씩은 풀렸습니다. 그게 행운이라는 걸 한참 뒤에 알았습니다.');
    } else if (luck <= 32) {
      lines.push('유난히 운이 비켜 가는 해가 있었습니다. 그때 배운 건, 운은 기다리는 게 아니라는 것이었습니다.');
    } else {
      lines.push('머리도 운도 평범한 편이었습니다. 그래서 매달 한 번씩, 직접 골라야 했습니다.');
    }

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
    var arch = wholeLife ? archetypeOf(s) : null;
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
      } else if (s.flags.직업 && wholeLife) {
        lines.push('한때는 ‘' + s.flags.직업 + '’이라는 이름으로 불렸습니다. 그 이름도 이제는 추억입니다.');
      }
    }

    // 9줄: 남은 돈에 대한 한 줄
    if (wholeLife) {
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
    ledgerOf: ledgerOf,
    LEDGER: LEDGER,
    STAGES: STAGES,
    SCENARIOS: SCENARIOS,
    scenarioOf: scenarioOf,
    scenarioBrief: scenarioBrief,
    ancestors: ancestorsOf,
    legacyOf: legacyOf,
    generationLabel: function (s) {
      var g = s && typeof s.generation === 'number' ? s.generation : 1;
      return g > 1 ? g + '대' : '1대';
    },
    START_AGES: START_AGES,
    STATS: STATS,
    STAT_META: STAT_META,
    GAUGE_KEYS: GAUGE_KEYS,
    luckBias: luckBias,
    END_AGE: END_AGE,
    MONTHS: MONTHS,
    GRADUATIONS: GRADUATIONS,
    gradInfo: gradInfo,
    graduate: graduate,
    recall: function (s, mode) {
      if (mode === 'health') return recallLines(s, 'health', null);
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
    passes: function (ev, s) { return passes(ev, s); },
    formatAsset: formatAsset,
    careerPhrase: careerPhrase,
    ageNoun: ageNoun,
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
    cameoOf: cameoOf,
    cameos: pastCameos,
    cameoCanRomance: cameoCanRomance,
    cameoSummary: cameoSummary,
    cameoNote: cameoNote,
    cameoRecordLine: cameoRecordLine,
    setCameoRel: setCameoRel,
    cameoRelLabel: function (rel) { return CAMEO_REL_LABEL[rel] || ''; },
    CAMEO_REL_LABEL: CAMEO_REL_LABEL,
    guessGender: guessGender,
    canReroll: canReroll,
    reroll: reroll,
    canHeal: canHeal,
    heal: heal,
    HEALTH: HEALTH,
    healthOf: healthOf,
    applyHealth: applyHealth,
    noteStrain: noteStrain,
    healthEventFor: healthEventFor
  };
})(typeof window !== 'undefined' ? window : globalThis);
