// 이전 회차 인물(공유 세계관 · 카메오) 검증
//  · 이전 회차가 없으면 카메오 이벤트가 하나도 나오지 않는지(빈 배열·조건 false·완주 무사고)
//  · 전당에 남긴 '상훈'이 다음 인생 '희연'의 세계에 나타나는지(이름·성별·기록)
//  · 친구 → 연인 → 부부 흐름, 실패·이별 갈래, 같은 이름 제외, 최대 3명·중복 제거
//  · 결과확정형 선택지 금지(RESULT_CHOICE), 저장 호환(v4 → v5), 되돌리기 복원, 요약·전당 기록 반영
const path = require('path');
const { load } = require('../tools/lib-load');

const { Life, EVENTS } = load(path.join(__dirname, '..', 'assets'));

const ran = [];
const check = (name, cond, extra) => ran.push(`${cond ? 'PASS' : 'FAIL'} · ${name}${extra ? ' — ' + extra : ''}`);

const HALL_KEY = 'lifeTurnSim.hall.v1';
const SAVE_KEY = 'lifeTurnSim.save.v1';
function clearStorage() {
  localStorage.removeItem(HALL_KEY);
  localStorage.removeItem(SAVE_KEY);
}
function putHall(records) {
  localStorage.setItem(HALL_KEY, JSON.stringify({ v: 1, seeded: true, records }));
}

// 1회차에서 80세까지 산 '상훈'의 전당 기록
const SANGHUN = {
  id: 'r-sanghun-1', kind: 'life', key: 'life80', stageLabel: '80세 완주', age: 80,
  score: 71.4, grade: 'A', top: null,
  title: '우렁찬 울음으로 시작해 인맥 하나로 먹고사는 K-기획자',
  name: '상훈', ts: 1700000000000, mine: true,
  stats: { hp: 64, mental: 71, charm: 66, social: 84, intel: 79, luck: 55, asset: 32000 }
};

function force(s, id, age, month) {
  s.age = age;
  s.month = month;
  s.current = { eventId: id, chosen: null };
  return Life.currentEvent(s);
}
function strong(s) { s.stats.social = 95; s.stats.charm = 95; s.stats.mental = 90; s.stats.luck = 90; }
function weak(s) { s.stats.social = 15; s.stats.charm = 15; s.stats.mental = 30; s.stats.luck = 20; }
const evText = (ev, s) => (typeof ev.text === 'function' ? ev.text(s) : ev.text);
const evTitle = (ev, s) => (typeof ev.title === 'function' ? ev.title(s) : ev.title);

/* ── 0) 이전 회차 없음 — 카메오 이벤트는 조용히 빠진다 ── */
clearStorage();
const none = Life.newGame({ name: '희연', gender: '여', startAge: 14 });
check('이전 회차 0건 → cameos 빈 배열', Array.isArray(none.cameos) && none.cameos.length === 0,
  JSON.stringify(none.cameos));

const CAMEO_IDS = EVENTS.filter((e) => String(e.id).indexOf('cm_') === 0).map((e) => e.id);
check('카메오 이벤트 등록', CAMEO_IDS.length >= 12, CAMEO_IDS.length + '개');

const gateOff = CAMEO_IDS.filter((id) => {
  const ev = EVENTS.find((e) => e.id === id);
  try { return !!ev.when(none); } catch (e) { return true; }
});
check('이전 회차 0건 → 카메오 이벤트 조건 전부 false', gateOff.length === 0, gateOff.join(',') || '0건');

const noCameoSeen = new Set();
for (const startAge of [1, 8, 14, 20, 25, 35]) {
  const s = Life.newGame({ name: '무카메오', gender: '여', startAge });
  let guard = 0;
  while (!s.ended && guard++ < 4000) {
    const ev = Life.currentEvent(s);
    noCameoSeen.add(ev.id);
    Life.choose(s, Math.floor(Math.random() * ev.choices.length));
    Life.advance(s);
  }
}
check('이전 회차 0건 → 완주 중 카메오 이벤트 0회', CAMEO_IDS.every((id) => !noCameoSeen.has(id)),
  CAMEO_IDS.filter((id) => noCameoSeen.has(id)).join(',') || '0회');

