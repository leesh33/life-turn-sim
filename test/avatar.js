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

/* ═════════ ⑤ 단기 미션 ═════════ */
Avatar.BANDS.forEach((b) => {
  const m = Avatar.mission(S(b.from + 1));
  check(`${b.id} 미션 정의`, !!m.label && !!m.goal && !!m.key && m.target > 0, `${m.label} · ${m.goal}`);
  check(`${b.id} 미션 보너스 있음`, Object.keys(m.bonus).length > 0, m.bonusLabel);
  check(`${b.id} 진행률 0~100`, m.pct >= 0 && m.pct <= 100, m.pct + '%');
});

// 체력 65 미션 — 진행률과 달성
const baby = S(3, { hp: 52, mental: 60 });
check('체력 52 → 80%', Avatar.mission(baby).pct === 80, Avatar.mission(baby).pct + '%');
check('미달이면 달성 아님', Avatar.checkMission(baby) === null);
check('미달이면 기록도 없음', !baby.missions || Object.keys(baby.missions).length === 0);

baby.stats.hp = 66;
const got = Avatar.checkMission(baby);
check('체력 66 이면 미션 달성', !!got, got ? got.label : '없음');
check('달성 보너스 = 체력+2·멘탈+2', got && got.deltas.hp === 2 && got.deltas.mental === 2,
  got ? JSON.stringify(got.deltas) : '-');
check('보너스가 실제 능력치에 반영', baby.stats.hp === 68 && baby.stats.mental === 62,
  `체력 ${baby.stats.hp} · 멘탈 ${baby.stats.mental}`);
check('달성 기록이 저장본에 남음', !!baby.missions.m_baby, JSON.stringify(baby.missions));
check('같은 미션은 두 번 주지 않음', Avatar.checkMission(baby) === null);
check('카드에는 달성으로 표시', Avatar.mission(baby).done === true && Avatar.mission(baby).pct === 100);

// 재산 미션이 빚이면 목표가 '빚 청산'으로 바뀐다
const debt = S(30, { asset: -1200 });
check('빚이면 목표가 빚 청산', Avatar.mission(debt).goal === '빚 청산', Avatar.mission(debt).goal);
check('빚 상태의 진행률은 0%', Avatar.mission(debt).pct === 0, Avatar.mission(debt).pct + '%');
check('빚 상태는 금액을 보여 준다', Avatar.mission(debt).inDebt === true && Avatar.mission(debt).curText.includes('-'),
  Avatar.mission(debt).curText);
check('빚 상태에서는 미션 달성 아님', Avatar.checkMission(debt) === null);
check('빚을 갚으면 원래 목표로 돌아옴', Avatar.mission(S(30, { asset: 300 })).goal === '재산 3,000만 돌파',
  Avatar.mission(S(30, { asset: 300 })).goal);

// 재산 미션 — 3,000만 돌파
const adult = S(30, { asset: 2400 });
check('재산 2,400만 → 80%', Avatar.mission(adult).pct === 80, Avatar.mission(adult).pct + '%');
adult.stats.asset = 3050;
const got2 = Avatar.checkMission(adult);
check('3,000만 돌파 시 달성', !!got2 && got2.deltas.asset === 150, got2 ? JSON.stringify(got2.deltas) : '-');
check('재산 보너스 반영', adult.stats.asset === 3200, adult.stats.asset + '만');

// 능력치 상한 100 을 넘지 않는다
const top = S(16, { intel: 99 });
const got3 = Avatar.checkMission(top);
check('역량 보너스는 100에서 멈춤', !!got3 && top.stats.intel === 100, String(top.stats.intel));

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

/* ═════════ 출력 ═════════ */
console.log(results.join('\n'));
const fails = results.filter((r) => r.startsWith('FAIL')).length;
console.log('\n아바타·미션 검사:', results.length, '항목 · 실패', fails, '건');
if (fails) process.exitCode = 1;
