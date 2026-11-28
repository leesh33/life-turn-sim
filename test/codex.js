// 📔 인생 도감 — 💼 직업 · 💕 인연 수집 검사 (2026-11-28)
//   node test/codex.js
//   · 직업·인연 항목이 실제 플래그로 해금되고, 판이 바뀌어도 누적된다
//   · 같은 항목은 두 번 기록되지 않고, 먼저 만난 나이·이름이 남는다
//   · localStorage 키(lifeTurnSim.codex.v1)와 클라우드 동기화(합집합)에 그대로 실린다
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { load } = require('../tools/lib-load');

const ROOT = path.join(__dirname, '..');
const { Life, TitleBook, CareerBook } = load(path.join(ROOT, 'assets'));
const W = global.window;

const results = [];
let fails = 0;
function check(name, ok, detail) {
  results.push((ok ? 'PASS' : 'FAIL') + ' · ' + name + (detail === undefined ? '' : ' — ' + detail));
  if (!ok) fails++;
}

/* ── ① 목록 ── */
check('CareerBook 공개 API', ['GROUPS', 'JOB', 'BOND', 'progress', 'check', 'owned', 'reset'].every((k) => CareerBook[k] !== undefined));
check('직업 20종 이상', CareerBook.JOB.length >= 20, CareerBook.JOB.length + '종');
check('인연 10종 이상', CareerBook.BOND.length >= 10, CareerBook.BOND.length + '종');
const all = CareerBook.JOB.concat(CareerBook.BOND);
const ids = new Set(all.map((t) => t.id));
check('id 중복 없음', ids.size === all.length, ids.size + '/' + all.length);
check('모든 항목에 이름·설명·이모지', all.every((t) => t.name && t.desc && t.emoji));
check('모든 항목에 해금 나이 범위', all.every((t) => Array.isArray(t.ages) && t.ages[0] <= t.ages[1] && t.ages[0] >= 1 && t.ages[1] <= 80),
  all.filter((t) => !Array.isArray(t.ages)).map((t) => t.id).join(','));
check('탭은 직업·인연 2개', CareerBook.GROUPS.map((g) => g.id).join(',') === 'job,bond');

/* ── ② 해금 판정 ── */
function state(flags, age, extra) {
  return Object.assign({ name: '상훈', age: age || 30, month: 3, flags: flags || {}, cameos: [], createdAt: 1000 }, extra || {});
}
function fresh() { CareerBook.reset(); }

fresh();
check('빈 인생에서는 아무것도 해금되지 않는다', CareerBook.check(state({}, 30)).length === 0, JSON.stringify(CareerBook.owned()));

fresh();
let got = CareerBook.check(state({ 수능_명문: true }, 21)).map((t) => t.id);
check('대학생 — 진학 플래그', got.indexOf('student') !== -1, got.join(','));
got = CareerBook.check(state({ 직업: '공무원' }, 31)).map((t) => t.id);
check('공무원 — 직업 플래그', got.indexOf('public_officer') !== -1, got.join(','));
got = CareerBook.check(state({ 개발_길: true }, 26)).map((t) => t.id);
check('개발자 — 개발_길', got.indexOf('dev') !== -1, got.join(','));
got = CareerBook.check(state({ 창업: true }, 33)).map((t) => t.id);
check('창업가 — 창업', got.indexOf('founder') !== -1, got.join(','));
got = CareerBook.check(state({ 직업: '자영업자' }, 40)).map((t) => t.id);
check('사업가 — 자영업자', got.indexOf('business_owner') !== -1, got.join(','));
got = CareerBook.check(state({ 직업: '무직' }, 29)).map((t) => t.id);
check('백수 — 무직', got.indexOf('jobless') !== -1, got.join(','));
got = CareerBook.check(state({ 알바_경험: true }, 22)).map((t) => t.id);
check('알바생 — 알바 경험', got.indexOf('part_timer') !== -1, got.join(','));
got = CareerBook.check(state({ 유튜버: true }, 45)).map((t) => t.id);
check('크리에이터 — 유튜버', got.indexOf('creator') !== -1, got.join(','));

