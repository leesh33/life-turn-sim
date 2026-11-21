// 미션 밸런스 계측 — 전 연령대 미션이 어느 진행률에서 출발하고, 그 구간 안에서 실제로 달성되는지
//   node tools/mission-balance.js [runs]
//   · 무작위(아무 선택) / 탐욕(능력치 합 최대) / 돈(재산 최대) 세 정책으로 1세~80세를 완주한다
//   · 각 나이대에 들어서는 순간의 미션 진행률과, 그 구간 안에서 달성한 나이를 모은다
//   · 시작 나이 프리셋(1·8·14·17·20·25·35)의 첫 미션도 함께 찍는다
const path = require('path');
const { load } = require('./lib-load');

const base = path.join(__dirname, '..', 'assets');
const { Life, Avatar } = load(base);

const RUNS = Number(process.argv[2] || 12);

function effOf(s, c) {
  let spec = c.effects;
  if (typeof spec === 'function') { try { spec = spec(s) || {}; } catch (e) { spec = {}; } }
  return spec || {};
}
const POLICIES = {
  '무작위': (ev) => Math.floor(Math.random() * ev.choices.length),
  '탐욕': (ev, s) => {
    let best = 0, bestV = -1e9;
    ev.choices.forEach((c, i) => {
      const e = effOf(s, c);
      let v = 0;
      Object.keys(e).forEach((k) => {
        const x = typeof e[k] === 'number' ? e[k] : 0;
        if (k === 'asset') v += Math.sign(x) * Math.log10(Math.abs(x) + 1) * 2;
        else v += x;
      });
      if (v > bestV) { bestV = v; best = i; }
    });
    return best;
  },
  '돈': (ev, s) => {
    let best = 0, bestV = -1e9;
    ev.choices.forEach((c, i) => {
      const e = effOf(s, c);
      const v = typeof e.asset === 'number' ? e.asset : 0;
      if (v > bestV) { bestV = v; best = i; }
    });
    return best;
  }
};

const rows = {};   // band -> { starts: [], done: { policy: [ages] } }
Avatar.BANDS.forEach((b) => { rows[b.id] = { starts: [], done: {} }; });

for (const [name, pick] of Object.entries(POLICIES)) {
  for (let run = 0; run < RUNS; run++) {
    const s = Life.newGame({ name: '계측', gender: run % 2 ? '여' : '남', startAge: 1 });
    Avatar.ensureBase(s);
    let band = Avatar.bandOf(s.age).id;
    rows[band].starts.push(Avatar.mission(s).pct);
    (rows[band].done[name] = rows[band].done[name] || []).push(null);
    let guard = 0;
    while (!s.ended && guard++ < 4000) {
      const now = Avatar.bandOf(s.age).id;
      if (now !== band) {
        band = now;
        rows[band].starts.push(Avatar.mission(s).pct);
        (rows[band].done[name] = rows[band].done[name] || []).push(null);
      }
      const ev = Life.currentEvent(s);
      Life.choose(s, pick(ev, s));
      const got = Avatar.checkMission(s);
      if (got) {
        const list = rows[band].done[name];
        list[list.length - 1] = s.age;
      }
      const r = Life.advance(s);
      if (r.graduation) Life.graduate(s, false);
    }
  }
}

const median = (a) => {
  const v = a.filter((x) => typeof x === 'number').sort((x, y) => x - y);
  return v.length ? v[Math.floor(v.length / 2)] : null;
};
console.log('=== 1세부터 완주: 나이대별 미션 출발선과 달성 (정책 ' + Object.keys(POLICIES).join(' · ') + ' 각 ' + RUNS + '회) ===');
Avatar.BANDS.forEach((b) => {
  const r = rows[b.id];
  const starts = r.starts;
  const startText = Math.round(starts.reduce((x, y) => x + y, 0) / starts.length) + '%' +
    ' (' + Math.min(...starts) + '~' + Math.max(...starts) + ')';
  const doneText = Object.keys(POLICIES).map((p) => {
    const list = r.done[p] || [];
    const hit = list.filter((x) => typeof x === 'number');
    return p + ' ' + hit.length + '/' + list.length + (hit.length ? '(' + median(list) + '세)' : '');
  }).join(' · ');
  const m = Avatar.mission({ age: b.from, stats: { hp: 60, mental: 60, charm: 60, social: 60, intel: 60, luck: 50, asset: 0 } });
  console.log('  ' + b.id.padEnd(8) + ' ' + (b.mission.key + ' +' + b.mission.gain).padEnd(12) +
    '출발 ' + startText.padEnd(12) + ' 달성 ' + doneText);
});

console.log('\n=== 시작 나이 프리셋의 첫 미션 ===');
for (const startAge of [1, 8, 14, 17, 20, 25, 35]) {
  const s = Life.newGame({ name: '시작', gender: '남', startAge });
  Avatar.ensureBase(s);
  const m = Avatar.mission(s);
  console.log('  ' + String(startAge).padStart(2) + '세 ' + m.label + ' · ' + m.goal +
    ' (출발선 ' + m.anchor + ' → 목표 ' + m.target + ', base ' + m.base + ') · ' + m.pct + '%');
}
