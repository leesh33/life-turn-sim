// 🏆 전체 유저 익명 랭킹 검증 — 보낼 값 · 개인정보(이메일) 차단 · 점수/재산 정합성 ·
//   로그인 전 무요청 · 자동 등록 토글 · 이미 올린 기록 중복 방지 · 서버 오류 안내 · 목록/백분위
//   네트워크는 흉내 낸다(실서버는 test/leaderboard_ui.py --url ... 이 본다).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'assets', 'leaderboard.js'), 'utf8');
const REFDIST = fs.readFileSync(path.join(__dirname, '..', 'assets', 'refdist.js'), 'utf8');

const results = [];
const check = (name, cond, extra) => results.push(`${cond ? 'PASS' : 'FAIL'} · ${name}${extra ? ' — ' + extra : ''}`);

function json(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body == null ? '' : JSON.stringify(body))
  };
}

// leaderboard.js 를 브라우저 흉내 속에서 한 번 로드한다
function makeEnv(opts = {}) {
  const store = new Map(Object.entries(opts.storage || {}));
  const events = [];
  const calls = [];
  const g = {
    console,
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); },
      removeItem: (k) => { store.delete(k); }
    },
    fetch: (url, init) => {
      calls.push({ url, init, body: init && init.body ? JSON.parse(init.body) : null });
      return opts.fetch ? opts.fetch(url, init) : Promise.reject(new Error('예상하지 못한 요청'));
    },
    setTimeout, clearTimeout,
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } },
    dispatchEvent: (e) => { events.push(e); return true; },
    addEventListener: () => {},
    document: { activeElement: null }
  };
  g.window = g;
  if (opts.session) g.CloudSync = { session: () => opts.session };
  if (opts.hall) g.Life = { hallMine: () => opts.hall, hallBestMine: () => (opts.hall && opts.hall[0]) || null, hallRecords: () => opts.hall };
  else if (opts.records) g.Life = { hallMine: () => opts.records, hallBestMine: () => opts.records[0] || null, hallRecords: () => opts.records };
  vm.createContext(g);
  vm.runInContext(REFDIST, g, { filename: 'refdist.js' });
  vm.runInContext(SRC, g, { filename: 'leaderboard.js' });
  return { g, store, events, calls, L: g.Leaderboard, T: g.Leaderboard._test };
}

const SESSION = { access_token: 'tok', expires_at: Date.now() + 3600e3, user: { id: 'u-1', email: 'andy@example.com', user_metadata: { full_name: '상훈' } } };

const REC = {
  id: 'r-abc-1', kind: 'life', key: 'life80', age: 80, score: 71.4, grade: 'A',
  title: '우렁찬 울음으로 시작해 인맥 하나로 먹고사는 K-기획자',
  name: '상훈', archetype: '사람을 모으는 사람', generation: 2, scenario: 'chaebol',
  stats: { hp: 64, mental: 71, charm: 66, social: 84, intel: 79, luck: 55, asset: 32000 }
};

