// 2026-11-20 Phase 1 검증 — 출발 시나리오 · 가문 유산 · 엔딩 결과 카드 · 효과음
//  · 시나리오 4종: 기본값이 기존 균형을 건드리지 않는지, 능력치·재산·플래그가 의도대로인지
//  · 시나리오 플래그 이벤트: 기본 시작에는 0개, 해당 시나리오에는 나이대에 맞게 열리는지
//  · 가문 이어받기: 유산 6%·상한 2,500만, 빚은 물려받지 않음, 대수(2대·3대), 재능 +3,
//    부모님이 카메오 부부일 때 '부모님: OO ♥ XX' 와 인연 후보 제외
//  · 저장 호환(v5 확장)·되돌리기 후에도 시나리오·가문이 남는지
//  · 결과 카드: model 필드·칭호 3개·파일 이름·draw 가 스텁 캔버스에서 안 터지는지
//  · 효과음: 음소거 기본값·localStorage 저장·오디오 없는 환경에서도 예외 없음
const path = require('path');
const { load } = require('../tools/lib-load');

const { Life, EVENTS } = load(path.join(__dirname, '..', 'assets'));
const fs = require('fs');

// sfx.js · sharecard.js 는 index.html 이 불러오는 파일 — node 에서 그대로 평가한다
for (const file of ['sfx.js', 'sharecard.js']) {
  (0, eval)(fs.readFileSync(path.join(__dirname, '..', 'assets', file), 'utf8'));
}
const Sfx = global.window.Sfx;
const ShareCard = global.window.ShareCard;
const TitleBook = global.window.TitleBook;

const ran = [];
const check = (name, cond, extra) => ran.push(`${cond ? 'PASS' : 'FAIL'} · ${name}${extra ? ' — ' + extra : ''}`);

const HALL_KEY = 'lifeTurnSim.hall.v1';
const SAVE_KEY = 'lifeTurnSim.save.v1';
function putHall(records) {
  localStorage.setItem(HALL_KEY, JSON.stringify({ v: 1, seeded: true, records }));
}
function clearStorage() {
  [HALL_KEY, SAVE_KEY, 'lifeTurnSim.sfx.v1', 'lifeTurnSim.titles.v1'].forEach((k) => localStorage.removeItem(k));
}

/* ═════════════ 1) 출발 시나리오 ═════════════ */
clearStorage();
const ids = Life.SCENARIOS.map((s) => s.id);
check('시나리오 4종', ids.join(',') === 'kr,imf,chaebol,dirt', ids.join(','));
check('기본 시나리오 = 한국 현실', Life.scenarioOf(undefined).id === 'kr' && Life.scenarioOf('없는값').id === 'kr');
check('시나리오 설명·힌트 있음', Life.SCENARIOS.every((s) => s.name && s.emoji && s.hint && s.desc));

const base = Life.newGame({ name: '기본', gender: '남', startAge: 25 });
check('기본 시작은 기존 프리셋 그대로', base.stats.asset === 850 && base.stats.mental === 54 &&
  base.stats.intel === 62 && Object.keys(base.flags).indexOf('시나리오_재벌') === -1,
  JSON.stringify(base.stats));

const chae = Life.newGame({ name: '재벌', gender: '남', startAge: 25, scenario: 'chaebol' });
check('재벌가: 재산 +1억', chae.stats.asset === 10850, String(chae.stats.asset));
check('재벌가: 능력치 맞바꿈', chae.stats.mental === 47 && chae.stats.social === 64 &&
  chae.stats.charm === 64 && chae.stats.intel === 65 && chae.stats.hp === 55,
  JSON.stringify(chae.stats));
check('재벌가: 플래그', chae.flags['시나리오_재벌'] === true);

const dirt = Life.newGame({ name: '흙수저', gender: '남', startAge: 25, scenario: 'dirt' });
check('흙수저: 재산 10% - 150 → 빚', dirt.stats.asset === -65, String(dirt.stats.asset));
check('흙수저: 몸·마음 단단', dirt.stats.hp === 63 && dirt.stats.mental === 58 && dirt.stats.social === 55,
  JSON.stringify(dirt.stats));
check('흙수저: 플래그', dirt.flags['시나리오_흙수저'] === true);

