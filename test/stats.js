// 역량(intel)·행운(luck) 검증 — 일곱 능력치의 엔진·저장·결산·전당 일관성
//  · STATS/프리셋/게이지 목록에 두 능력치가 있고 0~100으로 다뤄지는지
//  · 예전 저장본(v3, 역량·행운 없음)이 50으로 채워져 이어지는지
//  · 효과 적용(고수준 체감·클램프)과 최고치 유지가 두 능력치에도 걸리는지
//  · 종합 점수·졸업 결산 행·명예의 전당 기록이 두 능력치를 포함하는지
//  · 입시 합격선(tn_h50)이 역량을 반영하는지
//  · 행운이 미니 승부 확률(Life.luckBias)로 이어지는지
const path = require('path');
const { load } = require('../tools/lib-load');

const base = path.join(__dirname, '..', 'assets');
const { Life, EVENTS } = load(base);

const results = [];
const check = (name, cond, extra) => results.push(`${cond ? 'PASS' : 'FAIL'} · ${name}${extra ? ' — ' + extra : ''}`);
const byId = (id) => EVENTS.find((e) => e.id === id);

/* ═════════ ① 정의 ═════════ */
const keys = Life.STATS.map((s) => s.key);
check('능력치 7종', keys.length === 7, keys.join(','));
check('역량·행운이 능력치에 포함', keys.includes('intel') && keys.includes('luck'), keys.join(','));
check('화면 순서: 체력·멘탈·매력·호감도·역량·행운·재산',
  keys.join(',') === 'hp,mental,charm,social,intel,luck,asset', keys.join(','));
check('역량 라벨', Life.STAT_META.intel.label === '역량' && Life.STAT_META.intel.emoji === '🧠');
check('행운 라벨', Life.STAT_META.luck.label === '행운' && Life.STAT_META.luck.emoji === '🍀');
check('게이지 목록에 두 능력치', Life.GAUGE_KEYS.includes('intel') && Life.GAUGE_KEYS.includes('luck'),
  Life.GAUGE_KEYS.join(','));

/* ═════════ ② 프리셋 ═════════ */
const presetOk = [1, 8, 14, 17, 20, 25, 35].every((age) => {
  const s = Life.newGame({ name: '프리셋', gender: '남', startAge: age });
  return typeof s.stats.intel === 'number' && typeof s.stats.luck === 'number' &&
    s.stats.intel >= 30 && s.stats.intel <= 80 && s.stats.luck >= 30 && s.stats.luck <= 80;
});
check('모든 시작 나이에 역량·행운 프리셋', presetOk);

/* ═════════ ③ 효과 적용: 클램프·고수준 체감 ═════════ */
const gain = Life.newGame({ name: '효과', gender: '여', startAge: 20 });
gain.stats.intel = 30;
const before = gain.stats.intel;
const res = (function () {
  const target = { eventId: '__t', chosen: null, event: null };
  const fake = { id: '__t', stage: 'college', minAge: 20, maxAge: 20, title: 't', text: 't',
    choices: [{ label: 'a', result: 'r', effects: { intel: 4, luck: 4 } }, { label: 'b', result: 'r', effects: {} }] };
  EVENTS.push(fake);
  const savedCurrent = gain.current;
  gain.current = target;
  const out = Life.choose(gain, 0);
  gain.current = savedCurrent;
  EVENTS.pop();
  return out;
})();
check('역량 효과 적용', gain.stats.intel - before === 4, `${before}→${gain.stats.intel}`);
check('행운 효과 적용', gain.stats.luck >= 52, `${gain.stats.luck}`);
check('델타에 역량·행운 기록', res && res.deltas.intel === 4 && typeof res.deltas.luck === 'number',
  JSON.stringify(res && res.deltas));

const capped = Life.newGame({ name: '상한', gender: '남', startAge: 20 });
capped.stats.intel = 99;
const fake2 = { id: '__t2', stage: 'college', minAge: 20, maxAge: 20, title: 't', text: 't',
  choices: [{ label: 'a', result: 'r', effects: { intel: 5, luck: 5 } }] };
EVENTS.push(fake2);
capped.current = { eventId: '__t2', chosen: null, event: null };
Life.choose(capped, 0);
EVENTS.pop();
check('역량 상한 100', capped.stats.intel <= 100, String(capped.stats.intel));
check('행운 상한 100', capped.stats.luck <= 100, String(capped.stats.luck));
check('99에서 +5는 조금만 오름(고수준 체감)', capped.stats.intel < 100, String(capped.stats.intel));

