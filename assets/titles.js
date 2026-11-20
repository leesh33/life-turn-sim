/* ─────────────────────────────────────────────
   titles.js — 유년·학창기 희귀 칭호·인연 도감
   ─────────────────────────────────────────────
   · 조건(플래그 + 나이 창 + 스탯)을 만족하면 해금되는 숨은 칭호 20종.
   · 해금 기록은 이 브라우저의 localStorage 에 **판과 무관하게 누적**된다.
     (새 인생을 시작해도 도감은 그대로 남는다)
   · 앱에서는 Life.choose 뒤에 TitleBook.check(state) 를 불러
     새로 해금된 칭호를 토스트·배지로 보여 주고, 도감 모달에서 수집률을 본다.
   ───────────────────────────────────────────── */
(function (global) {
  'use strict';

  var KEY = 'lifeTurnSim.titles.v1';

  var LIST = [
    { id: 'loud_baby', emoji: '🍼', name: '조리원 우량아', kind: '칭호', ages: [1, 1],
      desc: '태어나자마자 복도 끝까지 울음이 퍼졌습니다. 간호사 선생님이 엄지를 들었습니다.',
      need: function (s) { return !!s.flags['우렁찬_아기']; } },
    { id: 'big_eater', emoji: '🍚', name: '급식실 1등', kind: '칭호', ages: [7, 13],
      desc: '배식판을 비우는 속도가 반에서 제일 빨랐습니다. 두 번째 배식도 받았습니다.',
      need: function (s) { return !!s.flags['대식가'] && s.stats.hp >= 60; } },
    { id: 'alley_boss', emoji: '👑', name: '골목대장', kind: '인연', ages: [5, 13],
      desc: '골목 어귀에서 아이들이 내 신호를 기다렸습니다. 이 동네의 규칙은 내가 정했습니다.',
      need: function (s) { return !!s.flags['골목대장_씨앗'] || !!s.flags['리더_씨앗']; } },
    { id: 'animal_friend', emoji: '🐾', name: '동물의 친구', kind: '인연', ages: [2, 13],
      desc: '동네 개들이 나를 보면 꼬리를 흔들었습니다. 산책로의 길고양이도 예외가 아니었습니다.',
      need: function (s) { return !!s.flags['동물_씨앗']; } },
    { id: 'block_architect', emoji: '🧱', name: '블록 건축가', kind: '칭호', ages: [2, 12],
      desc: '블록으로 세운 성이 나보다 컸습니다. 무너뜨리는 순간도 설계의 일부였습니다.',
      need: function (s) { return !!s.flags['블록_씨앗']; } },
    { id: 'wall_painter', emoji: '🎨', name: '벽지 화가', kind: '칭호', ages: [2, 13],
      desc: '거실 벽지가 내 캔버스였습니다. 부모님은 화를 내면서도 사진을 찍어 두었습니다.',
      need: function (s) { return !!s.flags['그림_씨앗']; } },
    { id: 'soccer_kid', emoji: '⚽', name: '운동장 축구왕', kind: '칭호', ages: [7, 19],
      desc: '쉬는 시간 종이 울리면 교실에서 제일 먼저 운동장으로 나갔습니다.',
      need: function (s) { return !!s.flags['축구부'] || !!s.flags['공놀이_씨앗']; } },
    { id: 'bookworm', emoji: '📖', name: '책벌레', kind: '칭호', ages: [8, 19],
      desc: '사서 선생님이 내 이름을 외웠습니다. 책장 한 칸을 통째로 읽어 버렸습니다.',
      need: function (s) { return !!s.flags['책벌레']; } },
    { id: 'talker', emoji: '🗣️', name: '말발 좋은 아이', kind: '칭호', ages: [2, 13],
      desc: '어른들 앞에서도 말이 막히지 않았습니다. 가끔은 말이 너무 많다는 소리를 들었습니다.',
      need: function (s) { return !!s.flags['말재주_씨앗']; } },
    { id: 'stage_kid', emoji: '🎤', name: '교실 마이크', kind: '칭호', ages: [4, 19],
      desc: '학예회 무대에 서면 다리가 떨리지 않았습니다. 조명이 오히려 편했습니다.',
      need: function (s) { return !!s.flags['무대_씨앗'] || !!s.flags['발표_자신감']; } },
    { id: 'math_genius', emoji: '🧮', name: '암산 천재', kind: '칭호', ages: [5, 13],
      desc: '계산기를 앞에 두고도 머릿속으로 먼저 답을 냈습니다. 손가락이 필요 없었습니다.',
      need: function (s) { return !!s.flags['숫자_씨앗'] && s.stats.mental >= 65; } },
    { id: 'fixer', emoji: '🔧', name: '만능 수리왕', kind: '칭호', ages: [4, 16],
      desc: '고장 난 장난감을 버리지 않고 뜯어 고쳤습니다. 나사 하나가 남는 날도 있었습니다.',
      need: function (s) { return !!s.flags['조립_씨앗']; } },
    { id: 'taekwon', emoji: '🥋', name: '태권 소년', kind: '칭호', ages: [5, 16],
      desc: '도장 앞에서 큰 소리로 인사하는 게 하루의 시작이었습니다.',
      need: function (s) { return !!s.flags['태권도']; } },
    { id: 'bestie', emoji: '💛', name: '단짝', kind: '인연', ages: [8, 19],
      desc: '우산 하나를 같이 쓰고 집에 갔습니다. 지금도 그 친구의 웃음소리를 기억합니다.',
      need: function (s) { return !!s.flags['단짝']; } },
    { id: 'class_president', emoji: '🏛️', name: '반장', kind: '칭호', ages: [9, 19],
      desc: '칠판을 지우고, 줄을 세우고, 선생님의 심부름을 했습니다. 이름이 불릴 일이 많았습니다.',
      need: function (s) { return !!s.flags['학생회']; } },
    { id: 'first_love', emoji: '💌', name: '첫사랑', kind: '인연', ages: [12, 19],
      desc: '편지를 쓰다가 세 번 찢었습니다. 결국 전하지 못한 문장이 더 오래 남았습니다.',
      need: function (s) { return !!s.flags['첫사랑_기억']; } },
    { id: 'gamer', emoji: '🎮', name: '게임고수', kind: '칭호', ages: [10, 19],
      desc: '오락실 기계 앞에 내 이름 석 자가 올라갔습니다. 1등 기록은 한 달을 갔습니다.',
      need: function (s) { return !!s.flags['게임고수']; } },
    { id: 'front_row', emoji: '📍', name: '앞자리 지킴이', kind: '칭호', ages: [8, 19],
      desc: '칠판 글씨가 또렷이 보이는 자리, 그리고 성적표의 숫자도 또렷해졌습니다.',
      need: function (s) { return !!s.flags['앞자리'] && !!s.flags['성적_상승']; } },
    { id: 'cheater', emoji: '🕵️', name: '몰래 훔쳐본 자', kind: '칭호', ages: [8, 19],
      desc: '받아쓰기 시간, 옆자리 답이 눈에 들어왔습니다. 들키지는 않았지만 마음은 들켰습니다.',
      need: function (s) { return !!s.flags['커닝_경험']; } },
    { id: 'star_student', emoji: '🌟', name: '수능 명문', kind: '칭호', ages: [19, 19],
      desc: '수험표를 들고 나온 날, 학교 정문에서 이름이 불렸습니다.',
      need: function (s) { return !!s.flags['수능_명문']; } }
  ];

  var BY_ID = {};
  LIST.forEach(function (t) { BY_ID[t.id] = t; });

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

  // 이 브라우저에 쌓인 해금 기록 (id → { at, age, month, name })
  function owned() { return read(); }

  function has(id) { return !!read()[id]; }

  function progress() {
    var map = read();
    var got = LIST.filter(function (t) { return !!map[t.id]; }).length;
    return { got: got, total: LIST.length, pct: Math.round((got / LIST.length) * 100) };
  }

  /* 지금 상태에서 새로 해금된 칭호를 돌려주고, 기록에 남긴다.
     한 판에서 조건을 만족한 순간(선택 직후)에만 불린다. */
  function check(state) {
    if (!state || !state.flags || typeof state.age !== 'number') return [];
    var map = read();
    var out = [];
    LIST.forEach(function (t) {
      if (map[t.id]) return;
      if (state.age < t.ages[0] || state.age > t.ages[1]) return;
      var ok = false;
      try { ok = !!t.need(state); } catch (e) { ok = false; }
      if (!ok) return;
      map[t.id] = {
        at: Date.now(),
        age: state.age,
        month: state.month,
        name: state.name || '',
        // 어느 판에서 딴 칭호인가 — 엔딩 결과 카드가 '이번 인생의 칭호'만 골라 쓴다
        run: state.createdAt || null
      };
      out.push(t);
    });
    if (out.length) write(map);
    return out;
  }

  function reset() { write({}); }

  global.TitleBook = {
    KEY: KEY,
    LIST: LIST,
    byId: function (id) { return BY_ID[id] || null; },
    owned: owned,
    has: has,
    progress: progress,
    check: check,
    reset: reset
  };
})(typeof window !== 'undefined' ? window : globalThis);
