// 7세 12개월차 저장본 — 졸업 결산 전환 확인용 (390 실화면 검사 test/ux_ui.py 가 쓴다)
//   브라우저 안에서 84턴을 한 번에 돌리면 라이브 페이지가 /dev/shm 부족으로 죽어서, 저장본을 미리 만든다.
//   node test/mkgrad.js  →  downloads/life-grad7-save.json
const fs = require('fs');
const path = require('path');
const { load } = require('../tools/lib-load');

const { Life } = load(path.join(__dirname, '..', 'assets'));
const OUT = path.join(__dirname, '..', '..', 'downloads', 'life-grad7-save.json');
const pick = (ev) => Math.floor(Math.random() * ev.choices.length);

const s = Life.newGame({ name: '상훈', gender: '남', startAge: 1 });
let guard = 0;
while (!s.ended && guard++ < 2000) {
  const ev = Life.currentEvent(s);
  Life.choose(s, pick(ev));
  const r = Life.advance(s);
  if (r.graduation) Life.graduate(s, false);
  if (s.age === 7 && s.month === 12 && s.current && s.current.chosen === null) break;
}

fs.writeFileSync(OUT, JSON.stringify(s));
console.log('7세 12개월차 저장본:', OUT, '· 턴', s.history.length);
