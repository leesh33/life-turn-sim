// 인생 2막 · 연금 개시 검사 (2026-11-24)
//   node test/second-act.js
//   · 54세 명퇴를 고르면 퇴직금이 정산되고 '인생 2막' 선택이 이어지는가
//   · 재취업·가게·프리랜서·안식 네 갈래가 각각의 수입으로 54~59세를 버티는가
//   · 국민연금이 60세에 시작되는가 (54~59세에 연금 생활로 고정되지 않는가)
//   · 정년까지 다닌 사람은 60세에 회사를 나오는가
const path = require('path');
const { load } = require('../tools/lib-load');

const base = path.join(__dirname, '..', 'assets');
const { Life, EVENTS } = load(base);

let fails = 0;
const out = [];
function check(name, ok, detail) {
  out.push((ok ? 'PASS' : 'FAIL') + ' · ' + name + (detail === undefined ? '' : ' — ' + detail));
  if (!ok) fails++;
}
function num(v) { return typeof v === 'number' ? v : Array.isArray(v) ? (v[0] + v[1]) / 2 : 0; }
let seed = 20261124;
function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
const HUMAN = (ev, s) => {
  const low = Math.min(s.stats.hp, s.stats.mental) < 30;
  const c = ev.choices.map((ch, i) => {
    const e = typeof ch.effects === 'object' && ch.effects ? ch.effects : {};
    return { i, hp: num(e.hp), mental: num(e.mental), asset: num(e.asset) };
  });
  if (low) {
    const b = c.slice().sort((x, y) => (y.hp + y.mental) - (x.hp + x.mental))[0];
    if (b && b.hp + b.mental > 0) return b.i;
  }
  const afford = c.filter((x) => x.asset >= -Math.max(600, Math.abs(s.stats.asset) * 0.4));
  const pool = afford.length ? afford : c;
  return pool[Math.floor(rnd() * pool.length)].i;
};

const byId = (id) => EVENTS.filter((e) => e.id === id)[0];

// 54세, 회사를 다니는 사람의 상태를 만든다
function at54() {
  const s = Life.newGame({ name: '명퇴', gender: '남', startAge: 35 });
  s.age = 54; s.month = 3;
  s.stats = { hp: 60, mental: 60, charm: 58, social: 58, intel: 66, luck: 50, asset: 20000 };
  s.flags = { 직업: '대기업 기획자', 결혼: true, 자녀수: 1, 집있음: true, 차있음: true };
  return s;
}
function put(s, id) {
  s.current = { eventId: id, chosen: null, event: null };
  if (s.used.indexOf(id) === -1) { s.used.push(id); s.lastSeen[id] = s.turn; }
  return byId(id);
}

/* ── 1) 54세 명퇴 제안 ── */
const offer = byId('mid54a');
check('54세 명퇴 제안 이벤트가 있다', !!offer && offer.minAge === 54);
check('명퇴 제안에 퇴직금 정산 선택지가 있다',
  !!offer && offer.choices.some((c) => c.set && c.set.명퇴 === true),
  offer ? offer.choices.map((c) => c.label).join(' / ') : '');
const twoAct = byId('sa_54a');
check('인생 2막 이벤트가 있다', !!twoAct, twoAct && twoAct.title);
check('2막 선택지가 네 갈래(재취업·가게·프리랜서·안식)',
  !!twoAct && twoAct.choices.length === 4 &&
  ['재취업', '창업', '프리랜서_2막', '안식'].every((k) => twoAct.choices.some((c) => c.set && c.set[k])),
  twoAct ? twoAct.choices.map((c) => c.label).join(' / ') : '');

/* ── 2) 수락 → 퇴직금 + 다음 달 '2막' ── */
(function accept() {
  const s = at54();
  put(s, 'mid54a');
  const before = s.stats.asset;
  Life.choose(s, 0);
  check('명퇴 수락: 퇴직금이 들어온다(1,800만원)', s.stats.asset - before >= 1800 && s.flags.명퇴 === true && s.flags.퇴직금_정산 === true,
    (s.stats.asset - before) + '만원 · 명퇴 ' + !!s.flags.명퇴);
  check('명퇴 수락: 2막 선택이 다음 달로 예약된다', s.queue.indexOf('sa_54a') !== -1, s.queue.join(',') || '없음');
  let found = false, guard = 0;
  while (!s.ended && guard++ < 8) {
    const ev = Life.currentEvent(s);
    if (ev.id === 'sa_54a') { found = true; break; }
    Life.choose(s, 0);
    Life.advance(s);
  }
  check('명퇴 뒤 몇 달 안에 2막 선택이 실제로 나온다', found, guard + '개월');
  check('54세 명퇴는 곧바로 연금 생활이 아니다', Life.ledgerOf(s).pension === false,
    '수입 ' + Life.ledgerOf(s).income + ' · ' + Life.ledgerOf(s).job);
})();

