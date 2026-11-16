// 헤드리스 테스트: 이벤트 엔진이 80세까지 막힘·오류 없이 돌아가는지 확인
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
for (const f of ['engine.js', 'content.early.js', 'content.mid.js', 'content.late.js']) {
  const code = fs.readFileSync(path.join(base, f), 'utf8');
  (0, eval)(code);
}

const Life = global.window.Life;
const EVENTS = global.window.LIFE_EVENTS;

// ── 정적 검사 ──
let problems = [];
const ids = new Set();
for (const ev of EVENTS) {
  if (!ev.id) problems.push('id 없음: ' + JSON.stringify(ev).slice(0, 60));
  if (ids.has(ev.id)) problems.push('중복 id: ' + ev.id);
  ids.add(ev.id);
  if (!ev.stage) problems.push('stage 없음: ' + ev.id);
  if (!ev.title) problems.push('title 없음: ' + ev.id);
  if (!ev.text) problems.push('text 없음: ' + ev.id);
  if (!Array.isArray(ev.choices) || ev.choices.length < 2) problems.push('선택지 부족: ' + ev.id);
  (ev.choices || []).forEach((c, i) => {
    if (!c.label) problems.push(`label 없음: ${ev.id}[${i}]`);
    if (!c.result) problems.push(`result 없음: ${ev.id}[${i}]`);
  });
  if (ev.at) {
    const pairs = Array.isArray(ev.at[0]) ? ev.at : [ev.at];
    for (const [age, day] of pairs) {
      if (day !== 1 && (day < 30 || day % 30 !== 0 || day > 330)) {
        problems.push(`잘못된 일차: ${ev.id} (${age}세 ${day}일)`);
      }
    }
  }
}
const stages = {};
EVENTS.forEach(e => { stages[e.stage] = (stages[e.stage] || 0) + 1; });

// ── 시뮬레이션 ──
function playOne(startAge, seedTag, choicePolicy) {
  const s = Life.newGame({ name: '테스트', gender: '남', startAge });
  let guard = 0;
  const seen = [];
  while (!s.ended && guard++ < 4000) {
    const ev = Life.currentEvent(s);
    if (!ev) throw new Error('이벤트 없음 @ ' + s.age + '/' + s.day);
    if (typeof (typeof ev.title === 'function' ? ev.title(s) : ev.title) !== 'string') throw new Error('title 이상: ' + ev.id);
    seen.push(ev.id + '@' + s.age + '-' + s.day);
    const idx = choicePolicy(ev, s, guard);
    const res = Life.choose(s, idx);
    if (!res) throw new Error('선택 실패: ' + ev.id + ' idx ' + idx);
    if (typeof res.result !== 'string' || !res.result) throw new Error('결과 문구 없음: ' + ev.id);
    for (const k in s.stats) {
      if (k === 'asset') continue;
      if (s.stats[k] < 0 || s.stats[k] > 100) throw new Error('스탯 범위: ' + k + '=' + s.stats[k]);
    }
    Life.save(s);
    const a = Life.advance(s);
    if (!a.ok) throw new Error('진행 실패 @ ' + s.age + '/' + s.day);
    const reloaded = Life.load();
    if (!reloaded) throw new Error('저장 실패 @ ' + s.age);
  }
  if (!s.ended) throw new Error('엔딩 도달 실패: guard=' + guard);
  const sum = Life.summary(s);
  return { s, sum, seen };
}

let totalSeen = {};
let sample = null;
for (const startAge of [1, 8, 14, 17, 20, 25, 35]) {
  for (let run = 0; run < 3; run++) {
    const r = playOne(startAge, run, (ev, s, g) => Math.floor(Math.random() * ev.choices.length));
    r.seen.forEach(k => { const id = k.split('@')[0]; totalSeen[id] = (totalSeen[id] || 0) + 1; });
    if (startAge === 1 && run === 0) sample = r;
  }
}

// ── 특정 마일스톤이 제대로 나오는지 ──
const s1 = Life.newGame({ name: '테스트', gender: '남', startAge: 1 });
const seq = [];
let guard = 0;
// 1세 1일 → 네 → 30일 진행 → 1세 30일(분유) 확인
seq.push([s1.age, s1.day, Life.currentEvent(s1).id]);
Life.choose(s1, 0);
Life.advance(s1);
seq.push([s1.age, s1.day, Life.currentEvent(s1).id]);
Life.choose(s1, 1);
const r2 = Life.choose(s1, 0);
Life.advance(s1);

const unused = EVENTS.filter(e => !totalSeen[e.id] && !e.at).map(e => e.id);

console.log('=== 정적 검사 ===');
console.log('이벤트 수:', EVENTS.length, '| 단계별:', JSON.stringify(stages));
console.log('문제:', problems.length ? problems : '없음');
console.log('\n=== 시뮬레이션 (7개 시작 나이 × 3회, 80세까지) ===');
console.log('첫 두 턴:', JSON.stringify(seq));
console.log('세션에서 한 번도 안 나온 비고정 이벤트:', unused.length ? unused : '없음');
console.log('\n=== 샘플 엔딩 ===');
console.log('제목:', sample.sum.title);
console.log('등급:', sample.sum.grade, sample.sum.gradeLabel, sample.sum.score);
console.log('요약:', sample.sum.oneLiner);
console.log('태그:', sample.sum.tags.join(', '));
console.log('하이라이트:', sample.sum.highlights.map(h => `${h.age}세 ${h.title}`).join(' | '));
console.log('선택 수:', sample.s.history.length, '| 최종 재산:', Life.formatAsset(sample.s.stats.asset));