/* ── 0-1) 정적 검사 — 나이·선택지·결과확정형 문구 ── */
const RESULT_CHOICE = [
  /(?:우승|준우승|입상|수상|합격|당첨|당선|승진|진급|데뷔|스카우트|만점|1등|일등)\s*(?:한다|했다|된다|됐다)/,
  /선발로 나간다|주전으로 뛴다|대표로 뽑힌다|뽑힌다/,
  /자격증을 딴다|기록을 세운다|기록을 단축한다|계속 이긴다|논리로 이긴다|돌려받는다|해낸다|지도자가 된다|보스전을 잡는다|1점을 더 올린다/
];
const badChoice = [];
const badShape = [];
EVENTS.filter((e) => String(e.id).indexOf('cm_') === 0).forEach((ev) => {
  if (typeof ev.minAge !== 'number' || typeof ev.maxAge !== 'number') badShape.push(ev.id + ' 나이범위');
  if (!Array.isArray(ev.choices) || ev.choices.length < 2 || ev.choices.length > 4) badShape.push(ev.id + ' 선택지수');
  ev.choices.forEach((c, i) => {
    if (!c.label) badShape.push(ev.id + '[' + i + '] 라벨');
    if (typeof c.label === 'string' && RESULT_CHOICE.some((re) => re.test(c.label))) badChoice.push(ev.id + '[' + i + '] ' + c.label);
    if (!c.result) badShape.push(ev.id + '[' + i + '] 결과');
  });
});
check('카메오 이벤트 모양(나이·선택지 2~4·라벨·결과)', badShape.length === 0, badShape.join(', ') || '이상 없음');
check('카메오 선택지 결과확정형 0건', badChoice.length === 0, badChoice.join(' | ') || '0건');

/* ── 1) 전당에 '상훈' → 다음 인생 '희연'의 세계에 등장 ── */
clearStorage();
putHall([SANGHUN]);
const s1 = Life.newGame({ name: '희연', gender: '여', startAge: 14 });
check('이전 회차 1건 → 카메오 1명', s1.cameos.length === 1, s1.cameos.map((c) => c.name).join(','));
const c1 = s1.cameos[0] || {};
check('카메오 이름 = 상훈', c1.name === '상훈', c1.name);
check('카메오 성별 짐작(이름 끝 훈 → 남)', c1.gender === '남', c1.gender);
check('카메오 기록 = 80세 완주 · 종합 71점', c1.stageLabel === '80세 완주' && c1.score === 71, c1.stageLabel + ' / ' + c1.score);
check('카메오 재산 등급 = 억대 재산', c1.wealth && c1.wealth.key === 'rich', c1.wealth && c1.wealth.noun);
check('카메오 최고 능력치 = 호감도', c1.top && c1.top.key === 'social' && c1.top.value === 84, JSON.stringify(c1.top));
check('카메오 관계 시작 = none', c1.rel === 'none', c1.rel);
check('이성(여 ↔ 남)이라 연애 갈래 열림', Life.cameoCanRomance(s1, c1) === true);

// 같은 이름이면 나를 만나지 않는다
const self = Life.newGame({ name: '상훈', gender: '남', startAge: 14 });
check('현재 플레이어와 같은 이름은 제외', self.cameos.length === 0, self.cameos.length + '명');

// 최대 3명 · 같은 이름은 최신 한 번만
clearStorage();
putHall([
  SANGHUN,
  Object.assign({}, SANGHUN, { id: 'r-sh-2', name: '상훈', ts: 1800000000000, score: 74.2 }),
  Object.assign({}, SANGHUN, { id: 'r-hy-1', name: '희연', ts: 1750000000000 }),
  Object.assign({}, SANGHUN, { id: 'r-ji-1', name: '지훈', ts: 1740000000000 }),
  Object.assign({}, SANGHUN, { id: 'r-mi-1', name: '수미', ts: 1730000000000 }),
  Object.assign({}, SANGHUN, { id: 'r-seed', name: '김도윤', mine: false, seed: true, ts: 1900000000000 })
]);
const many = Life.newGame({ name: '새사람', gender: '남', startAge: 14 });
const manyNames = many.cameos.map((c) => c.name);
check('카메오 최대 3명', many.cameos.length === 3, manyNames.join(','));
check('같은 이름은 최신 기록 한 건만', manyNames.filter((n) => n === '상훈').length === 1, manyNames.join(','));
check('가상 인물(시드) 기록은 카메오에서 제외', manyNames.indexOf('김도윤') === -1, manyNames.join(','));
check('최근 기록부터 고른다', manyNames[0] === '상훈' && many.cameos[0].score === 74, manyNames[0] + ' ' + many.cameos[0].score);

/* ── 2) 등장 장면 — 이름이 실제 기록에서 온 이름으로 나온다 ── */
clearStorage();
putHall([SANGHUN]);
const s2 = Life.newGame({ name: '희연', gender: '여', startAge: 8 });
const meet = force(s2, 'cm_meet_elementary', 10, 4);
const meetText = evText(meet, s2);
check('초등 등장 장면에 상훈의 실제 이름', meetText.indexOf('상훈') !== -1, meetText.slice(0, 60));
check('초등 등장 장면에 그 사람의 결(호감도·사람을 좋아하는 성향)', meetText.indexOf('친해') !== -1 || meetText.indexOf('사람') !== -1, meetText.slice(-40));
const note = Life.cameoNote(s2);
check('카드 안내줄 — 이름·기록', note && note.name === '상훈' && note.record.indexOf('80세 완주') !== -1, note && note.record);

