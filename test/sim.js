// 헤드리스 테스트: 이벤트 엔진이 1세~80세까지 막힘·오류 없이 돌아가는지 확인
//  · 정적 검사(중복 id·빈 필드·효과 범위·개월차·나이 고증)
//  · 80세까지 완주 시 폴백(조용한 한 달/평범한 하루) 발생 횟수 = 0
//  · 스탯 밸런스(100에 붙지 않는지) 분포 검증
const path = require('path');
const { load } = require('../tools/lib-load');

const base = path.join(__dirname, '..', 'assets');
const { Life, EVENTS } = load(base);

const STAGE_OF = Life.stageOf;
const STAGES = {};
Life.STAGES.forEach((s) => { STAGES[s.id] = s; });

// ── 정적 검사 ──
const problems = [];
const ids = new Set();
const KNOWN_STAGES = new Set(Life.STAGES.map((s) => s.id).concat(['any']));
const KNOWN_KEYS = new Set(['hp', 'mental', 'charm', 'social', 'intel', 'luck', 'asset']);

for (const ev of EVENTS) {
  if (!ev.id) problems.push('id 없음: ' + JSON.stringify(ev).slice(0, 60));
  if (ids.has(ev.id)) problems.push('중복 id: ' + ev.id);
  ids.add(ev.id);
  if (!ev.stage || !KNOWN_STAGES.has(ev.stage)) problems.push('stage 이상: ' + ev.id);
  if (!ev.title) problems.push('title 없음: ' + ev.id);
  if (!ev.text) problems.push('text 없음: ' + ev.id);
  if (!Array.isArray(ev.choices) || ev.choices.length < 2 || ev.choices.length > 4) {
    problems.push('선택지 수 이상: ' + ev.id + ' (' + (ev.choices || []).length + ')');
  }
  // 나이 범위: 모든 이벤트는 나이 범위를 명시해야 한다
  if (typeof ev.minAge !== 'number' || typeof ev.maxAge !== 'number') {
    problems.push('나이 범위 없음: ' + ev.id);
  } else if (ev.minAge > ev.maxAge) {
    problems.push('나이 범위 역전: ' + ev.id + ' ' + ev.minAge + '~' + ev.maxAge);
  } else if (ev.stage !== 'any') {
    const st = STAGES[ev.stage];
    if (st && (ev.minAge < st.from || ev.maxAge > st.to)) {
      problems.push('단계 밖 나이: ' + ev.id + ' ' + ev.minAge + '~' + ev.maxAge + ' / ' + st.name);
    }
  }
  (ev.choices || []).forEach((c, i) => {
    if (!c.label) problems.push(`label 없음: ${ev.id}[${i}]`);
    if (!c.result) problems.push(`result 없음: ${ev.id}[${i}]`);
    const eff = c.effects;
    if (eff && typeof eff !== 'function') {
      for (const k of Object.keys(eff)) {
        const v = eff[k];
        if (!KNOWN_KEYS.has(k)) problems.push(`알 수 없는 효과 키: ${ev.id}[${i}].${k}`);
        if (typeof v !== 'number' && !Array.isArray(v)) problems.push(`효과 값 이상: ${ev.id}[${i}].${k}=${JSON.stringify(v)}`);
        if (typeof v === 'number' && k !== 'asset' && Math.abs(v) > 5) problems.push(`효과 과다: ${ev.id}[${i}].${k}=${v}`);
      }
    }
    if (c.queue) {
      const q = Array.isArray(c.queue) ? c.queue : [c.queue];
      q.forEach((qid) => { if (!EVENTS.some((e) => e.id === qid)) problems.push(`queue 대상 없음: ${ev.id} → ${qid}`); });
    }
  });
  if (ev.at) {
    const pairs = Array.isArray(ev.at[0]) ? ev.at : [ev.at];
    for (const [age, month] of pairs) {
      if (!Number.isInteger(month) || month < 1 || month > 12) {
        problems.push(`잘못된 개월차: ${ev.id} (${age}세 ${month}개월)`);
      }
      if (!Number.isInteger(age) || age < 1 || age > Life.END_AGE) {
        problems.push(`잘못된 나이: ${ev.id} (${age})`);
      }
    }
  }
}

// 영아기 전용 이벤트가 2세 이후에 나오지 않는지 (새벽 수유·이유식·배밀이 등)
const INFANT_ONLY = ['night_awake', 'baby_food', 'formula_30', 'crawling', 'doljanchi', 'birth_cry'];
INFANT_ONLY.forEach((id) => {
  const ev = EVENTS.find((e) => e.id === id);
  if (!ev) { problems.push('영아기 핵심 이벤트 없음: ' + id); return; }
  const maxAge = ev.at ? Math.max(...(Array.isArray(ev.at[0]) ? ev.at : [ev.at]).map((p) => p[0])) : ev.maxAge;
  if (maxAge > 1) problems.push(`영아기 이벤트가 2세 이상에 노출: ${id} (maxAge ${maxAge})`);
});

