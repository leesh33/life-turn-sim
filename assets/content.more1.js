/* ─────────────────────────────────────────────
   content.more1.js — 추가 이벤트 1/2
   유아기 · 초등학교 · 중학교 · 고등학교 · 대학교
   ※ 선택의 결과가 다음 이벤트로 이어지는 후속 분기(queue)를 곳곳에 넣었다.
   ───────────────────────────────────────────── */
window.LIFE_EVENTS = (window.LIFE_EVENTS || []).concat([

  /* ══════════════ 유아기 · 초등학교 ══════════════ */
  {
    id: 'daycare_recital', stage: 'infancy', at: [5, 90], place: '어린이집 강당',
    title: '어린이집 발표회',
    text: '연말 발표회입니다. 원장 선생님이 산타 역할을 맡기겠다고 합니다. 배가 빵빵한 빨간 옷이 준비되어 있습니다.',
    choices: [
      { label: '산타를 한다', result: '무대에 올라가 "호호호"를 세 번 했습니다. 관객석에서 웃음이 터졌습니다.', effects: { charm: 2, social: 3, mental: -1 }, set: { 무대체질: true } },
      { label: '뒤에서 노래만 한다', result: '단체 합창의 두 번째 줄. 카메라에 얼굴이 반쯤 걸렸습니다.', effects: { mental: 2, social: 1 } },
      { label: '무대가 무서워 나가지 않는다', result: '선생님이 무릎에 앉혀주고 영상을 보여줬습니다. 다음 해에 다시 하자고 합니다.', effects: { mental: -1, social: 1, hp: 1 } }
    ]
  },
  {
    id: 'stationery_gacha', stage: 'infancy', when: function (s) { return s.age >= 6; }, place: '문방구 앞',
    title: '문방구 뽑기',
    text: '문방구 앞에 500원짜리 뽑기 기계가 있습니다. 옆 친구가 방금 희귀 캐릭터를 뽑았습니다. 용돈은 1,000원입니다.',
    choices: [
      { label: '두 번 돌린다', result: '첫 번째는 꽝, 두 번째는 같은 캐릭터가 또 나왔습니다. 손에 아무것도 남지 않았습니다.', effects: { mental: 1, asset: -1 } },
      { label: '한 번만 돌리고 아껴둔다', result: '평범한 캐릭터 하나를 얻고 500원을 남겼습니다. 절제의 첫 성공.', effects: { mental: 2, asset: 0 }, set: { 뽑기_절제: true } },
      { label: '친구에게 하나 달라고 한다', result: '친구가 아깝다고 했습니다. 대신 같이 놀기로 했습니다.', effects: { social: 2, mental: -1 } }
    ]
  },
  {
    id: 'taekwondo_belt', stage: 'infancy', at: [7, 120], when: function (s) { return s.flags.태권도; }, place: '태권도장',
    title: '태권도 승단심사',
    text: '파란 띠 심사입니다. 앞차기, 돌려차기, 격파까지 있습니다. 관장님이 "한 번만 더 힘내라"고 합니다.',
    choices: [
      { label: '격파에 전력한다', result: '송판이 두 장으로 갈라졌습니다. 띠를 매고 집에 가는 길에 어깨가 펴졌습니다.', effects: { hp: 2, mental: 2, social: 1 } },
      { label: '무리하지 않고 기본기만 한다', result: '합격은 했습니다. 격파는 한 장. 다음 심사에 다시 도전합니다.', effects: { hp: 1, mental: 2 } },
      { label: '심사를 미룬다', result: '그날 도장에 가지 않았습니다. 관장님이 다음 주에 다시 오라고 문자를 보냈습니다.', effects: { mental: -1, hp: 1 } }
    ]
  },
  {
    id: 'first_cavity', stage: 'infancy', at: [6, 240], place: '치과',
    title: '첫 충치',
    text: '이가 시립니다. 치과에 가니 앞니 옆에 구멍이 하나 있습니다. 의사가 "달콤한 것 좀 줄여야겠네요"라고 합니다.',
    choices: [
      { label: '울지 않고 치료받는다', result: '드릴 소리가 무서웠지만 끝까지 앉아 있었습니다. 스티커를 받았습니다.', effects: { mental: 2, hp: 1, asset: -5 } },
      { label: '엄마 손을 잡고 운다', result: '치료는 받았습니다. 엄마가 아이스크림은 당분간 안 된다고 합니다.', effects: { social: 2, mental: -1, asset: -5 } }
    ]
  },
  {
    id: 'sibling_fight', stage: 'infancy', repeatable: true, when: function (s) { return s.flags.형제; }, place: '거실',
    title: '동생과의 전쟁',
    text: '동생이 내 인형을 가져갔습니다. 돌려달라고 하면 엄마는 "동생이니까 양보해"라고 합니다.',
    choices: [
      { label: '양보한다', result: '억울했지만 참았습니다. 동생은 좋아서 팔짝팔짝 뛰었습니다.', effects: { social: 2, mental: -2 } },
      { label: '빼앗아 돌려받는다', result: '동생이 울었고 나는 혼났습니다. 그래도 인형은 내 손에 있습니다.', effects: { mental: 1, social: -2 } },
      { label: '다른 장난감으로 같이 논다', result: '둘이 블록을 쌓았습니다. 엄마가 사진을 찍었습니다.', effects: { social: 2, mental: 1, hp: -1 } }
    ]
  },
  {
    id: 'christmas_belief', stage: 'infancy', at: [7, 300], place: '거실',
    title: '산타는 진짜 있을까',
    text: '크리스마스 전날입니다. 친구가 "산타는 부모님이야"라고 알려줬습니다. 집에는 아직 선물이 없습니다.',
    choices: [
      { label: '믿는 척하고 잠든다', result: '아침에 선물이 놓여 있었습니다. 부모님이 밤에 다녀간 걸 알지만 모르는 척했습니다.', effects: { mental: 3, social: 2, asset: 5 } },
      { label: '직접 물어본다', result: '엄마가 잠깐 웃다가 "그럼 내가 산타지"라고 했습니다. 세상이 조금 각졌습니다.', effects: { mental: -1, charm: 1 } },
      { label: '부모님께 선물을 준비한다', result: '색종이로 카드를 만들었습니다. 엄마가 냉장고에 붙여두었습니다.', effects: { social: 3, mental: 2 } }
    ]
  },
  {
    id: 'lost_pocket_money', stage: 'elementary', when: function (s) { return s.age >= 9; }, place: '학교 앞',
    title: '잃어버린 용돈',
    text: '학원비 10만 원을 들고 나왔는데 봉투가 없어졌습니다. 엄마는 저녁에 물어볼 겁니다.',
    choices: [
      { label: '바로 엄마께 말한다', result: '한참 조용하다가 "다음엔 바로 말해"라고 하셨습니다. 크게 혼나지는 않았습니다.', effects: { social: 2, mental: 1 } },
      { label: '친구에게 빌려 메꾼다', result: '일주일 동안 간식을 굶어 갚았습니다. 빚의 무게를 초등학생 때 배웠습니다.', effects: { mental: -2, social: 1, asset: -5 } },
      { label: '길을 다시 찾아 나선다', result: '버스정류장에서 주웠다는 아주머니를 만났습니다. 세상에 착한 사람이 있습니다.', effects: { mental: 2, hp: -1, social: 1 } }
    ]
  },
  {
    id: 'ttakji_battle', stage: 'elementary', repeatable: true, when: function (s) { return s.age <= 12; }, place: '운동장',
    title: '딱지치기',
    text: '쉬는 시간, 5학년이 딱지를 걸고 붙자고 합니다. 내 딱지는 두꺼운 종이로 접은 최고급입니다.',
    choices: [
      { label: '받아친다', result: '한 판에 내 딱지가 뒤집혔습니다. 손등이 얼얼하고 마음도 얼얼합니다.', effects: { social: 1, mental: -2 } },
      { label: '구경만 한다', result: '옆에서 소리만 질렀습니다. 내 딱지는 무사합니다.', effects: { social: 1, mental: 1 } },
      { label: '판을 새로 만들자고 한다', result: '종이를 접어 모두에게 나눠줬습니다. 쉬는 시간마다 붙는 아이가 늘었습니다.', effects: { social: 3, mental: 1, hp: -1 } }
    ]
  },
  {
    id: 'academy_van', stage: 'elementary', when: function (s) { return s.age >= 9; }, place: '학원차',
    title: '학원차 자리',
    text: '학원차 맨 뒷자리가 인기입니다. 오늘은 6학년 선배가 먼저 앉아 있습니다. 내가 앉던 자리입니다.',
    choices: [
      { label: '앞자리에 앉는다', result: '선생님 옆자리에서 창밖을 봤습니다. 졸음이 확실히 덜 왔습니다.', effects: { mental: 2, social: -1 } },
      { label: '선배에게 자리를 부탁한다', result: '선배가 웃으면서 비켜줬습니다. 이름을 물어보고, 다음 날 인사했습니다.', effects: { social: 2, charm: 1 } },
      { label: '서서 간다', result: '20분을 손잡이를 잡고 갔습니다. 아무도 신경 쓰지 않았습니다.', effects: { hp: -1, mental: -1 } }
    ]
  },
  {
    id: 'teacher_sticker', stage: 'elementary', place: '교실',
    title: '칭찬 스티커',
    text: '선생님이 칭찬 스티커판을 붙였습니다. 20개를 모으면 상을 준다고 합니다. 나는 아직 3개입니다.',
    choices: [
      { label: '발표를 열심히 한다', result: '손을 드는 게 무서웠지만 세 번 했습니다. 스티커가 두 개 늘었습니다.', effects: { mental: 2, social: 1 } },
      { label: '청소를 도맡는다', result: '쓰레기통을 매일 비웠습니다. 선생님이 "믿음직하다"고 하셨습니다.', effects: { social: 2, hp: -1 } },
      { label: '그냥 포기한다', result: '친구들이 스티커를 세는 걸 멀리서 봤습니다.', effects: { mental: -1 } }
    ]
  },
  {
    id: 'milk_time', stage: 'elementary', repeatable: true, place: '교실',
    title: '우유 급식',
    text: '우유가 남았습니다. 다들 먹기 싫어합니다. 남은 우유 한 개는 누구 것인지가 늘 문제입니다.',
    choices: [
      { label: '내가 마신다', result: '배가 불렀습니다. 다음 시간에 화장실을 두 번 갔습니다.', effects: { hp: 1, mental: -1 } },
      { label: '친구에게 준다', result: '친구가 고맙다고 했습니다. 별일 아닌데 기분이 좋았습니다.', effects: { social: 2, hp: -1 } }
    ]
  },
  {
    id: 'friend_birthday', stage: 'elementary', at: [11, 120], place: '친구 집',
    title: '친구 생일파티',
    text: '단짝 친구가 생일파티에 초대했습니다. 선물 예산은 2만 원입니다. 친구는 "빈손으로 와도 된다"고 했습니다.',
    choices: [
      { label: '갖고 싶어 하던 걸 산다', result: '친구가 소리를 질렀습니다. 내 용돈은 한 달 치가 사라졌습니다.', effects: { social: 3, asset: -20 } },
      { label: '편지를 정성껏 쓴다', result: '친구가 편지를 읽다가 울었습니다. 다른 아이들은 그걸 보고 웃었습니다.', effects: { social: 2, mental: 2 } },
      { label: '가지 않는다', result: '그날 집에서 게임을 했습니다. 단톡방에 사진이 올라왔습니다.', effects: { mental: -2, social: -2 } }
    ]
  },
  {
    id: 'swim_class', stage: 'elementary', when: function (s) { return s.age >= 8 && s.age <= 11; }, place: '수영장',
    title: '수영 교실',
    text: '엄마가 여름방학 수영을 등록했습니다. 물이 무섭습니다. 첫 시간은 얼굴 담그기입니다.',
    choices: [
      { label: '끝까지 버틴다', result: '이주일 만에 15미터를 건넜습니다. 물이 무섭지 않아졌습니다.', effects: { hp: 3, mental: 2, asset: -10 }, set: { 수영: true } },
      { label: '가장자리만 잡고 있는다', result: '선생님이 계속 불렀지만 나는 물 밖에 있었습니다. 여름이 지나갔습니다.', effects: { mental: -1, hp: 1 } }
    ]
  },
  {
    id: 'math_zero', stage: 'elementary', at: [12, 120], place: '교실',
    title: '수학 0점',
    text: '수학 단원평가에서 0점을 받았습니다. 이름을 부르셔서 단상에 나가 성적표를 받았습니다.',
    choices: [
      { label: '방과 후에 선생님께 물어본다', result: '한 시간을 붙잡고 문제를 다시 풀었습니다. 다음 시험은 60점이었습니다.', effects: { mental: 3, hp: -2, social: 1 } },
      { label: '성적표를 숨긴다', result: '가방 밑에 넣었습니다. 일주일 뒤 엄마가 찾아냈습니다.', effects: { mental: -2, social: -2 } },
      { label: '웃으면서 넘긴다', result: '"0점도 받아봤어"라고 했습니다. 반에서 잠깐 유명해졌습니다.', effects: { charm: 2, mental: 1 } }
    ]
  },
  {
    id: 'friend_moving', stage: 'elementary', at: [12, 240], place: '학교 앞',
    title: '친구가 전학 갑니다',
    text: '단짝이 이사를 갑니다. 마지막 날, 친구가 내 이름이 적힌 공책을 건넵니다.',
    choices: [
      { label: '끝까지 웃으면서 배웅한다', result: '버스가 떠난 뒤에 울었습니다. 공책은 아직 서랍에 있습니다.', effects: { mental: -1, social: 2 } },
      { label: '연락처를 받아 둔다', result: '몇 달은 연락했습니다. 몇 년 뒤에는 프로필 사진만 보게 됩니다.', effects: { social: 1, mental: 1 } },
      { label: '새 단짝을 만든다', result: '한 주 만에 옆자리 아이와 친해졌습니다. 사람은 빨리 적응합니다.', effects: { social: 2, mental: -1 } }
    ]
  },
  {
    id: 'elementary_graduation', stage: 'elementary', at: [13, 330], place: '졸업식', milestone: true,
    title: '초등학교 졸업',
    text: '6년이 끝났습니다. 교실 게시판이 비었고, 교복은 아직 없습니다. 엄마가 꽃을 들고 왔습니다.',
    choices: [
      { label: '사진을 잔뜩 찍는다', result: '친구들과 40장을 찍었습니다. 그중 절반은 눈을 감고 있습니다.', effects: { social: 2, mental: 2, asset: -5 } },
      { label: '선생님께 편지를 쓴다', result: '선생님이 읽고 서랍에 넣으셨습니다. "20년 뒤에 보자"고 하셨습니다.', effects: { social: 2, mental: 2 } },
      { label: '울지 않으려고 애쓴다', result: '결국 울었습니다. 친구들이 웃으면서 어깨를 두드렸습니다.', effects: { mental: 1, social: 1 } }
    ]
  },
  {
    id: 'pet_hamster', stage: 'elementary', at: [10, 210], place: '우리 집',
    title: '햄스터를 키우자',
    text: '학교 앞에서 햄스터를 팝니다. 2만 원. 아빠는 "네가 책임질 수 있겠냐"고 묻습니다.',
    choices: [
      { label: '내가 다 돌본다고 약속한다', result: '새장 청소는 한 달 만에 엄마 담당이 됐습니다. 그래도 햄스터는 귀엽습니다.', effects: { mental: 3, asset: -20, social: 1 }, set: { 반려동물: true } },
      { label: '포기한다', result: '집에 오는 길에 계속 생각났습니다. 다음에 키울 수 있을 때 키우기로 했습니다.', effects: { mental: -1, asset: 0 } }
    ]
  },
  {
    id: 'hagwon_collapse', stage: 'elementary', at: [12, 30], when: function (s) { return s.flags.학원_수학 || s.flags.학원_영어; }, place: '학원가',
    title: '학원이 문을 닫았습니다',
    text: '다니던 학원이 갑자기 폐원한다는 문자를 보냈습니다. 원장님이 잠적했다는 이야기도 돕니다.',
    choices: [
      { label: '다른 학원을 알아본다', result: '두 곳을 체험했습니다. 선생님이 더 꼼꼼한 곳으로 옮겼습니다.', effects: { mental: 1, asset: -30 } },
      { label: '이참에 학원을 쉰다', result: '한 학기 동안 방과 후가 내 것이 됐습니다. 성적은 조금 내려갔습니다.', effects: { hp: 2, mental: 2, social: 1 } }
    ]
  },
  {
    id: 'field_trip_lunch', stage: 'elementary', at: [10, 90], place: '현장학습 버스',
    title: '현장학습 도시락',
    text: '박물관 현장학습입니다. 엄마가 도시락을 싸줬습니다. 옆 친구 도시락에는 김밥이 가득합니다.',
    choices: [
      { label: '내 도시락을 나눠준다', result: '친구가 내 김치볶음밥을 보고 눈이 커졌습니다. 둘이 반씩 바꿔 먹었습니다.', effects: { social: 3, hp: 1 } },
      { label: '혼자 조용히 먹는다', result: '맛있었습니다. 다만 친구들이 모여 있는 자리가 조금 멀었습니다.', effects: { hp: 2, social: -1 } }
    ]
  },

  /* ══════════════ 중학교 ══════════════ */
  {
    id: 'perf_assessment', stage: 'middle', at: [15, 60], place: '내 방 새벽 2시',
    title: '수행평가 밤샘',
    text: '내일 아침까지 수행평가 보고서를 내야 합니다. 지금 시작합니다. 분량은 A4 다섯 장입니다.',
    choices: [
      { label: '밤을 새워 끝까지 쓴다', result: '새벽 5시에 끝냈습니다. 발표할 때 목소리가 갈라졌습니다.', effects: { hp: -3, mental: 1, social: 1 } },
      { label: '적당히 채우고 낸다', result: '세 장에서 멈췄습니다. 감점은 있었지만 잠은 잤습니다.', effects: { hp: 1, mental: 1, social: -1 } },
      { label: '친구 것을 참고한다', result: '문장을 조금 바꿨습니다. 선생님이 "둘이 닮았다"고 하셨습니다.', effects: { mental: -2, social: 2 }, set: { 커닝_경험: true } }
    ]
  },
  {
    id: 'crush_confess', stage: 'middle', at: [15, 180], when: function (s) { return !s.flags.첫연애; }, place: '학교 옥상',
    title: '짝사랑 고백',
    text: '두 달째 같은 아이만 보입니다. 친구가 등 떠밀어 옥상으로 올라왔습니다. 상대는 이미 기다리고 있습니다.',
    choices: [
      { label: '지금 고백한다', result: '말이 꼬였지만 마음은 전해졌습니다. 결과는 상대의 몫입니다.', effects: { charm: 2, mental: -1 }, queue: ['crush_answer'] },
      { label: '날씨 이야기만 하고 내려온다', result: '"오늘 춥다" 세 번. 친구가 한숨을 쉬었습니다.', effects: { mental: -1, social: 1 } },
      { label: '쪽지로 전한다', result: '답장 대신 웃는 얼굴을 봤습니다. 그게 답이었습니다.', effects: { charm: 1, mental: 1 } }
    ]
  },
  {
    id: 'crush_answer', stage: 'middle', place: '교실',
    title: '대답이 왔습니다',
    text: '하루가 지나고, 상대가 내 앞에 섰습니다. 손에는 아무것도 없습니다. 친구들이 멀리서 지켜봅니다.',
    choices: [
      { label: '좋다고 한다', result: '교복 소매를 잡고 걸었습니다. 세상이 반짝였고, 성적은 살짝 떨어졌습니다.', effects: { mental: 3, charm: 2, social: 2 }, set: { 첫연애: true } },
      { label: '지금은 공부가 먼저라고 한다', result: '상대가 고개를 끄덕였습니다. 마음이 가벼우면서도 허했습니다.', effects: { mental: 1, hp: 1 }, set: { 짝사랑_정리: true } }
    ]
  },
  {
    id: 'retreat_talent', stage: 'middle', at: [14, 240], place: '수련회 강당',
    title: '수련회 장기자랑',
    text: '수련회 마지막 밤입니다. 우리 반 차례인데 아무도 나가려 하지 않습니다. 사회자가 세 번째로 우리 반을 부릅니다.',
    choices: [
      { label: '춤을 춘다', result: '연습한 것의 절반만 기억났습니다. 그래도 함성이 터졌습니다.', effects: { charm: 2, social: 3, mental: -1 } },
      { label: '노래를 부른다', result: '음이 두 번 나갔습니다. 반 아이들이 다 같이 따라 불러줬습니다.', effects: { social: 2, charm: 1 } },
      { label: '몸으로 웃긴다', result: '개그를 했습니다. 웃음이 나왔지만 선생님은 웃지 않았습니다.', effects: { social: 2, mental: 1, charm: -1 } }
    ]
  },
  {
    id: 'middle_soccer', stage: 'middle', at: [14, 120], place: '운동장',
    title: '점심 축구',
    text: '점심시간 축구에 팀이 하나 모자랍니다. 나는 축구를 잘 못합니다. 다들 나를 봅니다.',
    choices: [
      { label: '골키퍼를 자원한다', result: '세 골을 먹었지만 두 번은 막았습니다. 땀은 다 흘렸습니다.', effects: { hp: 2, social: 2, mental: -1 } },
      { label: '거절한다', result: '교실에서 책을 읽었습니다. 창밖에서 소리가 들렸습니다.', effects: { mental: 1, social: -2 } },
      { label: '심판을 본다', result: '규칙을 외웠습니다. 아무도 이견을 말하지 않았습니다.', effects: { social: 2, mental: 1 } }
    ]
  },
  {
    id: 'allowance_talk', stage: 'middle', at: [14, 330], place: '거실',
    title: '용돈 협상',
    text: '친구들은 한 달에 5만 원을 받는다고 합니다. 나는 3만 원입니다. 이번에 올려달라고 해볼 생각입니다.',
    choices: [
      { label: '필요 내역을 정리해 가져간다', result: '아빠가 표를 읽고 4만 원으로 올려줬습니다. 근거가 이긴 셈입니다.', effects: { asset: 10, mental: 2, charm: 1 } },
      { label: '그냥 올려달라고 한다', result: '"왜?"라는 말에 대답을 못 했습니다. 다음에 다시 이야기하자고 하셨습니다.', effects: { mental: -1, social: 1 } },
      { label: '알바를 하겠다고 한다', result: '중학생 알바는 없었습니다. 대신 집안일 일당을 주기로 했습니다.', effects: { asset: 5, hp: -1, social: 1 } }
    ]
  },
  {
    id: 'first_breakup', stage: 'middle', when: function (s) { return s.flags.첫연애 && s.age >= 15; }, place: '버스정류장',
    title: '첫 이별',
    text: '"우리 그만하자"는 문자를 받았습니다. 이유는 길게 적혀 있지 않습니다. 내일 같은 학교에 가야 합니다.',
    choices: [
      { label: '이유를 물어본다', result: '답을 들었습니다. 아픈 답이었지만 오래 붙잡지 않을 수 있었습니다.', effects: { mental: -2, charm: 1 } },
      { label: '읽씹하고 넘어간다', result: '아무 대답도 하지 않았습니다. 복도에서 마주칠 때마다 시선이 어긋났습니다.', effects: { mental: -3, social: -1 } },
      { label: '친구들과 하루 종일 논다', result: '웃다가 밤에 혼자 생각났습니다. 그래도 낮은 견뎠습니다.', effects: { social: 2, mental: -1 } }
    ]
  },
  {
    id: 'senior_bully', stage: 'middle', at: [15, 240], place: '학교 뒷문',
    title: '선배의 부탁',
    text: '3학년 선배가 "잠깐 심부름 좀"이라며 돈을 줍니다. 표정이 좋지 않습니다. 거절하면 다음이 있을 것 같습니다.',
    choices: [
      { label: '정중히 거절한다', result: '"바빠서요" 세 글자. 선배가 한참 쳐다보다 돌아갔습니다. 무서웠지만 끝났습니다.', effects: { mental: 1, social: -1 } },
      { label: '심부름을 해준다', result: '별일 아니었습니다. 한 달 뒤 또 부탁이 왔습니다.', effects: { mental: -2, social: 1 }, set: { 심부름_경험: true } },
      { label: '담임 선생님께 말한다', result: '선생님이 조용히 정리했습니다. 선배는 나를 다시 보지 않았습니다.', effects: { mental: 2, social: -1 } }
    ]
  },
  {
    id: 'middle_exam_rank', stage: 'middle', at: [16, 30], place: '교실',
    title: '전교 등수',
    text: '기말고사 성적표입니다. 전교 120등. 지난번보다 30등 올랐습니다. 아빠는 "그래서 몇 등인데?"라고 묻습니다.',
    choices: [
      { label: '오른 것을 먼저 말한다', result: '아빠가 "오르긴 했네"라고 했습니다. 그 한마디가 오래 남았습니다.', effects: { mental: 2, social: 1 } },
      { label: '다음 목표를 말한다', result: '냉장고에 목표 등수가 붙었습니다. 보고 싶지 않지만 매일 보입니다.', effects: { mental: 1, hp: -1 } },
      { label: '성적표를 조용히 넣어둔다', result: '아무도 묻지 않았습니다. 그게 더 불편했습니다.', effects: { mental: -2 } }
    ]
  },
  {
    id: 'middle_part_time', stage: 'middle', when: function (s) { return s.age >= 16; }, place: '편의점',
    title: '단기 알바',
    text: '방학 동안 편의점에서 단기 알바를 구합니다. 하루 4시간, 시급은 최저임금. 엄마는 반대합니다.',
    choices: [
      { label: '설득해서 한다', result: '열흘을 서서 일했습니다. 첫 월급으로 운동화를 샀습니다.', effects: { asset: 40, hp: -2, social: 2, mental: 1 } },
      { label: '엄마 말을 듣는다', result: '방학은 학원과 게임으로 채워졌습니다. 편했습니다.', effects: { mental: 2, hp: 1, asset: -5 } }
    ]
  },
  {
    id: 'middle_health_growth', stage: 'middle', at: [14, 180], place: '내 방',
    title: '성장통',
    text: '밤마다 다리가 아픕니다. 키가 1년에 10센티 넘게 컸습니다. 교복이 짧아졌습니다.',
    choices: [
      { label: '우유와 잠을 챙긴다', result: '키가 더 컸습니다. 농구부에서 다시 부릅니다.', effects: { hp: 3, mental: 1, asset: -10 } },
      { label: '그냥 참는다', result: '한 달을 앓고 지나갔습니다. 키는 그대로 자랐습니다.', effects: { hp: -2, mental: 1 } }
    ]
  },
  {
    id: 'middle_youtube_fail', stage: 'middle', when: function (s) { return s.flags.유튜브꿈; }, place: '내 방',
    title: '구독자 0명',
    text: '영상을 다섯 개 올렸습니다. 총 조회수 47회. 댓글은 "영상 왜 이럼?" 하나입니다.',
    choices: [
      { label: '편집을 다시 배운다', result: '편집 앱 강의를 다 봤습니다. 여섯 번째 영상 조회수가 300이 됐습니다.', effects: { mental: 2, hp: -1, social: 1 } },
      { label: '채널을 접는다', result: '영상은 남겨뒀습니다. 10년 뒤에 다시 보면 웃을 겁니다.', effects: { mental: -1, hp: 1 } }
    ]
  },
  {
    id: 'middle_family_money', stage: 'middle', at: [16, 120], place: '거실',
    title: '아빠의 실직',
    text: '아빠가 회사를 그만뒀습니다. 거실에서 서류를 보고 있습니다. 엄마는 아무 말도 하지 않습니다.',
    choices: [
      { label: '학원을 줄이겠다고 말한다', result: '아빠가 "아니다"라고 했지만, 학원 두 개가 정리됐습니다. 마음이 무거웠습니다.', effects: { mental: -2, social: 2, asset: 30 } },
      { label: '아무것도 묻지 않는다', result: '조용한 저녁이 몇 달 이어졌습니다. 집안 공기가 달라졌습니다.', effects: { mental: -3 } },
      { label: '아빠와 산책을 한다', result: '한 시간을 걸었습니다. 아빠가 처음으로 회사 이야기를 했습니다.', effects: { social: 2, mental: 1 } }
    ]
  },

  /* ══════════════ 고등학교 ══════════════ */
  {
    id: 'night_escape', stage: 'high', at: [18, 120], when: function (s) { return !s.flags.특목고 || s.age >= 18; }, place: '야자실 창가',
    title: '야자 째기',
    text: '야자 2교시, 친구가 창밖을 가리키며 "나갈래"라고 합니다. 담임은 3교시에 순찰을 돕니다.',
    choices: [
      { label: '같이 나간다', result: 'PC방에서 한 시간. 돌아오는 길에 담임과 마주쳤습니다.', effects: { mental: 2, social: 2, hp: 1 }, queue: ['night_escape_bust'] },
      { label: '남아서 공부한다', result: '친구는 나갔고 나는 남았습니다. 조용한 교실에서 진도가 나갔습니다.', effects: { mental: 1, hp: -1, social: -1 } },
      { label: '몸만 잠깐 쉰다', result: '화장실에서 10분을 창밖 보며 서 있었습니다. 그걸로 충분했습니다.', effects: { mental: 2, hp: 1 } }
    ]
  },
  {
    id: 'night_escape_bust', stage: 'high', place: '교무실',
    title: '야자 째기 적발',
    text: '담임 선생님이 명단을 들고 있습니다. 부모님께 전화를 걸겠다고 합니다. 옆에는 같이 나간 친구가 서 있습니다.',
    choices: [
      { label: '솔직히 자백한다', result: '한 시간 혼났습니다. 부모님 전화는 가지 않았습니다. 다음부터는 조심하기로 했습니다.', effects: { mental: -2, social: 2 } },
      { label: '친구가 시켰다고 말한다', result: '친구가 나를 봤습니다. 그 눈을 오래 기억합니다.', effects: { mental: -3, social: -3 } },
      { label: '변명을 만든다', result: '선생님이 다 알고 계셨습니다. 결국 부모님께 연락이 갔습니다.', effects: { mental: -2, social: -1 } }
    ]
  },
  {
    id: 'csat_lunchbox', stage: 'high', at: [19, 210], place: '우리 집 부엌',
    title: '수능 도시락',
    text: '수능 전날 밤입니다. 엄마가 도시락을 싸고 있습니다. "뭐가 좋겠냐"고 묻는데, 나는 아무 생각도 나지 않습니다.',
    choices: [
      { label: '평소 먹던 반찬으로 부탁한다', result: '익숙한 맛이 제일이라는 걸 압니다. 엄마가 안심한 얼굴이었습니다.', effects: { mental: 2, social: 2 } },
      { label: '같이 싸겠다고 한다', result: '김밥을 말다가 밤 12시가 됐습니다. 웃으면서 잤습니다.', effects: { mental: 3, hp: -1, social: 2 } },
      { label: '"그냥 사 먹을게"라고 한다', result: '엄마가 도시락통을 도로 넣었습니다. 다음 날 편의점 김밥을 먹었습니다.', effects: { mental: 1, social: -2 } }
    ]
  },
  {
    id: 'mock_rank_poster', stage: 'high', at: [17, 150], place: '교실',
    title: '모의고사 등수 공개',
    text: '모의고사 성적표가 책상 위에 놓였습니다. 등수가 학년 게시판에 붙었고, 다들 거기 서 있습니다.',
    choices: [
      { label: '당당하게 확인하러 간다', result: '중간보다 조금 위. 옆에서 누군가 "오"라고 했습니다.', effects: { mental: 2, social: 1 } },
      { label: '사람이 빠지면 본다', result: '점심시간에 혼자 확인했습니다. 숫자를 외우고 아무에게도 말하지 않았습니다.', effects: { mental: -1 } },
      { label: '보지 않는다', result: '결과는 문자로 왔습니다. 피할 수는 없었습니다.', effects: { mental: -2 } }
    ]
  },
  {
    id: 'study_cafe_seat', stage: 'high', at: [18, 60], place: '독서실',
    title: '독서실 자리 전쟁',
    text: '독서실 창가 자리가 비었습니다. 내 옆 사람이 가방을 놓고 자리를 맡아뒀습니다. 관리인은 보지 못했습니다.',
    choices: [
      { label: '양보한다', result: '중간 자리에 앉았습니다. 집중은 비슷했습니다.', effects: { social: 1, mental: 1 } },
      { label: '자리를 차지한다', result: '10분 뒤 그 사람이 와서 한참 쳐다봤습니다. 하루 종일 신경이 쓰였습니다.', effects: { mental: -2, hp: 1 } }
    ]
  },
  {
    id: 'first_drink', stage: 'high', at: [19, 330], place: '골목 식당',
    title: '첫 술',
    text: '수능이 끝났습니다. 친구들이 "오늘은 마셔보자"고 합니다. 이의를 제기할 사람이 없습니다.',
    choices: [
      { label: '소주 한 잔만 맛본다', result: '쓴맛에 얼굴이 찡그려졌습니다. 다들 그 얼굴을 폰에 남겼습니다.', effects: { social: 2, hp: -1 } },
      { label: '끝까지 따라간다', result: '두 병을 비웠습니다. 다음 날 오후에 일어났습니다.', effects: { social: 3, hp: -3, mental: 1 } },
      { label: '콜라로 건배한다', result: '아무도 뭐라 하지 않았습니다. 집에 일찍 들어갔습니다.', effects: { hp: 2, social: -1 } }
    ]
  },
  {
    id: 'high_part_time', stage: 'high', at: [19, 120], place: '패스트푸드점',
    title: '주말 알바',
    text: '수능 전, 용돈이 부족합니다. 주말에 8시간 알바를 하면 한 달에 60만 원입니다. 대신 주말 공부가 사라집니다.',
    choices: [
      { label: '알바를 한다', result: '감자튀김 냄새가 배었습니다. 내 돈으로 처음 산 물건은 부모님 선물이었습니다.', effects: { asset: 40, hp: -3, social: 2, mental: 1 } },
      { label: '공부에 집중한다', result: '주말 학원에 다녔습니다. 통장은 그대로입니다.', effects: { mental: 2, hp: -1 } }
    ]
  },
  {
    id: 'teacher_advice', stage: 'high', at: [17, 90], place: '진로실',
    title: '담임의 제안',
    text: '담임이 "너는 말로 하는 일이 맞다"며 토론 동아리를 권합니다. 수능과 무관한 활동입니다.',
    choices: [
      { label: '해본다', result: '대회에서 두 번 말했습니다. 말하는 법을 배웠습니다.', effects: { charm: 3, social: 2, mental: 2, hp: -1 }, set: { 토론: true } },
      { label: '지금은 사양한다', result: '선생님이 아쉬워했습니다. 수능 공부에 집중했습니다.', effects: { mental: 1, hp: 1 } }
    ]
  },
  {
    id: 'csat_sick', stage: 'high', at: [19, 180], place: '병원',
    title: '수능 전날 장염',
    text: '시험 하루 전, 새벽에 배가 뒤틀립니다. 응급실에서 링거를 맞았습니다. 의사는 "가벼운 장염"이라고 합니다.',
    choices: [
      { label: '집에 가서 잔다', result: '네 시간을 잤습니다. 아침에 조금 나았습니다.', effects: { hp: -1, mental: 1 } },
      { label: '병원에 더 머문다', result: '안정을 찾았지만 병원비가 나왔습니다. 시험은 무사히 봤습니다.', effects: { hp: 1, asset: -20, mental: -1 } },
      { label: '약만 챙겨 마음먹고 간다', result: '배는 아팠지만 집중은 됐습니다. 몸이 급할 때 버티는 법을 배웠습니다.', effects: { hp: -2, mental: 3 } }
    ]
  },
  {
    id: 'hagwon_top', stage: 'high', at: [18, 210], when: function (s) { return s.flags.야근러 || s.flags.수능_올인; }, place: '학원',
    title: '학원 1등',
    text: '모의고사에서 학원 전체 1등을 했습니다. 원장이 명단을 게시판에 올리겠다고 합니다.',
    choices: [
      { label: '올려달라고 한다', result: '이름이 붙었습니다. 다음 시험에서 5등이 되자 자리가 부담이 됐습니다.', effects: { charm: 2, social: 1, mental: -1 } },
      { label: '올리지 말아달라고 한다', result: '원장이 이유를 물었습니다. "다음에 떨어지면 민망해서요"라고 했습니다.', effects: { mental: 3, hp: 1 } }
    ]
  },
  {
    id: 'high_friend_quit', stage: 'high', at: [18, 270], place: '학교 앞',
    title: '친구가 그만둔다',
    text: '단짝이 자퇴를 고민한다고 합니다. 집안 사정이라고만 말합니다. 나는 아무 말도 할 수 없습니다.',
    choices: [
      { label: '자퇴하지 말라고 붙잡는다', result: '설득은 되지 않았습니다. 그날 밤 통화를 세 시간 했습니다.', effects: { social: 2, mental: -2 } },
      { label: '결정을 존중한다', result: '마지막으로 급식실에서 밥을 먹었습니다. 이후 연락이 뜸해졌습니다.', effects: { mental: -1, social: 1 } },
      { label: '선생님께 알린다', result: '선생님이 상담을 잡았습니다. 친구는 나에게 화를 냈지만, 결국 남았습니다.', effects: { social: 1, mental: -1 } }
    ]
  },
  {
    id: 'graduation_suit', stage: 'high', at: [19, 300], place: '양복점',
    title: '졸업식 정장',
    text: '졸업식에 입을 옷을 사야 합니다. 아빠가 "내 거 입어"라고 하지만 사이즈가 안 맞습니다.',
    choices: [
      { label: '새로 산다', result: '처음 입는 정장. 거울 앞에서 어색했습니다.', effects: { charm: 2, asset: -30 } },
      { label: '아빠 옷을 수선해서 입는다', result: '소매를 줄였습니다. 아빠 옷 냄새가 났습니다.', effects: { mental: 2, asset: -5, social: 1 } }
    ]
  },

  /* ══════════════ 대학교 ══════════════ */
  {
    id: 'boiler_broken', stage: 'college', at: [20, 60], place: '자취방',
    title: '자취 첫날, 보일러 고장',
    text: '첫날 밤인데 온수가 안 나옵니다. 집주인은 전화를 받지 않습니다. 12월입니다.',
    choices: [
      { label: '직접 고쳐본다', result: '설명서를 보며 밸브를 돌렸더니 물이 따뜻해졌습니다. 살아남는 법을 배웠습니다.', effects: { mental: 2, hp: -1, social: 1 }, set: { 자취: true } },
      { label: '찬물로 씻는다', result: '비명을 지르고 나왔습니다. 다음 날 감기 기운이 올라왔습니다.', effects: { hp: -3, mental: 1 }, set: { 자취: true } },
      { label: '친구 방으로 피한다', result: '하룻밤을 얻어 자고 다음 날 집주인을 잡았습니다.', effects: { social: 2, mental: 1 }, set: { 자취: true } }
    ]
  },
  {
    id: 'roommate_conflict', stage: 'college', at: [20, 240], place: '기숙사',
    title: '룸메이트 갈등',
    text: '룸메가 새벽 3시까지 게임을 합니다. 말소리가 벽을 뚫습니다. 한 달째 참고 있습니다.',
    choices: [
      { label: '정중히 이야기한다', result: '처음엔 미안하다고 하더니 이틀 만에 돌아왔습니다. 그래도 조금 줄었습니다.', effects: { mental: 1, social: 1 } },
      { label: '그냥 이어폰을 쓴다', result: '잠이 부족한 학기가 됐습니다. 성적도 같이 내려갔습니다.', effects: { hp: -3, mental: -2 } },
      { label: '기숙사를 옮긴다', result: '서류가 복잡했지만 조용한 방을 얻었습니다. 1인실은 없었습니다.', effects: { mental: 2, hp: 1, asset: -30 } }
    ]
  },
  {
    id: 'group_project', stage: 'college', at: [21, 90], place: '팀플 회의',
    title: '팀플 무임승차',
    text: '다섯 명 팀플입니다. 둘이 연락을 안 받습니다. 발표는 내일입니다.',
    choices: [
      { label: '나머지 셋이 다 한다', result: '밤을 새워 끝냈습니다. 발표는 좋았고, 무임승차자도 학점을 받았습니다.', effects: { hp: -3, mental: -2, social: 1 } },
      { label: '교수님께 사실을 알린다', result: '그 둘은 F를 받았습니다. 학기 내내 뒷말을 들었습니다.', effects: { mental: 2, social: -2 } },
      { label: '이름만 올리고 발표에서 뺀다', result: '교수님이 "팀워크"를 지적했습니다. 대신 팀은 웃으면서 끝났습니다.', effects: { mental: 1, social: 1, hp: -1 } }
    ]
  },
  {
    id: 'campus_festival', stage: 'college', at: [21, 150], place: '대동제',
    title: '대동제',
    text: '축제 주간입니다. 주점에서 일하면 돈이 되고, 놀면 추억이 됩니다. 내일은 전공 시험입니다.',
    choices: [
      { label: '주점 알바를 한다', result: '새벽 2시까지 서서 맥주를 날랐습니다. 일당은 두둑했습니다.', effects: { asset: 25, hp: -3, social: 2 } },
      { label: '끝까지 논다', result: '무대 앞에서 목이 쉬도록 소리쳤습니다. 다음 날 시험은 반쯤 찍었습니다.', effects: { mental: 3, social: 3, hp: -2 } },
      { label: '집에 간다', result: '조용한 기숙사에서 공부했습니다. 창밖 소리가 신경 쓰였습니다.', effects: { mental: 1, social: -2 } }
    ]
  },
  {
    id: 'used_trade_scam', stage: 'college', at: [22, 120], place: '중고거래',
    title: '중고거래 사기 미수',
    text: '노트북을 40만 원에 올렸습니다. 구매자가 "안전결제 대신 직접 송금하겠다"며 링크를 보냈습니다.',
    choices: [
      { label: '링크를 열지 않고 거절한다', result: '계좌를 조회해보니 사기 신고가 여러 건 있는 번호였습니다. 아슬아슬했습니다.', effects: { mental: 2, asset: 5 }, set: { 사기_경계: true } },
      { label: '링크를 눌러본다', result: '카드 정보를 넣는 화면이 떴습니다. 이상해서 닫았지만 등골이 서늘했습니다.', effects: { mental: -2, asset: -5 }, queue: ['used_trade_report'] },
      { label: '직거래만 고집한다', result: '일주일 뒤 다른 사람이 현금으로 사갔습니다.', effects: { asset: 40, social: 1 } }
    ]
  },
  {
    id: 'used_trade_report', stage: 'college', place: '경찰서',
    title: '신고 접수',
    text: '앱 고객센터와 경찰에 신고를 했습니다. 담당자가 "요즘 많은 유형"이라며 서류를 내밉니다.',
    choices: [
      { label: '끝까지 신고를 진행한다', result: '두 시간을 기다렸습니다. 피해는 없었지만 같은 일을 겪는 사람을 도운 셈입니다.', effects: { mental: 1, social: 1, hp: -1 } },
      { label: '그냥 돌아간다', result: '신고는 접수됐지만 증거가 없어 종결됐습니다. 교훈만 남았습니다.', effects: { mental: -1 } }
    ]
  },
  {
    id: 'delivery_vip', stage: 'college', at: [22, 240], place: '자취방',
    title: '배달앱 VIP',
    text: '이번 달 배달 주문이 23건입니다. 앱이 "VIP 등급"을 줬습니다. 축하한다고 쿠폰도 왔습니다.',
    choices: [
      { label: '쿠폰으로 또 시킨다', result: '축하 쿠폰으로 치킨을 시켰습니다. 자축은 배달로 합니다.', effects: { mental: 2, hp: -2, asset: -5 } },
      { label: '이번 달은 끊는다', result: '냉장고에 계란과 김치를 채웠습니다. 요리는 서툴지만 살아집니다.', effects: { hp: 2, mental: 1, asset: 10 } },
      { label: '등급을 자랑한다', result: '친구들이 "그건 자랑이 아니다"라고 했습니다. 웃음은 나왔습니다.', effects: { social: 2, mental: 1, hp: -1 } }
    ]
  },
  {
    id: 'college_blind_date', stage: 'college', at: [23, 60], when: function (s) { return !s.flags.연애중; }, place: '카페',
    title: '소개팅',
    text: '선배가 소개팅을 주선했습니다. 상대는 다른 학교 4학년. 30분 뒤 도착한다고 합니다.',
    choices: [
      { label: '솔직하게 다 이야기한다', result: '두 시간을 이야기했습니다. 두 번째 약속이 잡혔습니다.', effects: { charm: 2, social: 2, mental: 2, asset: -5 }, set: { 연애중: true } },
      { label: '잘 보이려고 포장한다', result: '대화는 매끄러웠지만 내 이야기가 없었습니다. 다음이 없었습니다.', effects: { charm: 1, mental: -2 } },
      { label: '중간에 나온다', result: '"급한 일이 생겼다"고 문자를 남겼습니다. 선배가 한숨을 쉬었습니다.', effects: { mental: -1, social: -2 } }
    ]
  },
  {
    id: 'first_credit_card', stage: 'college', at: [23, 150], place: '은행',
    title: '첫 신용카드',
    text: '대학생도 발급되는 카드가 있다고 합니다. 한도 50만 원, 첫 달 10% 할인입니다.',
    choices: [
      { label: '만든다 — 급할 때 쓸 수 있게', result: '첫 달에 30만 원을 썼습니다. 청구서가 왔을 때 처음으로 어른이 된 기분이었습니다.', effects: { charm: 1, asset: -20, mental: 1 }, set: { 신용카드: true } },
      { label: '체크카드로 충분하다', result: '통장에 있는 만큼만 썼습니다. 이 습관은 오래 갑니다.', effects: { mental: 2, asset: 5 }, set: { 짠돌이: true } }
    ]
  },
  {
    id: 'driver_license', stage: 'college', at: [23, 240], place: '운전면허시험장',
    title: '운전면허',
    text: '방학에 면허를 따기로 했습니다. 학원비 60만 원, 두 달이 걸립니다.',
    choices: [
      { label: '학원을 등록한다', result: '기능시험에서 두 번 떨어지고 세 번째에 붙었습니다. 면허증 사진이 마음에 들지 않습니다.', effects: { asset: -60, mental: 2, hp: -1 }, set: { 면허: true } },
      { label: '다음으로 미룬다', result: '그 "다음"은 오지 않았습니다. 지하철이 편하기도 합니다.', effects: { asset: 20, mental: -1 } }
    ]
  },
  {
    id: 'scholarship_essay', stage: 'college', at: [21, 300], place: '도서관',
    title: '장학금 에세이',
    text: '생활비 장학금 공고가 떴습니다. 300만 원. 에세이 주제는 "내가 가난을 이기는 방법"입니다.',
    choices: [
      { label: '솔직하게 쓴다', result: '세 번 읽고 지웠습니다. 결국 그대로 냈고, 합격했습니다.', effects: { asset: 300, mental: 3, social: 1 }, set: { 장학금: true } },
      { label: '남들이 쓰는 말로 채운다', result: '정형화된 문장이 됐습니다. 떨어졌습니다. 대신 문장 연습은 됐습니다.', effects: { mental: -2, charm: 1 } },
      { label: '신청하지 않는다', result: '"될 리 없다"고 생각했습니다. 합격자 명단을 보고 한참 봤습니다.', effects: { mental: -2 } }
    ]
  },
  {
    id: 'intern_reject', stage: 'college', at: [23, 300], place: '집',
    title: '인턴 탈락',
    text: '지원한 인턴에서 "함께하지 못하게 됐다"는 메일이 왔습니다. 면접은 잘 봤다고 생각했습니다.',
    choices: [
      { label: '피드백을 요청한다', result: '인사 담당자가 세 줄을 보내줬습니다. 읽고 나서 다음 지원서를 고쳤습니다.', effects: { mental: 2, social: 1 } },
      { label: '일주일 아무것도 안 한다', result: '침대와 폰만 봤습니다. 회복은 됐지만 시간이 사라졌습니다.', effects: { mental: 1, hp: 1, social: -1 } },
      { label: '바로 다른 곳에 지원한다', result: '다음 주에 두 곳에 냈습니다. 하나는 면접을 봤습니다.', effects: { mental: -1, social: 2, hp: -1 } }
    ]
  },
  {
    id: 'graduation_photo', stage: 'college', at: [24, 150], place: '학사모',
    title: '졸업사진',
    text: '졸업사진 촬영일입니다. 학사모를 쓰고 운동장에 섰습니다. 4년이 이 사진 한 장에 접힙니다.',
    choices: [
      { label: '가족을 부른다', result: '부모님이 꽃을 들고 왔습니다. 사진마다 아버지가 조금 웃고 있습니다.', effects: { social: 3, mental: 3, asset: -20 } },
      { label: '친구들과만 찍는다', result: '40장을 찍었습니다. 그중 제일 좋은 사진은 아무도 안 보는 사진입니다.', effects: { social: 3, mental: 2 } },
      { label: '혼자 조용히 찍는다', result: '단상에 앉아 한 장. 그 사진을 지금도 보관하고 있습니다.', effects: { mental: 3 } }
    ]
  },
  {
    id: 'college_diet', stage: 'college', repeatable: true, when: function (s) { return s.age >= 20; }, place: '헬스장',
    title: '다이어트 결심',
    text: '사진을 보다가 깜짝 놀랐습니다. 오늘부터 운동을 하기로 했습니다. 벌써 네 번째 결심입니다.',
    choices: [
      { label: '한 달 등록하고 매일 간다', result: '12일 출석. 몸이 조금 달라졌고 사진도 다시 찍었습니다.', effects: { charm: 2, hp: 2, asset: -15, mental: -1 } },
      { label: '식단만 조절한다', result: '야식을 끊었습니다. 배고픔과 싸우는 게 운동보다 힘듭니다.', effects: { charm: 1, hp: 1, mental: -1, asset: 5 } },
      { label: '내일부터 한다', result: '내일은 오지 않았습니다. 대신 치킨이 왔습니다.', effects: { mental: 1, hp: -1 } }
    ]
  }

]);