/* ── 3) 친구 → 연인 → 부부 (실제 선택 흐름) ── */
clearStorage();
putHall([SANGHUN]);
const s3 = Life.newGame({ name: '희연', gender: '여', startAge: 8 });
strong(s3);
force(s3, 'cm_meet_elementary', 10, 4);
const meetRes = Life.choose(s3, 0);
check('먼저 말을 걸어 친구가 됨', s3.cameos[0].rel === 'friend' && meetRes.entry.cameo === true,
  s3.cameos[0].rel + ' / 일지 카메오 표시 ' + meetRes.entry.cameo);
check('친구가 된 결과 문구에 이름', meetRes.result.indexOf('상훈') !== -1, meetRes.result.slice(0, 40));

force(s3, 'cm_reunion', 30, 6);
const reunionText = evText(force(s3, 'cm_reunion', 30, 6), s3);
Life.choose(s3, 0);
check('몇 년 만의 연락 → 연인', s3.cameos[0].rel === 'dating', s3.cameos[0].rel + ' / ' + reunionText.slice(0, 30));

force(s3, 'cm_deepen', 36, 5);
const deepenRes = Life.choose(s3, 0);
check('진지한 이야기 → 부부', s3.cameos[0].rel === 'married', s3.cameos[0].rel);
check('부부가 되면 결혼·배우자 플래그', s3.flags.결혼 === true && s3.flags.배우자 === true,
  `결혼:${!!s3.flags.결혼} 배우자:${!!s3.flags.배우자}`);
check('부부 결과 문구에 이름', deepenRes.result.indexOf('상훈') !== -1, deepenRes.result.slice(0, 40));

const seniorEv = force(s3, 'cm_senior', 70, 2);
check('노년 장면이 부부 문구로 바뀜', evText(seniorEv, s3).indexOf('창밖') !== -1, evText(seniorEv, s3).slice(0, 40));

const s3sum = Life.summary(s3);
check('요약에 인연(부부) 반영', s3sum.cameo && s3sum.cameo.rel === 'married' && s3sum.cameo.relLabel === '부부',
  s3sum.cameo && s3sum.cameo.relLabel);

/* ── 4) 저장 · 불러오기 · 되돌리기 ── */
Life.save(s3);
const reload = Life.load();
check('저장/불러오기에서 관계 유지', reload && reload.cameos[0].rel === 'married' && reload.cameos[0].name === '상훈',
  reload && reload.cameos[0].rel);
check('저장본 버전 v5', reload && reload.v === 5, reload && reload.v);

const s4 = Life.newGame({ name: '희연', gender: '여', startAge: 25 });
strong(s4);
force(s4, 'cm_meet_work', 26, 3);
Life.choose(s4, 0);
force(s4, 'cm_reunion', 30, 6);
Life.choose(s4, 0);
check('동창 재회 → 연인', s4.cameos[0].rel === 'dating', s4.cameos[0].rel);
force(s4, 'cm_breakup', 33, 3);
Life.choose(s4, 1);
check('이별 선택 → 스쳐 간 인연', s4.cameos[0].rel === 'parted', s4.cameos[0].rel);
Life.undo(s4);
check('되돌리기 → 관계도 함께 되돌아감', s4.cameos[0].rel === 'dating', s4.cameos[0].rel);

/* ── 5) 실패 갈래 — 능력치가 낮으면 친구가 되지 않는다 ── */
const s5 = Life.newGame({ name: '희연', gender: '여', startAge: 8 });
weak(s5);
force(s5, 'cm_meet_elementary', 10, 4);
const failRes = Life.choose(s5, 0);
check('능력치가 낮으면 친구가 되지 않음', s5.cameos[0].rel === 'none', s5.cameos[0].rel);
check('실패 갈래도 결과 문구를 남김', typeof failRes.result === 'string' && failRes.result.length > 5, failRes.result.slice(0, 30));

/* ── 6) 소개팅 갈래 — 한 번도 만나지 못한 인생 ── */
const s6 = Life.newGame({ name: '희연', gender: '여', startAge: 25 });
strong(s6);
force(s6, 'cm_blinddate', 29, 8);
const blindEv = Life.currentEvent(s6);
check('소개팅 장면에 이름', evText(blindEv, s6).indexOf('상훈') !== -1, evText(blindEv, s6).slice(0, 40));
Life.choose(s6, 0);
check('소개팅 성공 → 연인', s6.cameos[0].rel === 'dating', s6.cameos[0].rel);

