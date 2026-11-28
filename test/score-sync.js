// 🔧 전체 랭킹 점수식 동기화 검사 (2026-11-28)
//   node test/score-sync.js
//   · 엔진 lifeScore · 클라이언트 검증(leaderboard.js) · Supabase 함수(life_sim_leaderboard.sql)가
//     같은 식(게이지 평균 × 0.40 + 재산 몫 0~56, log10/5.3 의 제곱)을 쓰는지 본다
//   · 엔진이 낸 점수는 어떤 재산·게이지 조합에서도 클라이언트 검증과 서버 범위를 통과한다
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { load } = require('../tools/lib-load');

const ROOT = path.join(__dirname, '..');
const results = [];
let fails = 0;
function check(name, ok, detail) {
  results.push((ok ? 'PASS' : 'FAIL') + ' · ' + name + (detail === undefined ? '' : ' — ' + detail));
  if (!ok) fails++;
}

const { Life } = load(path.join(ROOT, 'assets'));

/* ── 클라이언트(leaderboard.js) 검증식 ── */
const src = fs.readFileSync(path.join(ROOT, 'assets', 'leaderboard.js'), 'utf8');
const g = {
  console, localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  fetch: () => Promise.reject(new Error('no network')), setTimeout, clearTimeout,
  CustomEvent: class {}, dispatchEvent: () => true, document: { activeElement: null }
};
g.window = g;
g.Life = Life;
vm.createContext(g);
vm.runInContext(src, g, { filename: 'leaderboard.js' });
const LB = g.Leaderboard._test;

/* ── 서버(SQL) 식 — 파일에서 상수를 읽어 같은 계산을 한다 ── */
const SQL = fs.readFileSync(path.join(ROOT, 'supabase', 'life_sim_leaderboard.sql'), 'utf8');
const sqlLog = /log\(10::double precision, \(v_assets \+ 1\)::double precision\) \/ ([0-9.]+)/.exec(SQL);
const sqlCap = /then least\((\d+), greatest\(0,([\s\S]{0,200}?)\* (\d+)\)\)/.exec(SQL);
const sqlGaugeMax = /v_score > (\d+) \+ v_asset_score/.exec(SQL);
check('SQL 이 log10/5.3 을 쓴다', !!sqlLog && Number(sqlLog[1]) === 5.3, sqlLog && sqlLog[1]);
check('SQL 재산 몫 상한 56', !!sqlCap && Number(sqlCap[1]) === 56 && Number(sqlCap[3]) === 56, sqlCap && sqlCap[1] + '/' + sqlCap[3]);
check('SQL 게이지 몫 상한 40', !!sqlGaugeMax && Number(sqlGaugeMax[1]) === 40, sqlGaugeMax && sqlGaugeMax[1]);
check('SQL 에 옛 공식(0.55·45)이 남아 있지 않다', !/0\.55 \+ v_asset_score/.test(SQL) && !/least, ?45/.test(SQL) && !/4\.6\)/.test(SQL));

function sqlAssetScore(assets) {
  if (!(assets > 0)) return 0;
  const v = Math.pow(Math.max(0, Math.log10(assets + 1) / 5.3), 2) * 56;
  return Math.min(56, Math.max(0, v));
}

/* ── 세 식이 같은가 (재산 × 게이지 격자) ── */
const assetsList = [-30000, -1000, 0, 100, 1000, 5000, 10000, 25000, 32000, 50000, 100000, 300000, 1000000];
const gauges = [0, 20, 38, 50, 62, 75, 88, 100];
let diff = 0, best = 0;
assetsList.forEach((a) => {
  gauges.forEach((v) => {
    const st = { hp: v, mental: v, charm: v, social: v, intel: v, luck: v, asset: a };
    const engine = Life.lifeScore(st);
    const client = 0.4 * v + LB.assetScoreOf(a);
    diff = Math.max(diff, Math.abs(engine - client));
  });
});
check('엔진 점수 = 클라이언트 재산 몫 + 0.40 게이지 (오차 0.01 이내)', diff < 0.011, '최대 차이 ' + diff.toFixed(4));

/* ── 엔진 점수가 클라이언트 검증을 통과하는가 ── */
const rejects = [];
assetsList.forEach((a) => {
  gauges.forEach((v) => {
    const st = { hp: v, mental: v, charm: v, social: v, intel: v, luck: v, asset: a };
    const score = Math.round(Life.lifeScore(st) * 10) / 10;
    const payload = {
      p_run_key: 'r-1', p_character_name: '상훈', p_display_name: '익명',
      p_score: score, p_net_assets: a, p_final_age: 80
    };
    const v2 = LB.validate(payload);
    if (!v2.ok) rejects.push(`${a}만/${v}점 → ${score} (${v2.reason})`);
    // 서버 범위
    const bound = sqlAssetScore(a);
    if (score < bound - 0.6 || score > 40 + bound + 0.6) rejects.push(`서버 범위 밖 ${a}만/${v} → ${score}`);
    best = Math.max(best, score);
  });
});
check('엔진 점수는 모두 검증(클라이언트+서버) 통과', rejects.length === 0, rejects.slice(0, 4).join(' | '));
check('만점도 100 이하', best <= 100, best.toFixed(1));

/* 2026-11-28 이전에 거부되던 조합 — 재산 1억 · 낮은 게이지 */
const low = 0.4 * 5 + LB.assetScoreOf(10000);
check('재산 1억·게이지 5점도 이제 통과', LB.validate({ p_run_key: 'r', p_character_name: 'x', p_display_name: 'y', p_score: Math.round(low * 10) / 10, p_net_assets: 10000, p_final_age: 80 }).ok === true,
  low.toFixed(1) + '점');

/* 옛 공식으로 저장된 전당 기록은 올릴 때 엔진 식으로 다시 매긴다 */
const old = { id: 'r-old', name: '옛 기록', age: 80, score: 64, stats: { hp: 70, mental: 70, charm: 70, social: 70, intel: 70, luck: 70, asset: 10000 } };
const pOld = LB.payloadOf(old, '익명');
check('보낼 때 능력치로 점수를 다시 매긴다', pOld.p_score === Math.round(Life.lifeScore(old.stats) * 10) / 10,
  old.score + ' → ' + pOld.p_score);

console.log(results.join('\n'));
console.log(fails ? `\n실패: ${fails} 건` : '\n점수식 동기화 검사: 전체 통과 (' + results.length + '항목)');
if (fails) process.exitCode = 1;
