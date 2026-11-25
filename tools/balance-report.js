// 밸런스 리포트 — 정책 7종 × 시나리오 4종 × N회로 80년을 살려 수치를 뽑는다.
//   node tools/balance-report.js [--runs 4]
// 보는 것
//   · 80세 최종 능력치(중앙·사분위)와 재산 — 정책에 따라 실제로 갈리는가
//   · 등급 분포(S~D)와 총점 — 엔딩·전당이 같은 점수를 쓰는가
//   · 건강 위기: 경고를 마주친 달, 조기 엔딩 비율과 나이
//   · 미션: 나이대 진입 진행률(진입하자마자 100%가 아닌가)과 달성률
// (2026-11-25 능력치·건강·총점 개편의 근거 수치)
const path = require('path');
const { load } = require('./lib-load');

const base = path.join(__dirname, '..', 'assets');
const { Life, Avatar } = load(base);

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > -1 ? Number(process.argv[i + 1]) : d; };
const RUNS = arg('runs', 4);
const SCENARIOS = ['kr', 'imf', 'chaebol', 'dirt'];
let seed = 20261125;
function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
function num(v) { return typeof v === 'number' ? v : Array.isArray(v) ? (v[0] + v[1]) / 2 : 0; }
const eff = (c) => (typeof c.effects === 'object' && c.effects) ? c.effects : {};
const bestOf = (ev, score) => {
  let b = 0, bv = -1e9;
  ev.choices.forEach((c, i) => { const v = score(eff(c)); if (v > bv) { bv = v; b = i; } });
  return b;
};
const worstHp = (ev) => {
  let b = 0, bv = 1e9;
  ev.choices.forEach((c, i) => { const v = num(eff(c).hp); if (v < bv) { bv = v; b = i; } });
  return b;
};

const POLICIES = {
  // 무난 — 위급할 때만 회복하고 나머지는 무작위
  human: (ev, s) => {
    const low = Math.min(s.stats.hp, s.stats.mental) < 30;
    if (low) {
      const b = bestOf(ev, (e) => num(e.hp) + num(e.mental));
      if (num(eff(ev.choices[b]).hp) + num(eff(ev.choices[b]).mental) > 0) return b;
    }
    const afford = ev.choices.map((c, i) => ({ i, a: num(eff(c).asset) }))
      .filter((x) => x.a >= -Math.max(600, Math.abs(s.stats.asset) * 0.4));
    const pool = afford.length ? afford : ev.choices.map((c, i) => ({ i }));
    return pool[Math.floor(rnd() * pool.length)].i;
  },
  random: (ev) => Math.floor(rnd() * ev.choices.length),
  first: () => 0,
  // 돈 우선 — 재산이 오르는 쪽, 건강은 신경 쓰지 않는다
  money: (ev) => bestOf(ev, (e) => num(e.asset) + (num(e.hp) + num(e.mental)) * 0.35),
  // 건강 우선 — 체력을 가장 많이 올리는 쪽
  healthy: (ev) => bestOf(ev, (e) => num(e.hp) * 2 + num(e.mental) + num(e.asset) * 0.01),
  // 건강 소홀 — 돈·성과를 좇고, 몸이 25 아래로 내려갈 때만 겨우 챙긴다
  careless: (ev, s) => {
    if (s.stats.hp < 25) return bestOf(ev, (e) => num(e.hp));
    return bestOf(ev, (e) => num(e.asset) * 1.0 + num(e.mental) * 0.3 - num(e.hp) * 0.2);
  },
  // 경고 외면 — 건강 사건이 와도 매번 '버티기', 평소엔 돈 쪽
  ignore: (ev, s) => (ev.health ? ev.choices.length - 1 : bestOf(ev, (e) => num(e.asset) + num(e.mental) * 0.3)),
  // 몸 외면 — 매번 체력을 가장 많이 깎는 선택
  wreck: (ev) => worstHp(ev)
};

const KEYS = ['hp', 'mental', 'charm', 'social', 'intel', 'luck'];
const med = (a) => { if (!a.length) return null; a = a.slice().sort((x, y) => x - y); return Math.round(a[Math.floor(a.length / 2)]); };
const q = (a, p) => { if (!a.length) return null; a = a.slice().sort((x, y) => x - y); return Math.round(a[Math.min(a.length - 1, Math.floor(a.length * p))]); };

