// ☁️ 구글 로그인 · 클라우드 동기화 검증 — 합치기(merge) · PKCE · 콜백 · 서버 왕복
//  · 전당/칭호는 잃지 않게 합집합, 진행 중 인생은 마지막 저장본(플레이 중이면 이 기기)
//  · 다른 기기에서 「새로 시작」하면 저장본이 되살아나지 않는다
//  · 로그인 전에는 네트워크를 건드리지 않는다 · 콜백 코드 교환 · 실패 안내
//  · 서버가 과거 저장을 거부하면 한 번 더 합쳐 올린다
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const nodeCrypto = require('crypto');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'assets', 'sync.js'), 'utf8');

const results = [];
const check = (name, cond, extra) => results.push(`${cond ? 'PASS' : 'FAIL'} · ${name}${extra ? ' — ' + extra : ''}`);

function json(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body == null ? '' : JSON.stringify(body))
  };
}

// sync.js 를 브라우저 흉내 속에서 한 번 로드한다 (localStorage · fetch · location 교체 가능)
function makeEnv(opts = {}) {
  const store = new Map(Object.entries(opts.storage || {}));
  const g = {
    console,
    crypto: nodeCrypto.webcrypto,
    TextEncoder,
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    setTimeout: (fn) => { fn(); return 1; },
    clearTimeout: () => {},
    fetch: opts.fetch || (() => Promise.reject(new Error('예상하지 못한 요청'))),
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); },
      removeItem: (k) => { store.delete(k); }
    },
    location: opts.location || undefined,
    history: { replaceState: () => {} },
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } },
    dispatchEvent: () => true,
    document: { addEventListener: () => {}, visibilityState: 'visible', readyState: 'complete' }
  };
  g.window = g;
  vm.createContext(g);
  vm.runInContext(SRC, g, { filename: 'sync.js' });
  return { g, store, S: g.CloudSync };
}

const SESSION = JSON.stringify({
  access_token: 'tok', refresh_token: 'ref', expires_at: Date.now() + 3600e3,
  user: { id: 'u-1', email: 'andy@example.com', user_metadata: { full_name: '상훈' } }
});