fresh();
got = CareerBook.check(state({ 첫연애: true }, 17)).map((t) => t.id);
check('첫사랑', got.indexOf('first_love') !== -1, got.join(','));
got = CareerBook.check(state({ 결혼: true, 자녀: true, 자녀수: 2, 손주: true, 단짝: true }, 70)).map((t) => t.id);
check('배우자·첫 아이·둘째·손주·단짝', ['spouse', 'first_child', 'second_child', 'grandchild', 'best_friend'].every((id) => got.indexOf(id) !== -1), got.join(','));
got = CareerBook.check(state({}, 40, { cameos: [{ rel: 'friend' }, { rel: 'married' }] })).map((t) => t.id);
check('이전 인생 인연 — 친구·부부', got.indexOf('cameo_friend') !== -1 && got.indexOf('cameo_spouse') !== -1, got.join(','));

/* ── ③ 누적 · 중복 방지 ── */
fresh();
CareerBook.check(state({ 직업: '공무원' }, 27));
const again = CareerBook.check(state({ 직업: '공무원' }, 33));
check('같은 직업은 두 번 기록하지 않는다', again.length === 0 && CareerBook.progress('job').got === 1, again.map((t) => t.id).join(','));
const owned = CareerBook.owned();
check('처음 만난 나이·이름을 남긴다', owned.public_officer && owned.public_officer.age === 27 && owned.public_officer.name === '상훈',
  JSON.stringify(owned.public_officer));
check('저장 키는 lifeTurnSim.codex.v1', CareerBook.KEY === 'lifeTurnSim.codex.v1' && !!W.localStorage.getItem(CareerBook.KEY));

const prog = CareerBook.progress();
check('전체 진행도 계산', prog.got === 1 && prog.total === CareerBook.JOB.length + CareerBook.BOND.length,
  prog.got + '/' + prog.total + ' ' + prog.pct + '%');

/* ── ④ 클라우드 동기화(합집합) ── */
const SRC = fs.readFileSync(path.join(ROOT, 'assets', 'sync.js'), 'utf8');
function makeEnv(storage) {
  const store = new Map(Object.entries(storage || {}));
  const g = {
    console,
    crypto: require('crypto').webcrypto,
    TextEncoder,
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    setTimeout: (fn) => { fn(); return 1; },
    clearTimeout: () => {},
    fetch: () => Promise.reject(new Error('no network')),
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); },
      removeItem: (k) => { store.delete(k); }
    },
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } },
    dispatchEvent: () => true,
    document: { addEventListener: () => {}, visibilityState: 'visible', readyState: 'complete' }
  };
  g.window = g;
  vm.createContext(g);
  vm.runInContext(SRC, g, { filename: 'sync.js' });
  return { g, store, S: g.CloudSync };
}
const env = makeEnv();
const T = env.S._test;
check('sync 에 mergeCodex 가 있다', typeof T.mergeCodex === 'function');
const merged = T.mergeCodex({ dev: { at: 9, age: 26 }, spouse: { at: 5 } }, { dev: { at: 3, age: 22 }, chef: { at: 7 } });
check('도감 합집합 — 셋 다 남는다', Object.keys(merged).length === 3, Object.keys(merged).join(','));
check('같은 항목은 먼저 만난 기록', merged.dev.at === 3 && merged.dev.age === 22, JSON.stringify(merged.dev));
const cfg = T.config;
check('동기화 대상 키에 codex 포함', cfg.codex === 'lifeTurnSim.codex.v1', cfg.codex);
env.store.set(cfg.codex, JSON.stringify({ dev: { at: 2 } }));
const bundle = T.bundleLocal();
check('올릴 묶음에 도감이 실린다', bundle.codex && bundle.codex.dev && bundle.codex.dev.at === 2, JSON.stringify(bundle.codex));
T.applyBundle({ codex: { chef: { at: 4 } }, hall: { records: [] }, titles: {} });
check('내려받은 도감이 저장된다', JSON.parse(env.store.get(cfg.codex)).chef.at === 4, env.store.get(cfg.codex));

/* ── ⑤ 칭호 도감과 함께 동작 ── */
check('칭호 도감은 그대로 20종', TitleBook.LIST.length === 20, TitleBook.LIST.length);
check('도감 두 개가 서로 다른 키를 쓴다', TitleBook.KEY !== CareerBook.KEY, TitleBook.KEY + ' / ' + CareerBook.KEY);

CareerBook.reset();
console.log(results.join('\n'));
console.log(fails ? `\n실패: ${fails} 건` : '\n인생 도감 검사: 전체 통과 (' + results.length + '항목)');
if (fails) process.exitCode = 1;
