// 성장 아바타 · 말풍선 · 단기 미션 검증 (assets/avatar.js)
//  · 나이대 7단계가 1~80세를 빈틈없이 덮고, 단계마다 그림이 실제로 달라지는가
//  · 인라인 SVG 만 쓴다(외부 이미지·네트워크 없음) · 크기가 몇 KB 안쪽인가
//  · 능력치가 표정·소품에 반영되는가(지침·활기·부자·빚·매력)
//  · 말풍선이 지금 상태를 읽어 말하는가(체력·멘탈·재산·직전 선택)
//  · 단기 미션이 진행률을 계산하고, 달성하는 순간 한 번만 보너스를 주는가
const path = require('path');
const { load } = require('../tools/lib-load');

const base = path.join(__dirname, '..', 'assets');
const { Life, Avatar } = load(base);
if (!Avatar) throw new Error('assets/avatar.js 를 불러오지 못했습니다');

const results = [];
const check = (name, cond, extra) => results.push(`${cond ? 'PASS' : 'FAIL'} · ${name}${extra ? ' — ' + extra : ''}`);
const S = (age, stats, extra) => Object.assign({
  age: age, month: 3, turn: 4, gender: '남',
  stats: Object.assign({ hp: 60, mental: 60, charm: 55, social: 55, intel: 55, luck: 50, asset: 100 }, stats || {}),
  current: null, history: [], missions: {}
}, extra || {});

/* ═════════ ① 나이대 7단계 ═════════ */
check('나이대 7단계', Avatar.BANDS.length === 7, Avatar.BANDS.map((b) => b.id).join(','));
const ids = Avatar.BANDS.map((b) => b.id);
check('나이대 id 중복 없음', new Set(ids).size === ids.length);

let gap = null, prev = null;
for (let age = 1; age <= 80; age++) {
  const band = Avatar.bandOf(age);
  if (!band) { gap = age; break; }
  if (prev && band.from > prev.to + 1) { gap = age; break; }
  prev = band;
}
check('1~80세가 빈틈없이 이어짐', gap === null, gap ? `${gap}세 비었음` : '1~80세');
check('80세는 노년', Avatar.bandOf(80).id === 'senior');
check('0세 이하는 유아기', Avatar.bandOf(0).id === 'baby');

// 단계 경계 — 브리프의 7단계를 게임 구간과 맞춘 값
const bounds = [[1, 'baby'], [7, 'baby'], [8, 'child'], [13, 'child'], [14, 'teen'],
  [19, 'teen'], [20, 'youth'], [25, 'youth'], [26, 'adult'], [49, 'adult'],
  [50, 'midlife'], [64, 'midlife'], [65, 'senior']];
bounds.forEach(([age, id]) => check(`${age}세 → ${id}`, Avatar.bandOf(age).id === id, Avatar.bandOf(age).id));