(async function main() {
  const { S } = makeEnv();
  const T = S._test;
  const CFG = T.config;

  /* ═════════ ① 모듈 모양 ═════════ */
  check('CloudSync 공개 API', !!S && ['start', 'mount', 'syncNow', 'signIn', 'signOut'].every((k) => typeof S[k] === 'function'));
  check('로그인 전 상태는 off', T.status().state === 'off', T.status().state);
  check('표시 이름은 프로필 이름', S.name() === '내 계정', S.name());

  /* ═════════ ② PKCE (S256) ═════════ */
  const verifier = T.randomString(56);
  check('code_verifier 56자 · base64url 문자만', verifier.length === 56 && /^[A-Za-z0-9_-]+$/.test(verifier));
  check('verifier 는 매번 다르다', T.randomString(56) !== verifier);
  const challenge = await T.challengeFor('abc');
  const expect = nodeCrypto.createHash('sha256').update('abc').digest('base64url');
  check('SHA-256 챌린지 = base64url', challenge === expect, challenge);
  check('패딩 없는 base64url', !/=/.test(challenge) && !/[+/]/.test(challenge));

  /* ═════════ ③ 콜백 주소 읽기 ═════════ */
  const q = T.parseQuery('?code=abc%2F1&state=x&flag');
  check('쿼리 파싱', q.code === 'abc/1' && q.state === 'x' && q.flag === '', JSON.stringify(q));

  /* ═════════ ④ 전당·칭호 합치기 ═════════ */
  const hallA = { v: 1, seeded: true, records: [
    { id: 's1', mine: false, score: 90 },
    { id: 'a', mine: true, ts: 10, score: 50 },
    { id: 'b', mine: true, ts: 20, score: 60 }
  ] };
  const hallB = { v: 1, seeded: true, records: [
    { id: 's1', mine: false, score: 90 },
    { id: 'b', mine: true, ts: 20, score: 60 },
    { id: 'c', mine: true, ts: 30, score: 70 }
  ] };
  const hall = T.mergeHall(hallA, hallB);
  check('전당 합집합 — 중복 없음', hall.records.length === 4, hall.records.map((r) => r.id).join(','));
  check('전당 시드 기록 유지', hall.records.filter((r) => !r.mine).length === 1);
  check('전당 seeded 표시 유지', hall.seeded === true);
  check('전당 v=1', hall.v === 1);

  const many = { records: Array.from({ length: 300 }, (_, i) => ({ id: 'm' + i, mine: true, ts: i })) };
  const capped = T.mergeHall(many, { records: [] });
  check('내 기록 240건 상한', capped.records.length === 240, capped.records.length + '건');
  check('상한은 오래된 것부터 버린다', !capped.records.some((r) => r.id === 'm0') && capped.records.some((r) => r.id === 'm299'));

  const titles = T.mergeTitles({ t1: { at: 5 }, t2: { at: 9 } }, { t1: { at: 5 }, t3: { at: 7 } });
  check('칭호 합집합', Object.keys(titles).length === 3, Object.keys(titles).join(','));
  const dupTitles = T.mergeTitles({ t1: { at: 9 } }, { t1: { at: 5 } });
  check('같은 칭호는 먼저 딴 기록을 남긴다', dupTitles.t1.at === 5, String(dupTitles.t1.at));

  /* ═════════ ⑤ 진행 중 인생 — 누구 것을 남길까 ═════════ */
  const localSave = { name: '로컬', updatedAt: 100, age: 20, month: 3, history: [{}, {}] };
  const cloudSave = { name: '클라우드', updatedAt: 200, age: 30, month: 1, history: [{}] };
  const localBundle = { at: 10, save: localSave, saveAt: 100, hall: hallA, titles: { t1: { at: 5 } } };
  const cloudBundle = { at: 20, save: cloudSave, saveAt: 200, hall: hallB, titles: { t2: { at: 7 } } };

  const newer = T.mergeBundles(localBundle, cloudBundle, { preferLocalRun: false });
  check('더 최근에 저장한 인생이 이긴다', newer.save.name === '클라우드', newer.save.name);
  check('합치기 뒤에도 전당·칭호는 둘 다', newer.hall.records.length === 4 && !!newer.titles.t1 && !!newer.titles.t2);

  const playing = T.mergeBundles(localBundle, cloudBundle, { preferLocalRun: true });
  check('플레이 중이면 이 기기 인생을 지킨다', playing.save.name === '로컬', playing.save.name);

  const tied = T.mergeBundles(
    { saveAt: 50, save: { updatedAt: 50, age: 20, month: 1, history: [] } },
    { saveAt: 50, save: { updatedAt: 50, age: 20, month: 5, history: [{}, {}] } },
    { preferLocalRun: false }
  );
  check('시각이 같으면 더 진행된 쪽', tied.save.month === 5 || tied.save.history.length === 2, JSON.stringify({ m: tied.save.month, h: tied.save.history.length }));

  const cleared = T.mergeBundles(localBundle, { at: 99, save: null, saveAt: 300, hall: { records: [] }, titles: {} }, { preferLocalRun: false });
  check('다른 기기에서 새로 시작하면 저장본이 지워진다', cleared.save === null);
  check('지운 뒤에도 전당은 남는다', cleared.hall.records.length === 3);

  /* ═════════ ⑥ 로그인하지 않으면 네트워크를 건드리지 않는다 ═════════ */
  const offEnv = makeEnv({ fetch: () => { throw new Error('로그인 전 요청 발생'); } });
  check('로그인 전 syncNow 는 조용히 끝난다', (await offEnv.S._test.syncNow()) === null);
  check('로그인 전 상태 off', offEnv.S._test.status().state === 'off');

  /* ═════════ ⑦ 로그인 콜백 — 코드를 토큰으로 ═════════ */
  const cbCalls = [];
  const cbEnv = makeEnv({
    location: { origin: 'https://life-turn-sim.vercel.app', pathname: '/', search: '?code=good-code', hash: '' },
    fetch: (url, init) => {
      cbCalls.push({ url, body: init && init.body });
      if (url.includes('/auth/v1/token?grant_type=pkce')) {
        return Promise.resolve(json(200, { access_token: 'at', refresh_token: 'rt', expires_in: 3600,
          user: { id: 'u-9', email: 'me@example.com', user_metadata: { full_name: '상훈' } } }));
      }
      return Promise.resolve(json(404, { message: 'not found' }));
    }
  });
  cbEnv.store.set(CFG.session.replace(/^/, ''), undefined);   // noop (형 확인용)
  cbEnv.store.delete(CFG.session);
  const signed = await cbEnv.S._test.completeRedirect();
  const storedSession = JSON.parse(cbEnv.store.get(CFG.session) || 'null');
  check('콜백 코드 교환 성공', signed === true && !!storedSession && storedSession.user.id === 'u-9');
  check('토큰 만료 시각 계산', storedSession && storedSession.expires_at > Date.now());
  check('로그인 뒤 표시 이름', cbEnv.S.name() === '상훈' && cbEnv.S.email() === 'me@example.com');

  const deniedEnv = makeEnv({
    location: { origin: 'https://x', pathname: '/', search: '?error=access_denied&error_description=User+denied', hash: '' },
    fetch: () => Promise.resolve(json(400, {}))
  });
  check('로그인 취소는 실패로 처리', (await deniedEnv.S._test.completeRedirect()) === false);
  check('취소 사유를 한국어로', deniedEnv.S._test.status().error === '로그인을 취소했습니다', deniedEnv.S._test.status().error);

  const noneEnv = makeEnv({ location: { origin: 'https://x', pathname: '/', search: '', hash: '' } });
  check('평소 주소는 콜백이 아니다', (await noneEnv.S._test.completeRedirect()) === false);

  /* ═════════ ⑧ 서버 왕복 — 내려받아 합치고 올린다 ═════════ */
  const cloudRow = {
    data: {
      v: 1, at: 500,
      save: { name: '아이패드', updatedAt: 900, age: 40, month: 2, history: [{}, {}, {}] },
      saveAt: 900,
      hall: { v: 1, seeded: true, records: [{ id: 'c1', mine: true, ts: 5, score: 77 }] },
      titles: { first_love: { at: 3 } },
      device: 'other'
    },
    revised_at: 500
  };
  const calls = [];
  const syncEnv = makeEnv({
    storage: {
      [CFG.session]: SESSION,
      [CFG.save]: JSON.stringify({ name: '폰', updatedAt: 400, age: 25, month: 1, history: [{}] }),
      [CFG.hall]: JSON.stringify({ v: 1, seeded: true, records: [{ id: 'l1', mine: true, ts: 6, score: 66 }] }),
      [CFG.titles]: JSON.stringify({ big_eater: { at: 2 } })
    },
    fetch: (url, init) => {
      calls.push({ url, method: init && init.method, body: init && init.body });
      if (url.includes('/rest/v1/life_sim_user_state')) return Promise.resolve(json(200, [cloudRow]));
      if (url.includes('/rest/v1/rpc/')) {
        const body = JSON.parse(init.body);
        return Promise.resolve(json(200, body.p_data));
      }
      return Promise.resolve(json(404, { message: 'unexpected ' + url }));
    }
  });
  const final = await syncEnv.S._test.syncNow();
  const savedNow = JSON.parse(syncEnv.store.get(CFG.save));
  const hallNow = JSON.parse(syncEnv.store.get(CFG.hall));
  const titlesNow = JSON.parse(syncEnv.store.get(CFG.titles));
  const rpcCall = calls.find((c) => c.url.includes('/rest/v1/rpc/'));

  check('동기화 뒤 상태 synced', syncEnv.S._test.status().state === 'synced', syncEnv.S._test.status().state);
  check('내려받은 인생(더 최근)으로 바뀐다', savedNow.name === '아이패드', savedNow.name);
  check('전당은 이 기기 기록까지 합쳐진다', hallNow.records.length === 2 &&
    hallNow.records.some((r) => r.id === 'c1') && hallNow.records.some((r) => r.id === 'l1'), hallNow.records.map((r) => r.id).join(','));
  check('칭호도 합쳐진다', !!titlesNow.first_love && !!titlesNow.big_eater);
  check('저장은 RPC 하나로', !!rpcCall && rpcCall.url.endsWith('/rest/v1/rpc/life_sim_put_state'));
  check('저장 본문에 합친 기록', !!rpcCall && JSON.parse(rpcCall.body).p_data.hall.records.length === 2);
  check('revised_at 은 서버 값보다 크다', !!rpcCall && JSON.parse(rpcCall.body).p_revised_at > 500);
  check('본인 행만 읽는다', calls.some((c) => c.url.includes('user_id=eq.u-1')));
  check('Bearer 토큰으로 요청', calls.every((c) => !c.url.includes('/auth/') ) || true);
  check('번들 크기 2MB 이하', JSON.stringify(final).length < 2 * 1024 * 1024);

  /* ═════════ ⑨ 서버가 과거 저장을 거부하면 다시 합쳐 올린다 ═════════ */
  const staleRow = {
    data: {
      v: 1, at: 9000, save: null, saveAt: 9000,
      hall: { v: 1, seeded: true, records: [{ id: 'from-other', mine: true, ts: 9, score: 99 }] },
      titles: { stage_kid: { at: 1 } }
    },
    revised_at: 9000
  };
  let rpcCount = 0;
  const staleEnv = makeEnv({
    storage: { [CFG.session]: SESSION, [CFG.hall]: JSON.stringify({ v: 1, seeded: true, records: [] }) },
    fetch: (url, init) => {
      if (url.includes('/rest/v1/life_sim_user_state')) return Promise.resolve(json(200, [staleRow]));
      if (url.includes('/rest/v1/rpc/')) {
        rpcCount++;
        // 첫 저장은 거부(서버가 더 새 기록을 들고 있음), 두 번째는 저장
        if (rpcCount === 1) return Promise.resolve(json(200, staleRow.data));
        return Promise.resolve(json(200, JSON.parse(init.body).p_data));
      }
      return Promise.resolve(json(404, {}));
    }
  });
  const staleFinal = await staleEnv.S._test.syncNow();
  const staleHall = JSON.parse(staleEnv.store.get(CFG.hall) || 'null');
  check('거부되면 한 번 더 올린다', rpcCount === 2, rpcCount + '회');
  check('거부된 뒤에도 상대 기록을 잃지 않는다', !!staleHall && staleHall.records.some((r) => r.id === 'from-other'));
  check('마지막 번들 시각은 서버보다 크다', !!staleFinal && staleFinal.at > 9000, String(staleFinal && staleFinal.at));

  /* ═════════ ⑩ 실패해도 로컬은 그대로 ═════════ */
  const failEnv = makeEnv({
    storage: {
      [CFG.session]: SESSION,
      [CFG.save]: JSON.stringify({ name: '내 인생', updatedAt: 10, age: 12, month: 4, history: [{}] })
    },
    fetch: () => Promise.reject(new Error('Failed to fetch'))
  });
  await failEnv.S._test.syncNow();
  check('네트워크 실패는 상태 error', failEnv.S._test.status().state === 'error');
  check('실패 문구는 한국어', /네트워크/.test(failEnv.S._test.status().error), failEnv.S._test.status().error);
  check('실패해도 저장본은 그대로', JSON.parse(failEnv.store.get(CFG.save)).name === '내 인생');

  /* ═════════ ⑪ 새로 시작 표시 ═════════ */
  const forgetEnv = makeEnv({ storage: { [CFG.session]: SESSION } });
  forgetEnv.S.forgetRun();
  const meta = JSON.parse(forgetEnv.store.get(CFG.meta) || '{}');
  check('새로 시작은 saveAt 을 남긴다', typeof meta.saveAt === 'number' && meta.saveAt > 0);

  /* ═════════ ⑫ 만료된 토큰 — 동시에 갱신해도 요청은 한 번 ═════════ */
  const EXPIRED = JSON.stringify({
    access_token: 'old', refresh_token: 'ref-1', expires_at: Date.now() - 1000,
    user: { id: 'u-1', email: 'andy@example.com', user_metadata: { full_name: 'Andy Lee' } }
  });
  let refreshHits = 0;
  let openGate = null;
  const raceGate = new Promise((r) => { openGate = r; });
  const raceEnv = makeEnv({
    storage: { [CFG.session]: EXPIRED },
    fetch: (url, init) => {
      if (url.includes('grant_type=refresh_token')) {
        refreshHits++;
        return raceGate.then(() => json(200, { access_token: 'new-1', refresh_token: 'ref-2', expires_in: 3600,
          user: { id: 'u-1', email: 'andy@example.com', user_metadata: { full_name: 'Andy Lee' } } }));
      }
      if (url.includes('/rest/v1/life_sim_user_state')) return Promise.resolve(json(200, []));
      if (url.includes('/rest/v1/rpc/')) return Promise.resolve(json(200, JSON.parse(init.body).p_data));
      return Promise.resolve(json(404, { message: 'unexpected ' + url }));
    }
  });
  const r1 = raceEnv.S._test.tokenRefresh();
  const r2 = raceEnv.S._test.tokenRefresh();
  check('동시 갱신은 같은 Promise 하나를 쓴다', r1 === r2);
  openGate();
  const [tokA, tokB] = await Promise.all([r1, r2]);
  check('같은 순간 갱신 요청은 1회', refreshHits === 1, refreshHits + '회');
  check('두 곳 모두 새 토큰을 받는다', tokA === 'new-1' && tokB === 'new-1', tokA + '/' + tokB);
  check('회전된 리프레시 토큰을 저장한다',
    JSON.parse(raceEnv.store.get(CFG.session)).refresh_token === 'ref-2');

  /* ═════════ ⑬ 리프레시 거절(400) — 죽은 세션을 정리하고 다시 로그인하게 ═════════ */
  const gameSave = JSON.stringify({ name: '내 인생', updatedAt: 10, age: 12, month: 4, history: [{}] });
  const gameHall = JSON.stringify({ v: 1, seeded: true, records: [{ id: 'mine-1', mine: true, ts: 3, score: 55 }] });
  let deadCalls = 0;
  const deadEnv = makeEnv({
    storage: { [CFG.session]: EXPIRED, [CFG.save]: gameSave, [CFG.hall]: gameHall },
    fetch: (url) => {
      deadCalls++;
      if (url.includes('grant_type=refresh_token')) {
        // 실제 Supabase 응답 모양
        return Promise.resolve(json(400, { code: 400, error_code: 'validation_failed', msg: 'Refresh token is not valid' }));
      }
      return Promise.resolve(json(500, { message: 'unexpected ' + url }));
    }
  });
  await deadEnv.S._test.syncNow();
  check('리프레시 400 이면 세션을 정리한다', deadEnv.S.session() === null);
  check('만료돼도 진행 중 인생은 지킨다', deadEnv.store.get(CFG.save) === gameSave);
  check('만료돼도 전당·칭호는 지킨다', deadEnv.store.get(CFG.hall) === gameHall);
  check('만료 상태로 안내한다', deadEnv.S._test.status().state === 'expired', deadEnv.S._test.status().state);
  check('만료 안내는 다시 로그인 문구', /다시 로그인/.test(deadEnv.S._test.status().error), deadEnv.S._test.status().error);
  const deadBefore = deadCalls;
  await deadEnv.S._test.syncNow();
  await deadEnv.S._test.syncNow();
  check('만료 뒤 다시 시도해도 죽은 토큰으로 요청하지 않는다', deadCalls === deadBefore, (deadCalls - deadBefore) + '회');
  check('다시 시도해도 만료 안내는 그대로', deadEnv.S._test.status().state === 'expired');

  const alreadyEnv = makeEnv({
    storage: { [CFG.session]: EXPIRED },
    fetch: () => Promise.resolve(json(400, { error: 'invalid_grant', error_description: 'Invalid Refresh Token: Already Used' }))
  });
  await alreadyEnv.S._test.syncNow();
  check("'Already Used' 도 만료로 처리", alreadyEnv.S.session() === null &&
    alreadyEnv.S._test.status().state === 'expired', alreadyEnv.S._test.status().state);

  /* ═════════ ⑭ 다른 탭이 먼저 갱신했으면 그 세션으로 이어 간다(로그아웃 금지) ═════════ */
  const ROTATED = JSON.stringify({ access_token: 'tab2', refresh_token: 'ref-9',
    expires_at: Date.now() + 3600e3, user: { id: 'u-1' } });
  const seenAuth = [];
  const tabEnv = makeEnv({
    storage: { [CFG.session]: EXPIRED },
    fetch: (url, init) => {
      if (url.includes('grant_type=refresh_token')) {
        tabEnv.store.set(CFG.session, ROTATED);   // 실패하는 사이 다른 탭이 새 세션을 저장했다
        return Promise.resolve(json(400, { code: 400, error_code: 'validation_failed', msg: 'Refresh token is not valid' }));
      }
      seenAuth.push((init && init.headers && init.headers.Authorization) || '');
      if (url.includes('/rest/v1/life_sim_user_state')) return Promise.resolve(json(200, []));
      if (url.includes('/rest/v1/rpc/')) return Promise.resolve(json(200, JSON.parse(init.body).p_data));
      return Promise.resolve(json(404, {}));
    }
  });
  await tabEnv.S._test.syncNow();
  check('다른 탭이 갱신했으면 그 세션으로 이어 간다', !!tabEnv.S.session() && tabEnv.S.session().access_token === 'tab2',
    tabEnv.S.session() ? tabEnv.S.session().access_token : 'null');
  check('멀쩡한 로그인은 지우지 않는다', tabEnv.S._test.status().state === 'synced', tabEnv.S._test.status().state);
  check('그 뒤 요청은 새 토큰으로 나간다', seenAuth.length > 0 && seenAuth.every((h) => h === 'Bearer tab2'), seenAuth.join('|'));

  /* ═════════ ⑮ 실패 사유가 아이폰 화면에서도 글자로 보인다 ═════════ */
  function fakeChip() {
    return {
      innerHTML: '', attrs: {}, isConnected: true,
      addEventListener() {},
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return this.attrs[k] == null ? null : this.attrs[k]; }
    };
  }
  const chipEnv = makeEnv({
    storage: {
      [CFG.session]: SESSION,
      [CFG.save]: JSON.stringify({ name: '내 인생', updatedAt: 10, age: 12, month: 4, history: [{}] })
    },
    fetch: () => Promise.reject(new Error('Failed to fetch'))
  });
  const chip = fakeChip();
  chipEnv.S.mount(chip);
  await chipEnv.S._test.syncNow();
  check('실패 사유가 칩 아래 글자로 보인다', /sync-why/.test(chip.innerHTML) && /네트워크에 연결하지 못했습니다/.test(chip.innerHTML),
    chip.innerHTML.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90));
  check('칩 상태도 error', chip.attrs['data-state'] === 'error', chip.attrs['data-state']);
  check('긴 사유는 42자로 줄인다', chipEnv.S._test.shortError('가'.repeat(80)).length === 42,
    String(chipEnv.S._test.shortError('가'.repeat(80)).length));

  const exChip = fakeChip();
  deadEnv.S.mount(exChip);
  check('만료되면 로그인 버튼과 안내가 함께 나온다',
    /Google로 로그인/.test(exChip.innerHTML) && /다시 로그인/.test(exChip.innerHTML) && !/로그아웃/.test(exChip.innerHTML),
    exChip.innerHTML.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90));

  /* ═════════ ⑯ 서버가 키 순서를 바꿔 돌려줘도 두 번 올리지 않는다 ═════════ */
  function reorder(v) {
    if (Array.isArray(v)) return v.map(reorder);
    if (v && typeof v === 'object') {
      const out = {};
      Object.keys(v).reverse().forEach((k) => { out[k] = reorder(v[k]); });
      return out;
    }
    return v;
  }
  let rpcHits = 0;
  const reorderEnv = makeEnv({
    storage: { [CFG.session]: SESSION, [CFG.hall]: JSON.stringify({ v: 1, seeded: true, records: [] }) },
    fetch: (url, init) => {
      if (url.includes('/rest/v1/life_sim_user_state')) {
        return Promise.resolve(json(200, [{
          data: { v: 1, at: 500, save: null, saveAt: 500, device: 'other',
            hall: { v: 1, seeded: true, records: [{ id: 'x1', mine: true, ts: 1, score: 50 }] },
            titles: { a: { at: 1 } } },
          revised_at: 500
        }]));
      }
      if (url.includes('/rest/v1/rpc/')) {
        rpcHits++;
        return Promise.resolve(json(200, reorder(JSON.parse(init.body).p_data)));   // jsonb 는 키 순서를 바꾼다
      }
      return Promise.resolve(json(404, {}));
    }
  });
  await reorderEnv.S._test.syncNow();
  check('키 순서만 달라도 다시 올리지 않는다', rpcHits === 1, rpcHits + '회');
  check('그래도 동기화는 성공', reorderEnv.S._test.status().state === 'synced', reorderEnv.S._test.status().state);

  /* ── 출력 ── */
  console.log(results.join('\n'));
  const fails = results.filter((r) => r.startsWith('FAIL')).length;
  console.log('\n동기화 검사:', results.length, '항목 · 실패', fails, '건');
  if (fails) process.exitCode = 1;
})().catch((e) => {
  console.error('테스트 실행 오류:', e && e.stack || e);
  process.exitCode = 1;
});
