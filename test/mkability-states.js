// 라이브 검증용 저장본 생성 — 역량·행운 화면 검사(390×664 / 390×844)에 쓴다
//   node test/mkability-states.js  →  downloads/life-ability-states.json
//
// 만드는 상태
//   code14 : 14세, 현재 이벤트가 'ab_first_code'(첫 코딩) — 역량 +4 / 체력 -2 선택지
//   luck5  : 5세, 현재 이벤트가 'ab_lucky_clover'(네잎클로버) — 행운 +3 선택지
//   grad13 : 13세 12개월차(한 턴만 더 가면 초등학교 졸업 결산)
//   life80 : 80세 완주 엔딩
const fs = require('fs');
const path = require('path');
const { load } = require('../tools/lib-load');

const { Life } = load(path.join(__dirname, '..', 'assets'));
const OUT = path.join(__dirname, '..', '..', 'downloads', 'life-ability-states.json');

const pick = (ev) => Math.floor(Math.random() * ev.choices.length);
const SAVE_KEY = 'lifeTurnSim.save.v1';

function pin(s, eventId) {
  s.current = { eventId: eventId, chosen: null, event: null };
  s.used = [eventId];
  s.lastSeen = {}; s.lastSeen[eventId] = 0;
  return s;
}

function playTo(startAge, targetAge, targetMonth) {
  const s = Life.newGame({ name: '상훈', gender: '남', startAge });
  let guard = 0;
  while (guard++ < 4000) {
    if (s.age === targetAge && s.month === targetMonth) break;
    const ev = Life.currentEvent(s);
    Life.choose(s, pick(ev));
    const r = Life.advance(s);
    if (r.graduation) Life.graduate(s, false);
  }
  return s;
}

const code14 = pin(Life.newGame({ name: '상훈', gender: '남', startAge: 14 }), 'ab_first_code');
const luck5 = pin(Life.newGame({ name: '상훈', gender: '여', startAge: 5 }), 'ab_lucky_clover');
const grad13 = playTo(1, 13, 12);

const life80 = (function () {
  const s = Life.newGame({ name: '상훈', gender: '여', startAge: 35 });
  let guard = 0;
  while (!s.ended && guard++ < 1400) {
    const ev = Life.currentEvent(s);
    Life.choose(s, pick(ev));
    const r = Life.advance(s);
    if (r.graduation) Life.graduate(s, false);
  }
  return s;
})();

const states = { code14, luck5, grad13, life80 };
for (const k of Object.keys(states)) {
  const s = states[k];
  if (!s || !s.stats) throw new Error('상태 생성 실패: ' + k);
  if (typeof s.stats.intel !== 'number' || typeof s.stats.luck !== 'number') {
    throw new Error('역량·행운 없는 상태: ' + k);
  }
}

fs.writeFileSync(OUT, JSON.stringify({
  key: SAVE_KEY,
  states: Object.keys(states).reduce((acc, k) => {
    acc[k] = { save: states[k] };
    return acc;
  }, {})
}, null, 1));

console.log('저장:', OUT);
Object.keys(states).forEach((k) => {
  const s = states[k];
  console.log(' ', k.padEnd(7), `${s.age}세 ${s.month}개월차`, 'intel', Math.round(s.stats.intel), 'luck', Math.round(s.stats.luck),
    'current', s.current ? s.current.eventId : 'null', 'ended', s.ended);
});
