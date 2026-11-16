// 특정 루트 검증: 비혼(독신) 루트, 멘탈 붕괴(번아웃), 보상형 광고 보상, 후속 분기, 개월차 저장 마이그레이션
const path = require('path');
const { load } = require('../tools/lib-load');

const { Life, EVENTS } = load(path.join(__dirname, '..', 'assets'));

const ran = [];
const check = (name, cond, extra) => { ran.push(`${cond ? 'PASS' : 'FAIL'} · ${name}${extra ? ' — ' + extra : ''}`); };

// 1) 비혼 루트
let s = Life.newGame({ name: '독신', gender: '여', startAge: 35 });
let guard = 0;
const seen = new Set();
while (!s.ended && guard++ < 3000) {
  const ev = Life.currentEvent(s);
  seen.add(ev.id);
  let idx = 0;
  ev.choices.forEach((c, i) => {
    const l = typeof c.label === 'function' ? c.label(s) : c.label;
    if (/아직 아니다|준비가 안 됐|거절|혼자|그냥 산다|참는다|기다린다/.test(l)) idx = i;
  });
  Life.choose(s, idx);
  Life.advance(s);
}
const sum = Life.summary(s);
check('비혼 루트: 결혼하지 않고 80세 완주', !s.flags.결혼 && s.ended, `결혼:${!!s.flags.결혼} 나이:${s.age}`);
check('비혼 전용 이벤트 등장', seen.has('solo_apartment') && seen.has('solo_hobby') && seen.has('single_life'));
console.log('비혼 엔딩:', sum.title, '/', sum.grade, sum.gradeLabel);

// 2) 멘탈 붕괴
let t = Life.newGame({ name: '멘탈', gender: '남', startAge: 30 });
t.stats.mental = 20;
let found = false;
for (let k = 0; k < 60 && !found; k++) {
  t.stats.mental = Math.min(t.stats.mental, 20);
  const ev = Life.currentEvent(t);
  if (ev.id === 'any_burnout') { found = true; break; }
  let idx = 0;
  ev.choices.forEach((c, i) => { if (c.effects && typeof c.effects.mental === 'number' && c.effects.mental < 0) idx = i; });
  Life.choose(t, idx);
  Life.advance(t);
}
check('멘탈 20 상태에서 번아웃 이벤트 등장', found);

// 3) 80세 엔딩 도달 (1세 시작 1회)
let u = Life.newGame({ name: '전생', gender: '남', startAge: 1 });
guard = 0;
while (!u.ended && guard++ < 4000) {
  const ev = Life.currentEvent(u);
  Life.choose(u, Math.floor(Math.random() * ev.choices.length));
  Life.advance(u);
}
check('1세 시작 → 80세 엔딩', u.age === 81 && u.ended, `나이:${u.age} 선택:${u.history.length}`);
check('한 살에 12개월차까지 진행', u.history.every((h) => h.month >= 1 && h.month <= 12));

// 4) 보상형 광고: 되돌리기
let g = Life.newGame({ name: '되돌리기', gender: '남', startAge: 25 });
const firstEvent = Life.currentEvent(g).id;
const hp0 = g.stats.hp;
check('선택 전에는 되돌리기 불가', Life.canUndo(g) === false);
Life.choose(g, 0);
check('선택 후 되돌리기 가능', Life.canUndo(g) === true);
const hpAfter = g.stats.hp;
Life.advance(g);
check('다음 턴으로 진행됨', g.turn === 1);
Life.undo(g);
check('되돌리기: 턴/기록/스탯 복원',
  g.turn === 0 && g.history.length === 0 && Math.abs(g.stats.hp - hp0) < 0.001,
  `turn:${g.turn} hist:${g.history.length} hp:${hp0}→${hpAfter}→${g.stats.hp}`);
check('되돌리기: 같은 사건이 다시 대기', Life.currentEvent(g).id === firstEvent);
check('되돌리기는 한 번만 (스냅샷 소모)', Life.canUndo(g) === false);

