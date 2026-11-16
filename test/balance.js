// 밸런스 진단: 인생을 여러 번 돌려 세대별 스탯 분포와 100 도달 빈도를 본다
const fs = require('fs');
const path = require('path');
const store = {};
global.window = {
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  }
};
global.localStorage = global.window.localStorage;
const base = path.join(__dirname, '..', 'assets');
const FILES = ['engine.js', 'content.early.js', 'content.mid.js', 'content.late.js', 'content.extra.js']
  .concat(fs.existsSync(path.join(base, 'content.more1.js')) ? ['content.more1.js', 'content.more2.js'] : []);
for (const f of FILES) (0, eval)(fs.readFileSync(path.join(base, f), 'utf8'));
const Life = global.window.Life;

const RUNS = Number(process.argv[2] || 40);
const KEYS = ['hp', 'mental', 'charm', 'social'];
const buckets = {}; // age -> {hp: [], ...}
const peaks = { hp: [], mental: [], charm: [], social: [] };
let hits100 = 0, choicesTotal = 0, above85 = 0, below25 = 0;

for (let run = 0; run < RUNS; run++) {
  const s = Life.newGame({ name: 'T', gender: run % 2 ? '남' : '여', startAge: 1 });
  const maxed = { hp: 0, mental: 0, charm: 0, social: 0 };
  let guard = 0;
  while (!s.ended && guard++ < 2000) {
    const ev = Life.currentEvent(s);
    Life.choose(s, Math.floor(Math.random() * ev.choices.length));
    KEYS.forEach(k => {
      const v = s.stats[k];
      if (v > maxed[k]) maxed[k] = v;
      if (v >= 99.5) hits100++;
      if (v >= 85) above85++;
      if (v <= 25) below25++;
    });
    choicesTotal++;
    const age = s.age;
    if (age % 10 === 0 && !buckets[age]) buckets[age] = { hp: [], mental: [], charm: [], social: [] };
    if (age % 10 === 0) KEYS.forEach(k => buckets[age][k].push(s.stats[k]));
    Life.advance(s);
  }
  KEYS.forEach(k => peaks[k].push(maxed[k]));
}

const avg = a => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
const max = a => Math.max(...a).toFixed(0);
const min = a => Math.min(...a).toFixed(0);

console.log(`=== 세대별 평균 스탯 (${RUNS}회, 무작위 선택) ===`);
console.log('나이   체력        멘탈        매력        호감도');
for (const age of Object.keys(buckets).map(Number).sort((a, b) => a - b)) {
  const b = buckets[age];
  console.log(`${String(age).padStart(3)}세  ` + KEYS.map(k =>
    `${avg(b[k]).padStart(4)}(최대 ${max(b[k]).padStart(3)})`).join('  '));
}
console.log('\n=== 인생 최고치 (평균 / 최대) ===');
console.log(KEYS.map(k => `${k} ${avg(peaks[k])}/${max(peaks[k])}`).join('  '));
console.log('\n100 도달 비율:', (hits100 / choicesTotal * 100).toFixed(2) + '%',
  '| 85 이상 비율:', (above85 / choicesTotal * 100).toFixed(1) + '%',
  '| 25 이하 비율:', (below25 / choicesTotal * 100).toFixed(1) + '%');
console.log('총 선택 수(평균):', Math.round(choicesTotal / RUNS));
