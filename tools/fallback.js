// 폴백(조용한 한 달/평범한 하루) 발생 횟수 측정 — 여러 판 반복
// 사용: node tools/fallback.js [판수]
const { load } = require('./lib-load');
const { Life, EVENTS } = load(require('path').join(__dirname, '..', 'assets'));

const RUNS = Number(process.argv[2]) || 6;
const byAge = {};
const byStart = {};
let total = 0, turns = 0;

for (const startAge of [1, 8, 14, 17, 20, 25, 35]) {
  for (let run = 0; run < RUNS; run++) {
    const s = Life.newGame({ name: '폴백', gender: run % 2 ? '여' : '남', startAge });
    let guard = 0, fb = 0;
    while (!s.ended && guard++ < 4000) {
      const ev = Life.currentEvent(s);
      if (ev.__generic) { fb++; byAge[s.age + '세'] = (byAge[s.age + '세'] || 0) + 1; }
      Life.choose(s, Math.floor(Math.random() * ev.choices.length));
      Life.advance(s);
    }
    total += fb; turns += s.history.length;
    byStart[startAge] = (byStart[startAge] || 0) + fb;
  }
}
console.log('이벤트', EVENTS.length, '| 총', turns, '턴 | 폴백', total, '회');
console.log('시작 나이별:', JSON.stringify(byStart));
console.log('나이별:', Object.keys(byAge).length ? JSON.stringify(byAge) : '없음');
