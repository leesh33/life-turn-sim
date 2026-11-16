/* ─────────────────────────────────────────────
   content.extra.js — 단계별 이벤트 보강 (중학교 · 사회생활 · 중년 · 노년)
   ※ 앞선 선택 플래그에 따라 등장하거나 대사가 달라지는 이벤트들
   ───────────────────────────────────────────── */
window.LIFE_EVENTS = (window.LIFE_EVENTS || []).concat([

  /* ══════════ 중학교 보강 ══════════ */
  {
    id: 'school_trip', stage: 'middle', at: [15, 300], place: '수학여행 버스',
    title: '수학여행',
    text: '2박 3일 수학여행입니다. 버스 좌석을 정해야 합니다. 친한 아이들 옆자리는 이미 찼습니다.',
    choices: [
      { label: '혼자 앉는다', result: '창가에서 이어폰을 끼고 갔습니다. 경주 첨성대 앞에서 찍은 셀카가 남았습니다.', effects: { mental: 2, social: -1, asset: -10 } },
      { label: '모르는 아이 옆에 앉는다', result: '세 시간을 이야기했고, 지금은 제일 친한 친구가 됐습니다.', effects: { social: 3, charm: 1, asset: -10 } },
      { label: '선생님 옆에 앉는다', result: '편했지만 사진마다 선생님이 함께 찍혔습니다.', effects: { mental: 1, social: 1, asset: -10 } }
    ]
  },
  {
    id: 'phone_bill', stage: 'middle', at: [16, 240], place: '거실',
    title: '휴대폰 요금',
    text: '이번 달 요금이 8만 원이 나왔습니다. 아버지가 청구서를 들고 앉아 있습니다.',
    choices: [
      { label: '데이터를 줄이겠다고 한다', result: '와이파이만 쓰기로 했습니다. 한 달 뒤 요금이 3만 원이 됐습니다.', effects: { mental: 2, social: -1, asset: 5 } },
      { label: '알바해서 내겠다고 한다', result: '중학생이 할 수 있는 일은 없었습니다. 대신 아버지가 웃었습니다.', effects: { social: 3, mental: 1 } },
      { label: '요금제를 바꿔달라고 한다', result: '온라인 전용 요금제로 바꿨습니다. 매달 4만 원을 아꼈습니다.', effects: { asset: 10, mental: 1, social: 1 } }
    ]
  },
  {
    id: 'youtube_dream', stage: 'middle', place: '내 방',
    title: '크리에이터의 꿈',
    text: '친구가 유튜브를 시작했다고 합니다. 구독자 1,200명. 나도 폰만 있으면 할 수 있습니다.',
    choices: [
      { label: '나도 채널을 연다', result: '첫 영상 조회수 12회. 그래도 편집이 재밌습니다.', effects: { mental: 3, charm: 2, hp: -1 }, set: { 유튜브꿈: true } },
      { label: '일단 공부를 한다', result: '영상은 계속 보기만 합니다. 그게 더 재밌습니다.', effects: { mental: 1, social: 1 } }
    ]
  },
  {
    id: 'parents_fight', stage: 'middle', place: '밤의 거실',
    title: '부모님의 다툼',
    text: '밤에 거실에서 목소리가 들립니다. 문틈으로 불이 켜져 있습니다. 이어폰을 끼고 누웠습니다.',
    choices: [
      { label: '이어폰 볼륨을 높인다', result: '아무 일도 없던 것처럼 다음 날 아침이 왔습니다. 하지만 오래 기억에 남았습니다.', effects: { mental: -3, social: -1 } },
      { label: '나가서 물을 마시며 끼어든다', result: '둘 다 조용해졌습니다. 이런 날엔 내가 어른인 것 같습니다.', effects: { mental: -1, social: 2, charm: 1 } }
    ]
  },
  {
    id: 'festival_band', stage: 'middle', place: '축제 무대',
    title: '학교 축제',
    text: '축제 무대 신청서가 붙었습니다. 우리 반에서 밴드를 한다고 합니다. 드럼 자리가 비었습니다.',
    choices: [
      { label: '드럼을 맡는다', result: '두 달을 연습했습니다. 무대에서 손이 떨렸지만 박자는 맞았습니다.', effects: { charm: 3, social: 3, mental: 2, hp: -1 }, set: { 밴드: true } },
      { label: '응원만 한다', result: '맨 앞에서 소리쳤습니다. 목이 쉬었지만 즐거웠습니다.', effects: { social: 2, mental: 2 } }
    ]
  },
  {
    id: 'mid_night_snack', stage: 'middle', repeatable: true, place: '편의점',
    title: '야식',
    text: '밤 11시, 배가 고픕니다. 편의점까지 5분. 내일은 8시 등교입니다.',
    choices: [
      { label: '삼각김밥과 라면', result: '먹고 바로 누웠습니다. 다음 날 얼굴이 부었습니다.', effects: { hp: -1, mental: 2, asset: -1 } },
      { label: '참고 잔다', result: '배고픈 채로 잤지만 아침이 개운했습니다.', effects: { hp: 1, mental: -1 } }
    ]
  },

  /* ══════════ 사회생활 보강 ══════════ */
  {
    id: 'lunch_menu', stage: 'work', repeatable: true, place: '점심시간',
    title: '점심 메뉴',
    text: '12시 정각, 다들 일어납니다. 오늘은 무엇을 먹을지가 오전 업무의 마지막 과제입니다.',
    choices: [
      { label: '같이 먹자고 먼저 말한다', result: '새로 온 후배가 같이 가겠다고 했습니다. 점심이 정보 교환의 장이 됩니다.', effects: { social: 2, asset: -1, hp: -1 } },
      { label: '혼자 빠르게 먹는다', result: '30분을 벌었습니다. 그 시간에 산책을 했습니다.', effects: { mental: 1, hp: 1, social: -1 } }
    ]
  },
  {
    id: 'boss_conflict', stage: 'work', at: [29, 240], when: function (s) { return s.flags.직업 && !s.flags.명퇴; }, place: '팀장실',
    title: '상사와의 갈등',
    text: '팀장이 회의에서 내 기획을 "이건 아니다"라고 잘랐습니다. 근거는 말하지 않았습니다.',
    choices: [
      { label: '회의 후 따로 찾아가 묻는다', result: '팀장도 이유를 정리하지 못했고, 다음 회의에서 내 안이 채택됐습니다.', effects: { mental: 2, social: 2 }, set: { 주관_뚜렷: true } },
      { label: '그 자리에서 반박한다', result: '분위기가 싸늘해졌습니다. 옳았지만 잃은 것도 있었습니다.', effects: { mental: 1, social: -3 } },
      { label: '조용히 넘긴다', result: '다음에도 같은 일이 반복됐습니다.', effects: { mental: -3, social: 1 } }
    ]
  },
  {
    id: 'salary_negotiation', stage: 'work', at: [32, 60], when: function (s) { return s.flags.직업; }, place: '인사팀',
    title: '연봉 협상',
    text: '연봉 협상 시즌입니다. 인사팀이 "희망 인상률"을 물었습니다. 지난해 성과는 좋았습니다.',
    choices: [
      { label: '시장가를 조사해 근거를 든다', result: '12% 인상. 준비한 사람이 이깁니다.', effects: { asset: 400, mental: 2, social: 1 } },
      { label: '회사가 정해주는 대로 받는다', result: '3%. 아쉽지만 조용합니다.', effects: { asset: 120, mental: -1 } },
      { label: '이직 제안서를 근거로 쓴다', result: '15% 인상. 대신 팀장과의 사이가 미묘해졌습니다.', effects: { asset: 520, mental: 1, social: -2 } }
    ]
  },

  /* ══════════ 중년 보강 ══════════ */
  {
    id: 'rehired', stage: 'midlife', when: function (s) { return s.flags.명퇴 || s.flags.은퇴; }, place: '새 일터',
    title: '다시 일자리',
    text: '지인이 작은 회사의 자문 자리를 제안합니다. 월 150만 원, 주 2일. 다시 사원증을 만들 수 있습니다.',
    choices: [
      { label: '받는다', result: '주 2일이지만 하루가 규칙적이 됐습니다. 돈보다 리듬을 얻었습니다.', effects: { asset: 180, mental: 3, social: 2 }, set: { 재취업: true } },
      { label: '거절하고 쉰다', result: '평일 낮의 한강을 걸었습니다. 이게 오랜 소원이었습니다.', effects: { mental: 3, hp: 2 } }
    ]
  },
  {
    id: 'reunion', stage: 'midlife', repeatable: true, place: '동창회',
    title: '동창회',
    text: '단톡방에 동창회 공지가 올라왔습니다. 30년 만입니다. 가지 않으면 후회할 것 같은 기분입니다.',
    choices: [
      { label: '간다', result: '이름을 하나씩 떠올리는 재미. 다들 다른 얼굴인데 같은 말투였습니다.', effects: { social: 2, mental: 1, hp: -1, asset: -20 } },
      { label: '사진만 본다', result: '단톡방 사진을 한참 봤습니다. 복잡한 마음으로 밤을 지새웠습니다.', effects: { mental: -1, social: -1 } }
    ]
  },
  {
    id: 'kid_job', stage: 'midlife', when: function (s) { return (s.flags.자녀수 || 0) >= 1; }, place: '거실',
    title: '자녀의 취업',
    text: '아이가 취업 준비 중입니다. 집에서 자소서를 쓰는데, 몇 달째 결과가 없습니다.',
    choices: [
      { label: '기다려준다', result: '9개월 뒤 합격 소식이 왔습니다. 아이가 먼저 전화했습니다.', effects: { social: 3, mental: 3 } },
      { label: '내 인맥을 쓴다', result: '소개로 면접을 봤습니다. 합격했지만 아이의 표정은 복잡했습니다.', effects: { social: 2, mental: 1, asset: -300 } },
      { label: '공부를 권한다', result: '생각이 다르다는 걸 알았습니다. 대화가 줄었습니다.', effects: { social: -2, mental: -1 } }
    ]
  },
  {
    id: 'checkup_regular', stage: 'midlife', repeatable: true, place: '병원',
    title: '정기 검진',
    text: '올해도 검진 시즌입니다. 작년에 "경계"라는 말을 들었습니다.',
    choices: [
      { label: '검진을 받는다', result: function (s) { return s.flags.건강_나쁨 ? '재검사가 또 나왔습니다. 이번엔 약을 시작했습니다.' : '모든 수치가 정상 범위였습니다. 그 말이 제일 좋았습니다.'; },
        effects: { hp: 2, asset: -20, mental: -1 } },
      { label: '내년으로 미룬다', result: '달력에 표시만 해두었습니다.', effects: { hp: -2, mental: 1 } }
    ]
  },

  /* ══════════ 노년 보강 ══════════ */
  {
    id: 'with_spouse', stage: 'senior', repeatable: true, when: function (s) { return s.flags.결혼; }, place: '집',
    title: '배우자와의 오후',
    text: '거실에서 둘이 TV를 봅니다. 하루에 열 마디 정도 이야기합니다. 그게 편안합니다.',
    choices: [
      { label: '산책을 같이 나간다', result: '손을 잡지는 않지만 보폭이 같습니다.', effects: { mental: 2, hp: -1, social: 1 } },
      { label: '각자 방으로 간다', result: '조용했습니다. 이제 그런 날이 많습니다.', effects: { mental: 1, hp: 1, social: -2 } }
    ]
  },
  {
    id: 'pension_manage', stage: 'senior', at: [67, 150], place: '은행',
    title: '노후 자금',
    text: '연금과 예금을 정리할 시점입니다. 지인은 "확정금리로 묶으라"고 합니다.',
    choices: [
      { label: '안전하게 예금으로', result: '수익률은 낮지만 밤에 걱정이 없습니다.', effects: { asset: 300, mental: 2 } },
      { label: '일부는 투자로', result: '반은 늘고 반은 줄었습니다. 마음이 편하지 않습니다.', effects: { asset: -500, mental: -2, hp: -1 } },
      { label: '자녀에게 이야기한다', result: '아이가 관리해 주겠다고 했습니다. 통장을 맡기고 마음이 가벼워졌습니다.', effects: { social: 3, mental: 3 } }
    ]
  },
  {
    id: 'neighbor', stage: 'senior', repeatable: true, place: '경로당',
    title: '이웃과의 왕래',
    text: '아침에 문 앞에 반찬이 놓여 있습니다. 옆집 노인이 두고 간 것입니다.',
    choices: [
      { label: '고맙다고 인사하고 뭔가 준다', result: '주고받는 사이가 됐습니다. 하루에 몇 번씩 창문이 열립니다.', effects: { social: 2, mental: 1, hp: -1 } },
      { label: '조용히 문만 닫는다', result: '혼자가 편합니다. 다만 소리가 잘 들리지 않는 날이 있습니다.', effects: { mental: 1, social: -2, hp: 1 } }
    ]
  },
  {
    id: 'grandchild_care', stage: 'senior', repeatable: true, when: function (s) { return (s.flags.자녀수 || 0) >= 1; }, place: '집',
    title: '손주 돌보기',
    text: '아이가 "아이 좀 봐달라"고 합니다. 오후부터 저녁까지입니다.',
    choices: [
      { label: '기꺼이 본다', result: '허리는 아프지만 웃음소리가 집을 채웠습니다.', effects: { hp: -2, social: 2, mental: 1 } },
      { label: '체력이 안 된다고 말한다', result: '아이가 이해했습니다. 대신 전화가 조금 뜸해졌습니다.', effects: { hp: 2, social: -2, mental: 1 } }
    ]
  },

  /* ══ 비혼·독신 루트 보강 ══ */
  {
    id: 'solo_apartment', stage: 'family', when: function (s) { return !s.flags.결혼; }, place: '내 집',
    title: '나만의 집',
    text: '오래 살던 원룸을 정리하고 오피스텔을 알아보고 있습니다. 명의는 나 혼자입니다.',
    choices: [
      { label: '작은 오피스텔을 산다', result: '대출을 받아 내 이름의 집을 마련했습니다. 은행 서류가 두꺼웠습니다.', effects: { asset: -3000, mental: 3, social: 1 }, set: { 집있음: true, 대출: true } },
      { label: '전세로 옮긴다', result: '이사만 해도 공기가 달라집니다. 창밖으로 산이 보입니다.', effects: { asset: -300, mental: 2 } }
    ]
  },
  {
    id: 'solo_hobby', stage: 'family', repeatable: true, when: function (s) { return !s.flags.결혼; }, place: '주중 저녁',
    title: '혼자만의 저녁',
    text: '퇴근하고 집에 오니 8시입니다. 냉장고에 아무것도 없습니다.',
    choices: [
      { label: '요리를 배워 해본다', result: '파스타 하나를 제대로 익혔습니다. 주말이 조금 풍성해졌습니다.', effects: { hp: 1, mental: 2, asset: -5 } },
      { label: '배달을 시킨다', result: '오늘의 선택은 치킨. 편하고 맛있습니다.', effects: { hp: -2, mental: 2, asset: -3 } }
    ]
  },

  /* ══════════ 어느 시점에나 보강 ══════════ */
  {
    id: 'any_news_of_friend', stage: 'any', when: function (s) { return s.age >= 40; }, place: '휴대폰',
    title: '안 좋은 소식',
    text: '단체 채팅방에 부고가 올라왔습니다. 오래 연락하지 못한 사람입니다.',
    choices: [
      { label: '조문을 간다', result: '유족에게 인사를 하고 왔습니다. 언제 마지막이었는지 생각했습니다.', effects: { social: 3, mental: -2, asset: -30 } },
      { label: '마음으로만 보낸다', result: '그날 밤 잠이 늦게 왔습니다.', effects: { mental: -2 } }
    ]
  },
  {
    id: 'any_good_luck', stage: 'any', when: function (s) { return s.age >= 20; }, place: '카페',
    title: '뜻밖의 행운',
    text: '카페 의자에 지갑이 놓여 있습니다. 주인은 보이지 않습니다.',
    choices: [
      { label: '직원에게 맡긴다', result: '잠시 후 뛰어 들어온 주인이 연신 고개를 숙였습니다.', effects: { mental: 3, social: 2 } },
      { label: '그냥 지나간다', result: '어느 쪽이든 남는 게 있습니다.', effects: { mental: -1 } }
    ]
  }

]);