// ── 텍스트 검사: 영문 혼합 오타·비한글 문자 ──
// (예전 '총Student회' 같은 사고를 자동으로 잡는다. 단위·등급·고유명사는 허용)
const ALLOW_LATIN = new Set([
  'TV', 'PC', 'AI', 'LED', 'MRI', 'IRP', 'NCS', 'OT', 'VIP', 'STAR', 'A4', 'FM',
  'kg', 'cm', 'km', 'ml', 'vs', 'N', 'p', 'D-day', 'D-1', 'D-100', 'B', 'C', 'A'
]);
const latinBad = /[\u4e00-\u9fff\u3040-\u30ff]/;
function checkText(label, text) {
  if (typeof text !== 'string') return;
  if (latinBad.test(text)) problems.push(`한자·일본어 문자: ${label} — ${text.slice(0, 40)}`);
  const tokens = text.match(/[A-Za-z]+(?:-[A-Za-z0-9]+)*/g) || [];
  tokens.forEach((tok) => {
    if (ALLOW_LATIN.has(tok)) return;
    if (/^[A-F]$/.test(tok) || /^D-(day|\d+)$/.test(tok)) return; // 학점·디데이
    problems.push(`영문 혼합 의심: ${label} — '${tok}' (${text.slice(0, 34)})`);
  });
  // 한글-영문이 븙어붙은 단어 (예: 총Student회)
  const glued = text.match(/[가-힣][A-Za-z]{2,}[가-힣]/g) || [];
  glued.forEach((g) => {
    if (/[가-힣](?:cm|kg|km|ml|TV|PC|AI)[가-힣]/.test(g)) return;
    problems.push(`한글·영문 븙어붙음: ${label} — '${g}'`);
  });
}

EVENTS.forEach((ev) => {
  checkText(ev.id + '.title', ev.title);
  checkText(ev.id + '.text', ev.text);
  checkText(ev.id + '.place', ev.place);
  (ev.choices || []).forEach((c, i) => {
    checkText(`${ev.id}[${i}].label`, c.label);
    checkText(`${ev.id}[${i}].result`, c.result);
  });
});

const stages = {};
EVENTS.forEach((e) => { stages[e.stage] = (stages[e.stage] || 0) + 1; });

