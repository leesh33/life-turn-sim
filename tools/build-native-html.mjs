#!/usr/bin/env node
/**
 * build-native-html.mjs — iOS 앱(Expo WebView 래퍼)에 넣을 **한 파일짜리 index.html** 을 만든다.
 *
 *   node tools/build-native-html.mjs ../life-turn-app/src/generated/html.js
 *
 * 왜 한 파일인가
 *   · 앱은 이 HTML 을 `loadHTMLString:baseURL:` 로 띄운다. baseURL 을 라이브 주소로 주면
 *     페이지의 오리진이 https 가 되어 localStorage(진행 저장·로그인 세션)가 정상 동작한다.
 *     (file:// 로 띄우면 WKWebView 가 저장소를 막는 경우가 있다)
 *   · 그래서 CSS·JS·글꼴(woff2)을 전부 안에 넣어 **오프라인에서도 그대로 실행**되게 한다.
 *   · 네트워크는 클라우드 동기화(Supabase)와 로그인에만 쓰인다. 없으면 로컬로 논다.
 *
 * 빌드 산출물은 `export default "<html...>"` 인 JS 모듈이다(Metro 가 그대로 번들에 넣는다).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WWW = path.join(ROOT, 'www');
const out = process.argv[2] || path.join(ROOT, '..', 'life-turn-app', 'src', 'generated', 'html.js');

if (!fs.existsSync(path.join(WWW, 'index.html'))) {
  console.error('www/index.html 이 없습니다 — 먼저 ./tools/pack-www.sh 를 실행하세요');
  process.exit(1);
}

const read = (p) => fs.readFileSync(path.join(WWW, p), 'utf8');
const dataUri = (p) => 'data:font/woff2;base64,' + fs.readFileSync(path.join(WWW, p)).toString('base64');

// ① CSS — 글꼴은 woff2 만 data URI 로 넣는다(woff 예비 소스는 버린다)
//   원본은 굵기 7개(300·400·500 → Medium / 600·700·800·900 → Bold)를 @font-face 로 하나씩 찍어 두었다.
//   같은 파일을 7번 넣으면 HTML 이 6MB 를 넘어가므로, **normal(Medium)·bold(Bold) 두 벌**로 줄인다.
//   CSS 글꼴 매칭은 가장 가까운 굵기를 고르므로 화면은 원본과 같다(300·400·500→Medium, 600~900→Bold).
let css = read('assets/styles.css');
css = css.replace(/@font-face\s*\{[^}]*\}/g, '');
const fontFace = (file, weight) =>
  `@font-face { font-family: "Gmarket Sans"; font-style: normal; font-weight: ${weight}; ` +
  `font-display: swap; src: url("${dataUri('assets/fonts/' + file)}") format("woff2"); }`;
css = fontFace('GmarketSans-Medium.woff2', 'normal') + '\n' +
  fontFace('GmarketSans-Bold.woff2', 'bold') + '\n' + css;
// 남은 url(...) 참조(있다면)도 data URI 로
css = css.replace(/url\("fonts\/([^"]+)"\)/g, (_, file) => `url("${dataUri('assets/fonts/' + file)}")`);

// ② 스크립트 — <script src="assets/..."> 를 순서 그대로 인라인으로
const used = [];
let html = read('index.html');

// 글꼴 preload 는 인라인이라 필요 없다
html = html.replace(/\s*<link rel="preload"[^>]*>/g, '');
// 아이콘 링크는 앱에서 의미 없음
html = html.replace(/\s*<link rel="icon"[^>]*>/g, '');
html = html.replace(/\s*<link rel="apple-touch-icon"[^>]*>/g, '');

html = html.replace(/<link rel="stylesheet" href="assets\/styles\.css" \/>/, () => `<style>\n${css}\n</style>`);

html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => {
  const file = src.replace(/^assets\//, 'assets/');
  let js = read(file);
  // HTML 안에 넣어도 파서가 스크립트를 일찍 닫지 않게 </script 를 쪼갠다
  js = js.replace(/<\/script/gi, '<\\/script');
  used.push(src);
  return `<script>/* ${src} */\n${js}\n</script>`;
});

if (used.length < 30) {
  console.error('스크립트 인라인 개수가 너무 적습니다:', used.length);
  process.exit(1);
}
if (/<script\s+src=/.test(html)) {
  console.error('인라인되지 않은 <script src> 가 남아 있습니다');
  process.exit(1);
}

// ③ JS 모듈로 저장
fs.mkdirSync(path.dirname(out), { recursive: true });
const banner = `/* 자동 생성 — life-sim-web/tools/build-native-html.mjs 가 만든다. 직접 고치지 말 것. */
/* 원본: life-sim-web/www (index.html + assets) · 스크립트 ${used.length}개 · CSS·글꼴 인라인 */
`;
fs.writeFileSync(out, banner + 'export default ' + JSON.stringify(html) + ';\n');

const kb = (n) => (n / 1024).toFixed(0) + 'KB';
console.log('생성:', out);
console.log('HTML', kb(Buffer.byteLength(html)), '· 스크립트', used.length, '개 · CSS', kb(Buffer.byteLength(css)));
