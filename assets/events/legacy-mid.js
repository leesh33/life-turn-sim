/* ─────────────────────────────────────────────
   content.mid.js — 중학교(14~16) · 고등학교(17~19) · 대학교(20~24)
   ───────────────────────────────────────────── */
window.LIFE_EVENTS = (window.LIFE_EVENTS || []).concat([

  /* ══════════════ 14세 — 중학교 입학 ══════════════ */
  {
    id: 'middle_enter', stage: 'middle', at: [14, 1], place: '중학교', milestone: true, weight: 6,
    title: '중학교 입학',
    text: '교복을 입고 교문을 들어섰습니다. 초등학교 때보다 세 배는 큰 학교입니다.\n반 배정 명단 앞에 섰습니다.',
    choices: [
      { label: '아는 얼굴을 찾아 먼저 인사한다', result: '두 명이 손을 흔들었습니다. 첫날의 인사는 3년을 바꿉니다.', effects: { social: 3, mental: 2 }, set: { 중학생: true } },
      { label: '조용히 자리를 잡는다', result: '관찰자로 시작했습니다. 누가 어떤 아이인지 빨리 파악했습니다.', effects: { mental: 2, charm: 1 }, set: { 중학생: true, 관찰자: true } },
      { label: '일부러 맨 뒤에 앉는다', result: '눈에 안 띄는 게 편합니다. 하지만 선생님은 뒷자리부터 외웁니다.', effects: { mental: 1, social: -1 }, set: { 중학생: true } }
    ]
  },
  {
    id: 'hair_rule', stage: 'middle', at: [14, 3], place: '교실',
    title: '두발 규정',
    text: '학생회가 두발 규정을 없애자는 운동을 시작했습니다. 선생님은 "아직은 안 된다"는 입장입니다.',
    choices: [
      { label: '서명 운동에 참여한다', result: '결국 규정이 완화됐습니다. 처음으로 목소리를 내서 세상을 바꿔봤습니다.', effects: { social: 3, mental: 2, charm: 2 }, set: { 활동가: true } },
      { label: '조용히 머리를 자른다', result: '별일 없이 지나갔습니다. 대신 형식적인 규칙에 익숙해졌습니다.', effects: { mental: 1, social: -1 } }
    ]
  },
  {
    id: 'middle_friend_group', stage: 'middle', at: [14, 6], place: '급식실',
    title: '무리 정하기',
    text: '점심시간입니다. 두 테이블에서 손짓합니다. 한쪽은 공부하는 아이들, 다른 쪽은 노는 아이들입니다.',
    choices: [
      { label: '공부하는 쪽에 앉는다', result: '시험 기간에 서로 문제를 냅니다. 성적이 오릅니다.', effects: { mental: 3, social: 2 }, set: { 우등생_친구: true } },
      { label: '노는 쪽에 앉는다', result: '웃을 일이 많아졌습니다. 대신 숙제 검사 날이 두려워집니다.', effects: { charm: 2, social: 3, mental: -1 } },
      { label: '혼자 먹는다', result: '도서관에서 책을 읽었습니다. 편했지만 외롭기도 했습니다.', effects: { mental: 2, social: -2, charm: 1 } }
    ]
  },
  {
    id: 'track_choice', stage: 'middle', at: [15, 2], place: '진로 상담실', milestone: true, weight: 5,
    title: '문과 · 이과 선택',
    text: '고등학교 진학을 앞두고 계열을 정해야 합니다. 선생님이 "네가 좋아하는 게 뭐냐"고 묻습니다.',
    choices: [
      { label: '문과 — 글로 하는 일', result: '국어와 사회가 손에 잡히기 시작했습니다. 말과 글의 세계로 들어섭니다.', effects: { mental: 2, charm: 2 }, set: { 문과: true } },
      { label: '이과 — 숫자로 하는 일', result: '수학 문제 하나가 세 시간을 잡아먹지만, 풀리면 세상이 깔끔해집니다.', effects: { mental: 3, hp: -1 }, set: { 이과: true } },
      { label: '아직 모르겠다 — 성적으로 정한다', result: '결국 성적이 좋은 쪽을 골랐습니다. 조금은 남의 결정입니다.', effects: { mental: 1, social: 1 }, set: { 문과: true, 진로_미정: true } }
    ]
  },
  {
    id: 'first_rank', stage: 'middle', at: [15, 4], place: '교실',
    title: '첫 시험 등수',
    text: '중간고사 성적표가 나왔습니다. 280명 중 96등입니다. 반에서는 12등.',
    choices: [
      { label: '학원을 하나 더 늘린다', result: '시간이 빡빡해졌지만 3개월 뒤 60등이 됐습니다.', effects: { mental: -1, hp: -2, asset: -30 }, set: { 성적_상승: true } },
      { label: '지금이 딱 좋다고 생각한다', result: '주말에 영화를 봤습니다. 성적은 그대로, 표정은 밝아졌습니다.', effects: { mental: 3, social: 1 } }
    ]
  },
  {
    id: 'homeroom_talk', stage: 'middle', at: [15, 7], place: '교무실',
    title: '담임 선생님과의 대화',
    text: '선생님이 "너는 어떤 어른이 되고 싶냐"고 물으십니다. 그런 걸 생각해본 적이 없습니다.',
    choices: [
      { label: '돈 많이 버는 사람', result: '선생님이 웃었습니다. "솔직한데, 조금 심심한 답이네."', effects: { mental: 1, asset: 0 }, set: { 목표_돈: true } },
      { label: '재밌는 일을 하는 사람', result: '"그게 제일 어려운 일이야." 선생님 말이 오래 남았습니다.', effects: { mental: 2, charm: 1 }, set: { 목표_재미: true } },
      { label: '아직 모르겠습니다', result: '"천천히 찾아도 돼." 그 말이 왠지 안심이 됐습니다.', effects: { mental: 2 } }
    ]
  },
  {
    id: 'game_rank', stage: 'middle', at: [15, 9], when: function (s) { return s.flags.게이머; }, place: '내 방',
    title: '랭크 게임',
    text: '친구들이 "랭크 같이 하자"고 합니다. 밤 11시, 시험은 3주 남았습니다.',
    choices: [
      { label: '새벽까지 한다', result: '플래티넘이 됐습니다. 시험은 30등 떨어졌습니다.', effects: { mental: 3, hp: -2, social: 2 } },
      { label: '한 판만 하고 잔다', result: '친구들이 아쉬워했지만 다음 날 컨디션이 달랐습니다.', effects: { mental: 1, hp: 1 } }
    ]
  },
  {
    id: 'volunteer_hours', stage: 'middle', at: [16, 6], place: '동네 도서관',
    title: '봉사활동',
    text: '봉사활동 시간이 필요합니다. 도서관 정리, 지역아동센터 학습 도우미, 환경 정화 중에 고르라고 합니다.',
    choices: [
      { label: '지역아동센터 학습 도우미', result: '초등학생에게 수학을 가르쳤습니다. 설명하는 법을 배웠습니다.', effects: { mental: 2, social: 3, charm: 1 } },
      { label: '환경 정화 활동', result: '하천에서 쓰레기를 주웠습니다. 등이 아팠지만 하루가 뿌듯했습니다.', effects: { hp: -1, mental: 2, social: 2 } },
      { label: '도서관 서가 정리', result: '조용한 봉사. 책 제목을 다 외우게 됐습니다.', effects: { mental: 2, social: 1 } }
    ]
  },
  {
    id: 'class_vote', stage: 'middle', at: [16, 4], place: '교실',
    title: '인기투표',
    text: '장기자랑 시간입니다. 반에서 "누가 제일 인기 많냐" 투표를 한다고 합니다. 나는 후보에 없습니다.',
    choices: [
      { label: '웃으면서 넘긴다', result: '아무도 내 표정이 굳은 걸 눈치채지 못했습니다.', effects: { mental: -2, social: 1 } },
      { label: '장기자랑에 나가 판을 뒤집는다', result: function (s) { return s.flags.무대체질 || s.flags.반장 ? '노래 한 곡으로 분위기를 다 가져왔습니다. 결과가 바뀌었습니다.' : '음이 조금 나갔지만 웃음은 나왔습니다. 다음날 누군가 흉내를 냈습니다.'; },
        effects: { charm: 3, social: 3, mental: 1 } }
    ]
  },
  {
    id: 'family_trip', stage: 'middle', at: [16, 11], place: '제주도',
    title: '가족 여행',
    text: '아빠가 갑자기 "겨울에 제주도 가자"고 합니다. 숙소를 알아보니 비싸고, 나는 친구들과 약속이 있습니다.',
    choices: [
      { label: '가족 여행을 간다', result: '렌터카에서 세 시간을 돌았습니다. 가족 사진이 단체 채팅방 배경이 됐습니다.', effects: { social: 3, mental: 2, asset: -60 } },
      { label: '친구들과 약속을 지킨다', result: '부모님이 둘만 다녀왔습니다. 단톡방에 올라온 감귤 사진이 조금 서운했습니다.', effects: { social: 2, mental: -1, asset: 30 } }
    ]
  },
  {
    id: 'mid_academy', stage: 'middle', minAge: 14, maxAge: 16, repeatable: true, place: '학원',
    title: '학원 자습실',
    text: '자습실 창가 자리가 비었습니다. 창밖은 벌써 여름입니다.',
    choices: [
      { label: '문제집을 한 권 더 푼다', result: '손목이 아프지만 진도가 나갑니다.', effects: { mental: 2, hp: -1 } },
      { label: '폰으로 영상이나 본다', result: '한 시간이 사라졌습니다. 기분은 좀 나아졌습니다.', effects: { mental: 1, hp: 1, social: -1 } }
    ]
  },

  /* ══════════════ 17세 — 고등학교 입학 ══════════════ */
  {
    id: 'high_enter', stage: 'high', at: [17, 1], place: '고등학교', milestone: true, weight: 6,
    title: '고등학교 입학',
    text: '원서 결과가 나왔습니다. 세 선택지 눈앞에 있습니다.\n교복의 색에 따라 3년의 난이도가 달라진다고 합니다.',
    when: function (s) { return !s.flags.예고_준비 && !s.flags.체육고_준비; },
    choices: [
      { label: '특목고 · 자사고에 도전한다', result: '기숙사에 들어갑니다. 방학이 없어졌지만, 같이 크는 친구들이 생겼습니다.', effects: { mental: -1, hp: -2, social: 3 }, set: { 특목고: true, 고등학생: true } },
      { label: '집 앞 일반고에 간다', result: '걸어서 10분. 학교가 끝나면 바로 집입니다. 여유가 있습니다.', effects: { mental: 2, hp: 1, social: 2 }, set: { 일반고: true, 고등학생: true } },
      { label: '실업계로 간다', result: '기술을 배웁니다. 졸업 후 바로 일할 수 있는 길이 열립니다.', effects: { mental: 1, hp: 1, social: 2 }, set: { 실업계: true, 고등학생: true } }
    ]
  },
  {
    id: 'first_mock', stage: 'high', at: [17, 3], place: '고사실',
    title: '첫 모의고사',
    text: '첫 모의고사입니다. 3등급이 나왔습니다. 선생님이 "여기서 어떻게 하느냐가 갈린다"고 합니다.',
    choices: [
      { label: '오늘부터 새벽까지 한다', result: '불면의 3년이 시작됐습니다. 눈이 나빠졌습니다.', effects: { mental: -1, hp: -2, social: -1 }, set: { 야근러: true } },
      { label: '공부법을 먼저 바꾼다', result: '노트 정리를 바꿨습니다. 같은 시간에 두 배가 됩니다.', effects: { mental: 3, hp: 1 } },
      { label: '다른 길도 생각해 둔다', result: '진로과 선생님과 상담을 여러 번 했습니다. 마음이 조금 가벼워졌습니다.', effects: { mental: 2, social: 1 } }
    ]
  },
  {
    id: 'night_study', stage: 'high', minAge: 17, maxAge: 19, repeatable: true, place: '야자실 밤 10시',
    title: '야자실 밤 10시',
    text: '야자 3교시입니다. 앞자리에 아이는 엎드려 잤습니다. 나도 눈이 감깁니다.',
    choices: [
      { label: '찬물로 세수하고 계속한다', result: '두 시간을 더 앉았습니다. 집중은 반만 됐습니다.', effects: { mental: 1, hp: -2 }, set: { 야근러: true } },
      { label: '살짝 엎드려 잔다', result: '15분의 낮잠이 두 시간의 공부보다 나았습니다.', effects: { hp: 2, mental: -1 } }
    ]
  },
  {
    id: 'first_love', stage: 'high', at: [18, 3], place: '학교 앞 카페',
    title: '첫 연애',
    text: '같은 학교 아이와 요즘 자꾸 마주칩니다. 오늘 먼저 "같이 영화 볼래?"라는 문자가 왔습니다.',
    choices: [
      { label: '본다 — 지금이 아니면 언제', result: '첫 연애가 시작됐습니다. 공부가 잠깐 손에서 놓였습니다.', effects: { charm: 3, social: 2, mental: 2, asset: -20 }, set: { 첫연애: true } },
      { label: '수험생이니까 참는다', result: '그해 성적은 오르지 않았지만, 마음은 어딘가 켕겼습니다.', effects: { mental: -1, hp: 1 } }
    ]
  },
  {
    id: 'smoke_offer', stage: 'high', at: [18, 6], place: '건물 뒷골목',
    title: '담배 권유',
    text: '뒷골목에서 선배가 담배를 건넵니다. 거절하면 분위기가 어색해질 겁니다.',
    choices: [
      { label: '고맙지만 안 한다고 말한다', result: '잠깐 어색했지만 아무 일도 없었습니다. 다음에도 그러기로 했습니다.', effects: { hp: 1, mental: 2, social: -1 } },
      { label: '한 번만 받는다', result: '기침이 났습니다. 쉽게 시작하지만 쉽게 끊기지 않는다는 걸 배웁니다.', effects: { hp: -3, social: 2, mental: 1 }, set: { 흡연: true } }
    ]
  },
  {
    id: 'academy_fee', stage: 'high', at: [18, 9], place: '거실',
    title: '학원비 걱정',
    text: '저녁에 부모님이 조용히 이야기하고 있습니다. 이번 달 학원비와 카드값 이야기가 들립니다.',
    choices: [
      { label: '나가서 "학원 줄이겠다"고 말한다', result: '엄마가 "그러지 마" 하시며 더 신경 썼습니다. 그러나 마음은 무거웠습니다.', effects: { mental: -1, social: 3, asset: 40 } },
      { label: '들리지 않은 척한다', result: '아무 일도 없던 것처럼 다음 날 등원했습니다.', effects: { mental: -2 } },
      { label: '인강으로 바꾼다', result: '학원 2개를 정리했습니다. 자기 주도 학습이 시작됐습니다.', effects: { mental: 2, asset: 60, hp: 1 } }
    ]
  },
  {
    id: 'csat_d100', stage: 'high', at: [19, 3], place: '교실', milestone: true,
    title: '수능 D-100',
    text: '칠판에 D-100이 적혔습니다. 교실 공기가 달라졌습니다.\n나는 어떤 100일을 보낼까요?',
    choices: [
      { label: '올인한다 — 지금뿐이다', result: '하루 14시간 공부. 손목과 허리가 아팠지만 배우는 게 있었습니다.', effects: { mental: -2, hp: -3, social: -2 }, set: { 수능_올인: true } },
      { label: '리듬을 지킨다 — 잠은 7시간', result: '머리가 맑은 상태로 시험을 봤습니다.', effects: { mental: 2, hp: 1 } },
      { label: '반은 놓는다 — 체력도 성적이다', result: '학원도 줄이고 산책을 했습니다. 걱정과 여유 사이에 서 있습니다.', effects: { hp: 3, mental: 1, social: 1 } }
    ]
  },
  {
    id: 'csat_day', stage: 'high', at: [19, 9], place: '수능 시험장', milestone: true, weight: 6,
    title: '수능 당일',
    text: '아침 8시, 시험장입니다. 어머니가 포옹을 하고 "잘해"라고 했습니다.\n국어 시험지가 펼쳐집니다.',
    choices: [
      { label: '아는 문제부터 정확하게 푼다',
        result: function (s) {
          if (s.flags.특목고 || s.flags.수능_올인) return '손이 자동으로 움직였습니다. 예상보다 훨씬 잘 봤습니다. 이 성적으로는 상위권 대학도 노려볼 만합니다.';
          return '평소 실력보다 조금 잘 봤습니다. 운이 따라준 시험이었습니다.';
        },
        effects: { mental: 3, hp: -2 }, set: LifeAdmission.exclusive('수능_명문') },
      { label: '시간 배분을 무리해서 도전한다',
        result: '한 과목이 무너졌습니다. 불안하게 넘어갔습니다.',
        effects: { mental: -2 }, set: LifeAdmission.exclusive('수능_지방') },
      { label: '가채점 후 바로 재수를 결정한다',
        result: '성적표를 보기도 전에 재수학원을 알아봤습니다.',
        effects: { mental: -1, social: -1 }, set: { 재수생: true }, queue: ['retry_academy'] }
    ]
  },
  {
    id: 'retry_academy', stage: 'high', minAge: 19, maxAge: 19, place: '재수학원',
    title: '재수 첫날',
    text: '재수학원 강당입니다. 400명이 동시에 고개를 숙이고 있습니다. 옆자리 아이는 작년에 1점 차로 떨어졌다고 합니다.',
    choices: [
      { label: '여기서 1년을 갈아넣는다', result: '재수의 시간이 시작됐습니다. 하루가 겹쳐도 마음은 외길입니다.', effects: { mental: -2, hp: -2 }, set: { 재수생: true } },
      { label: '이번엔 체력도 챙긴다', result: '아침에 30분씩 걷고 시작했습니다. 1년이 조금 덜 망가졌습니다.', effects: { hp: 2, mental: 1 }, set: { 재수생: true } }
    ]
  },
  {
    id: 'csat_result', stage: 'high', at: [19, 11], place: '집',
    title: '원서 접수',
    text: '성적표가 나왔습니다. 원서는 단 한 번, 세 개까지 쓸 수 있습니다.',
    choices: [
      { label: '안정 지원 — 합격이 먼저다', result: '무난한 대학에 원서를 냈습니다. 합격 가능성이 높아졌습니다.', effects: { mental: 2 }, set: LifeAdmission.exclusive('수능_지방') },
      { label: '상향 지원 — 한 번에 걸어본다', result: '한 칸 위, 한 칸 아래, 한 칸 위. 도박이 시작됐습니다.', effects: { mental: -1, charm: 1 }, set: LifeAdmission.exclusive('수능_명문') },
      { label: '삼수는 없다 · 전문대 실용학과', result: '바로 취업할 수 있는 길을 골랐습니다.', effects: { mental: 2, hp: 1 }, set: LifeAdmission.exclusive('전문대') }
    ]
  },
  {
    id: 'graduation', stage: 'high', at: [19, 12], place: '졸업식', milestone: true,
    title: '졸업식',
    text: '교복을 입은 마지막 날입니다. 친구들이 단체 사진을 찍자고 합니다. 울지 않기로 했는데 눈이 시립니다.',
    choices: [
      { label: '친구들과 끝까지 논다', result: '밤 12시까지 떡볶이와 사진. 이날의 사진은 20년 뒤에도 남았습니다.', effects: { social: 3, mental: 3, asset: -10 } },
      { label: '가족과 저녁을 먹는다', result: '아빠가 처음으로 "수고했다"고 말했습니다.', effects: { social: 3, mental: 3, hp: 1 } }
    ]
  },

  /* ══════════════ 20세 — 대학교 입학 ══════════════ */
  {
    id: 'college_enter', stage: 'college', at: [20, 1], place: '캠퍼스', milestone: true, weight: 6,
    title: '대학교 입학',
    text: '캠퍼스에 도착했습니다. 총학생회 안내 부스, 동아리 부스, 교양 시간표.\n첫날부터 삶의 밀도가 달라집니다.',
    choices: [
      { label: 'OT · 개강파티 참석', result: '첫날부터 10명의 얼굴을 외웠습니다. 대학 생활의 기반이 생겼습니다.', effects: { social: 3, hp: -1, asset: -15 }, set: { 대학생: true, 인싸_시작: true } },
      { label: '조용히 교양 수업만 듣는다', result: '혼자 다니는 게 편했습니다. 도서관이 내 자리가 됐습니다.', effects: { mental: 3, social: -2 }, set: { 대학생: true } },
      { label: '당장 아르바이트 자리를 알아본다', result: '등록금이 먼저라는 걸 압니다. 시급 1만 원짜리를 찾았습니다.', effects: { asset: 5, mental: 1, social: 1 }, set: { 대학생: true, 알바생: true } }
    ]
  },
  {
    id: 'mt_ot', stage: 'college', at: [20, 3], place: '엠티장',
    title: '새터',
    text: '계곡 근처 펜션입니다. 선배들이 이름을 묻고, 꼬치구이 담당이 나에게 왔습니다.',
    choices: [
      { label: '마이크를 잡는다', result: function (s) { return s.flags.무대체질 || s.flags.반장 ? '노래 한 곡에 다들 손을 들었습니다. 다음날 별명이 생겼습니다.' : '떨었지만 끝까지 불렀습니다. 웃음이 나왔습니다.'; },
        effects: { charm: 3, social: 3, mental: 2 } },
      { label: '고기를 굽는다', result: '조용히 일했습니다. "고기 잘 하는 신입"으로 기억됩니다.', effects: { social: 3, hp: -1 } }
    ]
  },
  {
    id: 'club_join', stage: 'college', at: [20, 5], place: '동아리방',
    title: '동아리 선택',
    text: '동아리 모집이 끝나갑니다. 밴드, 영상제작, 농구, 학회 중에 하나를 고르라는데 3학년 때까지 나와야 합니다.',
    choices: [
      { label: '영상제작 동아리', result: '카메라를 처음 잡았습니다. 편집의 재미를 알게 됐습니다. (쓸모가 생겼습니다)', effects: { charm: 2, mental: 2, social: 2 }, set: { 영상: true } },
      { label: '밴드', result: '기타를 배웠습니다. 합주 시간이 인생에서 가장 즐거운 시간이 됐습니다.', effects: { charm: 3, social: 3, mental: 2 }, set: { 밴드: true } },
      { label: '학회 · 스터디', result: '전공을 더 깊게 팠습니다. 취업 준비가 조금 빨라졌습니다.', effects: { mental: 3, social: 1 }, set: { 학회: true } }
    ]
  },
  {
    id: 'grade_first', stage: 'college', at: [20, 7], place: '기숙사',
    title: '첫 학기 성적',
    text: '성적이 나왔습니다. 2.8입니다. 옆방 친구는 4.3이라고 합니다.',
    choices: [
      { label: '다음 학기는 장학금을 노린다', result: '도서관 새벽 자리가 내 것이 됐습니다. 학점이 급상승했습니다.', effects: { mental: 3, hp: -2, asset: 30 }, set: { 장학금: true } },
      { label: '학점은 버리고 다른 걸 한다', result: '공모전에 나갔습니다. 성적표보다 포트폴리오가 쌓였습니다.', effects: { mental: 2, charm: 2, social: 2 } }
    ]
  },
  {
    id: 'tuition', stage: 'college', at: [20, 9], place: '등록금 고지서',
    title: '등록금',
    text: '두 번째 학기 등록금 고지서가 왔습니다. 240만 원. 부모님께 말씀드리기가 어렵습니다.',
    choices: [
      { label: '부모님께 그대로 말씀드린다', result: '아버지가 아무 말 없이 송금했습니다. 그 침묵이 오래 남았습니다.', effects: { social: 2, mental: 1, asset: -240 } },
      { label: '휴학하고 벌어서 낸다', result: '1년을 벌고 돌아왔습니다. 돈의 무게를 몸으로 배웠습니다.', effects: { hp: -2, mental: 2, asset: 60 }, set: { 휴학_경험: true } },
      { label: '국가장학금을 신청한다', result: '2구간 장학금을 받았습니다. 등록금 절반이 사라졌습니다.', effects: { mental: 2, asset: -110 }, set: { 장학금: true } }
    ]
  },
  {
    id: 'army_start', stage: 'college', at: [21, 3], when: function (s) { return s.gender === '남' && !s.flags.군필; }, place: '훈련소', milestone: true, weight: 5,
    title: '입대',
    text: '휴학계를 냈습니다. 삭발하고 훈련소로 갑니다. 버스 창밖으로 익숙한 길이 흘러갑니다.',
    choices: [
      { label: '군 생활을 성실히 채운다', result: '제대했습니다. 체력이 올라가고, 사람 다루는 법을 배웠습니다.', effects: { hp: 4, mental: 2, social: 3 }, set: { 군필: true } },
      { label: '행정병에 지원한다', result: '부대 행정을 맡아 컴퓨터 실력을 키웠습니다. 사회 적응이 빨라졌습니다.', effects: { hp: 2, mental: 3, social: 2 }, set: { 군필: true, 행정병: true } }
    ]
  },
  {
    id: 'part_time', stage: 'college', at: [21, 6], place: '편의점',
    title: '아르바이트',
    text: '편의점 야간 시급은 1만 2천 원입니다. 새벽 2시에 오는 손님이 제일 많은 가게입니다.',
    choices: [
      { label: '야간 근무를 지원한다', result: '돈은 모였지만 수업은 오후에 몰아 들었습니다.', effects: { asset: 120, hp: -3, mental: -1 } },
      { label: '주말 낮 근무로 한다', result: '주말이 사라졌지만 생활 리듬은 지켰습니다.', effects: { asset: 70, hp: -1, social: -1 } },
      { label: '과외를 구한다', result: '시급 2만 원. 가르치는 실력이 늘었습니다.', effects: { asset: 100, mental: 1, charm: 1 }, set: { 과외쌤: true } }
    ]
  },
  {
    id: 'exchange', stage: 'college', at: [22, 3], when: function (s) { return s.flags.학원_영어 || s.flags.장학금; }, place: '국제교류처',
    title: '교환학생',
    text: '교환학생 모집이 떴습니다. 한 학기 해외. 비용은 자기 부담입니다. 영어 성적이 필요합니다.',
    choices: [
      { label: '지원한다', result: '합격했습니다. 낯선 도시에서 혼자 사는 법을 배웠습니다.', effects: { charm: 3, mental: 3, asset: -300, social: 2 }, set: { 교환학생: true, 영어가능: true } },
      { label: '다음 기회를 노린다', result: '이번 학기는 아껴두기로 했습니다.', effects: { asset: 40, mental: -1 } }
    ]
  },
  {
    id: 'contest', stage: 'college', at: [22, 6], place: '공모전',
    title: '공모전',
    text: '전국 규모 공모전이 열렸습니다. 팀을 꾸리면 상금 300만 원. 밤샘이 확정입니다.',
    choices: [
      { label: '팀을 꾸려 나간다', result: '장려상. 상금은 나눴지만 포트폴리오에는 큰 한 줄이 생겼습니다.', effects: { mental: 3, social: 3, asset: 20, hp: -2 }, set: { 공모전_수상: true } },
      { label: '이번 학기는 개인 공부에 집중한다', result: '전공 과목이 만점 나왔습니다.', effects: { mental: 2, hp: 1 } }
    ]
  },
  {
    id: 'intern', stage: 'college', at: [23, 4], place: '회사',
    title: '첫 인턴',
    text: '인턴 자리를 잡았습니다. 출근 첫날, 지하철 2호선에서 회사 명함을 받았습니다.',
    choices: [
      { label: '업무를 다 외울 때까지 버틴다', result: '부장님이 "졸업하면 우리 와라"고 했습니다. 채용 가능성이 생겼습니다.', effects: { mental: -1, hp: -1, social: 2, asset: 80 }, set: { 인턴_경험: true, 취업_제의: true } },
      { label: '사람들을 잘 챙긴다', result: '팀에 인사를 다 외웠습니다. 회식 자리에서 한 번씩 불려 다녔습니다.', effects: { social: 3, charm: 2, asset: 60 }, set: { 인턴_경험: true } }
    ]
  },
  {
    id: 'career_prep', stage: 'college', at: [24, 3], place: '졸업반',
    title: '취업 준비',
    text: '졸업반입니다. 자소서 항목 4개, 스펙부족, 주변은 이미 하나씩 붙었습니다.',
    choices: [
      { label: '대기업 시험을 올인한다', result: '인적성에 매달렸습니다. 몇 번의 낙제 끝에 감이 왔습니다.', effects: { mental: -2, hp: -2 }, set: { 취준_대기업: true } },
      { label: '스타트업에 먼저 지원한다', result: '면접이 빨랐습니다. 채용 프로세스가 가벼웠습니다.', effects: { mental: 1, social: 2 }, set: { 취준_스타트업: true } },
      { label: '공기업 준비로 길을 튼다', result: 'NCS를 시작했습니다. 남들보다 6개월 일찍 시작했습니다.', effects: { mental: 2, hp: 1 }, set: { 취준_공기업: true } }
    ]
  },
  {
    id: 'campus_dating', stage: 'college', at: [22, 9], place: '캠퍼스 커플',
    title: '캠퍼스 커플',
    text: '같은 팀 프로젝트에서 만난 아이와 밤늦게까지 얘기했습니다. 손을 잡아보라고 권하는 친구가 있습니다.',
    choices: [
      { label: '고백한다', result: '사귀게 됐습니다. 대학의 마지막 기억이 더 따뜻해졌습니다.', effects: { charm: 3, social: 2, mental: 3, asset: -40 } },
      { label: '친구로 남는다', result: '관계는 깔끔하게 유지됐습니다. 대신 어딘가 아쉬웠습니다.', effects: { social: 1, mental: -1 } }
    ]
  },
  {
    id: 'college_class', stage: 'college', minAge: 20, maxAge: 24, repeatable: true, place: '강의실',
    title: '출석과 과제',
    text: '아침 9시 수업입니다. 어제 술을 조금 했습니다. 출석 20%가 걸려 있습니다.',
    choices: [
      { label: '억지로라도 간다', result: '앞자리에 앉아 조는 사람이 됐지만 출석은 챙겼습니다.', effects: { hp: -1, mental: 1 } },
      { label: '친구에게 출석 체크를 부탁한다', result: '들켰습니다. 결석 처리 3번. 다음 학기부터 성실해졌습니다.', effects: { mental: -1, social: 1 } }
    ]
  }

]);
