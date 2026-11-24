// ⚡ 타이밍 게이지(초록 구간에서 멈추세요) 속도 검증
//  · 10초 안에 초록 구간(38~62%)에 실제로 닿는지 — 예전 speed=0.028 은 초당 1.7%p 라 60초가 걸려
//    어떻게 해도 실패했다(제보 #29840, IMG_9339).
//  · 편도 1.0~1.3초(60fps 기준)의 게임 감각인지, 10초 동안 여러 번 왕복하는지
//  · 초록 구간에서 멈추면 승리, 바깥에서 멈추면 패배로 갈리는지
// DOM 이 없는 node 에서 돌도록 아주 작은 DOM·rAF·타이머 스텁을 쓴다.
const path = require('path');
const fs = require('fs');

const SRC = path.join(__dirname, '..', 'assets', 'minigames.js');

const results = [];
const check = (name, cond, extra) => results.push(`${cond ? 'PASS' : 'FAIL'} · ${name}${extra ? ' — ' + extra : ''}`);

/* ── 작은 DOM 스텁 ── */
let els = new Map();
// 실제 DOM 처럼, 붙인 자식과 그 안쪽 id 들이 getElementById 로 잡히게 한다
function registerTree(el) {
  if (el.id) els.set(el.id, el);
  (el.children || []).forEach(registerTree);
}
function makeEl(tag) {
  const el = {
    tagName: String(tag || 'div').toUpperCase(),
    id: '', className: '', textContent: '', hidden: false,
    style: {}, children: [], attrs: {}, listeners: {},
    setAttribute(k, v) { this.attrs[k] = v; },
    getAttribute(k) { return this.attrs[k]; },
    appendChild(c) { this.children.push(c); registerTree(c); return c; },
    addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); },
    click() { (this.listeners.click || []).forEach((fn) => fn({ type: 'click' })); },
    querySelector() { return null; }
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return this._html || ''; },
    set(v) {
      this._html = v;
      this.children = [];
      // '<div id="gaugeZone">…' 처럼 문자열로 들어온 자식을 id 로 등록한다
      const re = /id="([^"]+)"/g;
      let m;
      while ((m = re.exec(String(v)))) {
        const child = makeEl('div');
        child.id = m[1];
        this.children.push(child);
        els.set(m[1], child);
      }
    }
  });
  return el;
}

let rafCb = null;
const timeouts = [];
global.document = {
  getElementById: function (id) { return els.get(id) || null; },
  createElement: function (tag) { return makeEl(tag); }
};
global.window = global;
global.requestAnimationFrame = function (fn) { rafCb = fn; return 1; };
global.cancelAnimationFrame = function () { rafCb = null; };
global.setInterval = function () { return 0; };     // 시계는 테스트에서 흉내만 낸다
global.clearInterval = function () {};
global.setTimeout = function (fn) { timeouts.push(fn); return timeouts.length; };
global.clearTimeout = function () {};

function flushTimeouts() {
  while (timeouts.length) timeouts.shift()();
}

function freshGame() {
  els = new Map();
  els.set('app', makeEl('div'));
  rafCb = null;
  timeouts.length = 0;
  delete global.MiniGame;
  (0, eval)(fs.readFileSync(SRC, 'utf8'));
  return global.MiniGame;
}

/* ── 시계·마커 ── */
const FRAME = 1000 / 60;
let now = 0;
function frame() {
  now += FRAME;
  const cb = rafCb;
  rafCb = null;
  if (cb) cb(now);
}
function posNow() {
  const marker = els.get('gaugeMarker');
  if (!marker || marker.style.left === undefined) return 0;   // 첫 프레임 전에는 0%
  return parseFloat(marker.style.left);
}
// 0% 에서 출발해 처음으로 target% 에 닿기까지 걸린 시간(ms)
function msToReach(target, guard = 2000) {
  let n = 0;
  while (posNow() < target && n++ < guard) frame();
  return n * FRAME;
}
// 0% → 100% 편도 시간(ms)
function oneWayMsFromStart(guard = 2000) {
  let n = 0;
  while (posNow() < 100 && n++ < guard) frame();
  return n * FRAME;
}
function bannerOf() {
  const stage = els.get('miniStage');
  return (stage.children || []).find((c) => /mini-out/.test(c.className || '')) || null;
}