/* ═════════ ④ 최고치 유지 ═════════ */
const up = Life.newGame({ name: '유지', gender: '남', startAge: 30 });
up.stats = { hp: 60, mental: 60, charm: 60, social: 60, intel: 100, luck: 100, asset: 100 };
up.current = { eventId: 'none', chosen: 0 };
Life.advance(up);
check('역량도 한 달에 조금씩 내려감', up.stats.intel < 100 && up.stats.intel > 97, up.stats.intel.toFixed(2));
check('행운도 한 달에 조금씩 내려감', up.stats.luck < 100 && up.stats.luck > 97, up.stats.luck.toFixed(2));

/* ═════════ ⑤ 저장 호환: 역량·행운이 없던 저장본 ═════════ */
const oldSave = Life.newGame({ name: '옛날', gender: '여', startAge: 25 });
oldSave.v = 3;
delete oldSave.stats.intel;
delete oldSave.stats.luck;
oldSave.current = { eventId: 'none', chosen: 0 };
global.window.localStorage.setItem('lifeTurnSim.save.v1', JSON.stringify(oldSave));
const loaded = Life.load();
check('옛 저장본이 그대로 열림', !!loaded, loaded ? loaded.name : 'null');
check('역량 50으로 채워짐', loaded && loaded.stats.intel === 50, loaded ? String(loaded.stats.intel) : '-');
check('행운 50으로 채워짐', loaded && loaded.stats.luck === 50, loaded ? String(loaded.stats.luck) : '-');
check('저장 버전 올라감', loaded && loaded.v === 5, loaded ? String(loaded.v) : '-');

// 졸업 결산 직전 저장본(grad.stats 에 두 능력치가 없던 경우)
const gradSave = Life.newGame({ name: '결산', gender: '남', startAge: 1 });
gradSave.grad = { key: 'elementary', age: 13, registered: false,
  stats: { hp: 60, mental: 60, charm: 60, social: 60, asset: 10 } };
global.window.localStorage.setItem('lifeTurnSim.save.v1', JSON.stringify(gradSave));
const loaded2 = Life.load();
check('결산 저장본의 grad.stats 도 채워짐',
  loaded2 && loaded2.grad && loaded2.grad.stats.intel === 50 && loaded2.grad.stats.luck === 50,
  loaded2 && loaded2.grad ? JSON.stringify(loaded2.grad.stats) : '-');

/* ═════════ ⑥ 종합 점수·졸업 결산 ═════════ */
const low = Life.scoreOfStats({ hp: 60, mental: 60, charm: 60, social: 60, intel: 20, luck: 60, asset: 0 });
const high = Life.scoreOfStats({ hp: 60, mental: 60, charm: 60, social: 60, intel: 90, luck: 60, asset: 0 });
check('종합 점수가 역량을 반영', high > low, `${low.toFixed(1)} → ${high.toFixed(1)}`);

const gs = Life.newGame({ name: '결산행', gender: '남', startAge: 1 });
gs.age = 13; gs.month = 12;
gs.grad = { key: 'elementary', age: 13, registered: false,
  stats: { hp: 60, mental: 60, charm: 60, social: 60, intel: 61, luck: 59, asset: 10 } };
const info = Life.gradInfo(gs);
const rowKeys = info.rows.map((r) => r.key);
check('결산 비교 행 7개(역량·행운 포함)',
  info.rows.length === 7 && rowKeys.includes('intel') && rowKeys.includes('luck'), rowKeys.join(','));
const intelRow = info.rows.find((r) => r.key === 'intel');
check('역량 행에 평균·상위% 계산', intelRow && typeof intelRow.avg === 'number' && typeof intelRow.top === 'number',
  intelRow ? `평균 ${intelRow.avg} · 상위 ${intelRow.top}%` : '-');
check('역량 행 표시값', intelRow && intelRow.disp === '61', intelRow && intelRow.disp);

/* ═════════ ⑦ 명예의 전당 기록 ═════════ */
const hallSave = Life.newGame({ name: '전당', gender: '여', startAge: 1 });
hallSave.age = 13; hallSave.month = 12;
hallSave.stats = { hp: 60, mental: 60, charm: 60, social: 60, intel: 63, luck: 57, asset: 10 };
hallSave.grad = { key: 'elementary', age: 13, registered: false,
  stats: Life.gradInfo(hallSave) ? hallSave.stats : hallSave.stats };
const reg = Life.graduate(hallSave, true);
const rec = Life.hallRecords().find((r) => r.id === hallSave.hallId);
check('전당 등록에 역량·행운 저장', !!(rec && rec.stats.intel === 63 && rec.stats.luck === 57),
  rec ? JSON.stringify(rec.stats) : '없음');
check('전당 등록 성공', !!(reg && reg.ended), reg && reg.ok);

