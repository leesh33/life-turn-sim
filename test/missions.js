// 전 연령대 미션 출발선·달성 검사 (assets/avatar.js 미션 규칙)
//  · 어느 나이로 시작해도(7개 프리셋) 첫 미션이 30~45%에서 출발하고, 이미 달성돼 있지 않다
//  · 1세부터 80세까지 이어서 플레이해도 나이대가 바뀔 때마다 35%에서 출발한다
//  · 목표는 출발선보다 위(실제로 쌓아야 닿는 값)이고, 능력치 천장(ceil)을 넘지 않는다
//  · 각 나이대 미션은 그 구간 안에서 실제로 달성된다(그 능력치를 미는 플레이)
//  · 출발선은 저장·불러오기에 남고, 능력치가 움직여도 따라가지 않는다
const path = require('path');
const { load } = require('../tools/lib-load');

const base = path.join(__dirname, '..', 'assets');
const { Life, Avatar } = load(base);

const results = [];
const check = (name, cond, extra) => results.push(`${cond ? 'PASS' : 'FAIL'} · ${name}${extra ? ' — ' + extra : ''}`);
const KEYS = new Set(['hp', 'mental', 'charm', 'social', 'intel', 'luck', 'asset']);
const BANDS = Avatar.BANDS;

/* ═════════ ① 미션 정의 ═════════ */
check('나이대 7개 모두 미션 정의', BANDS.every((b) => b.mission && b.mission.id && b.mission.key), BANDS.length + '개');
check('미션 id 가 서로 다름', new Set(BANDS.map((b) => b.mission.id)).size === BANDS.length);
const badDef = BANDS.filter((b) => {
  const m = b.mission;
  return !KEYS.has(m.key) || typeof m.gain !== 'number' || m.gain <= 0 ||
    typeof m.ceil !== 'number' || m.ceil <= 0 || m.ceil > 100 ||
    !m.bonus || !Object.keys(m.bonus).length || !m.label || !m.verb;
});
check('정의 점검(능력치·성장폭·천장·보너스)', badDef.length === 0, badDef.map((b) => b.id).join(', '));
check('능력치는 0~100 게이지 여섯 개 중 하나', BANDS.every((b) => b.mission.key !== 'luck' || b.id === 'x'),
  BANDS.map((b) => b.mission.key).join(','));

/* ═════════ ② 시작 나이 프리셋 — 첫 미션이 35%에서, 이미 차 있지 않게 ═════════ */
const startAges = (Life.START_AGES || []).map((a) => a.age);
check('시작 나이 프리셋 7개', startAges.length === 7, startAges.join(', '));
startAges.forEach((age) => {
  const s = Life.newGame({ name: '시작' + age, gender: '남', startAge: age });
  Avatar.ensureBase(s);
  const m = Avatar.mission(s);
  check(`${age}세 시작 미션 ${m.pct}% (30~45%)`, m.pct >= 30 && m.pct <= 45, `${m.label} · ${m.goal}`);
  check(`${age}세 시작 미션은 70% 미만`, m.pct < 70, m.pct + '%');
  check(`${age}세 시작 미션은 아직 미달성`, m.done === false && m.pct < 100);
  check(`${age}세 목표는 출발선보다 위`, m.target > m.anchor, `${m.anchor} → ${m.target}`);
  check(`${age}세 출발선이 상태에 남음`, s.missionBase && s.missionBase[Avatar.bandOf(age).id] === m.anchor,
    JSON.stringify(s.missionBase));
  const ceil = Avatar.bandOf(age).mission.ceil;
  check(`${age}세 목표가 천장 이하`, m.target <= ceil, `${m.target} ≤ ${ceil}`);
  check(`${age}세 목표 문구`, /^(호감도|역량|매력|체력|멘탈) \d+ (달성|돌파)$/.test(m.goal), m.goal);
});

/* ═════════ ③ 1세부터 이어서 — 나이대가 바뀔 때마다 35% ═════════ */
function effOf(s, c) {
  let spec = c.effects;
  if (typeof spec === 'function') { try { spec = spec(s) || {}; } catch (e) { spec = {}; } }
  return spec || {};
}
// 그 나이대 미션 능력치를 가장 많이 올리는 선택 — '목표를 향해 미는' 플레이
function focusPick(ev, s, key) {
  let best = 0, bestV = -1e9;
  ev.choices.forEach((c, i) => {
    const e = effOf(s, c);
    const v = typeof e[key] === 'number' ? e[key] : 0;
    if (v > bestV) { bestV = v; best = i; }
  });
  return best;
}
const rndPick = (ev) => Math.floor(Math.random() * ev.choices.length);

