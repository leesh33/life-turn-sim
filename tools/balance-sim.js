// 다회차 밸런스 시뮬레이터 — 엔진을 헤드리스로 돌려 수치 분포를 모은다.
//   node tools/balance-sim.js [--runs 40] [--json]
// 보는 것
//   · 나이대별 재산·능력치 중앙값 (인플레이션/디플레이션)
//   · 재산이 0원 아래로 내려간 달, 가장 길게 이어진 빚 구간 (소프트락 후보)
//   · 체력·멘탈이 바닥(≤3)에 붙은 채 이어진 달 (스탯 0 고정)
//   · 나이대 미션 달성률·미달 폭 (불가능/너무 쉬운 목표)
//   · 엔딩 점수 분포·이벤트 소진(폴백) 횟수
const path = require('path');
const { load } = require('./lib-load');
const base = path.join(__dirname, '..', 'assets');
const { Life, EVENTS, Avatar } = load(base);

const arg = (name, dflt) => {
  const i = process.argv.indexOf('--' + name);
  return i > -1 ? Number(process.argv[i + 1]) : dflt;
};
const RUNS = arg('runs', 40);
const JSON_OUT = process.argv.includes('--json');

const AGES = (arg('starts', 0) ? String(process.argv[process.argv.indexOf('--starts') + 1]).split(',').map(Number) : [1, 8, 14, 17, 20, 25, 35]);
const SCENARIOS = ['kr', 'imf', 'chaebol', 'dirt'];

/* 선택 정책 */
function pickRandom(ev) { return Math.floor(Math.random() * ev.choices.length); }
function pickFirst(ev) { return 0; }
// 재산을 가장 많이 주는 선택지를 고른다(돈 벌이 그리디) — 인플레이션 상한을 본다
function pickMoney(ev) {
  let best = 0, bestV = -1e9;
  ev.choices.forEach((c, i) => {
    const eff = typeof c.effects === 'object' && c.effects ? c.effects : {};
    let v = typeof eff.asset === 'number' ? eff.asset : Array.isArray(eff.asset) ? (eff.asset[0] + eff.asset[1]) / 2 : 0;
    // 스탯도 조금 쳐준다(체력·멘탈이 바닥나면 오래 못 산다)
    v += ((eff.hp || 0) + (eff.mental || 0)) * 0.5;
    if (v > bestV) { bestV = v; best = i; }
  });
  return best;
}
// 체력·멘탈이 위험하면 회복을 우선하는 '사람 같은' 정책
function pickSane(ev, s) {
  const low = Math.min(s.stats.hp, s.stats.mental) < 35;
  let best = 0, bestV = -1e9;
  ev.choices.forEach((c, i) => {
    const eff = typeof c.effects === 'object' && c.effects ? c.effects : {};
    const num = (v) => (typeof v === 'number' ? v : Array.isArray(v) ? (v[0] + v[1]) / 2 : 0);
    let v = Math.random() * 0.4;
    v += num(eff.hp) * (low ? 3 : 1) + num(eff.mental) * (low ? 3 : 1);
    v += num(eff.asset) * 0.02;
    if (v > bestV) { bestV = v; best = i; }
  });
  return best;
}

/* 미니 승부 — 타이밍은 손맛(70%), 나머지는 행운 확률 */
function miniWinFor(type, stats) {
  const bias = Life.luckBias(stats);
  if (type === 'timing') return Math.random() < 0.7;
  if (type === 'math') return Math.random() < 0.75;
  return Math.random() < 0.5 + bias;
}

