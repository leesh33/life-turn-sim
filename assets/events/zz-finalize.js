/* ─────────────────────────────────────────────
   events/zz-finalize.js — 로드 마지막 단계 정리
   · 마일스톤(at) 이벤트에 나이 범위가 없으면 at 의 나이로 채운다.
     (모든 이벤트가 minAge/maxAge 를 갖게 해 나이 고증을 한 곳에서 보장)
   ───────────────────────────────────────────── */
(function (global) {
  'use strict';
  var list = global.LIFE_EVENTS || [];
  for (var i = 0; i < list.length; i++) {
    var ev = list[i];
    if (!ev) continue;
    if (ev.at) {
      var pairs = Array.isArray(ev.at[0]) ? ev.at : [ev.at];
      var lo = Infinity, hi = -Infinity;
      for (var j = 0; j < pairs.length; j++) {
        if (pairs[j][0] < lo) lo = pairs[j][0];
        if (pairs[j][0] > hi) hi = pairs[j][0];
      }
      if (ev.minAge === undefined || ev.minAge === null) ev.minAge = lo;
      if (ev.maxAge === undefined || ev.maxAge === null) ev.maxAge = hi;
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
