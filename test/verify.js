// 🛡️ VibeAiClub 소유 인증 — 방법 1(첫 화면 meta) · 방법 2(정적 파일)를 함께 지킨다
//  · index.html <head> 에 <meta name="vibeaiclub-verify" content="vac-..."> 가 정확히 1개
//  · .well-known/vibeaiclub-verify.txt 본문이 코드와 완전히 같다(개행·공백 없음)
//  · tools/pack-www.sh 가 .well-known 을 www/ 로 함께 넣는다(iOS 번들도 같은 상태)
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CODE = 'vac-ZkTI-AJpfPj2fSEqTYUzmIZD';

const results = [];
const check = (name, cond, extra) => results.push(`${cond ? 'PASS' : 'FAIL'} · ${name}${extra ? ' — ' + extra : ''}`);

/* ① index.html — head 안 meta */
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const head = (HTML.match(/<head>[\s\S]*?<\/head>/) || [''])[0];
const metas = HTML.match(/<meta\s+name="vibeaiclub-verify"[^>]*>/g) || [];
check('index.html — vibeaiclub-verify meta 1개', metas.length === 1, `${metas.length}개`);
check('index.html — meta content 가 코드와 일치', new RegExp(`content="${CODE}"`).test(metas[0] || ''));
check('index.html — meta 는 <head> 안에 있다', head.includes('name="vibeaiclub-verify"'));

/* ② .well-known — 정적 파일 */
const wkPath = path.join(ROOT, '.well-known', 'vibeaiclub-verify.txt');
const exists = fs.existsSync(wkPath);
check('.well-known/vibeaiclub-verify.txt 가 있다', exists);
if (exists) {
  const raw = fs.readFileSync(wkPath);
  const body = raw.toString('utf8');
  check('정적 파일 본문이 코드와 일치', body === CODE, `${raw.length} bytes`);
  check('정적 파일에 개행이 없다', !/[\r\n]/.test(body));
}

/* ③ pack-www.sh — iOS 번들에도 같은 경로로 */
const PACK = fs.readFileSync(path.join(ROOT, 'tools', 'pack-www.sh'), 'utf8');
check('pack-www.sh 가 .well-known 을 복사한다', /\.well-known/.test(PACK));

const failed = results.filter((r) => r.startsWith('FAIL'));
console.log(results.join('\n'));
console.log(`\n소유 인증 검사: ${results.length} 항목 · 실패 ${failed.length} 건`);
if (failed.length) process.exitCode = 1;
