// 전수조사 도우미 — 이벤트·미션·문구의 나이/상태 불일치를 정적으로 훑는다.
//   node tools/audit-events.js            → 사람이 읽는 요약
//   node tools/audit-events.js --json     → 기계가 읽는 전체 목록(JSON)
// 검사 항목
//   1) 본문·제목·선택지에 적힌 나이(숫자+세 / 숫자+대)가 그 이벤트의 나이 범위 밖인지
//   2) 재직·학생·기혼·자녀·은퇴 같은 '상태 전제' 문구에 그 상태를 보장하는 조건이 있는지
//   3) 같은 제목/본문이 두 번 들어간 중복 이벤트
//   4) 조건(when)이 스스로 모순인지(예: 직업이 있으면서 없기를 요구)
//   5) 나이대 미션 라벨이 실제 나이와 맞는지
const path = require('path');
const { load } = require('./lib-load');

const base = path.join(__dirname, '..', 'assets');
const { Life, EVENTS, Avatar } = load(base);
const JSON_OUT = process.argv.includes('--json');

const AGES = EVENTS.map((e) => ({ ev: e, lo: e.minAge, hi: e.maxAge }));

/* ── 1) 본문 속 나이 ── */
const ageProblems = [];
function agesIn(text) {
  if (typeof text !== 'string') return [];
  const out = [];
  // '26세', '30살'
  for (const m of text.matchAll(/(\d{1,2})\s*(?:세|살)/g)) out.push({ kind: 'age', n: +m[1], raw: m[0] });
  // '30대', '40대'  (나이대 표현)
  for (const m of text.matchAll(/(\d{1,2})\s*대(?![학]|출|리|통])/g)) out.push({ kind: 'band', n: +m[1], raw: m[0] });
  // '20대 후반' 처럼 나이대 + 후반/중반
  return out;
}
for (const { ev, lo, hi } of AGES) {
  const fields = [['title', ev.title], ['text', ev.text]];
  (ev.choices || []).forEach((c, i) => {
    fields.push([`choice[${i}].label`, c.label]);
    fields.push([`choice[${i}].result`, c.result]);
  });
  for (const [name, val] of fields) {
    for (const a of agesIn(val)) {
      const n = a.n;
      if (a.kind === 'age') {
        // 이벤트 나이 범위(없으면 단계 범위) 밖의 나이를 말하면 어긋난다
        const outside = (typeof lo === 'number' && n < lo - 0) || (typeof hi === 'number' && n > hi);
        if (outside) ageProblems.push({ id: ev.id, field: name, n, lo, hi, text: String(val).slice(0, 90), raw: a.raw });
      } else {
        // '30대' = 30~39. 범위와 겹치지 않으면 어긋난다
        const bLo = n, bHi = n + 9;
        const overlaps = !((typeof hi === 'number' && bHi < lo) || (typeof lo === 'number' && bLo > hi));
        if (!overlaps) ageProblems.push({ id: ev.id, field: name, n, lo, hi, text: String(val).slice(0, 90), raw: a.raw });
      }
    }
  }
}

/* ── 2) 상태 전제 문구 ──
   이벤트 본문이 '이미 그 상태'를 전제하는 낱말을 쓰는데, 그 상태를 보장하는
   requireFlags/when 이 없으면 다른 인생(무직·미혼·무자녀·창업)에 그대로 뜬다. */
