// 🎲 390×844 실사용 UX 점검(2026-11-26) 회귀 검사
//   node test/ux.js
//   L1 새 칭호 배지 팝업 — 하단 도크 위 · 2.5초 · '도감 →'만 클릭
//   L2 '한 달이 지났습니다'가 선택지를 덮지 않는다 — 새 카드는 전환 표시가 끝난 뒤
//   L3 1세는 '생후 N개월' / '돌 (12개월)' — 내부 값은 그대로
//   L4 진행 중 '요약' — 닫기 줄 · '현재 나이' · 등급/결과 카드 없음
//   L5 명예의 전당 탭 8개가 2줄로 다 보인다
//   L6 종료 화면 아바타 나이 = 마지막 나이(80)
//   L7 상태바 이름 폭 · 전당/새로 시작은 ⋯ 메뉴
//   L9 35세 타일이 전체 폭으로 늘지 않는다 · L10 끝 화면 구분자 통일 · L12 졸업 결산 겹침
const fs = require('fs');
const path = require('path');
const { load } = require('../tools/lib-load');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const results = [];
let fails = 0;
function check(name, ok, detail) {
  results.push((ok ? 'PASS' : 'FAIL') + ' · ' + name + (detail === undefined ? '' : ' — ' + detail));
  if (!ok) fails++;
}

const CSS = read('assets/styles.css');
const APP = read('assets/app.js');
const HTML = read('index.html');
const { Life } = load(path.join(ROOT, 'assets'));

/* ═════════ ① L3 — 1세 나이 표기 ═════════ */
check('ageMonthLabel 1세 1개월차 → 생후 1개월', Life.ageMonthLabel(1, 1) === '생후 1개월', Life.ageMonthLabel(1, 1));
check('ageMonthLabel 1세 4개월차 → 생후 4개월', Life.ageMonthLabel(1, 4) === '생후 4개월', Life.ageMonthLabel(1, 4));
check('ageMonthLabel 1세 12개월차 → 돌', /돌/.test(Life.ageMonthLabel(1, 12)) && /12/.test(Life.ageMonthLabel(1, 12)), Life.ageMonthLabel(1, 12));
check('ageMonthLabel 2세 3개월차 → 2세 · 3개월차', Life.ageMonthLabel(2, 3) === '2세 · 3개월차', Life.ageMonthLabel(2, 3));
check('ageMonthLabel 80세 12개월차 → 80세 · 12개월차', Life.ageMonthLabel(80, 12) === '80세 · 12개월차', Life.ageMonthLabel(80, 12));
check('ageMonthLabel 1세 표기에 "1세"가 남지 않음', ![1, 2, 4, 7, 11, 12].some((m) => /1세/.test(Life.ageMonthLabel(1, m))));
check('1세는 가운뎃점 없이 한 덩어리(생후 N개월)', Life.ageMonthLabel(1, 5).indexOf('·') === -1, Life.ageMonthLabel(1, 5));
const part1 = Life.ageMonthParts(1, 4);
check('ageMonthParts 1세 — 점(dot) 없음', part1.dot === false && part1.age === '' && part1.day === '생후 4개월', JSON.stringify(part1));
const part2 = Life.ageMonthParts(2, 4);
check('ageMonthParts 2세 — 점(dot) 있음', part2.dot === true && part2.age === '2세' && part2.day === '4개월차', JSON.stringify(part2));
check('내부 값은 그대로 — newGame 1세 1개월차', (() => {
  const s = Life.newGame({ name: 'x', gender: '남', startAge: 1 });
  return s.age === 1 && s.month === 1;
})());

/* ═════════ ② L10 — 끝 화면 구분자 통일 ═════════ */
const sample = Life.newGame({ name: 'x', gender: '남', startAge: 25 });
const one = Life.summary(sample).oneLiner;
check('요약 문장 — 능력치 사이 가운뎃점만', /^체력 \d+ · 멘탈 \d+ · 매력 \d+ · 호감도 \d+ · 역량 \d+ · 행운 \d+\./.test(one), one);
check('요약 문장 — 능력치에 쉼표 없음', one.indexOf(', ') === -1 || one.indexOf(', ') > one.indexOf('남은 재산은'), one);
check('요약 문장 — 남은 재산은 한 문장', /남은 재산은 .+\./.test(one), one);

