// 헤드리스 테스트: 이벤트 엔진이 80세까지 막힘·오류 없이 돌아가는지 확인
// + 스탯 밸런스(100에 붙지 않는지) 분포 검증
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
for (const f of ['engine.js', 'content.early.js', 'content.mid.js', 'content.late.js', 'content.extra.js', 'content.more1.js', 'content.more2.js']) {
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
    // 효과 값이 문자열이거나 비정상이면 잡아낸다
    const eff = c.effects;
    if (eff && typeof eff !== 'function') {
      for (const k of Object.keys(eff)) {
        const v = eff[k];
        if (typeof v !== 'number' && !Array.isArray(v)) problems.push(`효과 값 이상: ${ev.id}[${i}].${k}=${JSON.stringify(v)}`);
        if (typeof v === 'number' && k !== 'asset' && Math.abs(v) > 12) problems.push(`효과 과다: ${ev.id}[${i}].${k}=${v}`);
      }
    }
    if (c.queue) {
      const q = Array.isArray(c.queue) ? c.queue : [c.queue];
      q.forEach((qid) => { if (!EVENTS.some((e) => e.id === qid)) problems.push(`queue 대상 없음: ${ev.id} → ${qid}`); });
    }
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
function playOne(startAge, choicePolicy) {
  const s = Life.newGame({ name: '테스트', gender: startAge % 2 ? '남' : '여', startAge });
  let guard = 0;
  const seen = [];
  while (!s.ended && guard++ < 4000) {
    const ev = Life.currentEvent(s);
    if (!ev) throw new Error('이벤트 없음 @ ' + s.age + '/' + s.day);
    const t = typeof ev.title === 'function' ? ev.title(s) : ev.title;
    if (typeof t !== 'string') throw new Error('title 이상: ' + ev.id);
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

const randomPick = (ev) => Math.floor(Math.random() * ev.choices.length);

let totalSeen = {};
let sample = null;
for (const startAge of [1, 8, 14, 17, 20, 25, 35]) {
  for (let run = 0; run < 3; run++) {
    const r = playOne(startAge, randomPick);
    r.seen.forEach(k => { const id = k.split('@')[0]; totalSeen[id] = (totalSeen[id] || 0) + 1; });
    if (startAge === 1 && run === 0) sample = r;
  }
}

// ── 밸런스: 세대별 스탯 분포 ──
const KEYS = ['hp', 'mental', 'charm', 'social'];
const RUNS = 12;
const buckets = {};
const peaks = { hp: [], mental: [], charm: [], social: [] };
let statSamples = 0, at100 = 0, at90 = 0, rapid100 = 0;

for (let run = 0; run < RUNS; run++) {
  const r = playOne(1, randomPick);
  const maxed = { hp: 0, mental: 0, charm: 0, social: 0 };
  // 처음 세 번의 선택으로 100을 찍는지 확인
  const early = { hp: 0, mental: 0, charm: 0, social: 0 };

  const s2 = Life.newGame({ name: '초반', gender: '남', startAge: 1 });
  for (let i = 0; i < 3; i++) {
    const ev = Life.currentEvent(s2);
    Life.choose(s2, randomPick(ev));
    KEYS.forEach(k => { early[k] = Math.max(early[k], s2.stats[k]); });
    Life.advance(s2);
  }
  if (KEYS.some(k => early[k] >= 99.5)) rapid100++;

  r.seen.forEach((tag) => {
    const [id, at] = tag.split('@');
    const age = Number(at.split('-')[0]);
    const s = r.s;
    void s; void id;
    if (age % 10 === 0) {
      if (!buckets[age]) buckets[age] = { hp: [], mental: [], charm: [], social: [] };
      // 현재 스탯은 아래에서 별도로 기록
    }
  });

  // 세대별 스탯: 다시 돌면서 기록
  const s3 = Life.newGame({ name: '기록', gender: '여', startAge: 1 });
  let guard = 0;
  while (!s3.ended && guard++ < 4000) {
    const ev = Life.currentEvent(s3);
    Life.choose(s3, randomPick(ev));
    KEYS.forEach(k => {
      const v = s3.stats[k];
      if (v > maxed[k]) maxed[k] = v;
      statSamples++;
      if (v >= 99.5) at100++;
      if (v >= 90) at90++;
    });
    const age = s3.age;
    if (age % 10 === 0 && age >= 10) {
      if (!buckets[age]) buckets[age] = { hp: [], mental: [], charm: [], social: [] };
      KEYS.forEach(k => buckets[age][k].push(s3.stats[k]));
    }
    Life.advance(s3);
  }
  KEYS.forEach(k => peaks[k].push(maxed[k]));
}

const avg = a => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);

// ── 특정 마일스톤이 제대로 나오는지 ──
const s1 = Life.newGame({ name: '테스트', gender: '남', startAge: 1 });
const seq = [];
seq.push([s1.age, s1.day, Life.currentEvent(s1).id]);
Life.choose(s1, 0);
Life.advance(s1);
seq.push([s1.age, s1.day, Life.currentEvent(s1).id]);
Life.choose(s1, 1);
Life.choose(s1, 0);
Life.advance(s1);

const unused = EVENTS.filter(e => !totalSeen[e.id] && !e.at).map(e => e.id);

console.log('=== 정적 검사 ===');
console.log('이벤트 수:', EVENTS.length, '| 단계별:', JSON.stringify(stages));
console.log('문제:', problems.length ? problems : '없음');
console.log('\n=== 시뮬레이션 (7개 시작 나이 × 3회, 80세까지) ===');
console.log('첫 두 턴:', JSON.stringify(seq));
console.log('한 번도 등장하지 않은 비고정 이벤트:', unused.length ? unused : '없음');
console.log('\n=== 스탯 밸런스 (' + RUNS + '회 완주) ===');
console.log('나이   ' + KEYS.map(k => k.padEnd(12)).join(''));
for (const age of Object.keys(buckets).map(Number).sort((a, b) => a - b)) {
  const b = buckets[age];
  console.log(String(age).padStart(3) + '세  ' + KEYS.map(k => (avg(b[k]) + '(최고 ' + Math.max(...b[k]).toFixed(0) + ')').padEnd(12)).join(''));
}
console.log('인생 최고치 평균:', KEYS.map(k => k + ' ' + avg(peaks[k])).join('  '),
  '| 전체 최대:', KEYS.map(k => Math.max(...peaks[k]).toFixed(0)).join('/'));
console.log('100 도달 비율:', (at100 / statSamples * 100).toFixed(2) + '%',
  '| 90 이상 비율:', (at90 / statSamples * 100).toFixed(2) + '%',
  '| 3턴 만에 100 도달:', rapid100 + '/' + RUNS);
console.log('밸런스 판정:',
  at100 / statSamples < 0.01 && rapid100 === 0 ? 'PASS — 스탯이 100에 붙지 않음' : 'FAIL — 100 도달이 잦음');
console.log('\n=== 샘플 엔딩 ===');
console.log('제목:', sample.sum.title);
console.log('등급:', sample.sum.grade, sample.sum.gradeLabel, sample.sum.score);
console.log('요약:', sample.sum.oneLiner);
console.log('태그:', sample.sum.tags.join(', '));
console.log('하이라이트:', sample.sum.highlights.map(h => `${h.age}세 ${h.title}`).join(' | '));
console.log('선택 수:', sample.s.history.length, '| 최종 재산:', Life.formatAsset(sample.s.stats.asset));
