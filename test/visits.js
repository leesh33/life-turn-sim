// 📊 접속자 통계 검증 — 익명 방문자 id(기기별 저장·재사용) · 앱 실행당 1회 · life-turn 구분 ·
//   관리자 화면(/admin.html) 막대 계산 · 관리자 이메일 게이트 · DB(공용 SQL) · 문서·패키징
//   네트워크는 흉내 낸다(실서버는 라이브 390×844 검증에서 확인).
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const VISITS = fs.readFileSync(path.join(ROOT, 'assets', 'visits.js'), 'utf8');
const ADMIN = fs.readFileSync(path.join(ROOT, 'assets', 'admin.js'), 'utf8');
const SQL = fs.readFileSync(path.join(ROOT, 'supabase', 'app_visits.sql'), 'utf8');
const README = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
const INDEX = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const ADMIN_HTML = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8');
const APP = fs.readFileSync(path.join(ROOT, 'assets', 'app.js'), 'utf8');
const PACK = fs.readFileSync(path.join(ROOT, 'tools', 'pack-www.sh'), 'utf8');

const results = [];
const check = (name, cond, extra) => results.push(`${cond ? 'PASS' : 'FAIL'} · ${name}${extra ? ' — ' + extra : ''}`);

function ok(res, body) {
  return {
    ok: res,
    status: res ? 200 : 400,
    text: () => Promise.resolve(body == null ? '' : JSON.stringify(body)),
    json: () => Promise.resolve(body)
  };
}

// visits.js / admin.js 를 브라우저 흉내 속에서 한 번 로드한다
function makeEnv(opts = {}) {
  const store = new Map(Object.entries(opts.storage || {}));
  const calls = [];
  const g = {
    console,
    Math,
    Date,
    setTimeout: (fn) => { if (typeof fn === 'function') fn(); return 0; },
    clearTimeout: () => {},
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); },
      removeItem: (k) => { store.delete(k); }
    },
    fetch: (url, init) => {
      calls.push({ url, init, body: init && init.body ? JSON.parse(init.body) : null });
      return opts.fetch ? opts.fetch(url, init) : Promise.reject(new Error('예상하지 못한 요청'));
    }
  };
  g.window = g;
  if (opts.document) g.document = opts.document;
  if (opts.cloud) g.CloudSync = opts.cloud;
  vm.createContext(g);
  vm.runInContext(VISITS, g, { filename: 'visits.js' });
  vm.runInContext(ADMIN, g, { filename: 'admin.js' });
  return { g, store, calls, V: g.LifeVisits, A: g.LifeAdmin };
}

