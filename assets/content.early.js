/* ─────────────────────────────────────────────
   content.early.js — 유아기(1~7세) · 초등학교(8~13세)
   ───────────────────────────────────────────── */
window.LIFE_EVENTS = (window.LIFE_EVENTS || []).concat([

  /* ══════════════ 1세 ══════════════ */
  {
    id: 'birth_cry', stage: 'infancy', at: [1, 1], place: '출산실', milestone: true, weight: 5,
    title: '태어났습니다',
    text: '태어났습니다. 내 손발가락을 세고 있네요.\n더 울어서 나를 각인 시킬까요?',
    choices: [
      { label: '네, 있는 힘껏 울어본다',
        result: '부모님이 우렁찬 나를 좋아합니다.',
        effects: { hp: 1, social: 3, mental: -1 }, set: { 우렁찬_아기: true } },
      { label: '아니오, 조용히 눈만 뜬다',
        result: '부모님이 조용한 나를 좋아합니다.',
        effects: { mental: 3, social: 2 }, set: { 조용한_아기: true } }
    ]
  },
  {
    id: 'formula_30', stage: 'infancy', at: [1, 30], place: '조리원', milestone: true, weight: 5,
    title: '조리원 퇴소',
    text: '조리원에서 퇴소했습니다. 이제 집으로 왔네요.\n분유를 어느정도 먹을까요?',
    choices: [
      { label: '30ml, 조금씩 자주',
        result: '적게 자주 먹는 나를 부모님이 피곤해합니다.',
        effects: { hp: -1, mental: -2, social: 1 }, set: { 소식가: true } },
      { label: '50ml, 한 번에 든든하게',
        result: '잘 먹는 나를 부모님이 만족해합니다.',
        effects: { hp: 3, mental: 2, social: 2 }, set: { 대식가: true } }
    ]
  },
  {
    id: 'baby_babble', stage: 'infancy', at: [1, 60], place: '거실',
    title: '첫 옹알이',
    text: '엄마가 얼굴을 들이밀고 "옹옹옹" 하고 놀려댑니다. 나도 대답하고 싶어집니다.',
    choices: [
      { label: '큰 소리로 따라 한다', result: '집안이 웃음바다가 됩니다. 이 집의 분위기는 내가 만든다.', effects: { social: 3, mental: 1 } },
      { label: '표정으로만 답한다', result: '엄마가 "얘는 눈으로 말해"라며 감동합니다.', effects: { mental: 2, charm: 2 } }
    ]
  },
  {
    id: 'hundred_days', stage: 'infancy', at: [1, 90], place: '스튜디오',
    title: '백일 사진',
    text: '백일입니다. 스튜디오에서 사진을 찍는다는데, 나는 배가 고픕니다.',
    choices: [
      { label: '스튜디오에서 예쁘게 찍는다', result: '웃는 사진이 건져졌습니다. 거실 액자의 주인공은 나.', effects: { charm: 3 } },
      { label: '집에서 폰으로 대충 찍는다', result: '흔들린 사진이지만 진짜 내 얼굴입니다. 부모님은 그게 더 좋답니다.', effects: { social: 2, mental: 1 } }
    ]
  },
  {
    id: 'night_awake', stage: 'infancy', repeatable: true, place: '새벽 3시',
    title: '새벽 수유',
    text: '새벽 3시. 배가 고픈데 부모님은 깊이 잠들어 있습니다. 어떻게 할까요?',
    choices: [
      { label: '있는 힘껏 운다', result: '부모님이 벌떡 일어납니다. 다음 날 두 사람은 커피를 두 잔 마십니다.', effects: { hp: 1, social: 1, mental: -2 }, set: { 우렁찬_아기: true } },
      { label: '손가락을 빨며 기다린다', result: '스스로를 달래는 법을 배웠습니다. 부모님은 아침에 미안해합니다.', effects: { mental: 2, hp: -1 } }
    ]
  },
  {
    id: 'first_tooth', stage: 'infancy', at: [1, 180], place: '우리 집',
    title: '첫 이',
    text: '잇몸이 간지럽습니다. 아무거나 물고 싶습니다. 엄마 손가락이 눈앞에 있습니다.',
    choices: [
      { label: '엄마 손가락을 문다', result: '엄마가 "아야!" 하면서도 웃습니다. 첫 이라는 걸 알아본 거죠.', effects: { social: 2, hp: 1 } },
      { label: '치발기를 찾아 문다', result: '제법 영리한 아기라는 평을 듣습니다.', effects: { mental: 1, charm: 1 } }
    ]
  },
  {
    id: 'baby_food', stage: 'infancy', place: '이유식 의자',
    title: '이유식 시간',
    text: '이유식이 나왔습니다. 미음입니다. 옆에서 아빠가 숟가락을 들고 있습니다.',
    choices: [
      { label: '입을 크게 벌린다', result: '한 그릇을 다 비웠습니다. 밥 잘 먹는 아이로 소문이 납니다.', effects: { hp: 2, social: 2 }, set: { 대식가: true } },
      { label: '고개를 돌린다', result: '결국 분유로 대체. 엄마는 조금 걱정합니다.', effects: { hp: -1, mental: 1 }, set: { 소식가: true } }
    ]
  },
  {
    id: 'crawling', stage: 'infancy', at: [1, 240], place: '거실',
    title: '배밀이 시작',
    text: '거실 끝에 리모컨이 있습니다. 저건 반드시 물어야 합니다.',
    choices: [
      { label: '전력으로 기어간다', result: '리모컨을 손에 넣었습니다. 첫 정복의 맛.', effects: { hp: 2, mental: 2 } },
      { label: '부모님을 불러 대신 가져오게 한다', result: '리모컨보다 손가락이 좋았습니다. 애교의 기술을 익혔습니다.', effects: { charm: 2, social: 2 } }
    ]
  },
  {
    id: 'doljanchi', stage: 'infancy', at: [1, 330], place: '돌잔치', milestone: true, weight: 5,
    title: '돌잔치 — 돌잡이',
    text: '돌잔치입니다. 상 위에 물건들이 놓였습니다. 사방에서 "여기 봐!" 소리가 납니다.\n나는 무엇을 집을까요?',
    choices: [
      { label: '지폐 뭉치', result: '큰아버지가 박수를 칩니다. "이 집안은 돈 벌 사람 나왔다!"', effects: { asset: 30, social: 2 }, set: { 돌잡이_돈: true } },
      { label: '연필', result: '할아버지가 "공부 잘하는 아이"라며 흡족해합니다.', effects: { mental: 3, charm: 1 }, set: { 돌잡이_연필: true } },
      { label: '마이크', result: '삼촌이 웃습니다. "말 잘하는 애는 어디 가서 안 굶어."', effects: { social: 3, charm: 2 }, set: { 돌잡이_마이크: true } },
      { label: '청진기', result: '고모가 "의사다!"를 외칩니다. 이 집안의 기대가 무거워집니다.', effects: { mental: 2, hp: 1, social: 2 }, set: { 돌잡이_청진기: true } }
    ]
  },

  /* ══════════════ 2~7세 ══════════════ */
  {
    id: 'first_steps', stage: 'infancy', at: [2, 60], place: '거실', milestone: true,
    title: '첫 걸음마',
    text: '소파를 잡고 일어섰습니다. 저기 아빠가 두 팔을 벌리고 있습니다. 세 걸음이면 닿습니다.',
    choices: [
      { label: '달려간다', result: '넘어지고도 웃었습니다. 첫 걸음마의 기억은 몸이 기억합니다.', effects: { hp: 3, social: 2 } },
      { label: '주저앉아 엉엉 운다', result: '아빠가 와서 안아 올렸습니다. 세상은 무섭지만 사람은 따뜻합니다.', effects: { mental: 1, social: 2 } }
    ]
  },
  {
    id: 'first_word', stage: 'infancy', at: [2, 180], place: '거실', milestone: true,
    title: '첫 단어',
    text: '오늘 처음으로 제대로 된 단어를 말할 것 같습니다. 입이 근질거립니다.',
    choices: [
      { label: '"엄마"', result: '엄마가 울었습니다. 그 울음은 지금까지 본 것 중 가장 행복한 울음.', effects: { social: 3, mental: 1 } },
      { label: '"아빠"', result: '아빠가 하루 종일 그 말을 반복하며 다녔습니다.', effects: { social: 3, mental: 2 } },
      { label: '"까까"', result: '제일 급한 것부터 말했습니다. 이 집안 최고의 현실주의자.', effects: { mental: 2, hp: 1, charm: 1 } }
    ]
  },
  {
    id: 'daycare_first', stage: 'infancy', at: [3, 30], place: '어린이집', milestone: true,
    title: '어린이집 첫 등원',
    text: '어린이집 문 앞입니다. 선생님이 손을 내밉니다. 엄마는 뒤에서 손을 흔들고 있습니다.',
    choices: [
      { label: '울면서 엄마 다리를 붙잡는다', result: '결국 30분을 울었습니다. 엄마도 차에서 울었습니다.', effects: { mental: -2, social: 2 } },
      { label: '선생님 손을 잡고 들어간다', result: '씩씩한 아이로 기억됩니다. 엄마는 뿌듯하면서도 조금 서운합니다.', effects: { mental: 2, social: 3, charm: 2 } }
    ]
  },
  {
    id: 'daycare_virus', stage: 'infancy', at: [3, 210], place: '소아과',
    title: '첫 열감기',
    text: '새벽에 열이 38.5도입니다. 부모님이 대학병원 응급실에 갈지 고민하고 있습니다.',
    choices: [
      { label: '해열제 먹고 집에서 버틴다', result: '아침에 열이 내렸습니다. 부모님은 밤새 못 잤습니다.', effects: { hp: -2, social: 2 } },
      { label: '응급실에 간다', result: '검사는 다 정상. 대기 4시간, 진료 5분. 그래도 안심입니다.', effects: { hp: 1, mental: 1 } }
    ]
  },
  {
    id: 'picky_eater', stage: 'infancy', when: function (s) { return s.age >= 3; }, place: '식탁',
    title: '편식의 시작',
    text: '저녁상에 브로콜리가 올라왔습니다. 초록색입니다. 나는 초록색이 싫습니다.',
    choices: [
      { label: '입을 꾹 닫는다', result: '결국 계란후라이가 나왔습니다. 이 집의 규칙은 내가 정합니다.', effects: { hp: -1, mental: 1, charm: 1 }, set: { 편식: true } },
      { label: '한 입 먹어본다', result: '생각보다 맛있습니다. 편식 없는 아이로 자랄 가능성이 커졌습니다.', effects: { hp: 2, mental: 1 } },
      { label: '던져버린다', result: '엄마가 크게 혼냈습니다. 밥상 예절을 처음 배웠습니다.', effects: { mental: -1, social: -1 } }
    ]
  },
  {
    id: 'sibling_born', stage: 'infancy', at: [4, 90], when: function (s) { return !s.flags.형제; }, place: '병원', milestone: true,
    title: '동생이 생겼습니다',
    text: '엄마가 아기를 안고 집에 왔습니다. 손가락이 다섯 개씩 달린 작은 사람이 이제 우리 집에 삽니다.',
    choices: [
      { label: '동생을 꼬옥 안는다', result: '형/누나가 되었습니다. 이날부터 "참는 법"을 배웁니다.', effects: { social: 3, mental: -1 }, set: { 형제: true, 첫째: true } },
      { label: '한 번 때린다', result: '혼났습니다. 그래도 엄마가 나를 한 번 더 안아줬습니다.', effects: { mental: -1, social: -1 }, set: { 형제: true, 첫째: true } }
    ]
  },
  {
    id: 'playground_fall', stage: 'infancy', at: [5, 120], place: '놀이터',
    title: '놀이터에서',
    text: '철봉에 매달렸다가 손이 미끄러졌습니다. 무릎이 찢어졌습니다. 피가 납니다.',
    choices: [
      { label: '울지 않고 일어난다', result: '아이들이 "쟤 안 울어"라며 쳐다봅니다. 동네에서 세진 이름을 얻었습니다.', effects: { hp: -2, mental: 3, social: 2 } },
      { label: '엉엉 울며 집에 간다', result: '엄마가 반창고를 붙여주며 "잘했어, 아팠지" 해줍니다.', effects: { hp: -1, mental: 1, social: 2 } }
    ]
  },
  {
    id: 'taekwondo', stage: 'infancy', at: [6, 60], place: '태권도장',
    title: '태권도 학원',
    text: '엄마가 태권도를 시키겠다고 합니다. 도장 앞에서 나는 이 도복의 흰색이 마음에 들지 않습니다.',
    choices: [
      { label: '그래도 해본다', result: '3개월 만에 흰 띠를 땄습니다. 자신감이 붙습니다.', effects: { hp: 3, mental: 2 }, set: { 태권도: true } },
      { label: '축구가 좋다고 말한다', result: '엄마가 축구반을 알아봅니다. 내 의견이 처음으로 존중받았습니다.', effects: { hp: 2, charm: 2 }, set: { 축구: true } },
      { label: '아무것도 하기 싫다고 한다', result: '주말이 온전히 내 것이 되었습니다. 대신 TV와 친해집니다.', effects: { mental: 2, hp: -1 } }
    ]
  },
  {
    id: 'kindergarten_show', stage: 'infancy', at: [6, 180], place: '유치원 강당',
    title: '발표회',
    text: '유치원 발표회입니다. 선생님이 앞에 나와 노래하라고 손짓합니다. 무대가 넓어 보입니다.',
    choices: [
      { label: '앞으로 나가 크게 노래한다', result: function (s) { return s.flags.우렁찬_아기 ? '우렁찬 목소리가 강당에 꽉 찼습니다. 원장 선생님이 "저 아이 기억해"라고 말합니다.' : '목소리는 작았지만 끝까지 불렀습니다. 박수가 터졌습니다.'; },
        effects: { social: 3, charm: 2, mental: 1 }, set: { 무대체질: true } },
      { label: '엄마 뒤에 숨는다', result: '결국 무대에는 못 섰습니다. 엄마가 "다음에 하자" 하며 손을 잡아줍니다.', effects: { mental: -1, social: 1 } }
    ]
  },
  {
    id: 'pocket_money_first', stage: 'infancy', at: [7, 60], place: '집',
    title: '첫 용돈',
    text: '아빠가 만 원을 쥐여주며 말합니다. "이번 주 용돈이다. 어떻게 쓸지는 네가 정해."',
    choices: [
      { label: '문구점에서 다 쓴다', result: '딱 하루 만에 사라졌습니다. 돈은 빨리 사라진다는 걸 배웠습니다.', effects: { charm: 2, mental: 1, asset: 2 } },
      { label: '저금통에 넣는다', result: '저금통이 조금 무거워졌습니다. 부모님이 흐뭇해합니다.', effects: { asset: 10, mental: 1, social: 1 }, set: { 짠돌이: true } },
      { label: '동생에게 간식을 사준다', result: '동생이 하루 종일 나를 따라다닙니다.', effects: { social: 3, asset: 1 } }
    ]
  },
  {
    id: 'grandma_holiday', stage: 'infancy', repeatable: true, place: '할머니 댁',
    title: '할머니 댁',
    text: '주말에 할머니 댁에 갔습니다. 할머니가 지폐를 쥐여주려고 합니다. 엄마가 눈으로 "받지 마" 신호를 보냅니다.',
    choices: [
      { label: '두 손으로 받는다', result: '할머니가 좋아하십니다. 엄마가 등 뒤에서 한숨을 쉽니다.', effects: { asset: 5, social: 1, mental: -1 } },
      { label: '얌전히 거절한다', result: '할머니가 "예의가 바르다"며 더 좋아하십니다. 결국 더 받았습니다.', effects: { asset: 8, charm: 1, mental: -1 } }
    ]
  },
  {
    id: 'bath_time', stage: 'infancy', repeatable: true, place: '욕실',
    title: '목욕 시간',
    text: '욕조에 물이 받아졌습니다. 나오라는데 나오기 싫습니다.',
    choices: [
      { label: '물장구를 친다', result: '욕실이 홍수가 났습니다. 엄마 아빠가 같이 젖었습니다.', effects: { hp: 1, social: 1, mental: -1 } },
      { label: '순순히 나온다', result: '스스로 마무리하는 습관. 칭찬받았습니다.', effects: { mental: 2, social: -1 } }
    ]
  },

  /* ══════════════ 8세 — 초등학교 입학 ══════════════ */
  {
    id: 'elementary_enter', stage: 'elementary', at: [8, 1], place: '초등학교', milestone: true, weight: 6,
    title: '초등학교 입학',
    text: '새 운동화를 신고 교실에 들어섰습니다. 40명이 조용히 나를 봅니다. 자리가 남아 있습니다.\n어디에 앉을까요?',
    choices: [
      { label: '맨 앞자리에 앉는다', result: '선생님 눈에 제일 먼저 들어왔습니다. 집중력이 좋은 아이가 됩니다.', effects: { mental: 3, hp: 1, social: 1 }, set: { 초등학생: true, 앞자리: true } },
      { label: '창가 자리에 앉는다', result: '바깥 풍경이 잘 보입니다. 수업 중에 가끔 딴생각을 합니다.', effects: { mental: 1, charm: 2, social: 1 }, set: { 초등학생: true, 창가: true } },
      { label: '친구 옆에 앉는다', result: '첫날부터 친구가 생겼습니다. 학교는 왕따 걱정 없이 시작합니다.', effects: { social: 3, mental: 2 }, set: { 초등학생: true, 단짝: true } }
    ]
  },
  {
    id: 'first_dictation', stage: 'elementary', at: [8, 90], place: '교실',
    title: '첫 받아쓰기',
    text: '받아쓰기 시험입니다. 선생님이 "맛없는"을 불러줬습니다. 받침이 헷갈립니다.',
    choices: [
      { label: '아는 대로 쓴다', result: '50점. "맛읍는"이라고 적었습니다. 엄마가 웃으면서 고쳐줬습니다.', effects: { mental: -1, social: 1 } },
      { label: '옆 친구 것을 살짝 본다', result: '100점. 맞았지만 손끝이 뜨거웠습니다.', effects: { mental: -1, social: 1 }, set: { 커닝_경험: true } },
      { label: '몰라도 끝까지 내 힘으로 쓴다', result: '60점이지만 스스로 쓴 답입니다. 선생님이 "정직하다"고 적어주셨습니다.', effects: { mental: 2, social: 1 } }
    ]
  },
  {
    id: 'academy_pick', stage: 'elementary', at: [8, 150], place: '학원가',
    title: '학원 정하기',
    text: '엄마가 학원 하나를 고르라고 합니다. "수학, 영어, 피아노, 태권도 중에 하나."\n옆집 아이는 두 개를 다닌다고 합니다.',
    choices: [
      { label: '수학 학원', result: '숫자가 재미있어지기 시작했습니다. 계산이 빨라집니다.', effects: { mental: 3 }, set: { 학원_수학: true } },
      { label: '영어 학원', result: '외국인 선생님과 말하는 게 부끄럽지만 재밌습니다.', effects: { charm: 2, mental: 2 }, set: { 학원_영어: true } },
      { label: '피아노', result: '손가락이 바빠졌습니다. 나중에 어른이 되어 쓸 데가 있을 겁니다.', effects: { charm: 3, mental: 1 }, set: { 학원_피아노: true } },
      { label: '태권도 계속', result: '몸이 튼튼해집니다. 반에서 제일 빠른 발.', effects: { hp: 3, social: 2 }, set: { 태권도: true } }
    ]
  },
  {
    id: 'friend_fight', stage: 'elementary', place: '운동장',
    title: '친구와의 갈등',
    text: '점심시간, 짝이 내 지우개를 가져다놓고 안 줬다고 합니다. 실은 내가 빌린 겁니다.',
    choices: [
      { label: '사과하고 지우개를 돌려준다', result: '짝이 "괜찮아" 하며 웃었습니다. 관계는 오히려 가까워졌습니다.', effects: { social: 3, mental: 2 } },
      { label: '억울하다고 끝까지 우긴다', result: '한 시간을 다퉜습니다. 둘 다 지쳤고, 다음 날 자리를 바꿨습니다.', effects: { social: -3, mental: 1 } },
      { label: '선생님께 알린다', result: '선생님이 중재해 주셨습니다. 공정하지만 어딘가 어색해졌습니다.', effects: { social: 1, mental: 1 } }
    ]
  },
  {
    id: 'sports_day', stage: 'elementary', at: [9, 150], place: '운동장',
    title: '체육대회 계주',
    text: '체육대회 마지막 경기, 반 대항 계주입니다. 마지막 주자가 되었습니다. 3등이 우리 반입니다.',
    choices: [
      { label: '전력으로 달린다', result: '2등으로 들어왔습니다. 숨이 턱까지 차지만 모두가 나를 부릅니다.', effects: { hp: -2, social: 3, mental: 2 } },
      { label: '무리하지 않고 달린다', result: '4등. 아무도 뭐라 안 했지만 나는 밤에 생각났습니다.', effects: { hp: -1, mental: -1 } }
    ]
  },
  {
    id: 'class_president', stage: 'elementary', at: [10, 60], place: '교실',
    title: '반장 선거',
    text: '반장 선거입니다. 선생님이 "나 할 사람?" 하고 물었습니다. 아직 아무도 손을 안 들었습니다.',
    choices: [
      { label: '손을 든다', result: function (s) { return s.flags.우렁찬_아기 || s.flags.무대체질 ? '우렁찬 목소리로 공약을 말했습니다. 압도적 표 차로 당선.' : '떨리는 목소리로 공약을 말했습니다. 그래도 표가 나왔습니다.'; },
        effects: { social: 3, mental: 2, charm: 2 }, set: { 반장: true } },
      { label: '조용히 있는다', result: '다른 아이가 반장이 되었습니다. 나는 그 아이의 오른팔이 되어 실무를 맡았습니다.', effects: { mental: 1, social: 1 } }
    ]
  },
  {
    id: 'game_time', stage: 'elementary', at: [10, 180], place: '내 방',
    title: '게임의 세계',
    text: '친구가 게임 계정을 알려줬습니다. 오늘 밤, 첫 보스전입니다. 내일은 받아쓰기 시험입니다.',
    choices: [
      { label: '보스전을 잡는다', result: '새벽 2시에 클리어. 다음 날 시험은 45점. 그래도 뿌듯합니다.', effects: { mental: 3, hp: -2, social: 1 }, set: { 게이머: true } },
      { label: '한 판만 하고 잔다', result: '자제력이라는 걸 스스로 확인했습니다.', effects: { mental: 2, hp: 1 } },
      { label: '게임을 지운다', result: '친구가 서운해했지만 성적은 올랐습니다.', effects: { mental: 1, social: -2, hp: 1 } }
    ]
  },
  {
    id: 'first_phone', stage: 'elementary', at: [11, 60], place: '가전매장',
    title: '첫 스마트폰',
    text: '드디어 첫 휴대폰입니다. 아빠는 "공부할 때는 안 된다"는 규칙을 종이에 써서 붙였습니다.',
    choices: [
      { label: '규칙을 지킨다', result: '아빠가 믿음을 주기로 했습니다. 앱 설치 제한도 풀어줬습니다.', effects: { mental: 2, social: 2 } },
      { label: '몰래 새벽까지 본다', result: '다음 주에 사용 시간이 공개됐습니다. 가족 회의가 열렸습니다.', effects: { social: 1, mental: 1, hp: -2 } }
    ]
  },
  {
    id: 'quit_piano', stage: 'elementary', at: [11, 180], place: '음악학원',
    title: '피아노를 그만두고 싶습니다',
    text: '3년째 다니는 학원입니다. 오늘 선생님이 "다음 달 발표회"라고 했습니다. 나는 가기 싫습니다.',
    choices: [
      { label: '그만둔다고 말한다', result: function (s) { return s.flags.학원_피아노 ? '엄마가 마지못해 수락했습니다. 자유시간이 생겼지만 마음 한구석이 비었습니다.' : '별로 한 게 없어서 그만두는 것도 쉽지 않았습니다. 그냥 집에 있습니다.'; },
        effects: { mental: 2, charm: -1 } },
      { label: '발표회까지 해본다', result: '무대에서 쇼팽을 쳤습니다. 손이 떨렸지만, 마지막까지 쳤습니다.', effects: { charm: 3, mental: 2, social: 2 } }
    ]
  },
  {
    id: 'bullying_witness', stage: 'elementary', when: function (s) { return s.age >= 11; }, place: '복도',
    title: '복도에서 본 것',
    text: '복도 끝에서 몇 명이 한 아이 가방을 빼앗고 있습니다. 그 아이는 웃으면서 "줘"라고 말하고 있습니다.',
    choices: [
      { label: '가서 말린다', result: '가방을 돌려줬습니다. 그날부터 그 아이가 내 옆에 다닙니다.', effects: { social: 3, mental: 3, hp: -1 } },
      { label: '선생님께 알린다', result: '선생님이 바로 나섰습니다. 조용히 해결됐지만 나는 마음이 무거웠습니다.', effects: { social: 1, mental: 2 } },
      { label: '모른 척 지나간다', result: '아무 일도 없던 것처럼 지나갔습니다. 그 기억은 오래 남을 겁니다.', effects: { mental: -2 } }
    ]
  },
  {
    id: 'first_crush', stage: 'elementary', at: [12, 180], place: '교실',
    title: '첫 짝사랑',
    text: '옆 반 아이가 자꾸 눈에 들어옵니다. 체육시간이면 심장이 빨리 뜁니다. 친구가 "고백해"라고 합니다.',
    choices: [
      { label: '쪽지를 써서 전한다', result: '답장을 기다렸지만 오지 않았습니다. 그래도 용감했습니다.', effects: { mental: -2, charm: 2, social: 1 } },
      { label: '마음에만 둔다', result: '졸업할 때까지 말하지 못했습니다. 기억이 더 오래갔습니다.', effects: { mental: 1, charm: 1 } }
    ]
  },
  {
    id: 'math_contest', stage: 'elementary', at: [12, 90], when: function (s) { return s.flags.학원_수학 || s.flags.앞자리; }, place: '경시대회장',
    title: '수학 경시대회',
    text: '선생님이 경시대회를 권합니다. 주말을 반납해야 합니다. 상금은 10만 원입니다.',
    choices: [
      { label: '나간다', result: '동상입니다. 트로피가 거실 TV 옆에 놓였습니다.', effects: { mental: 3, asset: 10, social: 2 }, set: { 수학상: true } },
      { label: '주말이 더 소중하다', result: '주말에 친구들과 놀았습니다. 대신 특별한 성취는 없습니다.', effects: { mental: 2, social: 2 } }
    ]
  },
  {
    id: 'save_money', stage: 'elementary', at: [13, 60], place: '은행',
    title: '통장 만들기',
    text: '엄마가 "적금을 하나 들어보자"고 합니다. 용돈은 한 달에 3만 원입니다.',
    choices: [
      { label: '매달 만 원씩 저축', result: '1년 뒤 15만 원이 모였습니다. 처음으로 숫자가 커지는 걸 봤습니다.', effects: { asset: 15, mental: 2 }, set: { 짠돌이: true } },
      { label: '그냥 다 쓰겠다고 한다', result: '그 나이에는 그게 정답입니다. 대신 미안한 얼굴의 엄마를 봤습니다.', effects: { charm: 2, mental: 1 } }
    ]
  },
  {
    id: 'pc_bang', stage: 'elementary', repeatable: true, when: function (s) { return s.age >= 11; }, place: 'PC방',
    title: 'PC방 유혹',
    text: '친구들이 "한 시간만"이라고 합니다. 지금 가면 숙제는 못 합니다.',
    choices: [
      { label: '간다', result: '한 시간이 세 시간이 됐습니다. 낸 돈은 모아둔 용돈에서 나갔습니다.', effects: { mental: 2, social: 1, asset: -5, hp: -1 } },
      { label: '집에 간다', result: '친구가 "아쉽다"고 했지만 숙제는 끝냈습니다.', effects: { hp: 1, social: -1, mental: -1 } }
    ]
  },
  {
    id: 'middle_prep', stage: 'elementary', at: [13, 300], place: '내 방', milestone: true,
    title: '중학교 배정',
    text: '중학교 배정이 나왔습니다. 집에서 걸어서 15분 거리입니다. 친구들은 다른 데로 갑니다.',
    choices: [
      { label: '새 친구를 만들겠다고 마음먹는다', result: '겨울방학 동안 새로운 시작을 연습했습니다.', effects: { mental: 2, social: 2 } },
      { label: '동네 친구를 따라서 학군을 바꾼다', result: '엄마가 무리해서 이사를 고민합니다. 결국 그냥 다니기로 했습니다.', effects: { social: 2, mental: 1 } }
    ]
  },
  {
    id: 'academy_homework', stage: 'elementary', repeatable: true, place: '학원',
    title: '학원 숙제',
    text: '학원 숙제를 안 해갔습니다. 선생님이 자리마다 확인하고 있습니다. 내 순서가 다가옵니다.',
    choices: [
      { label: '모른다고 솔직히 말한다', result: '선생님이 한 번 더 설명해 줬습니다. 벌은 없었습니다.', effects: { mental: 2, hp: -1 } },
      { label: '쉬는 시간에 급히 쓴다', result: '넘어갔습니다. 어른이 되어도 이런 요령은 필요합니다.', effects: { hp: 1, social: -1, mental: -1 } }
    ]
  },
  {
    id: 'lunch_tray', stage: 'elementary', repeatable: true, place: '급식실',
    title: '급식 시간',
    text: '오늘 급식은 카레입니다. 옆 반은 이미 자리를 다 차지했습니다.',
    choices: [
      { label: '카레를 두 그릇 먹는다', result: function (s) { return s.flags.대식가 ? '3그릇까지 가능하다는 걸 확인했습니다. 급식실의 전설이 되었습니다.' : '배가 불렀습니다. 오후 수업이 졸립니다.'; },
        effects: { hp: 2, social: -1 } },
      { label: '친구 자리를 찾아 다닌다', result: '결국 맨 끝자리에서 먹었지만, 새로운 친구와 말을 섞었습니다.', effects: { social: 2, hp: -1 } }
    ]
  }

]);