const STATUS = [
  {
    key: 'job',
    // '회사'가 들어간 합성어(회사원)·전세 회사(부동산)까지는 그대로 직장 문맥이다.
    // '동기'·'대리'·'과장'·'프로젝트'처럼 다른 뜻이 많은 낱말은 뺐다(오탐 방지).
    re: /(출근|퇴근|야근|상사|팀장|사수|사원증|회사|직장|월급|연봉|승진|부장님|과장님|대리님|인사팀|사내|회식|재택|출장|사무실|오피스|업무|거래처|결재|보고서|계약서|연차|성과급|이직|면접관|입사)/,
    guardText: '직업/창업 플래그'
  },
  {
    key: 'student',
    re: /(수업|선생님|담임|중간고사|기말고사|시험지|수학여행|학급|반장|급식|방학|숙제|학원|내신|모의고사|수능|학점|교수님|기숙사|자습|학생회)/,
    guardText: '학생 플래그 또는 학교 단계'
  },
  {
    key: 'married',
    re: /(아내|남편|배우자|신혼|혼인신고|장모님|시어머니|장인어른|시아버지)/,
    guardText: '결혼 플래그'
  },
  {
    key: 'child',
    // 딸·아들은 '녹아들었다'·'받아들인다' 같은 낱말 속에 들어 있어 낱말 경계를 본다
    re: /(아이들|아이가|아이는|아이를|아이의|아이와|아기|자녀|첫째|둘째|육아|어린이집|유치원|(딸|아들)(?=[이는을를의가도만과와에게한테\s,.!?]|$))/,
    guardText: '자녀 플래그'
  },
  {
    key: 'retired',
    re: /(은퇴|정년|연금|노후|손주|손자|손녀)/,
    guardText: '은퇴 플래그 또는 60세 이상'
  }
];

const statusProblems = [];
function hasGuard(ev, kind) {
  const src = [];
  if (ev.requireFlags) src.push(JSON.stringify(ev.requireFlags));
  if (ev.excludeFlags) src.push(JSON.stringify(ev.excludeFlags));
  if (ev.when) src.push(ev.when.toString());
  if (typeof ev.weight === 'function') src.push(ev.weight.toString());
  return src.join(' ');
}
function assuredByText(ev, kind) {
  const s = hasGuard(ev, kind);
  switch (kind) {
    case 'job': return /직업|취업|창업|재직|회사원|사원/.test(s);
    case 'student': return /학생|대학생|고등학생|중학생|초등학생|학교|학년/.test(s);
    case 'married': return /결혼|배우자|아내|남편|혼인/.test(s);
    case 'child': return /자녀|아이|자녀수|아기|출산/.test(s);
    case 'retired': return /은퇴|명퇴|정년|나이|age/.test(s);
    default: return false;
  }
}
for (const ev of EVENTS) {
  // 마일스톤(at)·나이 고정 이벤트는 나이 자체가 조건이다 — 그래도 상태는 확인한다
  const text = [ev.title, ev.text].concat((ev.choices || []).map((c) => c.label + ' ' + c.result)).join(' ');
  for (const st of STATUS) {
    const m = text.match(st.re);
    if (!m) continue;
    // 단계 자체가 그 상태를 보장하는 경우(초등~대학)는 학생 검사에서 처리
    if (st.key === 'student' && ['elementary', 'middle', 'high', 'college'].includes(ev.stage)) continue;
    if (assuredByText(ev, st.key)) continue;
    statusProblems.push({ id: ev.id, stage: ev.stage, lo: ev.minAge, hi: ev.maxAge, kind: st.key,
      word: m[1], title: ev.title, note: st.guardText });
  }
}

/* ── 3) 중복 ── */
const dupProblems = [];
const byText = new Map();
for (const ev of EVENTS) {
  const k = (ev.title || '') + '||' + (ev.text || '');
  if (byText.has(k)) dupProblems.push({ a: byText.get(k).id, b: ev.id, title: ev.title });
  else byText.set(k, ev);
}
const byTitle = new Map();
for (const ev of EVENTS) {
  const k = ev.title || '';
  if (!byTitle.has(k)) byTitle.set(k, []);
  byTitle.get(k).push(ev);
}
const sameTitle = [...byTitle.entries()].filter(([, list]) => list.length > 1)
  .map(([t, list]) => ({ title: t, ids: list.map((e) => `${e.id}(${e.minAge}-${e.maxAge})`) }));

