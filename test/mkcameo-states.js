// 🧬 카메오 화면 검증용 저장본 만들기 (test/cameo_ui.py 가 읽는다)
//  실제 엔진으로 '희연'을 플레이해 카메오 장면에 닿은 상태를 그대로 저장한다.
//  (라이브 서버가 리소스가 빠듯해 페이지를 여러 번 다시 열 수 없는 환경이라,
//   단계별 저장본을 미리 만들어 두고 페이지는 단계마다 한 번씩만 연다)
const fs = require('fs');
const path = require('path');
const { load } = require('../tools/lib-load');

const { Life } = load(path.join(__dirname, '..', 'assets'));

const HALL_KEY = 'lifeTurnSim.hall.v1';
const SAVE_KEY = 'lifeTurnSim.save.v1';

const SANGHUN = {
  id: 'r-sanghun-1', kind: 'life', key: 'life80', stageLabel: '80세 완주', age: 80,
  score: 71.4, grade: 'A', top: null,
  title: '우렁찬 울음으로 시작해 인맥 하나로 먹고사는 K-기획자',
  name: '상훈', gender: '남', ts: 1700000000000, mine: true,
  stats: { hp: 64, mental: 71, charm: 66, social: 84, intel: 79, luck: 55, asset: 32000 }
};

function clone(o) { return JSON.parse(JSON.stringify(o)); }

localStorage.setItem(HALL_KEY, JSON.stringify({ v: 1, seeded: true, records: [SANGHUN] }));

// 8세로 시작해 카메오 등장 장면을 만날 때까지 실제로 달을 넘긴다
const s = Life.newGame({ name: '희연', gender: '여', startAge: 8 });
let guard = 0;
while (!s.ended && guard++ < 60) {
  const ev = Life.currentEvent(s);
  if (String(ev.id).indexOf('cm_') === 0) break;
  Life.choose(s, Math.floor(Math.random() * ev.choices.length));
  Life.advance(s);
}
// 이 장면에서 '먼저 말을 걸어본다'가 통하는 정도의 상태로 맞춰 둔다 (판정은 그대로 엔진이 한다)
s.stats.social = 88; s.stats.charm = 85; s.stats.mental = 80; s.stats.luck = 80;

const meet = clone(s);
const meetAt = s.age + '세 ' + s.month + '개월차 · ' + s.current.eventId;

// 1) 친구 — 등장 장면에서 첫 선택지
const friendState = clone(s);
Life.choose(friendState, 0);
const friendRel = friendState.cameos[0].rel;

// 2) 연인 — 30세 몇 년 만의 연락 (선택 전 상태를 화면용으로 남긴다)
const reunionState = clone(friendState);
reunionState.age = 30; reunionState.month = 6; reunionState.turn = 270;
reunionState.current = { eventId: 'cm_reunion', chosen: null };
const datingState = clone(reunionState);
Life.choose(datingState, 0);
const datingRel = datingState.cameos[0].rel;

// 3) 부부 — 36세 진지한 이야기
const deepenState = clone(datingState);
deepenState.age = 33; deepenState.month = 5; deepenState.turn = 300;
deepenState.current = { eventId: 'cm_deepen', chosen: null };
const marriedState = clone(deepenState);
Life.choose(marriedState, 0);
const marriedRel = marriedState.cameos[0].rel;

// 4) 80세 완주 — 전당 기록에 인연이 함께 남는다
const endState = clone(marriedState);
endState.age = 80; endState.month = 12; endState.turn = 900;
endState.current = { eventId: 'cm_married_life', chosen: 0, result: 'x', deltas: {} };
Life.advance(endState);

const out = {
  hall: { v: 1, seeded: true, records: [SANGHUN] },
  hallAfter: JSON.parse(localStorage.getItem(HALL_KEY)),
  meet, friend: friendState, dating: reunionState, married: deepenState, ended: endState,
  meta: { meetAt, friendRel, datingRel, marriedRel, ended: endState.ended, name: endState.name }
};
fs.mkdirSync('/workspace/scratch', { recursive: true });
fs.writeFileSync('/workspace/scratch/cameo-states.json', JSON.stringify(out));
console.log('만든 상태:', JSON.stringify(out.meta, null, 0));
console.log('전당 기록:', out.hallAfter.records.map((r) => r.name + '/' + (r.cameo ? r.cameo.rel : '없음')).join(', '));
console.log('저장본 크기:', Math.round(JSON.stringify(out).length / 1024) + 'KB');
void SAVE_KEY;
