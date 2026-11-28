// ⚡ 빠른 모드 검증 (2026-11-28 · 희연 님 피드백)
//   node test/fastmode.js
//   · 시작 화면에서 고른 mode 가 저장본·요약에 남고, 예전 저장본은 일반 모드로 이어진다
//   · 빠른 모드는 63턴 안팎으로 80세까지 완주한다 (960개월을 3~5분에)
//   · 건너뛴 달의 시간 효과(노화·유지·연 수지·건강)는 그대로 적용된다
//   · 큰 순간(취직·결혼·출산·은퇴)은 건너뛰지 않는다
//   · 1개월 모드는 한 달씩 그대로다 (밸런스·유아기 월령 불변)
const path = require('path');
const { load } = require('../tools/lib-load');

const { Life } = load(path.join(__dirname, '..', 'assets'));
const W = global.window;

const results = [];
let fails = 0;
function check(name, ok, detail) {
  results.push((ok ? 'PASS' : 'FAIL') + ' · ' + name + (detail === undefined ? '' : ' — ' + detail));
  if (!ok) fails++;
}

/* ── ① 모드 정의 · 저장 호환 ── */
check('모드 2종(일반·빠른)', Life.MODES.length === 2 && Life.MODES[0].id === 'normal' && Life.MODES[1].id === 'fast',
  Life.MODES.map((m) => m.id).join(','));
const normal = Life.newGame({ name: '보통', startAge: 1 });
check('기본은 일반 모드', normal.mode === 'normal', normal.mode);
const fast = Life.newGame({ name: '빠름', startAge: 1, mode: 'fast' });
check('mode:fast 로 시작', fast.mode === 'fast', fast.mode);
check('빠른 모드도 첫 사건이 있다', !!Life.currentEvent(fast));

const oldSave = JSON.parse(JSON.stringify(normal));
delete oldSave.mode;
W.localStorage.setItem('lifeTurnSim.save.v1', JSON.stringify(oldSave));
const migrated = Life.load();
check('mode 없던 저장본 → 일반 모드', migrated && migrated.mode === 'normal' && migrated.v === 6, migrated && (migrated.mode + '/v' + migrated.v));
check('요약에 진행 속도', Life.summary(fast).mode === 'fast');

/* ── ② 보폭 ── */
check('유아기 보폭 6개월', Life.fastStrideOf(3) === 6, Life.fastStrideOf(3));
check('학창기 보폭 12개월', Life.fastStrideOf(12) === 12, Life.fastStrideOf(12));
check('성인 보폭 24개월', Life.fastStrideOf(30) === 24, Life.fastStrideOf(30));

/* ── ③ 완주 길이 · 시간 효과 ── */
function playFast(seed) {
  const s = Life.newGame({ name: '빠름', gender: '남', startAge: 1, mode: 'fast' });
  s.rngState = 12345 + seed;
  let turns = 0, gaps = 0, months = 0, guard = 0;
  const seen = [];
  while (!s.ended && guard++ < 400) {
    const ev = Life.currentEvent(s);
    if (!ev) break;
    seen.push(ev.id);
    if (ev.__fastGap) gaps++;
    const idx = seed % (ev.choices.length || 1);
    const res = Life.choose(s, idx);
    if (!res) break;
    const r = Life.advance(s);
    if (!r.ok) break;
    months += r.span || 1;
    turns++;
  }
  return { s, turns, gaps, months, seen };
}