/* ── 4) 조건 모순 ── */
const condProblems = [];
for (const ev of EVENTS) {
  const s = hasGuard(ev, 'x');
  // requireFlags 와 excludeFlags 가 같은 플래그를 동시에 요구
  if (ev.requireFlags && ev.excludeFlags) {
    const req = [].concat(ev.requireFlags);
    const exc = [].concat(ev.excludeFlags);
    const both = req.filter((r) => exc.includes(r));
    if (both.length) condProblems.push({ id: ev.id, why: 'require/exclude 동시: ' + both.join(',') });
  }
  // when 안에서 같은 플래그를 긍정·부정
  if (ev.when) {
    const body = ev.when.toString();
    const flags = [...body.matchAll(/flags\.([가-힣A-Za-z_0-9]+)/g)].map((m) => m[1]);
    const uniq = [...new Set(flags)];
    for (const f of uniq) {
      const yes = new RegExp('flags\\.' + f + '(?![가-힣A-Za-z_0-9])').test(body.replace(new RegExp('!\\s*flags\\.' + f + '(?![가-힣A-Za-z_0-9])', 'g'), ''));
      const no = new RegExp('!\\s*flags\\.' + f + '(?![가-힣A-Za-z_0-9])').test(body);
      if (yes && no) condProblems.push({ id: ev.id, why: `when 에서 ${f} 를 긍정·부정 동시에` });
    }
  }
  // 나이 범위가 단계 밖
  if (ev.stage !== 'any') {
    const st = Life.STAGES.find((x) => x.id === ev.stage);
    if (st && (ev.minAge < st.from || ev.maxAge > st.to)) {
      condProblems.push({ id: ev.id, why: `단계(${st.name} ${st.from}~${st.to}) 밖 나이 ${ev.minAge}~${ev.maxAge}` });
    }
  }
}

/* ── 5) 미션 라벨 ── */
const missionProblems = [];
if (Avatar) {
  for (const band of Avatar.BANDS) {
    for (let age = Math.max(1, band.from); age <= Math.min(80, band.to); age++) {
      const st = { age, stats: {}, flags: {} };
      const m = Avatar.mission(st);
      const label = m.label || '';
      const nums = [...label.matchAll(/(\d{1,2})/g)].map((x) => +x[1]);
      for (const n of nums) {
        // '30·40대' 처럼 여러 숫자가 있으면 그중 하나라도 나이대에 맞으면 통과
        const bands = [...label.matchAll(/(\d{1,2})[·,\s]*(\d{1,2})?대/g)].flatMap((x) => [x[1], x[2]].filter(Boolean).map(Number));
        const ok = bands.length ? bands.some((b) => age >= b && age <= b + 9) : true;
        if (!ok) {
          missionProblems.push({ band: band.id, age, label, why: `${age}세인데 라벨이 '${label}'` });
          break;
        }
      }
    }
  }
}

const report = { ageProblems, statusProblems, dupProblems, sameTitle, condProblems, missionProblems };
if (JSON_OUT) {
  console.log(JSON.stringify(report, null, 1));
} else {
  console.log('이벤트', EVENTS.length, '건');
  console.log('\n[1] 본문 속 나이 불일치:', ageProblems.length);
  ageProblems.slice(0, 40).forEach((p) => console.log(`  ${p.id} (${p.lo}~${p.hi}) ${p.field} "${p.raw}" — ${p.text}`));
  console.log('\n[2] 상태 전제 문구:', statusProblems.length);
  const byKind = {};
  statusProblems.forEach((p) => { byKind[p.kind] = (byKind[p.kind] || 0) + 1; });
  console.log('  종류별:', JSON.stringify(byKind));
  statusProblems.slice(0, 80).forEach((p) => console.log(`  ${p.id} [${p.stage} ${p.lo}~${p.hi}] ${p.kind}: ${p.word} — ${p.title}`));
  console.log('\n[3] 완전 중복:', dupProblems.length, '| 같은 제목:', sameTitle.length);
  dupProblems.forEach((p) => console.log(`  ${p.a} = ${p.b} (${p.title})`));
  sameTitle.slice(0, 30).forEach((p) => console.log(`  "${p.title}" → ${p.ids.join(', ')}`));
  console.log('\n[4] 조건 문제:', condProblems.length);
  condProblems.slice(0, 40).forEach((p) => console.log(`  ${p.id} — ${p.why}`));
  console.log('\n[5] 미션 라벨:', missionProblems.length);
  missionProblems.forEach((p) => console.log(`  ${p.band} ${p.why}`));
}