const imf = Life.newGame({ name: '구십', gender: '여', startAge: 25, scenario: 'imf' });
check('90년대생: 재산 70%', imf.stats.asset === 595, String(imf.stats.asset));
check('90년대생: 능력치', imf.stats.mental === 51 && imf.stats.intel === 64 &&
  imf.stats.luck === 48 && imf.stats.social === 59, JSON.stringify(imf.stats));
check('90년대생: 플래그', imf.flags['시나리오_IMF'] === true);

// 모든 시작 나이 × 모든 시나리오에서 능력치는 0~100 안
let rangeBad = [];
Life.START_AGES.forEach((a) => {
  Life.SCENARIOS.forEach((sc) => {
    const s = Life.newGame({ name: '범위', gender: '남', startAge: a.age, scenario: sc.id });
    Life.GAUGE_KEYS.forEach((k) => {
      if (s.stats[k] < 0 || s.stats[k] > 100) rangeBad.push(`${sc.id}/${a.age}세 ${k}=${s.stats[k]}`);
    });
  });
});
check('시나리오 × 시작 나이 → 능력치 0~100', rangeBad.length === 0, rangeBad.join(',') || '0건');

// 시나리오 저장·요약
check('저장본에 시나리오 id', base.scenario === 'kr' && chae.scenario === 'chaebol');
const sumChae = Life.summary(chae);
check('요약에 시나리오', sumChae.scenario && sumChae.scenario.id === 'chaebol' &&
  sumChae.scenario.name === '재벌가 막내', JSON.stringify(sumChae.scenario));
check('요약에 대수(기본 1대)', Life.newGame({ name: '기본2', gender: '남', startAge: 8 }).generation === 1);

/* 시나리오 플래그 이벤트 */
const SC_EVENTS = EVENTS.filter((e) => String(e.id).indexOf('scn_') === 0);
check('시나리오 이벤트 등록', SC_EVENTS.length >= 12, SC_EVENTS.length + '개');
const noFlagVisible = SC_EVENTS.filter((ev) => {
  const s = Life.newGame({ name: '기본', gender: '남', startAge: 8 });
  s.age = ev.minAge;
  return Life.passes(ev, s);
});
check('기본 시작 → 시나리오 이벤트 0개', noFlagVisible.length === 0, noFlagVisible.map((e) => e.id).join(',') || '0건');

function visibleFor(flag, s) {
  return SC_EVENTS.filter((ev) => {
    const st = Life.newGame({ name: '확인', gender: '남', startAge: ev.minAge });
    st.flags[flag] = true;
    st.age = ev.minAge;
    // 프리셋 플래그(초등학생 등)가 사라지지 않게 원래 플래그를 되살린다
    return Life.passes(ev, st);
  });
}
['시나리오_재벌', '시나리오_흙수저', '시나리오_IMF', '가문_이어받음'].forEach((flag) => {
  const mine = SC_EVENTS.filter((ev) => {
    const req = ev.requireFlags;
    return req === flag || (Array.isArray(req) && req.indexOf(flag) !== -1) ||
      (req && typeof req === 'object' && req[flag]);
  });
  const opened = visibleFor(flag, null).filter((ev) => mine.some((m) => m.id === ev.id));
  check(`${flag} 이벤트 ${mine.length}개 · 나이 조건에서 열림`, mine.length >= 3 && opened.length === mine.length,
    `${opened.length}/${mine.length}`);
});

/* ═════════════ 2) 가문 · 유산 이어받기 ═════════════ */
const PARENT = {
  id: 'r-parent', kind: 'life', key: 'life80', stageLabel: '80세 완주', age: 80,
  score: 71.4, grade: 'A', title: 'K-기획자', name: '상훈', gender: '남', ts: 1700000000000,
  mine: true, generation: 1, scenario: 'kr',
  cameo: { name: '희연', rel: 'married', relLabel: '부부' },
  stats: { hp: 64, mental: 71, charm: 66, social: 84, intel: 79, luck: 55, asset: 32000 }
};
putHall([PARENT]);
const list1 = Life.ancestors();
check('가문 후보 1명', list1.length === 1 && list1[0].name === '상훈');
check('유산 = 순재산 6%', list1[0].heir === 1920, String(list1[0].heir));
check('유산 표기', list1[0].heirText === '1,920만 원', list1[0].heirText);
check('대수 2대', list1[0].gen === 2);
check('재능 = 가장 높은 능력치', list1[0].bonus.key === 'social' && list1[0].bonus.amount === 3 &&
  list1[0].trait === '사람이 따르는 집안');
