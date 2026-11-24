// 전체 생애(1~80세) 풀런 회귀 검사 — 시나리오·성향별로 끝까지 돌려 구간 이상을 잡는다.
//   node test/full-life.js
//   · 80세 완주(엔딩) 100% · 폴백(사건 고갈) 0회 · 나이 범위 밖 사건 0회
//   · 은퇴·명퇴 뒤에 회사 생활 사건이 새지 않는다
//   · 재산 폭증(10억↑)·파산(−3억↓) 없음 · 체력·멘탈 바닥(5 이하) 고정 없음
//   · 은퇴 후에도 사건이 끊기지 않는다(연 8개월 이상)
//   · 엔딩 등급이 한쪽으로 몰리지 않는다(S만 나오지 않음)
const path = require('path');
const { load } = require('../tools/lib-load');

const base = path.join(__dirname, '..', 'assets');
const { Life, Avatar } = load(base);

let fails = 0;
const out = [];
function check(name, ok, detail) {
  out.push((ok ? 'PASS' : 'FAIL') + ' · ' + name + (detail === undefined ? '' : ' — ' + detail));
  if (!ok) fails++;
}
function num(v) { return typeof v === 'number' ? v : Array.isArray(v) ? (v[0] + v[1]) / 2 : 0; }

let seed = 20261124;
function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }

const POLICIES = {
  random: (ev) => Math.floor(rnd() * ev.choices.length),
  human: (ev, s) => {
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
  },
  money: (ev) => {
    let best = 0, bv = -1e9;
    ev.choices.forEach((c, i) => {
      const e = typeof c.effects === 'object' && c.effects ? c.effects : {};
      const v = num(e.asset) + (num(e.hp) + num(e.mental)) * 0.5;
      if (v > bv) { bv = v; best = i; }
    });
    return best;
  }
};
const WORK = /(출근|퇴근|야근|상사|팀장|사수|사원증|회사|직장|월급|연봉|승진|부장님|과장님|대리님|인사팀|사내|회식|재택|출장|사무실|오피스|업무|거래처|결재|보고서|계약서|연차|성과급|이직|면접관|입사)/;

const grades = {};
let ended = 0, fallback = 0, ageBad = 0, workLeak = 0, explode = 0, bust = 0, floorStuck = 0, retireGap = 0;
const runs = [];
for (const policy of Object.keys(POLICIES)) {
  for (const scenario of ['kr', 'imf', 'chaebol', 'dirt']) {
    const s = Life.newGame({ name: '풀런', gender: '남', startAge: 1, scenario });
    let guard = 0, fb = 0, leak = 0, maxAsset = -Infinity, minAsset = Infinity, floorStreak = 0, maxFloor = 0;
    const yearEvents = {};
    let retired = false;
    while (!s.ended && guard++ < 4000) {
      const ev = Life.currentEvent(s);
      if (ev.__generic) fb++;
      if (ev.maxAge !== undefined && ev.maxAge < s.age) ageBad++;
      yearEvents[s.age] = (yearEvents[s.age] || 0) + 1;
      if (s.flags.은퇴 || s.flags.명퇴) {
        retired = true;
        const text = [ev.title, ev.text].concat((ev.choices || []).map((c) => c.label)).join(' ');
        if (WORK.test(text) && !/창업|사업체|가게|자영/.test(text)) leak++;
      }
      Life.choose(s, POLICIES[policy](ev, s));
      Life.advance(s);
      maxAsset = Math.max(maxAsset, s.stats.asset);
      minAsset = Math.min(minAsset, s.stats.asset);
      if (s.stats.hp <= 5 || s.stats.mental <= 5) { floorStreak++; maxFloor = Math.max(maxFloor, floorStreak); } else floorStreak = 0;
    }
    if (s.ended && s.age > 80) ended++;
    const sum = Life.summary(s);
    grades[sum.grade] = (grades[sum.grade] || 0) + 1;
    fallback += fb; workLeak += leak;
    if (maxAsset >= 100000) explode++;
    if (minAsset <= -30000) bust++;
    if (maxFloor >= 12) floorStuck++;
    // 은퇴 뒤 해마다 사건이 8개월 이상인지
    if (retired) {
      const ages = Object.keys(yearEvents).filter((a) => +a >= 60);
      if (ages.some((a) => yearEvents[a] < 8)) retireGap++;
    }
    runs.push({ policy, scenario, asset: Math.round(s.stats.asset), grade: sum.grade });
  }
}

console.log('풀런', runs.length, '회차 · 최종 재산:', runs.map((r) => r.asset).join(', '));
console.log('등급:', JSON.stringify(grades));

check('12회 모두 80세 엔딩 도달', ended === runs.length, ended + '/' + runs.length);
check('사건 고갈(폴백) 0회', fallback === 0, fallback + '회');
check('나이 범위 밖 사건 0회', ageBad === 0, ageBad + '회');
check('은퇴 후 회사 생활 사건 누출 0회', workLeak === 0, workLeak + '회');
check('재산 10억 초과 없음', explode === 0, explode + '회');
check('파산(−3억 이하) 없음', bust === 0, bust + '회');
check('체력·멘탈 5 이하 고정(12개월) 없음', floorStuck === 0, floorStuck + '회');
check('은퇴 후 사건이 끊기지 않음(연 8개월 이상)', retireGap === 0, retireGap + '회');
check('등급이 한쪽으로 몰리지 않음(S만 아님)', Object.keys(grades).length >= 2, JSON.stringify(grades));

console.log('\n' + out.join('\n'));
console.log('\n전체 생애 검사:', out.length, '항목 · 실패', fails, '건');
if (fails) process.exitCode = 1;
