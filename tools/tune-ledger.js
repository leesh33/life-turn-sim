// 살림 장부(연 수지) 계수 조정용 임시 시뮬레이터 — 수치를 바꿔 가며 끝 재산을 본다.
//   node tools/tune-ledger.js 0.8
const path = require('path');
const { load } = require('./lib-load');
const base = path.join(__dirname, '..', 'assets');
const { Life } = load(base);
const L = Life.LEDGER;
const f = Number(process.argv[2] || 1);
for (const k in L.income) L.income[k] = Math.round(L.income[k] * f);
L.pension = Math.round(L.pension * f);

function num(v) { return typeof v === 'number' ? v : Array.isArray(v) ? (v[0] + v[1]) / 2 : 0; }
function pickRandom(ev) { return Math.floor(Math.random() * ev.choices.length); }
function pickSane(ev, s) {
  const low = Math.min(s.stats.hp, s.stats.mental) < 35;
  let b = 0, bv = -1e9;
  ev.choices.forEach((c, i) => {
    const e = typeof c.effects === 'object' && c.effects ? c.effects : {};
    let v = Math.random() * 0.4 + num(e.hp) * (low ? 3 : 1) + num(e.mental) * (low ? 3 : 1) + num(e.asset) * 0.02;
    if (v > bv) { bv = v; b = i; }
  });
  return b;
}
function pickMoney(ev) {
  let best = 0, bestV = -1e9;
  ev.choices.forEach((c, i) => {
    const e = typeof c.effects === 'object' && c.effects ? c.effects : {};
    const v = num(e.asset) + (num(e.hp) + num(e.mental)) * 0.5;
    if (v > bestV) { bestV = v; best = i; }
  });
  return best;
}
// 사람에 가까운 정책: 체력·멘탈이 급하면 회복을, 아니면 돈이 크게 나가는 선택은 피한다
function pickHuman(ev, s) {
  const low = Math.min(s.stats.hp, s.stats.mental) < 30;
  const cands = ev.choices.map((c, i) => {
    const e = typeof c.effects === 'object' && c.effects ? c.effects : {};
    return { i, hp: num(e.hp), mental: num(e.mental), asset: num(e.asset), social: num(e.social) };
  });
  if (low) {
    const best = cands.slice().sort((a, b) => (b.hp + b.mental) - (a.hp + a.mental))[0];
    if (best && best.hp + best.mental > 0) return best.i;
  }
  // 지금 재산의 40%를 넘게 나가는 선택은 피한다(집·차·창업 같은 큰 지출)
  const afford = cands.filter((c) => c.asset >= -Math.max(600, Math.abs(s.stats.asset) * 0.4));
  const pool = afford.length ? afford : cands;
  return pool[Math.floor(Math.random() * pool.length)].i;
}

function play(startAge, pol) {
  const s = Life.newGame({ name: 't', gender: '남', startAge });
  let g = 0;
  const mark = {};
  while (!s.ended && g++ < 4000) {
    const ev = Life.currentEvent(s);
    Life.choose(s, pol(ev, s));
    Life.advance(s);
    if (s.month === 1 && !mark[s.age]) mark[s.age] = Math.round(s.stats.asset);
  }
  return { final: s.stats.asset, mark, score: Life.summary(s).score };
}
const med = (a) => { a = a.slice().sort((x, y) => x - y); return Math.round(a[Math.floor(a.length / 2)]); };
const res = {};
for (const [name, pol] of [['random', pickRandom], ['sane', pickSane], ['money', pickMoney], ['human', pickHuman]]) {
  const finals = [], at35 = [], at49 = [], at65 = [];
  for (let i = 0; i < 5; i++) { const r = play(1, pol); finals.push(r.final); if (r.mark[35]) at35.push(r.mark[35]); if (r.mark[49]) at49.push(r.mark[49]); if (r.mark[65]) at65.push(r.mark[65]); }
  for (let i = 0; i < 3; i++) { const r = play(25, pol); if (r.mark[35]) at35.push(r.mark[35]); finals.push(r.final); }
  for (let i = 0; i < 3; i++) { const r = play(35, pol); if (r.mark[49]) at49.push(r.mark[49]); if (r.mark[65]) at65.push(r.mark[65]); finals.push(r.final); }
  res[name] = { final: med(finals), at35: med(at35), at49: med(at49), at65: med(at65), n: finals.length };
}
console.log('factor', f, JSON.stringify(res));
