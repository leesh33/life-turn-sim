// 졸업 결산 '다른 사람들과 비교' 기준 분포 + 명예의 전당 기본 시드 생성
//
//   node tools/refdist.js [전체 인생 표본 수] [단계별 표본 수]
//
// · 1세부터 80세까지 무작위 선택으로 960개월을 살린 표본에서
//   7·13·16·19·24세 12개월차(졸업 시점)의 스탯을 모아 백분위표를 만든다.
// · 각 단계는 '1세 시작(긴 인생)' 표본과 '그 단계 입학 나이 시작' 표본을 반반 섞는다.
//   (8세 시작으로 초등을 보낸 사람도, 1세부터 자란 사람도 같은 평균에 놓이도록)
// · 같은 표본에서 명예의 전당 기본 시드 기록(가상 인물)도 뽑아 함께 저장한다.
//
// 결과: assets/refdist.js, assets/hall-seeds.js
const fs = require('fs');
const path = require('path');
const { load } = require('./lib-load');

const base = path.join(__dirname, '..', 'assets');
const { Life } = load(base);

const FULL_RUNS = Number(process.argv[2]) || 150;
const STAGE_RUNS = Number(process.argv[3]) || 180;

const GRADS = Life.GRADUATIONS;
const STAGE_START = { kindergarten: 1, elementary: 8, middle: 14, high: 17, college: 20 };
const KEYS = GRADS.map((g) => g.key);
const FIELDS = ['hp', 'mental', 'charm', 'social', 'asset', 'score'];

const samples = {};
KEYS.forEach((k) => { samples[k] = { hp: [], mental: [], charm: [], social: [], asset: [], score: [], rec: [] }; });
const lifeEnds = [];

const pickIdx = (ev) => Math.floor(Math.random() * ev.choices.length);

function record(key, s) {
  const st = s.stats;
  const b = samples[key];
  b.hp.push(st.hp); b.mental.push(st.mental); b.charm.push(st.charm); b.social.push(st.social);
  b.asset.push(st.asset);
  const score = Life.scoreOfStats(st);
  b.score.push(score);
  b.rec.push({
    stats: { hp: st.hp, mental: st.mental, charm: st.charm, social: st.social, asset: st.asset },
    score,
    title: Life.summary(s).title
  });
}

function play(startAge, watch) {
  const s = Life.newGame({ name: '표본', gender: startAge % 2 ? '남' : '여', startAge });
  let guard = 0;
  while (!s.ended && guard++ < 1400) {
    const ev = Life.currentEvent(s);
    if (!ev) break;
    Life.choose(s, pickIdx(ev));
    const r = Life.advance(s);
    if (r.graduation && watch.indexOf(r.graduation) !== -1) {
      record(r.graduation, s);
      s.grad = null;           // '계속 살기'
    }
    if (r.ended) lifeEnds.push({ stats: s.stats, score: Life.scoreOfStats(s.stats), title: Life.summary(s).title });
  }
}

process.stderr.write('· 1세 시작 표본 ' + FULL_RUNS + '판…\n');
for (let i = 0; i < FULL_RUNS; i++) {
  play(1, KEYS);
  if ((i + 1) % 25 === 0) process.stderr.write('  ' + (i + 1) + ' / ' + FULL_RUNS + '\n');
}

process.stderr.write('· 단계 입학 나이 표본 ' + STAGE_RUNS + '판씩…\n');
KEYS.forEach((k) => {
  const startAge = STAGE_START[k];
  for (let i = 0; i < STAGE_RUNS; i++) play(startAge, [k]);
  process.stderr.write('  ' + k + ' ' + samples[k].score.length + '개\n');
});

