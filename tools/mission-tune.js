// 미션 목표 조정용 — 나이대별 '미션 능력치'의 시작·끝 분포를 잰다.
//   node tools/mission-tune.js [runs]
// 목표(gain)를 '그 나이대를 지나온 사람의 절반이 닿는 폭'에 맞추기 위해 쓴다.
const path = require('path');
const { load } = require('./lib-load');
const base = path.join(__dirname, '..', 'assets');
const { Life, Avatar } = load(base);
const RUNS = Number(process.argv[2] || 24);

function pickRandom(ev) { return Math.floor(Math.random() * ev.choices.length); }

const bands = Avatar.BANDS;
const data = {};
bands.forEach((b) => { data[b.id] = { key: b.mission.key, start: [], end: [], gain: b.mission.gain, done: 0, n: 0 }; });

for (let i = 0; i < RUNS; i++) {
  const s = Life.newGame({ name: 'm', gender: i % 2 ? '여' : '남', startAge: 1 });
  let guard = 0;
  const first = {}, last = {};
  while (!s.ended && guard++ < 4000) {
    const band = Avatar.bandOf(s.age);
    const key = band.mission.key;
    if (first[band.id] === undefined) first[band.id] = s.stats[key];
    last[band.id] = s.stats[key];
    const m = Avatar.mission(s);
    if (m.done) data[band.id].done++;
    Life.choose(s, pickRandom(Life.currentEvent(s)));
    Life.advance(s);
    const m2 = Avatar.mission(s);
    if (m2.done) data[band.id].done++;
  }
  bands.forEach((b) => {
    const rec = data[b.id];
    if (first[b.id] === undefined) return;
    rec.start.push(first[b.id]);
    rec.end.push(last[b.id]);
    rec.n++;
  });
}

const med = (a) => { if (!a.length) return null; a = a.slice().sort((x, y) => x - y); return Math.round(a[Math.floor(a.length / 2)]); };
const q = (a, p) => { if (!a.length) return null; a = a.slice().sort((x, y) => x - y); return Math.round(a[Math.min(a.length - 1, Math.floor(a.length * p))]); };
console.log('나이대 · 능력치 · 시작중앙 · 끝중앙 · 끝 25/75% · 지금 gain · 폭(끝−시작) 중앙');
bands.forEach((b) => {
  const r = data[b.id];
  const gaps = r.end.map((v, i) => v - r.start[i]);
  console.log(`${b.id.padEnd(8)} ${r.key.padEnd(6)} ${String(med(r.start)).padStart(3)} → ${String(med(r.end)).padStart(3)} (${q(r.end, 0.25)}~${q(r.end, 0.75)}) · gain ${r.gain} · 실제 폭 ${med(gaps)} · n=${r.n}`);
});