function playOne(startAge, scenario, policy) {
  const s = Life.newGame({ name: '밸런스', gender: '남', startAge, scenario });
  const samples = {};
  const bandEnd = {};
  let guard = 0, fallback = 0;
  let negMonths = 0, negStreak = 0, maxNegStreak = 0;
  let floorStreak = 0, maxFloorStreak = 0;
  let minAsset = Infinity, maxAsset = -Infinity;
  let debtStartAge = null, firstDebtAge = null;
  let mini = { played: 0, won: 0, byType: {} };
  const seenBands = {};

  while (!s.ended && guard++ < 5000) {
    const ev = Life.currentEvent(s);
    if (!ev) break;
    if (ev.__generic) fallback++;
    const idx = policy(ev, s);
    const choice = ev.choices[idx];
    let opts;
    if (choice && choice.mini) {
      const win = miniWinFor(choice.mini.type, s.stats);
      mini.played++;
      if (win) mini.won++;
      mini.byType[choice.mini.type] = mini.byType[choice.mini.type] || { n: 0, w: 0 };
      mini.byType[choice.mini.type].n++;
      if (win) mini.byType[choice.mini.type].w++;
      opts = { miniWin: win };
    }
    Life.choose(s, idx, opts);
    // 미션 달성 검사(앱은 매 선택 뒤 checkMission 을 부른다)
    if (Avatar) {
      const m = Avatar.mission(s);
      const rec = seenBands[m.bandId] || (seenBands[m.bandId] = { startAge: s.age, max: 0, done: false, turns: 0 });
      rec.turns++;
      rec.max = Math.max(rec.max, m.pct);
      if (m.done) rec.done = true;
      Avatar.checkMission(s);
    }
    const a = Life.advance(s);

    if (s.stats.asset < 0) {
      negMonths++;
      negStreak++;
      if (negStreak > maxNegStreak) maxNegStreak = negStreak;
      if (firstDebtAge === null) firstDebtAge = s.age;
    } else { negStreak = 0; }
    if (s.stats.asset < minAsset) minAsset = s.stats.asset;
    if (s.stats.asset > maxAsset) maxAsset = s.stats.asset;
    if (s.stats.hp <= 3 || s.stats.mental <= 3) {
      floorStreak++;
      if (floorStreak > maxFloorStreak) maxFloorStreak = floorStreak;
    } else floorStreak = 0;

    // 10년 단위 표본
    if (s.age % 5 === 0 && s.month === 1 && !samples[s.age]) {
      samples[s.age] = {
        asset: Math.round(s.stats.asset), hp: Math.round(s.stats.hp), mental: Math.round(s.stats.mental),
        charm: Math.round(s.stats.charm), social: Math.round(s.stats.social),
        intel: Math.round(s.stats.intel), luck: Math.round(s.stats.luck)
      };
    }
    if (!a.ok) break;
  }
  const bandStats = seenBands;
  const sum = Life.summary(s);
  return {
    startAge, scenario,
    finalAge: s.age,
    finalAsset: Math.round(s.stats.asset),
    score: sum ? sum.score : null,
    grade: sum ? sum.grade : null,
    minAsset: Math.round(minAsset), maxAsset: Math.round(maxAsset),
    negMonths, maxNegStreak, firstDebtAge,
    maxFloorStreak, fallback,
    samples, missions: s.missions || {}, bandStats,
    missionBases: s.missionBase || {},
    mini,
    ending: sum ? (sum.archetype && sum.archetype.label) : null,
    usedCount: s.used.length
  };
}

const median = (arr) => {
  if (!arr.length) return null;
  const a = arr.slice().sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : Math.round((a[mid - 1] + a[mid]) / 2);
};
const pct = (arr, p) => {
  if (!arr.length) return null;
  const a = arr.slice().sort((x, y) => x - y);
  return a[Math.min(a.length - 1, Math.floor(a.length * p))];
};

const results = [];
const ALL_POLICIES = { random: pickRandom, first: pickFirst, money: pickMoney, sane: pickSane };
const POLICY_NAMES = (() => {
  const i = process.argv.indexOf('--policies');
  return i > -1 ? String(process.argv[i + 1]).split(',') : Object.keys(ALL_POLICIES);
})();
const POLICIES = {};
POLICY_NAMES.forEach((n) => { if (ALL_POLICIES[n]) POLICIES[n] = ALL_POLICIES[n]; });
for (const policyName of Object.keys(POLICIES)) {
  for (const startAge of AGES) {
    for (const scenario of (startAge <= 20 ? SCENARIOS : ['kr', 'chaebol', 'dirt'])) {
      for (let i = 0; i < RUNS; i++) {
        const r = playOne(startAge, scenario, POLICIES[policyName]);
        r.policy = policyName;
        results.push(r);
      }
    }
  }
}

