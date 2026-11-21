// 유아기 1인칭 시점 검사 (assets/events/infant.js · legacy-early.js · chain-roots.js · zz-ability.js)
//  · 유아기(1~7세) 이벤트의 선택지가 '부모가 결정하는 일'로 되돌아가지 않는가
//  · 지문·결과가 주인공을 3인칭('아이는 …')으로 서술하지 않는가
//  · 손본 이벤트의 1인칭 문구와 능력치 밸런스가 그대로인가
//  · 유아기 말풍선이 통장·멘탈 같은 어른 말을 하지 않는가
const path = require('path');
const { load } = require('../tools/lib-load');

const base = path.join(__dirname, '..', 'assets');
const { Life, EVENTS, Avatar } = load(base);

const results = [];
const check = (name, cond, extra) => results.push(`${cond ? 'PASS' : 'FAIL'} · ${name}${extra ? ' — ' + extra : ''}`);
const byId = (id) => EVENTS.find((e) => e.id === id);

const infancy = EVENTS.filter((e) => e.stage === 'infancy');
check('유아기 이벤트 수집', infancy.length >= 200, infancy.length + '건');

/* ═════════ ① 부모·제3자 시점 선택지 ═════════
   아기·아이가 스스로 할 수 없는 일(병원 결정·구매·사과·사진 고르기)이
   선택지에 다시 들어오면 잡는다. */
const PARENT_PHRASES = [
  /(아이|아기)를 (안고|업고|재우)/,      // 부모가 아이를 안고 …
  /안고 사과/,
  /(응급실|병원)에 간다/,                 // 진료 결정은 보호자 몫
  /집에서 (버틴다|지켜본다)/,
  /수액을 맞는다/,
  /사과하고 매트를 산다/,
  /한 사이즈 (크게|맞게) 산다/,
  /베스트컷을 고른다/,
  /(스튜디오에서 예쁘게|집에서 폰으로 대충) 찍는다/,
  /^(같이 찾아본다|그냥 웃어 넘긴다)$/,   // 아이의 질문에 부모가 답하는 선택지
  /^(30ml|50ml)/,                        // 수유량을 부모가 정하는 선택지
  /^다음엔 조심하겠다고 한다$/,
  /아이니까 어쩔 수 없다고 한다/
];
const parentHits = [];
infancy.forEach((ev) => {
  (ev.choices || []).forEach((c, i) => {
    PARENT_PHRASES.forEach((re) => {
      if (re.test(c.label)) parentHits.push(`${ev.id}[${i}] ${c.label}`);
    });
  });
});
check('부모 시점 선택지 없음', parentHits.length === 0, parentHits.slice(0, 4).join(' / '));

/* ═════════ ② 주인공 3인칭 서술 ═════════ */
const thirdPerson = [];
infancy.forEach((ev) => {
  const texts = [ev.text].concat((ev.choices || []).map((c) => c.result));
  texts.forEach((t) => {
    if (typeof t === 'string' && /아이는 /.test(t)) thirdPerson.push(`${ev.id}: ${t.slice(0, 24)}`);
  });
});
check('지문·결과가 1인칭 (아이는 … 없음)', thirdPerson.length === 0, thirdPerson.slice(0, 3).join(' / '));

/* ═════════ ③ 손본 이벤트 회귀 ═════════
   label: 1인칭으로 다듬은 문구 · effects: 밸런스(수치)는 그대로 */
