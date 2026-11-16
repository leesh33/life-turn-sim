const { load } = require('./lib-load');
const { EVENTS } = load(require('path').join(__dirname, '..', 'assets'));
const sum = { hp:0, mental:0, charm:0, social:0, asset:0 };
let n=0;
for (const ev of EVENTS) for (const c of ev.choices) {
  const e = c.effects; if (!e || typeof e === 'function') continue;
  for (const k of Object.keys(e)) { const v=e[k]; if (typeof v==='number') sum[k]=(sum[k]||0)+v/ (typeof ev.choices.length==='number'?ev.choices.length:1); }
  n++;
}
const cnt = EVENTS.length;
console.log('이벤트당 평균(무작위 선택 기준):', Object.keys(sum).map(k=>k+' '+(sum[k]/cnt).toFixed(2)).join('  '), '| 이벤트', cnt, '선택지', n);
// stage별 mental 평균
const byStage={};
for (const ev of EVENTS){ const key=ev.stage; byStage[key]=byStage[key]||{m:0,n:0}; for(const c of ev.choices){ const e=c.effects; if(!e||typeof e==='function')continue; byStage[key].m += (typeof e.mental==='number'? e.mental:0)/ev.choices.length; } byStage[key].n++; }
for (const k of Object.keys(byStage)) console.log(k, (byStage[k].m/byStage[k].n).toFixed(2), 'n='+byStage[k].n);
