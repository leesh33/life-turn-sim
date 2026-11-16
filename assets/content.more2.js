/* ─────────────────────────────────────────────
   content.more2.js — 추가 이벤트 2/2
   사회생활 · 가정 · 중년 · 노년 · 어느 때나(돌발)
   ───────────────────────────────────────────── */
window.LIFE_EVENTS = (window.LIFE_EVENTS || []).concat([

  /* ══════════════ 사회생활 (25~34) ══════════════ */
  {
    id: 'first_evaluation', stage: 'work', at: [25, 120], place: '인사평가',
    title: '첫 인사평가',
    text: '상반기 평가 결과가 나왔습니다. 등급은 C. 옆자리 동기는 B를 받았습니다. 팀장이 "다음에 더"라고 합니다.',
    choices: [
      { label: '평가 근거를 물어본다', result: '팀장이 세 가지를 짚어줬습니다. 하나는 고칠 수 있고, 둘은 시간이 필요합니다.', effects: { mental: 2, social: 1, hp: -1 } },
      { label: '속으로 삭힌다', result: '주말 내내 그 문자를 다시 봤습니다. 아무것도 달라지지 않았습니다.', effects: { mental: -3 } },
      { label: '동기에게 축하한다고 말한다', result: '동기가 "미안하다"고 했습니다. 관계는 이상해지지 않았습니다.', effects: { social: 2, mental: 1 } }
    ]
  },
  {
    id: 'karaoke_after', stage: 'work', at: [27, 60], place: '노래방',
    title: '회식 2차, 노래방',
    text: '1차가 끝나고 다들 일어납니다. 마이크가 나에게 넘어왔습니다. 상사가 신청곡을 누르고 있습니다.',
    choices: [
      { label: '신나게 부른다', result: '박자를 두 번 놓쳤지만 다 같이 손을 들었습니다. 별명이 생겼습니다.', effects: { social: 3, charm: 1, hp: -2 } },
      { label: '한 곡만 부르고 자리를 뺀다', result: '적당히 인사하고 나왔습니다. 다음 날 아무도 서운해하지 않았습니다.', effects: { hp: 1, mental: 1, social: -1 } },
      { label: '신청곡을 조용한 노래로 바꾼다', result: '분위기가 잠깐 가라앉았습니다. 팀장이 웃으면서 넘어갔습니다.', effects: { mental: -1, social: -1 } }
    ]
  },
  {
    id: 'lunch_eye_game', stage: 'work', at: [26, 240], place: '회의실',
    title: '점심 메뉴 눈치게임',
    text: '다들 "아무거나 좋아요"라고 합니다. 12시 5분입니다. 누가 먼저 말을 꺼내야 하는지 눈치를 봅니다.',
    choices: [
      { label: '먼저 정한다', result: '"국밥 어때요" 한마디에 다들 일어났습니다. 리더는 이런 순간에 나옵니다.', effects: { social: 2, mental: 1 } },
      { label: '계속 기다린다', result: '12시 25분에야 결정됐습니다. 점심시간이 20분 줄었습니다.', effects: { mental: -2, hp: -1 } },
      { label: '혼자 먹는다고 말한다', result: '조용히 나가서 김밥을 먹었습니다. 30분이 남았습니다.', effects: { mental: 2, hp: 1, social: -1 } }
    ]
  },
  {
    id: 'stock_crash', stage: 'work', at: [28, 60], place: '휴대폰',
    title: '주식 떡락',
    text: '작년에 산 종목이 -35%입니다. 커뮤니티에는 "물타라"는 글과 "손절하라"는 글이 반반입니다.',
    choices: [
      { label: '물타기한다', result: '평단가가 내려갔습니다. 하루 뒤 더 떨어졌습니다. 새벽에 앱을 열어봤습니다.', effects: { asset: -300, mental: -3, hp: -1 }, set: { 주식: true, 주식손실: true } },
      { label: '손절한다', result: '손실을 확정하고 앱을 지웠습니다. 밤에 처음으로 잘 잤습니다.', effects: { asset: -250, mental: 2 }, set: { 주식손실: true } },
      { label: '그냥 둔다', result: '보지 않기로 했습니다. 잔고는 계속 신경 쓰입니다.', effects: { mental: -1 } }
    ]
  },
  {
    id: 'coin_moon', stage: 'work', at: [29, 60], place: '휴대폰',
    title: '코인 떡상',
    text: '지인이 추천한 동전 코인이 일주일 만에 두 배가 됐습니다. 커뮤니티에는 "인생 코인"이라는 말이 돕니다.',
    choices: [
      { label: '전부 넣는다', result: '다음 주에 -70%. 통장 잔고를 세 번 확인했습니다.', effects: { asset: -500, mental: -4, hp: -2 }, set: { 코인: true, 코인손실: true } },
      { label: '절반만 익절한다', result: '수익의 절반을 현금으로 바꿨습니다. 나머지는 반이나 남았습니다.', effects: { asset: 300, mental: 1 }, set: { 코인: true } },
      { label: '손대지 않는다', result: '3개월 뒤 그 코인은 사라졌습니다. 아무 일도 없었던 게 제일 좋았습니다.', effects: { mental: 2 } }
    ]
  },
  {
    id: 'job_interview_v', stage: 'work', at: [30, 150], when: function (s) { return s.flags.이직결심 || s.flags.취준_대기업; }, place: '면접장',
    title: '이직 면접',
    text: '면접장에 앉았습니다. 마주 앉은 사람이 "지금 회사에서는 어떤 일을 하세요?"라고 묻습니다.',
    choices: [
      { label: '숫자로 성과를 말한다', result: '면접관이 고개를 끄덕였습니다. 일주일 뒤 처우 협의 연락이 왔습니다.', effects: { mental: 2, asset: 100, social: 1 }, set: { 이직_성공: true } },
      { label: '솔직하게 힘들었다고 말한다', result: '면접관이 "저희도 비슷합니다"라며 웃었습니다. 분위기는 좋았습니다.', effects: { mental: 1, social: 2 } },
      { label: '준비한 대본을 읽는다', result: '대답이 매끄러웠지만 기억에 남지 않았습니다. 결과는 다음 주에 옵니다.', effects: { mental: -1 } }
    ]
  },
  {
    id: 'condolence_money', stage: 'work', at: [31, 60], place: '장례식장',
    title: '경조사비 폭탄',
    text: '이번 달 결혼식 두 건, 장례 한 건, 돌잔치 한 건입니다. 부조금만 40만 원입니다.',
    choices: [
      { label: '다 챙긴다', result: '주말이 전부 사라졌습니다. 통장은 조용해졌지만 관계는 남았습니다.', effects: { asset: -40, social: 3, hp: -2 } },
      { label: '꼭 가야 하는 곳만 간다', result: '두 곳만 갔습니다. 나머지는 계좌 이체로 했습니다.', effects: { asset: -20, social: 1, mental: 1 } },
      { label: '하나도 가지 않는다', result: '이번 달을 넘겼습니다. 다음에 만날 때 조금 어색합니다.', effects: { asset: 10, social: -3, mental: 1 } }
    ]
  },
  {
    id: 'gym_three_days', stage: 'work', at: [30, 240], place: '헬스장',
    title: '헬스장 3일',
    text: '3개월 회원권을 끊었습니다. 오늘이 네 번째 가는 날인데 몸이 무겁습니다.',
    choices: [
      { label: '그래도 간다', result: '30분만 하고 나왔습니다. 나오는 길이 가벼웠습니다.', effects: { hp: 2, charm: 1, mental: 1, asset: -20 }, set: { 운동러: true } },
      { label: '오늘은 쉰다', result: '소파에서 폰을 봤습니다. 다음 날도 같은 선택을 했습니다.', effects: { mental: 1, hp: -1 } }
    ]
  },
  {
    id: 'office_romance', stage: 'work', at: [28, 300], when: function (s) { return !s.flags.연애중 && !s.flags.결혼; }, place: '회사 옥상',
    title: '사내 연애',
    text: '옆 팀 사람과 자꾸 점심이 겹칩니다. 오늘은 "커피 한잔 하실래요"라는 메시지가 왔습니다.',
    choices: [
      { label: '나간다', result: '커피가 두 시간이 됐습니다. 회사에서는 모르는 척하기로 했습니다.', effects: { charm: 1, social: 2, mental: 3, asset: -5 }, set: { 연애중: true, 사내연애: true } },
      { label: '정중히 거절한다', result: '"바빠서요"라고 답했습니다. 다음 날부터 인사가 조금 짧아졌습니다.', effects: { mental: -1, social: -1 } }
    ]
  },
  {
    id: 'team_workshop', stage: 'work', at: [29, 240], place: '워크숍',
    title: '팀 워크숍',
    text: '1박 2일 워크숍입니다. 오후에는 팀 빌딩, 저녁에는 회식이 이어집니다. 주말을 쓰는 일정입니다.',
    choices: [
      { label: '끝까지 참석한다', result: '레크리에이션에서 춤을 췄습니다. 영상이 단톡방에 남았습니다.', effects: { social: 3, hp: -3, mental: 1 } },
      { label: '저녁만 참석하고 빠진다', result: '핑계를 대고 집에 갔습니다. 주말은 지켰지만 눈치를 봤습니다.', effects: { hp: 2, mental: 2, social: -2 } }
    ]
  },
  {
    id: 'salary_freeze', stage: 'work', at: [32, 240], place: '인사 공지',
    title: '연봉 동결',
    text: '올해 임금 협상 결과가 공지됐습니다. "전 직원 연봉 동결"입니다. 물가는 올랐습니다.',
    choices: [
      { label: '팀장에게 따로 이야기한다', result: '"나도 그렇다"는 대답이 돌아왔습니다. 대신 내 상황은 알렸습니다.', effects: { mental: 1, social: 1 } },
      { label: '이직 준비를 시작한다', result: '이력서를 새로 썼습니다. 처음으로 시장에 내놓을 준비가 됐습니다.', effects: { mental: 2, hp: -1 }, set: { 이직결심: true } },
      { label: '그냥 받아들인다', result: '아무 말도 하지 않았습니다. 내년을 기약합니다.', effects: { mental: -2, asset: 20 } }
    ]
  },
  {
    id: 'parents_tour', stage: 'work', at: [33, 60], place: '공항',
    title: '부모님 효도관광',
    text: '부모님이 여행을 한 번도 못 가봤다고 합니다. 3박 4일 패키지, 250만 원. 내 통장과 마음이 함께 계산합니다.',
    choices: [
      { label: '예약한다', result: '공항에서 사진을 찍어 보내주셨습니다. 엄마가 처음으로 이모티콘을 썼습니다.', effects: { asset: -250, social: 3, mental: 3 } },
      { label: '절반만 보태고 나머지는 부모님이 내게 한다', result: '부모님이 "우리 돈으로 간다"고 하셨습니다. 조금 미안했습니다.', effects: { asset: -100, social: 2, mental: 1 } },
      { label: '다음에 하자고 한다', result: '"다음"은 몇 년이 걸렸습니다.', effects: { mental: -2 } }
    ]
  },
  {
    id: 'friend_wedding', stage: 'work', at: [33, 240], place: '예식장',
    title: '친구의 결혼식',
    text: '대학 때 가장 친한 친구가 결혼합니다. 축의금은 얼마가 적당할까요. 다른 친구들은 20만 원이라고 합니다.',
    choices: [
      { label: '20만 원을 낸다', result: '식장에서 오랜만에 얼굴들을 봤습니다. 술자리가 밤까지 이어졌습니다.', effects: { asset: -20, social: 3, hp: -2 } },
      { label: '10만 원을 내고 축하만 한다', result: '짧게 인사하고 나왔습니다. 친구는 반가워했습니다.', effects: { asset: -10, social: 1 } },
      { label: '사회를 봐준다', result: '대본 없이 진행했습니다. 신랑이 나중에 "최고였다"고 문자했습니다.', effects: { charm: 2, social: 3, mental: -1 } }
    ]
  },
  {
    id: 'credit_loan', stage: 'work', at: [34, 90], place: '은행 앱',
    title: '신용대출',
    text: '급하게 돈이 필요합니다. 앱에서 신용대출 한도를 조회하니 3천만 원까지 나옵니다. 금리는 6.5%입니다.',
    choices: [
      { label: '필요한 만큼만 빌린다', result: '500만 원을 빌렸습니다. 매달 이자가 조금씩 빠져나갑니다.', effects: { asset: 480, mental: -1 }, set: { 대출: true } },
      { label: '한도를 다 채운다', result: '통장은 두꺼워졌지만 매달 40만 원이 사라집니다. 잠이 얕아졌습니다.', effects: { asset: 2900, mental: -3, hp: -1 }, set: { 대출: true } },
      { label: '빌리지 않고 방법을 찾는다', result: '지출을 줄이고 중고를 팔았습니다. 시간이 걸렸지만 빚은 없습니다.', effects: { asset: 60, mental: 2, hp: -1 } }
    ]
  },
  {
    id: 'office_pc_change', stage: 'work', repeatable: true, when: function (s) { return s.flags.직업 && !s.flags.명퇴; }, place: '사무실',
    title: '업무 과부하',
    text: '새 업무가 내려왔습니다. 기존 업무는 그대로인데 마감은 이번 주입니다.',
    choices: [
      { label: '야근으로 처리한다', result: '금요일 밤에 끝냈습니다. 주말이 하루 남았습니다.', effects: { mental: 1, hp: -2, asset: 20 }, set: { 야근러: true } },
      { label: '우선순위를 다시 정하자고 한다', result: '회의가 한 시간 더 걸렸지만 마감이 옮겨졌습니다.', effects: { mental: 2, social: -1, hp: 1 } },
      { label: '일부를 후배에게 넘긴다', result: '후배가 야근을 했습니다. 고맙지만 마음이 편치 않습니다.', effects: { mental: 1, hp: 1, social: -1 } }
    ]
  },
  {
    id: 'mid_company_love', stage: 'work', at: [34, 240], when: function (s) { return s.flags.사내연애 && !s.flags.결혼; }, place: '회사 앞',
    title: '사내 연애가 알려졌습니다',
    text: '단톡방에 두 사람 사진이 올라왔습니다. 인사팀에서 "잠깐 이야기 좀"이라고 연락이 왔습니다.',
    choices: [
      { label: '정식으로 밝힌다', result: '팀을 옮기라는 권고를 받았습니다. 둘 다 받아들였습니다.', effects: { social: 1, mental: 1, asset: -20 } },
      { label: '부인한다', result: '두 달을 숨겼습니다. 관계가 지쳐갔습니다.', effects: { mental: -3, social: -1 } }
    ]
  },
  {
    id: 'job_move_up', stage: 'work', at: [34, 30], when: function (s) { return s.flags.이직_성공 || s.flags.이직결심; }, place: '새 회사',
    title: '새 회사 적응',
    text: '이직한 회사의 첫 달입니다. 사람도 시스템도 다릅니다. 회의실 이름조차 모릅니다.',
    choices: [
      { label: '모르는 것을 다 물어본다', result: '한 달 만에 이름을 다 외웠습니다. "빨리 적응했다"는 말을 들었습니다.', effects: { mental: 2, social: 2, hp: -2 } },
      { label: '조용히 눈치를 본다', result: '실수는 없었지만 존재감도 없었습니다.', effects: { mental: 1, hp: 1, social: -2 } }
    ]
  },

  /* ══════════════ 가정 (35~49) ══════════════ */
  {
    id: 'meeting_parents', stage: 'work', at: [32, 120], when: function (s) { return !s.flags.결혼; }, place: '한정식집', milestone: true,
    title: '상견례',
    text: '양가 부모님이 처음 만납니다. 방은 조용하고, 물잔 소리만 들립니다. 어머니가 "우리 애가 말을 잘 못해서"라고 시작합니다.',
    choices: [
      { label: '분위기를 풀려고 먼저 웃는다', result: '아버지 두 분이 같이 웃었습니다. 이후 대화가 풀렸습니다.', effects: { social: 3, charm: 2, asset: -40 }, set: { 상견례_무사: true } },
      { label: '조용히 예의만 지킨다', result: '무난하게 끝났습니다. 어딘가 어색한 기억으로 남았습니다.', effects: { mental: 1, asset: -40 } },
      { label: '결혼 날짜를 먼저 꺼낸다', result: '분위기가 잠깐 얼었습니다. 그래도 날짜는 정해졌습니다.', effects: { mental: -2, social: 1, asset: -40 }, set: { 결혼_날짜: true } }
    ]
  },
  {
    id: 'newlywed_interior', stage: 'family', at: [36, 240], when: function (s) { return s.flags.결혼; }, place: '신혼집',
    title: '신혼집 인테리어 갈등',
    text: '거실 벽지를 고르는데 의견이 갈립니다. 나는 회색, 배우자는 아이보리. 서로 "이게 더 낫다"고 합니다.',
    choices: [
      { label: '배우자 의견을 따른다', result: '아이보리 벽. 나중에 사진을 보니 밝아서 좋았습니다.', effects: { social: 3, mental: 1, asset: -100 } },
      { label: '절충안을 찾는다', result: '한쪽 벽만 회색으로 했습니다. 둘 다 만족스러워했습니다.', effects: { social: 2, mental: 2, asset: -120 } },
      { label: '내 의견을 끝까지 민다', result: '회색 벽이 됐습니다. 거실이 조용해 보였고, 대화도 조용해졌습니다.', effects: { mental: -2, social: -2, asset: -100 } }
    ]
  },
  {
    id: 'parental_leave', stage: 'family', at: [38, 60], when: function (s) { return s.flags.자녀; }, place: '인사팀',
    title: '육아휴직 신청',
    text: '아이가 아직 어립니다. 육아휴직을 쓰면 6개월간 급여의 80%가 나옵니다. 대신 복직 후 자리가 달라질 수 있습니다.',
    choices: [
      { label: '신청한다', result: '6개월을 아이와 보냈습니다. 회사에서 내 자리는 옆으로 옮겨져 있었습니다.', effects: { social: 3, hp: 2, mental: 2, asset: -300 }, set: { 육아휴직: true } },
      { label: '배우자가 쓴다', result: '배우자가 휴직을 했습니다. 나는 일을 계속했고, 밤에 아이를 봤습니다.', effects: { asset: 100, hp: -2, social: 1 } },
      { label: '쓰지 않는다', result: '어린이집에 일찍 보냈습니다. 마음이 계속 걸렸습니다.', effects: { asset: 200, mental: -2 } }
    ]
  },
  {
    id: 'holiday_nagging', stage: 'family', repeatable: true, when: function (s) { return s.flags.결혼; }, place: '명절 거실',
    title: '명절 잔소리',
    text: '"애는 언제 둘째 낳을 거야", "연봉은 올랐어?" 식탁에서 질문이 이어집니다. 배우자가 옆에서 내 발을 밟습니다.',
    choices: [
      { label: '웃으면서 넘긴다', result: '"천천히 하겠습니다"로 다섯 번 답했습니다. 시간이 지나자 질문이 줄었습니다.', effects: { mental: -1, social: 2 } },
      { label: '정색하고 선을 긋는다', result: '식탁이 조용해졌습니다. 그 명절은 길었습니다.', effects: { mental: 1, social: -2 } },
      { label: '배우자에게 공을 넘긴다', result: '"얘가 결정할 거예요"라고 했습니다. 배우자가 나중에 웃으면서 뭐라 했습니다.', effects: { social: 2, mental: 1, charm: 1 } }
    ]
  },
  {
    id: 'second_child', stage: 'family', at: [39, 90], when: function (s) { return s.flags.자녀 && (s.flags.자녀수 || 0) < 2; }, place: '거실',
    title: '둘째 계획',
    text: '배우자가 둘째 이야기를 꺼냅니다. 집은 좁고, 육아는 힘들고, 나이는 서로 마흔을 바라봅니다.',
    choices: [
      { label: '둘째를 갖는다', result: '다시 병원 복도. 두 번째 울음소리는 첫 번째보다 짧고 힘찼습니다.', effects: { social: 4, mental: 2, hp: -3, asset: -300 }, set: { 자녀수: 2 } },
      { label: '지금 아이에게 집중한다', result: '배우자가 고개를 끄덕였습니다. 집이 조금 넓게 느껴졌습니다.', effects: { mental: 3, social: 1, asset: 100 } }
    ]
  },
  {
    id: 'floor_noise', stage: 'family', at: [42, 240], place: '아파트 거실',
    title: '층간소음',
    text: '밤 11시, 위집에서 쿵쿵 소리가 납니다. 세 번째입니다. 배우자가 "올라가서 말하자"고 합니다.',
    choices: [
      { label: '직접 올라가 이야기한다', result: '아이가 뛰고 있었다고 사과했습니다. 이후 조금 조용해졌습니다.', effects: { social: 1, mental: 2, hp: -2 } },
      { label: '관리사무소에 신고한다', result: '안내 방송이 나갔습니다. 사이가 미묘해졌지만 소리는 줄었습니다.', effects: { mental: 1, social: -1 } },
      { label: '귀마개를 산다', result: '잘 잤습니다. 문제는 그대로 있습니다.', effects: { hp: 2, mental: -1, asset: -5 } }
    ]
  },
  {
    id: 'maintenance_bill', stage: 'family', at: [43, 60], place: '현관',
    title: '관리비 폭탄',
    text: '이번 달 관리비가 48만 원입니다. 난방을 그렇게 틀지 않았는데도 숫자가 이렇습니다.',
    choices: [
      { label: '내역을 한 줄씩 확인한다', result: '공용 전기료가 예년보다 올랐습니다. 관리사무소에 문의했더니 조정됐습니다.', effects: { asset: 15, mental: 2, hp: -1 } },
      { label: '그냥 낸다', result: '자동이체로 빠져나갔습니다. 다음 달도 같은 숫자를 봤습니다.', effects: { asset: -48, mental: -1 } },
      { label: '절약 규칙을 만든다', result: '외출 시 콘센트를 뽑고 보일러를 낮췄습니다. 다음 달은 12만 원 줄었습니다.', effects: { asset: 10, mental: 1, social: -1 }, set: { 절약: true } }
    ]
  },
  {
    id: 'kimjang', stage: 'family', at: [44, 240], when: function (s) { return s.flags.결혼; }, place: '베란다',
    title: '김장',
    text: '양가에서 배추 스무 포기가 왔습니다. 배우자는 "사 먹자"고 하고, 어머니는 "직접 해야 맛있다"고 합니다.',
    choices: [
      { label: '같이 절인다', result: '새벽까지 김치를 버무렸습니다. 손이 얼었지만 냉장고가 가득 찼습니다.', effects: { hp: -3, social: 2, mental: 2, asset: -30 } },
      { label: '포기김치를 산다', result: '30만 원짜리 김치가 냉장고에 들어왔습니다. 어머니가 한 번 한숨을 쉬었습니다.', effects: { asset: -30, mental: 1, social: -1 } },
      { label: '이웃과 나눠 한다', result: '옆집과 절반씩 나눠 버무렸습니다. 다음 날 김치통이 문 앞에 놓여 있었습니다.', effects: { social: 2, mental: 1, hp: -1 } }
    ]
  },
  {
    id: 'kid_taekwondo', stage: 'family', at: [45, 180], when: function (s) { return s.flags.자녀; }, place: '도장 앞',
    title: '아이의 태권도',
    text: '아이가 태권도를 그만두고 싶다고 합니다. 등록은 세 달 남았습니다. 아이는 "재미없다"고 합니다.',
    choices: [
      { label: '그만두게 한다', result: '아이가 주말에 웃기 시작했습니다. 등록금은 남았습니다.', effects: { social: 2, mental: 2, asset: -30 } },
      { label: '세 달만 더 해보자고 한다', result: '아이가 이겼습니다. 세 달 뒤 본인이 그만두겠다고 했습니다.', effects: { mental: 1, social: -1, hp: -1 } },
      { label: '같이 운동을 시작한다', result: '아이와 주말에 줄넘기를 했습니다. 둘 다 숨이 찼습니다.', effects: { hp: 2, social: 3, mental: 2 } }
    ]
  },
  {
    id: 'anniversary', stage: 'family', at: [40, 60], when: function (s) { return s.flags.결혼; }, place: '집',
    title: '결혼기념일',
    text: '오늘이 결혼기념일입니다. 아침에 배우자가 "오늘 뭐 하는 날인지 알지?"라고 합니다. 잊고 있었습니다.',
    choices: [
      { label: '꽃과 케이크를 산다', result: '늦게라도 준비했습니다. 배우자가 웃으면서 "됐어"라고 했습니다.', effects: { social: 3, mental: 2, asset: -15 } },
      { label: '솔직히 잊었다고 말한다', result: '한 시간 이야기를 나눴습니다. 마지막엔 같이 웃었습니다.', effects: { social: 1, mental: -1 } },
      { label: '아이를 부모님께 맡기고 외식한다', result: '오랜만에 둘이 밥을 먹었습니다. 대화가 어색하게 시작해 길게 이어졌습니다.', effects: { social: 3, mental: 3, asset: -20 } }
    ]
  },
  {
    id: 'pet_dog', stage: 'family', at: [41, 240], when: function (s) { return !s.flags.반려동물; }, place: '유기견 보호소',
    title: '반려견',
    text: '아이가 보호소에 가자고 합니다. 작은 믹스견이 눈을 마주칩니다. 입양 가족을 찾고 있습니다.',
    choices: [
      { label: '입양한다', result: '집에 강아지가 생겼습니다. 아침 산책이 생기고, 가족 대화가 늘었습니다.', effects: { social: 3, mental: 2, hp: -1, asset: -60 }, set: { 반려동물: true } },
      { label: '지켜보기로 한다', result: '아이가 한참 뒤돌아봤습니다. 일주일 뒤 그 강아지는 다른 가족을 만났습니다.', effects: { mental: -1 } }
    ]
  },
  {
    id: 'inlaw_hospital', stage: 'family', at: [46, 300], place: '병원',
    title: '장모님 입원',
    text: '배우자의 어머니가 수술을 받습니다. 병원비와 간병 일정을 정해야 합니다. 나는 장남도 막내도 아닙니다.',
    choices: [
      { label: '병원비를 크게 보탠다', result: '통장이 얇아졌지만 배우자가 안심했습니다. 그게 보였습니다.', effects: { asset: -600, social: 3, mental: 1 } },
      { label: '일정만 돕고 돈은 조금만', result: '처남이 더 부담했습니다. 나중에 그 이야기가 다시 나왔습니다.', effects: { asset: -100, social: -2, mental: -1 } },
      { label: '간병을 직접 맡는다', result: '한 주를 병원에서 보냈습니다. 회사 일이 밀렸지만 장모님이 내 손을 잡았습니다.', effects: { hp: -3, social: 3, mental: -1, asset: -200 } }
    ]
  },
  {
    id: 'kid_academy_diet', stage: 'family', at: [47, 90], when: function (s) { return (s.flags.자녀수 || 0) >= 1; }, place: '학원가',
    title: '학원 다이어트',
    text: '아이 학원비가 한 달 140만 원입니다. 아이가 "줄여도 된다"고 합니다. 성적은 조금 내려갈 수 있습니다.',
    choices: [
      { label: '두 개를 정리한다', result: '아이의 저녁이 생겼습니다. 성적은 한 등급 내려갔지만 표정이 밝아졌습니다.', effects: { asset: 60, social: 3, mental: 2 } },
      { label: '유지한다', result: '성적은 지켜졌습니다. 통장은 계속 빠듯합니다.', effects: { asset: -140, mental: -1 } },
      { label: '아이와 상의해서 정한다', result: '아이가 제일 싫은 하나만 빼자고 했습니다. 현실적인 결정이었습니다.', effects: { asset: 30, social: 2, mental: 2 }, set: { 자녀_자율: true } }
    ]
  },
  {
    id: 'layoff_rumor', stage: 'family', at: [48, 60], when: function (s) { return s.flags.직업 && !s.flags.명퇴; }, place: '사무실',
    title: '구조조정 소문',
    text: '조직 개편 소문이 돕니다. 내 팀 이름이 리스트에 있다는 이야기도 있습니다. 집에 말할까 고민됩니다.',
    choices: [
      { label: '배우자에게 솔직히 말한다', result: '배우자가 "같이 준비하자"고 했습니다. 그 말이 제일 큰 위로였습니다.', effects: { social: 3, mental: 2 } },
      { label: '혼자 준비한다', result: '이력서를 새로 썼습니다. 밤에 잠이 오지 않았습니다.', effects: { mental: -2, hp: -2, social: -1 } },
      { label: '회사에 남겠다고 마음먹는다', result: '하는 일을 더 챙겼습니다. 결과는 나중에 알 수 있습니다.', effects: { mental: 1, hp: -2, asset: 50 } }
    ]
  },
  {
    id: 'family_road_trip', stage: 'family', at: [49, 120], when: function (s) { return s.flags.자녀; }, place: '고속도로',
    title: '가족 차박',
    text: '주말에 차로 3시간 거리로 떠나기로 했습니다. 아이는 좋아하고, 나는 운전이 걱정됩니다.',
    choices: [
      { label: '떠난다', result: '휴게소 소떡소떡과 사진. 아이가 차에서 세 번 잤습니다.', effects: { social: 3, mental: 3, hp: -1, asset: -50 } },
      { label: '집에서 쉰다', result: '주말이 길고 조용했습니다. 아이가 "다음엔 가자"고 했습니다.', effects: { hp: 3, mental: 1, social: -1 } }
    ]
  },
  {
    id: 'couple_counsel', stage: 'family', at: [49, 240], when: function (s) { return s.flags.결혼; }, place: '상담실',
    title: '부부 상담',
    text: '요즘 대화가 줄었습니다. 배우자가 상담을 받아보자고 합니다. 비용은 회당 15만 원입니다.',
    choices: [
      { label: '같이 간다', result: '세 시간을 이야기했습니다. 처음으로 서로의 말을 끝까지 들었습니다.', effects: { social: 3, mental: 3, asset: -45 } },
      { label: '필요 없다고 한다', result: '"우리 사이에 무슨 상담이냐"고 했습니다. 배우자가 조용해졌습니다.', effects: { mental: -3, social: -2 } }
    ]
  },

  /* ══════════════ 중년 (50~64) ══════════════ */
  {
    id: 'colonoscopy', stage: 'midlife', at: [52, 60], place: '내시경실',
    title: '대장내시경',
    text: '검진 항목에 대장내시경이 있습니다. 전날 장 정결제를 먹어야 합니다. 물만 마시는 하루입니다.',
    choices: [
      { label: '받는다', result: '용종이 하나 발견되어 제거했습니다. 의사가 "잘 오셨다"고 했습니다.', effects: { hp: 2, mental: 1, asset: -20 }, set: { 검진_완료: true }, queue: ['polyp_result'] },
      { label: '다음 해로 미룬다', result: '올해는 넘겼습니다. 마음 한구석이 남았습니다.', effects: { hp: -1, mental: 1 } }
    ]
  },
  {
    id: 'polyp_result', stage: 'midlife', when: function (s) { return !!s.flags.검진_완료; }, place: '병원',
    title: '조직검사 결과',
    text: '제거한 용종의 조직검사 결과를 듣습니다. 의사가 서류를 넘기며 표정을 정리합니다.',
    choices: [
      { label: '결과를 침착하게 듣는다', result: '양성이었습니다. 6개월 뒤 다시 보자고 합니다. 숨을 크게 쉬었습니다.', effects: { mental: 3, hp: 1 } },
      { label: '결과를 듣자마자 검색한다', result: '새벽 3시까지 관련 글을 읽었습니다. 결과는 괜찮았지만 밤을 잃었습니다.', effects: { mental: -2, hp: -1 } }
    ]
  },
  {
    id: 'lotto_4th', stage: 'midlife', at: [53, 60], place: '편의점',
    title: '로또 4등',
    text: '1년째 매주 5천 원씩 사는 로또가 맞았습니다. 4등, 5만 원입니다.',
    choices: [
      { label: '가족에게 자랑한다', result: '아이가 "5만 원이면 치킨 세 마리"라고 했습니다. 그날 저녁은 치킨이었습니다.', effects: { social: 2, mental: 2, asset: 5 } },
      { label: '조용히 다음 주도 산다', result: '이번 주는 꽝. 그래도 1년을 더 샀습니다.', effects: { asset: 4, mental: 1 } },
      { label: '그만 산다', result: '1년치 25만 원을 계산해봤습니다. 손해였습니다. 쿨하게 정리했습니다.', effects: { asset: 5, mental: 2 } }
    ]
  },
  {
    id: 'young_boss', stage: 'midlife', at: [54, 30], when: function (s) { return s.flags.직업 && !s.flags.은퇴; }, place: '회의실',
    title: '나보다 어린 상사',
    text: '새 팀장이 30대 후반입니다. 나는 50대 실무자. 회의에서 내 기획이 "예전 방식"이라고 불렸습니다.',
    choices: [
      { label: '새 방식을 배운다', result: '팀장에게 툴을 배웠습니다. 한 달 뒤 내 기획이 다시 채택됐습니다.', effects: { mental: 2, hp: -2, social: 2 } },
      { label: '경력으로 버틴다', result: '내 자리는 지켰지만 회의에서 불리는 횟수가 줄었습니다.', effects: { mental: -2, social: -1 } },
      { label: '조용히 후배들을 돕는다', result: '실무의 달인이 됐습니다. 다들 나에게 물어보러 옵니다.', effects: { social: 3, mental: 1, hp: -1 } }
    ]
  },
  {
    id: 'countryside_prep', stage: 'midlife', at: [55, 240], when: function (s) { return !s.flags.귀촌; }, place: '시골 마을',
    title: '귀촌을 고민합니다',
    text: '지인이 시골 빈집을 소개합니다. 3천만 원. 마당이 있고, 가장 가까운 병원은 25분 거리입니다.',
    choices: [
      { label: '빈집을 산다', result: '주말마다 내려가 풀을 뽑았습니다. 아직 이사는 아닙니다.', effects: { asset: -3000, mental: 3, hp: -1 }, set: { 귀촌: true } },
      { label: '1년만 살아본다', result: '전세로 들어가 텃밭을 만들었습니다. 겨울이 지나고 생각이 달라졌습니다.', effects: { asset: -300, mental: 3, hp: 1, social: -1 }, set: { 귀촌: true } },
      { label: '지금 생활을 유지한다', result: '도시의 편의를 선택했습니다. 아쉬움은 남았습니다.', effects: { mental: -1, asset: 100 } }
    ]
  },
  {
    id: 'franchise_offer', stage: 'midlife', at: [56, 300], when: function (s) { return !s.flags.창업; }, place: '상담실',
    title: '프랜차이즈 제안',
    text: '지인이 카페 프랜차이즈를 권합니다. 보증금과 시설비를 합쳐 1억 5천. 월 매출 예상은 "잘 되면"이라는 전제입니다.',
    choices: [
      { label: '계약한다', result: '오픈 첫 달은 사람이 많았습니다. 두 달째부터 계산이 달라졌습니다.', effects: { asset: -15000, mental: -2, hp: -3, social: 2 }, set: { 창업: true, 직업: '자영업자' }, queue: ['franchise_reality'] },
      { label: '작은 카페를 직접 한다', result: '동네 골목에 작은 가게를 냈습니다. 임대료가 낮아 버틸 수 있습니다.', effects: { asset: -4000, mental: 2, hp: -2, social: 2 }, set: { 창업: true, 직업: '자영업자' } },
      { label: '권하지 않는 쪽을 택한다', result: '계산기를 두드려보고 접었습니다. 지인은 조금 서운해했습니다.', effects: { mental: 2, social: -1, asset: 100 } }
    ]
  },
  {
    id: 'franchise_reality', stage: 'midlife', when: function (s) { return !!s.flags.창업; }, place: '가게',
    title: '가게의 현실',
    text: '6개월째입니다. 인건비와 임대료를 빼면 남는 것이 거의 없습니다. 본사는 "프로모션을 하라"고 합니다.',
    choices: [
      { label: '메뉴를 바꾸고 버틴다', result: '단골이 조금씩 늘었습니다. 아직 적자지만 손익분기점이 보입니다.', effects: { asset: -300, hp: -3, mental: 1, social: 2 } },
      { label: '권리금을 받고 넘긴다', result: '정리하고 나오는 길에 생각보다 후련했습니다. 손실은 컸습니다.', effects: { asset: -8000, mental: 2, hp: 1 }, set: { 창업_실패: true } },
      { label: '배달을 시작한다', result: '주문이 늘었습니다. 대신 하루가 14시간이 됐습니다.', effects: { asset: 100, hp: -4, mental: -1 } }
    ]
  },
  {
    id: 'kid_independence', stage: 'midlife', at: [57, 60], when: function (s) { return (s.flags.자녀수 || 0) >= 1; }, place: '현관',
    title: '아이가 독립합니다',
    text: '아이가 짐을 싸서 나갑니다. 방이 비었습니다. 현관에서 "들어가라"고 말했는데 발이 떨어지지 않습니다.',
    choices: [
      { label: '웃으면서 보낸다', result: '문이 닫히고 나서 거실이 넓어 보였습니다. 저녁에 문자가 왔습니다.', effects: { social: 2, mental: 1 } },
      { label: '짐을 더 챙겨준다', result: '필요 없는 것까지 챙겼습니다. 아이가 "아빠"라고만 했습니다.', effects: { social: 2, mental: 2, asset: -50 } },
      { label: '방을 그대로 둔다', result: '일주일에 한 번 청소합니다. 아무도 쓰지 않는 방입니다.', effects: { mental: -2 } }
    ]
  },
  {
    id: 'silver_youtube', stage: 'midlife', at: [58, 180], place: '서재',
    title: '실버 유튜버',
    text: '은퇴 준비로 유튜브를 시작해볼까 합니다. 주제는 등산과 낚시. 카메라는 폰으로 충분하다고 합니다.',
    choices: [
      { label: '채널을 연다', result: '40개 영상을 올렸습니다. 구독자 300명. 댓글에 "아버지 같다"는 말이 달렸습니다.', effects: { mental: 3, charm: 1, hp: -1 }, set: { 유튜버: true } },
      { label: '배우기만 한다', result: '편집 강의를 다 봤습니다. 영상은 아직 없습니다.', effects: { mental: 1, asset: -10 } },
      { label: '관두고 다른 취미를 찾는다', result: '낚시 장비를 샀습니다. 그게 더 즐겁습니다.', effects: { hp: 1, mental: 2, asset: -50 } }
    ]
  },
  {
    id: 'divorce_crisis', stage: 'midlife', at: [59, 90], when: function (s) { return s.flags.결혼; }, place: '거실',
    title: '부부의 위기',
    text: '배우자가 "우리 이렇게 사는 게 맞나"라고 묻습니다. 서로 다른 방에서 잔 지 2년입니다.',
    choices: [
      { label: '대화를 다시 시작한다', result: '주말마다 한 시간씩 이야기하기로 했습니다. 어색하지만 하고 있습니다.', effects: { social: 3, mental: 2, hp: -1 } },
      { label: '시간이 해결해줄 거라고 한다', result: '그날 이후로 대화가 더 줄었습니다. 집이 조용합니다.', effects: { mental: -3, social: -2 } },
      { label: '상담을 제안한다', result: '두 달을 다녔습니다. 결론은 나지 않았지만 서로 덜 미워졌습니다.', effects: { social: 2, mental: 1, asset: -60 } }
    ]
  },
  {
    id: 'supplement_scam', stage: 'midlife', at: [60, 60], place: '문화센터 강당',
    title: '건강식품 강연',
    text: '무료 건강 강연에 갔더니 마지막에 3개월분 건강식품을 60만 원에 판매합니다. 옆자리 사람들이 줄을 섭니다.',
    choices: [
      { label: '사지 않는다', result: '뒤로 나왔습니다. 나중에 그 제품이 허위광고로 적발됐다는 뉴스를 봤습니다.', effects: { mental: 2, asset: 5 } },
      { label: '두 달 치만 산다', result: '먹어도 몸은 그대로였습니다. 40만 원이 사라졌습니다.', effects: { asset: -40, mental: -2 } },
      { label: '지인에게 알린다', result: '단체방에 기사를 공유했습니다. 몇 명이 고맙다고 했습니다.', effects: { social: 2, mental: 1 } }
    ]
  },
  {
    id: 'friend_funeral', stage: 'midlife', at: [61, 240], place: '장례식장',
    title: '동기의 부고',
    text: '같이 입사한 동기가 갑자기 세상을 떠났습니다. 마지막으로 연락한 게 3년 전입니다.',
    choices: [
      { label: '조문하고 오래 앉아 있는다', result: '유족과 이야기를 나눴습니다. 돌아오는 길에 오래 걸었습니다.', effects: { social: 2, mental: -3, asset: -20 } },
      { label: '조의금만 보낸다', result: '답장이 왔습니다. 그날 밤 잠이 늦게 왔습니다.', effects: { mental: -2, asset: -10 } }
    ]
  },
  {
    id: 'hiking_club', stage: 'midlife', repeatable: true, when: function (s) { return s.age >= 50; }, place: '등산로',
    title: '등산 동호회',
    text: '토요일 아침 6시, 산 입구에 사람들이 모였습니다. 나는 어제 회식을 했습니다.',
    choices: [
      { label: '올라간다', result: '숨이 찼지만 정상에서 다 같이 김밥을 먹었습니다. 다음 주에도 오기로 했습니다.', effects: { hp: 2, social: 2, mental: 1 } },
      { label: '중간에서 내려간다', result: '혼자 커피를 마시고 집에 갔습니다. 다들 "#힘내라"고 문자를 보냈습니다.', effects: { hp: 1, social: -1 } },
      { label: '가지 않는다', result: '두 시간을 더 잤습니다. 몸은 편합니다.', effects: { hp: 1, social: -2, mental: -1 } }
    ]
  },
  {
    id: 'will_draft', stage: 'midlife', at: [63, 150], place: '법무사 사무실',
    title: '유언장',
    text: '법무사가 유언장 작성을 권합니다. 자필로 쓰면 된다고 합니다. 종이 앞에 앉으니 손이 무겁습니다.',
    choices: [
      { label: '차분히 쓴다', result: '두 장을 썼습니다. 쓰고 나니 마음이 오히려 가벼웠습니다.', effects: { mental: 3, social: 1, asset: -30 }, set: { 유언장: true } },
      { label: '아직 이르다고 생각한다', result: '서류를 접어 가방에 넣었습니다. 다음에 하기로 했습니다.', effects: { mental: -1 } }
    ]
  },
  {
    id: 'home_remodel', stage: 'midlife', at: [58, 60], when: function (s) { return s.flags.집있음; }, place: '우리 집',
    title: '집 리모델링',
    text: '20년 된 집입니다. 주방과 욕실을 고치면 3천만 원. 배우자는 "지금이 마지막 기회"라고 합니다.',
    choices: [
      { label: '주방과 욕실만 고친다', result: '두 달 공사 끝에 집이 새집 같아졌습니다. 매일 아침이 기분 좋습니다.', effects: { asset: -3000, mental: 3, hp: 1, social: 1 } },
      { label: '전체를 고친다', result: '반년을 공사하며 살았습니다. 결과는 만족스럽지만 통장이 비었습니다.', effects: { asset: -7000, mental: 1, charm: 1 } },
      { label: '그대로 산다', result: '익숙한 집이 편합니다. 수전은 계속 물이 샙니다.', effects: { asset: 100, mental: -1 } }
    ]
  },
  {
    id: 'mid_diet_bet', stage: 'midlife', at: [51, 120], place: '체육관',
    title: '건강검진 재검',
    text: '작년 검진에서 "경계"를 받았습니다. 올해는 숫자가 더 나쁩니다. 의사가 "6개월만 해보자"고 합니다.',
    choices: [
      { label: '식단과 운동을 시작한다', result: '6개월에 7kg이 빠졌습니다. 숫자가 정상으로 돌아왔습니다.', effects: { hp: 4, mental: 2, charm: 1, asset: -50 }, set: { 운동러: true } },
      { label: '약을 받는다', result: '숫자는 안정됐습니다. 약은 계속 먹어야 합니다.', effects: { hp: 2, asset: -30 } },
      { label: '아직 괜찮다고 넘긴다', result: '서류를 서랍에 넣었습니다. 몸은 계속 신호를 보냅니다.', effects: { hp: -4, mental: 1 }, set: { 건강_나쁨: true } }
    ]
  },
  {
    id: 'mid_second_career', stage: 'midlife', at: [62, 240], place: '교육센터',
    title: '제2의 직업',
    text: '은퇴 전에 자격증을 하나 따두려 합니다. 전기기능사, 요양보호사, 조리사. 무엇이든 6개월이 걸립니다.',
    choices: [
      { label: '자격증을 딴다', result: '세 번의 필기 끝에 붙었습니다. 자격증이 생기니 선택지가 늘었습니다.', effects: { mental: 3, hp: -2, asset: -60 }, set: { 자격증: true } },
      { label: '아직 시간이 있다고 생각한다', result: '내년에 하기로 했습니다. 책은 사뒀습니다.', effects: { mental: 1, asset: -5 } }
    ]
  },

  /* ══════════════ 노년 (65~80) ══════════════ */
  {
    id: 'silver_job', stage: 'senior', at: [65, 240], place: '구청',
    title: '노인 일자리',
    text: '구청에서 노인 일자리를 신청받습니다. 하루 3시간, 월 30만 원. 공원 관리와 급식 도우미가 있습니다.',
    choices: [
      { label: '공원 관리를 신청한다', result: '아침마다 나무에 물을 줍니다. 이름을 아는 사람이 늘었습니다.', effects: { asset: 30, social: 3, hp: -2, mental: 2 }, set: { 재취업: true } },
      { label: '급식 도우미를 한다', result: '아이들에게 "할머니" 소리를 들었습니다. 하루가 빨리 갑니다.', effects: { asset: 30, social: 2, hp: -1, mental: 2 } },
      { label: '신청하지 않는다', result: '집에 있기로 했습니다. 하루가 길게 느껴집니다.', effects: { mental: -2, hp: 1 } }
    ]
  },
  {
    id: 'voice_phishing', stage: 'senior', at: [70, 180], place: '집',
    title: '보이스피싱',
    text: '낯선 번호로 전화가 왔습니다. "아드님이 사고를 당하셨습니다. 지금 바로 돈이 필요합니다." 목소리가 다급합니다.',
    choices: [
      { label: '바로 끊고 아들에게 전화한다', result: '아들은 회의 중이었습니다. 잘못된 전화였다고 하자 아들이 크게 안도했습니다.', effects: { mental: 3, social: 2 }, set: { 사기_경계: true } },
      { label: '은행에 간다', result: '은행 창구에서 직원이 이상하다며 막아줬습니다. 등골이 서늘했습니다.', effects: { mental: 1, asset: 5, hp: -1 } },
      { label: '일단 돈을 보낸다', result: '300만 원이 사라졌습니다. 경찰서에서 "돌려받기 어렵다"고 했습니다.', effects: { asset: -300, mental: -5, hp: -2 } }
    ]
  },
  {
    id: 'implant', stage: 'senior', at: [69, 90], place: '치과',
    title: '임플란트',
    text: '이가 하나 빠졌습니다. 임플란트 한 개에 120만 원. 틀니는 40만 원입니다.',
    choices: [
      { label: '임플란트를 한다', result: '석 달에 걸쳐 심었습니다. 다시 고기를 먹을 수 있게 됐습니다.', effects: { hp: 2, mental: 2, asset: -120 } },
      { label: '틀니로 한다', result: '적응이 안 되어 두 달을 고생했습니다. 결국 다시 임플란트를 했습니다.', effects: { hp: -1, mental: -1, asset: -160 } },
      { label: '그냥 둔다', result: '한쪽으로만 씹습니다. 다른 이가 더 아파옵니다.', effects: { hp: -3, mental: -1 } }
    ]
  },
  {
    id: 'cataract', stage: 'senior', at: [73, 150], place: '안과',
    title: '백내장 수술',
    text: '세상이 뿌옇습니다. 진단은 백내장. 수술은 한 시간, 비용은 한쪽에 80만 원입니다.',
    choices: [
      { label: '양쪽 다 수술한다', result: '수술 다음 날, 창문이 이렇게 하얀 줄 몰랐습니다.', effects: { hp: 2, mental: 3, asset: -160 } },
      { label: '한쪽만 한다', result: '한쪽만 맑아졌습니다. 나머지는 내년에 하기로 했습니다.', effects: { hp: 1, mental: 1, asset: -80 } },
      { label: '안경으로 버틴다', result: '돋보기를 바꿨습니다. 세상은 여전히 뿌옇습니다.', effects: { mental: -2, asset: -20 } }
    ]
  },
  {
    id: 'senior_class', stage: 'senior', at: [68, 240], place: '문화센터',
    title: '노래교실',
    text: '경로당에서 노래교실을 시작합니다. 참가비 월 2만 원. 나는 노래를 잘 못한다고 생각했습니다.',
    choices: [
      { label: '등록한다', result: '매주 목요일을 기다립니다. 마이크 잡는 게 이렇게 즐거운 줄 몰랐습니다.', effects: { mental: 3, social: 3, hp: -1, asset: -2 } },
      { label: '구경만 간다', result: '뒤에 앉아 박수를 쳤습니다. 다음 주에 또 갔습니다.', effects: { social: 2, mental: 1 } },
      { label: '가지 않는다', result: '집에서 TV를 봤습니다. 시간이 길었습니다.', effects: { mental: -2 } }
    ]
  },
  {
    id: 'grandchild_school', stage: 'senior', at: [73, 240], when: function (s) { return (s.flags.자녀수 || 0) >= 1; }, place: '초등학교',
    title: '손주 입학식',
    text: '손주가 초등학교에 들어갑니다. 아이가 "할아버지도 와주세요"라고 했습니다. 학교는 40분 거리입니다.',
    choices: [
      { label: '가서 사진을 찍는다', result: '교문 앞에서 세 명이 나란히 찍었습니다. 그 사진을 지갑에 넣었습니다.', effects: { social: 3, mental: 3, hp: -1, asset: -10 } },
      { label: '영상통화로 축하한다', result: '화면 속에서 손주가 손을 흔들었습니다. 충분했습니다.', effects: { social: 1, mental: 2 } }
    ]
  },
  {
    id: 'fall_risk', stage: 'senior', at: [76, 60], place: '욕실',
    title: '욕실에서 미끄러짐',
    text: '욕실 바닥에서 발이 미끄러졌습니다. 다행히 손으로 짚었지만 손목이 아픕니다.',
    choices: [
      { label: '병원에 간다', result: '골절은 아니었습니다. 미끄럼 방지 매트를 사라고 권했습니다.', effects: { hp: 1, mental: 1, asset: -15 } },
      { label: '참고 지낸다', result: '일주일을 불편하게 지냈습니다. 무서워서 샤워를 미루게 됩니다.', effects: { hp: -3, mental: -2 } },
      { label: '안전 손잡이를 설치한다', result: '욕실이 조금 달라졌습니다. 다음엔 안전할 겁니다.', effects: { hp: 2, mental: 2, asset: -30 } }
    ]
  },
  {
    id: 'care_facility', stage: 'senior', at: [78, 240], when: function (s) { return s.flags.건강_나쁨 || s.stats.hp <= 40; }, place: '요양원',
    title: '요양원 결정',
    text: '아이가 요양원을 알아보자고 합니다. 집에서 혼자 지내는 시간이 깁니다. 시설은 좋지만 집이 아닙니다.',
    choices: [
      { label: '들어간다', result: '방은 깨끗하고 간호사가 자주 옵니다. 창밖에 나무가 있습니다.', effects: { hp: 3, mental: -2, social: 2, asset: -200 } },
      { label: '집에 있겠다고 한다', result: '아이가 주 3회 들르기로 했습니다. 혼자인 시간이 길어집니다.', effects: { mental: 2, social: -2, hp: -1 } },
      { label: '주간보호센터를 다닌다', result: '낮에만 다니고 저녁엔 집. 둘 다 만족한 절충안이었습니다.', effects: { hp: 2, mental: 2, asset: -60 } }
    ]
  },
  {
    id: 'legacy_talk', stage: 'senior', at: [77, 180], place: '거실',
    title: '상속 이야기',
    text: '아이가 조심스럽게 재산 이야기를 꺼냅니다. 나는 아직 정리하지 않았습니다. 서류는 서랍에 있습니다.',
    choices: [
      { label: '미리 정리해둔다', result: '통장과 서류를 한 폴더에 모았습니다. 아이에게 위치를 알려줬습니다.', effects: { mental: 3, social: 2, hp: -1 } },
      { label: '"나중에"라고 말한다', result: '아이가 고개를 끄덕이고 화제를 바꿨습니다. 서류는 그대로입니다.', effects: { mental: -1 } },
      { label: '기부도 생각한다', result: '작은 단체에 매달 보내기로 했습니다. 아이도 괜찮다고 했습니다.', effects: { mental: 2, social: 1, asset: -300 } }
    ]
  },
  {
    id: 'old_age_diary', stage: 'senior', repeatable: true, when: function (s) { return s.age >= 70; }, place: '창가',
    title: '창가의 오후',
    text: '오후 두 시, 햇빛이 좋습니다. 오늘 할 일이 없습니다. 몸은 무겁고 마음은 조용합니다.',
    choices: [
      { label: '일기를 쓴다', result: '한 장을 채웠습니다. 읽어보니 지난달과 거의 같은 이야기였습니다.', effects: { mental: 2, social: -1 } },
      { label: '산책을 나간다', result: '공원까지 20분. 돌아오니 다리가 아팠지만 기분은 좋았습니다.', effects: { hp: 1, social: 1, mental: 1 } },
      { label: '낮잠을 잔다', result: '두 시간을 잤습니다. 밤에 잠이 오지 않습니다.', effects: { hp: 2, mental: -1 } }
    ]
  },
  {
    id: 'senior_trip_family', stage: 'senior', at: [74, 240], when: function (s) { return (s.flags.자녀수 || 0) >= 1; }, place: '공항',
    title: '가족 여행 초대',
    text: '아이가 "여름에 다 같이 가자"고 합니다. 5박 7일 해외. 체력이 걱정됩니다.',
    choices: [
      { label: '같이 간다', result: '비행기에서 다리가 부었지만 손주와 물놀이를 했습니다. 사진이 가득합니다.', effects: { mental: 4, social: 3, hp: -3, asset: -300 } },
      { label: '집에 있겠다고 한다', result: '아이들이 사진을 보내줬습니다. 액자에 넣어두었습니다.', effects: { hp: 2, mental: -1, social: -1 } }
    ]
  },
  {
    id: 'senior_hospital_room', stage: 'senior', at: [79, 120], place: '병원 병실',
    title: '병실의 밤',
    text: '며칠째 입원 중입니다. 옆 침상 사람이 밤마다 이야기를 겁니다. 오늘은 내 차례인 것 같습니다.',
    choices: [
      { label: '이야기를 나눈다', result: '새벽 1시까지 살아온 이야기를 했습니다. 처음 보는 사람인데 편했습니다.', effects: { social: 3, mental: 2, hp: -1 } },
      { label: '조용히 눈을 감는다', result: '잠은 얕았지만 몸은 조금 회복됐습니다.', effects: { hp: 2, social: -1 } }
    ]
  },

  /* ══════════════ 어느 때나 — 돌발 이벤트 ══════════════ */
  {
    id: 'any_year_end_tax', stage: 'any', when: function (s) { return s.age >= 25 && s.age <= 60; }, place: '연말정산',
    title: '연말정산',
    text: '연말정산 결과가 나왔습니다. "추가 납부 32만 원"입니다. 회사 사람들이 단톡방에서 욕을 하고 있습니다.',
    choices: [
      { label: '공제 항목을 다시 본다', result: '의료비와 교육비가 빠져 있었습니다. 넣으니 12만 원으로 줄었습니다.', effects: { asset: 20, mental: 2 } },
      { label: '그냥 낸다', result: '월급에서 빠져나갔습니다. 다음 해도 같은 일이 반복됐습니다.', effects: { asset: -32, mental: -1 } }
    ]
  },
  {
    id: 'any_phone_lost', stage: 'any', when: function (s) { return s.age >= 15; }, place: '택시',
    title: '휴대폰 분실',
    text: '택시에서 내린 뒤 주머니가 비어 있습니다. 연락처도 사진도 계정도 다 그 안에 있었습니다.',
    choices: [
      { label: '위치 추적을 켠다', result: '30분 뒤 기사님이 돌려주겠다고 전화했습니다. 사례금을 드렸습니다.', effects: { asset: -5, mental: 2 } },
      { label: '바로 신고하고 새 폰을 산다', result: '번호는 그대로 옮겼습니다. 사진은 절반을 잃었습니다.', effects: { asset: -80, mental: -2 } },
      { label: '하루를 기다려본다', result: '다음 날 아무 연락이 없었습니다. 결국 새로 샀습니다.', effects: { asset: -80, mental: -3, hp: -1 } }
    ]
  },
  {
    id: 'any_car_touch', stage: 'any', when: function (s) { return s.flags.차있음 || s.flags.면허; }, place: '주차장',
    title: '접촉사고',
    text: '주차하다 옆 차 범퍼에 흠집을 냈습니다. 상대 차에는 연락처가 없습니다. 보험료가 오를 수 있습니다.',
    choices: [
      { label: '쪽지를 남기고 보험을 부른다', result: '상대가 고맙다고 했습니다. 보험료는 조금 올랐습니다.', effects: { asset: -20, social: 2, mental: 1 } },
      { label: '그냥 간다', result: '집에 와서도 계속 생각났습니다. 일주일 뒤 블랙박스 영상으로 연락이 왔습니다.', effects: { asset: -60, mental: -4, social: -2 } },
      { label: '현장에서 직접 해결하려 한다', result: '주인을 기다려 20만 원에 합의했습니다. 보험은 쓰지 않았습니다.', effects: { asset: -20, mental: 1, hp: -1 } }
    ]
  },
  {
    id: 'any_typhoon', stage: 'any', when: function (s) { return s.age >= 10; }, place: '우리 집',
    title: '태풍',
    text: '태풍이 올라온다고 합니다. 창문이 흔들립니다. 베란다에 화분과 자전거가 그대로 있습니다.',
    choices: [
      { label: '미리 다 치운다', result: '밤새 바람이 불었지만 잃은 것이 없었습니다.', effects: { hp: -1, mental: 2, social: 1 } },
      { label: '그냥 둔다', result: '아침에 화분이 깨져 있었습니다. 다행히 아래층은 비어 있었습니다.', effects: { asset: -5, mental: -2 } }
    ]
  },
  {
    id: 'any_invest_room', stage: 'any', when: function (s) { return s.age >= 25; }, place: '메신저',
    title: '리딩방 초대',
    text: '지인이 "무료 리딩방"에 초대합니다. 화면마다 수익 인증 사진이 올라옵니다. 첫 종목은 "지금이 마지막"이라고 합니다.',
    choices: [
      { label: '나간다', result: '방을 나왔습니다. 그리고 그 종목이 사라진 것을 3개월 뒤 뉴스로 봤습니다.', effects: { mental: 2, social: -1 } },
      { label: '소액만 넣어본다', result: '처음엔 벌었습니다. 두 번째에 잃었습니다. 총액은 손해였습니다.', effects: { asset: -100, mental: -3 } }
    ]
  },
  {
    id: 'any_smishing', stage: 'any', when: function (s) { return s.age >= 20; }, place: '휴대폰',
    title: '택배 문자',
    text: '"주소 불일치로 반송 예정"이라는 문자가 왔습니다. 링크가 붙어 있습니다. 최근 주문한 것이 없습니다.',
    choices: [
      { label: '링크를 열지 않고 지운다', result: '그 문자는 피싱이었습니다. 앱에서 차단 목록에 추가했습니다.', effects: { mental: 2 }, set: { 사기_경계: true } },
      { label: '확인차 링크를 연다', result: '주소와 카드번호를 넣으라는 화면이 떴습니다. 닫았지만 찜찜합니다.', effects: { mental: -2 } }
    ]
  },
  {
    id: 'any_volunteer', stage: 'any', when: function (s) { return s.age >= 25; }, place: '지역아동센터',
    title: '봉사활동',
    text: '회사에서 봉사활동 참가자를 모집합니다. 하루 반나절. 신청서에는 "조식 배식"이라고 적혀 있습니다.',
    choices: [
      { label: '신청한다', result: '새벽 5시에 일어나 국을 나눴습니다. 하루가 길고 깨끗했습니다.', effects: { social: 3, mental: 2, hp: -2 } },
      { label: '패스한다', result: '그날 오전을 집에서 보냈습니다. 알람은 껐습니다.', effects: { hp: 2, social: -1 } }
    ]
  },
  {
    id: 'any_book_habit', stage: 'any', when: function (s) { return s.age >= 15; }, repeatable: true, place: '서점',
    title: '책 한 권',
    text: '서점에 들렀습니다. 베스트셀러 코너에서 누군가 "인생이 바뀐다"고 써 붙인 책이 보입니다.',
    choices: [
      { label: '사서 끝까지 읽는다', result: '두 주 만에 다 읽었습니다. 기억나는 문장은 세 개입니다.', effects: { mental: 2, hp: -1, asset: -15 } },
      { label: '서서 반쯤 읽는다', result: '결론은 다 봤습니다. 산 것과 비슷합니다.', effects: { mental: 1, asset: -5 } },
      { label: '그냥 나온다', result: '커피만 마시고 나왔습니다. 그 책은 1년 뒤에도 베스트셀러입니다.', effects: { mental: 1 } }
    ]
  },
  {
    id: 'any_neighbor_help', stage: 'any', repeatable: true, place: '엘리베이터',
    title: '이웃의 부탁',
    text: '옆집 사람이 택배를 대신 받아달라고 합니다. 가끔은 필요한 물건을 빌려가기도 합니다.',
    choices: [
      { label: '기꺼이 받아준다', result: '고맙다는 인사와 함께 김치통이 왔습니다. 다음엔 내가 부탁할 수 있습니다.', effects: { social: 2, mental: 1 } },
      { label: '부재중이라고 한다', result: '소소한 거리를 유지했습니다. 다만 엘리베이터에서 인사가 짧아졌습니다.', effects: { social: -2, mental: 1 } }
    ]
  },
  {
    id: 'any_diet_home', stage: 'any', when: function (s) { return s.age >= 20; }, place: '집',
    title: '자세 교정',
    text: '거울을 보니 어깨가 말려 있습니다. 목도 뻣뻣합니다. 사무실 생활 10년의 결과입니다.',
    choices: [
      { label: '스트레칭을 매일 한다', result: '한 달 하니 목이 덜 아픕니다. 10분이 아깝지 않습니다.', effects: { hp: 2, charm: 1, mental: 1 } },
      { label: '그냥 둔다', result: '어깨는 여전히 말려 있습니다. 사진 찍을 때만 펴게 됩니다.', effects: { charm: -1, mental: 1 } }
    ]
  }

]);
