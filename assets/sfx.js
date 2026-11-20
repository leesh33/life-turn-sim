/* ─────────────────────────────────────────────
   sfx.js — 효과음 (Web Audio API 합성 · 라이브러리 0)
   「인생 한 턴」
   ─────────────────────────────────────────────
   음원 파일을 받지 않고 오실레이터 두세 개로 짧은 소리만 만든다.
   · 모든 소리는 0.3초 안쪽 · 음량 0.02~0.08 — 한 달 넘길 때마다 나도 거슬리지 않게.
   · 사파리(iOS)는 사용자 제스처 전에는 AudioContext 를 만들 수 없고, 만들어도
     suspended 상태다. 그래서 컨텍스트는 '처음 손가락이 닿은 순간'(unlock)에 만들고,
     play() 는 그 전에는 조용히 아무것도 하지 않는다(예외도 던지지 않는다).
   · 음소거 상태는 localStorage(lifeTurnSim.sfx.v1)에 남는다. 기본값은 켜짐(ON).
   · 소리는 전부 try/catch 로 감싼다 — 오디오가 막힌 브라우저에서도 게임은 그대로 돈다.

   쓰는 곳 (assets/app.js)
     Sfx.pick()            선택지를 눌렀을 때
     Sfx.deltas(변화량)     결과의 능력치가 올랐는지/내렸는지
     Sfx.turn()            다음 달로 넘어갈 때
     Sfx.win() / lose()    미니 승부 결과
     Sfx.title()           새 칭호 해금
     Sfx.ending()          인생 마무리(엔딩)
   ───────────────────────────────────────────── */
