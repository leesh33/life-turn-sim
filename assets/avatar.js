/* ─────────────────────────────────────────────
   avatar.js — 성장 아바타(인라인 SVG) · 말풍선 · 단기 미션
   「인생 한 턴」

   · 외부 이미지 없이 몇 KB 의 벡터만으로 그린다(네트워크 지연 0).
   · 나이대(7단계)에 따라 머리·옷·소품이 바뀌고,
     지금 능력치(체력·멘탈·매력·재산)에 따라 표정과 소품이 달라진다.
   · 말풍선은 지금 나이대·능력치·직전 선택 결과를 읽어 한두 줄로 말한다.
   · 단기 미션은 나이대마다 하나씩, 진행률(%)을 실시간으로 보여 주고
     달성하는 순간 한 번만 작은 보너스를 준다.
   ───────────────────────────────────────────── */
(function (global) {
  'use strict';

  var SKIN = '#F8D6B8';
  var SKIN_SH = '#EBBE97';
  var INK = '#2A2118';

  /* ── 나이대(7단계) ──
     게임의 학창·사회생활 구간과 맞물리도록 경계를 잡았다.
     (유아기 1~7 · 초등 8~13 · 중고등 14~19 · 대학/청년 20~25 ·
      직장인·성인 26~49 · 중년 50~64 · 노년 65~80) */
  var BANDS = [
    { id: 'baby', from: 1, to: 7, name: '유아기', emoji: '🍼', tint: '#FFF0E3', tint2: '#FFDFC4',
      hair: '#43312A', hair2: '#5A4338', cloth: '#F8C3AC', cloth2: '#FFF9F2', accent: '#E79C80',
      mission: { id: 'm_baby', label: '유아 미션', goal: '호감도 65 달성', key: 'social', target: 65, base: 36, bonus: { social: 3, charm: 2 } } },
    { id: 'child', from: 8, to: 13, name: '초등학교', emoji: '🎒', tint: '#E9F1FF', tint2: '#D2E3FB',
      hair: '#2E251F', hair2: '#463930', cloth: '#3D5A99', cloth2: '#FFFFFF', accent: '#E0603C',
      mission: { id: 'm_child', label: '초등 미션', goal: '역량 60 돌파', key: 'intel', target: 60, bonus: { intel: 3 } } },
    { id: 'teen', from: 14, to: 19, name: '중고등학교', emoji: '📚', tint: '#EFEAFC', tint2: '#DCD1F8',
      hair: '#2A211C', hair2: '#3F3028', cloth: '#7C5CD6', cloth2: '#F5F0FF', accent: '#5B3FB8',
      mission: { id: 'm_teen', label: '10대 미션', goal: '역량 70 돌파', key: 'intel', target: 70, bonus: { intel: 3, mental: 2 } } },
    { id: 'youth', from: 20, to: 25, name: '대학·청년', emoji: '🎓', tint: '#FFF3E1', tint2: '#FBDFB4',
      hair: '#33261D', hair2: '#4C3828', cloth: '#2C8C7A', cloth2: '#FFFFFF', accent: '#C9871F',
      mission: { id: 'm_youth', label: '20대 미션', goal: '매력 70 달성', key: 'charm', target: 70, bonus: { charm: 3, social: 2 } } },
    { id: 'adult', from: 26, to: 49, name: '직장인·성인', emoji: '💼', tint: '#E8EEF9', tint2: '#D2DFF1',
      hair: '#2C241E', hair2: '#41352B', cloth: '#2E3A55', cloth2: '#FFFFFF', accent: '#E0653C',
      mission: { id: 'm_adult', label: '30·40대 미션', goal: '재산 3,000만 돌파', key: 'asset', target: 3000, bonus: { asset: 150 } } },
    { id: 'midlife', from: 50, to: 64, name: '중년', emoji: '🌗', tint: '#EDF1F1', tint2: '#D9E3E2',
      hair: '#4A423B', hair2: '#C6BFB6', cloth: '#5B6B7C', cloth2: '#F1EAE0', accent: '#8C6B3F',
      mission: { id: 'm_midlife', label: '50대 미션', goal: '재산 1억 달성', key: 'asset', target: 10000, bonus: { asset: 300 } } },
    { id: 'senior', from: 65, to: 200, name: '노년', emoji: '🍂', tint: '#F7F0E4', tint2: '#E8DCC7',
      hair: '#D3CDC5', hair2: '#B7AFA6', cloth: '#8A7355', cloth2: '#F6F0E6', accent: '#6E5A42',
      mission: { id: 'm_senior', label: '노년 미션', goal: '멘탈 65 달성', key: 'mental', target: 65, bonus: { mental: 3, hp: 2 } } }
  ];

  function bandOf(age) {
    for (var i = 0; i < BANDS.length; i++) {
      if (age >= BANDS[i].from && age <= BANDS[i].to) return BANDS[i];
    }
    return age < 1 ? BANDS[0] : BANDS[BANDS.length - 1];
  }
  function bandById(id) {
    for (var i = 0; i < BANDS.length; i++) if (BANDS[i].id === id) return BANDS[i];
    return BANDS[0];
  }

  function num(v, d) { return typeof v === 'number' && !isNaN(v) ? v : d; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function r1(v) { return Math.round(v * 10) / 10; }

  /* ── 표정 ──
     체력·멘탈이 35 아래면 지친 얼굴, 둘 다 넉넉하면 활짝 웃는 얼굴. */
  function moodOf(state) {
    var st = (state && state.stats) || {};
    var hp = num(st.hp, 50), mental = num(st.mental, 50);
    if (hp < 35 || mental < 35) return 'tired';
    if (hp >= 75 && mental >= 70) return 'great';
    return 'ok';
  }

  /* ── SVG 도우미 ── */
  function star(cx, cy, r) {
    var k = r * 0.3;
    return 'M' + cx + ' ' + r1(cy - r) +
      'L' + r1(cx + k) + ' ' + r1(cy - k) +
      'L' + r1(cx + r) + ' ' + cy +
      'L' + r1(cx + k) + ' ' + r1(cy + k) +
      'L' + cx + ' ' + r1(cy + r) +
      'L' + r1(cx - k) + ' ' + r1(cy + k) +
      'L' + r1(cx - r) + ' ' + cy +
      'L' + r1(cx - k) + ' ' + r1(cy - k) + 'Z';
  }

  function shade(hex, amt) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    var f = function (v) { return Math.max(0, Math.min(255, Math.round(v + 255 * amt))); };
    return '#' + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1);
  }

  /* ═════════ 머리카락 ═════════
     작게(44~60px) 줄여도 실루엣이 읽히도록 큼직한 덩어리로 그린다.
     머리: 중심 (36, 30) 반지름 19  →  x 17~55, y 11~49
     앞머리 높이(fringe)가 낮을수록 이마가 덮여 어려 보이고,
     높을수록 이마가 넓어 나이 들어 보인다. */
  function hairBack(band, female) {
    if (!female) return '';
    var h = 'fill="' + band.hair + '"';
    var tip = band.id === 'child' ? 50 : band.id === 'baby' ? 42 : band.id === 'adult' ? 52 : 58;
    var lock = 'M19 22 C11.6 30 10.6 ' + (tip - 10) + ' 13 ' + tip + ' C15.4 ' + (tip + 4) + ' 22 ' + (tip + 2) + ' 23.4 ' + (tip - 4) +
      ' C20 ' + (tip - 12) + ' 19.8 32 21.6 24 Z';
    var flip = 'M53 22 C60.4 30 61.4 ' + (tip - 10) + ' 59 ' + tip + ' C56.6 ' + (tip + 4) + ' 50 ' + (tip + 2) + ' 48.6 ' + (tip - 4) +
      ' C52 ' + (tip - 12) + ' 52.2 32 50.4 24 Z';
    return '<path d="' + lock + '" ' + h + '/>' + '<path d="' + flip + '" ' + h + '/>';
  }

  // 머리 전체를 덮는 큰 덩어리 — 위는 머리보다 살짝 크게, 아래는 앞머리선까지
  function hairMass(band, fringe, side) {
    var h = 'fill="' + band.hair + '"';
    return '<path d="M' + (17.6 - side) + ' 33 C' + (17.6 - side) + ' 2 ' + (54.4 + side) + ' 2 ' + (54.4 + side) + ' 33 ' +
      'C' + (54.4 + side) + ' ' + (fringe + 8) + ' ' + (50 + side) + ' ' + fringe + ' ' + (45 + side) + ' ' + fringe + ' ' +
      'L' + (27 - side) + ' ' + fringe + ' ' +
      'C' + (22 - side) + ' ' + fringe + ' ' + (17.6 - side) + ' ' + (fringe + 8) + ' ' + (17.6 - side) + ' 33 Z" ' + h + '/>';
  }

  function hairFront(band, opt) {
    var h2 = 'fill="' + (band.id === 'senior' || band.id === 'midlife' ? band.hair2 : shade(band.hair, 0.22)) + '"';
    var h = 'fill="' + band.hair + '"';
    switch (band.id) {
      case 'baby': // 솜털 두 줌 + 옆머리 (거의 민머리)
        return '<path d="M32 13.4 q0.6 -5.8 4.4 -7 q-1.4 3.4 0.8 6.4 q-2.8 -1.6 -5.2 0.6 z" ' + h + '/>' +
          '<path d="M40.6 13 q2 -4.8 5.4 -4.4 q-2.8 2 -2.6 4.8 z" ' + h + '/>' +
          '<path d="M18.8 26 q-1.6 5 -1 9 q2.8 -0.6 3.6 -5 z" ' + h + '/>' +
          '<path d="M53.2 26 q1.6 5 1 9 q-2.8 -0.6 -3.6 -5 z" ' + h + '/>' +
          (opt.female ? '<path d="M47.4 16.6 l3 -2 l0.6 3.2 z" fill="#F0806E"/>' : '');
      case 'child': // 보울컷 — 이마를 덮는 두툼한 단발
        return hairMass(band, 28.4, 1.2) +
          '<path d="M17.4 30 q-1 5 0.8 7.6 q2.2 -2.4 2 -6.4 z" ' + h + '/>' +
          '<path d="M54.6 30 q1 5 -0.8 7.6 q-2.2 -2.4 -2 -6.4 z" ' + h + '/>' +
          '<path d="M25 29.6 q11 -2.6 22 0 q-11 2.4 -22 0 z" fill="rgba(255,255,255,0.16)"/>' +
          (opt.female ? '<path d="M47.4 17.4 q4.6 -1.6 5.6 2 q-3.2 -0.8 -4.6 0.6 z" fill="#F0806E"/>' : '');
      case 'teen': // 삐죽 앞머리 + 옆머리
        return hairMass(band, 27.4, 1.6) +
          '<path d="M26 15.6 l2.4 -5.4 l2 5.6 z" ' + h + '/>' +
          '<path d="M36 12.6 l2.8 -5.2 l1.6 5.8 z" ' + h + '/>' +
          '<path d="M45.4 16 l3 -4.6 l1 5.6 z" ' + h + '/>' +
          '<path d="M23 27.6 q7.6 -7.6 16.4 -4 q-9.8 0.8 -13.4 7 z" ' + h2 + '/>' +
          '<path d="M17.4 31 q-1.2 5 0.8 8 q2.6 -2.6 2.2 -7 z" ' + h + '/>' +
          '<path d="M54.6 31 q1.2 5 -0.8 8 q-2.6 -2.6 -2.2 -7 z" ' + h + '/>';
      case 'youth': // 옆가르마 + 볼륨
        return hairMass(band, 26.4, 1.8) +
          '<path d="M36 26.6 q9.4 -2.6 15 4 q-7.4 -4.4 -15 -3.2 z" ' + h2 + '/>' +
          '<path d="M17.4 32 q-1.4 5.6 1.2 8.6 q2.6 -2.8 2.2 -7.4 z" ' + h + '/>' +
          '<path d="M54.6 31 q1 3.6 -0.8 6 q-2 -2.4 -1.8 -6 z" ' + h + '/>';
      case 'adult': // 단정한 옆머리 — 가르마 선
        return hairMass(band, 25.2, 1.2) +
          '<path d="M40.4 13.4 q-3.4 6.4 -3 11.6" stroke="' + shade(band.hair, -0.18) + '" stroke-width="1.2" fill="none" stroke-linecap="round"/>' +
          '<path d="M40.6 25.6 q8 -0.6 12.4 5.8 q-6 -3.8 -12.4 -3.4 z" ' + h2 + '/>' +
          '<path d="M18 32 q-0.5 4.6 0.8 7 q2 -2.6 1.8 -7 z" ' + h + '/>' +
          '<path d="M54 32 q0.5 4.6 -0.8 7 q-2 -2.6 -1.8 -7 z" ' + h + '/>';
      case 'midlife': // 관자놀이에 센 머리 — 이마가 조금 넓다
        return hairMass(band, 23.6, 1) +
          '<path d="M20.6 22.6 q1.8 -5.4 6 -7 q-2.6 3.6 -2.8 7.4 z" ' + h2 + '/>' +
          '<path d="M51.4 22.6 q-1.8 -5.4 -6 -7 q2.6 3.6 2.8 7.4 z" ' + h2 + '/>' +
          '<path d="M18.2 31 q-0.4 4 0.6 6.4 q1.8 -2.4 1.6 -6.2 z" ' + h + '/>' +
          '<path d="M53.8 31 q0.4 4 -0.6 6.4 q-1.8 -2.4 -1.6 -6.2 z" ' + h + '/>';
      default: // senior — 은발, 이마가 넓고 정수리가 가볍다
        return hairMass(band, 22, 0.8) +
          '<path d="M19.4 30 q-2 6 0.6 10 q3.2 -2.8 3 -8 z" ' + h + '/>' +
          '<path d="M52.6 30 q2 6 -0.6 10 q-3.2 -2.8 -3 -8 z" ' + h + '/>' +
          '<path d="M23.4 21.4 q3.8 -2.4 8 -3 q-4.4 1.8 -5.6 4.4 z" ' + h2 + '/>' +
          '<path d="M48.6 21.4 q-3.8 -2.4 -8 -3 q4.4 1.8 5.6 4.4 z" ' + h2 + '/>';
    }
  }

  /* ═════════ 몸 · 옷 ═════════
     어깨는 좁게, 아래로 살짝 퍼지는 상반신. y 53 ~ 90 */
  function bodyPath() {
    return 'M36 52.4 c-6.6 0 -10.8 2.6 -12.4 7.6 L20.2 90 h31.6 L48.4 60 C46.8 55 42.6 52.4 36 52.4 Z';
  }

  function sleeve(side, band) {
    var d = side === 'l'
      ? 'M24.6 57.6 q-4 4.8 -4.4 11.8 l-0.8 20.4 h5.6 l0.8 -20 q0.4 -7.8 2.8 -10.6 z'
      : 'M47.4 57.6 q4 4.8 4.4 11.8 l0.8 20.4 h-5.6 l-0.8 -20 q-0.4 -7.8 -2.8 -10.6 z';
    return '<path d="' + d + '" fill="' + shade(band.cloth, -0.07) + '"/>';
  }

  function clothes(band, opt) {
    var out = '';
    var c = 'fill="url(#avCloth' + band.id + ')"';
    var c2 = 'fill="' + band.cloth2 + '"';
    var ac = 'fill="' + band.accent + '"';

    out += sleeve('l', band) + sleeve('r', band);
    out += '<path d="' + bodyPath() + '" ' + c + '/>';
    // 손
    out += '<circle cx="22.2" cy="87.8" r="3" fill="' + SKIN + '"/>';
    out += '<circle cx="49.8" cy="87.8" r="3" fill="' + SKIN + '"/>';

    switch (band.id) {
      case 'baby': // 우주복 느낌의 배내옷 + 턱받이
        out += '<path d="M23 60 q13 7.4 26 0 q-2.4 -5.6 -13 -5.6 q-10.6 0 -13 5.6 z" ' + c2 + '/>';
        out += '<path d="M31 66 q5 6.6 10 0 q-1.6 9.6 -5 9.6 q-3.4 0 -5 -9.6 z" fill="#FFFDF8" stroke="' + band.accent + '" stroke-width="0.8"/>';
        out += '<circle cx="36" cy="70.6" r="1.1" ' + ac + '/>';
        out += '<path d="M28 62.4 q8 3.6 16 0" stroke="' + band.accent + '" stroke-width="1" fill="none" stroke-linecap="round"/>';
        out += '<circle cx="36" cy="80.6" r="1.5" fill="#FFFFFF" opacity="0.85"/>';
        break;
      case 'child': // 교복 블레이저 + 셔츠 + 리본
        out += '<path d="M36 53.4 l-7.6 6.6 l7.6 17.4 l7.6 -17.4 z" ' + c2 + '/>';
        out += '<path d="M36 60.2 l-5.4 -2.8 q2.6 3.6 5.4 6.8 z" ' + ac + '/>';
        out += '<path d="M36 60.2 l5.4 -2.8 q-2.6 3.6 -5.4 6.8 z" ' + ac + '/>';
        out += '<circle cx="36" cy="60.8" r="1.5" ' + ac + '/>';
        out += '<path d="M36 66.4 v10.8" stroke="' + band.accent + '" stroke-width="1.2" opacity="0.6"/>';
        out += '<path d="M20.6 60.6 q-1.4 14 0.6 29.4 h4.6 L24 60.6 z" fill="' + band.accent + '" opacity="0.92"/>';
        out += '<path d="M51.4 60.6 q1.4 14 -0.6 29.4 h-4.6 L48 60.6 z" fill="' + band.accent + '" opacity="0.92"/>';
        out += '<path d="M24.4 55.6 q-1.6 3 -1.6 5.4 l3.4 -3.4 z" fill="#FFFFFF" opacity="0.9"/>';
        break;
      case 'teen': // 후드 티
        out += '<path d="M21 56 q15 9.6 30 0 q-4 -5.4 -15 -5.4 q-11 0 -15 5.4 z" fill="' + band.accent + '"/>';
        out += '<path d="M36 53.2 c-5.6 0 -9.6 1.8 -11.6 4 q11.6 6 23.2 0 c-2 -2.2 -6 -4 -11.6 -4 z" ' + c2 + '/>';
        out += '<path d="M31.6 60.4 v9.2" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" opacity="0.92"/>';
        out += '<path d="M40.4 60.4 v9.2" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" opacity="0.92"/>';
        out += '<circle cx="31.6" cy="70" r="1.2" ' + c2 + '/><circle cx="40.4" cy="70" r="1.2" ' + c2 + '/>';
        out += '<path d="M26 78 h20 q2.2 0 2.2 2.2 v4.4 q0 2.2 -2.2 2.2 h-20 q-2.2 0 -2.2 -2.2 v-4.4 q0 -2.2 2.2 -2.2 z" fill="' + band.accent + '" opacity="0.4"/>';
        break;
      case 'youth': // 오픈 재킷 + 흰 티
        out += '<path d="M36 53.4 l-7 5.8 l7 14.6 l7 -14.6 z" ' + c2 + '/>';
        out += '<path d="M36 63.6 v26.2" stroke="' + band.accent + '" stroke-width="1.2" opacity="0.75"/>';
        out += '<path d="M23.6 61.6 q-2.2 13 -0.6 28.4 h3.4 L25.4 61.6 z" fill="' + band.accent + '" opacity="0.6"/>';
        out += '<path d="M48.4 61.6 q2.2 13 0.6 28.4 h-3.4 L46.6 61.6 z" fill="' + band.accent + '" opacity="0.6"/>';
        out += '<path d="M31 85.4 h10" stroke="#FFFFFF" stroke-width="1.1" opacity="0.6"/>';
        out += '<circle cx="38.6" cy="72" r="1.6" fill="' + band.accent + '" opacity="0.9"/>';
        break;
      case 'adult': // 정장 + 셔츠 + 넥타이
        out += '<path d="M36 53.4 l-8.4 6 l8.4 20.6 l8.4 -20.6 z" ' + c2 + '/>';
        out += '<path d="M36 61 l-2.8 3.6 l2.8 12.6 l2.8 -12.6 z" ' + ac + '/>';
        out += '<path d="M36 60 l3.6 -3.6 h-7.2 z" ' + ac + '/>';
        out += '<path d="M26 59.6 q-3.4 4.4 -4 11 q3.8 -3 7.2 -7.2 z" fill="' + shade(band.cloth, -0.1) + '"/>';
        out += '<path d="M46 59.6 q3.4 4.4 4 11 q-3.8 -3 -7.2 -7.2 z" fill="' + shade(band.cloth, -0.1) + '"/>';
        out += '<path d="M42 81.4 h7 v4.8 h-7 z" fill="#FFFFFF" opacity="0.88"/>';
        out += '<circle cx="36" cy="76" r="1.2" fill="#E8DCC8" opacity="0.9"/>';
        break;
      case 'midlife': // 카디건 + 셔츠
        out += '<path d="M36 53.6 l-7.4 5.4 l7.4 16 l7.4 -16 z" fill="' + band.cloth2 + '"/>';
        out += '<path d="M36 60.6 v29.2" stroke="#E3D7C6" stroke-width="1.3"/>';
        out += '<path d="M36 57.6 l-4.6 -3.2 q2.2 3.6 4.6 7 z" fill="#E3D7C6"/>';
        out += '<path d="M36 57.6 l4.6 -3.2 q-2.2 3.6 -4.6 7 z" fill="#E3D7C6"/>';
        out += '<circle cx="38.8" cy="66" r="1" fill="#E3D7C6"/><circle cx="38.8" cy="73" r="1" fill="#E3D7C6"/><circle cx="38.8" cy="80" r="1" fill="#E3D7C6"/>';
        out += '<path d="M24.4 61 q-2.8 6.4 -2.6 12.6 q3 -3.2 3.8 -8.4 z" fill="' + band.accent + '" opacity="0.4"/>';
        break;
      default: // senior — 조끼 + 셔츠 + 목도리
        out += '<path d="M36 53.4 l-8 5.2 l8 18.4 l8 -18.4 z" fill="' + band.cloth2 + '"/>';
        out += '<path d="M24.4 58 q4.4 2.6 6 6.4 q-3.6 1.4 -6.8 -1 z" fill="' + band.cloth2 + '"/>';
        out += '<path d="M47.6 58 q-4.4 2.6 -6 6.4 q3.6 1.4 6.8 -1 z" fill="' + band.cloth2 + '"/>';
        out += '<path d="M24.6 58.4 q11.4 7 23.2 0 q-1.8 3.8 -11.6 3.8 q-9.8 0 -11.6 -3.8 z" fill="' + band.accent + '" opacity="0.6"/>';
        out += '<circle cx="38.8" cy="72" r="1.1" fill="#E3D7C6" opacity="0.85"/>';
        out += '<circle cx="38.8" cy="79" r="1.1" fill="#E3D7C6" opacity="0.85"/>';
        break;
    }
    return out;
  }

  /* ═════════ 얼굴 ═════════
     머리 중심 (36, 30) · 반지름 19 → 눈 y 34, 입 y 42 */
  function face(band, mood, st, flags) {
    var g = [];
    g.push('<circle cx="36" cy="30" r="19" fill="' + SKIN + '"/>');
    g.push('<circle cx="17.2" cy="33" r="3.6" fill="' + SKIN_SH + '"/>');
    g.push('<circle cx="54.8" cy="33" r="3.6" fill="' + SKIN_SH + '"/>');
    // 턱 밑 그늘
    g.push('<path d="M28 47.4 q8 4.6 16 0 q-8 3 -16 0 z" fill="' + SKIN_SH + '" opacity="0.45"/>');

    if ((st.charm || 0) >= 70 || mood === 'great') {
      g.push('<ellipse cx="26.4" cy="38.6" rx="4" ry="2.4" fill="#F0957D" opacity="0.5"/>');
      g.push('<ellipse cx="45.6" cy="38.6" rx="4" ry="2.4" fill="#F0957D" opacity="0.5"/>');
    }

    if (flags.sunglasses) {
      g.push('<path d="M22.6 30.4 h11 q1.4 0 1.4 1.4 v4.2 q0 2.8 -3.2 2.8 h-6.2 q-3.2 0 -3.2 -2.8 v-4.2 q0 -1.4 1.4 -1.4 z" fill="#241E19"/>');
      g.push('<path d="M38.4 30.4 h11 q1.4 0 1.4 1.4 v4.2 q0 2.8 -3.2 2.8 h-6.2 q-3.2 0 -3.2 -2.8 v-4.2 q0 -1.4 1.4 -1.4 z" fill="#241E19"/>');
      g.push('<path d="M33.6 33.4 h4.8" stroke="#241E19" stroke-width="1.6"/>');
      g.push('<path d="M24.4 33 l4.6 -1.8" stroke="#6E655C" stroke-width="1.1" opacity="0.75"/>');
    } else if (mood === 'great') {
      g.push('<path d="M24.4 34 q3.6 -4.8 7 0" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>');
      g.push('<path d="M40.6 34 q3.6 -4.8 7 0" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>');
    } else {
      g.push('<ellipse cx="27.8" cy="33.6" rx="2.4" ry="2.8" fill="' + INK + '"/>');
      g.push('<ellipse cx="44.2" cy="33.6" rx="2.4" ry="2.8" fill="' + INK + '"/>');
      g.push('<circle cx="28.5" cy="32.6" r="0.8" fill="#FFFFFF"/>');
      g.push('<circle cx="44.9" cy="32.6" r="0.8" fill="#FFFFFF"/>');
      if (mood === 'tired') {
        g.push('<path d="M24 38.8 q4 2.8 7.8 0.2" stroke="#C0A797" stroke-width="1.2" fill="none" stroke-linecap="round"/>');
        g.push('<path d="M40.2 39 q4 2.8 7.8 0.2" stroke="#C0A797" stroke-width="1.2" fill="none" stroke-linecap="round"/>');
      }
    }

    if (flags.sunglasses) {
      g.push('<path d="M32.2 43 q3.8 3 7.6 0" stroke="' + INK + '" stroke-width="1.5" fill="none" stroke-linecap="round"/>');
    } else if (mood === 'great') {
      g.push('<path d="M30.6 40.6 q5.4 7.2 10.8 0 q-5.4 2.6 -10.8 0 z" fill="#B8455A"/>');
      g.push('<path d="M30.6 40.6 q5.4 2.6 10.8 0" stroke="' + INK + '" stroke-width="1.2" fill="none" stroke-linecap="round"/>');
    } else if (mood === 'tired') {
      g.push('<path d="M32.2 42.6 h7.6" stroke="' + INK + '" stroke-width="1.5" stroke-linecap="round"/>');
    } else {
      g.push('<path d="M32 41.4 q4 3.4 8 0" stroke="' + INK + '" stroke-width="1.5" fill="none" stroke-linecap="round"/>');
    }
    return g.join('');
  }

  /* ═════════ 상태 소품 ═════════ */
  function props(band, state, flags) {
    var st = state.stats || {};
    var p = [];
    var hp = num(st.hp, 50), mental = num(st.mental, 50), asset = num(st.asset, 0);
    var charm = num(st.charm, 50), intel = num(st.intel, 50);

    if (hp < 35 || mental < 35) {
      p.push('<path d="M56.4 24.6 q3.8 5 3.8 7.4 a3.8 3.8 0 0 1 -7.6 0 q0 -2.4 3.8 -7.4 z" fill="#8CC4EE" opacity="0.95"/>');
      p.push('<circle cx="55" cy="31.8" r="1" fill="#FFFFFF" opacity="0.85"/>');
    }
    if (asset < 0) {
      p.push('<g transform="rotate(-18 47.4 41.2)"><rect x="42.4" y="38.8" width="10" height="4.6" rx="2.1" fill="#F4DFC0" stroke="#D9BE97" stroke-width="0.7"/>' +
        '<circle cx="45.4" cy="41.1" r="0.5" fill="#D9BE97"/><circle cx="49.4" cy="41.1" r="0.5" fill="#D9BE97"/></g>');
    }
    if (asset >= 10000) {
      p.push('<g class="av-crown"><path d="M23 12.4 l3.6 -8 l4.8 5 l4.6 -8.6 l4.6 8.6 l4.8 -5 l3.6 8 z" fill="#F2C24C" stroke="#D9A02A" stroke-width="0.8" stroke-linejoin="round"/>' +
        '<circle cx="36" cy="6" r="1.3" fill="#FFF3C4"/></g>');
    } else if (asset >= 3000) {
      // 선글라스는 face() 에서 그린다
    }
    if (!flags.sunglasses && (band.id === 'midlife' || band.id === 'senior' || intel >= 82)) {
      p.push('<g class="av-glasses"><rect x="22.8" y="29.6" width="11" height="8.4" rx="2.8" fill="#BFD6E4" fill-opacity="0.3" stroke="#3B3833" stroke-width="1.1"/>' +
        '<rect x="38.2" y="29.6" width="11" height="8.4" rx="2.8" fill="#BFD6E4" fill-opacity="0.3" stroke="#3B3833" stroke-width="1.1"/>' +
        '<path d="M33.8 32.6 h4.4" stroke="#3B3833" stroke-width="1.1"/>' +
        '<path d="M22.8 32.2 l-3.8 -1.2" stroke="#3B3833" stroke-width="1.1"/>' +
        '<path d="M49.2 32.2 l3.8 -1.2" stroke="#3B3833" stroke-width="1.1"/></g>');
    }
    if (charm >= 78) {
      p.push('<g class="av-spark" fill="#F4C24E">' + star(12.6, 18.6, 3.6) + star(60.2, 24.4, 2.8) + star(57.4, 10.4, 2.2) + '</g>');
      p.push('<g class="av-spark2" fill="#F19C6A">' + star(9.4, 33.4, 2.4) + '</g>');
    }
    if (mental >= 88) {
      p.push('<g class="av-spark" fill="#7FBF9A">' + star(61.6, 44.4, 2.4) + '</g>');
    }
    return p.join('');
  }

  /* ── 아바타 한 장 ── */
  function svg(state) {
    var band = bandOf(state.age);
    var mood = moodOf(state);
    var st = state.stats || {};
    var female = state.gender === '여';
    var flags = { sunglasses: num(st.asset, 0) >= 3000 };
    var label = band.name + ' 모습';

    var out = [];
    out.push('<svg class="av-svg" viewBox="0 0 72 94" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + label + '">');
    out.push('<defs>' +
      '<linearGradient id="avSky-' + band.id + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + band.tint + '"/><stop offset="1" stop-color="' + band.tint2 + '"/></linearGradient>' +
      '<linearGradient id="avCloth-' + band.id + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + shade(band.cloth, 0.06) + '"/><stop offset="1" stop-color="' + shade(band.cloth, -0.1) + '"/></linearGradient>' +
      '</defs>');
    out.push('<circle cx="36" cy="45" r="33" fill="url(#avSky-' + band.id + ')"/>');
    out.push('<ellipse cx="36" cy="88" rx="17" ry="2.6" fill="rgba(27,26,24,0.07)"/>');
    out.push(hairBack(band, female));
    out.push('<path d="M32.4 42 h7.2 v9 h-7.2 z" fill="' + SKIN_SH + '"/>');
    out.push(clothes(band, {}));
    out.push(face(band, mood, st, flags));
    out.push(hairFront(band, { female: female }));
    out.push(props(band, state, flags));
    out.push('</svg>');
    return out.join('');
  }

  /* ── 재산 표기 ── */
  function manText(v) {
    var n = Math.round(Math.abs(v));
    var sign = v < 0 ? '-' : '';
    if (n >= 10000) {
      var eok = n / 10000;
      return sign + (eok >= 10 ? Math.round(eok) : Math.round(eok * 10) / 10) + '억';
    }
    if (n >= 1000) return sign + (Math.round(n / 100) / 10) + '천만';
    return sign + n.toLocaleString('ko-KR') + '만';
  }

  /* ── 단기 미션 ──
     · def.target 은 그 나이대가 끝날 때까지 닿으면 좋은 값.
     · def.base(선택)는 진행률의 출발선이다 — 유아 미션처럼 '태어날 때 이미
       어느 정도 있는 값'을 목표로 삼을 때, (지금값-base)/(목표-base)로 재서
       0%에서 차오르게 한다. base 가 없으면 지금값/목표 그대로(기존 규칙). */
  function mission(state) {
    var band = bandOf(state.age);
    var def = band.mission;
    var st = state.stats || {};
    var cur = def.key === 'asset' ? num(st.asset, 0) : num(st[def.key], 0);
    var base = typeof def.base === 'number' ? def.base : 0;
    var span = Math.max(1, def.target - base);
    // 재산 미션은 빚(마이너스)이면 목표가 '빚 청산'으로 바뀐다 — 0원을 넘는 순간 달성
    var inDebt = def.key === 'asset' && cur < 0;
    var goal = inDebt ? '빚 청산' : def.goal;
    var pct = inDebt ? 0 : clamp(((cur - base) / span) * 100, 0, 100);
    var done = !!(state.missions && state.missions[def.id]);
    var bonusLabel = Object.keys(def.bonus).map(function (k) {
      if (k === 'asset') return '재산 +' + manText(def.bonus[k]) + '원';
      return ({ hp: '체력', mental: '멘탈', charm: '매력', social: '호감도', intel: '역량', luck: '행운' }[k] || k) + ' +' + def.bonus[k];
    }).join(' · ');
    return {
      id: def.id,
      bandId: band.id,
      label: def.label,
      goal: goal,
      inDebt: inDebt,
      key: def.key,
      cur: cur,
      target: def.target,
      pct: done ? 100 : Math.round(pct),
      done: done,
      bonus: def.bonus,
      bonusLabel: bonusLabel,
      curText: def.key === 'asset' ? manText(cur) + '원' : String(Math.round(cur))
    };
  }

  /* 미션 달성 검사 — 새로 달성했을 때만 보너스를 주고 그 사실을 돌려준다.
     (같은 인생에서 같은 나이대 미션을 두 번 받지 않도록 state.missions 에 남긴다) */
  function checkMission(state) {
    if (!state || !state.stats) return null;
    if (!state.missions) state.missions = {};
    var m = mission(state);
    if (m.done || m.pct < 100) return null;
    state.missions[m.id] = { age: state.age, month: state.month, at: Date.now() };
    var applied = {};
    Object.keys(m.bonus).forEach(function (k) {
      var v = m.bonus[k];
      if (k === 'asset') {
        state.stats.asset = Math.round(num(state.stats.asset, 0) + v);
        applied.asset = v;
      } else {
        var before = num(state.stats[k], 50);
        state.stats[k] = clamp(before + v, 0, 100);
        var diff = Math.round(state.stats[k] - before);
        if (diff) applied[k] = diff;
      }
    });
    return { id: m.id, label: m.label, goal: m.goal, bonusLabel: m.bonusLabel, deltas: applied, bandName: bandById(m.bandId).name };
  }

  /* ── 말풍선 ── */
  var BAND_LINES = {
    baby: ['응애… 우유가 제일 좋아', '오늘도 엄마 품이 최고야', '한 걸음만 더 걸어 볼까'],
    child: ['밖에서 뛰어놀고 싶다!', '내일은 받아쓰기 시험이다', '급식에 오늘 뭐 나오지'],
    teen: ['시험이 끝나면 다 끝날 줄 알았는데', '한 턴만 더 버티자', '꿈은 아직 안 접었어'],
    youth: ['첫 자취, 설레면서도 무섭다', '인생은 아직 초반전', '지금이 제일 자유로운 때'],
    adult: ['월급날만 기다린다…', '일이 많아도 버틸 만해', '이번 달은 저축 좀 해 볼까'],
    midlife: ['몸이 예전 같지 않네', '아이들 얼굴 보면 다 용서가 된다', '이제는 나를 챙길 때'],
    senior: ['천천히, 한 걸음씩', '돌아보면 다 지나갔다', '오늘 햇살이 참 좋구나']
  };

  /* ── 유아기 말투 ──
     유아기(1~7세)에 통장·멘탈·거울 같은 어른 말이 뜨면 표정과 말이 따로 논다.
     같은 상태 신호를 아이 눈높이의 한 줄로 바꿔 말한다(문구 선택 규칙은 그대로). */
  var BABY_SAY = {
    hp: '기운이 없어… 엄마 품에만 있고 싶어',
    mental: '칭얼칭얼, 오늘은 자꾸 울고 싶어',
    assetNeg: '통장은 아직 몰라… 손에 쥔 동전이 반짝반짝',
    mentalHigh: '오늘 기분 최고! 하루 종일 웃을래',
    assetHigh: '내 통장이 두둑하다는데… 그거 먹는 거야?',
    charmHigh: '거울 속 아기가 나한테 웃어',
    intelHigh: '오늘 처음 본 것도 다 외웠어',
    luckHigh: '손에 잡히는 게 다 잘 돼',
    luckLow: '오늘은 자꾸 머리를 부딪혀…',
    done: ['해냈어! 엄마가 박수 쳐 줬어', '오늘 목표 하나 클리어!', '뿌듯해, 한 번 더!'],
    up: ['방금 그거 좋았어, 한 번 더!', '이 느낌, 기분 좋아', '오늘은 뭔가 잘 풀려'],
    down: ['아야… 방금 그거 싫었어', '방금 그건 자꾸 생각나', '이번엔 내가 손해 봤어']
  };

  function speech(state, opts) {
    opts = opts || {};
    var st = (state && state.stats) || {};
    var hp = num(st.hp, 50), mental = num(st.mental, 50), asset = num(st.asset, 0);
    var charm = num(st.charm, 50), intel = num(st.intel, 50), luck = num(st.luck, 50);
    var band = bandOf((state && state.age) || 1);
    var baby = band.id === 'baby';
    var pickIdx = function (arr) {
      var t = num(state && state.turn, 0) + num(state && state.age, 1) + num(state && state.month, 1);
      return arr[t % arr.length];
    };

    // 방금 미션을 깼다 — 가장 먼저 자랑한다
    if (opts.justDone) {
      return baby ? pickIdx(BABY_SAY.done) : pickIdx(['미션 달성! 기분 좋다', '해냈다, 이 맛에 사는 거지', '목표 하나 클리어! 다음 거 가자']);
    }
    if (hp < 35) return baby ? BABY_SAY.hp : '체력 좀 챙겨야겠다…';
    if (mental < 35) return baby ? BABY_SAY.mental : '멘탈이 흔들린다, 심호흡 한 번';
    if (asset < 0) return baby ? BABY_SAY.assetNeg : '통장이 얇아지고 있어...';
    if (mental >= 85) return baby ? BABY_SAY.mentalHigh : '멘탈 최고조!';
    if (asset >= 10000) return baby ? BABY_SAY.assetHigh : '재산이 불어나고 있다, 이 맛에 산다';
    if (charm >= 80) return baby ? BABY_SAY.charmHigh : '거울 속 내가 꽤 괜찮은데?';
    if (intel >= 85) return baby ? BABY_SAY.intelHigh : '머리가 잘 돌아간다, 이 정도면 프로';
    if (luck >= 82) return baby ? BABY_SAY.luckHigh : '되는 일이 술술 풀린다';
    if (luck <= 22) return baby ? BABY_SAY.luckLow : '요즘 되는 일이 없다… 부적이라도?';

    var last = state.current && state.current.chosen !== null && state.current.deltas;
    if (last) {
      var keys = Object.keys(last);
      var up = 0, down = 0;
      keys.forEach(function (k) {
        if (k === 'asset') { if (last[k] > 0) up += 4; else down += 4; return; }
        if (last[k] > 0) up += last[k]; else down += -last[k];
      });
      if (down >= 6 && up < down) return baby ? pickIdx(BABY_SAY.down) : pickIdx(['이건 좀 아팠다…', '방금 건 다시 생각난다', '몸이 기억한다, 이 손해']);
      if (up >= 6) return baby ? pickIdx(BABY_SAY.up) : pickIdx(['방금 그 선택, 제법이었어', '오, 이건 잘 골랐다', '이 느낌, 계속 가자']);
    }

    return pickIdx(BAND_LINES[band.id]);
  }

  global.LifeAvatar = {
    BANDS: BANDS,
    bandOf: bandOf,
    moodOf: moodOf,
    svg: svg,
    speech: speech,
    mission: mission,
    checkMission: checkMission,
    manText: manText
  };
})(typeof window !== 'undefined' ? window : globalThis);
