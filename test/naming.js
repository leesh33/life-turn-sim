// 2026-11-24 빌드 4 — 나이대 기본 호칭 세분화 + 금액 표기('1억만원' → '1억 원')
//  · 직업이 없을 때 전부 'K-청년' 이던 칭호를 나이·상태로 나눈다(1세 요약이 '평범하게 살아낸 K-청년').
//  · 재산 포매터가 '억' 뒤에 '만원' 을 또 붙여 '1억만원' 으로 찍히던 것을 '1억 원' / '1억 2,000만 원' 으로.
//  · 명예의 전당 기본 시드(가상 인물)의 제목도 같은 규칙을 따르고, 이미 시드된 기기는 제목만 갱신된다.
const fs = require('fs');
const path = require('path');
const { load } = require('../tools/lib-load');

const BASE = path.join(__dirname, '..', 'assets');
const { Life } = load(BASE);
const HALL_KEY = 'lifeTurnSim.hall.v1';

const ran = [];
const check = (name, cond, extra) => ran.push(`${cond ? 'PASS' : 'FAIL'} · ${name}${extra ? ' — ' + extra : ''}`);
const fresh = (over) => Object.assign({}, Life.newGame({ name: '테스트', gender: '남', startAge: 1 }), over || {});

/* ═════════════ 1) 금액 표기 ═════════════ */
const MONEY = [
  [0, '0원'],
  [1, '1만 원'],
  [500, '500만 원'],
  [9950, '9,950만 원'],
  [9999, '9,999만 원'],
  [10000, '1억 원'],
  [10001, '1억 1만 원'],
  [10500, '1억 500만 원'],
  [12000, '1억 2,000만 원'],
  [19999, '1억 9,999만 원'],
  [25000, '2억 5,000만 원'],
  [52851, '5억 2,851만 원'],
  [100000, '10억 원'],
  [123456, '12억 3,456만 원'],
  [-10000, '-1억 원'],
  [-12500, '-1억 2,500만 원']
];
for (const [v, want] of MONEY) {
  const got = Life.formatAsset(v);
  check(`금액 ${v} → ${want}`, got === want, got);
}
let dup = 0;
for (let v = 0; v <= 300000; v += 137) {
  if (/억\s*만원/.test(Life.formatAsset(v)) || /억\s*원.*만원/.test(Life.formatAsset(v))) dup += 1;
}
check("'억' 뒤에 '만원' 이 겹치는 표기 0건 (0~30억 137만 단위 훑기)", dup === 0, `${dup}건`);

// 요약 문장·요약 카드(남은 재산) 양쪽 모두
const rich = fresh({ age: 1 });
rich.stats.asset = 10000;
const sumRich = Life.summary(rich);
check('요약 문장 "남은 재산은 1억 원."', /남은 재산은 1억 원\./.test(sumRich.oneLiner), sumRich.oneLiner.slice(-40));
check('요약 문장에 억만원 없음', sumRich.oneLiner.indexOf('억만원') === -1);
const sum12000 = fresh({ age: 1 });
sum12000.stats.asset = 12000;
check('요약 문장 "1억 2,000만 원"', Life.summary(sum12000).oneLiner.indexOf('남은 재산은 1억 2,000만 원.') !== -1);
const sumDebt = fresh({ age: 1 });
sumDebt.stats.asset = -10000;
check('빚도 "-1억 원"', Life.summary(sumDebt).oneLiner.indexOf('남은 재산은 -1억 원.') !== -1);

/* ═════════════ 2) 나이대 기본 호칭 ═════════════ */
const BANDS = [
  [0, '아기'], [1, '아기'], [4, '아기'],
  [5, '유치원생'], [7, '유치원생'],
  [8, '초등학생'], [13, '초등학생'],
  [14, '중학생'], [16, '중학생'],
  [17, '고등학생'], [19, '고등학생'],
  [20, '청년'], [24, '청년'],
  [25, 'K-청년'], [34, 'K-청년'],
  [35, '중년'], [49, '중년'],
  [50, '장년'], [64, '장년'],
  [65, '시니어'], [80, '시니어'], [99, '시니어']
];
for (const [age, want] of BANDS) {
  const got = Life.ageNoun(age, {});
  check(`${age}세 → ${want}`, got === want, got);
}
check('20세 대학 진학 흔적 → 대학생', Life.ageNoun(22, { 수능_명문: true }) === '대학생');
check('20세 전문대 → 대학생', Life.ageNoun(21, { 전문대: true }) === '대학생');
check('대학원 진학 → 대학원생', Life.ageNoun(24, { 수능_명문: true, 대학원_진학: true }) === '대학원생');
check('나이가 없으면 예전처럼 K-청년', Life.ageNoun(undefined, {}) === 'K-청년');