const FIXED = {
  hundred_days: {
    labels: ['배고픔을 참고 방긋 웃어 준다', '배고프다고 엉엉 울어 버린다'],
    effects: [{ charm: 3 }, { social: 2, mental: 1 }]
  },
  formula_30: {
    labels: ['조금씩 자주 달라고 보챈다', '한 번에 든든하게 먹고 푹 잔다'],
    effects: [{ hp: -1, mental: -2, social: 1 }, { hp: 3, mental: 2, social: 2 }]
  },
  daycare_virus: {
    labels: ['해열제 먹고 축 처져 잔다', '아파서 자지러지게 운다'],
    effects: [{ hp: -2, social: 2 }, { hp: 1, mental: 1 }]
  },
  inf1i: {
    labels: ['열이 나서 자지러지게 운다', '축 처져서 잠만 잔다'],
    effects: [{ hp: 1, mental: -2 }, { hp: -1, social: 2 }]
  },
  inf2h: {
    labels: ['편한 신발을 신고 발을 구른다', '반짝이 신발만 고집한다'],
    effects: [{ hp: 2, social: 1 }, { charm: 2, hp: -1 }]
  },
  inf2k: {
    labels: ['엄마 품에 안겨 방긋 웃어 준다', '다시 마루에서 쿵쿵 뛴다'],
    effects: [{ social: 2, mental: -1 }, { mental: 1, social: -1 }]
  },
  inf2l: {
    labels: ['웃는 사진을 가리킨다', '흔들린 사진을 놓지 않는다'],
    effects: [{ charm: 2, social: 1 }, { mental: 2, social: 1 }]
  },
  inf4d: {
    labels: ['가려워서 자꾸 긁는다', '약 먹기 싫은 걸 참고 얌전히 잔다'],
    effects: [{ hp: -1, mental: 2, charm: 1 }, { hp: 2, mental: -1 }]
  },
  inf4k: {
    labels: ['답이 나올 때까지 물고 늘어진다', '아빠가 모른다고 하니 내가 답을 지어낸다'],
    effects: [{ mental: 3, social: 1 }, { mental: 1, charm: 1 }]
  },
  inf5g: {
    labels: ['매트 위에서만 살금살금 뛴다', '마루에서 더 신나게 뛴다'],
    effects: [{ social: 1, mental: -1 }, { mental: 2, social: -2 }]
  },
  inf5i: {
    labels: ['바늘을 참고 손등을 내민다', '병원 가기 싫다고 운다'],
    effects: [{ hp: 2, mental: -1 }, { hp: -1, social: 1 }]
  },
  inf7h: {
    labels: ['큰 신발을 신고 발을 휘젓는다', '딱 맞는 신발을 골라 신고 뛴다'],
    effects: [{ hp: 1, asset: -1 }, { hp: 2, asset: -2 }]
  },
  rt_n48: {
    labels: ['귀를 만지며 보챈다', '참고 잘 놀아 본다'],
    effects: [{ hp: 1, mental: -1 }, { hp: -1, social: 1 }]
  },
  ab_why_why: {
    labels: ['답이 나올 때까지 물고 늘어진다', '엄마가 웃어 넘기면 나도 따라 웃는다'],
    effects: [{ intel: 3, social: 1, hp: -1 }, { social: 2, mental: 1 }]
  }
};
Object.keys(FIXED).forEach((id) => {
  const ev = byId(id);
  const want = FIXED[id];
  if (!ev) { check(`${id} 존재`, false, '없음'); return; }
  const labels = ev.choices.map((c) => c.label);
  check(`${id} 1인칭 선택지`, labels.join('|') === want.labels.join('|'), labels.join(' / '));
  const eff = ev.choices.map((c) => JSON.stringify(c.effects || {}));
  const wantEff = want.effects.map((e) => JSON.stringify(e));
  check(`${id} 밸런스 유지`, eff.join('|') === wantEff.join('|'), eff.join(' / '));
});

/* ═════════ ④ 백일 사진 시점·개월차 ═════════ */
const hundred = byId('hundred_days');
check('백일 사진은 1세 4개월차', !!hundred && Array.isArray(hundred.at) && hundred.at[0] === 1 && hundred.at[1] === 4,
  hundred && JSON.stringify(hundred.at));
check('백일(100일≈3.3개월) 타이밍이 3~5개월차 안', !!hundred && hundred.at[1] >= 3 && hundred.at[1] <= 5,
  hundred && '4개월차');
check('백일 사진 지문에 배고픔이 남아 있음', !!hundred && /배가 고픕니다|배고픕니다/.test(hundred.text), hundred && hundred.text);

/* ═════════ ⑤ 유아기 말풍선 ═════════ */
const S = (age, stats) => ({
  age: age, month: 4, turn: 3, gender: '남',
  stats: Object.assign({ hp: 60, mental: 60, charm: 55, social: 55, intel: 55, luck: 50, asset: 100 }, stats || {}),
  current: null, history: [], missions: {}
});
const say = (st) => Avatar.speech(st);
let adultAtBaby = [];
for (let age = 1; age <= 7; age++) {
  const cases = [
    say(S(age, { asset: -1500 })),
    say(S(age, { asset: 12000 })),
    say(S(age, { hp: 20 })),
    say(S(age, { mental: 20 }))
  ];
  cases.forEach((line) => {
    if (/통장이 얇아지고|재산이 불어나고|체력 좀 챙겨야겠다|멘탈이 흔들린다/.test(line)) adultAtBaby.push(`${age}세: ${line}`);
  });
}
check('유아기 말풍선에 어른 말 없음', adultAtBaby.length === 0, adultAtBaby.slice(0, 3).join(' / '));
check('유아기 빚 말풍선은 동전 이야기', /동전/.test(say(S(4, { asset: -1500 }))), say(S(4, { asset: -1500 })));
check('어른(30세) 말풍선은 그대로', /얇아지고/.test(say(S(30, { asset: -500 }))), say(S(30, { asset: -500 })));

/* ── 출력 ── */
console.log(results.join('\n'));
const fails = results.filter((r) => r.startsWith('FAIL')).length;
console.log('\n유아기 1인칭 시점 검사: ' + results.length + ' 항목 · 실패 ' + fails + ' 건');
if (fails) process.exitCode = 1;