check('부모님이 카메오 부부', list1[0].family === '부모님: 상훈 ♥ 희연' && list1[0].spouse === '희연');

putHall([Object.assign({}, PARENT, { id: 'r-rich', name: '부자', asset: 0, stats: Object.assign({}, PARENT.stats, { asset: 1000000 }) })]);
check('유산 상한 2,500만', Life.ancestors()[0].heir === 2500, String(Life.ancestors()[0].heir));

putHall([Object.assign({}, PARENT, { id: 'r-debt', name: '빚쟁이', stats: Object.assign({}, PARENT.stats, { asset: -4000 }) })]);
check('빚은 물려받지 않는다', Life.ancestors()[0].heir === 0 && Life.ancestors()[0].heirText === '0원');

putHall([Object.assign({}, PARENT, { id: 'r-gen2', generation: 2 })]);
check('2대의 자식은 3대', Life.ancestors()[0].gen === 3);
putHall([Object.assign({}, PARENT, { id: 'r-old', generation: undefined })]);
check('대수 없던 옛 기록은 2대', Life.ancestors()[0].gen === 2);

// 이어받기 — 재산·재능·플래그·대수
putHall([PARENT]);
const heir = Life.newGame({ name: '유솔', gender: '여', startAge: 1, legacy: 'r-parent' });
check('이어받기: 재산 = 유산', heir.stats.asset === 1920, String(heir.stats.asset));
// 1세(신생아) 시작 호감도 46 + 물려받은 재능 3 = 49
check('이어받기: 재능 +3', heir.stats.social === 49, String(heir.stats.social));
check('이어받기: 대수 2대', heir.generation === 2 && heir.legacy && heir.legacy.gen === 2);
check('이어받기: 플래그', heir.flags['가문_이어받음'] === true);
check('이어받기: 부모 소개', heir.legacy.family === '부모님: 상훈 ♥ 희연');
check('이어받기: 부모는 인연 후보에서 빠진다', heir.cameos.length === 0, heir.cameos.map((c) => c.name).join(','));

// 다른 사람은 그대로 인연 후보로 남는다
putHall([PARENT, {
  id: 'r-other', kind: 'life', key: 'life80', stageLabel: '80세 완주', age: 80, score: 60, grade: 'B',
  title: '낚시광', name: '지우', gender: '여', ts: 1700000900000, mine: true,
  stats: { hp: 60, mental: 60, charm: 60, social: 60, intel: 60, luck: 60, asset: 1000 }
}]);
const heir2 = Life.newGame({ name: '유솔', gender: '여', startAge: 1, legacy: 'r-parent' });
check('이어받기: 부모 아닌 인연은 남는다', heir2.cameos.length === 1 && heir2.cameos[0].name === '지우');

// 가상 인물(시드) 기록은 가문이 될 수 없다
putHall([Object.assign({}, PARENT, { id: 'r-seed', mine: false })]);
check('가상 인물은 가문 후보 아님', Life.ancestors().length === 0);
check('mine 아닌 기록은 이어받기 불가', Life.newGame({ name: '무가문', gender: '남', startAge: 8, legacy: 'r-seed' }).legacy === null);

// 시나리오 + 가문 동시에
putHall([PARENT]);
const both = Life.newGame({ name: '유솔', gender: '여', startAge: 25, scenario: 'dirt', legacy: 'r-parent' });
check('시나리오 + 가문: 재산 합산', both.stats.asset === 1920 - 65, String(both.stats.asset));
check('시나리오 + 가문: 플래그 둘 다', both.flags['시나리오_흙수저'] && both.flags['가문_이어받음']);
check('시나리오 + 가문: 요약', Life.summary(both).legacy && Life.summary(both).legacy.from === '상훈');

// 저장 · 불러오기 · 되돌리기
const saved = Life.newGame({ name: '유솔', gender: '여', startAge: 25, scenario: 'imf', legacy: 'r-parent' });
Life.choose(saved, 0);
Life.save(saved);
const reloaded = Life.load();
check('저장 → 불러오기: 시나리오·가문 유지', reloaded.scenario === 'imf' && reloaded.generation === 2 &&
  reloaded.legacy && reloaded.legacy.from === '상훈', JSON.stringify({ sc: reloaded.scenario, g: reloaded.generation }));