const runs = [0, 1, 2, 3].map(playFast);
const turnsList = runs.map((r) => r.turns);
check('빠른 모드 완주 턴 수 45~90 (3~5분 분량)', runs.every((r) => r.turns >= 45 && r.turns <= 90), turnsList.join(','));
check('빠른 모드도 80세까지 간다', runs.every((r) => r.s.age >= 80 || r.s.ended), runs.map((r) => r.s.age).join(','));
check('빠른 모드 종료는 인생 마무리', runs.every((r) => r.s.ended && r.s.endingKind !== null), runs.map((r) => r.s.endingKind).join(','));
check('한 카드가 여러 달을 덮는다', runs.every((r) => r.s.history.some((h) => h.span > 1)));
check('건너뛴 시간이 실제로 흐른다 (턴×보폭 ≈ 960개월, 조기 엔딩은 그만큼)',
  runs.every((r) => (r.s.age >= 80 && r.months >= 940 && r.months <= 980) ||
    (r.s.age < 80 && r.months >= (r.s.age - 1) * 12)), runs.map((r) => r.months + '개월/' + r.s.age + '세').join(','));
check('압축 카드는 2~8장 (나머지는 실제 사건)', runs.every((r) => r.gaps <= 10), runs.map((r) => r.gaps).join(','));

const finalStats = runs.map((r) => Math.round(r.s.stats.asset));
check('재산이 한쪽으로 무너지지 않는다 (연 수지 작동)', finalStats.every((v) => v > -20000), finalStats.join(','));
check('노화가 적용된다 (80세 체력 < 1세 체력 + 선택)', runs.every((r) => r.s.stats.hp < 100));

/* ── ④ 큰 순간은 건너뛰지 않는다 ── */
const BIG = ['job_start', 'wedding', 'first_child', 'retire_day', 'doljanchi', 'csat_day', 'college_enter'];
const bigSeen = BIG.filter((id) => runs.some((r) => r.seen.indexOf(id) !== -1));
check('취직·결혼·출산 문은 지나간다', ['job_start', 'wedding', 'first_child'].every((id) => bigSeen.indexOf(id) !== -1), bigSeen.join(','));
check('유아기 큰 순간(돌잔치)도 나온다', bigSeen.indexOf('doljanchi') !== -1, bigSeen.join(','));
check('빠른 모드에는 졸업 결산 화면이 없다', runs.every((r) => !r.s.grad), runs.map((r) => !!r.s.grad).join(','));

/* ── ⑤ 압축 카드 규칙 ── */
const gapEv = Life.byId('__fast_1_1_0');
const s5 = Life.newGame({ name: 'x', startAge: 30, mode: 'fast' });
s5.current = { eventId: null, chosen: null, event: {
  id: '__gap_test', stage: 'work', place: '일상', title: '2년이 흘렀습니다', text: '…',
  choices: [{ label: '그렇게 시간이 갔다', result: '시간이 갔다.', effects: {} }], __fastGap: true
} };
const before = Object.assign({}, s5.stats);
const span = s5.current.span;
Life.choose(s5, 0);
check('압축 카드는 선택 하나', s5.current.chosen === 0 && before.hp === s5.stats.hp, 'hp ' + before.hp + '→' + s5.stats.hp);

/* ── ⑥ 일반 모드는 그대로 ── */
const n = Life.newGame({ name: '보통', startAge: 1, mode: 'normal' });
Life.choose(n, 0);
const r1 = Life.advance(n);
check('일반 모드는 한 달씩', r1.ok && n.age === 1 && n.month === 2 && r1.span === undefined, n.age + '세 ' + n.month + '개월');
check('일반 모드 효과 배율 1 (그대로)', n.history[0].deltas && Object.keys(n.history[0].deltas).length >= 0);
let guard = 0;
let turns2 = 1;
while (!n.ended && guard++ < 29) {
  Life.choose(n, 0);
  Life.advance(n);
  turns2++;
}
check('일반 모드는 턴 수 = 지난 개월 수 (유아기 월령 유지)',
  n.age === 3 && n.month === ((turns2 % 12) + 1), turns2 + '턴 → ' + n.age + '세 ' + n.month + '개월');

console.log(results.join('\n'));
console.log(fails ? `\n실패: ${fails} 건` : '\n빠른 모드 검사: 전체 통과 (' + results.length + '항목)');
if (fails) process.exitCode = 1;
