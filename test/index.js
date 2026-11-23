// `node test/` 로 전체 자동 검사를 한 번에 돌린다.
//   node test/            → sim · routes · branches · stats · fun · infancy · avatar · missions · cameo · phase1 · naming · sync · leaderboard · visits · appstore · verify
//   node test/index.js    → 같은 것
const { spawnSync } = require('child_process');
const path = require('path');

const SUITE = [
  ['sim', 'test/sim.js'],
  ['routes', 'test/routes.js'],
  ['branches', 'test/branches.js'],
  ['stats', 'test/stats.js'],
  ['fun', 'test/fun.js'],
  ['infancy', 'test/infancy.js'],
  ['avatar', 'test/avatar.js'],
  ['missions', 'test/missions.js'],
  ['cameo', 'test/cameo.js'],
  ['phase1', 'test/phase1.js'],
  ['naming', 'test/naming.js'],
  ['sync', 'test/sync.js'],
  ['leaderboard', 'test/leaderboard.js'],
  ['visits', 'test/visits.js'],
  ['appstore', 'test/appstore.js'],
  ['verify', 'test/verify.js']
];

let failed = 0;
for (const [name, file] of SUITE) {
  const started = Date.now();
  const r = spawnSync(process.execPath, [path.join(__dirname, '..', file)], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  });
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  const out = (r.stdout || '') + (r.stderr || '');
  const tail = out.trim().split('\n').slice(-1)[0] || '';
  const ok = r.status === 0;
  if (!ok) {
    failed += 1;
    console.log(`FAIL · ${name} (${secs}s) — ${tail}`);
    console.log(out.split('\n').filter((l) => /FAIL|Error|실패/.test(l)).slice(0, 12).join('\n'));
  } else {
    console.log(`PASS · ${name} (${secs}s) — ${tail}`);
  }
}
console.log(failed ? `\n${failed}개 검사 실패` : '\n전체 통과');
if (failed) process.exitCode = 1;
