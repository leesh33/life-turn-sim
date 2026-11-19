/* ─────────────────────────────────────────────
   events/cameo.js — 🧬 이전 회차 인물 (공유 세계관)
   ─────────────────────────────────────────────
   명예의 전당에 남은 '내가 살았던 인생'의 인물이 다음 인생의 세계에 나타난다.
   · state.cameos 가 비어 있으면(이전 회차가 없으면) 이 파일의 이벤트는 하나도 나오지 않는다.
   · 관계 진행: none → friend(친구) → close(단짝) / dating(연인) → married(부부), 또는 parted.
     진행은 선택지의 cameoRel 로만 바뀌고, 되는지는 지금 능력치(LifeChance)로 가른다.
   · 이름·기록은 전당 기록에서 온다 — 카드 위 🧬 안내줄이 그 사람의 지난 인생을 보여 준다.
   ───────────────────────────────────────────── */
(function (global) {
  'use strict';

  var Life = global.Life;

  function lead(s) { return Life.cameoOf(s, 0); }
  function rel(s) { var c = lead(s); return c ? c.rel : null; }
  function nameOf(s) { var c = lead(s); return c ? c.name : '그 사람'; }
  function vibeOf(s) { var n = Life.cameoNote(s); return n && n.vibe ? n.vibe : ''; }
  function pass(s, spec) { return !!(global.LifeChance && global.LifeChance.check(s, spec)); }

  // 판정 기준 — 스탯 가중치의 합이 1을 넘지 않게 두고, 통과선은 60 전후
  var MEET = { social: 0.5, charm: 0.3, base: 20, pass: 60 };     // 먼저 다가가기
  var ROMANCE = { charm: 0.45, social: 0.35, luck: 0.2, base: 10, pass: 62 }; // 마음이 통하기
  var PROMISE = { charm: 0.35, social: 0.35, mental: 0.2, base: 12, pass: 60 }; // 함께 살기로

  /* ═══════════ ① 처음 만나는 자리 (학창·대학·직장·동네) ═══════════
     rel 이 'none' 일 때만. 시작 나이가 어디든 한 번은 만나게 나이대별로 둔다. */

  X('elementary', 'cm_meet_elementary', [9, 10], '교실', '옆자리 이름표',
    function (s) {
      var c = lead(s);
      if (!c) return '새 학기 자리 배치가 끝났습니다.';
      return '새 학기 자리 배치. 옆자리에 앉은 아이의 이름표가 눈에 들어옵니다. ‘' + c.name + '’. ' +
        (vibeOf(s) ? vibeOf(s) + '라는 말이 벌써 돌고 있습니다. ' : '') +
        '처음 보는 얼굴인데, 어디서 들어본 이름 같습니다.';
    },
    [
      ['먼저 말을 걸어본다',
        function (s) {
          return pass(s, MEET)
            ? '“같이 앉아도 돼?”라고 먼저 말했습니다. ' + nameOf(s) + '이 웃으면서 고개를 끄덕였습니다. 쉬는 시간에 복도를 나란히 걸었습니다.'
            : '용기를 냈지만 목소리가 작았습니다. 아이는 못 들은 척 고개를 돌렸습니다. 다음 날 다시 인사를 했습니다.';
        },
        function (s) { return pass(s, MEET) ? { social: 3, mental: 1 } : { social: -1, mental: -2 }; },
        null, null, { cameoRel: function (s) { return pass(s, MEET) ? 'friend' : null; } }],
      ['이름만 기억해 둔다', '이름표를 한 번 더 읽었습니다. 그날은 그걸로 끝이었습니다.', { intel: 1 }]
    ], { cameo: true, weight: 8, when: function (s) { return rel(s) === 'none'; } });

  X('middle', 'cm_meet_middle', [14, 15], '교실', '같은 모둠',
    function (s) {
      var c = lead(s);
      if (!c) return '모둠이 짜였습니다.';
      return '모둠이 짜였습니다. 명단에 ‘' + c.name + '’이 있습니다. ' +
        (vibeOf(s) ? vibeOf(s) + '라는 소문이 있습니다. ' : '') +
        '이름을 부르려는데 자꾸 말이 헛나옵니다.';
    },
    [
      ['먼저 자기소개를 한다',
        function (s) {
          return pass(s, MEET)
            ? '모둠 앞에서 먼저 말했습니다. ' + nameOf(s) + '이 “나도 그렇게 생각했어”라고 받아 주었습니다. 과제는 이상하게 잘 굴러갔습니다.'
            : '말이 길어졌습니다. 다들 웃었고, 나는 얼굴이 빨개졌습니다. 그래도 이름은 기억했습니다.';
        },
        function (s) { return pass(s, MEET) ? { social: 3, intel: 1 } : { social: -1, mental: -1 }; },
        null, null, { cameoRel: function (s) { return pass(s, MEET) ? 'friend' : null; } }],
      ['자료 조사만 맡는다', '도서관에서 자료를 모았습니다. 말수는 적었지만 필요한 건 다 있었습니다.', { intel: 2, social: -1 }]
    ], { cameo: true, weight: 8, when: function (s) { return rel(s) === 'none'; } });

  X('high', 'cm_meet_high', [17, 18], '급식실', '급식 줄 앞자리',
    function (s) {
      var c = lead(s);
      if (!c) return '급식 줄이 길어졌습니다.';
      return '급식 줄이 길어졌습니다. 앞사람의 이름표가 보입니다. ‘' + c.name + '’. ' +
        (vibeOf(s) ? vibeOf(s) + '라는 이야기가 있습니다. ' : '') +
        '야자 끝나고도 같은 시간에 같은 버스를 탔다는 걸 나중에 알았습니다.';
    },
    [
      ['먼저 말을 건다',
        function (s) {
          return pass(s, MEET)
            ? '“이거 먹어 봤어?”라고 물었습니다. ' + nameOf(s) + '이 자기 반찬을 바꿔 주었습니다. 그날부터 급식 줄이 짧게 느껴졌습니다.'
            : '갑자기 걸린 목소리에 아이가 어색하게 웃었습니다. 줄은 금방 줄었습니다.';
        },
        function (s) { return pass(s, MEET) ? { social: 3, mental: 1 } : { social: -1, mental: -1 }; },
        null, null, { cameoRel: function (s) { return pass(s, MEET) ? 'friend' : null; } }],
      ['조용히 기다린다', '배식을 받아 자리에 앉았습니다. 그날은 말을 섞지 않았습니다.', { mental: 1 }]
    ], { cameo: true, weight: 8, when: function (s) { return rel(s) === 'none'; } });

  X('college', 'cm_meet_college', [20, 21], '강당', '오리엔테이션 명찰',
    function (s) {
      var c = lead(s);
      if (!c) return '오리엔테이션 조가 짜였습니다.';
      return '신입생 오리엔테이션, 같은 조가 되었습니다. 명찰에 ‘' + c.name + '’. ' +
        (vibeOf(s) ? vibeOf(s) + '라는 인상입니다. ' : '') +
        '고등학교 때 어딘가에서 마주친 것 같은 이름입니다.';
    },
    [
      ['먼저 자기소개를 한다',
        function (s) {
          return pass(s, MEET)
            ? '이름과 사는 곳을 말했습니다. ' + nameOf(s) + '이 “우리 동네네”라고 했습니다. 그날 저녁 같이 밥을 먹었습니다.'
            : '준비한 말이 다 날아갔습니다. 아이는 고개만 끄덕였습니다. 자리는 어색하게 끝났습니다.';
        },
        function (s) { return pass(s, MEET) ? { social: 3, mental: 2 } : { social: -1, mental: -2 }; },
        null, null, { cameoRel: function (s) { return pass(s, MEET) ? 'friend' : null; } }],
      ['조용히 앉아 있는다', '조 이름만 적고 나왔습니다. 다음 주에 다시 만나면 그때 이야기하기로 했습니다.', { mental: 1 }]
    ], { cameo: true, weight: 8, when: function (s) { return rel(s) === 'none'; } });

  X('work', 'cm_meet_work', [25, 26], '사무실', '옆 부서 이름표',
    function (s) {
      var c = lead(s);
      if (!c) return '옆 부서에 새 사람이 왔습니다.';
      return '옆 부서에 새 사람이 왔습니다. 책상 위 이름표가 ‘' + c.name + '’. ' +
        (vibeOf(s) ? vibeOf(s) + '라는 이야기가 돌았습니다. ' : '') +
        '처음 보는 얼굴인데 왜 이렇게 낯익은지 모르겠습니다.';
    },
    [
      ['점심을 같이 먹자고 한다',
        function (s) {
          return pass(s, MEET)
            ? '구내식당에서 마주 앉았습니다. 회사 이야기보다 사는 이야기를 더 했습니다. ' + nameOf(s) + '이 먼저 웃었습니다.'
            : '타이밍이 늦었습니다. 이미 자리가 있었습니다. 다음 기회를 기약했습니다.';
        },
        function (s) { return pass(s, MEET) ? { social: 3, mental: 2 } : { social: -1, mental: -1 }; },
        null, null, { cameoRel: function (s) { return pass(s, MEET) ? 'friend' : null; } }],
      ['인사만 하고 지나간다', '고개를 숙였습니다. 이름표만 기억에 남았습니다.', { mental: 1 }]
    ], { cameo: true, weight: 8, when: function (s) { return rel(s) === 'none'; } });

  X('family', 'cm_meet_family', [36, 37], '엘리베이터', '윗집에서 온 사람',
    function (s) {
      var c = lead(s);
      if (!c) return '윗집에 새 사람이 이사 왔습니다.';
      return '엘리베이터에서 마주친 사람이 먼저 고개를 숙입니다. 명패에 ‘' + c.name + '’. ' +
        (vibeOf(s) ? vibeOf(s) + '라는 인상을 줍니다. ' : '') +
        '윗집으로 이사 온 사람입니다. 이 동네에서 처음 보는 얼굴입니다.';
    },
    [
      ['이사 짐을 도와주겠다고 한다',
        function (s) {
          return pass(s, MEET)
            ? '박스를 세 개 옮겼습니다. ' + nameOf(s) + '이 물 한 잔을 건넸습니다. 그날부터 엘리베이터에서 이야기가 길어졌습니다.'
            : '짐은 이미 다 들어가 있었습니다. 괜히 어색하게 서 있었습니다.';
        },
        function (s) { return pass(s, MEET) ? { social: 3, hp: -1, mental: 2 } : { social: -2, mental: -1 }; },
        null, null, { cameoRel: function (s) { return pass(s, MEET) ? 'friend' : null; } }],
      ['목례만 하고 지나간다', '층이 다를 뿐인 이웃입니다. 그날은 그걸로 충분했습니다.', { mental: 1 }]
    ], { cameo: true, weight: 8, when: function (s) { return rel(s) === 'none'; } });

  /* ═══════════ ② 소개팅 — 한 번도 만나지 못했을 때의 두 번째 길 ═══════════ */

  X('work', 'cm_blinddate', [27, 32], '카페', '소개팅 자리',
    function (s) {
      var c = lead(s);
      if (!c) return '소개팅 자리가 잡혔습니다.';
      return '친구가 사람을 소개해 준다고 합니다. 이름은 ‘' + c.name + '’. ' +
        (vibeOf(s) ? '친구 말로는 ' + vibeOf(s) + '라고 합니다. ' : '') +
        '들어본 이름이라 혼자 웃음이 났습니다.';
    },
    [
      ['자리에 나가 본다',
        function (s) {
          return pass(s, ROMANCE)
            ? '첫인사부터 어색하지 않았습니다. 두 시간이 십 분처럼 지나갔습니다. ' + nameOf(s) + '이 “또 봐요”라고 먼저 말했습니다.'
            : '대화가 자꾸 끊겼습니다. 서로 웃었지만 연락으로는 이어지지 않았습니다.';
        },
        function (s) { return pass(s, ROMANCE) ? { social: 3, charm: 2, mental: 2 } : { mental: -2, social: -1 }; },
        null, null, { cameoRel: function (s) { return pass(s, ROMANCE) ? 'dating' : null; } }],
      ['정중히 사양한다', '친구에게 미안하다고 했습니다. 그날은 일찍 잠들었습니다.', { mental: 1, social: -1 }]
    ], { cameo: true, weight: 7, excludeFlags: '결혼', when: function (s) { return rel(s) === 'none'; } });

  /* ═══════════ ③ 다시 만난 친구 → 연인 ═══════════ */

  X('work', 'cm_reunion', [27, 31], '식당', '몇 년 만의 연락',
    function (s) {
      return '동창 모임 단톡방에 초대가 왔습니다. 명단에 ‘' + nameOf(s) + '’이 있습니다. ' +
        (rel(s) === 'close' ? '오랜 단짝입니다. ' : '학교 때부터 알던 사이입니다. ') +
        '몇 년 만에 얼굴을 봅니다.';
    },
    [
      ['따로 만나 보자고 한다',
        function (s) {
          return pass(s, ROMANCE)
            ? '모임이 끝나고 둘이 남아 한 시간을 더 이야기했습니다. ' + nameOf(s) + '이 “다음 주에도 시간 돼?”라고 물었습니다.'
            : '말은 꺼냈지만 상대는 웃기만 했습니다. 다음 약속은 잡히지 않았습니다.';
        },
        function (s) { return pass(s, ROMANCE) ? { social: 3, mental: 3 } : { social: -1, mental: -1 }; },
        null, null, { cameoRel: function (s) { return pass(s, ROMANCE) ? 'dating' : 'close'; } }],
      ['그날 이야기로 만족한다',
        '그 시절 이야기만 세 시간 했습니다. 집에 오는 길에 발걸음이 가벼웠습니다.',
        { mental: 3, social: 2 }, null, null, { cameoRel: 'close' }]
    ], { cameo: true, weight: 7, excludeFlags: '결혼',
      when: function (s) { return (rel(s) === 'friend' || rel(s) === 'close') && Life.cameoCanRomance(s); } });

  // 이성으로 이어질 수 없을 때(같은 성별·성별 미상)는 단짝 갈래로 깊어진다
  X('work', 'cm_bestfriend', [29, 34], '주말', '오랜 친구의 제안',
    function (s) {
      return '‘' + nameOf(s) + '’에게서 오랜만에 연락이 왔습니다. 이번 주말에 같이 가 보고 싶은 데가 있다고 합니다. ' +
        (rel(s) === 'close' ? '요즘도 일주일에 한 번은 연락하는 사이입니다.' : '학교 때 이후로는 자주 못 봤습니다.');
    },
    [
      ['같이 다녀온다', '하루를 통째로 걸었습니다. 돌아오는 차에서 각자 사는 이야기를 다 했습니다.', { social: 3, mental: 3 },
        null, null, { cameoRel: 'close' }],
      ['다음으로 미룬다', '사정을 말하고 미뤘습니다. 상대는 “언제든”이라고 했습니다.', { social: -1, mental: 1 }]
    ], { cameo: true, weight: 6,
      when: function (s) { return rel(s) === 'friend' && !Life.cameoCanRomance(s); } });

  /* ═══════════ ④ 진지한 사이 — 결혼 / 이별 ═══════════ */

  X('work', 'cm_deepen', [32, 34], '집 앞', '미래를 이야기하는 밤',
    function (s) {
      return '‘' + nameOf(s) + '’과 만난 지 두 해가 넘었습니다. 오늘은 이야기가 자꾸 내일, 그다음으로 넘어갑니다. ' +
        '집은 어디로 할지, 명절은 어떻게 보낼지, 그런 이야기를 합니다.';
    },
    [
      ['진심으로 미래를 이야기한다',
        function (s) {
          return pass(s, PROMISE)
            ? '“같이 살자”는 말이 먼저 나왔습니다. ' + nameOf(s) + '이 한참 말이 없다가 고개를 끄덕였습니다. 양가에 인사를 드렸습니다.'
            : '말은 꺼냈지만 대답이 바로 오지 않았습니다. “조금만 더 생각해 볼게”라는 말로 밤이 끝났습니다.';
        },
        function (s) { return pass(s, PROMISE) ? { mental: 4, social: 4, charm: 1, asset: -300 } : { mental: -2, social: 1 }; },
        null, null, { cameoRel: function (s) { return pass(s, PROMISE) ? 'married' : 'dating'; } }],
      ['아직은 각자의 시간을 갖기로 한다',
        '서두르지 않기로 했습니다. 대신 서로의 일주일을 더 자세히 알게 되었습니다.',
        { mental: 2, intel: 1 }, null, null, { cameoRel: 'dating' }]
    ], { cameo: true, weight: 7, excludeFlags: '결혼', when: function (s) { return rel(s) === 'dating'; } });

  X('work', 'cm_breakup', [31, 34], '늦은 밤', '어긋나기 시작한 시간',
    function (s) {
      return '‘' + nameOf(s) + '’과의 약속이 이번 달에 세 번 미뤄졌습니다. 서로 바쁜 건 알지만, 바쁘다는 말이 대화의 전부가 되었습니다.';
    },
    [
      ['충분히 이야기하고 서로를 이해해 본다',
        '새벽 두 시까지 이야기했습니다. 서운했던 것을 다 말하고 나니 방이 조금 넓어졌습니다.',
        { mental: 3, social: 2 }, null, null, { cameoRel: 'dating' }],
      ['각자의 길을 가기로 한다',
        '마지막 인사를 하고 돌아왔습니다. 연락처는 지우지 않았습니다.',
        { mental: -3, social: 1, charm: 1 }, null, null, { cameoRel: 'parted' }]
    ], { cameo: true, weight: 6, excludeFlags: '결혼', when: function (s) { return rel(s) === 'dating'; } });

  X('family', 'cm_married_life', [41, 47], '집', '같이 사는 하루',
    function (s) {
      return '퇴근하고 돌아오니 ‘' + nameOf(s) + '’이 저녁을 차리고 있습니다. ' +
        '결혼 전에는 몰랐던 습관들이 이제는 집 안의 풍경이 되었습니다. 오늘은 그게 조금 고맙습니다.';
    },
    [
      ['먼저 손을 잡는다', '설거지를 대신하고 손을 잡았습니다. 별말 없이 웃었습니다.', { social: 3, mental: 3 }],
      ['오늘은 각자 시간을 갖는다', '각자 방에서 조용히 시간을 보냈습니다. 그런 날도 필요합니다.', { mental: 2, hp: 1 }]
    ], { cameo: true, weight: 5, when: function (s) { return rel(s) === 'married'; } });

  /* ═══════════ ⑤ 오래된 인연 ═══════════ */

  X('midlife', 'cm_friend_later', [50, 58], '식당', '오랜 친구의 저녁',
    function (s) {
      return '‘' + nameOf(s) + '’이 오랜만에 전화를 했습니다. “한 잔 하자”는 말에 시간을 냈습니다. ' +
        '서로 머리가 하얘진 걸 보고 한참 웃었습니다.';
    },
    [
      ['만나서 저녁을 먹는다', '두 시간을 이야기했습니다. 집에 오는 길에 옛날 노래를 찾아 들었습니다.', { mental: 3, social: 3, asset: -50 }],
      ['다음에 보기로 한다', '일정이 맞지 않았습니다. “꼭 보자”는 말만 남겼습니다.', { mental: 1 }]
    ], { cameo: true, weight: 5, when: function (s) { return rel(s) === 'friend' || rel(s) === 'close'; } });

  X('senior', 'cm_senior', [66, 76], '집', '창밖을 같이 보는 사람',
    function (s) {
      var c = lead(s);
      if (!c) return '오래된 인연이 떠올랐습니다.';
      if (c.rel === 'married') return '‘' + c.name + '’과 창밖을 같이 봅니다. 벌써 이만큼 왔습니다. 말없이 앉아 있어도 하루가 갑니다.';
      if (c.rel === 'close' || c.rel === 'friend') return '‘' + c.name + '’이 찾아왔습니다. 서로 약 봉지를 들고 웃었습니다. 오래된 친구는 설명이 필요 없습니다.';
      if (c.rel === 'parted') return '소식지에서 ‘' + c.name + '’의 이름을 봤습니다. 오랜만에 전화를 걸었습니다. 목소리는 그대로였습니다.';
      return '‘' + c.name + '’이 마당에 앉아 있습니다. 한때 마음이 향했던 사람입니다. 지금은 그저 오래된 사람입니다.';
    },
    [
      ['손을 잡는다', '손을 잡았습니다. 손등의 주름이 서로 달랐습니다. 그게 좋았습니다.', { social: 4, mental: 3 }],
      ['이야기를 나눈다', '그 시절 이름들을 하나씩 꺼냈습니다. 몇 명은 이미 세상에 없습니다.', { mental: 4, social: 1 }]
    ], { cameo: true, weight: 6, when: function (s) { var c = lead(s); return !!c && c.rel !== 'none'; } });

  /* ═══════════ ⑥ 이전 인물이 여럿일 때 ═══════════ */

  X('work', 'cm_all_together', [29, 34], '모임', '명단에 익숙한 이름들',
    function (s) {
      var list = (s.cameos || []).map(function (c) { return '‘' + c.name + '’'; });
      var who = list.slice(0, 3).join(', ');
      return '모임 명단에 낯익은 이름이 여럿 있습니다. ' + who + '. ' +
        '각자 다른 인생을 살았는데, 이 자리에서 다시 만났습니다.';
    },
    [
      ['한 사람 한 사람 인사한다',
        '이름을 하나씩 부르며 인사했습니다. 기억하는 사람이 생각보다 많았습니다.',
        { social: 4, mental: 2, asset: -30 }],
      ['먼저 온 사람 옆에 앉는다',
        '한 사람과만 깊게 이야기했습니다. 나머지에게는 다음을 기약했습니다.',
        { mental: 2, social: 1 }]
    ], { cameo: true, weight: 5, when: function (s) { return Array.isArray(s.cameos) && s.cameos.length >= 2; } });
})(typeof window !== 'undefined' ? window : globalThis);