Life.undo(reloaded);
check('되돌리기 후에도 시나리오·가문 유지', reloaded.scenario === 'imf' && reloaded.legacy && reloaded.legacy.gen === 2);

// v5 저장본 호환 — 시나리오·가문이 없던 저장본
const oldSave = JS_reduce();
function JS_reduce() {
  const s = JSON.parse(JSON.stringify(saved));
  delete s.scenario; delete s.legacy; delete s.generation;
  localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  return Life.load();
}
check('v5 예전 저장본 → 시나리오 kr·1대·가문 없음', oldSave.scenario === 'kr' && oldSave.generation === 1 &&
  oldSave.legacy === null && oldSave.v === 6, `v${oldSave.v}`);

// 졸업 등록 기록에도 대수·시나리오가 남는다
const gradState = Life.newGame({ name: '유솔', gender: '여', startAge: 14, scenario: 'chaebol', legacy: 'r-parent' });
gradState.grad = { key: 'middle', age: 16, registered: false, stats: { hp: 60, mental: 60, charm: 60, social: 60, intel: 60, luck: 60, asset: 500 } };
gradState.age = 16; gradState.month = 12;
Life.graduate(gradState, true);
const mineRec = Life.hallMine().filter((r) => r.id === gradState.hallId)[0];
check('전당 기록에 대수·시나리오', mineRec && mineRec.generation === 2 && mineRec.scenario === 'chaebol',
  mineRec ? `${mineRec.generation}대/${mineRec.scenario}` : '없음');

/* ═════════════ 3) 엔딩 결과 카드 ═════════════ */
putHall([PARENT]);
const cardState = Life.newGame({ name: '유 솔', gender: '여', startAge: 25, scenario: 'chaebol', legacy: 'r-parent' });
cardState.age = 80; cardState.month = 12; cardState.ended = true; cardState.endingKind = 'life';
cardState.stats = { hp: 58, mental: 63, charm: 54, social: 61, intel: 72, luck: 48, asset: 4200 };
cardState.flags.자녀수 = 2; cardState.flags.결혼 = true;
const model = ShareCard.model(cardState);
check('카드: 이름·종류', model.name === '유 솔' && model.kicker === '80세 완주', model.kicker);
check('카드: 제목·등급·총점', !!model.title && !!model.grade && typeof model.score === 'number');
check('카드: 능력치 6개 + 재산', model.stats.length === 6 && model.asset && model.asset.text === '4,200만 원',
  model.stats.map((s) => s.label).join(','));
check('카드: 대수 표기', model.generationLabel === '2대', model.generationLabel);
check('카드: 가문 줄', model.note.indexOf('부모님: 상훈 ♥ 희연') !== -1, model.note);
check('카드: 브랜드·주소', model.brand === '인생 한 턴' && model.url === 'life-turn-sim.vercel.app');
check('카드: 크기 1080×1350', ShareCard.W === 1080 && ShareCard.H === 1350);

// 칭호 — 이번 판(run)에서 딴 것만, 최대 3개
localStorage.removeItem('lifeTurnSim.titles.v1');
TitleBook.check(Object.assign({}, cardState, {
  age: 1,
  month: 1,
  stats: Object.assign({}, cardState.stats),
  flags: Object.assign({}, cardState.flags, { 우렁찬_아기: true })
}));
const ownedAfter = TitleBook.owned();
const ownedIds = Object.keys(ownedAfter);
check('칭호 도감 기록에 이번 판 id', ownedIds.length > 0 &&
  ownedIds.every((id) => ownedAfter[id].run === cardState.createdAt), ownedIds.join(','));
const withTitles = ShareCard.model(cardState);
check('카드: 이번 판 칭호', withTitles.titles.length > 0 && withTitles.titles.length <= 3,
  withTitles.titles.map((t) => t.name).join(','));
const otherRun = ShareCard.model(Object.assign({}, cardState, { createdAt: 999 }));
check('카드: 다른 판 칭호는 섞이지 않는다', otherRun.titles.length === 0);

