// 전수조사 회귀 검사 (2026-11-24)
//   node test/audit.js
//   · 나이대 미션 이름이 실제 나이와 맞는가 (26세에 '30·40대 미션' 금지)
//   · 본문이 전제하는 상태(배우자·자녀·손주·재직)에 조건이 붙었는가
//   · 그 조건이 실제 플레이에서 지켜지는가 (비혼·무자녀 인생에 배우자 장면이 나오지 않는가)
//   · 본문에 적힌 나이가 그 사건의 나이 범위와 맞는가
//   · 본문까지 같은 중복 사건이 한 인생에서 두 번 나오지 않는가
//   · 살림 장부(연 수지)가 25세부터 붙고, 은퇴 뒤에는 연금으로 바뀌는가
const path = require('path');
const { load } = require('../tools/lib-load');

const base = path.join(__dirname, '..', 'assets');
const { Life, EVENTS, Avatar } = load(base);
const W = global.window;

let fails = 0;
const results = [];
function check(name, ok, detail) {
  results.push((ok ? 'PASS' : 'FAIL') + ' · ' + name + (detail === undefined ? '' : ' — ' + detail));
  if (!ok) fails++;
}

/* ── 1) 나이대 미션 이름 ── */
const labelBad = [];
for (let age = 1; age <= 80; age++) {
  const s = Life.newGame({ name: 'x', gender: '남', startAge: 1 });
  s.age = age;
  s.stats = { hp: 60, mental: 60, charm: 60, social: 60, intel: 60, luck: 50, asset: 1000 };
  s.flags = {};
  if (!s.missionBase) s.missionBase = {};
  const m = Avatar.mission(s);
  const nums = [...String(m.label).matchAll(/(\d{1,2})대/g)].map((x) => +x[1]);
  if (!nums.length) continue;
  if (!nums.some((b) => age >= b && age <= b + 9)) labelBad.push(`${age}세 → ${m.label}`);
}
check('나이대 미션 이름이 나이와 맞음', labelBad.length === 0, labelBad.slice(0, 6).join(', '));
check("26세 미션 이름에 '30·40대' 없음",
  (() => { const s = Life.newGame({ name: 'x', startAge: 25 }); s.age = 26; s.stats = { hp: 60, mental: 60, charm: 60, social: 60, intel: 60, luck: 50, asset: 900 }; s.flags = { 직업: '대기업 기획자' }; return Avatar.mission(s).label.indexOf('30') === -1; })());

/* ── 2) 상태 조건이 붙었는가 ── */
const guards = W.LIFE_STATUS_GUARDS || [];
check('상태 조건이 붙은 사건이 있다', guards.length > 200, guards.length + '건');
const rules = W.LIFE_STATUS_RULES || [];
const ruleById = {};
guards.forEach((g) => { ruleById[g.id] = g.rule; });
const empty = { flags: {}, stats: { hp: 60, mental: 60, charm: 60, social: 60, intel: 60, luck: 50, asset: 1000 }, age: 40 };
const leak = [];
EVENTS.forEach((ev) => {
  if (!ruleById[ev.id] || typeof ev.when !== 'function') return;
  let ok = true;
  try { ok = ev.when(empty); } catch (e) { ok = true; }
  if (ok) leak.push(ev.id + '(' + ruleById[ev.id] + ')');
});
check('조건이 붙은 사건은 빈 상태(미혼·무자녀·무직)에서 열리지 않음', leak.length === 0, leak.slice(0, 8).join(', '));

/* ── 3) 실제 플레이에서 지켜지는가 ──
   엔진이 붙인 규칙 그대로(need 함수) 확인하고, 그 상태를 스스로 만드는 사건
   (결혼식·출산·취직처럼 선택지가 플래그를 세우는 사건)은 건너뛴다. */
function providesState(ev, ruleKey) {
  const keys = ['결혼', '자녀', '자녀수', '은퇴', '명퇴', '직업', '창업'];
  return (ev.choices || []).some((c) => {
    const spec = c.set;
    if (!spec) return false;
    if (typeof spec === 'function') {
      const src = spec.toString();
      return keys.some((k) => src.indexOf(k) !== -1);
    }
    return Object.keys(spec).some((k) => keys.indexOf(k) !== -1);
  });
}
const violations = [];
for (let run = 0; run < 14; run++) {
  const s = Life.newGame({ name: '감사', gender: run % 2 ? '여' : '남', startAge: 1, scenario: run % 3 === 0 ? 'dirt' : 'kr' });
  let guard = 0;
  while (!s.ended && guard++ < 4000) {
    const ev = Life.currentEvent(s);
    const text = [ev.title, ev.text].concat((ev.choices || []).map((c) => c.label + ' ' + c.result)).join(' ');
    rules.forEach((rule) => {
      if (rule.stages && rule.stages.indexOf(ev.stage) === -1) return;
      if (!rule.re.test(text)) return;
      if (providesState(ev, rule.key)) return;
      if (rule.need(s) === false) violations.push(`${s.age}세 ${ev.id}(${rule.key})`);
    });
    Life.choose(s, Math.floor(Math.random() * ev.choices.length));
    Life.advance(s);
  }
}
check('14회 플레이에서 상태 모순 장면 0건', violations.length === 0, violations.slice(0, 6).join(', '));

