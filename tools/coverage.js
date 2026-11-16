// 나이별 이벤트 커버리지 검사 — 1~80세 매달 고유 이벤트가 남아 있는지 센다.
// 사용: node tools/coverage.js [--runs 3]
const path = require('path');
const { load } = require('./lib-load');

const base = path.join(__dirname, '..', 'assets');
const { Life, EVENTS } = load(base);
const STAGE_OF = Life.stageOf;

// 그 나이에 뽑힐 수 있는(고정 at 제외) 이벤트 수 — when 조건은 무시한 낙관적 상한
const perAge = {};
for (let age = 1; age <= Life.END_AGE; age++) {
  const stage = STAGE_OF(age).id;
  perAge[age] = EVENTS.filter((e) =>
    e && e.stage === stage && !e.at &&
    (e.minAge === undefined || age >= e.minAge) &&
    (e.maxAge === undefined || age <= e.maxAge)
  ).length;
}

const stageTotals = {};
EVENTS.forEach((e) => { if (e) stageTotals[e.stage] = (stageTotals[e.stage] || 0) + 1; });

console.log('총 이벤트:', EVENTS.length, '| 단계별:', JSON.stringify(stageTotals));

// 단계별 '한 살 12턴 × 연수' 필요량
const need = {};
Life.STAGES.forEach((s) => { need[s.id] = (s.to - s.from + 1) * 12; });

console.log('\n나이  후보수  (부족한 나이만 표시)');
const thin = [];
for (let age = 1; age <= Life.END_AGE; age++) {
  if (perAge[age] < 13) thin.push(age + '세:' + perAge[age]);
}
console.log(thin.length ? thin.join('  ') : '없음 — 모든 나이가 13개 이상');

const byStage = {};
for (let age = 1; age <= Life.END_AGE; age++) {
  const id = STAGE_OF(age).id;
  byStage[id] = byStage[id] || { min: 999, sum: 0, n: 0 };
  byStage[id].min = Math.min(byStage[id].min, perAge[age]);
  byStage[id].sum += perAge[age];
  byStage[id].n++;
}
console.log('\n단계        최소후보  평균후보  필요턴  여유');
for (const s of Life.STAGES) {
  const b = byStage[s.id];
  const avg = (b.sum / b.n).toFixed(1);
  console.log(
    s.name.padEnd(8), String(b.min).padStart(6), String(avg).padStart(9),
    String(need[s.id]).padStart(8), String(b.sum - need[s.id]).padStart(7)
  );
}

// 폴백 발생 측정
const runs = Number(process.argv[process.argv.indexOf('--runs') + 1]) || 2;
let fallbackTotal = 0;
const genericTitles = {};
for (const startAge of [1, 8, 14, 17, 20, 25, 35]) {
  for (let r = 0; r < runs; r++) {
    const s = Life.newGame({ name: '커버', gender: r % 2 ? '여' : '남', startAge });
    let guard = 0, fb = 0;
    while (!s.ended && guard++ < 4000) {
      const ev = Life.currentEvent(s);
      if (ev.__generic) { fb++; genericTitles[ev.title] = (genericTitles[ev.title] || 0) + 1; }
      Life.choose(s, Math.floor(Math.random() * ev.choices.length));
      Life.advance(s);
    }
    fallbackTotal += fb;
    if (fb || startAge === 1) {
      console.log(`시작 ${startAge}세 · ${r + 1}회차 → 폴백 ${fb}회 / ${s.history.length}턴`);
    }
  }
}
console.log('\n총 폴백:', fallbackTotal, '회', Object.keys(genericTitles).length ? JSON.stringify(genericTitles) : '');
