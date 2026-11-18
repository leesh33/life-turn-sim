// 아바타·미션 라이브 검증용 저장본 — 나이대 7단계 + 미션 달성 직전 상태
//   node test/mkavatar-states.js  →  downloads/life-avatar-states.json
//
// 만드는 상태
//   stage03 / stage10 / stage16 / stage22 / stage32 / stage55 / stage72
//     : 그 나이(1개월차)까지 실제로 플레이해 도착한 저장본 — 아바타 단계·말풍선·미션 확인용
//   mission20 : 20세 · 매력 69.6 · '동아리 박람회'(col20c) 1번 선택(+1 매력)
//     → 한 번만 누르면 20대 미션(매력 70)이 달성된다 (달성 연출·보너스 확인용)
const fs = require('fs');
const path = require('path');
const { load } = require('../tools/lib-load');

const { Life } = load(path.join(__dirname, '..', 'assets'));
const OUT = path.join(__dirname, '..', '..', 'downloads', 'life-avatar-states.json');

function playTo(targetAge) {
  const s = Life.newGame({ name: '상훈', gender: '남', startAge: 1 });
  let guard = 0;
  while (!s.ended && guard++ < 4000) {
    if (s.age === targetAge && s.current && s.current.chosen === null) return s;
    const ev = Life.currentEvent(s);
    Life.choose(s, Math.floor(Math.random() * ev.choices.length));
    const r = Life.advance(s);
    if (r.graduation) Life.graduate(s, false);
  }
  return s;
}

const states = {};
[3, 10, 16, 22, 32, 55, 72].forEach((age) => {
  const s = playTo(age);
  if (!s || s.age !== age) throw new Error('상태 생성 실패: ' + age + '세');
  states['stage' + String(age).padStart(2, '0')] = s;
});

// 미션 달성 직전 — 매력 69.6 에서 col20c 1번(+1)을 고르면 70 이 된다
const ms = Life.newGame({ name: '상훈', gender: '남', startAge: 20 });
ms.age = 20;
ms.month = 4;
ms.turn = 6;
ms.stats = { hp: 64, mental: 58, charm: 69.6, social: 57, intel: 62, luck: 52, asset: 420 };
ms.current = { eventId: 'col20c', chosen: null, event: null };
ms.used = ['col20c'];
ms.lastSeen = { col20c: 6 };
ms.history = [];
ms.missions = {};
states.mission20 = ms;

fs.writeFileSync(OUT, JSON.stringify(states));
console.log(Object.keys(states).map((k) => `${k}:${states[k].age}세`).join(' · '));
console.log('저장:', OUT);