function playLife(seed, startAge, pick) {
  const s = Life.newGame({ name: '삶' + seed, gender: '여', startAge });
  s.rngState = seed >>> 0;
  Avatar.ensureBase(s);
  const entries = [];
  let band = Avatar.bandOf(s.age);
  let m = Avatar.mission(s);
  let entry = { band: band.id, pct: m.pct, goal: m.goal, anchor: m.anchor, target: m.target, age: s.age, doneAge: null };
  let guard = 0;
  while (!s.ended && guard++ < 4000) {
    const now = Avatar.bandOf(s.age);
    if (now.id !== band.id) {
      entries.push(entry);
      band = now;
      m = Avatar.mission(s);
      entry = { band: band.id, pct: m.pct, goal: m.goal, anchor: m.anchor, target: m.target, age: s.age, doneAge: null };
    }
    const ev = Life.currentEvent(s);
    Life.choose(s, pick(ev, s, band.mission.key));
    const got = Avatar.checkMission(s);
    if (got && entry.doneAge === null) entry.doneAge = s.age;
    const r = Life.advance(s);
    if (r.graduation) Life.graduate(s, false);
  }
  entries.push(entry);
  return { s, entries };
}

const SEEDS = [11, 22, 33, 44];
const focusRuns = SEEDS.map((seed) => playLife(seed, 1, focusPick));
const ceilOf = (bandId) => (BANDS.find((b) => b.id === bandId) || { mission: {} }).mission.ceil;
function startAudit(runs) {
  const out = { low: [], mid: [], full: [] };
  runs.forEach((run) => {
    run.entries.forEach((e) => {
      if (e.pct === 100) out.full.push(e);
      else if (e.pct < 30 || e.pct > 45) out.low.push(e);
      else out.mid.push(e);
    });
  });
  // 100%로 시작한 경우는 '이미 그 나이대 천장을 넘긴 능력치'뿐이어야 한다
  out.fullBad = out.full.filter((e) => !(e.anchor >= ceilOf(e.band)));
  return out;
}
const audited = startAudit(focusRuns);
check('1세부터 이어서: 모든 나이대 30~45%에서 출발', audited.low.length === 0,
  audited.low.map((e) => e.band + ' ' + e.pct + '%').slice(0, 5).join(' / '));
const oddMid = focusRuns
  .flatMap((run) => run.entries.filter((e) => e.pct > 45 && e.pct < 100).map((e) => e.band + ' ' + e.pct + '%'));
check('46~99%로 어중간하게 차 있는 나이대 없음', oddMid.length === 0, oddMid.slice(0, 5).join(' / '));
check('100%로 시작하는 건 천장을 이미 넘긴 능력치뿐', audited.fullBad.length === 0,
  audited.fullBad.map((e) => `${e.band} ${e.anchor}/${ceilOf(e.band)}`).slice(0, 4).join(' / ') ||
    `${audited.full.length}건 모두 천장 이상`);
const bandEntries = focusRuns[0].entries.length;
check('1세부터 이어서: 일곱 나이대를 모두 지나감', bandEntries === 7, bandEntries + '개');

/* ═════════ ④ 구간 안에서 실제로 달성된다 ═════════ */
BANDS.forEach((b) => {
  const hits = focusRuns.filter((run) => {
    const e = run.entries.find((x) => x.band === b.id);
    return e && e.doneAge !== null && e.doneAge >= b.from && e.doneAge <= Math.min(b.to, 80);
  }).length;
  check(`${b.id} 미션 달성 ${hits}/${SEEDS.length}`, hits >= 3, focusRuns.map((run) => {
    const e = run.entries.find((x) => x.band === b.id);
    return e ? (e.doneAge === null ? '미달성' : e.doneAge + '세') : '-';
  }).join(', '));
});
// 무작위 플레이에서도 미션이 걸린다(모든 나이대를 합쳐 최소 절반)
const randomRuns = SEEDS.map((seed) => playLife(seed, 1, rndPick));
const randomHits = randomRuns.reduce((n, run) => n + run.entries.filter((e) => e.doneAge !== null).length, 0);
check('무작위 플레이에서도 미션이 달성됨', randomHits >= 14, randomHits + '/' + (SEEDS.length * 7));
const randomAudit = startAudit(randomRuns);
check('무작위 플레이에서도 출발선은 35% 근처', randomAudit.low.length === 0 && randomAudit.fullBad.length === 0,
  randomAudit.low.map((e) => e.band + ' ' + e.pct + '%').slice(0, 5).join(' / '));
const randomOdd = randomRuns
  .flatMap((run) => run.entries.filter((e) => e.pct > 45 && e.pct < 100).map((e) => e.band + ' ' + e.pct + '%'));
