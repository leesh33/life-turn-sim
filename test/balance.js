// 밸런스 회귀 검사 — 80세까지 여러 번 돌려 수치가 무너지지 않는지 본다.
//   node test/balance.js
//   · 폴백(평범한 한 달) 0회 · 나이 고증 위반 0회
//   · 살림 장부로 재산이 한쪽으로 무너지지 않는다 (80세 잔액이 −5억 아래로 내려가지 않는다)
//   · 체력·멘탈이 바닥에 오래 붙어 있는 '스탯 고정' 구간이 없다
//   · 나이대 미션 목표가 아예 불가능하지 않다 (지나온 회차의 20% 이상이 달성)
//   · 25세에 시작해 35세가 되면 재산이 상식적인 범위(500만~3억)에 있다
const path = require('path');
const { load } = require('../tools/lib-load');

const base = path.join(__dirname, '..', 'assets');
const { Life, Avatar } = load(base);

let fails = 0;
const out = [];
function check(name, ok, detail) {
  out.push((ok ? 'PASS' : 'FAIL') + ' · ' + name + (detail === undefined ? '' : ' — ' + detail));
  if (!ok) fails++;
}

function num(v) { return typeof v === 'number' ? v : Array.isArray(v) ? (v[0] + v[1]) / 2 : 0; }
function pickRandom(ev) { return Math.floor(Math.random() * ev.choices.length); }
// 사람에 가까운 선택: 위급하면 회복, 아니면 재산의 40%를 넘는 지출은 피한다
function pickHuman(ev, s) {
  const low = Math.min(s.stats.hp, s.stats.mental) < 30;
  const cands = ev.choices.map((c, i) => {
    const e = typeof c.effects === 'object' && c.effects ? c.effects : {};
    return { i, hp: num(e.hp), mental: num(e.mental), asset: num(e.asset) };
  });
  if (low) {
    const best = cands.slice().sort((a, b) => (b.hp + b.mental) - (a.hp + a.mental))[0];
    if (best && best.hp + best.mental > 0) return best.i;
  }
  const afford = cands.filter((c) => c.asset >= -Math.max(600, Math.abs(s.stats.asset) * 0.4));
  const pool = afford.length ? afford : cands;
  return pool[Math.floor(Math.random() * pool.length)].i;
}

const RUNS = 8;
const finals = [];
let fallback = 0, ageBad = 0, longDebt = 0, floorStuck = 0;
const bandDone = {}, bandSeen = {};

for (let run = 0; run < RUNS; run++) {
  const s = Life.newGame({ name: '밸런스', gender: run % 2 ? '여' : '남', startAge: 1, scenario: ['kr', 'imf', 'chaebol', 'dirt'][run % 4] });
  const bandMax = {};
  let guard = 0, negStreak = 0, maxNeg = 0, floorStreak = 0, maxFloor = 0;
  while (!s.ended && guard++ < 4000) {
    const ev = Life.currentEvent(s);
    if (ev.__generic) fallback++;
    if (ev.maxAge !== undefined && ev.maxAge < s.age) ageBad++;
    if (Avatar) {
      const band = Avatar.bandOf(s.age);
      bandSeen[band.id] = (bandSeen[band.id] || 0) + 1;
      const m = Avatar.mission(s);
      bandMax[band.id] = Math.max(bandMax[band.id] || 0, m.pct);
      Avatar.checkMission(s);
    }
    Life.choose(s, pickHuman(ev, s));
    Life.advance(s);
    // 25세 미만의 마이너스는 시나리오가 물려준 빚(흙수저)이라 '빚 구간'으로 세지 않는다
    if (s.age >= 25 && s.stats.asset < 0) { negStreak++; maxNeg = Math.max(maxNeg, negStreak); } else if (s.age >= 25) negStreak = 0;
    if (s.stats.hp <= 3 || s.stats.mental <= 3) { floorStreak++; maxFloor = Math.max(maxFloor, floorStreak); } else floorStreak = 0;
  }
  finals.push(Math.round(s.stats.asset));
  if (maxNeg >= 240) longDebt++;   // 20년 넘게 빚에 묶인 인생 = 소프트락 후보
  if (maxFloor >= 24) floorStuck++;
  Object.keys(bandMax).forEach((b) => {
    bandDone[b] = bandDone[b] || { n: 0, done: 0 };
    bandDone[b].n++;
    if (bandMax[b] >= 100) bandDone[b].done++;
  });
}

const minFinal = Math.min(...finals);
const maxFinal = Math.max(...finals);
const medFinal = finals.slice().sort((a, b) => a - b)[Math.floor(finals.length / 2)];
console.log('최종 재산:', finals.join(', '), '| 중앙', medFinal);

check('폴백(평범한 한 달) 0회', fallback === 0, fallback + '회');
check('나이 범위 밖 사건 0회', ageBad === 0, ageBad + '회');
check('80세 잔액이 −5억 아래로 내려가지 않음', minFinal > -50000, minFinal + '만원');
check('80세 잔액이 10억을 넘지 않음', maxFinal < 100000, maxFinal + '만원');
check('25세 이후 빚이 20년 넘게 이어지는 회차 없음', longDebt === 0, longDebt + '/' + RUNS);
check('80세에도 빚인 회차 25% 이하', finals.filter((v) => v < 0).length <= Math.ceil(RUNS / 4), finals.filter((v) => v < 0).length + '/' + RUNS);
check('체력·멘탈 바닥 고정(24개월) 없음', floorStuck === 0, floorStuck + '/' + RUNS);

Object.keys(bandDone).forEach((b) => {
  const r = bandDone[b];
  const rate = Math.round((r.done / r.n) * 100);
  check(`미션 달성 가능 — ${b}`, rate >= 20, rate + '% (' + r.done + '/' + r.n + ')');
});

// 25세 시작 → 35세 재산
const at35 = [];
for (let i = 0; i < 4; i++) {
  const s = Life.newGame({ name: '재산', gender: '남', startAge: 25 });
  let guard = 0;
  while (!s.ended && s.age < 35 && guard++ < 400) {
    Life.choose(s, pickHuman(Life.currentEvent(s), s));
    Life.advance(s);
  }
  at35.push(Math.round(s.stats.asset));
}
const med35 = at35.slice().sort((a, b) => a - b)[Math.floor(at35.length / 2)];
check('25세 시작 → 35세 재산 500만~3억', med35 >= 500 && med35 <= 30000, at35.join(', ') + ' · 중앙 ' + med35);

console.log('\n' + out.join('\n'));
console.log('\n밸런스 검사:', out.length, '항목 · 실패', fails, '건');
if (fails) process.exitCode = 1;
