// 전체 생애(1~80세) 풀런 감사 — 시나리오·성향별로 끝까지 돌려 구간별 이상을 찾는다.
//   node tools/full-life-audit.js [--runs 3] [--json]
// 보는 것
//   · 이벤트 고갈(폴백)이 생기는 나이
//   · 재산 폭증(10억↑)·파산(−3억↓)·급락(한 해 −5,000만↑)
//   · 체력·멘탈 급락(한 해 −25↓)과 바닥(15 이하) 구간
//   · 은퇴 후 공백 — 은퇴·명퇴 뒤에 사건이 줄거나 회사 사건이 새는지
//   · 엔딩 — 80세 완주 여부·등급·아키타입, 나이/단계 불일치
const path = require('path');
const { load } = require('./lib-load');
const base = path.join(__dirname, '..', 'assets');
const { Life, Avatar, EVENTS } = load(base);

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > -1 ? Number(process.argv[i + 1]) : d; };
const RUNS = arg('runs', 3);
const JSON_OUT = process.argv.includes('--json');

const SCENARIOS = ['kr', 'imf', 'chaebol', 'dirt'];
let seed = 20261124;
function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
function num(v) { return typeof v === 'number' ? v : Array.isArray(v) ? (v[0] + v[1]) / 2 : 0; }

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
  healthy: (ev) => {
    let best = 0, bv = -1e9;
    ev.choices.forEach((c, i) => {
      const e = typeof c.effects === 'object' && c.effects ? c.effects : {};
      const v = num(e.hp) * 2 + num(e.mental) + num(e.asset) * 0.01;
      if (v > bv) { bv = v; best = i; }
    });
    return best;
  }
};

const WORK_WORDS = /(출근|퇴근|야근|상사|팀장|사수|사원증|회사|직장|월급|연봉|승진|부장님|과장님|대리님|인사팀|사내|회식|재택|출장|사무실|오피스|업무|거래처|결재|보고서|계약서|연차|성과급|이직|면접관|입사)/;

const runs = [];
for (const policyName of Object.keys(POLICIES)) {
  for (const scenario of SCENARIOS) {
    for (let i = 0; i < RUNS; i++) {
      const s = Life.newGame({ name: '감사', gender: i % 2 ? '여' : '남', startAge: 1, scenario });
      const year = {};       // age → {hp:[], mental:[], asset:[], events:n, fallback:n, retired:bool, workLeak:n, titles:Set}
      let guard = 0, fallback = 0, workLeak = 0, retiredAge = null, ended = false;
      let maxAsset = -Infinity, minAsset = Infinity;
      const leaks = [];
      const titles = new Set();
      let stageJump = null;
      while (!s.ended && guard++ < 4000) {
        const ev = Life.currentEvent(s);
        const stage = Life.stageOf(s.age).id;
        const y = year[s.age] || (year[s.age] = { hp: [], mental: [], asset: [], events: 0, fallback: 0, retired: false, workLeak: 0 });
        if (ev.__generic) { fallback++; y.fallback++; }
        y.events++;
        titles.add(ev.title);
        if ((s.flags.은퇴 || s.flags.명퇴 || s.age >= 60) && s.age < 65) {
          y.retired = true;
          if (retiredAge === null) retiredAge = s.age;
          if (s.flags.은퇴 || s.flags.명퇴) {
            const text = [ev.title, ev.text].concat((ev.choices || []).map((c) => c.label)).join(' ');
            // 창업가의 '사업' 장면은 회사 생활 누출이 아니다
            if (WORK_WORDS.test(text) && !/창업|사업체|가게|자영/.test(text)) { workLeak++; y.workLeak++; leaks.push(s.age + '세 ' + ev.id + ' ' + ev.title); }
          }
        }
        if (ev.maxAge !== undefined && ev.maxAge < s.age && stageJump === null) stageJump = s.age + '세 ' + ev.id;
        Life.choose(s, POLICIES[policyName](ev, s));
        Life.advance(s);
        y.hp.push(Math.round(s.stats.hp));
        y.mental.push(Math.round(s.stats.mental));
        y.asset.push(Math.round(s.stats.asset));
        maxAsset = Math.max(maxAsset, s.stats.asset);
        minAsset = Math.min(minAsset, s.stats.asset);
      }
      ended = s.ended;
      const sum = Life.summary(s);
      runs.push({
        policy: policyName, scenario, ended, finalAge: s.age, grade: sum.grade, score: sum.score,
        archetype: sum.archetype ? sum.archetype.key : null,
        finalAsset: Math.round(s.stats.asset), maxAsset: Math.round(maxAsset), minAsset: Math.round(minAsset),
        fallback, workLeak, leaks: leaks.slice(0, 6), retiredAge, stageJump, titles: titles.size,
        year: Object.fromEntries(Object.entries(year).map(([a, v]) => [a, {
          hpMin: Math.min(...v.hp), mentalMin: Math.min(...v.mental),
          assetEnd: v.asset.length ? v.asset[v.asset.length - 1] : null,
          assetMin: v.asset.length ? Math.min(...v.asset) : null,
          events: v.events, fallback: v.fallback, retired: v.retired, workLeak: v.workLeak
        }]))
      });
    }
  }
}

/* 집계 */
const med = (a) => { a = a.slice().sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : null; };
const ageYears = {};
for (const r of runs) {
  for (const [age, y] of Object.entries(r.year)) {
    const a = +age;
    (ageYears[a] = ageYears[a] || []).push(y);
  }
}