/* ═════════ ② 인라인 SVG ═════════ */
const svgs = {};
Avatar.BANDS.forEach((b) => { svgs[b.id] = Avatar.svg(S(b.from + 1)); });
Avatar.BANDS.forEach((b) => {
  const out = svgs[b.id];
  check(`${b.id} SVG 그림`, /^<svg class="av-svg" viewBox="0 0 72 94"/.test(out));
  const noXmlns = out.replace(/xmlns="[^"]*"/g, '');
  check(`${b.id} 외부 참조 없음`, !/https?:|\bxlink:href|\bsrc=|url\((?!['"]?#)/.test(noXmlns));
  check(`${b.id} 크기 7KB 이하`, out.length < 7000, out.length + 'B');
  check(`${b.id} 낭독용 이름`, /aria-label="[^"]+"/.test(out));
  check(`${b.id} 숫자 오류 없음`, !/NaN|undefined|Infinity/.test(out));
});
check('단계마다 그림이 다름', new Set(Object.values(svgs)).size === 7, new Set(Object.values(svgs)).size + '종');
check('같은 상태는 같은 그림', Avatar.svg(S(30)) === Avatar.svg(S(30)));
check('성별이 그림에 반영됨', Avatar.svg(S(22, {}, { gender: '여' })) !== Avatar.svg(S(22, {}, { gender: '남' })));

/* ═════════ ③ 표정 · 소품 ═════════ */
check('체력 35 미만은 지친 표정', Avatar.moodOf(S(30, { hp: 30 })) === 'tired');
check('멘탈 35 미만도 지친 표정', Avatar.moodOf(S(30, { mental: 20 })) === 'tired');
check('체력·멘탈 높으면 활기찬 표정', Avatar.moodOf(S(30, { hp: 88, mental: 82 })) === 'great');
check('보통 상태', Avatar.moodOf(S(30, { hp: 60, mental: 60 })) === 'ok');

const tiredSvg = Avatar.svg(S(30, { hp: 25 }));
check('지치면 땀방울', tiredSvg.includes('#8CC4EE'), '땀방울');
check('지치면 다크서클', tiredSvg.includes('#C0A797'), '눈 밑');
check('빚이면 반창고', Avatar.svg(S(30, { asset: -800 })).includes('#F4DFC0'), '반창고');
check('재산 1억이면 왕관', Avatar.svg(S(30, { asset: 12000 })).includes('av-crown'), '왕관');
check('재산 3천만이면 선글라스', Avatar.svg(S(30, { asset: 3500 })).includes('#241E19'), '선글라스');
check('매력 78 이상이면 반짝이', Avatar.svg(S(30, { charm: 80 })).includes('av-spark'), '반짝이');
check('평범한 상태엔 왕관 없음', !Avatar.svg(S(30)).includes('av-crown'));

/* ═════════ ④ 말풍선 ═════════ */
const say = (st) => Avatar.speech(st);
check('체력이 바닥이면 체력 걱정', say(S(30, { hp: 20 })).includes('체력'), say(S(30, { hp: 20 })));
check('멘탈이 바닥이면 멘탈 걱정', say(S(30, { mental: 20 })).includes('멘탈'), say(S(30, { mental: 20 })));
check('빚이면 통장 걱정', say(S(30, { asset: -500 })).includes('통장'), say(S(30, { asset: -500 })));
check('멘탈 최고조 문구', say(S(30, { mental: 90 })).includes('멘탈 최고조'), say(S(30, { mental: 90 })));
check('재산이 크면 재산 자랑', say(S(30, { asset: 15000 })).includes('재산'), say(S(30, { asset: 15000 })));

// 직전 선택의 결과를 짚는다
const good = S(30);
good.current = { chosen: 0, deltas: { mental: 6, charm: 4 } };
check('좋은 선택 뒤엔 반응', /제법|잘 골랐다|계속 가자/.test(say(good)), say(good));
const bad = S(30);
bad.current = { chosen: 1, deltas: { hp: -9, mental: -2 } };
check('나쁜 선택 뒤엔 반응', /아팠다|다시 생각|손해/.test(say(bad)), say(bad));

// 나이대 기본 대사 — 단계마다 다르고, 한 줄 안에 들어간다
const lines = Avatar.BANDS.map((b) => say(S(b.from + 1)));
check('나이대 대사가 채워짐', lines.every((l) => l && l.length > 3), lines.join(' / '));
check('나이대마다 대사가 다름', new Set(lines).size >= 6, new Set(lines).size + '종');
check('말풍선은 34자 이내', lines.every((l) => l.length <= 34), Math.max(...lines.map((l) => l.length)) + '자');
check('말풍선은 같은 상태에서 늘 같음', say(S(30)) === say(S(30)));

/* ═════════ ⑤ 단기 미션 — 출발선은 그 나이대에 들어설 때의 값 ═════════ */
Avatar.BANDS.forEach((b) => {
  const m = Avatar.mission(S(b.from + 1));
  check(`${b.id} 미션 정의`, !!m.label && !!m.goal && !!m.key && m.target > 0, `${m.label} · ${m.goal}`);
  check(`${b.id} 미션 보너스 있음`, Object.keys(m.bonus).length > 0, m.bonusLabel);
  check(`${b.id} 진행률 0~100`, m.pct >= 0 && m.pct <= 100, m.pct + '%');
  // 출발선 기록이 없으면 지금 값이 곧 출발선 — 어느 나이대든 35%에서 시작한다
  check(`${b.id} 시작 진행률 30~40%`, m.pct >= 30 && m.pct <= 40, m.pct + '%');
  check(`${b.id} 목표는 출발선보다 위`, m.target > m.anchor, `${m.anchor} → ${m.target}`);
});

// 유아 미션 — 신생아는 '체력'이 아니라 '호감도'로 자란다 (출발선 호감도 46 → 목표 65)
const babyStart = Life.newGame({ name: '아기', gender: '남', startAge: 1 });
check('1세 시작 체력은 신생아 수준(35~42)', babyStart.stats.hp >= 35 && babyStart.stats.hp <= 42,
  `체력 ${babyStart.stats.hp}`);
check('1세 시작 호감도 45~50', babyStart.stats.social >= 45 && babyStart.stats.social <= 50,
  `호감도 ${babyStart.stats.social}`);
check('신생아 체력은 긴급 회복 조건(30 이하)에 걸리지 않음', Life.rewardState(babyStart).canHeal === false,
  `체력 ${babyStart.stats.hp}`);
const bm = Avatar.mission(babyStart);
check('유아 미션 목표는 호감도 65', bm.key === 'social' && bm.target === 65 && /호감도 65/.test(bm.goal), bm.goal);
check('유아 미션은 체력으로 재지 않음', bm.key !== 'hp', bm.key);
check('시작하자마자 98%가 아니라 30~40%대', bm.pct >= 30 && bm.pct <= 40, bm.pct + '%');
check('유아 미션 출발선 = 시작 호감도 (base 36)', bm.anchor === babyStart.stats.social && bm.base === 36,
  `출발선 ${bm.anchor} · base ${bm.base}`);
check('출발선은 상태에 적힌다', babyStart.missionBase && babyStart.missionBase.baby === 46,
  JSON.stringify(babyStart.missionBase));

// 진행률은 출발선(호감도 46 → base 36)에서 목표(65)까지 — 호감도 50.5 이면 50%
const baby = S(3, { social: 50.5, hp: 38, mental: 60 }, { missionBase: { baby: 46 } });
check('호감도 50.5 → 50%', Avatar.mission(baby).pct === 50, Avatar.mission(baby).pct + '%');
check('미달이면 달성 아님', Avatar.checkMission(baby) === null);
check('미달이면 기록도 없음', !baby.missions || Object.keys(baby.missions).length === 0);

baby.stats.social = 65;
const got = Avatar.checkMission(baby);
check('호감도 65 이면 미션 달성', !!got, got ? got.label : '없음');
check('달성 보너스 = 호감도+3·매력+2', got && got.deltas.social === 3 && got.deltas.charm === 2,
  got ? JSON.stringify(got.deltas) : '-');
check('보너스가 실제 능력치에 반영', baby.stats.social === 68 && baby.stats.charm === 57,
  `호감도 ${baby.stats.social} · 매력 ${baby.stats.charm}`);
check('달성 기록이 저장본에 남음', !!baby.missions.m_baby, JSON.stringify(baby.missions));
check('같은 미션은 두 번 주지 않음', Avatar.checkMission(baby) === null);
check('카드에는 달성으로 표시', Avatar.mission(baby).done === true && Avatar.mission(baby).pct === 100);
check('체력이 낮아도 미션은 달성된다', baby.stats.hp === 38);

// 출발선은 흔들리지 않는다 — 능력치가 움직여도 출발선은 처음 값 그대로
const drift = S(3, { social: 60 }, { missionBase: { baby: 46 } });
const p60 = Avatar.mission(drift).pct;
drift.stats.social = 55;
check('출발선은 능력치를 따라가지 않음', Avatar.mission(drift).anchor === 46 && Avatar.mission(drift).pct < p60,
  `출발선 ${Avatar.mission(drift).anchor} · ${p60}% → ${Avatar.mission(drift).pct}%`);
Avatar.ensureBase(drift);
check('ensureBase 는 이미 적힌 출발선을 덮지 않음', drift.missionBase.baby === 46, String(drift.missionBase.baby));

// 이미 그 나이대 목표선(천장)을 넘어선 능력치는 더 올릴 곳이 없으니 달성으로 본다
const top = S(16, { intel: 95 }, { missionBase: { teen: 94 } });
check('천장을 이미 넘은 능력치는 목표=천장 · 달성', Avatar.mission(top).target === 90 && Avatar.mission(top).pct === 100,
  `${Avatar.mission(top).target} · ${Avatar.mission(top).pct}%`);

// 능력치 상한 100 을 넘지 않는다 — 천장 근처에서 목표를 잡아도 보너스는 100에서 멈춤
const nearTop = S(16, { intel: 99 }, { missionBase: { teen: 88 } });
const got3 = Avatar.checkMission(nearTop);
check('역량 보너스는 100에서 멈춤', !!got3 && nearTop.stats.intel === 100, String(nearTop.stats.intel));
check('천장에 닿는 목표는 천장까지만', Avatar.mission(S(16, { intel: 86 }, { missionBase: { teen: 86 } })).target <= 90,
  String(Avatar.mission(S(16, { intel: 86 }, { missionBase: { teen: 86 } })).target));

/* 재산 미션 경로 — 지금 일곱 나이대는 모두 능력치를 목표로 쓰지만,
   미션 정의가 재산(asset)을 가리키면 빚일 때 목표가 '빚 청산'으로 바뀌고
   0원을 넘으면 일반 목표(출발선 + 성장폭)로 돌아온다. */
const adultBand = Avatar.BANDS.find((b) => b.id === 'adult');
const savedMission = adultBand.mission;
adultBand.mission = { id: 'm_asset_probe', label: '자산 미션', key: 'asset', gain: 1500, verb: '돌파', bonus: { asset: 150 } };
const debt = S(30, { asset: -1200 }, { missionBase: { adult: -1200 } });
check('빚이면 목표가 빚 청산', Avatar.mission(debt).goal === '빚 청산', Avatar.mission(debt).goal);
check('빚 상태의 진행률은 0%', Avatar.mission(debt).pct === 0, Avatar.mission(debt).pct + '%');
check('빚 상태는 금액을 보여 준다', Avatar.mission(debt).inDebt === true && Avatar.mission(debt).curText.includes('-'),
  Avatar.mission(debt).curText);
check('빚 상태에서는 미션 달성 아님', Avatar.checkMission(debt) === null);
const cleared = S(30, { asset: 0 }, { missionBase: { adult: -1200 } });
check('빚을 갚으면 목표가 재산 1.5천만원 돌파', Avatar.mission(cleared).goal === '재산 1.5천만원 돌파',
  Avatar.mission(cleared).goal);
check('빚을 갚으면 진행률 35%부터', Avatar.mission(cleared).pct === 35, Avatar.mission(cleared).pct + '%');
const rich = S(30, { asset: 9500 }, { missionBase: { adult: 9500 } });
check('재산 목표 = 출발선 + 1,500만', Avatar.mission(rich).target === 11000 && /1.1억/.test(Avatar.mission(rich).goal),
  Avatar.mission(rich).goal);
rich.stats.asset = 11000;
const got2 = Avatar.checkMission(rich);
check('재산 목표를 넘으면 달성', !!got2 && got2.deltas.asset === 150, got2 ? JSON.stringify(got2.deltas) : '-');
check('재산 보너스 반영', rich.stats.asset === 11150, rich.stats.asset + '만');
adultBand.mission = savedMission;

// 유아 미션은 유아기(1~7세) 안에 실제로 달성된다 — 시작 35%에서 차오른다
const kid = Life.newGame({ name: '유아', gender: '여', startAge: 1 });
const kidStartPct = Avatar.mission(kid).pct;
let babyDoneAge = null, bg = 0;
while (kid.age <= 7 && bg++ < 200 && !kid.ended) {
  Life.choose(kid, 0);
  const m = Avatar.checkMission(kid);
  if (m && m.id === 'm_baby') babyDoneAge = kid.age;
  const r = Life.advance(kid);
  if (r.graduation) Life.graduate(kid, false);
}
check('유아 미션 시작 진행률 30~40%', kidStartPct >= 30 && kidStartPct <= 40, kidStartPct + '%');
check('유아 미션이 유아기 안에 달성됨', babyDoneAge !== null, babyDoneAge ? `${babyDoneAge}세` : '미달성');

/* ═════════ ⑥ 실제 플레이에서 미션이 걸리는가 ═════════ */
const run = Life.newGame({ name: '미션', gender: '남', startAge: 1 });
let guard = 0, done = [];
while (!run.ended && guard++ < 3000) {
  const ev = Life.currentEvent(run);
  Life.choose(run, Math.floor(Math.random() * ev.choices.length));
  const m = Avatar.checkMission(run);
  if (m) done.push(`${m.label}(${run.age}세)`);
  const r = Life.advance(run);
  if (r.graduation) Life.graduate(run, false);
}
check('한 인생에서 미션이 실제로 달성됨', done.length > 0, done.join(', '));
check('같은 미션이 두 번 들어가지 않음', new Set(done.map((d) => d.split('(')[0])).size === done.length);
check('달성한 미션은 저장본에 남음', Object.keys(run.missions || {}).length === done.length,
  Object.keys(run.missions || {}).join(','));

// 저장 → 불러오기에 미션 기록이 살아남는가
Life.save(run);
const back = Life.load();
check('저장본에 미션 기록 유지', !!back && Object.keys(back.missions || {}).length === done.length);
check('불러온 뒤 같은 미션 재지급 없음', Avatar.checkMission(back) === null);

/* ═════════ ⑦ 성별 2 × 7단계 = 14가지 모습 ═════════
   유저 피드백: "처음에 성별을 고르고 단계별로 성장하는 모습의 캐릭터가 있으면"
    · 성별·나이대 조합 14가지가 서로 다른 그림인가
    · 낭독기(aria-label)에도 성별이 들어가는가
    · 성별이 저장·불러오기·전당 기록까지 따라가는가
    · 성별이 없던 옛 저장도 안전하게 그려지는가 */
const GENDERS = ['남', '여'];
const variant = {};
Avatar.BANDS.forEach((b) => GENDERS.forEach((g) => {
  variant[g + '-' + b.id] = Avatar.svg(S(b.from + 2, {}, { gender: g }));
}));
check('성별×나이대 14가지 모습이 모두 다름', new Set(Object.values(variant)).size === 14,
  new Set(Object.values(variant)).size + '종');
check('일곱 나이대 모두 남녀 그림이 다름',
  Avatar.BANDS.every((b) => variant['남-' + b.id] !== variant['여-' + b.id]),
  Avatar.BANDS.filter((b) => variant['남-' + b.id] === variant['여-' + b.id]).map((b) => b.id).join(',') || '전부 다름');
check('같은 성별·나이대는 늘 같은 그림', Avatar.svg(S(30, {}, { gender: '여' })) === Avatar.svg(S(30, {}, { gender: '여' })));
check('낭독기에 여성 표기', /aria-label="여성 [^"]+ 모습"/.test(Avatar.svg(S(30, {}, { gender: '여' }))),
  Avatar.svg(S(30, {}, { gender: '여' })).match(/aria-label="[^"]+"/)[0]);
check('낭독기에 남성 표기', /aria-label="남성 [^"]+ 모습"/.test(Avatar.svg(S(30, {}, { gender: '남' }))),
  Avatar.svg(S(30, {}, { gender: '남' })).match(/aria-label="[^"]+"/)[0]);
check('여성 그림도 숫자 오류 없음', !/NaN|undefined|Infinity/.test(Object.keys(variant).filter((k) => k.startsWith('여')).map((k) => variant[k]).join('')));
check('여성 그림 크기 7KB 이하', Object.keys(variant).filter((k) => k.startsWith('여')).every((k) => variant[k].length < 7000),
  Math.max(...Object.keys(variant).filter((k) => k.startsWith('여')).map((k) => variant[k].length)) + 'B');
// 나이대마다 옷색이 바뀐다 — 여성 팔레트가 나이대 사이에서 겹치지 않는다
const clothIds = Avatar.BANDS.map((b) => (variant['여-' + b.id].match(/id="avCloth([a-z]+)f"/) || [])[1]).filter(Boolean);
check('여성 옷 그라데이션이 나이대마다 따로', clothIds.length === 7, clothIds.join(','));

// 성별이 없던 옛 저장 — 남성 그림으로 안전하게 그린다(던지지 않음)
const legacySave = S(30);
delete legacySave.gender;
let legacySvg = '';
try { legacySvg = Avatar.svg(legacySave); } catch (e) { legacySvg = 'ERR ' + e.message; }
check('성별 없는 옛 저장도 그려짐', /^<svg/.test(legacySvg) && !/NaN|undefined/.test(legacySvg));

// 저장 → 불러오기에서 성별이 유지되는가
const girl = Life.newGame({ name: '성별', gender: '여', startAge: 8 });
check('새 인생 성별 = 여', girl.gender === '여', girl.gender);
Life.save(girl);
const girlBack = Life.load();
check('저장본에서 성별 유지', !!girlBack && girlBack.gender === '여', girlBack && girlBack.gender);
const auto = Life.newGame({ name: '랜덤' });
check('성별을 안 고르면 남/여 중 하나', auto.gender === '남' || auto.gender === '여', auto.gender);
check('랜덤 선택도 남/여로 정해짐', Life.newGame({ name: '랜덤2', gender: '랜덤' }).gender !== '랜덤');

// 명예의 전당 기록에도 성별이 남는다
const hallRun = Life.newGame({ name: '전당여성', gender: '여', startAge: 1 });
let hg = 0;
while (hallRun.age < 8 && !hallRun.ended && hg++ < 400) {
  Life.choose(hallRun, 0);
  Life.advance(hallRun);
}
Life.graduate(hallRun, true);
const mine = Life.hallMine()[0];
check('전당 기록에 성별이 남음', !!mine && mine.gender === '여', mine ? mine.gender + ' · ' + mine.name : '기록 없음');

/* ═════════ 출력 ═════════ */
console.log(results.join('\n'));
const fails = results.filter((r) => r.startsWith('FAIL')).length;
console.log('\n아바타·미션 검사:', results.length, '항목 · 실패', fails, '건');
if (fails) process.exitCode = 1;
