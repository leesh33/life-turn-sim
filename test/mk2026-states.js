// 화면 검사용 저장본을 만든다 — `node test/mk2026-states.js <출력폴더>`
//   health.json     : 체력 3 · 부담 2 · 35세 — 위독 경고 → 건강 악화 조기 엔딩을 화면에서 본다
//   second-act.json : 54세 명예퇴직 제안 — 수락 → 퇴직금 → 인생 2막 선택
const fs = require('fs');
const path = require('path');
const { load } = require('../tools/lib-load');

const out = process.argv[2] || '/workspace/verify-shots';
const { Life } = load(path.join(__dirname, '..', 'assets'));

// ① 건강 위기 — 다음 달에 '위독' 경고, 그다음 달에 조기 엔딩
const health = Life.newGame({ name: '건강', gender: '남', startAge: 35 });
health.age = 35; health.month = 6; health.turn = 120;
health.stats = { hp: 3, mental: 48, charm: 55, social: 52, intel: 60, luck: 50, asset: 4200 };
health.flags = { 직업: '대기업 기획자', 결혼: true, 자녀수: 1 };
health.health = { burden: 2, strain: 0, months: 1, level: 'critical' };
health.current = { eventId: 'hl_danger', chosen: null, event: null };
health.used = ['hl_danger'];

// ② 인생 2막 — 54세 명예퇴직 제안
const act = Life.newGame({ name: '2막', gender: '남', startAge: 35 });
act.age = 54; act.month = 3; act.turn = 400;
act.stats = { hp: 62, mental: 60, charm: 58, social: 60, intel: 72, luck: 52, asset: 24000 };
act.flags = { 직업: '대기업 기획자', 결혼: true, 자녀수: 1, 집있음: true, 차있음: true };
act.health = { burden: 0, strain: 0, months: 0, level: 'ok' };
act.current = { eventId: 'mid54a', chosen: null, event: null };
act.used = ['mid54a'];

fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'health.json'), JSON.stringify(health));
fs.writeFileSync(path.join(out, 'second-act.json'), JSON.stringify(act));
console.log('저장본 2개:', path.join(out, 'health.json'), path.join(out, 'second-act.json'));