// 1) 이벤트 고갈
const fallbackAges = {};
runs.forEach((r) => Object.entries(r.year).forEach(([a, y]) => { if (y.fallback) fallbackAges[a] = (fallbackAges[a] || 0) + y.fallback; }));
// 2) 체력·멘탈 급락/바닥
const lowHp = {}, lowMental = {};
runs.forEach((r) => Object.entries(r.year).forEach(([a, y]) => {
  if (y.hpMin <= 15) lowHp[a] = (lowHp[a] || 0) + 1;
  if (y.mentalMin <= 15) lowMental[a] = (lowMental[a] || 0) + 1;
}));
// 3) 재산 폭증·파산
const exploded = runs.filter((r) => r.maxAsset >= 100000);
const bankrupt = runs.filter((r) => r.minAsset <= -30000);
// 4) 은퇴 후
const retiredRuns = runs.filter((r) => r.retiredAge !== null);
const retireEvents = {};
retiredRuns.forEach((r) => {
  for (let a = r.retiredAge; a <= 80; a++) {
    const y = r.year[a];
    if (!y) continue;
    (retireEvents[a] = retireEvents[a] || []).push(y.events);
  }
});
// 5) 엔딩
const grades = {}; runs.forEach((r) => { grades[r.grade] = (grades[r.grade] || 0) + 1; });
const arches = {}; runs.forEach((r) => { arches[r.archetype || 'none'] = (arches[r.archetype || 'none'] || 0) + 1; });
const notEnded = runs.filter((r) => !r.ended || r.finalAge !== 81);

const report = {
  runs: runs.length,
  ended: runs.filter((r) => r.ended).length,
  fallbackTotal: runs.reduce((a, r) => a + r.fallback, 0),
  fallbackAges,
  workLeaks: runs.reduce((a, r) => a + r.workLeak, 0),
  workLeakSamples: runs.flatMap((r) => r.leaks).slice(0, 10),
  lowHpAges: Object.fromEntries(Object.entries(lowHp).filter(([, v]) => v >= Math.max(2, runs.length * 0.08))),
  lowMentalAges: Object.fromEntries(Object.entries(lowMental).filter(([, v]) => v >= Math.max(2, runs.length * 0.08))),
  exploded: exploded.length, explodedSamples: exploded.slice(0, 4).map((r) => `${r.policy}/${r.scenario} ${r.maxAsset}`),
  bankrupt: bankrupt.length, bankruptSamples: bankrupt.slice(0, 4).map((r) => `${r.policy}/${r.scenario} ${r.minAsset} @80 ${r.finalAsset}`),
  retire: {
    runs: retiredRuns.length,
    firstRetireAgeMed: med(retiredRuns.map((r) => r.retiredAge)),
    eventsPerYearAfterRet: Object.fromEntries(Object.entries(retireEvents).map(([a, v]) => [a, med(v)]))
  },
  assetByAge: Object.fromEntries([5, 10, 20, 30, 40, 50, 60, 65, 70, 75, 80].map((a) => [a, med((ageYears[a] || []).map((y) => y.assetEnd).filter((v) => v !== null))])),
  hpByAge: Object.fromEntries([10, 20, 30, 40, 50, 60, 65, 70, 75, 80].map((a) => [a, med((ageYears[a] || []).map((y) => y.hpMin))])),
  mentalByAge: Object.fromEntries([10, 20, 30, 40, 50, 60, 65, 70, 75, 80].map((a) => [a, med((ageYears[a] || []).map((y) => y.mentalMin))])),
  grades, arches, notEnded: notEnded.length,
  byPolicy: Object.fromEntries(Object.keys(POLICIES).map((p) => [p, {
    final: med(runs.filter((r) => r.policy === p).map((r) => r.finalAsset)),
    fallback: runs.filter((r) => r.policy === p).reduce((a, r) => a + r.fallback, 0)
  }]))
};

if (JSON_OUT) console.log(JSON.stringify({ report, runs }, null, 1));
else {
  console.log('== 전체 생애 풀런 감사 ==', runs.length, '회차 (시나리오 4 × 성향', Object.keys(POLICIES).length, '×', RUNS, ')');
  console.log('80세 완주:', report.ended + '/' + runs.length, '| 완주 못함:', report.notEnded);
  console.log('폴백(사건 고갈):', report.fallbackTotal, JSON.stringify(report.fallbackAges));
  console.log('은퇴 후 회사 사건 누출:', report.workLeaks, report.workLeakSamples.join(' | '));
  console.log('체력 바닥(15 이하) 잦은 나이:', JSON.stringify(report.lowHpAges));
  console.log('멘탈 바닥 잦은 나이:', JSON.stringify(report.lowMentalAges));
  console.log('재산 10억 초과:', report.exploded, report.explodedSamples.join(' | '));
  console.log('파산(−3억 이하):', report.bankrupt, report.bankruptSamples.join(' | '));
  console.log('은퇴:', report.retire.runs + '/' + runs.length, '· 첫 은퇴 나이 중앙', report.retire.firstRetireAgeMed);
  console.log('  은퇴 후 연간 사건 수(중앙):', JSON.stringify(report.retire.eventsPerYearAfterRet));
  console.log('재산 중앙(나이):', JSON.stringify(report.assetByAge));
  console.log('체력 최저 중앙(나이):', JSON.stringify(report.hpByAge));
  console.log('멘탈 최저 중앙(나이):', JSON.stringify(report.mentalByAge));
  console.log('등급:', JSON.stringify(report.grades), '| 아키타입:', JSON.stringify(report.arches));
  console.log('성향별 최종 재산 중앙:', JSON.stringify(report.byPolicy));
}