// 직업이 있으면 기존 직업 명사 유지
function withJob(age, job) {
  const s = fresh({ age });
  s.flags.직업 = job;
  return Life.careerPhrase(s);
}
check('직업: 의사 → K-의사', withJob(40, '의사') === 'K-의사', withJob(40, '의사'));
check('직업: 대기업 기획자 → K-기획자', withJob(30, '대기업 기획자') === 'K-기획자');
check('직업: 사전에 없는 직업은 그대로', withJob(40, '우주비행사') === '우주비행사');
check('직업: 무직 → K-백수(나이와 무관)', withJob(1, '무직') === 'K-백수', withJob(1, '무직'));

// 스크린샷(IMG_9337) 그대로 — 1세 요약 칭호
const baby = fresh({ age: 1 });
check('1세 요약 칭호에 아기 (K-청년 아님)', /아기$/.test(Life.summary(baby).title) && Life.summary(baby).title.indexOf('K-청년') === -1,
  Life.summary(baby).title);
const kid = fresh({ age: 7 });
kid.startAge = 1;
check('7세 요약 칭호는 유치원생', /유치원생$/.test(Life.summary(kid).title), Life.summary(kid).title);
const old = fresh({ age: 80 });
check('80세 요약 칭호는 시니어', /시니어$/.test(Life.summary(old).title), Life.summary(old).title);
const worker = fresh({ age: 34 });
worker.flags.직업 = '스타트업 개발자';
check('34세 개발자 칭호는 K-개발자', /K-개발자$/.test(Life.summary(worker).title), Life.summary(worker).title);

/* ═════════════ 3) 명예의 전당 기본 시드 ═════════════ */
const seedsSrc = fs.readFileSync(path.join(BASE, 'hall-seeds.js'), 'utf8');
const seeds = JSON.parse(seedsSrc.slice(seedsSrc.indexOf('['), seedsSrc.lastIndexOf(']') + 1));
check('시드 28건', seeds.length === 28, `${seeds.length}건`);
const seedNouns = seeds.map((s) => {
  const tail = (s.title.match(/([가-힣A-Za-z-]+)$/) || [])[1] || '';
  return { age: s.age, title: s.title, tail };
});
check('시드 제목에 K-청년 이 남아 있지 않음', seeds.every((s) => s.title.indexOf('K-청년') === -1),
  seeds.filter((s) => s.title.indexOf('K-청년') !== -1).map((s) => s.id).join(','));
// 갈래(아키타입) 제목은 직업·나이 대신 '…작가' 같은 얼굴 이름으로 끝난다 — 그건 검사 대상이 아니다.
const ARCH_LABELS = Life.ARCHETYPES.reduce((a, t) => a.concat([t.label], t.variants || []), []);
const isArchTitle = (title) => ARCH_LABELS.some((l) => title.slice(-l.length) === l);
const bandSeeds = seedNouns.filter((x) => !isArchTitle(x.title));
check('나이대 호칭으로 끝나는 시드가 있고 그 호칭이 나이와 맞음',
  bandSeeds.length > 0 && bandSeeds.every((x) => x.tail === Life.ageNoun(x.age, {})),
  bandSeeds.filter((x) => x.tail !== Life.ageNoun(x.age, {})).map((x) => `${x.age}:${x.tail}`).join(',') || `${bandSeeds.length}건 확인`);

// 이미 시드된 기기 — 가상 인물 제목만 새 규칙으로, 내 기록은 그대로
localStorage.setItem(HALL_KEY, JSON.stringify({
  v: 1, seeded: true, records: [
    { id: 'seed-kindergarten-0', key: 'kindergarten', age: 7, title: '우렁찬 울음으로 시작해 인맥 하나로 먹고사는 K-청년', score: 57.2, seed: true, ts: 1 },
    { id: 'mine-1', key: 'kindergarten', age: 7, title: '내가 남긴 옛 제목 K-청년', score: 60, mine: true, ts: 2 }
  ]
}));
const recs = Life.hallRecords();
const seedRec = recs.filter((r) => r.id === 'seed-kindergarten-0')[0];
const mineRec = recs.filter((r) => r.id === 'mine-1')[0];
check('이미 시드된 기기: 가상 인물 제목 갱신', !!seedRec && /유치원생$/.test(seedRec.title), seedRec && seedRec.title);
check('이미 시드된 기기: 내 기록 제목은 손대지 않음', !!mineRec && mineRec.title === '내가 남긴 옛 제목 K-청년', mineRec && mineRec.title);
check('이미 시드된 기기: 새 시드가 뒤늦게 끼어들지 않음', recs.filter((r) => r.seed).length === 1, `${recs.filter((r) => r.seed).length}건`);
const saved = JSON.parse(localStorage.getItem(HALL_KEY));
check('시드 갱신 표시 저장(seedRev)', saved.seedRev === 2, String(saved.seedRev));

const fail = ran.filter((r) => r.startsWith('FAIL'));
console.log(ran.join('\n'));
console.log(`\n호칭·금액 검사: ${ran.length - fail.length} / ${ran.length} 통과`);
process.exit(fail.length ? 1 : 0);
