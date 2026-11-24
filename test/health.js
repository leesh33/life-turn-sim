// 건강 위기 · 조기 엔딩 검사 (2026-11-24)
//   node test/health.js
//   · 체력이 위험한 채로 이어지면 '건강 악화' 조기 엔딩으로 끝나는가
//   · 그 전에 경고(위험 단계)가 먼저 오는가 — 억울한 즉사가 아닌가
//   · 긴급 회복·휴식으로 살아날 수 있는가 (체력 0에서도)
//   · '사람처럼' 플레이하면 80세까지 완주하는가 / '무리'하면 일찍 끝나는가
//   · 조기 엔딩도 인생 요약(등급·아키타입)·전당 등록과 호환되는가
const path = require('path');
const { load } = require('../tools/lib-load');

const base = path.join(__dirname, '..', 'assets');
const { Life, EVENTS } = load(base);

let fails = 0;
const out = [];
function check(name, ok, detail) {
  out.push((ok ? 'PASS' : 'FAIL') + ' · ' + name + (detail === undefined ? '' : ' — ' + detail));
  if (!ok) fails++;
}

function num(v) { return typeof v === 'number' ? v : Array.isArray(v) ? (v[0] + v[1]) / 2 : 0; }
let seed = 20261124;
function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }

const HUMAN = (ev, s) => {
  const low = Math.min(s.stats.hp, s.stats.mental) < 30;
  const c = ev.choices.map((ch, i) => {
    const e = typeof ch.effects === 'object' && ch.effects ? ch.effects : {};
    return { i, hp: num(e.hp), mental: num(e.mental), asset: num(e.asset) };
  });
  if (low) {
    const b = c.slice().sort((x, y) => (y.hp + y.mental) - (x.hp + x.mental))[0];
    if (b && b.hp + b.mental > 0) return b.i;
  }
  const afford = c.filter((x) => x.asset >= -Math.max(600, Math.abs(s.stats.asset) * 0.4));
  const pool = afford.length ? afford : c;
  return pool[Math.floor(rnd() * pool.length)].i;
};
// 무리하는 플레이 — 매번 체력을 가장 많이 깎는 선택
const GRIND = (ev) => {
  let worst = 0, wv = 1e9;
  ev.choices.forEach((c, i) => {
    const e = typeof c.effects === 'object' && c.effects ? c.effects : {};
    if (num(e.hp) < wv) { wv = num(e.hp); worst = i; }
  });
  return worst;
};

/* ── 1) 건강 사건이 있고, 체력 조건이 붙어 있는가 ── */
const health = EVENTS.filter((e) => e.health);
check('건강 사건 3종(신호·위독·쓰러짐)이 있다', health.length >= 3,
  health.map((e) => e.id + '≤' + e.crisisHp).join(', '));
check('건강 사건은 체력 조건(when)을 스스로 갖는다',
  health.every((e) => typeof e.when === 'function' && e.repeatable === true));
check('건강 사건은 어느 나이에나 열린다(any · 1~80세)',
  health.every((e) => e.stage === 'any' && e.minAge === 1 && e.maxAge === 80));

/* ── 2) 체력 0으로 버티면 경고 뒤에 조기 엔딩 ── */
function crisisRun(startAge) {
  const s = Life.newGame({ name: '위기', gender: '남', startAge: startAge || 35 });
  s.stats.hp = 0;
  const steps = [];
  let guard = 0, firstLevel = null;
  while (!s.ended && guard++ < 12) {
    const ev = Life.currentEvent(s);
    // 건강 사건이면 '버티기'(마지막 선택지), 아니면 첫 선택지
    const idx = ev.health ? ev.choices.length - 1 : 0;
    Life.choose(s, idx);
    const res = Life.advance(s);
    steps.push({ id: ev.id, health: ev.health ? 1 : 0, level: res.health && res.health.level, burden: res.health && res.health.burden, ended: !!s.ended });
    if (!firstLevel) firstLevel = res.health && res.health.level;
  }
  return { s, steps, firstLevel, guard };
}

const cr = crisisRun(35);
check('체력 0으로 버티면 조기 엔딩이 난다', cr.s.ended && cr.s.endingKind === 'health',
  cr.s.ended ? cr.s.endingKind + ' · ' + cr.s.age + '세' : '끝나지 않음');
check('끝나기 전에 위험 경고가 먼저 온다', cr.firstLevel === 'critical',
  '첫 달 단계 ' + cr.firstLevel + ' · ' + cr.steps.map((x) => x.level + '/' + x.burden).join(' → '));
check('즉사가 아니다 — 최소 2개월은 버틴다', cr.guard >= 2, cr.guard + '개월');
check('건강 사건이 매달 먼저 내밀어진다', cr.steps.filter((x) => x.health).length >= 1 && !!Life.healthEventFor(cr.s),
  cr.steps.map((x) => x.id + (x.health ? '🩺' : '')).join(' → '));

// 마일스톤이 아닌 달에는 건강 사건이 가장 먼저 온다
(function priority() {
  const s = Life.newGame({ name: '우선', gender: '남', startAge: 40 });
  s.month = 5; s.stats.hp = 3;
  const h = Life.healthEventFor(s);
  check('체력이 낮으면 급한 건강 사건부터(쓰러짐)', !!h && h.id === 'hl_collapse', h && h.id);
  s.stats.hp = 15;
  const h2 = Life.healthEventFor(s);
  check('조금 덜하면 신호 사건부터', !!h2 && h2.id === 'hl_warn', h2 && h2.id);
})();

