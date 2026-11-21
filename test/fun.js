// 단계별 재미 요소 검증 — 칭호 도감 · 10초 미니 승부 · 재테크/가족 · 과거의 부메랑
//  · 유년·학창기 칭호 20종이 실제 플래그로 해금되고 localStorage 에 누적되는지
//  · 미니 승부 선택지가 승/패에 따라 효과·플래그·결과 문구를 갈라 놓는지
//  · 재테크 체인(청약·적금·주식·부동산)과 배우자·자녀 연계가 이어지는지
//  · 부메랑 이벤트가 1~30대의 실제 선택을 찾아 짚어 주는지
const path = require('path');
const { load } = require('../tools/lib-load');

const { Life, EVENTS, TitleBook } = load(path.join(__dirname, '..', 'assets'));

const results = [];
const check = (name, cond, extra) => results.push(`${cond ? 'PASS' : 'FAIL'} · ${name}${extra ? ' — ' + extra : ''}`);

const byId = (id) => EVENTS.find((e) => e.id === id);

/* ═════════ ① 유년·학창기 칭호 도감 ═════════ */
check('칭호 20종 정의', TitleBook && TitleBook.LIST.length === 20, TitleBook ? TitleBook.LIST.length + '종' : '없음');
const titleIds = new Set();
TitleBook.LIST.forEach((t) => {
  if (titleIds.has(t.id)) throw new Error('칭호 id 중복: ' + t.id);
  titleIds.add(t.id);
  check(`칭호 형식: ${t.id}`, !!t.emoji && !!t.name && !!t.desc && Array.isArray(t.ages) && typeof t.need === 'function');
  check(`칭호 나이 창: ${t.id}`, t.ages[0] <= t.ages[1] && t.ages[1] <= 19, t.ages.join('~'));
  check(`칭호 문구 한글: ${t.id}`, !/[A-Za-z]/.test(t.name + t.desc));
});

// 실제로 해금되는지 — 플래그를 세운 상태를 만들어 확인
global.window.localStorage.removeItem(TitleBook.KEY);
const s1 = Life.newGame({ name: '칭호', gender: '남', startAge: 8 });
s1.flags['대식가'] = true;
s1.stats.hp = 66;
const got1 = TitleBook.check(s1);
check('칭호 해금: 급식실 1등', got1.some((t) => t.id === 'big_eater'), got1.map((t) => t.name).join(','));
check('칭호 해금은 한 번만', TitleBook.check(s1).length === 0);
check('칭호 수집률 반영', TitleBook.progress().got === 1 && TitleBook.progress().total === 20, JSON.stringify(TitleBook.progress()));
check('칭호 기록에 나이·개월차', TitleBook.owned()['big_eater'].age === 8);

// 나이 창 밖에서는 해금되지 않는다
const s2 = Life.newGame({ name: '늦둥이', gender: '여', startAge: 20 });
s2.flags['대식가'] = true;
s2.stats.hp = 70;
check('칭호 나이 창 준수', !TitleBook.check(s2).some((t) => t.id === 'big_eater'));

// 플래그만으로는 안 되고 스탯 조건도 필요한 칭호
const s3 = Life.newGame({ name: '암산', gender: '남', startAge: 9 });
s3.flags['숫자_씨앗'] = true;
s3.stats.mental = 40;
check('스탯 조건 미달 시 잠김', !TitleBook.check(s3).some((t) => t.id === 'math_genius'));
s3.stats.mental = 80;
check('스탯 조건 충족 시 해금', TitleBook.check(s3).some((t) => t.id === 'math_genius'));