/* ═════════ ⑧ 입시: 역량이 합격선을 가른다 ═════════ */
const admission = byId('tn_h50');
check('합격 발표 이벤트 존재', !!admission);
function passWith(mental, intel) {
  const g = Life.newGame({ name: '입시', gender: '남', startAge: 19 });
  g.stats.mental = mental;
  g.stats.intel = intel;
  g.stats.hp = 60;
  g.stats.charm = 55;
  g.flags = { 성실함: true };
  g.current = { eventId: 'tn_h50', chosen: null, event: null };
  const r = Life.choose(g, 0);
  return { passed: !!g.flags['대학_진학'], text: r.result };
}
const smart = passWith(70, 88);
const dim = passWith(70, 30);
check('같은 멘탈이어도 역량이 높으면 합격', smart.passed, smart.text.slice(0, 18));
check('역량이 낮으면 같은 멘탈로도 불합격', !dim.passed, dim.text.slice(0, 18));

/* ═════════ ⑨ 행운 → 미니 승부 확률 ═════════ */
check('행운 50은 승률 보정 없음', Math.abs(Life.luckBias({ luck: 50 })) < 1e-9, String(Life.luckBias({ luck: 50 })));
check('행운 100은 +25%p', Math.abs(Life.luckBias({ luck: 100 }) - 0.25) < 1e-9, String(Life.luckBias({ luck: 100 })));
check('행운 0은 -25%p', Math.abs(Life.luckBias({ luck: 0 }) + 0.25) < 1e-9, String(Life.luckBias({ luck: 0 })));
check('행운 값이 없으면 보정 없음', Life.luckBias({}) === 0);

/* ═════════ ⑩ 이벤트가 두 능력치를 실제로 움직이는가 ═════════ */
let intelChoices = 0, luckChoices = 0;
EVENTS.forEach((e) => (e.choices || []).forEach((c) => {
  const eff = c.effects;
  if (eff && typeof eff === 'object') {
    if (typeof eff.intel === 'number') intelChoices++;
    if (typeof eff.luck === 'number') luckChoices++;
  }
}));
check('역량을 움직이는 선택지 60개 이상', intelChoices >= 60, `${intelChoices}개`);
check('행운을 움직이는 선택지 20개 이상', luckChoices >= 20, `${luckChoices}개`);

// 전 연령대에 두 능력치를 다루는 이벤트가 있는지
const stageSet = {};
EVENTS.forEach((e) => (e.choices || []).forEach((c) => {
  const eff = c.effects;
  if (eff && typeof eff === 'object' && (typeof eff.intel === 'number' || typeof eff.luck === 'number')) {
    stageSet[e.stage] = (stageSet[e.stage] || 0) + 1;
  }
}));
const stagesNeeded = ['infancy', 'elementary', 'middle', 'high', 'college', 'work', 'family', 'midlife', 'senior'];
const missingStage = stagesNeeded.filter((st) => !stageSet[st]);
check('모든 생애 단계에 역량·행운 이벤트', missingStage.length === 0,
  missingStage.length ? missingStage.join(',') : JSON.stringify(stageSet));

/* ═════════ ⑪ 80세까지 완주하며 두 능력치가 살아 있는가 ═════════ */
const run = Life.newGame({ name: '완주', gender: '남', startAge: 1 });
let guard = 0, sawIntel = false, sawLuck = false;
while (!run.ended && guard++ < 4000) {
  const e = Life.currentEvent(run);
  Life.choose(run, Math.floor(Math.random() * e.choices.length));
  if (run.stats.intel !== 50) sawIntel = true;
  if (run.stats.luck !== 50) sawLuck = true;
  Life.advance(run);
}
check('완주 중 역량이 움직임', sawIntel, String(Math.round(run.stats.intel)));
check('완주 중 행운이 움직임', sawLuck, String(Math.round(run.stats.luck)));
const sum = Life.summary(run);
check('요약 문장에 역량·행운', /역량 \d+/.test(sum.oneLiner) && /행운 \d+/.test(sum.oneLiner), sum.oneLiner.slice(0, 60));
const letter = Life.recall(run, 'life');
check('회고 편지 10줄', letter.length === 10, `${letter.length}줄`);
check('회고 편지에 머리·운 이야기', letter.some((l) => /머리|운|역량|행운/.test(l)),
  letter.filter((l) => /머리|운/.test(l))[0] || '-');

/* ═════════ 출력 ═════════ */
console.log(results.join('\n'));
const fails = results.filter((r) => r.startsWith('FAIL')).length;
console.log('\n역량·행운 검사:', results.length, '항목 · 실패', fails, '건');
if (fails) process.exitCode = 1;