(async () => {
  // ── ① visits.js — 방문자 id ──────────────────────────────
  let env = makeEnv();
  const id1 = env.V.visitorId();
  const id2 = env.V.visitorId();
  check('방문자 id: UUID 모양(8~64자 · 영문·숫자·- )', /^[A-Za-z0-9_-]{8,64}$/.test(id1), id1);
  check('방문자 id: 처음 만든 값을 localStorage 에 저장', env.store.get('lifeTurnSim.visit.id.v1') === id1);
  check('방문자 id: 다시 불러도 같은 사람', id1 === id2);

  env = makeEnv({ storage: { 'lifeTurnSim.visit.id.v1': 'x' } });
  const repaired = env.V.visitorId();
  check('방문자 id: 저장값이 규칙에 안 맞으면 새로 만든다', repaired !== 'x' && /^[A-Za-z0-9_-]{8,64}$/.test(repaired));

  // ── ② visits.js — 앱 실행당 한 번 ────────────────────────
  env = makeEnv({ fetch: () => Promise.resolve(ok(true, { ok: true, views: 1 })) });
  const r1 = await env.V.track();
  const r2 = await env.V.track();
  check('방문 기록: 첫 호출 성공', r1.ok === true, JSON.stringify(r1));
  check('방문 기록: 두 번째 호출은 보내지 않는다', r2.ok === false && r2.reason === 'already-tracked');
  check('방문 기록: 요청은 1번', env.calls.length === 1);
  check(
    '방문 기록: app_visit_track · app_id life-turn · 방문자 id',
    env.calls[0] && env.calls[0].url.endsWith('/rest/v1/rpc/app_visit_track') &&
      env.calls[0].body.p_app_id === 'life-turn' &&
      env.calls[0].body.p_visitor_id === env.store.get('lifeTurnSim.visit.id.v1'),
    JSON.stringify(env.calls[0] && env.calls[0].body)
  );
  check('방문 기록: 공개 anon 키 + Bearer (service_role 없음)',
    env.calls[0] && /^sb_publishable_/.test(env.calls[0].init.headers.apikey) &&
      env.calls[0].init.headers.Authorization.indexOf('Bearer sb_publishable_') === 0);

  env = makeEnv({ fetch: () => Promise.reject(new Error('offline')) });
  const rFail = await env.V.track();
  check('방문 기록: 네트워크 실패는 조용히 넘어간다', rFail.ok === false && rFail.reason === 'network');
  check('방문 기록: 보내는 값은 app_id·visitor_id 뿐(이메일·위치 없음)',
    env.calls[0] && Object.keys(env.calls[0].body).sort().join(',') === 'p_app_id,p_visitor_id');

  // document 가 없으면 자동으로 부르지 않는다(테스트·빌드 안전)
  env = makeEnv();
  check('방문 기록: document 없으면 자동 호출 없음', env.calls.length === 0);

  // ── ③ admin.js — 관리자 이메일 게이트 ────────────────────
  env = makeEnv();
  check('어드민: 관리자 이메일 2개', env.A._test.ADMIN_EMAILS.length === 2);
  check('어드민: 관리자 이메일 판별(대소문자·공백 무시)', env.A.isAdminEmail(' ANDY.leesh33@gmail.com ') && env.A.isAdminEmail('shhy@kakao.com'));
  check('어드민: 일반 계정·빈 값은 false', !env.A.isAdminEmail('someone@example.com') && !env.A.isAdminEmail(''));

  // buildBars — 높이 %·라벨 주기
  const daily = [];
  for (let i = 13; i >= 0; i--) daily.push({ date: `2026-11-${String(22 - i).padStart(2, '0')}`, visitors: i % 4 === 0 ? 0 : (14 - i) * 2, views: 1 });
  const bars = env.A.buildBars(daily, 14);
  check('막대: 날짜 수만큼 만든다', bars.length === 14);
  check('막대: 가장 큰 값이 100%', Math.max.apply(null, bars.map((b) => b.height)) === 100);
  check('막대: 0명은 높이 0 · 라벨 없음 없음', bars.filter((b) => b.visitors === 0).every((b) => b.height === 0));
  check('막대: 날짜 라벨은 MM.DD', bars[0].label === '11.09' && bars[13].label === '11.22', bars[0].label + ' / ' + bars[13].label);
  check('막대: 마지막 날은 항상 라벨', bars[13].showLabel === true);
  const bars30 = env.A.buildBars(new Array(30).fill(0).map((_, i) => ({ date: '2026-11-01', visitors: i, views: i })), 30);
  check('막대: 30일도 30칸', bars30.length === 30);

  // ── ④ admin.js — 통계 요청 ──────────────────────────────
  env = makeEnv({ fetch: () => Promise.resolve(ok(true, { today_visitors: 3, total_visitors: 40, daily: [] })) });
  const res = await env.A._test.fetchStats(14, 'token-abc');
  check('통계 요청: app_visit_stats', env.calls[0].url.endsWith('/rest/v1/rpc/app_visit_stats'));
  check('통계 요청: life-turn · 14일 · 본인 토큰', env.calls[0].body.p_app_id === 'life-turn' && env.calls[0].body.p_days === 14 && env.calls[0].init.headers.Authorization === 'Bearer token-abc');
  check('통계 요청: 응답 본문을 그대로 돌려준다', res.ok === true && res.body.total_visitors === 40);

  // 로그인하지 않으면 요청하지 않는다
  env = makeEnv({ cloud: { session: () => null, email: () => '', token: () => Promise.reject(new Error('no session')) } });
  const noSession = await env.A.load(14);
  check('어드민: 로그인 전에는 통계를 부르지 않는다', noSession === null && env.calls.length === 0);
  check('어드민: 로그인 안내 상태', env.A._test.state.gate === 'signedOut');

  const SESSION = { access_token: 'tok', expires_at: Date.now() + 3600e3, user: { id: 'u-1', email: 'someone@example.com' } };
  env = makeEnv({ cloud: { session: () => SESSION, email: () => 'someone@example.com', token: () => Promise.resolve('tok') } });
  const denied = await env.A.load(14);
  check('어드민: 비관리자는 요청 없이 denied', denied === null && env.calls.length === 0 && env.A._test.state.gate === 'denied');

  const ADMIN_SESSION = { access_token: 'tok', expires_at: Date.now() + 3600e3, user: { id: 'u-admin', email: 'andy.leesh33@gmail.com' } };
  env = makeEnv({
    document: { getElementById: () => null, querySelectorAll: () => [], createElement: () => ({ style: {}, appendChild() {}, setAttribute() {} }), readyState: 'complete', addEventListener() {} },
    cloud: { session: () => ADMIN_SESSION, email: () => 'andy.leesh33@gmail.com', token: () => Promise.resolve('tok') },
    fetch: () => Promise.resolve(ok(true, { today_visitors: 5, total_visitors: 88, today_views: 9, total_views: 200, days: 14, daily: [] }))
  });
  const loaded = await env.A.load(14);
  const statCalls = env.calls.filter((c) => c.url.endsWith('/rpc/app_visit_stats'));
  check('어드민: 관리자는 app_visit_stats 를 부른다', statCalls.length >= 1 && loaded && loaded.total_visitors === 88,
    statCalls.length + '회 · ' + JSON.stringify(loaded));
  check('어드민: 관리자 요청도 life-turn · 14일', statCalls.every((c) => c.body.p_app_id === 'life-turn' && c.body.p_days === 14));

  // ── ⑤ DB (공용 SQL) ────────────────────────────────────
  check('DB: app_visits + RPC 2개', SQL.indexOf('create table if not exists public.app_visits') >= 0 && SQL.indexOf('app_visit_track') >= 0 && SQL.indexOf('app_visit_stats') >= 0);
  check('DB: 앱 구분 reelpin · life-turn', /check \(app_id in \('reelpin', 'life-turn'\)\)/.test(SQL));
  check('DB: KST 날짜 · 방문자당 하루 한 줄', SQL.indexOf("now() at time zone 'Asia/Seoul'") >= 0 && /primary key \(app_id, visit_date, visitor_id\)/.test(SQL));
  check('DB: RLS + 정책 없음', SQL.indexOf('enable row level security') >= 0 && SQL.indexOf('create policy') < 0);
  check('DB: 통계는 관리자만 · anon 실행 회수', SQL.indexOf("raise exception 'forbidden'") >= 0 && /revoke all on function public\.app_visit_stats\(text, integer\) from anon/.test(SQL));
  check('DB: 빈 날짜 0 채움', SQL.indexOf('generate_series') >= 0 && SQL.indexOf('left join') >= 0);
  check('앱: life-turn 으로 기록', fs.readFileSync(path.join(ROOT, 'assets', 'visits.js'), 'utf8').indexOf("var APP_ID = 'life-turn'") >= 0);

  // 체크섬 — README 에 적힌 SHA-256 이 파일과 같다
  const hash = crypto.createHash('sha256').update(SQL).digest('hex');
  check('문서: README 의 SQL SHA-256 일치', README.indexOf(hash) >= 0, hash.slice(0, 16) + '…');
  check('문서: README 에 접속자 통계 · /admin.html 설명', README.indexOf('접속자 통계') >= 0 && README.indexOf('admin.html') >= 0);

  // ── ⑥ 화면 · 패키징 ────────────────────────────────────
  check('화면: 첫 화면이 visits.js 를 싣는다(동기화 뒤)', INDEX.indexOf('assets/visits.js') > 0 && INDEX.indexOf('assets/sync.js') < INDEX.indexOf('assets/visits.js'));
  check('화면: 명예의 전당에 관리자 링크(기본 숨김)', INDEX.indexOf('id="adminLink"') > 0 && /id="adminLink"[^>]*hidden/.test(INDEX));
  check('화면: 관리자 이메일일 때만 링크를 보여 준다', APP.indexOf('function updateAdminLink') > 0 && APP.indexOf('LifeVisits.isAdmin') > 0 && APP.indexOf('link.hidden = !ok') > 0);
  check('어드민 화면: admin.html 필수 요소', ADMIN_HTML.indexOf('id="kpiToday"') > 0 && ADMIN_HTML.indexOf('id="kpiTotal"') > 0 && ADMIN_HTML.indexOf('id="visitChart"') > 0 && ADMIN_HTML.indexOf('data-days="14"') > 0 && ADMIN_HTML.indexOf('data-days="30"') > 0);
  check('어드민 화면: Gmarket Sans · 앱 스타일 사용', ADMIN_HTML.indexOf('assets/styles.css') > 0 && ADMIN_HTML.indexOf('GmarketSans-Medium.woff2') > 0 && ADMIN_HTML.indexOf('assets/admin.css') > 0);
  check('어드민 화면: sync.js 로 로그인 세션을 쓴다', ADMIN_HTML.indexOf('assets/sync.js') > 0 && ADMIN_HTML.indexOf('assets/admin.js') > 0);
  check('어드민 화면: 검색 노출 금지(noindex)', ADMIN_HTML.indexOf('noindex') > 0);
  check('어드민 화면: 외부 차트 라이브러리 없음', ADMIN_HTML.indexOf('chart.js') < 0 && ADMIN.indexOf('victory') < 0 && ADMIN.indexOf('echarts') < 0);
  check('패키징: pack-www.sh 가 admin.html 을 넣는다', /cp ".*admin\.html" "\$OUT\/"/.test(PACK));

  console.log(results.join('\n'));
  const fails = results.filter((r) => r.startsWith('FAIL')).length;
  console.log(fails ? `\n${fails}개 실패` : `\n전체 통과 (${results.length}항목)`);
  if (fails) process.exitCode = 1;
})();
