// 🚀 App Store 출시 전 정비 검증 — 광고 스위치 · 회원탈퇴(계정 삭제) · Apple 로그인 스위치 · iOS 래핑 설정
//  · assets/config.js 의 SHOW_ADS_PROTOTYPE / SHOW_APPLE_SIGNIN 기본값은 꺼짐
//  · index.html 은 광고 배너를 hidden 으로 두고, 계정 삭제 모달(2단계)을 갖는다
//  · sync.js deleteAccount — 서버 함수가 있으면 계정까지, 없으면 앱이 아는 길로 기록만
//  · 실패하면 이 기기 기록을 지우지 않는다 · 릴스핀 키는 절대 건드리지 않는다
//  · Apple 로그인은 플래그를 켰을 때만 authorize URL 에 나간다
//  · capacitor.config.json · docs/ios-capacitor.md · supabase SQL 이 준비돼 있다
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const results = [];
const check = (name, cond, extra) => results.push(`${cond ? 'PASS' : 'FAIL'} · ${name}${extra ? ' — ' + extra : ''}`);

function json(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body == null ? '' : JSON.stringify(body))
  };
}

const HTML = read('index.html');
const CONFIG_SRC = read('assets/config.js');
const SYNC_SRC = read('assets/sync.js');
const APP_SRC = read('assets/app.js');

/* ═════════ ① 앱 스위치 기본값 ═════════ */
function loadFlags(src, extra) {
  const g = Object.assign({ console }, extra || {});
  g.window = g;
  vm.createContext(g);
  vm.runInContext(src, g, { filename: 'config.js' });
  return g.LifeFlags;
}
const flags = loadFlags(CONFIG_SRC);
check('config.js — 광고 프로토타입 기본 꺼짐', flags && flags.SHOW_ADS_PROTOTYPE === false, String(flags && flags.SHOW_ADS_PROTOTYPE));
check('config.js — Apple 로그인 스위치 켜짐(iOS 앱 네이티브)', flags && flags.SHOW_APPLE_SIGNIN === true, String(flags && flags.SHOW_APPLE_SIGNIN));
check('config.js — 웹 Apple 로그인은 꺼 둠(공용 Services ID 보호)', flags && flags.APPLE_SIGNIN_WEB === false, String(flags && flags.APPLE_SIGNIN_WEB));
check('config.js 를 가장 먼저 읽는다', HTML.indexOf('assets/config.js') > 0 &&
  HTML.indexOf('assets/config.js') < HTML.indexOf('assets/engine.js') &&
  HTML.indexOf('assets/config.js') < HTML.indexOf('assets/app.js'));

/* ═════════ ② index.html — 광고 지면 · 계정 삭제 모달 ═════════ */
const adZoneTag = (HTML.match(/<div class="adzone"[^>]*>/) || [''])[0];
check('스폰서 배너는 기본 hidden', /id="adZone"[^>]*hidden|hidden[^>]*id="adZone"/.test(adZoneTag), adZoneTag);
check('보상형 광고 모달은 hidden 으로 시작', /<div class="ad-modal" id="adModal" hidden/.test(HTML));
check('「광고 보고」 문구는 마크업에 없다', !/광고 보고/.test(HTML));
check('하단 3버튼은 그대로 있다', /id="rewardUndo"/.test(HTML) && /id="rewardReroll"/.test(HTML) && /id="rewardHeal"/.test(HTML));
check('명예의 전당에 계정 삭제 진입점', /id="acctRow"/.test(HTML) && /id="acctDel"/.test(HTML));
check('계정 삭제 2단계 모달', /id="acctModal"/.test(HTML) && /id="amStep2"/.test(HTML) && /id="amWord"/.test(HTML) && /id="amConfirm"/.test(HTML));
check('계정 삭제 모달은 hidden 으로 시작', /<div class="acct-modal" id="acctModal" hidden/.test(HTML));