(function (global) {
  'use strict';

  var KEY = 'lifeTurnSim.sfx.v1';
  var MASTER = 0.6;        // 전체 음량 배율
  var MIN_GAP = 45;        // 같은 순간에 소리가 겹치지 않게 두는 최소 간격(ms)

  var ctx = null;
  var master = null;
  var unlocked = false;
  var muted = readMuted();
  var lastAt = 0;

  function readMuted() {
    try {
      var raw = global.localStorage && global.localStorage.getItem(KEY);
      if (!raw) return false;
      var d = JSON.parse(raw);
      return !!(d && d.muted);
    } catch (e) { return false; }
  }

  function writeMuted(v) {
    try { global.localStorage.setItem(KEY, JSON.stringify({ muted: !!v, at: Date.now() })); } catch (e) {}
  }

  function AudioCtor() {
    return global.AudioContext || global.webkitAudioContext || null;
  }

  function supported() { return !!AudioCtor(); }

  function ensure() {
    if (ctx || !supported()) return ctx;
    try {
      ctx = new (AudioCtor())();
      master = ctx.createGain();
      master.gain.value = MASTER;
      master.connect(ctx.destination);
    } catch (e) { ctx = null; master = null; }
    return ctx;
  }

  // 처음 손가락이 닿을 때 한 번 — iOS 사파리가 소리를 막지 않게
  function unlock() {
    var c = ensure();
    unlocked = true;
    if (!c) return false;
    try {
      if (c.state === 'suspended' && c.resume) c.resume();
    } catch (e) {}
    return true;
  }

  /* 소리 한 줄 — freq(Hz) 에서 dur(초) 동안 울리고, glide 가 있으면 그 음으로 미끄러진다 */
  function note(freq, at, dur, opt) {
    if (!ctx) return;
    opt = opt || {};
    var t0 = ctx.currentTime + at;
    try {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      var peak = (opt.gain || 0.05);
      osc.type = opt.type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      if (opt.glide) {
        try { osc.frequency.exponentialRampToValueAtTime(Math.max(40, opt.glide), t0 + dur); } catch (e) {}
      }
      // 부드러운 어택 · 짧은 감쇠 (딸깍 소리 방지)
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(peak, t0 + Math.min(0.02, dur * 0.35));
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(master || ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch (e) {}
  }

  /* ── 소리 묶음 ──
     [주파수, 시작(초), 길이(초), {type, gain, glide}] */
  var SOUND = {
    turn: [
      [520, 0, 0.055, { type: 'triangle', gain: 0.045, glide: 660 }],
      [780, 0.06, 0.05, { type: 'sine', gain: 0.028 }]
    ],
    pick: [
      [392, 0, 0.05, { type: 'sine', gain: 0.035, glide: 470 }]
    ],
    up: [
      [587, 0, 0.07, { type: 'sine', gain: 0.045 }],
      [880, 0.07, 0.09, { type: 'sine', gain: 0.04 }]
    ],
    down: [
      [392, 0, 0.08, { type: 'sine', gain: 0.042, glide: 294 }],
      [262, 0.08, 0.1, { type: 'sine', gain: 0.032 }]
    ],
    mix: [
      [523, 0, 0.07, { type: 'triangle', gain: 0.035 }],
      [494, 0.07, 0.08, { type: 'triangle', gain: 0.03 }]
    ],
    win: [
      [523, 0, 0.07, { type: 'triangle', gain: 0.05 }],
      [659, 0.07, 0.07, { type: 'triangle', gain: 0.05 }],
      [784, 0.14, 0.12, { type: 'sine', gain: 0.045 }]
    ],
    lose: [
      [392, 0, 0.09, { type: 'triangle', gain: 0.045, glide: 311 }],
      [262, 0.1, 0.13, { type: 'sine', gain: 0.035, glide: 240 }]
    ],
    title: [
      [784, 0, 0.06, { type: 'sine', gain: 0.045 }],
      [988, 0.06, 0.06, { type: 'sine', gain: 0.042 }],
      [1175, 0.12, 0.12, { type: 'sine', gain: 0.038 }]
    ],
    mission: [
      [659, 0, 0.06, { type: 'sine', gain: 0.04 }],
      [988, 0.06, 0.1, { type: 'sine', gain: 0.038 }]
    ],
    ending: [
      [392, 0, 0.16, { type: 'triangle', gain: 0.05 }],
      [523, 0.16, 0.16, { type: 'triangle', gain: 0.05 }],
      [659, 0.32, 0.18, { type: 'triangle', gain: 0.048 }],
      [784, 0.5, 0.32, { type: 'sine', gain: 0.045 }],
      [1046, 0.66, 0.4, { type: 'sine', gain: 0.032 }]
    ]
  };

  function play(name) {
    if (muted) return false;
    if (!SOUND[name]) return false;
    var c = ensure();
    if (!c) return false;
    if (c.state === 'suspended') {
      try { if (c.resume) c.resume(); } catch (e) {}
    }
    // 아주 짧은 간격으로 여러 소리가 몰릴 때는 뒤엣것을 버린다
    var now = Date.now();
    if (now - lastAt < MIN_GAP && name !== 'ending') return false;
    lastAt = now;
    var seq = SOUND[name];
    for (var i = 0; i < seq.length; i++) {
      note(seq[i][0], seq[i][1], seq[i][2], seq[i][3]);
    }
    return true;
  }

  /* 능력치 변화 → 어떤 소리인가 (화면·테스트가 같이 쓰는 판단) */
  function kindForDeltas(deltas) {
    var up = 0, down = 0;
    Object.keys(deltas || {}).forEach(function (k) {
      var v = deltas[k];
      if (!v) return;
      if (v > 0) up += 1; else down += 1;
    });
    if (!up && !down) return null;
    if (up && down) return 'mix';
    return up ? 'up' : 'down';
  }

  function setMuted(v) {
    muted = !!v;
    writeMuted(muted);
    if (!muted) play('pick');     // 켤 때만 짧게 '딸깍' — 껐다는 소리는 내지 않는다
    return muted;
  }

  function toggle() { return setMuted(!muted); }

  var Sfx = {
    KEY: KEY,
    supported: supported,
    isMuted: function () { return muted; },
    setMuted: setMuted,
    toggle: toggle,
    unlock: unlock,
    play: play,
    pick: function () { return play('pick'); },
    turn: function () { return play('turn'); },
    win: function () { return play('win'); },
    lose: function () { return play('lose'); },
    title: function () { return play('title'); },
    mission: function () { return play('mission'); },
    ending: function () { return play('ending'); },
    deltas: function (d) {
      var kind = kindForDeltas(d);
      return kind ? play(kind) : false;
    },
    kindForDeltas: kindForDeltas,
    names: Object.keys(SOUND),
    state: function () {
      return {
        muted: muted,
        supported: supported(),
        unlocked: unlocked,
        running: !!(ctx && ctx.state === 'running')
      };
    }
  };

  global.Sfx = Sfx;
  if (typeof globalThis !== 'undefined') globalThis.Sfx = Sfx;
})(typeof window !== 'undefined' ? window : globalThis);
