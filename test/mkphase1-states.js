// Phase 1 화면 검증용 저장본 만들기 (test/phase1_ui.py 가 읽는다)
//  · 가문 이어받기: 명예의 전당에 남긴 상훈(80세 완주) · 지우(80세 완주)
//  · 엔딩: 그 가문을 이어받은 2대 '유솔'이 80세를 마친 상태 (결과 카드용)
//  · 칭호: 그 인생에서 딴 칭호 하나 (결과 카드에 칭호 줄이 나오는지)
//  페이지는 단계마다 한 번만 열리므로(리소스 절약) 필요한 상태를 미리 만들어 둔다.
const fs = require('fs');
const path = require('path');
const { load } = require('../tools/lib-load');

const { Life, TitleBook } = load(path.join(__dirname, '..', 'assets'));

const HALL_KEY = 'lifeTurnSim.hall.v1';
const TITLES_KEY = 'lifeTurnSim.titles.v1';

const SANGHUN = {
  id: 'r-sanghun-1', kind: 'life', key: 'life80', stageLabel: '80세 완주', age: 80,
  score: 71.4, grade: 'A', top: null,
  title: '우렁찬 울음으로 시작해 인맥 하나로 먹고사는 K-기획자',
  name: '상훈', gender: '남', ts: 1700000000000, mine: true, generation: 1, scenario: 'kr',
  cameo: { name: '희연', rel: 'married', relLabel: '부부' },
  stats: { hp: 64, mental: 71, charm: 66, social: 84, intel: 79, luck: 55, asset: 32000 }
};
const JIWOO = {
  id: 'r-jiwoo-1', kind: 'life', key: 'life80', stageLabel: '80세 완주', age: 80,
  score: 66.1, grade: 'A', top: null,
  title: '강가에서 하루를 보내는 낚시광',
  name: '지우', gender: '여', ts: 1700000900000, mine: true, generation: 1, scenario: 'kr',
  stats: { hp: 58, mental: 66, charm: 61, social: 70, intel: 63, luck: 58, asset: 12000 }
};
const hall = { v: 1, seeded: true, records: [SANGHUN, JIWOO] };

function clone(o) { return JSON.parse(JSON.stringify(o)); }

localStorage.setItem(HALL_KEY, JSON.stringify(hall));

// 가문을 이어받아 80세를 마친 인생 — 엔딩 · 결과 카드용
const end = Life.newGame({ name: '유솔', gender: '여', startAge: 1, scenario: 'chaebol', legacy: 'r-sanghun-1' });
end.turn = 950;
end.age = 80; end.month = 12;
end.stats = { hp: 58, mental: 63, charm: 54, social: 61, intel: 72, luck: 48, asset: 4200 };
end.flags.자녀수 = 2; end.flags.자녀 = true; end.flags.결혼 = true; end.flags.배우자 = true;
end.flags.집있음 = true; end.flags.은퇴 = true;
end.history = [
  { turn: 0, age: 1, month: 1, eventId: 'birth_cry', title: '태어났습니다', place: '출산실',
    choice: '있는 힘껏 울어본다', result: '부모님이 우렁찬 나를 좋아합니다.', deltas: { hp: 2 }, milestone: true },
  { turn: 2, age: 1, month: 3, eventId: 'sc_chaebol_name', title: '가업의 이름표', place: '저녁 식탁',
    choice: '먼저 꺼내 놓기로 한다', result: '먼저 말해 두니 편했습니다.', deltas: { mental: 1, social: 1 }, setKeys: ['시나리오_재벌'] },
  { turn: 120, age: 11, month: 6, eventId: 'sc_family_name', title: '집안의 이름', place: '학교',
    choice: '내 이야기로 채우기로 한다', result: '내가 잘하는 것을 먼저 보여 주었습니다.', deltas: { charm: 2 }, setKeys: ['가문_이어받음'] },
  { turn: 400, age: 34, month: 9, eventId: 'sc_chaebol_heir', title: '가업으로 들어오라는 말', place: '본사 회의실',
    choice: '내 일을 이어가기로 한다', result: '하고 싶던 일을 계속했습니다.', deltas: { mental: 2, intel: 1 }, milestone: true }
];
end.current = null;
end.ended = true;
end.endingKind = 'life';

// 이 인생에서 딴 칭호 하나 (결과 카드의 칭호 줄)
TitleBook.check(Object.assign({}, end, {
  age: 1, month: 1,
  flags: Object.assign({}, end.flags, { 우렁찬_아기: true })
}));
const titles = localStorage.getItem(TITLES_KEY);

// 졸업 엔딩(고등학교) — 결과 카드가 '졸업' 카드로도 나오는지
const grad = Life.newGame({ name: '유솔', gender: '여', startAge: 14, scenario: 'imf' });
grad.turn = 72;
grad.age = 19; grad.month = 12;
grad.stats = { hp: 70, mental: 55, charm: 62, social: 58, intel: 66, luck: 49, asset: 800 };
grad.grad = { key: 'high', age: 19, registered: true, stats: Object.assign({}, grad.stats) };
grad.history = [
  { turn: 0, age: 14, month: 3, eventId: 'scn_imf_parents', title: '말을 멈추는 부모님', place: '거실',
    choice: '이야기를 물어보기로 한다', result: '그때 이야기를 처음 들었습니다.', deltas: { intel: 2, mental: -1 } }
];
grad.current = null;
grad.ended = true;
grad.endingKind = 'graduation';

const out = {
  hall,
  ending: clone(end),
  gradEnding: clone(grad),
  titles: titles ? JSON.parse(titles) : {},
  meta: {
    name: end.name,
    generation: end.generation,
    legacy: end.legacy && end.legacy.family,
    heir: end.legacy && end.legacy.heir,
    asset: end.stats.asset
  }
};
fs.mkdirSync('/workspace/scratch', { recursive: true });
fs.writeFileSync('/workspace/scratch/phase1-states.json', JSON.stringify(out));
console.log('만든 상태:', JSON.stringify(out.meta, null, 0));
console.log('칭호:', Object.keys(out.titles).join(',') || '없음');
console.log('저장본 크기:', Math.round(JSON.stringify(out).length / 1024) + 'KB');