check('카드 파일 이름', ShareCard.filename(cardState) === '인생한턴_유솔_80세.png', ShareCard.filename(cardState));

// draw — 진짜 canvas 없이 스텁으로 (그리기 순서·글자만 확인)
function stubCtx() {
  const texts = [];
  const grad = { addColorStop() {} };
  const ctx = {
    texts,
    canvas: { width: 1080, height: 1350 },
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: 'left', textBaseline: 'top', globalAlpha: 1,
    fillRect() {}, strokeRect() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, arcTo() {},
    fill() {}, stroke() {}, save() {}, restore() {}, translate() {}, scale() {}, clearRect() {},
    createLinearGradient() { return grad; },
    createRadialGradient() { return grad; },
    measureText(t) { return { width: String(t).length * 24 }; },
    fillText(t) { texts.push(String(t)); }
  };
  return ctx;
}
const ctx = stubCtx();
let drawErr = null;
try { ShareCard.draw(ctx, model); } catch (e) { drawErr = e && e.message; }
check('카드: draw 예외 없음', !drawErr, drawErr || 'OK');
const joined = ctx.texts.join(' | ');
check('카드: draw 에 이름·제목·브랜드', joined.indexOf('유 솔') !== -1 && joined.indexOf(model.title) !== -1 &&
  joined.indexOf('life-turn-sim.vercel.app') !== -1, ctx.texts.length + '개 글자');
check('카드: draw 에 재산·칭호', joined.indexOf('4,200만 원') !== -1 && joined.indexOf('2대') !== -1);

// 이력 하이라이트 — 요약이 고른 가장 굵은 사건이 카드에도 실린다
const hlState = Object.assign({}, cardState, {
  history: [
    { turn: 1, age: 30, month: 4, eventId: 'parent_illness', title: '부모님 병원', place: '병원',
      choice: '내가 간병을 맡는다', result: '한 달간 매일 병원에 갔습니다.', deltas: { mental: -2, asset: -800 }, milestone: true },
    { turn: 2, age: 19, month: 3, eventId: 'csat_d100', title: '수능 D-100', place: '교실',
      choice: '올인한다', result: '하루 14시간 공부.', deltas: { intel: 4 }, milestone: true },
    { turn: 3, age: 55, month: 9, eventId: 'x', title: '창업', place: '사무실',
      choice: '작게 시작한다', result: '가게 문을 열었습니다.', deltas: { asset: 300 } }
  ]
});
const hlModel = ShareCard.model(hlState);
check('카드: 이력 하이라이트', hlModel.highlights.length === 3 &&
  hlModel.highlights[0].age === 30 && hlModel.highlights[0].title === '부모님 병원' &&
  hlModel.highlights[0].choice === '내가 간병을 맡는다',
  hlModel.highlights.map((x) => x.age + '세 ' + x.title).join(' / '));

// 가장 빽빽한 카드(긴 제목·칭호 3개·가문 줄·하이라이트)도 바닥 워터마크를 덮지 않는다
function posCtx() {
  const drawn = [];
  const grad = { addColorStop() {} };
  return {
    drawn,
    canvas: { width: 1080, height: 1350 },
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: 'left', textBaseline: 'top', globalAlpha: 1,
    fillRect() {}, strokeRect() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, arcTo() {},
    fill() {}, stroke() {}, save() {}, restore() {}, translate() {}, scale() {}, clearRect() {},
    createLinearGradient() { return grad; },
    createRadialGradient() { return grad; },
    measureText(t) { const s = String(t); let w = 0; for (const ch of s) w += /[\u3131-\uD79D]/.test(ch) ? 30 : 16; return { width: w }; },
    fillText(t, x, y) { drawn.push({ t: String(t), x, y }); }
  };
}
const dense = posCtx();
let denseErr = null;
try { ShareCard.draw(dense, Object.assign({}, hlModel, {
  title: '울고 웃고 또 울고 끝내 웃은, 세상에서 가장 길고 긴 마지막까지 무대에 선 연주자',
  highlights: hlModel.highlights,
  note: '상훈 가문 · 이전 회차의 인연 — 희연 · 배우자'
})); } catch (e) { denseErr = e && e.message; }
const footerTop = ShareCard.H - 150;
const intruders = dense.drawn.filter((d) => d.y > footerTop - 6 && d.y < ShareCard.H - 100);
check('카드: 가장 빽빽해도 바닥 워터마크와 겹치지 않음', !denseErr && intruders.length === 0,
  denseErr || (intruders.length ? intruders.map((d) => d.t + '@' + Math.round(d.y)).join(',') : 'OK'));