const crChild = crisisRun(1);
check('어린 나이에도 같은 규칙으로 끝난다(예외 없음)', crChild.s.ended && crChild.s.endingKind === 'health',
  crChild.s.age + '세 · ' + crChild.s.endingKind);

/* ── 3) 긴급 회복으로 살아난다 ── */
(function healSave() {
  const s = Life.newGame({ name: '회복', gender: '여', startAge: 35 });
  s.stats.hp = 0;
  Life.choose(s, 0);
  Life.advance(s);                       // 1개월 위독
  const before = Life.healthOf(s);
  const h1 = Life.heal(s);
  const h2 = Life.heal(s);
  const afterHeal = Life.healthOf(s);
  let burdenAfterRest = null;
  let guard = 0;
  while (!s.ended && guard++ < 14) {
    const ev = Life.currentEvent(s);
    const c = ev.choices.map((ch, i) => {
      const e = typeof ch.effects === 'object' && ch.effects ? ch.effects : {};
      return { i, hp: num(e.hp) };
    }).sort((a, b) => b.hp - a.hp)[0];
    Life.choose(s, c.i);
    Life.advance(s);
    if (burdenAfterRest === null) burdenAfterRest = Life.healthOf(s).burden;
  }
  check('긴급 회복이 체력을 끌어올린다', !!h1 && !!h2 && afterHeal.hp > before.hp,
    '체력 ' + before.hp + ' → ' + afterHeal.hp);
  check('회복하면 누적 부담이 풀린다', burdenAfterRest !== null && burdenAfterRest < before.burden,
    '부담 ' + before.burden + ' → ' + burdenAfterRest);
  check('회복하고 쉬면 조기 엔딩을 피한다', !s.ended && s.endingKind !== 'health',
    '나이 ' + s.age + ' · 부담 ' + Life.healthOf(s).burden);
})();

/* ── 4) 사람처럼 하면 완주 · 무리하면 조기 엔딩 ── */
function runGame(policy, n) {
  let full = 0, healthEnd = 0, ages = [];
  for (let i = 0; i < n; i++) {
    const s = Life.newGame({ name: '측정', gender: i % 2 ? '여' : '남', startAge: 1, scenario: ['kr', 'imf', 'chaebol', 'dirt'][i % 4] });
    let guard = 0;
    while (!s.ended && guard++ < 4000) {
      const ev = Life.currentEvent(s);
      Life.choose(s, policy(ev, s));
      Life.advance(s);
    }
    if (s.endingKind === 'health') { healthEnd++; ages.push(s.age); }
    else if (s.age > 80) full++;
  }
  return { full, healthEnd, ages, n };
}
const human = runGame(HUMAN, 12);
check('사람처럼 플레이하면 대부분 80세 완주', human.full >= 11, human.full + '/' + human.n + ' 완주 · 조기 ' + human.healthEnd);
const grind = runGame(GRIND, 12);
check('무리하면 조기 엔딩이 난다', grind.healthEnd >= 10, grind.healthEnd + '/' + grind.n + ' · ' + grind.ages.slice(0, 6).join(','));

/* ── 5) 조기 엔딩도 인생 요약·전당과 호환 ── */
const end = crisisRun(52);
const sum = Life.summary(end.s);
check('조기 엔딩 요약: 마지막 나이가 실제 나이', sum.finalAge === end.s.age, sum.finalAge + '세');
check('조기 엔딩 요약: 칭호·등급·한 줄 요약이 있다',
  !!sum.title && !!sum.grade && !!sum.oneLiner, sum.title + ' / ' + sum.grade);
check('조기 엔딩 표시(healthEnd)', sum.healthEnd === true && sum.ending === 'health');
const recall = Life.recall(end.s, 'health');
check('조기 엔딩 회고가 8~10줄로 나온다', recall.length >= 8 && recall.length <= 10, recall.length + '줄');
check('회고에 80세 문구가 섞이지 않는다', !recall.join(' ').includes('여든'), recall[0]);

const mine = Life.hallRecords().filter((r) => r.mine && r.key === 'life_health');
check('조기 엔딩이 명예의 전당에 남는다', mine.length >= 1, mine.length + '건');
const rec = mine.filter((r) => r.id === end.s.hallId)[0] || mine[mine.length - 1];
check('전당 기록에 마지막 나이·칭호·등급이 있다',
  !!rec && rec.age === end.s.age && !!rec.title && !!rec.grade && /건강 악화/.test(rec.stageLabel),
  rec ? rec.stageLabel + ' · ' + rec.title : '없음');
const rank = Life.hallRank('life_health', rec ? rec.score : 0);
check('전당 순위가 조기 엔딩 키로 계산된다', rank.count >= 1, rank.count + '명 중 ' + rank.rank + '위');

/* ── 6) 80세 정상 엔딩은 그대로 ── */
(function normalStill() {
  const s = Life.newGame({ name: '완주', gender: '남', startAge: 79 });
  s.stats.hp = 90; s.stats.mental = 90;
  let guard = 0;
  while (!s.ended && guard++ < 40) { Life.choose(s, 0); Life.advance(s); }
  check('건강이 멀쩡하면 80세 완주 엔딩(life)', s.ended && s.endingKind === 'life' && s.age > 80,
    s.endingKind + ' · ' + s.age + '세');
})();

console.log(out.join('\n'));
console.log('\n건강 위기 검사:', out.length, '항목 · 실패', fails, '건');
if (fails) process.exitCode = 1;