check('무작위 플레이에서도 46~99%로 애매하게 차 있지 않음', randomOdd.length === 0, randomOdd.slice(0, 5).join(' / '));

/* ═════════ ⑤ 미션 보너스는 구간마다 한 번 ═════════ */
const run0 = focusRuns[0].s;
const doneIds = Object.keys(run0.missions || {});
check('달성 기록이 저장본에 남음', doneIds.length > 0, doneIds.join(','));
check('같은 미션을 두 번 주지 않음', new Set(doneIds).size === doneIds.length);
check('달성한 미션은 카드에 100%로 표시', doneIds.every((id) => {
  const b = BANDS.find((x) => x.mission.id === id);
  return !b || Avatar.mission({ age: b.from + 1, stats: run0.stats, missions: run0.missions, missionBase: run0.missionBase }).done;
}));
// 보너스가 실제로 붙는지 — 목표 직전 상태에서 한 번만
const probe = Life.newGame({ name: '보너스', gender: '남', startAge: 8 });
const pm = Avatar.mission(probe);
probe.stats[pm.key] = pm.target;
const before = probe.stats[pm.key];
const got = Avatar.checkMission(probe);
check('목표에 닿으면 보너스가 붙는다', !!got && probe.stats[pm.key] > before,
  `${before} → ${probe.stats[pm.key]} (${got ? got.bonusLabel : '-'})`);
check('보너스 뒤에는 다시 주지 않는다', Avatar.checkMission(probe) === null);

/* ═════════ ⑥ 20대·35세 시작 — 그 구간 미션을 실제로 채울 수 있다 ═════════ */
const y20 = playLife(21, 20, focusPick);
const y20e = y20.entries[0];
check('20세 시작: 20대 미션 35% 출발', y20e.pct === 35 && y20e.band === 'youth', `${y20e.pct}% · ${y20e.goal}`);
check('20세 시작: 20대 미션이 그 구간 안에 달성', y20e.doneAge !== null && y20e.doneAge <= 25,
  y20e.doneAge === null ? '미달성' : y20e.doneAge + '세');
const a35 = playLife(35, 35, focusPick);
const a35e = a35.entries[0];
check('35세 시작: 30·40대 미션 35% 출발', a35e.pct === 35 && a35e.band === 'adult', `${a35e.pct}% · ${a35e.goal}`);
check('35세 시작: 30·40대 미션이 그 구간 안에 달성', a35e.doneAge !== null && a35e.doneAge <= 49,
  a35e.doneAge === null ? '미달성' : a35e.doneAge + '세');
const t14 = playLife(14, 14, focusPick);
check('14세 시작: 10대 미션 35% 출발', t14.entries[0].pct === 35 && t14.entries[0].band === 'teen',
  `${t14.entries[0].pct}% · ${t14.entries[0].goal}`);
check('14세 시작: 10대 미션이 그 구간 안에 달성', t14.entries[0].doneAge !== null && t14.entries[0].doneAge <= 19,
  t14.entries[0].doneAge === null ? '미달성' : t14.entries[0].doneAge + '세');

/* ═════════ ⑦ 출발선은 저장되고 흔들리지 않는다 ═════════ */
const saved = Life.newGame({ name: '저장', gender: '남', startAge: 14 });
Avatar.ensureBase(saved);
const pctBefore = Avatar.mission(saved).pct;
Life.save(saved);
const backIn = Life.load();
check('저장본에서 출발선이 살아남음', !!backIn && backIn.missionBase && backIn.missionBase.teen === saved.missionBase.teen,
  backIn ? JSON.stringify(backIn.missionBase) : '없음');
check('불러온 뒤 진행률이 같음', !!backIn && Avatar.mission(backIn).pct === pctBefore, pctBefore + '%');
backIn.stats.intel += 6;
check('능력치가 올라도 출발선은 그대로', Avatar.mission(backIn).anchor === saved.missionBase.teen &&
  Avatar.mission(backIn).pct > pctBefore, `${Avatar.mission(backIn).pct}%`);
const flat = Life.newGame({ name: '없음', gender: '남', startAge: 14 });
delete flat.missionBase;
const fallback = Avatar.mission(flat);
check('출발선 기록이 없으면 지금 값이 출발선', fallback.anchor === flat.stats.intel && fallback.pct === 35,
  `출발선 ${fallback.anchor} · ${fallback.pct}%`);

/* ── 출력 ── */
console.log(results.join('\n'));
const fails = results.filter((r) => r.startsWith('FAIL')).length;
console.log('\n전 연령대 미션 검사: ' + results.length + ' 항목 · 실패 ' + fails + ' 건');
if (fails) process.exitCode = 1;
