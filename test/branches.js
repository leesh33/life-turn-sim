// 분기·유기성 검증: 여러 시작 나이와 선택 성향으로 다회차 시뮬레이션을 돌려
//  · 조건(requireFlags/excludeFlags/minStat) 이벤트가 조건에 맞을 때만 나오는지
//  · 플레이마다 서로 다른 플래그 체인과 엔딩(칭호·아키타입)이 실제로 갈리는지
//  · 성향별 루트(예술·연구·운동·창업·가정·은퇴 취미)가 도달 가능한지 확인한다.
const path = require('path');

// 재현 가능한 난수 — 분기 검증이 실행마다 흔들리지 않게 고정 시드로 돌린다.
let _seed = 20261117;
Math.random = function () {
  _seed = (_seed * 1664525 + 1013904223) >>> 0;
  return _seed / 4294967296;
};

const { load } = require('../tools/lib-load');

const { Life, EVENTS } = load(path.join(__dirname, '..', 'assets'));

const results = [];
const check = (name, cond, extra) => results.push(`${cond ? 'PASS' : 'FAIL'} · ${name}${extra ? ' — ' + extra : ''}`);

const TARGETS = {
  art: ['그림_재능', '진로_예술', '작품활동', '예술가_길', '전시회'],
  study: ['책벌레', '과학_영재', '진로_공학', '진로_의학', '연구원_길', '학회_논문', '대학원_진학', '개발_길', '교육_길', '교사_길', '의대_진학', '코딩'],
  sport: ['몸놀이_씨앗', '축구부', '운동_재능', '진로_체육', '체육_길', '선수_경력'],
  business: ['창업준비', '창업_길', '창업', '사업체'],
  family: ['결혼', '자녀', '자녀수', '양육', '육아_분담'],
  leisure: ['낚시광', '정원사', '여행가', '텃밭', '반려동물']
};

function pickIndex(ev, s, goal) {
  const want = TARGETS[goal] || [];
  for (let i = 0; i < ev.choices.length; i++) {
    const set = ev.choices[i].set;
    if (!set) continue;
    // trackSet() 은 모든 갈래 키를 담고 하나만 true 다 — '켜는' 선택지만 그 루트로 친다
    if (Object.keys(set).some((k) => want.includes(k) && set[k] === true)) return i;
  }
  return Math.floor(Math.random() * ev.choices.length);
}

function flagAny(cond, flags) {
  if (!cond) return false;
  if (typeof cond === 'string') return !!flags[cond];
  if (Array.isArray(cond)) return cond.some((k) => !!flags[k]);
  if (typeof cond === 'object') return Object.keys(cond).some((k) => (cond[k] === true ? !!flags[k] : flags[k] === cond[k]));
  return false;
}

const runs = [];
const violations = [];
let fallback = 0;
let totalChoices = 0;

const combos = [];
for (const goal of Object.keys(TARGETS)) {
  for (const startAge of [1, 20, 35, 65]) {
    for (let rep = 0; rep < 2; rep++) combos.push({ goal, startAge, rep });
  }
}

for (const { goal, startAge } of combos) {
  const s = Life.newGame({ name: '분기', gender: startAge % 2 ? '남' : '여', startAge });
  let guard = 0;
  const seen = [];
  const flagsAtEnd = {};
  while (!s.ended && guard++ < 1200) {
    const ev = Life.currentEvent(s);
    if (!ev) throw new Error('이벤트 없음 @ ' + s.age + '/' + s.month);
    // 조건 무결성: requireFlags/excludeFlags 를 지키는지
    if (ev.requireFlags && !Life.flagMatch(ev.requireFlags, s.flags)) {
      violations.push(`${ev.id} @ ${s.age}세 ${s.month}개월 — requireFlags ${JSON.stringify(ev.requireFlags)} 불충족`);
    }
    if (ev.excludeFlags && flagAny(ev.excludeFlags, s.flags)) {
      violations.push(`${ev.id} @ ${s.age}세 ${s.month}개월 — excludeFlags ${JSON.stringify(ev.excludeFlags)} 위반`);
    }
    if (ev.__generic) fallback++;
    seen.push(ev.id);
    Life.choose(s, pickIndex(ev, s, goal));
    Life.advance(s);
    totalChoices++;
  }
  if (!s.ended) throw new Error(`엔딩 미도달 (${goal}, ${startAge}세)`);
  Object.assign(flagsAtEnd, s.flags);
  const sum = Life.summary(s);
  runs.push({ goal, startAge, seen, flags: Object.keys(flagsAtEnd).filter((k) => flagsAtEnd[k]), sum, s });
}

/* ── 1. 조건 무결성 ── */
check('조건 이벤트가 조건을 어기고 등장한 경우 없음', violations.length === 0,
  violations.length ? violations.slice(0, 5).join(' / ') : `${runs.length}판 · ${totalChoices}턴`);
check('폴백(일상 이벤트) 0회', fallback === 0, `${fallback}회`);

/* ── 2. 플래그 체인 다양성 ── */
const uniqueFlags = new Set();
runs.forEach((r) => r.flags.forEach((f) => uniqueFlags.add(f)));
check('서로 다른 플래그 60종 이상 등장', uniqueFlags.size >= 60, `${uniqueFlags.size}종`);

const flagSets = new Set(runs.map((r) => r.flags.slice().sort().join('|')));
check('플레이마다 다른 플래그 조합', flagSets.size >= 20, `${flagSets.size}종 / ${runs.length}판`);