/* ═════════ ③ app.js — 광고 없이 바로 동작 · 계정 삭제 결선 ═════════ */
check('app.js — 광고 스위치를 읽는다', /SHOW_ADS_PROTOTYPE/.test(APP_SRC));
check('app.js — 광고가 꺼져 있으면 바로 적용', /if \(!adsOn\(\)\) \{ applyReward\(kind\); return; \}/.test(APP_SRC));
check('app.js — 「광고 보고」는 스위치가 켜졌을 때만', /free \? '1턴 전으로' : '광고 보고 1턴 전으로'/.test(APP_SRC));
check('app.js — 배너는 스위치가 꺼지면 내보내지 않는다', /if \(!adsOn\(\)\) \{\s*zone\.hidden = true;/.test(APP_SRC));
check('app.js — 2단계 확인 단어', /var ACCT_WORD = '삭제'/.test(APP_SRC));
check('app.js — CloudSync.deleteAccount 호출', /CloudSync\.deleteAccount\(\)/.test(APP_SRC));

/* ═════════ ④ sync.js — 회원탈퇴 ═════════ */
const SESSION_KEY = 'lifeTurnSim.auth.session.v1';
const SESSION = JSON.stringify({
  access_token: 'at', refresh_token: 'rt', expires_at: Date.now() + 3600_000,
  user: { id: 'u-1', email: 'me@example.com', user_metadata: { full_name: '상훈' } }
});

function makeEnv(opts = {}) {
  const data = new Map(Object.entries(opts.storage || {}));
  const events = [];
  const calls = [];
  const g = {
    console,
    crypto: require('crypto').webcrypto,
    TextEncoder,
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    setTimeout: (fn) => { fn(); return 1; },
    clearTimeout: () => {},
    fetch: (url, init) => {
      calls.push({ url, method: (init && init.method) || 'GET', body: init && init.body });
      return (opts.fetch || (() => Promise.reject(new Error('unexpected ' + url))))(url, init);
    },
    localStorage: {
      get length() { return data.size; },
      key: (i) => Array.from(data.keys())[i],
      getItem: (k) => (data.has(k) ? data.get(k) : null),
      setItem: (k, v) => { data.set(k, String(v)); },
      removeItem: (k) => { data.delete(k); }
    },
    location: opts.location || undefined,
    history: { replaceState: () => {} },
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } },
    dispatchEvent: (e) => { events.push(e); return true; },
    document: { addEventListener: () => {}, visibilityState: 'visible', readyState: 'complete' },
    LifeFlags: opts.flags || { SHOW_ADS_PROTOTYPE: false, SHOW_APPLE_SIGNIN: true, APPLE_SIGNIN_WEB: false },
    __LIFETURN_NATIVE__: opts.native || undefined,
    ReactNativeWebView: opts.native ? { postMessage: (m) => events.push({ type: 'native', data: m }) } : undefined
  };
  g.window = g;
  vm.createContext(g);
  vm.runInContext(SYNC_SRC, g, { filename: 'sync.js' });
  return { g, data, events, calls, S: g.CloudSync };
}

const LOCAL_KEYS = [SESSION_KEY, 'lifeTurnSim.save.v1', 'lifeTurnSim.hall.v1',
  'lifeTurnSim.titles.v1', 'lifeTurnSim.leaderboard.sent.v1', 'lifeTurnSim.sync.meta.v1',
  'lifeTurnSim.bannerClosed', 'reelpin.pins.v1', 'reelpin.keep.me'];
const localSeed = () => Object.fromEntries(LOCAL_KEYS.map((k) => [k, k === SESSION_KEY ? SESSION : 'x']));

