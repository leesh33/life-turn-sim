// 나이별 '조건 없는' 이벤트 수 — 미혼·무자녀 경로에서도 매달 새 이벤트가 남는지 점검
const { load } = require('./lib-load');
const { Life, EVENTS } = load(require('path').join(__dirname, '..', 'assets'));

const rows = [];
for (let age = 1; age <= Life.END_AGE; age++) {
  const st = Life.stageOf(age).id;
  const list = EVENTS.filter((e) => e.stage === st && !e.at && !e.when &&
    (e.minAge === undefined || age >= e.minAge) && (e.maxAge === undefined || age <= e.maxAge));
  rows.push([age, list.length]);
}
const thin = rows.filter((r) => r[1] < 13);
console.log('13개 미만인 나이:', thin.length ? thin.map((r) => r[0] + '세:' + r[1]).join('  ') : '없음');
console.log('최소:', Math.min(...rows.map((r) => r[1])));
