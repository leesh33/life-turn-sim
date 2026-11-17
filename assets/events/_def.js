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

  global.LifeTracks = {
    LIST: TRACKS.slice(),
    trackOf: trackOf,
    exclusive: exclusive,
    noTrack: noTrack,
    only: only
  };
  if (typeof globalThis !== 'undefined') globalThis.LifeTracks = global.LifeTracks;
})(typeof window !== 'undefined' ? window : globalThis);