/* 집계 */
function aggregate(list) {
  const out = {};
  const ages = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80];
  out.assetByAge = {};
  for (const a of ages) {
    const vals = list.map((r) => (r.samples[a] ? r.samples[a].asset : null)).filter((v) => v !== null);
    if (vals.length) out.assetByAge[a] = { med: median(vals), p10: pct(vals, 0.1), p90: pct(vals, 0.9), n: vals.length };
  }
  out.statByAge = {};
  for (const a of [20, 35, 50, 65, 80]) {
    const pick = (k) => list.map((r) => (r.samples[a] ? r.samples[a][k] : null)).filter((v) => v !== null);
    const hp = pick('hp'), mental = pick('mental'), intel = pick('intel');
    if (hp.length) out.statByAge[a] = { hp: median(hp), mental: median(mental), intel: median(intel), n: hp.length };
  }
  const finals = list.map((r) => r.finalAsset);
  out.finalAsset = { med: median(finals), p10: pct(finals, 0.1), p90: pct(finals, 0.9), max: Math.max(...finals), min: Math.min(...finals) };
  const scores = list.map((r) => r.score).filter((v) => typeof v === 'number');
  out.score = { med: median(scores), p10: pct(scores, 0.1), p90: pct(scores, 0.9) };
  const grades = {};
  list.forEach((r) => { if (r.grade) grades[r.grade] = (grades[r.grade] || 0) + 1; });
  out.grades = grades;
  out.neg = {
    runsWithDebt: list.filter((r) => r.negMonths > 0).length,
    medNegMonths: median(list.map((r) => r.negMonths)),
    maxNegStreak: Math.max(...list.map((r) => r.maxNegStreak)),
    runsLongDebt: list.filter((r) => r.maxNegStreak >= 12).length,
    firstDebtAgeMed: median(list.map((r) => r.firstDebtAge).filter((v) => v !== null))
  };
  out.floor = {
    runsStuck: list.filter((r) => r.maxFloorStreak >= 6).length,
    maxFloorStreak: Math.max(...list.map((r) => r.maxFloorStreak))
  };
  out.fallback = { total: list.reduce((a, r) => a + r.fallback, 0), runsWith: list.filter((r) => r.fallback > 0).length };
  // 미션: 나이대별 달성률
  out.missions = {};
  if (Avatar) {
    for (const band of Avatar.BANDS) {
      // 그 나이대를 실제로 지나온 회차만 분모로 센다(35세 시작에는 유아 미션이 없다)
      const passed = list.filter((r) => r.bandStats && r.bandStats[band.id] && r.bandStats[band.id].turns > 0);
      const done = passed.filter((r) => r.missions[band.mission.id]).length;
      const maxes = passed.map((r) => r.bandStats[band.id].max);
      out.missions[band.id] = {
        id: band.mission.id, done, n: passed.length,
        rate: passed.length ? Math.round((done / passed.length) * 100) : null,
        maxPctMed: median(maxes)
      };
    }
  }
  out.mini = { played: list.reduce((a, r) => a + r.mini.played, 0), won: list.reduce((a, r) => a + r.mini.won, 0) };
  out.runs = list.length;
  return out;
}

const overall = aggregate(results);
const byPolicy = {};
for (const p of Object.keys(POLICIES)) byPolicy[p] = aggregate(results.filter((r) => r.policy === p));
const byStart = {};
for (const a of AGES) byStart[a] = aggregate(results.filter((r) => r.startAge === a));

if (JSON_OUT) {
  console.log(JSON.stringify({ overall, byPolicy, byStart, raw: results }, null, 1));
} else {
  console.log('== 밸런스 시뮬레이션 ==', results.length, '회차 · 이벤트', EVENTS.length, '건');
  console.log('\n[재산 중앙값(만원)]');
  for (const [age, v] of Object.entries(overall.assetByAge)) {
    console.log(`  ${age}세: 중앙 ${v.med} · 하위10% ${v.p10} · 상위10% ${v.p90} (n=${v.n})`);
  }
  console.log('\n[능력치 중앙값]');
  for (const [age, v] of Object.entries(overall.statByAge)) console.log(`  ${age}세: 체력 ${v.hp} 멘탈 ${v.mental} 역량 ${v.intel}`);
  console.log('\n[최종]', JSON.stringify(overall.finalAsset), '| 점수', JSON.stringify(overall.score));
  console.log('[빚]', JSON.stringify(overall.neg));
  console.log('[바닥 고정]', JSON.stringify(overall.floor));
  console.log('[폴백]', JSON.stringify(overall.fallback));
  console.log('[미션]', JSON.stringify(overall.missions));
  console.log('[미니]', JSON.stringify(overall.mini));
  console.log('[등급]', JSON.stringify(overall.grades));
  console.log('\n[정책별]');
  for (const [p, v] of Object.entries(byPolicy)) {
    console.log(`  ${p}: 최종재산 중앙 ${v.finalAsset.med} · 점수 ${v.score.med}(p10 ${v.score.p10}) · 등급 ${JSON.stringify(v.grades)} · 빚경험 ${v.neg.runsWithDebt}/${v.runs} · 최장빚 ${v.neg.maxNegStreak}개월 · 바닥고정 ${v.floor.runsStuck}`);
  }
  console.log('\n[시작나이별 최종재산 중앙·점수]');
  for (const [a, v] of Object.entries(byStart)) console.log(`  ${a}세: ${v.finalAsset.med}만원 · 점수 ${v.score.med} · 빚경험 ${v.neg.runsWithDebt}/${v.runs}`);
}