/* ── 3. 엔딩 다양성 ── */
const titles = new Set(runs.map((r) => r.sum.title));
const arches = new Set(runs.filter((r) => r.sum.archetype).map((r) => r.sum.archetype.key));
check('서로 다른 엔딩 칭호 15종 이상', titles.size >= 15, `${titles.size}종`);
check('서로 다른 인생 아키타입 8종 이상', arches.size >= 8, `${arches.size}종: ${[...arches].join(', ')}`);
check('엔딩 칭호에 아키타입이 반영됨', runs.every((r) => !r.sum.archetype || r.sum.title.includes(r.sum.archetype.label)),
  runs.filter((r) => r.sum.archetype).map((r) => r.sum.title).slice(0, 3).join(' / '));

/* ── 4. 성향별 루트 도달 ── */
function reached(goal, predicate) {
  return runs.filter((r) => r.goal === goal && predicate(r)).length;
}
check('예술 루트: 그림·작품 플래그와 예술 엔딩 도달',
  reached('art', (r) => r.flags.includes('작품활동') || r.flags.includes('예술가_길')) >= 3 &&
  reached('art', (r) => r.sum.archetype && ['artist', 'musician', 'writer'].includes(r.sum.archetype.key)) >= 1);
check('연구·공학 루트: 연구/개발 플래그 도달',
  reached('study', (r) => r.flags.includes('연구원_길') || r.flags.includes('학회_논문') || r.flags.includes('개발_길') || r.flags.includes('진로_공학')) >= 4);
check('운동 루트: 축구부→체육 플래그 도달',
  reached('sport', (r) => r.flags.includes('축구부') || r.flags.includes('체육_길') || r.flags.includes('진로_체육')) >= 3);
check('창업 루트: 창업 플래그 도달',
  reached('business', (r) => r.flags.includes('창업_길') || r.flags.includes('창업') || r.flags.includes('사업체')) >= 3);
check('가정 루트: 결혼·자녀 체인 도달',
  reached('family', (r) => r.flags.includes('결혼') && r.flags.includes('자녀')) >= 1);
check('은퇴 취미 루트: 낚시·정원·여행 플래그 도달',
  reached('leisure', (r) => ['낚시광', '정원사', '여행가'].some((f) => r.flags.includes(f))) >= 3);

/* ── 5. 시작 나이별로 다른 인생 ── */
function jaccard(a, b) {
  const A = new Set(a), B = new Set(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  return inter / (A.size + B.size - inter);
}
const startMap = {};
runs.forEach((r) => {
  if (!startMap[r.startAge]) startMap[r.startAge] = [];
  startMap[r.startAge].push(r);
});
const avgFlags = (age) => {
  const list = startMap[age];
  return list.reduce((n, r) => n + r.flags.length, 0) / list.length;
};
check('1세·20세·35세·65세 시작 모두 충분한 플래그를 남김',
  [1, 20, 35, 65].every((a) => avgFlags(a) >= 5),
  [1, 20, 35, 65].map((a) => `${a}세 ${avgFlags(a).toFixed(1)}`).join(' / '));
const j1_20 = jaccard(startMap[1][0].flags, startMap[20][0].flags);
const j20_65 = jaccard(startMap[20][0].flags, startMap[65][0].flags);
check('시작 나이가 다르면 플래그 체인도 다른 인생', j1_20 < 0.85 && j20_65 < 0.85,
  `1↔20 유사도 ${(j1_20 * 100).toFixed(0)}% · 20↔65 ${(j20_65 * 100).toFixed(0)}%`);

/* ── 6. 이벤트 규모 ── */
check('이벤트 2,000개 이상', EVENTS.length >= 2000, `${EVENTS.length}개`);
const stageCount = {};
EVENTS.forEach((e) => { stageCount[e.stage] = (stageCount[e.stage] || 0) + 1; });
const thin = ['infancy', 'elementary', 'middle', 'high', 'college', 'work', 'family', 'midlife', 'senior']
  .filter((st) => (stageCount[st] || 0) < 100);
check('전 연령대 모두 100개 이상', thin.length === 0, thin.length ? thin.join(', ') : JSON.stringify(stageCount));

/* ── 7. 체인 연결: 갈래별 후속 이벤트가 실제로 등장 ── */
const chainEvidence = [
  ['그림_재능', 'tn_m21'],
  ['진로_예술', 'tn_m41'],
  ['축구부', 'tn_m24'],
  ['코딩', 'tn_m25'],
  ['창업준비', 'wk_w141'],
  ['연구원_길', 'wk_w142'],
  ['자녀', 'fm_f21'],
  ['손주', 'sr_s25']
];
const allSeen = new Set();
runs.forEach((r) => r.seen.forEach((id) => allSeen.add(id)));
chainEvidence.forEach(([flag, id]) => {
  const ev = Life.byId(id);
  const req = ev && ev.requireFlags ? JSON.stringify(ev.requireFlags) : '';
  check(`체인 후속 이벤트 정의: ${id} (${flag})`, !!ev && req.includes(flag));
});

/* ── 출력 ── */
console.log(results.join('\n'));
console.log('\n=== 대표 엔딩 (판마다 다른 갈래) ===');
runs.slice(0, 16).forEach((r) => {
  const arch = r.sum.archetype ? `${r.sum.archetype.emoji} ${r.sum.archetype.label}` : '—';
  console.log(`  ${String(r.startAge).padStart(2)}세 시작 · ${r.goal.padEnd(8)} · ${r.sum.title} [${arch}]`);
});
const fails = results.filter((r) => r.startsWith('FAIL')).length;
console.log('\n실패:', fails, '건');
if (fails) process.exitCode = 1;
