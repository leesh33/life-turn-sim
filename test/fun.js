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

/* ═════════ ② 10초 미니 승부 ═════════ */
const miniEvents = EVENTS.filter((e) => e.choices.some((c) => c.mini));
check('미니 승부 이벤트 수', miniEvents.length >= 7, miniEvents.length + '개');
const MINI_TYPES = new Set(['dice', 'timing', 'rps']);
const seenTypes = new Set();
miniEvents.forEach((ev) => {
  ev.choices.forEach((c) => {
    if (!c.mini) return;
    seenTypes.add(c.mini.type);
    check(`미니 종류: ${ev.id}`, MINI_TYPES.has(c.mini.type), c.mini.type);
    check(`미니 승/패 갈래: ${ev.id}`, !!(c.mini.win && c.mini.lose && c.mini.win.result && c.mini.lose.result));
    check(`미니 나이 20~35: ${ev.id}`, ev.minAge >= 20 && ev.maxAge <= 35, `${ev.minAge}~${ev.maxAge}`);
  });
});
check('미니 3종 모두 등장', seenTypes.size === 3, [...seenTypes].join(','));

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

/* ── 출력 ── */
console.log(results.join('\n'));
const fails = results.filter((r) => r.startsWith('FAIL')).length;
console.log('\n실패:', fails, '건');
if (fails) process.exitCode = 1;