// ── 시뮬레이션 ──
function playOne(startAge, choicePolicy, collect) {
  const s = Life.newGame({ name: '테스트', gender: startAge % 2 ? '남' : '여', startAge });
  let guard = 0;
  const seen = [];
  while (!s.ended && guard++ < 4000) {
    const ev = Life.currentEvent(s);
    if (!ev) throw new Error('이벤트 없음 @ ' + s.age + '/' + s.month);
    const t = typeof ev.title === 'function' ? ev.title(s) : ev.title;
    if (typeof t !== 'string') throw new Error('title 이상: ' + ev.id);
    if (ev.__generic && collect) collect.fallback.push(s.age + '세 ' + s.month + '개월차');
    seen.push(ev.id + '@' + s.age + '-' + s.month);
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
    if (!a.ok) throw new Error('진행 실패 @ ' + s.age + '/' + s.month);
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
const collect = { fallback: [] };
for (const startAge of [1, 8, 14, 17, 20, 25, 35]) {
  for (let run = 0; run < 3; run++) {
    const r = playOne(startAge, randomPick, collect);
    r.seen.forEach((k) => { const id = k.split('@')[0]; totalSeen[id] = (totalSeen[id] || 0) + 1; });
    if (startAge === 1 && run === 0) sample = r;
  }
}

// ── 개월차 진행 확인: 1세 1개월차 → 2개월차 → … → 12개월차 → 2세 1개월차 ──
const first = Life.newGame({ name: '개월', gender: '남', startAge: 1 });
const monthSeq = [];
for (let i = 0; i < 13; i++) {
  const ev = Life.currentEvent(first);
  monthSeq.push(first.age + '세 ' + first.month + '개월차 ' + ev.id);
  Life.choose(first, 0);
  Life.advance(first);
}

// ── 나이 고증: 3세·5세를 오래 플레이해도 영아기 전용 이벤트가 나오지 않는지 ──
const infantLeak = [];
for (const startAge of [2, 3, 5, 7]) {
  for (let run = 0; run < 4; run++) {
    const s = Life.newGame({ name: '고증', gender: run % 2 ? '여' : '남', startAge });
    let guard = 0;
    while (!s.ended && guard++ < 4000) {
      const ev = Life.currentEvent(s);
      if (s.age >= 2 && INFANT_ONLY.includes(ev.id)) infantLeak.push(`${startAge}세 시작 → ${s.age}세 ${s.month}개월차 ${ev.id}`);
      if (s.age >= 4 && (ev.maxAge !== undefined && ev.maxAge < s.age)) infantLeak.push(`나이 초과 노출 ${ev.id}`);
      Life.choose(s, randomPick(ev));
      Life.advance(s);
    }
  }
}

// ── 밸런스: 세대별 스탯 분포 ──
const KEYS = ['hp', 'mental', 'charm', 'social', 'intel', 'luck'];
const RUNS = 12;
const buckets = {};
const peaks = { hp: [], mental: [], charm: [], social: [], intel: [], luck: [] };
let statSamples = 0, at100 = 0, at90 = 0, rapid100 = 0;

for (let run = 0; run < RUNS; run++) {
  const maxed = { hp: 0, mental: 0, charm: 0, social: 0, intel: 0, luck: 0 };

  const s2 = Life.newGame({ name: '초반', gender: '남', startAge: 1 });
  const early = { hp: 0, mental: 0, charm: 0, social: 0, intel: 0, luck: 0 };
  for (let i = 0; i < 3; i++) {
    const ev = Life.currentEvent(s2);
    Life.choose(s2, randomPick(ev));
    KEYS.forEach((k) => { early[k] = Math.max(early[k], s2.stats[k]); });
    Life.advance(s2);
  }
  if (KEYS.some((k) => early[k] >= 99.5)) rapid100++;

  const s3 = Life.newGame({ name: '기록', gender: '여', startAge: 1 });
  let guard = 0;
  while (!s3.ended && guard++ < 4000) {
    const ev = Life.currentEvent(s3);
    Life.choose(s3, randomPick(ev));
    KEYS.forEach((k) => {
      const v = s3.stats[k];
      if (v > maxed[k]) maxed[k] = v;
      statSamples++;
      if (v >= 99.5) at100++;
      if (v >= 90) at90++;
    });
    const age = s3.age;
    if (age % 10 === 0 && age >= 10) {
      if (!buckets[age]) buckets[age] = { hp: [], mental: [], charm: [], social: [], intel: [], luck: [] };
      KEYS.forEach((k) => buckets[age][k].push(s3.stats[k]));
    }
    Life.advance(s3);
  }
  KEYS.forEach((k) => peaks[k].push(maxed[k]));
}

const avg = (a) => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
const unused = EVENTS.filter((e) => !totalSeen[e.id] && !e.at).map((e) => e.id);

console.log('=== 정적 검사 ===');
console.log('이벤트 수:', EVENTS.length, '| 단계별:', JSON.stringify(stages));
console.log('문제:', problems.length ? problems.slice(0, 20) : '없음');
console.log('\n=== 개월차 진행 (1세 시작) ===');
monthSeq.forEach((m) => console.log('  ' + m));
console.log('\n=== 시뮬레이션 (7개 시작 나이 × 3회, 80세까지) ===');
console.log('폴백(조용한 한 달/평범한 하루) 발생:', collect.fallback.length, '회',
  collect.fallback.length ? JSON.stringify(collect.fallback.slice(0, 10)) : '');
console.log('한 번도 등장하지 않은 비고정 이벤트:', unused.length ? unused.length + '개' : '없음');
console.log('\n=== 나이 고증 (2·3·5·7세 시작 각 4회 완주) ===');
console.log('영아기 이벤트 누출/나이 초과:', infantLeak.length ? infantLeak.slice(0, 10) : '없음');
console.log('\n=== 스탯 밸런스 (' + RUNS + '회 완주) ===');
console.log('나이   ' + KEYS.map((k) => k.padEnd(12)).join(''));
for (const age of Object.keys(buckets).map(Number).sort((a, b) => a - b)) {
  const b = buckets[age];
  console.log(String(age).padStart(3) + '세  ' + KEYS.map((k) => (avg(b[k]) + '(최고 ' + Math.max(...b[k]).toFixed(0) + ')').padEnd(12)).join(''));
}
console.log('인생 최고치 평균:', KEYS.map((k) => k + ' ' + avg(peaks[k])).join('  '),
  '| 전체 최대:', KEYS.map((k) => Math.max(...peaks[k]).toFixed(0)).join('/'));
console.log('100 도달 비율:', (at100 / statSamples * 100).toFixed(2) + '%',
  '| 90 이상 비율:', (at90 / statSamples * 100).toFixed(2) + '%',
  '| 3턴 만에 100 도달:', rapid100 + '/' + RUNS);
const balancePass = at100 / statSamples < 0.01 && rapid100 === 0;
console.log('밸런스 판정:', balancePass ? 'PASS — 스탯이 100에 붙지 않음' : 'FAIL — 100 도달이 잦음');
console.log('\n=== 샘플 엔딩 ===');
console.log('제목:', sample.sum.title);
console.log('등급:', sample.sum.grade, sample.sum.gradeLabel, sample.sum.score);
console.log('요약:', sample.sum.oneLiner);
console.log('태그:', sample.sum.tags.join(', '));
console.log('하이라이트:', sample.sum.highlights.map((h) => `${h.age}세 ${h.month}개월차 ${h.title}`).join(' | '));
console.log('선택 수:', sample.s.history.length, '| 최종 재산:', Life.formatAsset(sample.s.stats.asset));

const fail = problems.length > 0 || collect.fallback.length > 0 || infantLeak.length > 0 || !balancePass;
console.log('\n=== 결과:', fail ? 'FAIL' : 'PASS', '===');
if (fail) process.exitCode = 1;