/* ── 7) 예전 저장본(v4) 호환 — 불러올 때 카메오를 붙인다 ── */
clearStorage();
putHall([SANGHUN]);
const legacy = {
  v: 4, name: '희연', gender: '여', startAge: 14, age: 27, month: 5, turn: 160, rngState: 12345,
  stats: { hp: 60, mental: 60, charm: 60, social: 60, intel: 60, luck: 50, asset: 500 },
  flags: { 중학생: true }, used: [], lastSeen: {}, queue: [], history: [],
  current: { eventId: 'wk_w01', chosen: null }, ended: false, endingKind: null, grad: null,
  hallId: null, undo: null, rewards: { heal: 0, reroll: 0, undo: 0 }, createdAt: 1
};
const migrated = Life.migrate(JSON.parse(JSON.stringify(legacy)));
check('v4 저장본 → v5로 올라감', migrated.v === 5, migrated.v);
check('v4 저장본에 카메오가 붙음', Array.isArray(migrated.cameos) && migrated.cameos[0].name === '상훈',
  JSON.stringify(migrated.cameos.map((c) => c.name)));
check('v4 저장본 이어하기 무사고', !!Life.currentEvent(migrated));

/* ── 8) 전당 기록에 인연이 함께 남는다 ── */
clearStorage();
putHall([SANGHUN]);
const s8 = Life.newGame({ name: '희연', gender: '여', startAge: 25 });
strong(s8);
force(s8, 'cm_meet_work', 26, 3);
Life.choose(s8, 0);
force(s8, 'cm_reunion', 30, 6);
Life.choose(s8, 0);
s8.current = { eventId: 'cm_reunion', chosen: 0, result: 'x' };
s8.age = 80;
s8.month = 12;
const adv = Life.advance(s8);
const mineRec = Life.hallMine().find((r) => r.name === '희연');
check('80세 완주 → 전당 등록', adv.ok && adv.ended && !!mineRec, adv.ended + ' / ' + (mineRec && mineRec.name));
check('전당 기록에 카메오 인연', mineRec && mineRec.cameo && mineRec.cameo.rel === 'dating' &&
  mineRec.cameo.name === '상훈', mineRec && mineRec.cameo && mineRec.cameo.name + ' ' + mineRec.cameo.rel);

/* ── 9) 여러 명일 때 한자리 모임 장면 ── */
clearStorage();
putHall([SANGHUN, Object.assign({}, SANGHUN, { id: 'r2', name: '지훈', ts: 1750000000000 })]);
const s9 = Life.newGame({ name: '희연', gender: '여', startAge: 25 });
const allEv = EVENTS.find((e) => e.id === 'cm_all_together');
const allText = evText(allEv, s9);
check('여럿일 때 이름을 모두 부른다', allText.indexOf('상훈') !== -1 && allText.indexOf('지훈') !== -1, allText.slice(0, 60));
check('한 명뿐이면 모임 장면은 열리지 않음', (function () {
  const one = Life.newGame({ name: '희연', gender: '여', startAge: 25 });
  one.cameos = one.cameos.slice(0, 1);
  return allEv.when(one) === false;
})());

/* ── 10) 카메오가 있는 인생 — 무작위로 살아도 장면이 실제로 나온다 ── */
clearStorage();
putHall([SANGHUN]);
const organic = [];
let married = 0;
for (let k = 0; k < 4; k++) {
  const s = Life.newGame({ name: '희연', gender: '여', startAge: 8 });
  let guard = 0;
  while (!s.ended && guard++ < 4000) {
    const ev = Life.currentEvent(s);
    if (String(ev.id).indexOf('cm_') === 0) organic.push(ev.id + '@' + s.age);
    Life.choose(s, Math.floor(Math.random() * ev.choices.length));
    Life.advance(s);
  }
  if (s.cameos[0].rel === 'married') married++;
}
check('무작위 플레이에서 카메오 장면이 실제로 나옴', organic.length > 0, organic.slice(0, 6).join(', ') || '0회');
check('무작위 플레이에서도 부부 갈래에 도달함', married > 0, married + ' / 4판');

/* ── 결과 ── */
ran.forEach((line) => console.log(line));
const failed = ran.filter((l) => l.startsWith('FAIL'));
console.log('\n=== 카메오 검사 ' + (ran.length - failed.length) + ' / ' + ran.length + ' 통과 ===');
console.log('=== 결과:', failed.length ? 'FAIL' : 'PASS', '===');
if (failed.length) process.exitCode = 1;