const rows = [];
for (const name of Object.keys(POLICIES)) {
  for (const scenario of SCENARIOS) {
    for (let i = 0; i < RUNS; i++) {
      const s = Life.newGame({ name: '측정', gender: i % 2 ? '여' : '남', startAge: 1, scenario });
      let guard = 0, warnMonths = 0, healthEvents = 0, entry = {};
      while (!s.ended && guard++ < 4000) {
        const band = Avatar.bandOf(s.age);
        if (entry[band.id] === undefined) entry[band.id] = Avatar.mission(s).pct;
        const ev = Life.currentEvent(s);
        if (ev.health) healthEvents++;
        Life.choose(s, POLICIES[name](ev, s));
        const adv = Life.advance(s);
        if (adv.health && adv.health.level !== 'ok') warnMonths++;
      }
      const sum = Life.summary(s);
      rows.push({
        policy: name, ended: s.endingKind, age: s.age,
        stats: Object.fromEntries(KEYS.map((k) => [k, Math.round(s.stats[k])])),
        asset: Math.round(s.stats.asset), grade: sum.grade, score: sum.score,
        hallScore: Math.round(Life.scoreOfStats(s.stats) * 10) / 10,
        warnMonths, healthEvents, entry
      });
    }
  }
}

console.log(`정책 · n=${RUNS * 4} (시나리오 4종 × ${RUNS}회) — 2026-11-25 개편 실측\n`);
console.log('정책        완주/조기    체력(중앙 25~75)  멘탈  매력  호감  역량  행운   재산중앙   등급                 경고달  조기나이');
for (const name of Object.keys(POLICIES)) {
  const list = rows.filter((r) => r.policy === name);
  const ends = list.filter((r) => r.ended === 'health');
  const hp = list.map((r) => r.stats.hp);
  const grades = {};
  list.forEach((r) => { grades[r.grade] = (grades[r.grade] || 0) + 1; });
  const gTxt = 'SABCD'.split('').map((g) => (grades[g] ? g + grades[g] : '')).filter(Boolean).join(' ') || '-';
  console.log(
    name.padEnd(10) +
    `${list.length - ends.length}/${ends.length}`.padEnd(12) +
    `${med(hp)} (${q(hp, 0.25)}~${q(hp, 0.75)})`.padEnd(18) +
    String(med(list.map((r) => r.stats.mental))).padEnd(6) +
    String(med(list.map((r) => r.stats.charm))).padEnd(6) +
    String(med(list.map((r) => r.stats.social))).padEnd(6) +
    String(med(list.map((r) => r.stats.intel))).padEnd(6) +
    String(med(list.map((r) => r.stats.luck))).padEnd(7) +
    String(med(list.map((r) => r.asset))).padEnd(11) +
    gTxt.padEnd(21) +
    String(med(list.map((r) => r.warnMonths))).padEnd(8) +
    (ends.length ? ends.map((r) => r.age).sort((a, b) => a - b).join(',') : '-')
  );
}
const all = rows;
console.log('\n80세 능력치가 88 이상에 붙은 비율:',
  (all.filter((r) => r.stats.hp >= 88).length / all.length * 100).toFixed(0) + '% (체력) ·',
  (all.filter((r) => r.stats.mental >= 88).length / all.length * 100).toFixed(0) + '% (멘탈)');
const diff = all.map((r) => Math.abs(r.score - r.hallScore));
console.log('엔딩 총점 vs 전당 점수 차이 — 중앙', med(diff), '· 최대', Math.max(...diff));
const bands = ['baby', 'child', 'teen', 'youth', 'adult', 'midlife', 'senior'];
console.log('나이대 진입 진행률 100% 비율:',
  bands.map((b) => {
    const v = all.map((r) => r.entry[b]).filter((x) => x !== undefined);
    return b + ' ' + (v.length ? Math.round(v.filter((x) => x >= 100).length / v.length * 100) + '%' : '-');
  }).join(' · '));
console.log('나이대 진입 진행률 중앙:',
  bands.map((b) => {
    const v = all.map((r) => r.entry[b]).filter((x) => x !== undefined);
    return b + ' ' + (v.length ? med(v) + '%' : '-');
  }).join(' · '));