/* ── 3) 2막 네 갈래의 수입 ── */
const paths = [
  { i: 0, name: '재취업', flag: '재취업', income: true },
  { i: 1, name: '작은 가게', flag: '창업', income: true },
  { i: 2, name: '프리랜서', flag: '프리랜서_2막', income: true },
  { i: 3, name: '안식', flag: '안식', income: false }
];
paths.forEach((p) => {
  const s = at54();
  s.flags.명퇴 = true; s.flags.퇴직금_정산 = true; s.stats.asset += 1800;
  put(s, 'sa_54a');
  Life.choose(s, p.i);
  check('2막 — ' + p.name + ': 플래그가 붙는다', s.flags[p.flag] === true && !!s.flags['2막'], s.flags['2막']);
  const l55 = Life.ledgerOf(Object.assign({}, s, { age: 55 }));
  const l59 = Life.ledgerOf(Object.assign({}, s, { age: 59 }));
  const l60 = Life.ledgerOf(Object.assign({}, s, { age: 60 }));
  check('2막 — ' + p.name + ': 54~59세는 연금이 아니다', l55.pension === false && l59.pension === false,
    '55세 ' + l55.income + '/연금 ' + l55.pension + ' · 59세 ' + l59.income);
  check('2막 — ' + p.name + ': ' + (p.income ? '수입이 있다' : '수입이 없다(퇴직금으로 버팀)'),
    p.income ? l55.income > 0 : l55.income === 0,
    '연 수입 ' + l55.income + ' · 지출 ' + l55.cost + ' · 수지 ' + l55.net);
  if (!p.income) {
    check('2막 — 안식: 수지가 마이너스(모아 둔 돈으로 산다)', l55.net < 0, l55.net + '만원');
  }
  check('2막 — ' + p.name + ': 60세에 연금이 시작된다',
    l60.pension === true && (l60.job === '연금' ? l60.income === Life.LEDGER.pension : l60.income > 0),
    '60세 ' + l60.job + ' ' + l60.income);
});

/* ── 3-1) 명퇴 경로의 재취업 연봉 (2026-11-25) ──
   구조조정(restructuring)은 나갈 때 직업을 비우는데,
   54세 명퇴 제안(mid54a)은 직업을 그대로 두어 재취업 연봉이 대기업 연봉으로 계산됐다. */
(function () {
  const a = at54();
  put(a, 'mid54a');
  Life.choose(a, 0);
  check('명퇴 제안 수락: 직업이 비워진다', a.flags.직업 === null, String(a.flags.직업));
  a.flags.재취업 = true; a.age = 56;
  const la = Life.ledgerOf(a);
  const b = at54();
  b.flags = { 명퇴: true, 퇴직금_정산: true, 직업: null, 재취업: true };
  b.age = 56;
  const lb = Life.ledgerOf(b);
  check('명퇴 제안 경로도 재취업 연봉이 구조조정과 같다',
    la.income === lb.income && la.income > 0, `명퇴 ${la.income} · 구조조정 ${lb.income} (${la.job})`);
  check('명퇴 제안 경로: 대기업 연봉이 그대로 남지 않는다',
    la.income < Math.round(Life.LEDGER.income['대기업 기획자'] * 1.25 * 0.85), `${la.income} < 대기업 기준`);
  // 정년까지 남는 선택은 직업을 유지한다
  const c = at54();
  put(c, 'mid54a');
  Life.choose(c, 2);
  check('정년까지 남는 선택은 직업이 그대로다', c.flags.직업 === '대기업 기획자' && c.flags.정년_선택 === true, String(c.flags.직업));
})();