// 5) 보상형 광고: 다시 뽑기
let rr = Life.newGame({ name: '리롤', gender: '여', startAge: 30 });
const before = Life.currentEvent(rr).id;
const next = Life.reroll(rr);
check('다시 뽑기: 이벤트가 바뀜', !!next && next.id !== before, `${before} → ${next && next.id}`);
check('다시 뽑기: 선택 전에는 계속 가능', Life.canReroll(rr) === true);
Life.choose(rr, 0);
check('다시 뽑기: 선택 후에는 불가', Life.canReroll(rr) === false);

// 6) 보상형 광고: 긴급 회복
let h = Life.newGame({ name: '회복', gender: '남', startAge: 40 });
check('멀쩡할 때는 회복 불가', Life.canHeal(h) === false);
h.stats.hp = 24;
check('체력 24 → 회복 가능', Life.canHeal(h) === true);
const hb = { hp: h.stats.hp, mental: h.stats.mental };
Life.heal(h);
check('회복: 체력·멘탈 +12', Math.round(h.stats.hp - hb.hp) === 12 && Math.round(h.stats.mental - hb.mental) === 12,
  `hp ${hb.hp}→${h.stats.hp.toFixed(1)}, mental ${hb.mental}→${h.stats.mental.toFixed(1)}`);
h.stats.hp = 10; h.stats.mental = 10;
const second = Life.heal(h);
const third = Life.heal(h);
h.stats.hp = 10; h.stats.mental = 10;
const fourth = Life.heal(h);
check('회복 3회 제한', !!second && !!third && fourth === null && Life.rewardState(h).healLeft === 0,
  '남은 횟수 ' + Life.rewardState(h).healLeft);
check('회복 상한 100 클램프', (function () {
  const z = Life.newGame({ name: 'C', gender: '남', startAge: 40 });
  z.stats.hp = 95; z.stats.mental = 98;
  Life.heal(z);
  return z.stats.hp <= 100 && z.stats.mental <= 100;
})());

// 7) 후속 분기(queue)
const FOLLOW = [
  ['crush_confess', 'crush_answer', 15],
  ['night_escape', 'night_escape_bust', 18],
  ['used_trade_scam', 'used_trade_report', 22],
  ['colonoscopy', 'polyp_result', 52],
  ['franchise_offer', 'franchise_reality', 56],
  ['meeting_parents', null, 32]
];
FOLLOW.forEach(([parent, child, age]) => {
  const pe = Life.byId(parent);
  const q = (pe && pe.choices ? pe.choices : []).map((c) => (Array.isArray(c.queue) ? c.queue : c.queue ? [c.queue] : [])).reduce((a, b) => a.concat(b), []);
  if (child) check(`후속 분기 연결: ${parent} → ${child}`, q.includes(child));
  else check(`이벤트 존재: ${parent}`, !!pe, `${age}세`);
});

// 8) 예전 저장본(일차 단위 v1) 마이그레이션
(function () {
  const old = Life.newGame({ name: '옛날', gender: '남', startAge: 1 });
  // v1 흔적을 인위적으로 만든다: day 필드 + v1 + 기록 day
  const legacy = JSON.parse(JSON.stringify(old));
  legacy.v = 1;
  delete legacy.month;
  legacy.day = 90;
  legacy.history = [{ turn: 0, age: 1, day: 30, eventId: 'birth_cry', title: '태어났습니다', choice: '네', result: '울었습니다' }];
  global.window.localStorage.setItem('lifeTurnSim.save.v1', JSON.stringify(legacy));
  const loaded = Life.load();
  check('예전 저장본(v1 일차) → 개월차 마이그레이션',
    !!loaded && loaded.v === 2 && loaded.month === 4 && loaded.history[0].month === 2 && loaded.day === undefined,
    `month:${loaded && loaded.month} histMonth:${loaded && loaded.history[0].month}`);
  Life.clear();
})();

console.log(ran.join('\n'));
const fails = ran.filter((r) => r.startsWith('FAIL')).length;
console.log('실패:', fails, '건');
if (fails) process.exitCode = 1;
