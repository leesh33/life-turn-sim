// 특정 루트 검증: 비혼(독신) 루트, 멘탈 붕괴(번아웃) 이벤트
const fs = require('fs');
const path = require('path');
const store = {};
global.window = {
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  }
};
global.localStorage = global.window.localStorage;
const base = path.join(__dirname, '..', 'assets');
for (const f of ['engine.js', 'content.early.js', 'content.mid.js', 'content.late.js', 'content.extra.js']) {
  (0, eval)(fs.readFileSync(path.join(base, f), 'utf8'));
}
const Life = global.window.Life;

// 1) 비혼 루트
let s = Life.newGame({ name: '독신', gender: '여', startAge: 35 });
let guard = 0;
const seen = new Set();
while (!s.ended && guard++ < 3000) {
  const ev = Life.currentEvent(s);
  seen.add(ev.id);
  let idx = 0;
  ev.choices.forEach((c, i) => {
    const l = typeof c.label === 'function' ? c.label(s) : c.label;
    if (/아직 아니다|준비가 안 됐|거절|혼자|그냥 산다|참는다|기다린다/.test(l)) idx = i;
  });
  Life.choose(s, idx);
  Life.advance(s);
}
const sum = Life.summary(s);
console.log('비혼 — 결혼:%s 자녀:%s 나이:%s', !!s.flags.결혼, !!s.flags.자녀, s.age);
console.log('  solo_apartment:%s solo_hobby:%s single_life:%s',
  seen.has('solo_apartment'), seen.has('solo_hobby'), seen.has('single_life'));
console.log('  엔딩:', sum.title, '/', sum.grade, sum.gradeLabel);

// 2) 멘탈 붕괴
let t = Life.newGame({ name: '멘탈', gender: '남', startAge: 30 });
t.stats.mental = 20;
let found = false;
for (let k = 0; k < 20 && !found; k++) {
  const ev = Life.currentEvent(t);
  if (ev.id === 'any_burnout') { found = true; break; }
  // 멘탈을 소모하는 선택만
  let idx = 0;
  ev.choices.forEach((c, i) => { if (c.effects && typeof c.effects.mental === 'number' && c.effects.mental < 0) idx = i; });
  Life.choose(t, idx);
  Life.advance(t);
}
console.log('멘탈 20 상태에서 번아웃 이벤트 등장:', found);

// 3) 80세 엔딩 도달 확인 (1세 시작 1회)
let u = Life.newGame({ name: '전생', gender: '남', startAge: 1 });
guard = 0;
while (!u.ended && guard++ < 4000) {
  const ev = Life.currentEvent(u);
  Life.choose(u, Math.floor(Math.random() * ev.choices.length));
  Life.advance(u);
}
console.log('1세 시작 → 엔딩 나이:', u.age, '| 총 선택:', u.history.length);
