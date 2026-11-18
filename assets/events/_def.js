/* ─────────────────────────────────────────────
   events/_def.js — 이벤트 정의 도우미 (로더 가장 먼저)
   ─────────────────────────────────────────────
   X(stage, id, ages, place, title, text, choices[, opts])

   · stage  : 'infancy' | 'elementary' | 'middle' | 'high' | 'college' | 'work' |
              'family' | 'midlife' | 'senior' | 'any'
   · ages   : 5  (5세 전용)  또는  [4, 6] (4~6세)
   · choices: [라벨, 결과, 효과, set?, queue?] 배열의 배열 (2~3개)
              효과는 { hp:2, social:-1, asset:30 } 처럼, 범위는 [1,3] 도 가능
   · opts   : { at: [나이, 개월차], milestone: true, repeatable: true,
                weight: 5, when: function (s) { ... } }

   생성되는 객체는 엔진이 그대로 읽는 표준 모양이다.
   ───────────────────────────────────────────── */
(function (global) {
  'use strict';

  function X(stage, id, ages, place, title, text, choices, opts) {
    var lo, hi;
    if (Array.isArray(ages)) { lo = ages[0]; hi = ages[1]; }
    else { lo = hi = ages; }

    var ev = {
      id: id,
      stage: stage,
      minAge: lo,
      maxAge: hi,
      place: place,
      title: title,
      text: text,
      choices: choices.map(function (c) {
        var ch = { label: c[0], result: c[1] };
        if (c[2]) ch.effects = c[2];
        if (c[3]) ch.set = c[3];
        if (c[4]) ch.queue = c[4];
        return ch;
      })
    };

    if (opts) {
      for (var k in opts) { if (k !== 'id' && k !== 'stage') ev[k] = opts[k]; }
    }
    // legacy 파일이 concat 으로 배열을 갈아끼우므로 매번 현재 배열에 넣는다
    (global.LIFE_EVENTS = global.LIFE_EVENTS || []).push(ev);
    return ev;
  }

  global.X = X;
  if (typeof globalThis !== 'undefined') globalThis.X = X;

  /* ── 진로 갈래(트랙) 도우미 ──
     중·고등에서 한 번 정한 갈래가 다른 갈래로 슬쩍 바뀌지 않게 한다.
     (예: 체육 특기생이던 학생이 어느새 예술 특기생 이벤트를 받는 문제)
       LifeTracks.trackOf(s)      → 지금 갈래 플래그 이름 또는 null
       LifeTracks.exclusive(name) → 그 갈래만 true, 나머지 갈래는 false 인 set 객체
       LifeTracks.noTrack(s)      → 아직 갈래를 정하지 않았는가
       LifeTracks.only(name)      → 갈래가 없거나 그 갈래인가 (이벤트 when 조건용) */
  var TRACKS = ['진로_예술', '진로_체육', '진로_공학', '진로_의학',
    '진로_인문', '진로_교육', '진로_미디어', '진로_창업'];

  function trackOf(s) {
    var flags = (s && s.flags) || {};
    for (var i = 0; i < TRACKS.length; i++) if (flags[TRACKS[i]]) return TRACKS[i];
    return null;
  }

  function exclusive(name) {
    var out = {};
    for (var i = 0; i < TRACKS.length; i++) out[TRACKS[i]] = (TRACKS[i] === name);
    return out;
  }

  function noTrack(s) { return !trackOf(s); }

  function only(name) {
    return function (s) {
      var cur = trackOf(s);
      return !cur || cur === name;
    };
  }

  /* ── 결과 판정 도우미 ──
     선택지 문구는 '하려는 일'로 쓰고, 실제로 되는지는 지금 능력치로 가른다.
     난수를 쓰지 않는 이유: 결과 문구·효과·플래그가 서로 어긋나지 않으려면
     같은 상태에서 몇 번을 물어도 같은 답이 나와야 한다.
       LifeChance.check(s, { hp: 0.34, luck: 0.30, base: 6, pass: 60,
                             bonus: { 운동_재능: 6 } })
     · 가중치 키: hp · mental · charm · social · intel · luck (0~100)
     · base: 더할 고정값 · pass: 통과선(기본 55) · bonus: 플래그별 가산 */
  function chanceScore(s, spec) {
    spec = spec || {};
    var st = (s && s.stats) || {}, f = (s && s.flags) || {};
    var q = spec.base || 0;
    ['hp', 'mental', 'charm', 'social', 'intel', 'luck'].forEach(function (k) {
      if (typeof spec[k] === 'number') q += (st[k] || 0) * spec[k];
    });
    var bonus = spec.bonus || {};
    Object.keys(bonus).forEach(function (k) { if (f[k]) q += bonus[k]; });
    return q;
  }

  function chanceCheck(s, spec) {
    var pass = spec && typeof spec.pass === 'number' ? spec.pass : 55;
    return chanceScore(s, spec) >= pass;
  }

  global.LifeChance = {
    PASS: 55,
    score: chanceScore,
    check: chanceCheck
  };
  if (typeof globalThis !== 'undefined') globalThis.LifeChance = global.LifeChance;

  global.LifeTracks = {
    LIST: TRACKS.slice(),
    trackOf: trackOf,
    exclusive: exclusive,
    noTrack: noTrack,
    only: only
  };
  if (typeof globalThis !== 'undefined') globalThis.LifeTracks = global.LifeTracks;
})(typeof window !== 'undefined' ? window : globalThis);
