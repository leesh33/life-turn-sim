/* ─────────────────────────────────────────────
   events/zz-finalize.js — 로드 마지막 단계 정리
   1) 마일스톤(at) 이벤트에 나이 범위가 없으면 at 의 나이로 채운다.
      (모든 이벤트가 minAge/maxAge 를 갖게 해 나이 고증을 한 곳에서 보장)
   2) 본문이 '이미 그 상태'를 전제하는 사건에 그 상태 조건을 붙인다.
      (전수조사 2026-11-24: 배우자·자녀·손주·직장 문구가 결혼/자녀/재직 없이도 떠서
       비혼·무자녀·은퇴 인생에 '아내가', '아이의 학원비', '출근길' 같은 장면이 나왔다.)
      · 사건이 그 상태를 '만드는' 사건이면(선택지가 결혼·자녀 플래그를 세우면) 건드리지 않는다.
      · 카메오(이전 회차 인물) 사건은 다른 사람의 삶을 말하므로 건드리지 않는다.
      · 규칙은 아래 표 한 곳에 모아 test/audit-events.js 가 같은 표로 검사한다.
   ───────────────────────────────────────────── */
(function (global) {
  'use strict';
  var list = global.LIFE_EVENTS || [];
  var i, j;

  /* ── 1) 마일스톤 나이 범위 ── */
  for (i = 0; i < list.length; i++) {
    var ev = list[i];
    if (!ev) continue;
    if (ev.at) {
      var pairs = Array.isArray(ev.at[0]) ? ev.at : [ev.at];
      var lo = Infinity, hi = -Infinity;
      for (j = 0; j < pairs.length; j++) {
        if (pairs[j][0] < lo) lo = pairs[j][0];
        if (pairs[j][0] > hi) hi = pairs[j][0];
      }
      if (ev.minAge === undefined || ev.minAge === null) ev.minAge = lo;
      if (ev.maxAge === undefined || ev.maxAge === null) ev.maxAge = hi;
    }
  }

  /* ── 2) 상태 전제 문구 → 조건 ──
     need(s) 가 false 면 그 사건은 후보에서 빠진다. */
  var hasKid = function (s) { return !!s.flags && ((Number(s.flags.자녀수) || 0) > 0 || !!s.flags.자녀); };
  var employed = function (s) { return !!s.flags && !!(s.flags.직업 || s.flags.창업) && !s.flags.은퇴 && !s.flags.명퇴; };
  var retiredOrOld = function (s) { return !!s.flags && (!!s.flags.은퇴 || !!s.flags.명퇴) || s.age >= 60; };

  var RULES = [
    {
      key: '배우자',
      // 함께 사는 배우자가 있어야 하는 장면 — 비혼 인생에는 뜨지 않게
      re: /(아내|남편|배우자|신혼|혼인신고|장모님|시어머니|장인어른|시아버지)/,
      need: function (s) { return !!s.flags && !!s.flags.결혼; },
      label: '결혼'
    },
    {
      key: '자녀',
      // 내 아이를 키우는 장면 — 가정·중년·노년에서만 본다(사회 단계의 '동료의 육아' 같은 문장은 제외)
      re: /(자녀|육아|어린이집|아이의|아이가|아이는|아이를|아이와|아이들|아기|(딸|아들)(?=[이는을를의가도만과와에게한테\s,.!?]|$))/,
      stages: ['family', 'midlife', 'senior'],
      need: hasKid,
      label: '자녀'
    },
    {
      key: '손주',
      // 손주는 자녀가 있어야 있다 — 무자녀 인생의 노년에 '손주' 장면이 뜨지 않게
      re: /(손주|손자|손녀)/,
      need: hasKid,
      label: '자녀'
    },
    {
      key: '조직생활',
      // 팀장·상사·승진·연봉·사수·야근은 '회사에 다니는 사람'의 말 — 창업자에게는 뜨지 않게
      re: /(팀장|상사|승진|연봉|사수|사원증|야근)/,
      stages: ['family', 'midlife'],
      need: function (s) { return employed(s) && !s.flags.창업; },
      label: '조직 생활'
    },
    {
      key: '재직',
      // 회사 생활 장면 — 은퇴·명퇴 뒤에는 뜨지 않게 (창업자는 '회사'가 자기 회사일 수 있어 허용)
      re: /(출근|퇴근|야근|상사|팀장|사수|사원증|회사|직장|월급|연봉|승진|부장님|과장님|대리님|인사팀|사내|회식|재택|출장|사무실|오피스|업무|거래처|결재|보고서|계약서|연차|성과급|이직|면접관|입사)/,
      stages: ['family', 'midlife', 'senior'],
      need: employed,
      label: '재직 중'
    },
    {
      key: '은퇴후',
      // '은퇴한/은퇴 후' 처럼 이미 끝난 뒤를 말하는 장면은 은퇴한 사람에게만
      re: /(은퇴한|은퇴 후|은퇴하고|정년 이후|퇴직 후)/,
      stages: ['midlife', 'family'],
      need: retiredOrOld,
      label: '은퇴'
    }
  ];

  function setsKeys(ev) {
    var keys = [];
    (ev.choices || []).forEach(function (c) {
      var specs = [c.set];
      if (c.mini) specs.push(c.mini.win && c.mini.win.set, c.mini.lose && c.mini.lose.set);
      specs.forEach(function (spec) {
        if (!spec) return;
        if (typeof spec === 'function') {
          var src = spec.toString();
          ['결혼', '자녀', '자녀수', '은퇴', '명퇴', '직업', '창업'].forEach(function (k) {
            if (src.indexOf(k) !== -1) keys.push(k);
          });
          return;
        }
        Object.keys(spec).forEach(function (k) { keys.push(k); });
      });
    });
    return keys;
  }

  // 그 사건이 필요한 상태를 스스로 만들면(결혼식·출산·취직) 조건을 붙이지 않는다
  function selfProviding(ev, rule) {
    var keys = setsKeys(ev);
    if (rule.label === '결혼') return keys.indexOf('결혼') !== -1;
    if (rule.label === '자녀') return keys.indexOf('자녀') !== -1 || keys.indexOf('자녀수') !== -1;
    if (rule.label === '재직 중' || rule.label === '조직 생활') {
      return keys.indexOf('직업') !== -1 || keys.indexOf('창업') !== -1;
    }
    if (rule.label === '은퇴') return keys.indexOf('은퇴') !== -1 || keys.indexOf('명퇴') !== -1;
    return false;
  }

  function addGuard(ev, need) {
    var prev = ev.when;
    ev.when = function (s) {
      if (!need(s)) return false;
      return typeof prev === 'function' ? !!prev(s) : true;
    };
  }

  var applied = [];
  for (i = 0; i < list.length; i++) {
    var e = list[i];
    if (!e || !e.id || e.cameo) continue;
    if (/^scn_/.test(e.id)) continue;   // 시나리오·가문 전용 사건은 그 플래그로만 열리므로 그대로 둔다
    var text = [e.title, e.text]
      .concat((e.choices || []).map(function (c) { return c.label + ' ' + c.result; }))
      .filter(function (v) { return typeof v === 'string'; })
      .join(' ');
    var hitRules = [];
    for (j = 0; j < RULES.length; j++) {
      var rule = RULES[j];
      if (rule.stages && rule.stages.indexOf(e.stage) === -1) continue;
      if (!rule.re.test(text)) continue;
      if (selfProviding(e, rule)) continue;
      if (hitRules.indexOf(rule.key) !== -1) continue;
      addGuard(e, rule.need);
      applied.push({ id: e.id, rule: rule.key });
      hitRules.push(rule.key);
    }
  }

  global.LIFE_STATUS_RULES = RULES;
  global.LIFE_STATUS_GUARDS = applied;
  global.LIFE_HAS_KID = hasKid;
  global.LIFE_EMPLOYED = employed;

  /* ── 3) 나이를 말하지 않는 한 살짜리 사건은 앞뒤 한 살까지 연다 ──
     가정(35~49)·중년(50~64)·노년(65~80)은 한 살짜리 사건이 많아, 그 나이의 풀이
     12~15개뿐이었다. 돌발 사건이 한두 달을 가져가면 그 해 마지막 달에 후보가 마른다
     (전수조사 실측: 36세·60세 12개월차에 '평범한 한 달' 폴백).
     본문·제목이 특정 나이를 말하지 않는 사건만 [나이−1, 나이+1] 로 넓힌다
     ('마흔의 아침'·'서른'·'60대'처럼 나이를 말하는 사건은 그대로 둔다). */
  var AGE_WORD = /(\d{1,2}\s*(?:세|살|대)|서른|마흔|쉰|예순|일흔|여든|환갑|고희|정년|내년|올해|작년)/;
  var stageRange = { family: [35, 49], midlife: [50, 64], senior: [65, 80] };
  var widened = [];
  for (i = 0; i < list.length; i++) {
    var w = list[i];
    if (!w) continue;
    // 모든 사건에 '나이를 말하는가' 표시를 남긴다(엔진의 마지막 후보 단계가 쓴다)
    if (typeof w.ageSilent !== 'boolean') {
      var b2 = [typeof w.title === 'string' ? w.title : '', typeof w.text === 'string' ? w.text : '']
        .concat((w.choices || []).map(function (c) { return (c.label || '') + ' ' + (c.result || ''); }))
        .join(' ');
      w.ageSilent = !AGE_WORD.test(b2);
    }
    if (!stageRange[w.stage]) continue;
    if (w.at || w.milestone || w.fixedAge) continue;   // fixedAge: 그 해에만 나오는 사건
    if (typeof w.minAge !== 'number' || w.minAge !== w.maxAge) continue;
    // 단계의 마지막 두 해(63~64·79~80)는 넓히지 않는다 — 넓히면 그 해 사건이 앞 해에서 소진돼
    // 정작 마지막 해에 후보가 마른다(전수조사 실측: 64·80세 폴백)
    var stageEnd = stageRange[w.stage][1];
    if (w.minAge >= stageEnd - 1) continue;
    var body = [typeof w.title === 'string' ? w.title : '', typeof w.text === 'string' ? w.text : '']
      .concat((w.choices || []).map(function (c) { return (c.label || '') + ' ' + (c.result || ''); }))
      .join(' ');
    w.ageSilent = !AGE_WORD.test(body);   // 나이를 말하지 않는가(엔진의 마지막 후보 단계가 쓴다)
    if (!w.ageSilent) continue;
    var bounds = stageRange[w.stage];
    w.minAge = Math.max(bounds[0], w.minAge - 1);
    w.maxAge = Math.min(bounds[1], w.maxAge + 1);
    widened.push(w.id);
  }
  global.LIFE_AGE_WIDENED = widened;
})(typeof window !== 'undefined' ? window : globalThis);
