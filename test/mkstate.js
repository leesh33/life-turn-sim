// 라이브 스크린샷용 저장본 생성 — 13세 초등학교 졸업 결산 직전 / 80세 완주 엔딩
//   node test/mkstate.js  →  downloads/life-states.json
const fs = require('fs');
const path = require('path');
const { load } = require('../tools/lib-load');

const { Life } = load(path.join(__dirname, '..', 'assets'));
const OUT = path.join(__dirname, '..', '..', 'downloads', 'life-states.json');

const pick = (ev) => Math.floor(Math.random() * ev.choices.length);

function playTo(startAge, targetAge, stopAtGrad) {
  const s = Life.newGame({ name: '상훈', gender: '남', startAge });
  let guard = 0;
  while (!s.ended && guard++ < 2000) {
    const ev = Life.currentEvent(s);
    Life.choose(s, pick(ev));
    const r = Life.advance(s);
    if (r.graduation) {
      const g = Life.gradInfo(s);
      if (stopAtGrad && g && g.age === targetAge) return s;   // 결산 화면 상태로 멈춤
      Life.graduate(s, false);
    }
  }
  return s;
}

// 13세 12개월차 턴을 마치고 결산이 뜬 상태
const s13 = playTo(1, 13, true);

// 80세 완주 엔딩 + 전당 기록
const s80 = playTo(60, 0, false);
const hall = JSON.parse(global.window.localStorage.getItem('lifeTurnSim.hall.v1') || 'null');

fs.writeFileSync(OUT, JSON.stringify({
  elementary: { save: s13 },
  life80: { save: s80, hall }
}, null, 1));

console.log('13세:', s13.age, s13.month, 'grad:', s13.grad && s13.grad.key, 'turns:', s13.history.length);
console.log('80세:', s80.age, 'ended:', s80.ended, 'hall record:', hall && hall.records.length);
console.log('저장:', OUT);
