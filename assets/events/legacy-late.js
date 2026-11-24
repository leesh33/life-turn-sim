/* ─────────────────────────────────────────────
   content.late.js — 사회생활(25~34) · 가정(35~49) · 중년(50~64) · 노년(65~80) · 돌발
   ───────────────────────────────────────────── */
window.LIFE_EVENTS = (window.LIFE_EVENTS || []).concat([

  /* ══════════════ 25세 — 취직 ══════════════ */
  {
    id: 'job_start', stage: 'work', at: [25, 1], place: '입사 첫날', milestone: true, weight: 6,
    title: '취직',
    text: '사원증을 받았습니다. 이름 옆에 직급이 적혀 있습니다. 사수가 "여기 앉으세요"라고 합니다.',
    choices: [
      { label: '대기업 기획·전략 직무', result: '체계는 좋지만 회의가 많습니다. 보고서 서식이 하루를 잡아먹습니다.', effects: { mental: -1, charm: 1, social: 1 }, set: { 직업: '대기업 기획자' } },
      { label: '스타트업 개발·프로덕트', result: '사람이 열 명입니다. 월요일에 출시하고 수요일에 다시 고칩니다.', effects: { mental: 2, hp: -2, charm: 2 }, set: { 직업: '스타트업 개발자' } },
      { label: '공기업 · 공무원', result: '정시 퇴근은 확실합니다. 대신 일이 정체되어 있다는 말을 듣습니다.', effects: { mental: 3, hp: 2, social: 1 }, set: { 직업: '공무원' } },
      { label: '중소기업 영업·관리', result: '사장님과 점심을 먹습니다. 회사가 작아 시야는 넓어집니다.', effects: { social: 2, hp: -1, asset: 20 }, set: { 직업: '중소기업 사원' } }
    ]
  },
  {
    id: 'first_salary', stage: 'work', at: [25, 2], place: '월급날', milestone: true, weight: 5,
    title: '첫 월급',
    text: '통장에 320만 원이 찍혔습니다. 세금과 4대 보험을 떼고 나니 처음 본 금액입니다.\n이 돈을 어디에 쓸까요?',
    choices: [
      { label: '부모님 선물을 산다', result: '엄마가 "이거 뭐냐" 하면서도 계속 만지작거렸습니다. 아버지는 조용히 사진을 찍었습니다.', effects: { social: 3, asset: -40, mental: 2 } },
      { label: '전부 저축한다', result: '잔고가 처음으로 네 자리가 됐습니다. 통장을 하루에 세 번 열어봤습니다.', effects: { asset: 300, mental: 2 } },
      { label: '친구들과 다 쓴다', result: '노래방과 술. 월요일에 계좌를 보니 12만 원이 남았습니다.', effects: { social: 3, mental: 3, asset: -70 } }
    ]
  },
  {
    id: 'company_dinner', stage: 'work', at: [26, 3], place: '회식',
    title: '첫 회식',
    text: '부서 회식입니다. 부장님이 잔을 들고 다니며 이름을 부릅니다. 저녁 8시에 시작해 12시가 됐습니다.',
    choices: [
      { label: '끝까지 자리를 지킨다', result: '부장님이 "쓸 만하다"고 했습니다. 다음 날 숙취 속 출근.', effects: { social: 3, hp: -2, mental: -1 }, set: { 야근러: true } },
      { label: '적당히 빠지며 집에 간다', result: '다들 아쉬워했지만 다음 날 아무도 기억하지 않았습니다.', effects: { hp: 1, mental: 2, social: -1 }, set: { 워라밸러: true } },
      { label: '2차도 따라간다', result: '새벽 2시에 귀가. 팀장님이 내 이름을 처음으로 제대로 외웠습니다.', effects: { social: 3, hp: -3, mental: -2 }, set: { 야근러: true } }
    ]
  },
  {
    id: 'first_project', stage: 'work', at: [26, 7], place: '회의실',
    title: '첫 프로젝트',
    text: '첫 프로젝트 리더가 됐습니다. 일정은 6주, 인력은 반 명(사수가 반만 붙어줍니다).',
    choices: [
      { label: '혼자 다 짊어지고 밤샌다', result: '결과물은 나왔습니다. 대신 6주 동안 주말이 없었습니다.', effects: { mental: -2, hp: -3, asset: 60 }, set: { 야근러: true, 성과_인정: true } },
      { label: '협의해서 일정을 늘린다', result: '책임자와 함께 지도를 다시 그렸습니다. 첫 사회생활의 협상.', effects: { mental: 3, social: 2 }, set: { 협상가: true } },
      { label: '대충 넘기고 관심을 돌린다', result: '무난하게 끝났습니다. 능력이 드러나지도 않았습니다.', effects: { mental: 1, social: -1 } }
    ]
  },
  {
    id: 'overtime_night', stage: 'work', minAge: 25, maxAge: 34, repeatable: true, place: '사무실 밤 11시',
    title: '야근',
    text: '밤 11시입니다. 팀장은 퇴근했고, 나는 세 번째 수정본을 만들고 있습니다.',
    choices: [
      { label: '끝까지 하고 퇴근한다', result: '택시비를 지원받고 새벽 1시에 집에 도착했습니다.', effects: { hp: -2, mental: -2, social: 1, asset: 5 }, set: { 야근러: true } },
      { label: '적당히 하고 내일로 넘긴다', result: '다음 날 오전에 마무리했습니다. 아무 문제 없었습니다.', effects: { mental: 1, hp: 1, social: -1 }, set: { 워라밸러: true } }
    ]
  },
  {
    id: 'promotion_race', stage: 'work', at: [28, 4], place: '인사시즌',
    title: '승진 경쟁',
    text: '승진 후보에 동기 두 명과 나, 셋이 올랐습니다. 자리는 하나입니다.',
    choices: [
      { label: '성과로 증명한다', result: '숫자가 나를 말해줬습니다. 승진했습니다.', effects: { mental: 2, hp: -2, asset: 120, social: 2 }, set: { 승진: true } },
      { label: '사람에게 신경 쓴다', result: '팀장님이 "한 번 더 기다리자"고 하셨습니다. 다음 기회를 약속받았습니다.', effects: { social: 3, mental: -1 } },
      { label: '이직할 곳을 알아본다', result: '한 단계 위로 가는 길을 발견했습니다.', effects: { mental: 1, social: 1 }, set: { 이직결심: true } }
    ]
  },
  {
    id: 'headhunter', stage: 'work', at: [29, 6], place: '점심시간',
    title: '헤드헌터의 연락',
    text: '모르는 번호로 전화가 왔습니다. "더 좋은 자리가 있습니다. 연봉 15% 인상."',
    choices: [
      { label: '면접을 본다', result: '합격 통보가 왔습니다. 지금 회사를 그만둘지 고민됩니다.', effects: { mental: 1, social: 1 }, set: { 이직결심: true }, queue: ['job_move'] },
      { label: '지금 회사에 남는다', result: '정중히 거절했습니다. 이직은 없다는 마음을 굳혔습니다.', effects: { mental: 2, social: 1 } }
    ]
  },
  {
    id: 'job_move', stage: 'work', minAge: 29, maxAge: 34, place: '새 회사',
    title: '이직',
    text: '사표를 냈습니다. 인수인계 2주, 새 회사 출근 첫날입니다.',
    choices: [
      { label: '새 회사로 간다', result: '연봉이 15% 올랐습니다. 그러나 사람과 업무를 처음부터 다시 알아가야 합니다.', effects: { asset: 200, mental: -1, social: -2 }, set: { 이직횟수: 1, 승진: true } },
      { label: '결국 사표를 찢는다', result: '사장님과 한 번 더 이야기하고 남았습니다. 이번에 팀장을 달았습니다.', effects: { social: 2, mental: 1 }, set: { 승진: true } }
    ]
  },
  {
    id: 'office_politics', stage: 'work', at: [30, 3], place: '회의실',
    title: '사내 정치',
    text: '팀장과 실장이 미묘하게 갈등합니다. 두 사람 모두에게서 내가 나쁜 예시로 회자됩니다.',
    choices: [
      { label: '중립을 지킨다', result: '양쪽에서 조금씩 멀어졌지만, 살아남았습니다.', effects: { mental: 1, social: -2 } },
      { label: '한쪽에 확실히 붙는다', result: '한 명의 사람이 됐습니다. 그가 이기면 나도 오릅니다.', effects: { mental: -1, social: 1 }, set: { 편가르기: true } },
      { label: '회사를 바꾸기로 결심한다', result: '"결국 사람이 회사다"를 확인하고 이직 준비를 시작했습니다.', effects: { mental: 1, social: 1 }, set: { 이직결심: true } }
    ]
  },
  {
    id: 'health_check', stage: 'work', at: [31, 9], place: '건강검진센터',
    title: '건강검진',
    text: '검진 결과가 나왔습니다. 혈압이 살짝 높고, 콜레스테롤이 경계입니다. 재검사 권고.',
    choices: [
      { label: '운동을 시작한다', result: '아침 러닝을 등록했습니다. 3개월 후 수치가 내려갔습니다.', effects: { hp: 3, mental: 2, asset: -20 } },
      { label: '내년에 다시 받는다', result: '지표는 무시하면 안 되는데, 늘 내년이라고 말합니다.', effects: { hp: -3, mental: 1 }, set: { 건강_주의: true } }
    ]
  },
  {
    id: 'cheongyak', stage: 'work', at: [27, 5], when: function (s) { return !s.flags.청약통장; }, place: '은행',
    title: '청약통장',
    text: '직장 동기가 "청약통장은 무조건 만들어야 한다"고 합니다. 매달 10만 원씩 납입입니다.',
    choices: [
      { label: '통장을 만든다', result: '월 10만 원이 자동이체됩니다. 나중에 이게 인생을 바꿀 줄은 모릅니다.', effects: { asset: -30, mental: 1 }, set: { 청약통장: true } },
      { label: '당장 살 돈이 없다 — 나중에', result: '없는 것도 괜찮지만, 나중에 후회할지도 모릅니다.', effects: { asset: 30 } }
    ]
  },
  {
    id: 'first_car', stage: 'work', at: [28, 9], place: '전시장',
    title: '첫 차',
    text: '차를 사려고 합니다. 국산 신차 할부 vs 3년 된 중고 일시불. 둘 다 설레는 말입니다.',
    choices: [
      { label: '국산 신차 · 할부', result: '새차 냄새를 즐겼습니다. 매달 48만 원의 부채가 생겼습니다.', effects: { asset: -700, charm: 2, mental: 2 }, set: { 차있음: true, 대출: true } },
      { label: '중고차 · 일시불', result: '현금으로 해결했습니다. 부채 없이 움직입니다.', effects: { asset: -900, charm: 1 }, set: { 차있음: true } },
      { label: '대중교통으로 버틴다', result: '지하철에서 한 시간. 우울할 때도 있지만 통장은 편안합니다.', effects: { asset: 100, mental: -1, hp: -1 } }
    ]
  },
  {
    id: 'jeonse', stage: 'work', at: [30, 11], when: function (s) { return !s.flags.집있음; }, place: '부동산',
    title: '전세 계약',
    text: '원룸에서 나와 전세를 보러 다닙니다. 보증금 2억 2천. 대출을 받아야 합니다.',
    choices: [
      { label: '전세로 간다 · 대출', result: '보증금 대출을 받고 이사했습니다. 매달 이자와 주거의 안정이 동시에 왔습니다.', effects: { asset: -2000, mental: 2, social: 1 }, set: { 전세: true, 대출: true } },
      { label: '월세로 버틴다', result: '원룸에 남았습니다. 월 60만 원. 대신 이사의 자유가 있습니다.', effects: { asset: -60, mental: 1 } }
    ]
  },
  {
    id: 'blind_date', stage: 'work', at: [32, 6], when: function (s) { return !s.flags.결혼; }, place: '카페',
    title: '소개팅',
    text: '친구가 소개팅을 주선했습니다. 상대는 같은 동네 다른 회사를 다니는 사람입니다.\n30분 뒤, 카페 문이 열립니다.',
    choices: [
      { label: '솔직하게 다 이야기한다', result: '대화가 끊기지 않았습니다. 다음 주에 또 만나기로 했습니다.', effects: { charm: 2, social: 3, mental: 3 }, set: { 연애중: true }, queue: ['marriage_prep'] },
      { label: '적당히 포장한다', result: '분위기는 좋았지만 두 번째 약속은 잡히지 않았습니다.', effects: { mental: -1 } },
      { label: '지금은 일이 먼저라고 생각한다', result: '집에 돌아와 야근을 했습니다. 마음은 조금 허했습니다.', effects: { mental: -2, hp: -1 } }
    ]
  },
  {
    id: 'side_project', stage: 'work', at: [31, 7], place: '집',
    title: '부업 아이디어',
    text: '퇴근 후 시간이 아깝습니다. 유튜브 채널, 재테크 블로그, 온라인 강의 중 하나를 시작할 수 있습니다.',
    choices: [
      { label: '유튜브 채널을 연다', result: '구독자 100명이 3개월 걸렸습니다. 첫 수익은 4천 원이었지만 기뻤습니다.', effects: { mental: 2, hp: -2, asset: 15, charm: 1 }, set: { 유튜버: true } },
      { label: '재테크 공부를 한다', result: '월급관리와 주식 기초를 익혔습니다. 30대의 자산이 여기서 갈립니다.', effects: { mental: 2, asset: 60 }, set: { 재테크: true } },
      { label: '쉬는 게 낫다', result: '퇴근 후 넷플릭스. 이 또한 회복입니다.', effects: { mental: 3, hp: 2 } }
    ]
  },
  {
    id: 'marriage_prep', stage: 'work', at: [33, 6], when: function (s) { return !s.flags.결혼; }, place: '웨딩홀', milestone: true,
    title: '결혼 준비',
    text: '양가 상견례가 끝났습니다. 예식장, 신혼집, 예물, 혼수. 숫자가 계속 늘어납니다.',
    choices: [
      { label: '조촐하게 하자고 설득한다', result: '가족 식사로 대신했습니다. 남은 돈은 신혼집에 썼습니다.', effects: { asset: -1500, mental: 2, social: -1 }, set: { 결혼: true } },
      { label: '원하는 대로 해준다', result: '예식은 아름다웠습니다. 통장은 창백해졌습니다.', effects: { asset: -3500, charm: 3, social: 3, mental: -1 }, set: { 결혼: true } },
      { label: '아직 준비가 안 됐다고 말한다', result: '둘 다 조용해졌습니다. 결혼은 다음으로 미뤄졌습니다.', effects: { mental: -2, social: -2 } }
    ]
  },
  {
    id: 'salary_day_work', stage: 'work', minAge: 25, maxAge: 34, repeatable: true, place: '월급날',
    title: '월급날',
    text: '25일, 월급이 들어왔습니다. 고정지출을 빼고 남은 돈이 보입니다.',
    choices: [
      { label: '일부는 저축, 일부는 쓴다', result: '균형을 지켰습니다.', effects: { asset: 120, mental: -1, hp: -1 } },
      { label: '한 번에 다 쓴다', result: '만족은 하루, 후회는 한 달.', effects: { charm: 2, mental: 1, asset: -60, hp: -1 } }
    ]
  },

  /* ══════════════ 35세 — 결혼 ══════════════ */
  {
    id: 'wedding', stage: 'family', at: [35, 1], when: function (s) { return !s.flags.결혼; }, place: '예식장', milestone: true, weight: 6,
    title: '결혼',
    text: '예식장입니다. 신부 입장 음악이 흐르고, 200명의 눈이 나를 봅니다.\n서약서를 읽을 순서입니다.',
    choices: [
      { label: '준비한 서약을 읽는다', result: '목소리가 떨렸습니다. 뒤에서 엄마가 울었습니다. 결혼했습니다.', effects: { social: 4, mental: 3, asset: -2000, charm: 2 }, set: { 결혼: true, 배우자: true } },
      { label: '눈을 보며 즉석에서 말한다', result: '준비한 대본은 없었지만 진심이었다고 합니다. 하객들이 박수를 보냈습니다.', effects: { social: 3, mental: 3, charm: 3, asset: -1800 }, set: { 결혼: true, 배우자: true } },
      { label: '아직 아니다 — 오늘은 여기까지', result: '예식장 앞에서 돌아섰습니다. 미안함과 홀가분함이 반반이었습니다.', effects: { mental: -2, social: -2, asset: 2000 } }
    ]
  },
  {
    id: 'honeymoon', stage: 'family', at: [35, 3], when: function (s) { return s.flags.결혼; }, place: '공항', milestone: true,
    title: '신혼여행',
    text: '신혼여행을 어디로 갈지 정해야 합니다. 5박 7일, 예산은 500만 원입니다.',
    choices: [
      { label: '가까운 휴양지', result: '물놀이와 낮잠. 체력이 남았습니다.', effects: { hp: 3, mental: 3, asset: -450 } },
      { label: '먼 유럽', result: '파리, 로마, 피렌체. 사진이 천 장 쌓였습니다.', effects: { charm: 3, mental: 2, asset: -850 } },
      { label: '국내 소도시', result: '조용한 바닷가 펜션. 신혼의 시작은 소박했습니다.', effects: { mental: 3, asset: -150 } }
    ]
  },
  {
    id: 'first_child', stage: 'family', at: [36, 4], when: function (s) { return s.flags.결혼 && !s.flags.자녀; }, place: '분만실', milestone: true, weight: 6,
    title: '아이가 생겼습니다',
    text: '새벽 4시에 전화가 왔습니다. 병원 복도에서 다섯 시간을 기다렸습니다.\n울음소리가 들립니다.',
    choices: [
      { label: '먼저 안아본다', result: '손가락이 다섯 개씩 있습니다. 세상이 조금 가벼워졌습니다.', effects: { social: 3, mental: 3, hp: -2, asset: -300 }, set: { 자녀: true, 자녀수: 1 } },
      { label: '육아휴직을 신청한다', result: '6개월간 아이와 집에 있었습니다. 회사는 잠시 잊었습니다.', effects: { social: 3, mental: 2, hp: -1, asset: -150 }, set: { 자녀: true, 자녀수: 1, 육아휴직: true } }
    ]
  },
  {
    id: 'parenting_night', stage: 'family', at: [37, 3], when: function (s) { return s.flags.자녀; }, place: '아이 방 새벽',
    title: '아이의 새벽 수유',
    text: '새벽 3시, 아이가 웁니다. 내일은 중요한 보고가 있습니다. 배우자는 깊이 잠들었습니다.',
    choices: [
      { label: '내가 일어난다', result: '한 시간을 달랬습니다. 보고는 무사히 했지만 하루 종일 멍했습니다.', effects: { hp: -3, social: 3, mental: -1 } },
      { label: '배우자를 깨운다', result: '둘 다 조금씩 잠을 잃었습니다. 다음 날 다퉜습니다.', effects: { hp: 1, social: -2, mental: -1 } },
      { label: '수면교육을 시작한다', result: '울음을 견디는 일주일. 이후로 밤이 돌아왔습니다.', effects: { mental: 2, hp: 2, social: 1 } }
    ]
  },
  {
    id: 'cheongyak_win', stage: 'family', at: [37, 6], when: function (s) { return s.flags.청약통장 && !s.flags.청약당첨; }, place: '부동산', milestone: true, weight: 6,
    title: '청약 당첨',
    text: '문자가 왔습니다. "당첨자 발표 — 축하합니다."\n계약금이 필요합니다. 잔금 일정도 2년 남았습니다.',
    choices: [
      { label: '계약금을 낸다 — 받는다', result: '계약금을 냈습니다. 2년 뒤를 위해 매달 저축을 시작합니다.', effects: { asset: -2000, mental: 3, social: 3 }, set: { 청약당첨: true }, queue: ['mortgage'] },
      { label: '포기한다 · 감당이 안 된다', result: '후보 번호가 다음 사람에게 넘어갔습니다. 다시 몇 년을 기다려야 합니다.', effects: { mental: -3, social: -1 } }
    ]
  },
  {
    id: 'mortgage', stage: 'family', minAge: 35, maxAge: 40, place: '은행',
    title: '잔금과 대출',
    text: '대출 상담 창구입니다. 5억 원, 30년, 금리 4.1%. 서류에 서명하면 집이 내 것이 됩니다.',
    choices: [
      { label: '서명한다', result: '내 집이 생겼습니다. 매달 240만 원이 정해진 날짜에 사라집니다.', effects: { asset: -5000, mental: 2, social: 3 }, set: { 집있음: true, 대출: true } },
      { label: '더 싼 대출을 찾아본다', result: '은행 세 곳을 돌았습니다. 금리 0.3%p를 아꼈습니다.', effects: { asset: -4800, mental: 2, hp: -1 }, set: { 집있음: true, 대출: true, 절약왕: true } }
    ]
  },
  {
    id: 'promotion_manager', stage: 'family', at: [39, 9], when: function (s) { return s.flags.직업 && !s.flags.명퇴; }, place: '인사발령',
    title: '과장 · 팀장',
    text: '팀장 자리가 비었습니다. 나와 옆 팀 과장이 후보입니다. 이 자리는 책임이 두 배입니다.',
    choices: [
      { label: '팀장 자리를 받아들인다', result: '팀장이 되었습니다. 회의는 늘고, 내 판단을 미루는 사람이 없습니다.', effects: { mental: -1, hp: -2, asset: 300, social: 2 }, set: { 승진: true, 관리자: true } },
      { label: '고사한다', result: '실무자로 남았습니다. 야근은 줄고 저녁이 생겼습니다.', effects: { mental: 3, hp: 2, asset: 60 }, set: { 워라밸러: true } }
    ]
  },
  {
    id: 'kid_academy', stage: 'family', at: [42, 4], when: function (s) { return s.flags.자녀; }, place: '학원가',
    title: '아이 학원',
    text: '아이가 초등학교에 갑니다. 옆집 아이는 영어·수학·피아노를 다닌다고 합니다.',
    choices: [
      { label: '필요한 것만 시킨다', result: '아이의 저녁이 남았습니다. 대신 조금 불안합니다.', effects: { mental: 2, asset: -100, social: 1 } },
      { label: '다 시킨다', result: '주말이 사라졌습니다. 아이도 나도 지칩니다.', effects: { asset: -400, social: -2, mental: -2 } },
      { label: '아이에게 물어본다', result: '아이는 "축구"라고 했습니다. 예상 밖이었지만 웃음이 나왔습니다.', effects: { social: 3, mental: 3, asset: -120 }, set: { 자녀_자율: true } }
    ]
  },
  {
    id: 'couple_fight', stage: 'family', at: [40, 7], when: function (s) { return s.flags.결혼; }, place: '거실',
    title: '부부 싸움',
    text: '주말에 어디 갈지로 시작된 이야기가 세 시간째 이어집니다. 마지막엔 3년 전 일이 나왔습니다.',
    choices: [
      { label: '먼저 사과한다', result: '대화가 풀렸습니다. 자존심보다 관계가 크다는 걸 배웁니다.', effects: { social: 3, mental: 2 } },
      { label: '논리로 따져 이기려 든다', result: '말은 이겼습니다. 방은 조용해졌고, 3일간 대화가 없었습니다.', effects: { mental: -2, social: -3 } },
      { label: '잠깐 나가서 걷는다', result: '한 시간 산책 후 돌아오니 냉장고에 음식이 있었습니다.', effects: { mental: 2, social: 1 } }
    ]
  },
  {
    id: 'inlaws', stage: 'family', minAge: 35, maxAge: 49, repeatable: true, when: function (s) { return s.flags.결혼; }, place: '명절',
    title: '명절',
    text: '명절입니다. 양가 일정 조율이 필요합니다. 아침 6시에 출발해야 합니다.',
    choices: [
      { label: '양가 반씩 나눈다', result: '이동이 길었지만 양쪽 다 만족했습니다.', effects: { social: 1, hp: -2, asset: -20 } },
      { label: '한쪽만 간다', result: '편했지만 한쪽 어머니의 문자는 차가웠습니다.', effects: { hp: 1, social: -1 } }
    ]
  },
  {
    id: 'car_change', stage: 'family', minAge: 38, maxAge: 49, at: [41, 6], place: '전시장',
    title: '차 바꿀 때',
    text: '차가 10년 됐습니다. 수리비가 계속 나옵니다. 전기차가 눈에 들어옵니다.',
    choices: [
      { label: '전기차로 바꾼다', result: '충전비가 기름값의 5분의 1. 조용하고 빠릅니다.', effects: { asset: -4500, mental: 3, charm: 2 }, set: { 전기차: true } },
      { label: '수리해서 계속 탄다', result: '또 3년을 버렸습니다. 정비사와 친해졌습니다.', effects: { asset: -300, mental: -1 }, set: { 절약: true } }
    ]
  },
  {
    id: 'job_change_40', stage: 'family', at: [44, 5], when: function (s) { return s.flags.직업 && !s.flags.창업; }, place: '퇴근길',
    title: '마흔의 이직',
    text: '경쟁사에서 연락이 왔습니다. 연봉 20% 인상, 대신 안정성은 보장되지 않습니다.',
    choices: [
      { label: '옮긴다', result: '연봉이 올랐습니다. 새 조직에서 다시 증명해야 합니다.', effects: { asset: 400, mental: -1, social: -1 }, set: { 이직횟수: 2 } },
      { label: '지금 회사에 남는다', result: '연차가 쌓였습니다. 대신 우물 안이라는 말도 들립니다.', effects: { mental: 2, social: 1 } },
      { label: '창업을 결심한다', result: '사업계획서를 쓰기 시작했습니다. 잠은 줄었습니다.', effects: { mental: 1, hp: -2 }, set: { 창업준비: true } }
    ]
  },
  {
    id: 'parent_illness', stage: 'family', minAge: 44, maxAge: 49, at: [46, 4], place: '병원', milestone: true,
    title: '부모님 병원',
    text: '아버지가 쓰러지셨습니다. 병원비와 간병 일정을 정해야 합니다. 형제는 지방에 있습니다.',
    choices: [
      { label: '내가 간병을 맡는다', result: '한 달간 매일 병원에 갔습니다. 회사 일은 밀렸지만 후회는 없습니다.', effects: { mental: -2, hp: -3, social: 3, asset: -800 } },
      { label: '간병인을 쓴다', result: '돈으로 시간을 샀습니다. 아버지는 "괜찮다"고만 하셨습니다.', effects: { asset: -1500, mental: -1, social: 1 } },
      { label: '형제와 역할을 나눈다', result: '오랜 통화 끝에 일정표를 만들었습니다. 가족이 다시 연결됐습니다.', effects: { social: 3, mental: 1, asset: -600 } }
    ]
  },
  {
    id: 'kid_school', stage: 'family', at: [45, 3], when: function (s) { return s.flags.자녀; }, place: '학교',
    title: '아이 입학식',
    text: '아이가 초등학교에 들어갑니다. 교실 창가에서 손을 흔드는 작은 얼굴.',
    choices: [
      { label: '사진을 백 장 찍는다', result: '나중에 보니 흔들린 사진이 제일 좋았습니다.', effects: { social: 3, mental: 3, asset: -50 } },
      { label: '아이에게 "잘할 필요 없다"고 말한다', result: '아이가 고개를 끄덕였습니다. 마음의 여유를 물려줬습니다.', effects: { mental: 3, social: 3 } }
    ]
  },
  {
    id: 'retirement_prep', stage: 'family', minAge: 46, maxAge: 49, at: [48, 7], place: '서재',
    title: '노후 준비',
    text: '연금저축과 IRP를 알아보기 시작했습니다. 은퇴까지 남은 시간이 숫자로 보입니다.',
    choices: [
      { label: '매달 50만 원씩 넣는다', result: '세액공제까지 챙겼습니다. 지금의 나를 위해 미래의 나가 저축합니다.', effects: { asset: -600, mental: 2 }, set: { 연금준비: true } },
      { label: '지금이 급하다', result: '생활비가 먼저입니다. 노후는 아직 멀게 느껴집니다.', effects: { asset: 100, mental: -1 } }
    ]
  },
  {
    id: 'weekend_family', stage: 'family', minAge: 35, maxAge: 49, repeatable: true, when: function (s) { return s.flags.자녀; }, place: '주말 오후',
    title: '주말 오후',
    text: '토요일 오후 2시입니다. 아이는 놀자고 하고, 나는 눕고 싶습니다.',
    choices: [
      { label: '놀이터에 간다', result: '미끄럼틀을 세 번 탔습니다. 웃음소리가 오래 남습니다.', effects: { social: 2, hp: -1, mental: -1 } },
      { label: '낮잠을 잔다', result: '두 시간을 잤습니다. 몸은 회복됐지만 아이는 조금 서운했습니다.', effects: { hp: 2, mental: 1, social: -2 } }
    ]
  },
  {
    id: 'single_life', stage: 'family', minAge: 35, maxAge: 49, at: [45, 6], when: function (s) { return !s.flags.결혼; }, place: '주말',
    title: '혼자의 주말',
    text: '토요일 아침, 아무 약속이 없습니다. 하루가 온전히 내 것입니다.',
    choices: [
      { label: '여행을 떠난다', result: '기차를 타고 강릉에 다녀왔습니다. 혼자인 게 편하다는 걸 인정했습니다.', effects: { mental: 2, hp: -1, asset: -30 } },
      { label: '집에서 쉰다', result: '청소, 요리, 영화 두 편. 이 또한 좋은 인생입니다.', effects: { mental: 1, hp: 1, social: -1 } }
    ]
  },

  /* ══════════════ 50~64세 — 중년 ══════════════ */
  {
    id: 'teen_kid', stage: 'midlife', at: [52, 3], when: function (s) { return s.flags.자녀; }, place: '거실',
    title: '아이의 사춘기',
    text: '아이가 문을 닫고 나오지 않습니다. "왜 그런지" 물으면 "몰라"만 돌아옵니다.',
    choices: [
      { label: '기다린다', result: '두 달 뒤, 아이가 먼저 말을 걸었습니다. 기다림이 답이었습니다.', effects: { mental: 2, social: 3 } },
      { label: '대화를 강요한다', result: '한 시간의 설교. 문은 더 단단히 닫혔습니다.', effects: { social: -3, mental: -2 } },
      { label: '같이 뭔가를 시작한다', result: '주말에 같이 게임을 했습니다. 대화의 실마리가 생겼습니다.', effects: { social: 3, mental: 3, asset: -50 } }
    ]
  },
  {
    id: 'restructuring', stage: 'midlife', at: [54, 6], when: function (s) { return s.flags.직업 && !s.flags.명퇴 && !s.flags.은퇴; }, place: '회의실', milestone: true,
    title: '구조조정',
    text: '희망퇴직 신청을 받는다는 공지가 떴습니다. 20년 다닌 회사입니다. 조건은 24개월치 급여.',
    choices: [
      { label: '신청한다', result: '마지막 출근일, 사무실을 한 바퀴 돌았습니다. 새로운 시간이 시작됐습니다.', effects: { asset: 4000, mental: -2, social: -2 }, set: { 명퇴: true, 직업: null }, queue: ['sa_54a'] },
      { label: '버틴다', result: '남았습니다. 남은 사람의 일이 더 많아졌습니다.', effects: { mental: -2, hp: -2, social: 1 } },
      { label: '다른 회사를 찾는다', result: '이력서를 다시 쓰기 시작했습니다. 50대의 이직은 느리지만 가능합니다.', effects: { mental: 1, social: 2 }, set: { 이직결심: true } }
    ]
  },
  {
    id: 'health_scare', stage: 'midlife', minAge: 52, maxAge: 64, at: [55, 4], place: '병원', milestone: true,
    title: '건강 경고',
    text: '검진에서 재검사 통보가 왔습니다. 의사가 "생활을 바꾸셔야 합니다"라고 합니다.',
    choices: [
      { label: '식단과 운동을 바꾼다', result: '6개월 만에 8kg이 빠졌습니다. 몸이 가볍습니다.', effects: { hp: 5, mental: 3, asset: -100 } },
      { label: '약으로 관리한다', result: '혈압약을 시작했습니다. 숫자는 안정됐습니다.', effects: { hp: 2, asset: -60 } },
      { label: '아직 괜찮다고 넘긴다', result: '검진 결과를 서랍에 넣었습니다.', effects: { hp: -4, mental: 1 }, set: { 건강_나쁨: true } }
    ]
  },
  {
    id: 'college_kid', stage: 'midlife', at: [56, 5], when: function (s) { return s.flags.자녀; }, place: '집',
    title: '아이의 대학',
    text: '아이가 대학에 합격했습니다. 등록금 500만 원, 기숙사비까지. 통장을 봅니다.',
    choices: [
      { label: '전부 지원한다', result: '아이는 아무 걱정 없이 캠퍼스로 갔습니다. 내 통장은 조용해졌습니다.', effects: { asset: -2500, social: 3, mental: 2 } },
      { label: '절반만 지원하고 아이가 알바를 한다', result: '아이가 처음으로 돈의 무게를 알았습니다.', effects: { asset: -1200, social: 1, mental: 1 } },
      { label: '학자금 대출을 안내한다', result: '아이가 스스로 책임을 지기로 했습니다. 조금 미안합니다.', effects: { asset: -300, social: -1, mental: -1 } }
    ]
  },
  {
    id: 'stocks', stage: 'midlife', minAge: 50, maxAge: 64, at: [53, 9], place: '휴대폰',
    title: '재테크의 유혹',
    text: '지인이 확실한 종목을 알려줬다고 합니다. 요즘 모두가 돈을 벌었다고 합니다.',
    choices: [
      { label: '크게 넣는다', result: '반년 만에 -40%. 잠이 안 옵니다.', effects: { asset: -2000, mental: -3, hp: -2 }, set: { 주식: true, 주식손실: true } },
      { label: '적립식으로 조금씩', result: '변동은 있지만 마음은 편합니다. 10년 뒤를 봅니다.', effects: { asset: 300, mental: 2 }, set: { 주식: true } },
      { label: '예금만 한다', result: '수익률은 낮지만 원금은 안전합니다. 이 또한 전략입니다.', effects: { asset: 200, mental: 2 } }
    ]
  },
  {
    id: 'business_idea', stage: 'midlife', at: [57, 6], when: function (s) { return !s.flags.은퇴; }, place: '카페',
    title: '창업 아이디어',
    text: '동료와 카페에서 이야기합니다. "우리 이거 해볼까?" 20년의 경력이 무기가 될 수 있습니다.',
    choices: [
      { label: '작게 시작한다', result: '작은 사무실을 얻었습니다. 첫 매출은 300만 원. 손이 떨렸습니다.', effects: { asset: -2000, mental: 2, hp: -3, social: 2 }, set: { 창업: true, 직업: '자영업자' } },
      { label: '직장을 유지한다', result: '아이디어는 노트에 남았습니다. 안정이 우선입니다.', effects: { mental: 1, asset: 200 } },
      { label: '동료에게 맡긴다', result: '동료가 시작했습니다. 몇 년 뒤 뉴스에 나왔습니다.', effects: { social: 1, mental: -1 } }
    ]
  },
  {
    id: 'kid_wedding', stage: 'midlife', at: [60, 7], when: function (s) { return (s.flags.자녀수 || 0) >= 1; }, place: '예식장', milestone: true,
    title: '아이의 결혼',
    text: '내가 서 있던 자리에 아이가 서 있습니다. 사회자가 "신랑 아버지"를 부릅니다.',
    choices: [
      { label: '축사를 읽는다', result: '중간에 목소리가 갈라졌습니다. 하객들도 같이 울었습니다.', effects: { social: 4, mental: 3, asset: -3000 } },
      { label: '짧게 인사만 한다', result: '"잘 살아라." 세 마디면 충분했습니다.', effects: { social: 3, mental: 3, asset: -2500 } }
    ]
  },
  {
    id: 'parent_funeral', stage: 'midlife', at: [62, 11], place: '장례식장', milestone: true,
    title: '이별',
    text: '새벽에 전화가 왔습니다. 병원입니다. 택시를 타고 가는 20분이 가장 길었습니다.',
    choices: [
      { label: '장례를 정성껏 치른다', result: '많은 사람이 왔습니다. 아버지가 어떤 사람이었는지 처음으로 알았습니다.', effects: { mental: -4, social: 3, asset: -800 } },
      { label: '조용히 보낸다', result: '가족만 모였습니다. 슬픔은 조용히 오래 남았습니다.', effects: { mental: -5, social: 1, asset: -300 } }
    ]
  },
  {
    id: 'midlife_walk', stage: 'midlife', minAge: 50, maxAge: 64, repeatable: true, place: '동네 산책로',
    title: '퇴근 후 산책',
    text: '저녁을 먹고 나니 9시입니다. 나가 걸을까, TV를 볼까.',
    choices: [
      { label: '한 시간 걷는다', result: '공기가 차갑고 좋았습니다. 잠이 잘 옵니다.', effects: { hp: 2, mental: 1 } },
      { label: '소파에 눕는다', result: '리모컨을 잡고 세 시간을 보냈습니다.', effects: { mental: 1, hp: -2 } }
    ]
  },

  /* ══════════════ 65~80세 — 노년 ══════════════ */
  {
    id: 'retire_day', stage: 'senior', at: [65, 1], place: '사무실', milestone: true, weight: 6,
    title: '은퇴',
    text: '마지막 출근입니다. 책상 서랍을 비우고 사원증을 반납합니다. 40년이 이 작은 카드 안에 있었습니다.',
    choices: [
      { label: '동료들과 저녁을 먹는다', result: '다들 고맙다고 했습니다. 집에 오는 길에 울었습니다.', effects: { social: 3, mental: 2, asset: -50 }, set: { 은퇴: true } },
      { label: '조용히 사무실을 나온다', result: '익숙한 길을 걸어 나왔습니다. 다음 날 아침이 낯설었습니다.', effects: { mental: 1, social: -1 }, set: { 은퇴: true } }
    ]
  },
  {
    id: 'pension_first', stage: 'senior', at: [65, 3], place: '은행',
    title: '첫 연금',
    text: '국민연금 첫 수령일입니다. 통장에 120만 원이 들어왔습니다.',
    choices: [
      { label: '생활비로 쓴다', result: '생활이 조금 편해졌습니다.', effects: { mental: 1, asset: 100 } },
      { label: '손주 용돈으로 남긴다', result: '아이들이 웃었습니다. 그게 제일 좋은 지출입니다.', effects: { social: 3, mental: 2 } }
    ]
  },
  {
    id: 'hobby_start', stage: 'senior', at: [66, 5], place: '문화센터',
    title: '취미 시작',
    text: '시간이 생겼습니다. 등산, 그림, 골프, 악기. 무엇이든 시작할 수 있습니다.',
    choices: [
      { label: '등산', result: '매주 산에 오릅니다. 무릎은 아프지만 정상의 공기는 다릅니다.', effects: { hp: 3, social: 2, asset: -30 } },
      { label: '그림', result: '수채화를 배웠습니다. 첫 작품을 벽에 걸었습니다.', effects: { mental: 3, charm: 2, asset: -40 } },
      { label: '골프', result: '스윙을 배웠습니다. 사람들과 라운드를 돌기 시작했습니다.', effects: { social: 3, hp: 1, asset: -400 } }
    ]
  },
  {
    id: 'countryside', stage: 'senior', at: [68, 4], place: '시골집',
    title: '전원 생활',
    text: '시골에 작은 집을 볼 기회가 생겼습니다. 마당이 있고, 병원은 30분 거리입니다.',
    choices: [
      { label: '산다', result: '토마토를 심었습니다. 아침이 조용합니다.', effects: { asset: -3000, mental: 3, hp: 2, social: -1 } },
      { label: '지금 집에 산다', result: '익숙한 동네가 편합니다. 아내도 안심했습니다.', effects: { mental: 2, social: 1 } }
    ]
  },
  {
    id: 'grandchild', stage: 'senior', at: [70, 3], when: function (s) { return (s.flags.자녀수 || 0) >= 1; }, place: '아이 방', milestone: true,
    title: '손주',
    text: '아이가 아기를 데리고 왔습니다. 내 이름을 부르는 소리가 두 단계 건너서 들립니다.',
    choices: [
      { label: '매일 봐준다', result: '허리는 아프지만 하루가 즐겁습니다. 손주가 나의 하루가 됐습니다.', effects: { hp: -2, social: 4, mental: 3 } },
      { label: '주말에만 만난다', result: '적당한 거리가 좋습니다. 만날 때가 더 반갑습니다.', effects: { mental: 3, social: 2 } }
    ]
  },
  {
    id: 'health_decline', stage: 'senior', at: [72, 6], place: '병원',
    title: '몸이 보내는 신호',
    text: '계단을 오르면 숨이 찹니다. 무릎이 아프고 잠이 짧아졌습니다.',
    choices: [
      { label: '재활 운동을 꾸준히 한다', result: '아침마다 공원을 걷습니다. 통증이 조금 줄었습니다.', effects: { hp: 3, mental: 2 } },
      { label: '수술을 고려한다', result: '비용이 들지만 걸을 수 있게 됐습니다.', effects: { hp: 3, asset: -800 } },
      { label: '그냥 참는다', result: '참는 것도 방법입니다. 다만 삶의 반경이 줄어듭니다.', effects: { hp: -3, mental: -1 }, set: { 건강_나쁨: true } }
    ]
  },
  {
    id: 'travel_late', stage: 'senior', at: [74, 3], place: '여행지',
    title: '늦은 여행',
    text: '배우자와 오래 미뤄둔 여행을 다녀오기로 했습니다. 해외도 이제는 가능합니다.',
    choices: [
      { label: '크게 다녀온다', result: '사진을 오백 장 찍었습니다. 액자에 걸려 있는 건 부부 사진 한 장입니다.', effects: { mental: 4, hp: -1, asset: -1200, social: 2 } },
      { label: '가까운 국내로', result: '이틀 다녀왔습니다. 짧았지만 충분했습니다.', effects: { mental: 3, asset: -200 } }
    ]
  },
  {
    id: 'memoir', stage: 'senior', at: [76, 5], place: '서재',
    title: '회고',
    text: '노트를 폈습니다. 아이에게 남길 짧은 글이나, 아니면 그냥 나를 위한 기록.',
    choices: [
      { label: '인생 기록을 남긴다', result: '공책 한 권을 채웠습니다. 첫 문장은 "나는 길을 여러 번 잘못 들었다."', effects: { mental: 4, social: 2 } },
      { label: '편지 한 통만 쓴다', result: '짧은 편지가 오래 남았습니다.', effects: { mental: 3, social: 2 } },
      { label: '그냥 산다', result: '기록하지 않아도 기억은 남습니다.', effects: { mental: 2, hp: 1 } }
    ]
  },
  {
    id: 'eightieth', stage: 'senior', at: [80, 12], place: '생일상', milestone: true, weight: 8,
    title: '여든 번째 생일',
    text: '케이크의 초는 몇 개인지 세기 어렵습니다. 가족들이 둘러앉아 노래를 부릅니다.\n이제 인생의 숫자가 뒤집어집니다.',
    choices: [
      { label: '소원을 빈다', result: '지난 시간이 한 번에 지나갔습니다. 그 시간이 바로 당신의 인생입니다.', effects: { mental: 3, social: 2 } },
      { label: '가족에게 한 마디 한다', result: '"고맙다"만 말했습니다. 그걸로 충분했습니다.', effects: { social: 3, mental: 3 } }
    ]
  },
  {
    id: 'senior_walk', stage: 'senior', minAge: 65, maxAge: 80, repeatable: true, place: '공원',
    title: '아침 산책',
    text: '아침 7시, 공원입니다. 나무가 아직 그대로입니다. 아는 얼굴들이 하나씩 줄었습니다.',
    choices: [
      { label: '벤치에 앉아 오래 쉰다', result: '아무 일도 하지 않는 시간도 인생의 일부입니다.', effects: { mental: 2, hp: -1 } },
      { label: '동네 친구를 찾으러 간다', result: '없을 때도 있지만, 있는 날은 좋은 날입니다.', effects: { social: 2, hp: -1 } }
    ]
  },

  /* ══════════════ 어느 시점에나 — 돌발 이벤트 ══════════════ */
  {
    id: 'any_lottery', stage: 'any', minAge: 19, maxAge: 80, when: function (s) { return s.age >= 20; }, place: '편의점',
    title: '복권 한 장',
    text: '편의점 앞에 복권이 붙어 있습니다. 1등은 20억이라고 합니다. 5천 원입니다.',
    choices: [
      { label: '산다',
        // 행운은 마지막에 한 번씩 일한다 — 행운이 72 이상이면 5등이 걸린다
        result: function (s) {
          return (s.stats.luck || 50) >= 72
            ? '5등. 오천 원이 오만 원이 되어 돌아왔습니다. 하루 종일 웃었습니다.'
            : '낙첨. 5천 원이 사라졌지만 하루를 설렜습니다.';
        },
        effects: function (s) {
          return (s.stats.luck || 50) >= 72
            ? { asset: 45, mental: 3, luck: 1 }
            : { asset: -1, mental: 2, luck: 1 };
        } },
      { label: '그냥 간다', result: '5천 원을 아꼈습니다. 인생은 그런 것일지도 모릅니다.', effects: { asset: 1, mental: 1 } }
    ]
  },
  {
    id: 'any_old_friend', stage: 'any', minAge: 13, maxAge: 80, when: function (s) { return s.age >= 25; }, place: '단체 채팅방',
    title: '오랜 친구의 연락',
    text: '10년 전 친구가 연락합니다. "요즘 어때? 한 번 보자."',
    choices: [
      { label: '바로 만난다', result: '몇 시간을 이야기했습니다. 시간이 사라진 기분이었습니다.', effects: { social: 3, mental: 3, asset: -10 } },
      { label: '다음에 보자고 한다', result: '그 다음은 오지 않았습니다.', effects: { social: -1, mental: 1 } }
    ]
  },
  {
    id: 'any_burnout', stage: 'any', minAge: 8, maxAge: 80, when: function (s) { return s.stats.mental <= 32; }, place: '집',
    title: '멘탈 방전',
    text: '아무것도 하기 싫습니다. 아침에 일어나는 게 일처럼 느껴집니다.',
    choices: [
      { label: '쉰다 — 아무것도 안 한다', result: '일주일을 아무것도 하지 않았습니다. 조금씩 돌아옵니다.', effects: { mental: 5, hp: 3, asset: -30 } },
      { label: '도움을 요청한다', result: '상담을 받았습니다. 혼자 버티지 않아도 된다는 것을 배웠습니다.', effects: { mental: 5, hp: 2, asset: -60 } },
      { label: '그냥 버틴다', result: '버텼습니다. 하지만 조금씩 무슨 일이 일어나고 있습니다.', effects: { mental: -2, hp: -3 } }
    ]
  },
  {
    id: 'any_exercise', stage: 'any', minAge: 15, maxAge: 80, when: function (s) { return s.age >= 25; }, place: '동네 헬스장',
    title: '헬스장 등록',
    text: '집 앞에 헬스장이 생겼습니다. 3개월에 20만 원입니다. 지난번에도 등록했었습니다.',
    choices: [
      { label: '이번엔 진짜 다닌다', result: '3개월 동안 40회 출석. 몸이 달라졌습니다.', effects: { hp: 3, mental: 2, asset: -20 }, set: { 운동러: true } },
      { label: '그만둔다', result: '등록이 아까워 한 번 갔습니다.', effects: { mental: 1, asset: -20 } }
    ]
  },
  {
    id: 'any_house_move', stage: 'any', minAge: 20, maxAge: 80, when: function (s) { return s.age >= 30 && s.age <= 60; }, place: '이사',
    title: '이사 통보',
    text: '집주인이 계약 갱신을 거절했습니다. 두 달 안에 이사해야 합니다.',
    choices: [
      { label: '가까운 곳으로 옮긴다', result: '같은 동네로 이사했습니다. 아이 학교는 그대로입니다.', effects: { asset: -300, hp: -2, mental: -1 } },
      { label: '더 좋은 동네로 간다', result: '집이 넓어졌습니다. 대신 통장이 얇아졌습니다.', effects: { asset: -1500, mental: 3, social: 1 } }
    ]
  }

]);