function quantile(sorted, q) {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function table(arr) {
  const sorted = arr.slice().sort((a, b) => a - b);
  const mean = arr.reduce((x, y) => x + y, 0) / arr.length;
  const p = [];
  for (let i = 0; i <= 100; i++) p.push(Math.round(quantile(sorted, i / 100) * 100) / 100);
  return { n: arr.length, mean: Math.round(mean * 100) / 100, p };
}

const out = {};
KEYS.forEach((k) => {
  const b = samples[k];
  out[k] = { n: b.score.length, meanScore: table(b.score).mean };
  FIELDS.forEach((f) => { out[k][f] = table(b[f]); });
});

const header = '/* 자동 생성 — tools/refdist.js (1세 시작 ' + FULL_RUNS + '판 + 단계 시작 ' + STAGE_RUNS +
  '판씩)\n   졸업 결산의 능력치 비교 기준 분포(시뮬레이션 표본의 백분위표)입니다. 직접 고치지 마세요. */\n';
fs.writeFileSync(path.join(base, 'refdist.js'), header + 'window.LIFE_REFDIST = ' + JSON.stringify(out, null, 1) + ';\n');

/* ── 명예의 전당 기본 시드 ── */
const NAMES = [
  '김도윤', '이서연', '박준호', '최지우', '정하윤', '강민재', '윤서진', '임채원',
  '한지호', '오예린', '서준혁', '신유나', '권태호', '황보라', '문가온', '백서준',
  '유하린', '남지완', '심예린', '노건우', '하은채', '구본재', '진소율', '표민서'
];
let nameCursor = 0;
const nextName = () => NAMES[nameCursor++ % NAMES.length];

function gradeFromTop(top) {
  if (top <= 5) return 'S';
  if (top <= 15) return 'A';
  if (top <= 40) return 'B';
  if (top <= 70) return 'C';
  return 'D';
}

// 표본 분포에서 이 점수의 실제 상위 백분율(같은 점수끼리 등급이 갈리지 않게)
function topFor(key, field, v) {
  const p = out[key][field].p;
  if (v <= p[0]) return 100;
  if (v >= p[p.length - 1]) return 1;
  for (let i = 0; i < p.length - 1; i++) {
    if (v >= p[i] && v <= p[i + 1]) {
      const span = p[i + 1] - p[i];
      const below = i + (span > 0 ? (v - p[i]) / span : 0);
      return Math.max(1, Math.round(100 - below));
    }
  }
  return 50;
}

const seeds = [];
const DAY = 86400000;
let dayCursor = 3;
const TARGETS = [4, 11, 22, 38, 58];

KEYS.forEach((k) => {
  const b = samples[k];
  const target = out[k].score;
  TARGETS.forEach((targetTop, i) => {
    const want = quantile(target.p, 1 - targetTop / 100);
    const pool = b.rec;
    let best = pool[0], bestD = Infinity;
    for (const r of pool) {
      const d = Math.abs(r.score - want);
      if (d < bestD) { bestD = d; best = r; }
    }
    dayCursor += 1 + (i % 3);
    const top = topFor(k, 'score', best.score);
    seeds.push({
      id: 'seed-' + k + '-' + i,
      kind: 'graduation',
      key: k,
      stageLabel: GRADS.find((g) => g.key === k).short,
      age: GRADS.find((g) => g.key === k).age,
      score: Math.round(best.score * 10) / 10,
      grade: gradeFromTop(top),
      top: top,
      title: best.title,
      name: nextName(),
      stats: {
        hp: Math.round(best.stats.hp), mental: Math.round(best.stats.mental),
        charm: Math.round(best.stats.charm), social: Math.round(best.stats.social),
        asset: Math.round(best.stats.asset)
      },
      seed: true,
      ts: Date.now() - dayCursor * DAY
    });
  });
});

const lifeSorted = lifeEnds.slice().sort((a, b) => b.score - a.score);
[0, 2, 5].forEach((idx, i) => {
  const pick = lifeSorted[Math.min(idx, lifeSorted.length - 1)];
  if (!pick) return;
  dayCursor += 2;
  seeds.push({
    id: 'seed-life80-' + i,
    kind: 'life',
    key: 'life80',
    stageLabel: '80세 완주',
    age: 80,
    score: Math.round(pick.score * 10) / 10,
    grade: pick.score >= 66 ? 'A' : pick.score >= 54 ? 'B' : 'C',
    top: null,
    title: pick.title,
    name: nextName(),
    stats: {
      hp: Math.round(pick.stats.hp), mental: Math.round(pick.stats.mental),
      charm: Math.round(pick.stats.charm), social: Math.round(pick.stats.social),
      asset: Math.round(pick.stats.asset)
    },
    seed: true,
    ts: Date.now() - dayCursor * DAY
  });
});

fs.writeFileSync(path.join(base, 'hall-seeds.js'),
  '/* 자동 생성 — tools/refdist.js 가 만든 명예의 전당 기본 시드 기록(가상 인물)입니다. */\n' +
  'window.LIFE_HALL_SEEDS = ' + JSON.stringify(seeds, null, 1) + ';\n');

console.log('표본 수:', KEYS.map((k) => k + ' ' + out[k].n).join(' · '));
console.log('기준 분포 평균 점수:', KEYS.map((k) => k + ' ' + out[k].meanScore).join(' · '));
console.log('시드 기록:', seeds.length + '건');
KEYS.forEach((k) => {
  console.log('  ' + k, 'hp', out[k].hp.mean, '| mental', out[k].mental.mean, '| charm', out[k].charm.mean,
    '| social', out[k].social.mean, '| asset', out[k].asset.mean);
});