/* ═════════ ③ L1 — 새 칭호 배지 팝업 ═════════ */
const badgeCss = (CSS.match(/\.badge-pop \{[\s\S]*?\n\}/) || [''])[0];
check('배지 팝업은 하단 도크 위(bottom)', /bottom:\s*calc\(118px/.test(badgeCss), badgeCss.replace(/\s+/g, ' ').slice(0, 80));
check('배지 팝업은 상단 상태바에 붙지 않음(top 없음)', !/top:\s*calc\(8px/.test(badgeCss));
check('배지 팝업 표시 시간 2.5초', /badgeTimer = setTimeout\([\s\S]{0,300}?\}, 2500\);/.test(APP));
check('배지 카드 전체 클릭 없음 — pop 에 click 리스너 없음', !/pop\.addEventListener\('click'/.test(APP));
check("'도감 →' 버튼만 클릭 대상", /pop\.querySelector\('\.bp-open'\)\.addEventListener\('click'/.test(APP) && /class="bp-open"/.test(APP));
check('bp-open 은 버튼', /<button type="button" class="bp-open"/.test(APP));

/* ═════════ ④ L2 · L12 — 전환 표시와 새 카드가 겹치지 않음 ═════════ */
check('전환 표시(0.58s)가 끝난 뒤 새 사건 카드 렌더(600ms)', /\}, 600\);\n  \}\n\n  \/\* ── 인생 일지/.test(APP));
check('졸업 결산도 600ms 뒤 렌더', /setTimeout\(renderGrad, 600\)/.test(APP));
check('전환 애니메이션 0.58s', /\.timewarp\.run \{ animation: warp 0\.58s/.test(CSS));

/* ═════════ ⑤ L4 — 진행 중 요약 ═════════ */
check('요약 화면 닫기 줄이 index.html 에 있다', /id="endClose"/.test(HTML) && /✕ 플레이로/.test(HTML));
check('요약 화면은 isFinal 이 아니면 닫기 줄을 보인다', /\$\('endHead'\)\.hidden = !!isFinal/.test(APP));
check("진행 중에는 '현재 나이'", /isFinal \? '마지막 나이' : '현재 나이'/.test(APP));
check('진행 중에는 등급 줄 대신 진행 중 표시', /sum-live/.test(APP) && /진행 중/.test(APP));
check('진행 중에는 결과 카드 없음', /\(isFinal\s*\n\s*\? '<button class="btn log share-card"/.test(APP));
check('요약 열 때 자동 넘김 정지', /\$\('summaryBtn'\)\.addEventListener\('click', function \(\) \{\s*\n\s*if \(!state\) return;\s*\n\s*autoClear\(\);/.test(APP));
check('전당에서 돌아오면 열었던 화면(요약/엔딩)으로', /renderEnding\(lastEndingFinal\)/.test(APP));
check('닫기 버튼은 플레이로 돌아간다', /\$\('endClose'\)\.addEventListener\('click', function \(\) \{\s*\n\s*showScreen\('play'\);/.test(APP));

/* ═════════ ⑥ L6 — 아바타 나이와 마지막 나이 일치 ═════════ */
check('아바타 나이는 80세로 자른다', APP.indexOf("+ finalAge + '세의 모습") !== -1 && APP.indexOf('+ state.age + ' + "'세의 모습") === -1);
const old80 = Life.newGame({ name: 'x', gender: '남', startAge: 25 });
old80.age = 81;
old80.ended = true;
check('81세 상태에서도 최종 나이 80', Life.summary(old80).finalAge === 80, String(Life.summary(old80).finalAge));

/* ═════════ ⑦ L5 — 전당 탭 8개 ═════════ */
const tabsCss = (CSS.match(/\.hall-tabs \{[\s\S]*?\n\}/) || [''])[0];
check('전당 탭은 2줄로 접힌다(flex-wrap)', /flex-wrap:\s*wrap/.test(tabsCss), tabsCss.replace(/\s+/g, ' '));
check('전당 탭 가로 스크롤 감춤 없음', !/scrollbar-width:\s*none/.test(tabsCss));
check('전당 탭은 8개(전체·5졸업·완주·조기)', (APP.match(/HALL_TABS = \[\{ key: 'all'/) || []).length === 1 && /key: 'life80'/.test(APP) && /key: 'life_health'/.test(APP));

/* ═════════ ⑧ L7 — 상태바 ═════════ */
const nameCss = (CSS.match(/\.sb-name \{[\s\S]*?\n\}/) || [''])[0];
check('이름은 50px 에서 자르지 않는다', !/max-width:\s*50px/.test(nameCss), nameCss.replace(/\s+/g, ' ').slice(0, 90));
check('이름은 남는 폭을 쓴다(flex:1 · min-width:0)', /flex:\s*1 1 auto/.test(nameCss) && /min-width:\s*0/.test(nameCss));
check('전당 · 새로 시작은 ⋯ 메뉴 안', /id="moreMenu"[\s\S]*id="hallBtnPlay"[\s\S]*id="resetBtn"/.test(HTML));
check('⋯ 메뉴는 접근성 속성을 갖는다', /id="moreBtn"[^>]*aria-haspopup="menu"[^>]*aria-expanded="false"/.test(HTML));
check('새로 시작은 메뉴에서 확인을 거친다', /\$\('resetBtn'\)\.addEventListener\('click', function \(\) \{\s*\n\s*closeMoreMenu\(\);\s*\n\s*resetGame\(\);/.test(APP));
check('1세는 점 없이 표시(no-dot)', /\.sb-age\.no-dot \.dot \{ display: none; \}/.test(CSS) && /classList\.toggle\('no-dot'/.test(APP));

/* ═════════ ⑨ L9 — 35세 타일 ═════════ */
const wideCss = (CSS.match(/\.age-card\[data-wide="1"\] \{[\s\S]*?\n\}/) || [''])[0];
check('35세 타일이 두 칸을 다 차지하지 않는다', /width:\s*calc\(50%/.test(wideCss) && /justify-self:\s*center/.test(wideCss), wideCss.replace(/\s+/g, ' '));

/* ═════════ ⑩ 화면 문구에 옛 표기가 남지 않았다 ═════════ */
const appAgeStrings = (APP.match(/\+ '세 · ' \+ [a-zA-Z.]+ \+ '개월차'/g) || []);
check('app.js 에 `N세 · N개월차` 직접 조립이 남지 않음', appAgeStrings.length === 0, appAgeStrings.join(' | '));

console.log(results.join('\n'));
console.log('\nUX 점검 회귀: ' + (results.length - fails) + ' / ' + results.length + ' 통과');
if (fails) {
  console.log('실패 ' + fails + ' 건');
  process.exitCode = 1;
}
