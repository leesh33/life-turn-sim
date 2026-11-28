/* ─────────────────────────────────────────────
   codex.js — 💼 직업 · 💕 인연 수집 도감 (2026-11-28)
   ─────────────────────────────────────────────
   · 판을 넘어 쌓이는 수집 도감이다. 칭호 도감(titles.js)과 나란히 놓인다.
       - 직업 : 그 인생에서 실제로 걸어간 길 — 진학·첫 직장·창업·부업까지 (20종)
       - 인연 : 첫사랑·연인·배우자·자녀·손주, 그리고 이전 회차 인물과의 인연 (14종)
   · 해금 판정은 지금 상태의 플래그·나이만 본다(need). Life.choose 뒤와 엔딩에서
     check(state) 를 부르면 새로 만난 항목을 돌려주고 localStorage 에 남긴다.
   · 저장 키는 lifeTurnSim.codex.v1 — 클라우드 동기화(sync.js)가 칭호 도감과 같은
     방식(합집합, 먼저 만난 기록 유지)으로 합친다. 예전 저장본에는 키가 없어도 된다.
   ───────────────────────────────────────────── */
(function (global) {
  'use strict';

  var KEY = 'lifeTurnSim.codex.v1';

  function F(s) { return (s && s.flags) || {}; }
  function jobIs(s, name) { return F(s).직업 === name; }
  function ageIn(s, lo, hi) {
    var a = s && typeof s.age === 'number' ? s.age : 0;
    return a >= lo && a <= hi;
  }
  function cameoRel(s, rel) {
    var list = (s && s.cameos) || [];
    for (var i = 0; i < list.length; i++) if (list[i] && list[i].rel === rel) return true;
    return false;
  }

  /* ── 💼 직업 ──
     need(s) 가 true 인 순간 해금된다. 같은 판에서 여러 번 거쳐도 처음 한 번만 남는다. */
  var JOB = [
    { id: 'student', emoji: '🎓', name: '대학생', ages: [19, 25],
      desc: '캠퍼스 잔디에 앉아 처음으로 내일을 스스로 정해 본 시절.',
      need: function (s) { return !!(F(s).수능_명문 || F(s).수능_지방 || F(s).전문대 || F(s).대학생) && ageIn(s, 19, 25); } },
    { id: 'grad_student', emoji: '📚', name: '대학원생', ages: [22, 35],
      desc: '논문 마감과 조교 업무 사이에서 하루가 사라졌습니다.',
      need: function (s) { return !!F(s).대학원_진학; } },
    { id: 'intern', emoji: '🪪', name: '인턴', ages: [19, 30],
      desc: '명함도 없이 회의실에 앉았습니다. 커피는 늘 두 잔이었습니다.',
      need: function (s) { return !!F(s).인턴_경험; } },
    { id: 'part_timer', emoji: '🧾', name: '알바생', ages: [16, 30],
      desc: '시급과 교대 근무표로 한 달을 계산했습니다. 첫 월급은 운동화가 됐습니다.',
      need: function (s) { return !!(F(s).알바_경험 || F(s).알바생); } },
    { id: 'planner', emoji: '🏢', name: '대기업 기획자', ages: [24, 65],
      desc: '회의가 하루를 채우고, 보고서 서식이 밤을 잡아먹었습니다.',
      need: function (s) { return jobIs(s, '대기업 기획자'); } },
    { id: 'dev', emoji: '💻', name: '개발자', ages: [20, 65],
      desc: '월요일에 출시하고 수요일에 다시 고쳤습니다. 그래도 돌아가면 기분이 좋았습니다.',
      need: function (s) { return jobIs(s, '스타트업 개발자') || !!F(s).개발_길; } },
    { id: 'public_officer', emoji: '🏛️', name: '공무원', ages: [24, 65],
      desc: '정시 퇴근은 확실했습니다. 대신 “정체돼 있다”는 말을 자주 들었습니다.',
      need: function (s) { return jobIs(s, '공무원') || !!F(s).공무원_길; } },
    { id: 'office_worker', emoji: '👔', name: '중소기업 사원', ages: [24, 65],
      desc: '사장님과 점심을 먹고, 회사가 작아 시야는 넓었습니다.',
      need: function (s) { return jobIs(s, '중소기업 사원'); } },
    { id: 'business_owner', emoji: '🏪', name: '사업가', ages: [20, 80],
      desc: '간판을 걸고, 첫 손님을 기다리고, 마감 뒤에 혼자 계산했습니다.',
      need: function (s) { return jobIs(s, '자영업자') || !!F(s).사업체; } },
    { id: 'founder', emoji: '🚀', name: '창업가', ages: [19, 60],
      desc: '사무실을 얻고 사람을 모았습니다. 매달 말이 두려웠습니다.',
      need: function (s) { return !!F(s).창업 || !!F(s).창업_길; } },
    { id: 'freelancer', emoji: '🧑‍💻', name: '프리랜서', ages: [22, 80],
      desc: '내 시간을 내가 정했고, 그만큼 다음 달이 불안했습니다.',
      need: function (s) { return jobIs(s, '프리랜서') || !!F(s).프리랜서_2막; } },
    { id: 'teacher', emoji: '📖', name: '교사', ages: [22, 65],
      desc: '칠판 앞에 서서 이름을 부르는 일이 직업이 됐습니다.',
      need: function (s) { return !!F(s).교사_길 || !!F(s).교육_길; } },
    { id: 'doctor', emoji: '🩺', name: '의사', ages: [24, 80],
      desc: '흰 가운을 입고 하루에 수십 명의 얼굴을 봤습니다.',
      need: function (s) { return !!F(s).의사_길 || !!F(s).의대_진학; } },
    { id: 'researcher', emoji: '🔬', name: '연구원', ages: [22, 80],
      desc: '한 줄의 실험 결과를 위해 몇 달을 기다렸습니다.',
      need: function (s) { return !!F(s).연구원_길; } },
    { id: 'artist', emoji: '🎨', name: '예술가', ages: [18, 80],
      desc: '팔리지 않아도 계속 그렸습니다. 손끝에 물감이 남아 있었습니다.',
      need: function (s) { return !!F(s).예술가_길 || !!F(s).작품활동; } },
    { id: 'writer', emoji: '✍️', name: '작가', ages: [18, 80],
      desc: '밤에 쓰고 아침에 지웠습니다. 마침내 한 권이 나왔습니다.',
      need: function (s) { return !!F(s).글쓰기_길 || !!F(s).책_출간; } },
    { id: 'chef', emoji: '🍳', name: '요리사', ages: [18, 80],
      desc: '주방 열기와 셰프의 욕이 하루의 배경음이었습니다.',
      need: function (s) { return !!F(s).요리_길 || !!F(s).식당_운영; } },
    { id: 'pro_gamer', emoji: '🎮', name: '프로게이머', ages: [16, 35],
      desc: '연습실 형광등 아래에서 손목을 다스렸습니다. 화면이 곧 직장이었습니다.',
      need: function (s) { return !!F(s).프로게이머_길 || !!F(s).게임_전문; } },
    { id: 'athlete', emoji: '🏃', name: '체육인', ages: [15, 45],
      desc: '몸이 곧 자산이었습니다. 계절마다 기록이 전부였습니다.',
      need: function (s) { return !!F(s).체육_길 || !!F(s).선수_경력; } },
    { id: 'creator', emoji: '📹', name: '크리에이터', ages: [16, 80],
      desc: '카메라를 켜고 평범한 하루를 올렸습니다. 누군가 봤습니다.',
      need: function (s) { return !!(F(s).유튜버 || F(s).유튜버_길); } },
    { id: 'soldier', emoji: '🪖', name: '군인', ages: [18, 60],
      desc: '제복을 입고 시간을 지켰습니다. 계급이 이름보다 먼저 불렸습니다.',
      need: function (s) { return jobIs(s, '군인'); } },
    { id: 'jobless', emoji: '🧍', name: '백수', ages: [22, 64],
      desc: '아무 일도 하지 않는 시간을 견디는 것도 일이었습니다.',
      need: function (s) { return jobIs(s, '무직') || !!F(s).백수; } }
  ];

  /* ── 💕 인연 ── */
  var BOND = [
    { id: 'first_love', emoji: '💌', name: '첫사랑', ages: [12, 25],
      desc: '편지를 쓰다가 세 번 찢었습니다. 결국 전하지 못한 문장이 더 오래 남았습니다.',
      need: function (s) { return !!F(s).첫연애; } },
    { id: 'lover', emoji: '💞', name: '연인', ages: [16, 60],
      desc: '두 시간을 이야기하고 다음 약속을 잡았습니다.',
      need: function (s) { return !!F(s).연애중; } },
    { id: 'office_romance', emoji: '🤫', name: '사내연애', ages: [22, 55],
      desc: '회사에서는 모르는 척하기로 했습니다. 엘리베이터에서만 눈이 마주쳤습니다.',
      need: function (s) { return !!F(s).사내연애; } },
    { id: 'spouse', emoji: '💍', name: '배우자', ages: [24, 80],
      desc: '서약을 읽던 목소리가 떨렸습니다. 뒤에서 엄마가 울었습니다.',
      need: function (s) { return !!(F(s).결혼 || F(s).배우자); } },
    { id: 'first_child', emoji: '🍼', name: '첫 아이', ages: [24, 60],
      desc: '새벽 4시의 전화, 병원 복도에서 다섯 시간. 그리고 첫 울음.',
      need: function (s) { return !!F(s).자녀 || (Number(F(s).자녀수) || 0) >= 1; } },
    { id: 'second_child', emoji: '👶', name: '둘째', ages: [26, 60],
      desc: '두 번째 울음소리는 첫 번째보다 짧고 힘찼습니다.',
      need: function (s) { return (Number(F(s).자녀수) || 0) >= 2; } },
    { id: 'grandchild', emoji: '🧸', name: '손주', ages: [45, 80],
      desc: '아이의 아이가 내 무릎에 앉았습니다. 이름을 부르는 소리가 낯설고 좋았습니다.',
      need: function (s) { return !!F(s).손주; } },
    { id: 'best_friend', emoji: '💛', name: '단짝', ages: [8, 80],
      desc: '우산 하나를 같이 쓰고 집에 갔습니다. 지금도 그 웃음소리를 기억합니다.',
      need: function (s) { return !!F(s).단짝; } },
    { id: 'cameo_friend', emoji: '🧬', name: '이전 인생의 친구', ages: [1, 80],
      desc: '지난 인생에서 만났던 사람이 이번 인생에도 나타났습니다. 이름이 낯익었습니다.',
      need: function (s) { return cameoRel(s, 'friend'); } },
    { id: 'cameo_close', emoji: '🧬', name: '이전 인생의 단짝', ages: [1, 80],
      desc: '두 번째 인생에서도 그 사람과는 말이 통했습니다.',
      need: function (s) { return cameoRel(s, 'close'); } },
    { id: 'cameo_lover', emoji: '🧬', name: '이전 인생의 연인', ages: [1, 80],
      desc: '다른 인생에서 다시 만나 연인이 됐습니다. 기시감이 오래 남았습니다.',
      need: function (s) { return cameoRel(s, 'dating'); } },
    { id: 'cameo_spouse', emoji: '🧬', name: '이전 인생의 부부', ages: [1, 80],
      desc: '두 번의 인생에서 같은 사람과 결혼했습니다. 이번에는 조금 더 다정했습니다.',
      need: function (s) { return cameoRel(s, 'married'); } },
    { id: 'cameo_parted', emoji: '🧬', name: '스쳐 간 인연', ages: [1, 80],
      desc: '만났지만 오래 가지 못했습니다. 그런 인연도 기록에 남습니다.',
      need: function (s) { return cameoRel(s, 'parted'); } },
  ];

  var GROUPS = [
    { id: 'job', emoji: '💼', label: '직업', list: JOB },
    { id: 'bond', emoji: '💕', label: '인연', list: BOND }
  ];
  var TOTAL = JOB.length + BOND.length;
  var BY_ID = {};
  GROUPS.forEach(function (g) {
    g.list.forEach(function (t) { t.kind = g.id; BY_ID[t.id] = t; });
  });

  function read() {
    try {
      var raw = global.localStorage.getItem(KEY);
      var map = raw ? JSON.parse(raw) : {};
      return (map && typeof map === 'object') ? map : {};
    } catch (e) { return {}; }
  }
  function write(map) {
    try { global.localStorage.setItem(KEY, JSON.stringify(map)); } catch (e) {}
  }

  function owned() { return read(); }
  function has(id) { return !!read()[id]; }

  function progress(groupId) {
    var map = read();
    var list = groupId ? groupList(groupId) : JOB.concat(BOND);
    var got = list.filter(function (t) { return !!map[t.id]; }).length;
    return { got: got, total: list.length, pct: list.length ? Math.round((got / list.length) * 100) : 0 };
  }
  function groupList(groupId) {
    for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i].id === groupId) return GROUPS[i].list;
    return [];
  }

  /* 지금 상태에서 새로 만난 항목을 돌려주고 기록에 남긴다 (선택 직후·엔딩에서 부른다) */
  function check(state) {
    if (!state || !state.flags || typeof state.age !== 'number') return [];
    var map = read();
    var out = [];
    JOB.concat(BOND).forEach(function (t) {
      if (map[t.id]) return;
      var ok = false;
      try { ok = !!t.need(state); } catch (e) { ok = false; }
      if (!ok) return;
      map[t.id] = {
        at: Date.now(),
        age: state.age,
        month: state.month || 1,
        name: state.name || '',
        run: state.createdAt || null
      };
      out.push(t);
    });
    if (out.length) write(map);
    return out;
  }

  function reset() { write({}); }

  global.CareerBook = {
    KEY: KEY,
    GROUPS: GROUPS,
    JOB: JOB,
    BOND: BOND,
    TOTAL: TOTAL,
    byId: function (id) { return BY_ID[id] || null; },
    owned: owned,
    has: has,
    progress: progress,
    check: check,
    reset: reset
  };
})(typeof window !== 'undefined' ? window : globalThis);
