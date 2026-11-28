// 🔥 요즘 한국 현실 이벤트 팩 검사 (2026-11-28)
//   node test/reality.js
//   · 29개 사건의 형식(단계·나이·선택지·효과)이 기존 팩과 같다
//   · 실제 플레이에서 나온다 (죽은 사건이 아니다)
//   · 능력치로 갈리는 선택지(LifeChance)가 실제로 두 갈래 문구·효과를 낸다
const path = require('path');
const { load } = require('../tools/lib-load');

const { Life, EVENTS } = load(path.join(__dirname, '..', 'assets'));

const results = [];
let fails = 0;
function check(name, ok, detail) {
  results.push((ok ? 'PASS' : 'FAIL') + ' · ' + name + (detail === undefined ? '' : ' — ' + detail));
  if (!ok) fails++;
}

const PACK = EVENTS.filter((e) => /^kr_/.test(e.id));
const STAGES = {};
Life.STAGES.forEach((s) => { STAGES[s.id] = s; });
const KEYS = ['hp', 'mental', 'charm', 'social', 'intel', 'luck', 'asset'];

check('현실 이벤트 29개', PACK.length === 29, PACK.length + '개');
check('id 중복 없음', new Set(PACK.map((e) => e.id)).size === PACK.length);
check('단계별로 골고루 (8단계 이상)',
  new Set(PACK.map((e) => e.stage)).size >= 8, [...new Set(PACK.map((e) => e.stage))].join(','));
check('나이 범위가 단계 안에 있다', PACK.every((e) => {
  if (e.stage === 'any') return e.minAge >= 1 && e.maxAge <= 80;
  const st = STAGES[e.stage];
  return st && e.minAge >= st.from && e.maxAge <= st.to && e.minAge <= e.maxAge;
}), PACK.filter((e) => { const st = STAGES[e.stage]; return st && (e.minAge < st.from || e.maxAge > st.to); }).map((e) => e.id).join(','));
check('선택지 2~4개', PACK.every((e) => e.choices.length >= 2 && e.choices.length <= 4),
  PACK.filter((e) => e.choices.length < 2 || e.choices.length > 4).map((e) => e.id).join(','));
check('모든 선택지에 결과 문구', PACK.every((e) => e.choices.every((c) => c.label && c.result && String(c.result).length > 4)));
check('효과 키·폭이 기존 규칙 안', PACK.every((e) => e.choices.every((c) => {
  const eff = c.effects;
  if (!eff || typeof eff === 'function') return true;
  return Object.keys(eff).every((k) => KEYS.indexOf(k) !== -1 && typeof eff[k] === 'number' && (k === 'asset' || Math.abs(eff[k]) <= 5));
})));

/* 나이·플래그에 맞는 인생에서는 열리는가 (죽은 사건 방지)
   가정·중년 사건은 결혼·자녀·재직이 있어야 열리는 것이 맞다(zz-finalize 상태 조건). */
const blank = { age: 30, month: 3, flags: {}, stats: { hp: 60, mental: 60, charm: 60, social: 60, intel: 60, luck: 50, asset: 1000 }, cameos: [] };
const full = Object.assign({}, blank, { flags: { 결혼: true, 배우자: true, 자녀: true, 자녀수: 2, 직업: '대기업 기획자', 집있음: true } });
const dead = PACK.filter((e) => {
  const midAge = Math.round((e.minAge + e.maxAge) / 2);
  const open = (base) => {
    const s = Object.assign({}, base, { age: midAge });
    try { return Life.passes(e, s); } catch (err) { return false; }
  };
  return !open(full) && !open(blank);
});
check('인생의 조건이 맞으면 열린다 (죽은 사건 없음)', dead.length === 0, dead.map((e) => e.id).join(','));
const gated = PACK.filter((e) => {
  const midAge = Math.round((e.minAge + e.maxAge) / 2);
  const withState = Life.passes(Object.assign({}, full, { age: midAge }), 0) || Life.passes(e, Object.assign({}, full, { age: midAge }));
  return !withState;
});
check('상태 조건(결혼·자녀·재직)이 붙은 사건은 그 상태에서 열린다', gated.length === 0, gated.map((e) => e.id).join(','));

/* 실제 플레이에서 등장하는가 */
const seen = {};
for (let run = 0; run < 4; run++) {
  const s = Life.newGame({ name: 'x', gender: run % 2 ? '여' : '남', startAge: [1, 8, 20, 25][run] });
  let guard = 0;
  while (!s.ended && guard++ < 1200) {
    const ev = Life.currentEvent(s);
    if (ev && /^kr_/.test(ev.id)) seen[ev.id] = true;
    if (!ev) break;
    Life.choose(s, Math.floor(Math.random() * ev.choices.length));
    const r = Life.advance(s);
    if (!r.ok) break;
  }
}
const appeared = Object.keys(seen).length;
check('4번의 인생에서 15개 이상 나온다', appeared >= 15, appeared + '개: ' + Object.keys(seen).sort().join(','));

/* LifeChance 갈래 3종은 상태에 따라 문구·효과가 달라진다 */
['kr_contest', 'kr_coin_ride', 'kr_lottery_any'].forEach((id) => {
  const ev = Life.byId(id);
  const choice = ev && ev.choices.find((c) => typeof c.effects === 'function');
  check(id + ' — 능력치로 갈리는 선택지', !!choice && typeof choice.result === 'function');
  if (!choice) return;
  const low = { age: 25, month: 3, flags: {}, stats: { hp: 40, mental: 40, charm: 40, social: 40, intel: 20, luck: 5, asset: 100 } };
  const high = { age: 25, month: 3, flags: { 운동_재능: true, 책벌레: true, 코딩: true }, stats: { hp: 95, mental: 95, charm: 95, social: 95, intel: 95, luck: 95, asset: 100 } };
  let lo, hi;
  try {
    lo = [choice.result(low), JSON.stringify(choice.effects(low))];
    hi = [choice.result(high), JSON.stringify(choice.effects(high))];
  } catch (e) { lo = hi = null; }
  check(id + ' — 낮은 능력치와 높은 능력치의 결과가 다르다', !!lo && !!hi && (lo[0] !== hi[0] || lo[1] !== hi[1]));
});

console.log(results.join('\n'));
console.log(fails ? `\n실패: ${fails} 건` : '\n현실 이벤트 팩 검사: 전체 통과 (' + results.length + '항목)');
if (fails) process.exitCode = 1;