/* ── 4) 2막의 장면들 ── */
['sa_56a', 'sa_56b', 'sa_56c', 'sa_57a', 'sa_58a', 'sa_59a'].forEach((id) => {
  const ev = byId(id);
  check('2막 장면이 있다 — ' + id, !!ev, ev && ev.title + ' (' + ev.minAge + '~' + ev.maxAge + ')');
});
(function scenes() {
  const s = at54(); s.age = 56;
  s.flags = { 명퇴: true, 재취업: true, 직업: '중소기업 사원', '2막': '재취업' };
  check('재취업 2막: 새 일터 장면이 열린다', Life.passes(byId('sa_56a'), s) === true);
  const a = at54(); a.age = 58;
  a.flags = { 명퇴: true, 안식: true, '2막': '안식' };
  check('안식 2막: 쉬는 사람의 장면이 열린다', Life.passes(byId('sa_58a'), a) === true);
  check('안식이 아니면 그 장면은 열리지 않는다', Life.passes(byId('sa_58a'), Object.assign({}, a, { flags: { 명퇴: true, '2막': '재취업' } })) === false);
})();

/* ── 5) 60세 연금 개시 · 정년 ── */
const pensionEv = byId('sa_60a');
check('60세 1개월차 국민연금 개시 이벤트', !!pensionEv && pensionEv.at && pensionEv.at[0] === 60 && pensionEv.at[1] === 1);
(function pension() {
  const s = at54(); s.age = 60; s.month = 1;
  s.flags = { 명퇴: true, 재취업: true, 직업: '중소기업 사원', '2막': '재취업' };
  put(s, 'sa_60a');
  Life.choose(s, 0);
  check('연금 개시를 겪으면 연금 플래그가 붙는다', s.flags.연금 === true);
})();
const retireEv = byId('sa_60b');
check('60세 정년 이벤트가 있다', !!retireEv && retireEv.at && retireEv.at[0] === 60);
(function retire() {
  const s = at54(); s.age = 60; s.month = 2;
  s.flags = { 직업: '대기업 기획자', 정년_선택: true };
  const before = s.stats.asset;
  put(s, 'sa_60b');
  Life.choose(s, 0);
  check('정년까지 다닌 사람은 60세에 회사를 나온다', s.flags.은퇴 === true && s.stats.asset - before >= 1000,
    '퇴직금 ' + (s.stats.asset - before) + '만원 · 은퇴 ' + !!s.flags.은퇴);
  check('정년 퇴직 뒤에는 연금으로 계산된다', Life.ledgerOf(s).pension === true && Life.ledgerOf(s).income === Life.LEDGER.pension);
})();

/* ── 6) 조기 은퇴도 연금은 60세부터 ── */
(function early() {
  const s = at54(); s.age = 48;
  s.flags = { 직업: '대기업 기획자', 은퇴: true };
  const l = Life.ledgerOf(s);
  check('일찍 그만둔 인생도 48세에 연금이 아니다', l.pension === false && l.income === 0, '수입 ' + l.income + ' · ' + l.job);
})();

/* ── 7) 80년 완주에서도 2막이 실제로 이어진다 ── */
(function fullRun() {
  let sawMyung = 0, sawAct = 0, full = 0, pensionEarly = 0;
  for (let i = 0; i < 6; i++) {
    const s = Life.newGame({ name: '2막', gender: i % 2 ? '여' : '남', startAge: 1, scenario: ['kr', 'imf', 'chaebol', 'dirt'][i % 4] });
    let guard = 0;
    while (!s.ended && guard++ < 4000) {
      Life.choose(s, HUMAN(Life.currentEvent(s), s));
      const res = Life.advance(s);
      if (s.age >= 54 && s.age <= 59 && (s.flags.은퇴 || s.flags.명퇴)) {
        const l = Life.ledgerOf(s);
        if (l && l.pension) pensionEarly++;
      }
      if (res.graduation) Life.graduate(s, false);
    }
    if (s.age > 80) full++;
    if (s.flags.명퇴) sawMyung++;
    if (s.flags['2막']) sawAct++;
  }
  check('80년 완주 6회 중 명퇴가 실제로 일어난다', sawMyung >= 1, sawMyung + '/6');
  check('명퇴한 인생은 2막을 고른다', sawAct >= sawMyung && sawAct >= 1, sawAct + '/6');
  check('54~59세에 연금으로 계산된 달 0회', pensionEarly === 0, pensionEarly + '회');
  check('2막을 겪어도 80세까지 완주한다', full >= 5, full + '/6');
})();

console.log(out.join('\n'));
console.log('\n2막·연금 검사:', out.length, '항목 · 실패', fails, '건');
if (fails) process.exitCode = 1;