/* ═════════ ① 10초 안에 초록 구간에 닿는가 ═════════ */
{
  const Mini = freshGame();
  now = 0;
  Mini.open({ type: 'timing', title: '소개팅', desc: '타이밍' }, { stats: { luck: 50 } }, function () {});
  const start = posNow();
  check('게이지는 0% 에서 출발', start === 0, start + '%');
  const toZone = msToReach(38);
  check('초록 구간 시작(38%)에 0.6초 안에 도달', toZone <= 600, Math.round(toZone) + 'ms');
}
{
  const Mini = freshGame();
  now = 0;
  Mini.open({ type: 'timing' }, { stats: { luck: 50 } }, function () {});
  const one = oneWayMsFromStart();
  check('편도(0→100%) 1.0~1.3초', one >= 1000 && one <= 1300, Math.round(one) + 'ms');
  // 10초 동안 몇 번 왕복하는지 — 1회전(왕복)은 약 2×편도
  const trips = 10000 / (2 * one);
  check('10초 동안 3.5~5회 왕복', trips >= 3.5 && trips <= 5, trips.toFixed(1) + '회');
  // 예전 속도(0.028)였으면 1초에 1.7%p — 이 검사가 그 회귀를 잡는다
  const perSec = (100 / one) * 1000;
  check('초당 이동 75~95%', perSec >= 75 && perSec <= 95, perSec.toFixed(1) + '%/s');
}

/* ═════════ ② 초록 구간(38~62%)에서 멈추면 승리 ═════════ */
{
  const Mini = freshGame();
  now = 0;
  let won = null;
  Mini.open({ type: 'timing' }, { stats: { luck: 50 } }, function (w) { won = w; });
  while (posNow() < 50) frame();
  const at = posNow();
  els.get('miniStop').click();
  flushTimeouts();
  const banner = bannerOf();
  check('초록 구간에서 멈추면 승리', at >= 38 && at <= 62 && /win/.test(banner ? banner.className : ''), '멈춘 지점 ' + Math.round(at) + '%');
  check('승리 콜백 true', won === true, String(won));
  check('게이지 문구에 멈춘 지점 표시', /게이지 \d+%/.test(banner ? banner.innerHTML : ''), '');
}

/* ═════════ ③ 구간 밖에서 멈추면 패배 ═════════ */
{
  const Mini = freshGame();
  now = 0;
  let won = null;
  Mini.open({ type: 'timing' }, { stats: { luck: 50 } }, function (w) { won = w; });
  while (posNow() < 10) frame();
  const at = posNow();
  els.get('miniStop').click();
  flushTimeouts();
  const banner = bannerOf();
  check('구간 밖(10% 부근)에서 멈추면 패배', at < 38 && /lose/.test(banner ? banner.className : ''), '멈춘 지점 ' + Math.round(at) + '%');
  check('패배 콜백 false', won === false, String(won));
}

/* ═════════ ④ www/ 번들도 같은 속도인가(있을 때만) ═════════ */
{
  const wwwPath = path.join(__dirname, '..', 'www', 'assets', 'minigames.js');
  if (fs.existsSync(wwwPath)) {
    const a = fs.readFileSync(SRC, 'utf8');
    const b = fs.readFileSync(wwwPath, 'utf8');
    check('www/assets/minigames.js 가 assets 와 같음', a === b, a === b ? '' : 'pack-www.sh 로 다시 묶으세요');
  }
}

/* ── 출력 ── */
console.log(results.join('\n'));
const fails = results.filter((r) => r.startsWith('FAIL')).length;
console.log('\n실패:', fails, '건');
if (fails) process.exitCode = 1;