(async function main() {
  /* ═════════ ① 모듈 모양 ═════════ */
  const env0 = makeEnv();
  const API = ['start', 'nick', 'setNick', 'list', 'submitRecord', 'submitBest', 'pendingRecords', 'clearMine', 'signedIn'];
  check('Leaderboard 공개 API', API.every((k) => typeof env0.L[k] === 'function'), API.join(','));
  check('로그인 전 signedIn=false', env0.L.signedIn() === false);
  check('기본 닉네임은 익명 플레이어', env0.L.nick() === '익명 플레이어', env0.L.nick());
  check('자동 등록은 기본 켜짐', env0.L.auto() === true);

  /* ═════════ ② 보낼 값 만들기 — 이메일·실명 없음 ═════════ */
  const p = env0.T.payloadOf(REC, '익명 플레이어');
  check('run_key = 전당 기록 id', p.p_run_key === 'r-abc-1', p.p_run_key);
  check('캐릭터 이름·점수·나이', p.p_character_name === '상훈' && p.p_score === 71.4 && p.p_final_age === 80,
    `${p.p_character_name}/${p.p_score}/${p.p_final_age}`);
  check('재산은 만원 단위', p.p_net_assets === 32000, p.p_net_assets);
  check('대수·시나리오·등급', p.p_generation === 2 && p.p_scenario === 'chaebol' && p.p_grade === 'A',
    `${p.p_generation}/${p.p_scenario}/${p.p_grade}`);
  check('보내는 값에 이메일이 없다', !JSON.stringify(p).includes('@') && !/email/i.test(JSON.stringify(p)));
  check('보내는 항목은 11개뿐', Object.keys(p).length === 11, Object.keys(p).join(','));

  const dirty = env0.T.payloadOf(Object.assign({}, REC, { name: 'andy@example.com', title: '메일 andy.lee@x.com 로 연락' }), 'me@x.com');
  check('이름에서 이메일은 지운다', !dirty.p_character_name.includes('@'), dirty.p_character_name);
  check('닉네임이 이메일이면 익명으로', dirty.p_display_name === '익명 플레이어', dirty.p_display_name);
  check('칭호에서도 이메일을 지운다', !dirty.p_title.includes('@'), dirty.p_title);

  /* ═════════ ③ 검증 — 서버가 거부할 값은 미리 막는다 ═════════ */
  check('정상 기록은 통과', env0.T.validate(p).ok === true, JSON.stringify(env0.T.validate(p)));
  check('점수 101 거부', env0.T.validate(Object.assign({}, p, { p_score: 101 })).ok === false);
  check('나이 130 거부', env0.T.validate(Object.assign({}, p, { p_final_age: 130 })).ok === false);
  check('재산 폭주 거부', env0.T.validate(Object.assign({}, p, { p_net_assets: 9e12 })).ok === false);
  check('점수·재산 불일치 거부', env0.T.validate(Object.assign({}, p, { p_score: 5, p_net_assets: 900000 })).ok === false,
    env0.T.validate(Object.assign({}, p, { p_score: 5, p_net_assets: 900000 })).reason);
  check('이름에 @ 있으면 거부', env0.T.validate(Object.assign({}, p, { p_character_name: 'a@b' })).ok === false);
  check('캐릭터 이름 없으면 거부', env0.T.validate(Object.assign({}, p, { p_character_name: '' })).ok === false);

  /* ═════════ ④ 점수 공식 — 엔진과 같은 재산 몫 ═════════ */
  const as0 = env0.T.assetScoreOf(0), as3 = env0.T.assetScoreOf(32000), asBig = env0.T.assetScoreOf(1e12);
  check('재산 0 → 재산 몫 0', as0 === 0, as0);
  check('재산 3.2억 → 41~45', as3 > 41 && as3 <= 45, as3.toFixed(2));
  check('재산 몫 상한 45', asBig === 45, asBig);
  // 엔진 scoreOfStats(게이지 평균 a, 재산 몫 b) = 0.55a + b — 그 범위 안이면 통과해야 한다
  const gaugeAvg = (64 + 71 + 66 + 84 + 79 + 55) / 6;
  const engineScore = Math.round((gaugeAvg * 0.55 + as3) * 10) / 10;
  check('엔진 점수는 검증을 통과', env0.T.validate(Object.assign({}, p, { p_score: engineScore })).ok === true,
    `${engineScore}점(재산 몫 ${as3.toFixed(1)})`);

  /* ═════════ ⑤ 이 기기 백분위 ═════════ */
  const envPct = makeEnv({ records: [
    { id: 's1', score: 80 }, { id: 's2', score: 70 }, { id: 's3', score: 60 }, { id: 's4', score: 50 },
    { id: 's5', score: 40 }, { id: 's6', score: 30 }, { id: 's7', score: 20 }, { id: 's8', score: 10 },
    { id: 's9', score: 5 }, { id: 's10', score: 2 }
  ] });
  const t95 = envPct.T.localTopPercent(95), t75 = envPct.T.localTopPercent(75), t45 = envPct.T.localTopPercent(45);
  check('높은 점수일수록 상위 % 가 작다', t95 < t75 && t75 < t45, `${t95}/${t75}/${t45}`);
  check('백분위는 1~100', [t95, t75, t45].every((v) => v >= 1 && v <= 100), `${t95}/${t75}/${t45}`);
  check('전당 10명 중 4명보다 위 = 상위 40%', t45 === 40, t45);
  check('표본이 적으면(3건) 백분위를 말하지 않는다',
    makeEnv({ records: [{ id: 'a', score: 80 }, { id: 'b', score: 60 }, { id: 'c', score: 40 }] }).T.localTopPercent(70) === null);
  check('기록이 없으면 null', makeEnv().T.localTopPercent(70) === null);
  check('점수 없으면 null', envPct.T.localTopPercent(null) === null);

  /* ═════════ ⑥ 목록 — 로그인 전에는 이 기기 최고 점수로 비교 ═════════ */
  const env1 = makeEnv({
    hall: [REC],
    fetch: () => Promise.resolve(json(200, {
      sort: 'score', limit: 30, total: 2,
      entries: [
        { rank: 1, character_name: '다', display_name: '익명 플레이어', title: '빠른 사업가', archetype: '사업가', final_age: 80, grade: 'S', score: 88.2, net_assets: 40000, scenario: 'kr', generation: 1, mine: false },
        { rank: 2, character_name: '상훈', display_name: '익명 플레이어', title: '기획자', archetype: '', final_age: 80, grade: 'A', score: 71.4, net_assets: 32000, scenario: 'chaebol', generation: 2, mine: true }
      ],
      me: { signed_in: false, best_score: 71.4, total: 2, better: 1, rank: 2, top_percent: 50 }
    }))
  });
  const list = await env1.L.list('score');
  check('목록 항목 수', list.entries.length === 2 && list.total === 2);
  check('내 최고 점수를 함께 보낸다', env1.calls[0].body.p_my_best_score === 71.4, JSON.stringify(env1.calls[0].body));
  check('정렬 기본값 score', env1.calls[0].body.p_sort === 'score');
  check('비로그인 목록에 상위 %', list.me.top_percent === 50, JSON.stringify(list.me));
  check('목록 요청에 인증 헤더 없음', !env1.calls[0].init.headers.Authorization);
  await env1.L.list('assets');
  check('자산 정렬은 p_sort=assets', env1.calls[1].body.p_sort === 'assets');

  /* ═════════ ⑦ 서버 오류 안내 ═════════ */
  const env404 = makeEnv({ fetch: () => Promise.resolve(json(404, { code: 'PGRST202', message: 'Could not find the function public.life_sim_leaderboard_list' })) });
  let err404 = null;
  try { await env404.L.list('score'); } catch (e) { err404 = e; }
  check('SQL 미적용(404)이면 준비 중 안내', !!err404 && /준비 중/.test(env404.T.friendly(err404)), env404.T.friendly(err404));
  const envNet = makeEnv({ fetch: () => Promise.reject(new Error('Failed to fetch')) });
  let errNet = null;
  try { await envNet.L.list('score'); } catch (e) { errNet = e; }
  check('네트워크 실패 안내', envNet.T.friendly(errNet) === '네트워크에 연결하지 못했습니다', envNet.T.friendly(errNet));

  /* ═════════ ⑧ 등록 — 로그인 전에는 아무 요청도 보내지 않는다 ═════════ */
  const env2 = makeEnv({ hall: [REC] });
  let rejected = null;
  try { await env2.L.submitRecord(REC); } catch (e) { rejected = e; }
  check('비로그인 등록은 거부', !!rejected && env2.calls.length === 0, `${env2.calls.length}건 요청`);
  env2.T.onHallAdd(REC);
  check('비로그인 자동 등록도 요청 0건', env2.calls.length === 0);

  /* ═════════ ⑨ 등록 — 로그인 · 자동 등록 켜짐 ═════════ */
  const env3 = makeEnv({
    session: SESSION, hall: [REC],
    fetch: () => Promise.resolve(json(200, { ok: true, id: 'row-1', created: true, rank: 2, total: 5, score: 71.4 }))
  });
  const res = await env3.L.submitRecord(REC);
  check('등록 성공 · 순위', res.ok === true && res.rank === 2 && res.total === 5, JSON.stringify(res));
  check('등록은 본인 토큰으로', env3.calls[0].init.headers.Authorization === 'Bearer tok');
  check('등록 RPC 경로', /life_sim_leaderboard_submit$/.test(env3.calls[0].url), env3.calls[0].url);
  check('등록 뒤 sent 표시', env3.L.isSent('r-abc-1') === true);
  check('등록 알림 이벤트', env3.events.some((e) => e.type === 'life-sim-leaderboard-submitted'));
  check('같은 기록은 다시 안 올린다', env3.L.pendingRecords(3).length === 0);

  const again = await env3.L.submitBest(3);
  check('submitBest 는 올릴 게 없으면 요청 없음', again.ok === true && again.skipped === true && env3.calls.length === 1,
    `${env3.calls.length}건`);

  /* ═════════ ⑩ 자동 등록 토글 · 엔딩 훅 ═════════ */
  const env4 = makeEnv({ session: SESSION, hall: [], fetch: () => Promise.resolve(json(200, { ok: true, rank: 1, total: 1 })) });
  env4.T.onHallAdd(REC);
  await new Promise((r) => setTimeout(r, 10));
  check('자동 등록 켜짐 → 엔딩에서 올라간다', env4.calls.length === 1, `${env4.calls.length}건`);
  env4.L.setAuto(false);
  env4.T.onHallAdd(Object.assign({}, REC, { id: 'r-abc-2' }));
  await new Promise((r) => setTimeout(r, 10));
  check('자동 등록 끔 → 요청 없음', env4.calls.length === 1, `${env4.calls.length}건`);
  check('자동 등록 설정 저장', env4.L.auto() === false);
  env4.L.setAuto(true);
  check('다시 켜면 저장도 되돌아온다', env4.L.auto() === true);

  /* ═════════ ⑪ 만료 임박 토큰이면 자동 등록을 미룬다 ═════════ */
  const env5 = makeEnv({
    session: { access_token: 'tok', expires_at: Date.now() + 1000, user: { id: 'u-1' } },
    hall: [], fetch: () => Promise.resolve(json(200, { ok: true }))
  });
  env5.T.onHallAdd(REC);
  await new Promise((r) => setTimeout(r, 10));
  check('토큰 만료 임박이면 자동 등록 보류', env5.calls.length === 0, `${env5.calls.length}건`);

  /* ═════════ ⑫ 닉네임 ═════════ */
  const env6 = makeEnv();
  check('닉네임 저장', env6.L.setNick('꼬야네') === '꼬야네' && env6.L.nick() === '꼬야네');
  check('긴 닉네임은 12자로', env6.L.setNick('가나다라마바사아자차카타파하').length === 12);
  check('빈 닉네임은 익명으로', env6.L.setNick('   ') === '익명 플레이어');
  check('이메일 닉네임은 익명으로', env6.L.setNick('a@b.com') === '익명 플레이어');

  /* ═════════ ⑬ 프로필 이름(구글) — 이메일 앞부분은 쓰지 않는다 ═════════ */
  const env7 = makeEnv({ session: SESSION });
  check('프로필 이름 사용', env7.L.profileName() === '상훈', env7.L.profileName());
  const env8 = makeEnv({ session: { access_token: 't', user: { id: 'u-2', email: 'andy@example.com', user_metadata: {} } } });
  check('메타데이터가 없으면 빈 문자열(이메일 안 씀)', env8.L.profileName() === '', env8.L.profileName());

  /* ═════════ ⑭ 내 기록 지우기 ═════════ */
  const env9 = makeEnv({ session: SESSION, fetch: () => Promise.resolve(json(200, { ok: true, removed: 3 })) });
  const cl = await env9.L.clearMine();
  check('내 기록 지우기', cl.removed === 3 && /life_sim_leaderboard_clear$/.test(env9.calls[0].url));

  /* ═════════ ⑮ 엔진 → 랭킹 연결 (전당에 새 기록이 생기면 알린다) ═════════ */
  const { load } = require('../tools/lib-load');
  const { Life } = load(path.join(__dirname, '..', 'assets'));
  const fired = [];
  global.window.dispatchEvent = (e) => { fired.push(e); return true; };
  global.window.CustomEvent = class { constructor(t, i) { this.type = t; this.detail = i && i.detail; } };
  const g = Life.newGame({ name: '유솔', gender: '여', startAge: 14, scenario: 'kr' });
  g.grad = { key: 'high', age: 19, registered: false, stats: Object.assign({}, g.stats) };
  Life.graduate(g, true);
  check('엔진이 새 전당 기록을 알린다', fired.length === 1 && fired[0].type === 'life-sim-hall-add', `${fired.length}건`);
  check('이벤트에 기록이 담긴다', !!fired[0] && !!fired[0].detail.id && fired[0].detail.name === '유솔' &&
    typeof fired[0].detail.score === 'number', fired[0] ? fired[0].detail.id : '');
  check('기록에 아키타입이 담긴다', !!fired[0] && typeof fired[0].detail.archetype === 'string',
    fired[0] ? String(fired[0].detail.archetype) : '');
  const body = env3.T.payloadOf(fired[0].detail, '꼬야네');
  check('엔진 기록 → 랭킹 전송값 검증 통과', env3.T.validate(body).ok === true, JSON.stringify(body).slice(0, 120));

  /* ═════════ 결과 ═════════ */
  console.log(results.join('\n'));
  const failed = results.filter((r) => r.startsWith('FAIL'));
  console.log(`\n${results.length - failed.length} / ${results.length} 통과`);
  if (failed.length) process.exitCode = 1;
})();