// 모든 칭호의 조건 플래그가 실제 게임에서 생기는지
const settable = new Set();
EVENTS.forEach((e) => e.choices.forEach((c) => { if (c.set) Object.keys(c.set).forEach((k) => settable.add(k)); }));
const titleFlags = [];
TitleBook.LIST.forEach((t) => {
  const src = t.need.toString();
  (src.match(/s\.flags\['([^']+)'\]/g) || []).forEach((m) => titleFlags.push(m.replace(/^s\.flags\['|'\]$/g, '')));
});
const missingFlags = titleFlags.filter((f) => !settable.has(f));
check('칭호 조건 플래그가 실제로 생김', missingFlags.length === 0, missingFlags.join(',') || '전부 존재');
check('인연 갈래 포함', TitleBook.LIST.filter((t) => t.kind === '인연').length >= 4);

/* ═════════ ② 5~10초 미니 승부 (전 연령) ═════════ */
const miniEvents = EVENTS.filter((e) => e.choices.some((c) => c.mini));
check('미니 승부 이벤트 수', miniEvents.length >= 35, miniEvents.length + '개');
const MINI_TYPES = new Set(['dice', 'timing', 'rps', 'coin', 'highlow', 'math']);
const seenTypes = new Set();
miniEvents.forEach((ev) => {
  ev.choices.forEach((c) => {
    if (!c.mini) return;
    seenTypes.add(c.mini.type);
    check(`미니 종류: ${ev.id}`, MINI_TYPES.has(c.mini.type), c.mini.type);
    check(`미니 승/패 갈래: ${ev.id}`, !!(c.mini.win && c.mini.lose && c.mini.win.result && c.mini.lose.result));
    check(`미니 나이 창: ${ev.id}`, ev.minAge >= 6 && ev.maxAge <= 80, `${ev.minAge}~${ev.maxAge}`);
  });
});
check('미니 6종 모두 등장', seenTypes.size === 6, [...seenTypes].join(','));
// 연령대별로 미니 승부가 하나 이상 있는지 (유년~노년)
const MINI_BANDS = [['유년 6~7', 6, 7], ['초등 8~13', 8, 13], ['중등 14~16', 14, 16],
  ['고등 17~19', 17, 19], ['대학 20~24', 20, 24], ['사회 25~34', 25, 34],
  ['가정 35~49', 35, 49], ['중년 50~64', 50, 64], ['노년 65~80', 65, 80]];
MINI_BANDS.forEach(([label, lo, hi]) => {
  const n = miniEvents.filter((e) => e.minAge <= hi && e.maxAge >= lo).length;
  check(`미니 승부가 있는 연령대: ${label}`, n >= 2, n + '개');
});
const miniIds = miniEvents.map((e) => e.id);
check('미니 이벤트 id 중복 없음', new Set(miniIds).size === miniIds.length, miniIds.length + '개');

function playMini(id, choiceIdx, win) {
  const s = Life.newGame({ name: '승부', gender: '남', startAge: 26 });
  s.current = { eventId: id, chosen: null, event: null };
  const before = JSON.parse(JSON.stringify(s.stats));
  const res = Life.choose(s, choiceIdx, { miniWin: win });
  return { s, res, before };
}
const winRun = playMini('mg_first_date', 0, true);
const loseRun = playMini('mg_first_date', 0, false);
check('미니 승리 결과 문구', /가위바위보에서 이겼습니다/.test(winRun.res.result));
check('미니 패배 결과 문구', /가위바위보에 졌습니다/.test(loseRun.res.result));
check('미니 승리 효과 적용', winRun.s.stats.social - winRun.before.social === 4, `호감도 +${winRun.s.stats.social - winRun.before.social}`);
check('미니 패배는 다른 효과', loseRun.s.stats.social - loseRun.before.social !== 4);
check('미니 승리 플래그', !!winRun.s.flags['인연_시작']);
check('미니 패배에는 플래그 없음', !loseRun.s.flags['인연_시작']);
check('기록에 승패 저장', winRun.s.history[0].mini && winRun.s.history[0].mini.win === true);
check('현재 턴에 승패 저장', winRun.s.current.mini && winRun.s.current.mini.type === 'rps');

// opts 없이 부르면 기본 효과만 (테스트·자동 진행 경로)
const plain = playMini('mg_first_date', 0);
check('미니 opts 없이도 진행', !!plain.res && !plain.s.flags['인연_시작'] && plain.res.mini === null);
check('미니 기본 효과 적용', plain.s.stats.charm - plain.before.charm >= 1);

// 승리 플래그가 실제 후속 이벤트로 이어지는지 (면접 합격 등)
const interview = playMini('mg_final_interview', 0, true);
check('미니 승리 → 취업 플래그', !!interview.s.flags['취업_성공']);
check('미니 결과 길이', interview.res.result.length > 10);

/* ═════════ ③ 재테크 · 가족 카드 ═════════ */
const moneyEvents = EVENTS.filter((e) => /^mn_/.test(e.id));
check('재테크·가족 이벤트 수', moneyEvents.length >= 18, moneyEvents.length + '개');
const moneyFlags = new Set();
moneyEvents.forEach((e) => e.choices.forEach((c) => {
  if (c.set) Object.keys(c.set).forEach((k) => moneyFlags.add(k));
  if (c.mini) { /* 미니 없음 */ }
}));
['청약통장', '청약당첨', '내집_장만', '적금', '주식', '주식손실', '부동산_성공', '부동산_실패', '배우자_신뢰', '아이_교육비']
  .forEach((f) => check(`재테크 갈래 플래그: ${f}`, moneyFlags.has(f)));
check('청약 체인: 접수 → 당첨', !!byId('mn_cheongyak_apply') && !!byId('mn_cheongyak_win'));
check('적금 체인: 가입 → 만기', !!byId('mn_savings_start') && !!byId('mn_savings_mature'));
check('주식 체인: 시작 → 변동 → 결산', !!byId('mn_stock_start') && !!byId('mn_stock_swing') && !!byId('mn_stock_gain'));
check('부동산 성공/실패 갈래', !!byId('mn_land_win') && !!byId('mn_land_fail'));
check('배우자 연계 이벤트', moneyEvents.some((e) => JSON.stringify(e.requireFlags || '').includes('배우자')));
check('자녀 연계 이벤트', moneyEvents.some((e) => JSON.stringify(e.requireFlags || '').includes('자녀')));
check('가족 이벤트는 가정 단계', moneyEvents.filter((e) => /자녀|배우자/.test(JSON.stringify(e.requireFlags || ''))).every((e) => e.stage === 'family' || e.stage === 'any'));

// 재테크로 재산이 실제로 갈리는지 (성공 +, 실패 -)
function moneyDelta(id, idx) {
  const s = Life.newGame({ name: '재테크', gender: '남', startAge: 41 });
  s.current = { eventId: id, chosen: null, event: null };
  const before = s.stats.asset;
  const r = Life.choose(s, idx);
  return { d: s.stats.asset - before, res: r };
}
const winLand = moneyDelta('mn_land_win', 0);
const failLand = moneyDelta('mn_land_fail', 0);
check('부동산 성공은 재산 증가', winLand.d >= 1000, '+' + winLand.d);
check('부동산 실패는 재산 감소', failLand.d <= -500, String(failLand.d));

/* ═════════ ④ 과거의 부메랑 ═════════ */
const boomEvents = EVENTS.filter((e) => e.boomerang);
check('부메랑 이벤트 수', boomEvents.length >= 12, boomEvents.length + '개');
boomEvents.forEach((e) => {
  check(`부메랑 나이 50~80: ${e.id}`, e.minAge >= 50 && e.maxAge <= 80, `${e.minAge}~${e.maxAge}`);
  check(`부메랑 콜백 지정: ${e.id}`, !!e.callback);
  check(`부메랑 안내 문구: ${e.id}`, !!e.boomerangNote);
});

// 실제 기록에서 그때의 선택을 찾아 준다
const b = Life.newGame({ name: '부메랑', gender: '여', startAge: 52 });
b.history.push({ age: 9, month: 4, turn: 100, title: '운동장', choice: '축구부에 들어간다', result: '축구부에 들어갔습니다.', deltas: {}, setKeys: ['축구부'] });
b.history.push({ age: 20, month: 3, turn: 230, title: '동아리', choice: '그림을 그린다', result: '그림을 그렸습니다.', deltas: {}, setKeys: ['그림_씨앗'] });
const src = Life.boomerangOf(b, byId('bm_soccer_coach'));
check('부메랑 출처 찾기', !!src && src.age === 9 && src.month === 4 && /축구부/.test(src.choice), src ? `${src.age}세 ${src.month}개월차 ${src.choice}` : '없음');
const src2 = Life.boomerangOf(b, byId('bm_drawer_art'));
check('부메랑 다른 플래그도 찾기', !!src2 && src2.age === 20);
check('부메랑 없는 이벤트는 null', Life.boomerangOf(b, byId('mg_first_date')) === null);
const noHist = Life.newGame({ name: '기록없음', gender: '남', startAge: 52 });
check('기록이 없으면 null', Life.boomerangOf(noHist, byId('bm_soccer_coach')) === null);

// 부메랑이 요구하는 플래그가 실제로 1~30대에서 생기는지
const youngFlags = new Set();
EVENTS.filter((e) => e.maxAge <= 35).forEach((e) => e.choices.forEach((c) => {
  if (c.set) Object.keys(c.set).forEach((k) => youngFlags.add(k));
}));
boomEvents.forEach((e) => {
  const list = Array.isArray(e.callback) ? e.callback : [e.callback];
  check(`부메랑 콜백이 청년 이전 선택: ${e.id}`, list.some((f) => youngFlags.has(f)), list.join(','));
});

/* ═════════ ⑤ 매달 스탯이 저절로 줄지 않음 ═════════ */
// 예전에는 달이 바뀔 때마다 스탯을 53~57 쪽으로 당기는 '생활 소모'가 있었다.
// 선택한 효과 말고는 스탯이 변하지 않아야 한다.
const nd = Life.newGame({ name: '무변화', gender: '남', startAge: 30 });
nd.stats = { hp: 84, mental: 78, charm: 71, social: 66, intel: 74, luck: 69, asset: 500 };
const beforeSix = JSON.parse(JSON.stringify(nd.stats));
for (let i = 0; i < 6; i++) {
  nd.current = { eventId: 'none', chosen: 0 };
  Life.advance(nd);
}
const sixDelta = ['hp', 'mental', 'charm', 'social', 'intel', 'luck', 'asset'].filter((k) => Math.abs(nd.stats[k] - beforeSix[k]) > 0.001);
check('6개월을 그냥 보내도 스탯이 줄지 않음', sixDelta.length === 0,
  sixDelta.map((k) => `${k} ${beforeSix[k]}→${nd.stats[k]}`).join(', ') || '변화 없음');
check('6개월 진행 후에도 30세', nd.age === 30 && nd.month === 7, `${nd.age}세 ${nd.month}개월차`);

// 최고치(88 초과)만 아주 조금씩 내려간다 — 100에 붙지 않게
const top = Life.newGame({ name: '최고치', gender: '남', startAge: 30 });
top.stats = { hp: 100, mental: 60, charm: 60, social: 60, intel: 60, luck: 60, asset: 0 };
top.current = { eventId: 'none', chosen: 0 };
Life.advance(top);
check('최고치는 한 달에 조금만 내려감', top.stats.hp < 100 && top.stats.hp > 97,
  `체력 100→${top.stats.hp.toFixed(2)}`);
check('보통 스탯은 그대로', top.stats.mental === 60 && top.stats.charm === 60 && top.stats.social === 60,
  `${top.stats.mental}/${top.stats.charm}/${top.stats.social}`);

// 45세 이상은 생일(해가 바뀌는 달)에만 아주 조금 노화한다
const ag = Life.newGame({ name: '노화', gender: '여', startAge: 45 });
ag.month = 12;
ag.current = { eventId: 'none', chosen: 0 };
const hpBefore = ag.stats.hp, mentalBefore = ag.stats.mental;
Life.advance(ag);
check('생일에는 노화만큼만 (체력 -1)', ag.age === 46 && Math.abs((hpBefore - ag.stats.hp) - 1) < 0.001,
  `체력 ${hpBefore}→${ag.stats.hp}`);
check('생일에 멘탈은 깎이지 않음 (45세)', Math.abs(ag.stats.mental - mentalBefore) < 0.001,
  `멘탈 ${mentalBefore}→${ag.stats.mental}`);

/* ═════════ ⑥ 제보 반영 — 결과를 고르는 선택지·진로 갈래 모순 ═════════ */
// “합격한다 / 불합격한다를 내가 정하는 건가요?” — 시험·입시 결과를 직접 고르는 선택지가 없어야 한다.
const OUTCOME_LABEL = /^(합격한다|불합격한다|합격|불합격|떨어진다|붙는다|당첨된다|낙첨된다|당첨|낙첨)$/;
const outcomePicks = [];
EVENTS.forEach((e) => e.choices.forEach((c) => {
  const label = typeof c.label === 'string' ? c.label.trim() : '';
  if (OUTCOME_LABEL.test(label)) outcomePicks.push(e.id + ':' + label);
}));
check('결과를 직접 고르는 선택지 없음', outcomePicks.length === 0, outcomePicks.slice(0, 5).join(' / ') || '없음');
const admission = byId('tn_h50');
check('합격 발표는 결과가 함수로 정해짐', !!admission && typeof admission.choices[0].result === 'function');
function passRun(mental, flags) {
  const g = Life.newGame({ name: '발표', gender: '남', startAge: 19 });
  g.current = { eventId: 'tn_h50', chosen: null, event: null };
  g.stats.mental = mental;
  // 19세는 시작 나이 선택지가 아니라 프리셋이 없다(1세 프리셋 = 신생아 체력 38로 시작).
  // 이 검사는 '지난 3년을 쌓은 고3'의 합격선을 보는 것이므로 고3다운 체력을 넣어 둔다.
  g.stats.hp = 62;
  Object.assign(g.flags, flags || {});
  const res = Life.choose(g, 0);
  return { res, g };
}
const good = passRun(90, { 성실함: true, 성적_상승: true });
const bad = passRun(40, { 도전_경험: true, 수능_지방: true });
check('공부를 쌓은 사람은 합격', /합격/.test(good.res.result) && !!good.g.flags['대학_진학'], good.res.result.slice(0, 20));
check('준비가 부족하면 불합격', /불합격/.test(bad.res.result) && !bad.g.flags['대학_진학'], bad.res.result.slice(0, 20));

// “중학생 때 체육 특기생인데 고등학생 때 예술 특기생” — 두 갈래가 동시에 서지 않아야 한다.
let bothTracks = 0, crossEvents = 0;
for (let i = 0; i < 12; i++) {
  const s = Life.newGame({ name: '갈래', gender: i % 2 ? '남' : '여', startAge: 14 });
  let guard = 0;
  while (!s.ended && s.age <= 19 && guard++ < 200) {
    const e = Life.currentEvent(s);
    if (s.flags['진로_체육'] && !s.flags['진로_예술'] && /^(tn_m41|tn_h90|tn_h53|tn_m21)$/.test(e.id)) crossEvents++;
    if (s.flags['진로_예술'] && !s.flags['진로_체육'] && /^(tn_m24|tn_m42|tn_h91|tn_h54)$/.test(e.id)) crossEvents++;
    Life.choose(s, Math.floor(Math.random() * e.choices.length));
    Life.advance(s);
  }
  if (s.flags['진로_체육'] && s.flags['진로_예술']) bothTracks++;
}
check('진로 갈래는 하나만 (체육+예술 동시 없음)', bothTracks === 0, bothTracks + '판');
check('다른 갈래 이벤트가 섞여 나오지 않음', crossEvents === 0, crossEvents + '건');
check('예고·체육고 입학 이벤트 존재', !!byId('tn_h90') && !!byId('tn_h91'));
check('고입 선택지는 예고·체고 준비생에게 숨김', !!byId('high_enter').when);

/* ── 출력 ── */
console.log(results.join('\n'));
const fails = results.filter((r) => r.startsWith('FAIL')).length;
console.log('\n실패:', fails, '건');
if (fails) process.exitCode = 1;