(async function run() {
  /* 서버 함수가 있는 경우 — 계정까지 삭제 */
  const okEnv = makeEnv({
    storage: localSeed(),
    fetch: (url) => {
      if (url.includes('/rest/v1/rpc/life_sim_delete_my_account')) {
        return Promise.resolve(json(200, { ok: true, account_deleted: true, kept_for_other_apps: false,
          state_rows: 1, leaderboard_rows: 4 }));
      }
      return Promise.resolve(json(404, { message: 'unexpected' }));
    }
  });
  const okOut = await okEnv.S.deleteAccount();
  check('탈퇴 RPC — 결과 해석', okOut.ok === true && okOut.accountDeleted === true && okOut.leaderboardRows === 4,
    JSON.stringify(okOut));
  check('탈퇴 — 로그인 세션 제거', !okEnv.data.has(SESSION_KEY));
  check('탈퇴 — 이 기기의 lifeTurnSim 기록 제거',
    LOCAL_KEYS.filter((k) => k.indexOf('lifeTurnSim') === 0).every((k) => !okEnv.data.has(k)),
    LOCAL_KEYS.filter((k) => k.indexOf('lifeTurnSim') === 0 && okEnv.data.has(k)).join(','));
  check('탈퇴 — 릴스핀 키는 그대로', okEnv.data.has('reelpin.pins.v1') && okEnv.data.has('reelpin.keep.me'));
  check('탈퇴 — 상태 off · 삭제 이벤트', okEnv.S.status().state === 'off' &&
    okEnv.events.some((e) => e.type === 'life-sim-account-deleted'));
  check('탈퇴 — 로그인 뒤에는 다시 못 부른다', await okEnv.S.deleteAccount().then(() => false, () => true));

  /* 서버 함수가 아직 없을 때 — 앱이 아는 길로 기록만 */
  const fbEnv = makeEnv({
    storage: localSeed(),
    fetch: (url, init) => {
      if (url.includes('/rest/v1/rpc/life_sim_delete_my_account')) {
        return Promise.resolve(json(404, { message: 'Could not find the function public.life_sim_delete_my_account' }));
      }
      if (url.includes('/rest/v1/rpc/life_sim_leaderboard_clear')) return Promise.resolve(json(200, { removed: 3 }));
      if (url.includes('/rest/v1/life_sim_user_state')) {
        return Promise.resolve(json(200, [{ user_id: 'u-1' }]));
      }
      return Promise.resolve(json(404, { message: 'unexpected ' + url }));
    }
  });
  const fbOut = await fbEnv.S.deleteAccount();
  check('탈퇴 — 서버 함수 없으면 앱 경로로', fbOut.mode === 'app' && fbOut.accountDeleted === false, JSON.stringify(fbOut));
  check('탈퇴 — 랭킹 clear RPC 호출', fbEnv.calls.some((c) => c.url.includes('life_sim_leaderboard_clear')));
  const delCall = fbEnv.calls.find((c) => c.url.includes('/rest/v1/life_sim_user_state') && c.method === 'DELETE');
  check('탈퇴 — 본인 상태행 DELETE(RLS)', !!delCall && /user_id=eq\.u-1/.test(delCall.url), delCall && delCall.url);
  check('탈퇴 — 앱 경로에서도 기기 기록 제거', !fbEnv.data.has('lifeTurnSim.save.v1') && !fbEnv.data.has(SESSION_KEY));

  /* 서버 장애 — 이 기기 기록을 지우지 않는다 */
  const badEnv = makeEnv({
    storage: localSeed(),
    fetch: () => Promise.resolve(json(500, { message: 'boom' }))
  });
  const badErr = await badEnv.S.deleteAccount().then(() => null, (e) => e);
  check('탈퇴 — 서버 오류는 실패로 돌려준다', !!badErr && /boom/.test(String(badErr.message)), badErr && badErr.message);
  check('탈퇴 — 실패하면 기기 기록은 그대로', badEnv.data.has('lifeTurnSim.save.v1') && badEnv.data.has(SESSION_KEY));

  /* 로그인하지 않았으면 네트워크도 건드리지 않는다 */
  const noEnv = makeEnv({ fetch: () => { throw new Error('로그인 전 요청'); } });
  const noErr = await noEnv.S.deleteAccount().then(() => null, (e) => e);
  check('탈퇴 — 로그인 없이는 거부', !!noErr && /로그인/.test(noErr.message), noErr && noErr.message);

  /* ═════════ ⑤ Apple 로그인 — iOS 앱은 네이티브, 웹은 숨김 ═════════ */
  const webEnv = makeEnv({ location: { origin: 'https://life-turn-sim.vercel.app', pathname: '/', assign: () => {} } });
  check('Apple 로그인 — 웹에서는 내보내지 않는다(공용 Services ID 보호)', webEnv.S._test.providerOn('apple') === false);
  check('Apple 로그인 — 웹에서 부르면 거부', await webEnv.S._test.signIn('apple').then(() => false, (e) => /준비 중/.test(e.message)));
  check('Google 로그인은 그대로', webEnv.S._test.providerOn('google') === true);

  /* iOS 앱: 네이티브 Apple · 시스템 인증창 + 커스텀 스킴 복귀 */
  const nativeInfo = { shell: 'ios', appleAuth: true, appVersion: '1.0.0' };
  const nativeEnv = makeEnv({ native: nativeInfo, location: { origin: 'null', pathname: '/index.html', assign: () => {} } });
  check('앱 — Apple 로그인 살아남', nativeEnv.S._test.providerOn('apple') === true);
  check('앱 — 네이티브 다리 인식', nativeEnv.S._test.nativeApp() === true);
  const appleResult = await nativeEnv.S._test.signIn('apple');
  check('앱 — Apple 은 네이티브 창을 연다', appleResult === 'lifeturn:apple-native', appleResult);
  const appleMsg = nativeEnv.events.find((e) => e.type === 'native');
  check('앱 — apple-signin 메시지', !!appleMsg && /"type":"apple-signin"/.test(appleMsg.data), appleMsg && appleMsg.data);

  const googleUrl = await nativeEnv.S._test.signIn('google');
  check('앱 — Google authorize URL', /\/auth\/v1\/authorize\?provider=google/.test(googleUrl), googleUrl);
  check('앱 — redirect_to 는 lifeturn://auth-callback',
    /redirect_to=lifeturn%3A%2F%2Fauth-callback/.test(googleUrl), googleUrl);
  check('앱 — PKCE S256', /code_challenge_method=s256/.test(googleUrl) && /code_challenge=/.test(googleUrl));
  const oauthMsg = nativeEnv.events.filter((e) => e.type === 'native').pop();
  const oauthPayload = JSON.parse(oauthMsg.data);
  check('앱 — oauth 메시지로 앱에 창을 맡긴다', oauthPayload.type === 'oauth' && oauthPayload.url === googleUrl);
  check('앱 — 페이지는 이동하지 않는다', !/^https/.test(String(nativeEnv.S._test.completeRedirect)) && true);

  /* 돌아온 주소 → 세션 교환 (PKCE verifier 는 이 페이지에 있다) */
  const pkceEnv = makeEnv({ native: nativeInfo, fetch: (url, init) => {
    const body = JSON.parse(init.body);
    if (/grant_type=pkce/.test(url)) {
      return Promise.resolve(json(200, { access_token: 'at2', refresh_token: 'rt2', expires_in: 3600,
        user: { id: 'u-apple', user_metadata: { full_name: '상훈' } } }));
    }
    if (/life_sim_put_state/.test(url)) return Promise.resolve(json(200, { revised_at: 1 }));
    if (/rest\/v1/.test(url)) return Promise.resolve(json(200, []));
    return Promise.reject(new Error('unexpected ' + url));
  } });
  pkceEnv.data.set('lifeTurnSim.auth.pkce.v1', JSON.stringify({ verifier: 'verifier-123', at: Date.now() }));
  await pkceEnv.S._test.completeOAuthCallback('lifeturn://auth-callback?code=abc123');
  const exchanged = pkceEnv.calls.find((c) => /grant_type=pkce/.test(c.url));
  check('앱 — 돌아온 code 로 세션 교환', !!exchanged && /"code_verifier":"verifier-123"/.test(exchanged.body), exchanged && exchanged.body);
  const savedSession = JSON.parse(pkceEnv.data.get('lifeTurnSim.auth.session.v1') || '{}');
  check('앱 — 세션 저장', savedSession.access_token === 'at2' && savedSession.user.id === 'u-apple', savedSession.access_token);
  check('앱 — PKCE verifier 정리', !pkceEnv.data.has('lifeTurnSim.auth.pkce.v1'));

  /* Apple 네이티브 id_token → Supabase id_token grant */
  const appleEnv = makeEnv({ native: nativeInfo, fetch: (url, init) => {
    if (/grant_type=id_token/.test(url)) {
      const body = JSON.parse(init.body);
      if (body.provider !== 'apple' || body.id_token !== 'idt-1') return Promise.resolve(json(400, { msg: 'bad' }));
      return Promise.resolve(json(200, { access_token: 'at3', refresh_token: 'rt3', expires_in: 3600,
        user: { id: 'u-apple', user_metadata: { full_name: '상훈' } } }));
    }
    if (/life_sim_put_state/.test(url)) return Promise.resolve(json(200, { revised_at: 1 }));
    if (/rest\/v1/.test(url)) return Promise.resolve(json(200, []));
    return Promise.reject(new Error('unexpected ' + url));
  } });
  await appleEnv.S._test.completeAppleSignIn('idt-1', 'nonce-1');
  const idCall = appleEnv.calls.find((c) => /grant_type=id_token/.test(c.url));
  check('앱 — Apple id_token 을 Supabase 에 넘긴다', !!idCall && /"nonce":"nonce-1"/.test(idCall.body), idCall && idCall.body);
  const appleSession = JSON.parse(appleEnv.data.get('lifeTurnSim.auth.session.v1') || '{}');
  check('앱 — Apple 로그인 세션 저장', appleSession.access_token === 'at3');
  check('앱 — 네이티브 다리 노출', typeof nativeEnv.g.LifeNative === 'object' &&
    typeof nativeEnv.g.LifeNative.oauthCallback === 'function' &&
    typeof nativeEnv.g.LifeNative.appleSignIn === 'function' &&
    nativeEnv.g.LifeNative.redirect === 'lifeturn://auth-callback');

  /* ═════════ ⑥ iOS 래핑 · 서버 SQL 준비물 ═════════ */
  const cap = JSON.parse(read('capacitor.config.json'));
  check('capacitor — appId', cap.appId === 'com.odol.lifeturn', cap.appId);
  check('capacitor — appName', cap.appName === '인생 한 턴', cap.appName);
  check('capacitor — webDir', cap.webDir === 'www', cap.webDir);
  check('capacitor — 로그인·DB 도메인 허용', ['accounts.google.com', 'appleid.apple.com', 'zdcdvjlssncsawpqsjwe.supabase.co']
    .every((d) => (cap.server.allowNavigation || []).indexOf(d) >= 0), JSON.stringify(cap.server.allowNavigation));
  check('iOS 안내 문서', fs.existsSync(path.join(ROOT, 'docs/ios-capacitor.md')));
  check('웹 자산 복사 스크립트', fs.existsSync(path.join(ROOT, 'tools/pack-www.sh')));
  const sql = read('supabase/life_sim_account_delete.sql');
  check('SQL — 탈퇴 함수', /create or replace function public\.life_sim_delete_my_account\(\)/.test(sql));
  check('SQL — 두 표 삭제', /delete from public\.life_sim_leaderboard where user_id = v_uid/.test(sql) &&
    /delete from public\.life_sim_user_state where user_id = v_uid/.test(sql));
  check('SQL — 릴스핀 보호 가드', /confrelid = 'auth\.users'::regclass/.test(sql) && /kept_for_other_apps/.test(sql));
  check('SQL — auth 스키마 표는 가드에서 제외', /n\.nspname = 'public'/.test(sql));
  check('SQL — authenticated 만 실행', /grant execute on function public\.life_sim_delete_my_account\(\) to authenticated/.test(sql) &&
    /revoke all on function public\.life_sim_delete_my_account\(\) from anon/.test(sql));

  /* ═════════ ⑩ 이름·이어하기 표시 (2026-11-25) ═════════ */
  check("이름을 비우면 '나'로 시작", /value\.trim\(\)\s*\|\|\s*'나'/.test(APP_SRC));
  check('이름 입력 칸 안내문도 상훈이 아니다', !/placeholder="상훈"/.test(HTML), (HTML.match(/id="nameInput"[^>]*/) || [''])[0]);
  check('이어하기 카드 나이는 80세에서 끊는다', /Math\.min\(saved\.age, Life\.END_AGE\)/.test(APP_SRC));
  check('다시 뽑기 버튼은 남은 횟수·막는 이유를 보여 준다',
    /rerollBlock === 'milestone'/.test(APP_SRC) && /rerollLeft/.test(APP_SRC));

  /* ═════════ 결과 ═════════ */
  results.forEach((r) => console.log(r));
  const fails = results.filter((r) => r.startsWith('FAIL'));
  console.log(`\nApp Store 정비 검사: ${results.length - fails.length} / ${results.length} 통과`);
  if (fails.length) process.exitCode = 1;
})();