/* ── 4) 본문 속 나이 ── */
const ageBad = [];
const SAFE = [/4대 보험/, /7 대신/, /50대 계획/, /50세가 넘어/, /50세 전/, /50세에 받기로/, /내년이면 65세/,
  /60세까지/, /체력 나이/, /30대 후반입니다/];
EVENTS.forEach((ev) => {
  const fields = [ev.title, ev.text].concat((ev.choices || []).map((c) => c.label + ' ' + c.result));
  fields.forEach((f) => {
    if (typeof f !== 'string') return;
    if (SAFE.some((re) => re.test(f))) return;
    for (const m of f.matchAll(/(\d{2})\s*(?:세|대)/g)) {
      const n = +m[1];
      const lo = ev.minAge, hi = ev.maxAge;
      const num = (m[0].indexOf('대') > -1) ? [n, n + 9] : [n, n];
      const overlaps = !((hi < num[0]) || (lo > num[1]));
      if (!overlaps) ageBad.push(`${ev.id}(${lo}~${hi}) "${m[0]}" ${String(f).slice(0, 30)}`);
    }
  });
});
check('본문 나이가 사건 나이 범위와 맞음', ageBad.length === 0, ageBad.slice(0, 6).join(' | '));

/* ── 5) 중복 사건 ── */
const dup = [];
const seen = new Map();
EVENTS.forEach((ev) => {
  const k = (ev.title || '') + '||' + (ev.text || '');
  if (seen.has(k)) dup.push(seen.get(k) + ' = ' + ev.id);
  else seen.set(k, ev.id);
});
check('본문까지 같은 사건은 한 인생에서 한 번만 (엔진 규칙)', typeof Life.currentEvent === 'function');
// 같은 인생에서 같은 본문이 두 번 나오지 않는지 실제로 확인
let dupPlays = 0;
for (let run = 0; run < 3; run++) {
  const s = Life.newGame({ name: '중복', gender: '남', startAge: 1 });
  const bodies = {};
  let guard = 0;
  while (!s.ended && guard++ < 4000) {
    const ev = Life.currentEvent(s);
    const k = (ev.title || '') + '||' + (ev.text || '');
    if (bodies[k] && !ev.repeatable) dupPlays++;
    bodies[k] = 1;
    Life.choose(s, Math.floor(Math.random() * ev.choices.length));
    Life.advance(s);
  }
}
check('3회 플레이에서 같은 본문 중복 0건', dupPlays === 0, dupPlays + '건 (목록 ' + dup.length + '쌍)');

/* ── 6) 살림 장부 ── */
const early = Life.newGame({ name: '장부', gender: '남', startAge: 20 });
check('25세 미만은 장부 없음', Life.ledgerOf(Object.assign({}, early, { age: 22 })) === null);

const job = Life.newGame({ name: '장부', gender: '남', startAge: 25 });
job.age = 30; job.flags = { 직업: '대기업 기획자' };
const single = Life.ledgerOf(job);
check('재직 30세 1인 수지 플러스', single && single.net > 0, single && '수입 ' + single.income + ' · 지출 ' + single.cost + ' · 수지 ' + single.net);

const family = Object.assign({}, job, { flags: { 직업: '대기업 기획자', 결혼: true, 자녀수: 2, 집있음: true, 차있음: true } });
const fam = Life.ledgerOf(family);
check('가구가 크면 수지가 줄어든다', fam.net < single.net, '1인 ' + single.net + ' → 4인 ' + fam.net);

const retired = Object.assign({}, job, { age: 66, flags: { 직업: '대기업 기획자', 은퇴: true } });
const ret = Life.ledgerOf(retired);
check('은퇴 뒤에는 연금으로 계산', ret && ret.retired && ret.income === Life.LEDGER.pension, ret && '연금 ' + ret.income);