const denseText = dense.drawn.map((d) => d.t).join(' | ');
check('카드: 하이라이트·가문 줄이 실제로 그려진다', denseText.indexOf('30세 · 부모님 병원') !== -1 &&
  denseText.indexOf('가문') !== -1, denseText.slice(0, 60));

// 건강 악화 조기 엔딩 — 나이와 까닭이 카드에 남는다
const healthState = Object.assign({}, cardState, { age: 47, ended: true, endingKind: 'health' });
const hm = ShareCard.model(healthState);
check('건강 조기 엔딩 카드: 나이·까닭', hm.finalAge === 47 && hm.kicker === '건강 악화 · 47세', hm.kicker);

// 공유 시트에 실리는 글
check('카드: 공유 글에 나이·등급·재산·주소',
  ShareCard.shareText(cardState).indexOf('80세') !== -1 &&
  ShareCard.shareText(cardState).indexOf('4,200만 원') !== -1 &&
  ShareCard.shareText(cardState).indexOf('life-turn-sim.vercel.app') !== -1,
  ShareCard.shareText(cardState).replace(/\n/g, ' / '));

// 졸업 엔딩 카드
const gradCard = Life.newGame({ name: '유솔', gender: '여', startAge: 8, scenario: 'imf' });
gradCard.age = 19; gradCard.month = 12; gradCard.ended = true; gradCard.endingKind = 'graduation';
gradCard.stats = { hp: 70, mental: 55, charm: 62, social: 58, intel: 66, luck: 49, asset: 800 };
gradCard.grad = { key: 'high', age: 19, registered: true, stats: Object.assign({}, gradCard.stats) };
const gm = ShareCard.model(gradCard);
check('졸업 엔딩 카드: 종류·나이', gm.kicker === '고등학교 졸업' && gm.finalAge === 19, `${gm.kicker}/${gm.finalAge}세`);

/* ═════════════ 4) 효과음 ═════════════ */
check('효과음: 오디오 없는 환경에서도 안전', Sfx.supported() === false && Sfx.play('turn') === false &&
  Sfx.deltas({ hp: 2 }) === false);
check('효과음: 기본 켜짐', Sfx.isMuted() === false);
check('효과음: 소리 목록', ['turn', 'up', 'down', 'win', 'lose', 'ending', 'title'].every((n) => Sfx.names.indexOf(n) !== -1),
  Sfx.names.join(','));
check('효과음: 변화 → 소리 판단', Sfx.kindForDeltas({ hp: 2, social: 1 }) === 'up' &&
  Sfx.kindForDeltas({ hp: -3 }) === 'down' && Sfx.kindForDeltas({ hp: 2, mental: -1 }) === 'mix' &&
  Sfx.kindForDeltas({}) === null && Sfx.kindForDeltas({ asset: -30 }) === 'down');

Sfx.setMuted(true);
check('효과음: 끄면 저장', Sfx.isMuted() === true &&
  JSON.parse(localStorage.getItem('lifeTurnSim.sfx.v1')).muted === true);
(0, eval)(fs.readFileSync(path.join(__dirname, '..', 'assets', 'sfx.js'), 'utf8'));
check('효과음: 새로 읽어도 꺼진 상태 유지', global.window.Sfx.isMuted() === true);
global.window.Sfx.setMuted(false);
check('효과음: 다시 켜면 저장', global.window.Sfx.isMuted() === false &&
  JSON.parse(localStorage.getItem('lifeTurnSim.sfx.v1')).muted === false);
check('효과음: 토글', global.window.Sfx.toggle() === true && global.window.Sfx.toggle() === false);

/* ── 결과 ── */
ran.forEach((line) => console.log(line));
const failed = ran.filter((l) => l.startsWith('FAIL'));
console.log('\n=== Phase 1 검사 ' + (ran.length - failed.length) + ' / ' + ran.length + ' 통과 ===');
console.log('=== 결과:', failed.length ? 'FAIL' : 'PASS', '===');
if (failed.length) process.exitCode = 1;
