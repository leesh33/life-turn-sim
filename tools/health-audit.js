// 건강 위기 기준 실측 — 지금 assets/engine.js 의 HEALTH 값 그대로 1~80세를 돌린다.
//   node tools/health-audit.js [--runs 10]
// 보는 것
//   · 성향별 80세 완주 / 조기 엔딩 비율과 나이
//   · 위기 경고('몸이 보내는 신호' 등)를 마주친 회차·횟수 — 경고가 '종종' 오는가
//   · 체력 28 이하로 내려간 달 수 · 최저 체력 · 최고 누적 부담
// (2026-11-24 기준 상향 28/18/10 · 7점의 근거를 다시 확인할 때 쓴다)
const path = require('path');
const { load } = require('./lib-load');

const BASE = path.join(__dirname, '..', 'assets');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > -1 ? process.argv[i + 1] : d; };
const RUNS = Number(arg('runs', 10));
const { Life } = load(BASE);
const H = Life.HEALTH;
console.log('기준(assets/engine.js):', JSON.stringify(H));

function num(v) { return typeof v === 'number' ? v : Array.isArray(v) ? (v[0] + v[1]) / 2 : 0; }
let seed = 20261124;
function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }

const POLICIES = {
  random: (ev) => Math.floor(rnd() * ev.choices.length),
  first: () => 0,
  human: (ev, s) => {
    const low = Math.min(s.stats.hp, s.stats.mental) < 30;
    const c = ev.choices.map((ch, i) => {
      const e = typeof ch.effects === 'object' && ch.effects ? ch.effects : {};
      return { i, hp: num(e.hp), mental: num(e.mental), asset: num(e.asset) };
    });
    if (low) {
      const b = c.slice().sort((x, y) => (y.hp + y.mental) - (x.hp + x.mental))[0];
      if (b && b.hp + b.mental > 0) return b.i;
    }
    const afford = c.filter((x) => x.asset >= -Math.max(600, Math.abs(s.stats.asset) * 0.4));
    const pool = afford.length ? afford : c;
    return pool[Math.floor(rnd() * pool.length)].i;
  },
  money: (ev) => {
    let best = 0, bv = -1e9;
    ev.choices.forEach((c, i) => {
      const e = typeof c.effects === 'object' && c.effects ? c.effects : {};
      const v = num(e.asset) + (num(e.hp) + num(e.mental)) * 0.5;
      if (v > bv) { bv = v; best = i; }
    });
    return best;
  },
  // 조금 소홀한 사람 — 몸이 꽤 나빠져야(22 미만) 쉬고, 건강 사건의 3할은 버틴다
  careless: (ev, s) => {
    if (ev.health && rnd() < 0.3) return ev.choices.length - 1;
    const low = Math.min(s.stats.hp, s.stats.mental) < 22;
    const c = ev.choices.map((ch, i) => {
      const e = typeof ch.effects === 'object' && ch.effects ? ch.effects : {};
      return { i, hp: num(e.hp), mental: num(e.mental), asset: num(e.asset) };
    });
    if (low) {
      const b = c.slice().sort((x, y) => (y.hp + y.mental) - (x.hp + x.mental))[0];
      if (b && b.hp + b.mental > 0) return b.i;
    }
    const afford = c.filter((x) => x.asset >= -Math.max(600, Math.abs(s.stats.asset) * 0.4));
    const pool = afford.length ? afford : c;
    return pool[Math.floor(rnd() * pool.length)].i;
  },
  // 건강 경고를 계속 외면하는 사람 — 다른 선택은 무난하게
  ignore: (ev, s) => {
    if (ev.health) return ev.choices.length - 1;
    const c = ev.choices.map((ch, i) => {
      const e = typeof ch.effects === 'object' && ch.effects ? ch.effects : {};
      return { i, hp: num(e.hp), asset: num(e.asset) };
    });
    const afford = c.filter((x) => x.asset >= -Math.max(600, Math.abs(s.stats.asset) * 0.4));
    const pool = afford.length ? afford : c;
    return pool[Math.floor(rnd() * pool.length)].i;
  },
  grind: (ev) => {
    let worst = 0, wv = 1e9;
    ev.choices.forEach((c, i) => {
      const e = typeof c.effects === 'object' && c.effects ? c.effects : {};
      if (num(e.hp) < wv) { wv = num(e.hp); worst = i; }
    });
    return worst;
  }
};
const SCENARIOS = ['kr', 'imf', 'chaebol', 'dirt'];

function runSet(name) {
  const policy = POLICIES[name];
  const r = { name, n: 0, full: 0, health: 0, ages: [], crisisRuns: 0, crisisEvents: 0, hpMin: 100, burdenMax: 0, monthsLow: 0 };
  for (const scenario of SCENARIOS) {
    for (let i = 0; i < RUNS; i++) {
      const s = Life.newGame({ name: '실측', gender: i % 2 ? '여' : '남', startAge: 1, scenario });
      let guard = 0, crisis = 0, hpMin = 100, bMax = 0, low = 0;
      while (!s.ended && guard++ < 4000) {
        const ev = Life.currentEvent(s);
        if (ev.health) crisis++;
        if (s.stats.hp <= H.warnHp) low++;
        Life.choose(s, policy(ev, s));
        Life.advance(s);
        hpMin = Math.min(hpMin, s.stats.hp);
        bMax = Math.max(bMax, (s.health || {}).burden || 0);
      }
      r.n++;
      r.crisisEvents += crisis;
      r.monthsLow += low;
      if (crisis) r.crisisRuns++;
      r.hpMin = Math.min(r.hpMin, hpMin);
      r.burdenMax = Math.max(r.burdenMax, bMax);
      if (s.endingKind === 'health') { r.health++; r.ages.push(s.age); }
      else if (s.age > 80) r.full++;
    }
  }
  return r;
}

console.log('성향'.padEnd(9) + '회차 | 80세 완주 | 조기 엔딩 | 위기 경고 마주친 회차 | 경고 사건 | 체력 ' + H.warnHp + ' 이하 달 | 최저 체력 | 최고 부담');
for (const p of Object.keys(POLICIES)) {
  seed = 20261124;
  const r = runSet(p);
  const pct = (v) => ((v / r.n) * 100).toFixed(0) + '%';
  console.log(`${r.name.padEnd(9)}${r.n}회 | ${r.full} (${pct(r.full)}) | ${r.health} (${pct(r.health)})${r.ages.length ? ' @' + r.ages.join(',') + '세' : ''}`
    + ` | ${r.crisisRuns} (${pct(r.crisisRuns)}) | ${r.crisisEvents}회 (회차당 ${(r.crisisEvents / r.n).toFixed(1)})`
    + ` | ${r.monthsLow} (회차당 ${(r.monthsLow / r.n).toFixed(1)}개월) | ${Math.round(r.hpMin)} | ${r.burdenMax}`);
}