// 생일에 한 번만 붙는지 (1년에 한 번)
const year = Life.newGame({ name: '장부', gender: '남', startAge: 30 });
year.flags = { 직업: '대기업 기획자' };
year.month = 12;
const before = year.stats.asset;
Life.choose(year, 0);
const adv = Life.advance(year);
check('생일에 연 수지를 한 번 반영', !!(adv.ledger && typeof adv.ledger.net === 'number'),
  adv.ledger ? '수지 ' + adv.ledger.net + ' · 재산 ' + before + ' → ' + year.stats.asset : '장부 없음');
year.month = 6;
Life.choose(year, 0);
const adv2 = Life.advance(year);
check('생일이 아니면 장부 없음', adv2.ledger === null || adv2.ledger === undefined);

/* ── 7) 명백한 표시 오류 (2026-11-25) ── */
(function () {
  // 24세 결산 문구는 걸어온 길에 맞춘다
  function at24(flags) {
    const s = Life.newGame({ name: '결산', gender: '남', startAge: 17 });
    s.age = 24; s.month = 12;
    s.flags = Object.assign({ 고등학생: true }, flags);
    s.stats = { hp: 60, mental: 58, charm: 58, social: 56, intel: 60, luck: 50, asset: 500 };
    s.current = { eventId: 'company_dinner', chosen: 0, event: null };
    Life.advance(s);
    return { s, info: Life.gradInfo(s), recall: Life.recall(s, 'grad') };
  }
  const expert = at24({ 전문대: true });
  const none = at24({});
  const uni = at24({ 수능_명문: true });
  check('24세 결산 — 전문대는 전문대 졸업식',
    expert.info.def.name === '전문대 졸업식' && expert.info.def.short === '전문대 졸업', expert.info.def.name);
  check('24세 결산 — 대학에 가지 않은 사람은 대학교 졸업식이 아니다',
    none.info.def.name === '스무 살의 결산' && none.info.def.short === '스무 살 결산', none.info.def.name);
  check('24세 결산 — 대학 진학자는 그대로 대학교 졸업식',
    uni.info.def.name === '대학교 졸업식', uni.info.def.name);
  check('24세 결산 — 전당 키는 college 로 유지',
    expert.info.key === 'college' && expert.info.def.key === 'college', expert.info.key);
  check('24세 회고의 시기 이름도 그 길에 맞는다',
    expert.recall.some((l) => l.indexOf('전문대의 마지막 달') !== -1) &&
    none.recall.some((l) => l.indexOf('스무 살의 마지막 달') !== -1) &&
    !none.recall.some((l) => l.indexOf('대학교의 마지막 달') !== -1),
    none.recall[1]);

  // 출발 시나리오 이모지에 국기(지역 표시 문자) 금지 — 한글과 겹쳐 보인다
  const flags2 = Life.SCENARIOS.filter((sc) => /[\u{1F1E6}-\u{1F1FF}]/u.test(sc.emoji || ''));
  check('출발 시나리오 이모지에 국기 문자 없음', flags2.length === 0,
    flags2.map((sc) => sc.id + ' ' + sc.emoji).join(' ') || Life.SCENARIOS.map((sc) => sc.emoji).join(''));

  // 공직_길 오타 — 공무원 체인의 requireFlags 는 공무원_길 이다
  const typo = EVENTS.filter((ev) => JSON.stringify(ev.requireFlags || '').indexOf('공직_길') !== -1);
  check("requireFlags 에 '공직_길' 오타 없음", typo.length === 0, typo.map((ev) => ev.id).join(','));

  // 수능 결과 갈래는 어느 이벤트에서도 둘이 함께 켜지지 않는다
  const ADMIT = new Set(['수능_명문', '수능_지방', '전문대']);
  const both = [];
  EVENTS.forEach((ev) => {
    (ev.choices || []).forEach((ch) => {
      const specs = [ch.set, ch.mini && ch.mini.win && ch.mini.win.set, ch.mini && ch.mini.lose && ch.mini.lose.set];
      specs.forEach((sp) => {
        if (!sp || typeof sp !== 'object') return;
        const on = Object.keys(sp).filter((k) => ADMIT.has(k) && sp[k] === true);
        if (on.length > 1) both.push(ev.id + ': ' + on.join('+'));
      });
    });
  });
  check('한 선택지가 수능 결과를 둘 켜지 않는다', both.length === 0, both.slice(0, 4).join(' / '));
})();

/* ── 출력 ── */
console.log(results.join('\n'));
console.log('\n전수조사 검사:', results.length, '항목 · 실패', fails, '건');
if (fails) process.exitCode = 1;
