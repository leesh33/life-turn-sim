/* ─────────────────────────────────────────────
   sharecard.js — 엔딩 결과 카드 (1080×1350 PNG · 저장 / 공유)
   「인생 한 턴」
   ─────────────────────────────────────────────
   80세 엔딩·졸업 엔딩 화면에서 `📸 결과 카드 저장 / 공유` 를 누르면
   지금 인생을 한 장으로 그려 PNG 로 내려받거나(모바일) 공유 시트로 넘긴다.

   · 그림은 HTML5 <canvas> 에 직접 그린다 (외부 라이브러리·이미지 요청 0).
   · 크기는 1080×1350 (4:5). 화면 배율과 무관하게 항상 같은 픽셀이라
     어느 기기에서 저장해도 같은 파일이 나온다.
   · model(state) 는 그림과 분리된 순수 함수 — 테스트(node)가 그대로 쓴다.
   · navigator.share({files}) 를 지원하면 공유 시트, 아니면 저장으로 떨어진다.
   ───────────────────────────────────────────── */
(function (global) {
  'use strict';

  var W = 1080;
  var H = 1350;
  var PAD = 76;
  var FONT = '"Noto Sans CJK KR", "Apple SD Gothic Neo", -apple-system, BlinkMacSystemFont, system-ui, "Malgun Gothic", sans-serif';
  var BRAND = '인생 한 턴';
  var URL_TEXT = 'life-turn-sim.vercel.app';

  var C = {
    paper1: '#FDF9F2',
    paper2: '#F2E8DA',
    ink: '#2A2622',
    ink2: '#5C5248',
    ink3: '#8A7E71',
    line: '#DCCFBE',
    accent: '#D4552C',
    accentSoft: '#F6E3D8',
    gold: '#C9A227'
  };

  function h(v) { return String(v == null ? '' : v); }
  function font(size, weight) { return (weight || 600) + ' ' + size + 'px ' + FONT; }

  /* ── 카드에 들어갈 내용 (순수 함수) ──
     엔딩 화면과 똑같은 summary 를 쓰되, 카드에 필요한 것만 추린다. */
  function model(state) {
    if (!state) return null;
    var Life = global.Life;
    var sum = Life ? Life.summary(state) : null;
    var isGrad = !!(state.ended && state.endingKind === 'graduation' && state.grad);
    var grad = isGrad && Life ? Life.gradInfo(state) : null;

    var title = grad ? grad.title : (sum ? sum.title : '');
    var archetype = sum && sum.archetype ? { emoji: sum.archetype.emoji, label: sum.archetype.label } : null;
    // 제목이 이미 그 얼굴을 말하고 있으면(예: '… 아이들 키우다 내 이름을 잊은 사람') 한 번만 적는다
    if (archetype && title.indexOf(archetype.label) !== -1) archetype = null;
    var kicker = grad ? (grad.def ? grad.def.short : '졸업') : (state.ended ? '80세 완주' : '여기까지의 인생');
    var grade = grad ? grad.grade : (sum ? sum.grade : 'B');
    var gradeLabel = grad ? grad.gradeLabel : (sum ? sum.gradeLabel : '');
    var score = grad ? Math.round(grad.score) : (sum ? sum.score : 0);
    var finalAge = grad ? grad.age : (sum ? sum.finalAge : state.age);
    var stats = grad ? grad.stats : (sum ? sum.stats : state.stats);

    var rows = [];
    (Life ? Life.STATS : []).forEach(function (st) {
      var v = stats ? stats[st.key] : 0;
      rows.push({
        key: st.key,
        label: st.label,
        text: st.key === 'asset' ? (Life ? Life.formatAsset(v) : String(v)) : String(Math.round(v)),
        pct: Life ? Life.statPct(st.key, v) : 0
      });
    });
    var assetRow = null;
    rows = rows.filter(function (r) { if (r.key === 'asset') { assetRow = r; return false; } return true; });

    var generation = state.generation || 1;
    var scenario = Life && Life.scenarioBrief ? Life.scenarioBrief(state.scenario) : null;

    return {
      name: h(state.name || '이름 없음'),
      generation: generation,
      generationLabel: generation > 1 ? generation + '대' : '',
      scenario: scenario,
      kicker: kicker,
      title: title,
      archetype: archetype,
      grade: grade,
      gradeLabel: gradeLabel,
      score: score,
      finalAge: finalAge,
      turns: sum ? sum.turns : (state.history ? state.history.length : 0),
      stats: rows,
      asset: assetRow,
      titles: runTitles(state).slice(0, 3),
      tags: (sum && sum.tags ? sum.tags : []).slice(0, 4),
      note: familyNote(state),
      brand: BRAND,
      url: URL_TEXT
    };
  }

  /* 이번 인생에서 딴 칭호 — 도감 기록에 남은 '이 판'(createdAt) 것만, 최대 3개 */
  function runTitles(state) {
    var T = global.TitleBook;
    if (!T || !Array.isArray(T.LIST)) return [];
    var owned = T.owned ? T.owned() : {};
    var created = state && state.createdAt;
    var out = [];
    T.LIST.forEach(function (t) {
      var rec = owned[t.id];
      if (!rec) return;
      if (created) {
        if (rec.run === undefined || rec.run === null) return;   // 예전 기록은 이 판 것이 아니다
        if (rec.run !== created) return;
      } else if (state && rec.name !== state.name) {
        return;
      }
      out.push({ id: t.id, emoji: t.emoji, name: t.name });
    });
    return out;
  }

  /* 가문·인연 한 줄 — 카드 아래쪽에 작게 */
  function familyNote(state) {
    var Life = global.Life;
    var legacy = state && state.legacy;
    var cameo = Life && Life.cameoSummary ? Life.cameoSummary(state) : null;
    var bits = [];
    if (legacy && legacy.family) bits.push(legacy.family);
    if (cameo && cameo.rel && cameo.rel !== 'none') {
      bits.push('이전 회차의 인연 — ' + cameo.name + ' · ' + (cameo.relLabel || ''));
    }
    return bits.length ? bits.join('   ·   ') : '';
  }

  function filename(state) {
    var name = h(state && state.name).replace(/[\\/:*?"<>|\s]+/g, '') || '인생';
    var age = state && state.ended ? Math.min(state.age, 80) : (state ? state.age : 0);
    return '인생한턴_' + name + '_' + age + '세.png';
  }

  /* ── 그리기 ── */
  function rr(ctx, x, y, w, hh, r) {
    var rad = Math.min(r, w / 2, hh / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.arcTo(x + w, y, x + w, y + rad, rad);
    ctx.lineTo(x + w, y + hh - rad);
    ctx.arcTo(x + w, y + hh, x + w - rad, y + hh, rad);
    ctx.lineTo(x + rad, y + hh);
    ctx.arcTo(x, y + hh, x, y + hh - rad, rad);
    ctx.lineTo(x, y + rad);
    ctx.arcTo(x, y, x + rad, y, rad);
    ctx.closePath();
  }

  // 한글은 띄어쓰기 단위로 끊는다 — 넘치면 말줄임
  function wrap(ctx, text, maxWidth, maxLines) {
    var words = h(text).split(' ');
    var lines = [];
    var cur = '';
    for (var i = 0; i < words.length; i++) {
      var next = cur ? cur + ' ' + words[i] : words[i];
      if (ctx.measureText(next).width <= maxWidth || !cur) {
        cur = next;
      } else {
        lines.push(cur);
        cur = words[i];
        if (lines.length === maxLines) break;
      }
    }
    if (cur && lines.length < maxLines) lines.push(cur);
    if (lines.length === maxLines) {
      // 마지막 줄이 넘쳤으면 말줄임
      var last = lines[maxLines - 1];
      while (last.length > 1 && ctx.measureText(last + '…').width > maxWidth) last = last.slice(0, -1);
      if (last !== lines[maxLines - 1]) lines[maxLines - 1] = last + '…';
    }
    return lines;
  }

  function draw(ctx, m) {
    if (!ctx || !m) return;
    // 배경 — 종이 느낌의 세로 그라데이션 + 은은한 원
    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, C.paper1);
    bg.addColorStop(1, C.paper2);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.globalAlpha = 0.5;
    var glow = ctx.createRadialGradient(W - 120, 80, 10, W - 120, 80, 420);
    glow.addColorStop(0, 'rgba(255, 186, 140, 0.55)');
    glow.addColorStop(1, 'rgba(255, 186, 140, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, 640);
    ctx.restore();

    ctx.textBaseline = 'alphabetic';

    /* 1) 머리 — 종류 칩 + 대수 */
    var chipY = 76;
    ctx.font = font(28, 700);
    var chipText = m.kicker;
    var chipW = ctx.measureText(chipText).width + 56;
    ctx.fillStyle = C.ink;
    rr(ctx, PAD, chipY, chipW, 58, 29);
    ctx.fill();
    ctx.fillStyle = '#FFF9F2';
    ctx.fillText(chipText, PAD + 28, chipY + 39);

    if (m.generationLabel) {
      ctx.font = font(28, 700);
      var gW = ctx.measureText(m.generationLabel).width + 48;
      var gx = PAD + chipW + 12;          // 종류 칩 바로 옆 (오른쪽 등급 배지와 겹치지 않게)
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 2.5;
      rr(ctx, gx, chipY, gW, 58, 29);
      ctx.stroke();
      ctx.fillStyle = C.accent;
      ctx.fillText(m.generationLabel, gx + 24, chipY + 39);
    }

    /* 2) 이름 + 등급 */
    var y = 252;
    ctx.fillStyle = C.ink;
    ctx.font = font(92, 800);
    var nameText = m.name;
    while (ctx.measureText(nameText).width > W - PAD * 2 - 220 && nameText.length > 1) {
      nameText = nameText.slice(0, -1);
    }
    ctx.fillText(nameText, PAD, y);

    // 등급 배지 (오른쪽 위 원)
    var gradeR = 84;
    var gcx = W - PAD - gradeR;
    var gcy = y - 44;
    ctx.beginPath();
    ctx.arc(gcx, gcy, gradeR, 0, Math.PI * 2);
    ctx.fillStyle = C.accentSoft;
    ctx.fill();
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = C.accent;
    ctx.font = font(76, 800);
    ctx.textAlign = 'center';
    ctx.fillText(m.grade, gcx, gcy + 22);
    ctx.font = font(24, 700);
    ctx.fillStyle = C.ink2;
    ctx.fillText('총점 ' + m.score, gcx, gcy + 62);
    ctx.textAlign = 'left';

    /* 3) 시나리오 · 나이 */
    var subBits = [];
    if (m.scenario) subBits.push(m.scenario.emoji + ' ' + m.scenario.name);
    subBits.push(m.finalAge + '세');
    if (m.turns) subBits.push('선택 ' + m.turns + '개');
    ctx.font = font(30, 600);
    ctx.fillStyle = C.ink3;
    ctx.fillText(subBits.join('  ·  '), PAD, y + 56);

    // 구분선
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PAD, y + 92);
    ctx.lineTo(W - PAD, y + 92);
    ctx.stroke();

    /* 4) 얼굴(아키타입) + 칭호 문장 */
    y += 152;
    if (m.archetype) {
      ctx.font = font(36, 700);
      ctx.fillStyle = C.ink2;
      var arch = m.archetype.emoji + ' ' + m.archetype.label;
      ctx.fillText(arch, PAD, y);
      y += 54;
    }
    ctx.font = font(52, 800);
    ctx.fillStyle = C.ink;
    var titleLines = wrap(ctx, m.title, W - PAD * 2, 2);
    titleLines.forEach(function (line, i) {
      ctx.fillText(line, PAD, y + i * 58);
    });
    y += titleLines.length * 58 + 26;

    /* 5) 능력치 — 2열 3행 막대 */
    var colW = (W - PAD * 2 - 40) / 2;
    var rowH = 130;
    m.stats.forEach(function (row, i) {
      var cx = PAD + (i % 2) * (colW + 40);
      var cy = y + Math.floor(i / 2) * rowH;
      ctx.font = font(27, 600);
      ctx.fillStyle = C.ink3;
      ctx.fillText(row.label, cx, cy + 24);
      ctx.font = font(40, 800);
      ctx.fillStyle = C.ink;
      ctx.textAlign = 'right';
      ctx.fillText(row.text, cx + colW, cy + 28);
      ctx.textAlign = 'left';
      // 막대
      rr(ctx, cx, cy + 48, colW, 13, 7);
      ctx.fillStyle = 'rgba(0,0,0,0.07)';
      ctx.fill();
      var pct = Math.max(2, Math.min(100, row.pct || 0));
      rr(ctx, cx, cy + 48, colW * (pct / 100), 13, 7);
      ctx.fillStyle = C.accent;
      ctx.fill();
    });
    y += Math.ceil(m.stats.length / 2) * rowH + 4;

    /* 6) 재산 — 한 줄 강조 */
    if (m.asset) {
      rr(ctx, PAD, y, W - PAD * 2, 106, 24);
      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = 0.72;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.font = font(27, 600);
      ctx.fillStyle = C.ink3;
      ctx.fillText('남은 재산', PAD + 32, y + 42);
      ctx.font = font(52, 800);
      ctx.fillStyle = m.asset.text.indexOf('-') === 0 ? '#B4432F' : C.ink;
      ctx.textAlign = 'right';
      ctx.fillText(m.asset.text, W - PAD - 32, y + 60);
      ctx.textAlign = 'left';
      y += 106 + 30;
    }

    /* 7) 칭호 (최대 3개) — 칭호가 없는 인생은 남긴 것들로 그 자리를 채운다 */
    if (!m.titles.length && m.tags && m.tags.length) {
      ctx.font = font(27, 600);
      ctx.fillStyle = C.ink3;
      var tagLine = wrap(ctx, '남긴 것들 — ' + m.tags.join(' · '), W - PAD * 2, 1)[0] || '';
      ctx.fillText(tagLine, PAD, y + 6);
      y += 44;
    }
    if (m.titles.length) {
      ctx.font = font(26, 700);
      var tx = PAD;
      var ty = y;
      m.titles.forEach(function (t) {
        var label = t.emoji + ' ' + t.name;
        var tw = ctx.measureText(label).width + 40;
        if (tx + tw > W - PAD && tx > PAD) { tx = PAD; ty += 56; }
        rr(ctx, tx, ty, tw, 46, 23);
        ctx.fillStyle = C.ink;
        ctx.globalAlpha = 0.9;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#FFF9F2';
        ctx.fillText(label, tx + 20, ty + 32);
        tx += tw + 12;
      });
      y = ty + 74;
    }

    /* 8) 가문·인연 한 줄 */
    if (m.note) {
      ctx.font = font(27, 600);
      ctx.fillStyle = C.ink2;
      var noteLine = wrap(ctx, m.note, W - PAD * 2, 1)[0] || '';
      ctx.fillText(noteLine, PAD, y + 16);
      y += 52;
    }

    /* 9) 바닥 — 브랜드 */
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PAD, H - 150);
    ctx.lineTo(W - PAD, H - 150);
    ctx.stroke();

    ctx.font = font(30, 800);
    ctx.fillStyle = C.ink;
    ctx.fillText('🎲 ' + m.brand, PAD, H - 92);
    ctx.font = font(26, 600);
    ctx.fillStyle = C.ink3;
    ctx.textAlign = 'right';
    ctx.fillText(m.url, W - PAD, H - 92);
    ctx.textAlign = 'left';
    ctx.font = font(24, 600);
    ctx.fillStyle = C.ink3;
    ctx.fillText('한 달에 한 번, 인생을 한 칸씩', PAD, H - 52);
  }

  /* ── canvas 생성 ── */
  function available() {
    try { return !!(global.document && global.document.createElement('canvas')); } catch (e) { return false; }
  }

  function render(state, opts) {
    if (!available()) return null;
    opts = opts || {};
    var w = opts.width || W;
    var hh = opts.height || H;
    var canvas = global.document.createElement('canvas');
    canvas.width = w;
    canvas.height = hh;
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;
    if (w !== W || hh !== H) {
      ctx.save();
      ctx.scale(w / W, hh / H);
    }
    draw(ctx, model(state) || opts.model);
    if (w !== W || hh !== H) ctx.restore();
    return canvas;
  }

  function toBlob(state) {
    return new Promise(function (resolve) {
      var canvas = render(state);
      if (!canvas || !canvas.toBlob) { resolve(null); return; }
      try {
        canvas.toBlob(function (blob) { resolve(blob || null); }, 'image/png');
      } catch (e) { resolve(null); }
    });
  }

  function dataUrl(state) {
    var canvas = render(state);
    if (!canvas || !canvas.toDataURL) return '';
    try { return canvas.toDataURL('image/png'); } catch (e) { return ''; }
  }

  function saveBlob(blob, name) {
    if (!blob || !global.document) return false;
    try {
      var url = global.URL.createObjectURL(blob);
      var a = global.document.createElement('a');
      a.href = url;
      a.download = name || '인생한턴.png';
      a.rel = 'noopener';
      global.document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        try { global.URL.revokeObjectURL(url); } catch (e) {}
        if (a.parentNode) a.parentNode.removeChild(a);
      }, 2000);
      return true;
    } catch (e) { return false; }
  }

  // 저장 — PNG 파일로 내려받는다
  function download(state) {
    return toBlob(state).then(function (blob) {
      var ok = saveBlob(blob, filename(state));
      return { ok: ok, mode: 'download', blob: blob };
    });
  }

  function canShareFiles() {
    try {
      if (!global.navigator || typeof global.navigator.share !== 'function') return false;
      if (typeof global.navigator.canShare !== 'function') return false;
      if (typeof global.File !== 'function') return false;
      return global.navigator.canShare({ files: [new global.File([new Blob(['x'])], 'x.png', { type: 'image/png' })] });
    } catch (e) { return false; }
  }

  // 공유 — 모바일이면 공유 시트, 아니면 저장으로
  function share(state) {
    var name = filename(state);
    return toBlob(state).then(function (blob) {
      if (!blob) return { ok: false, mode: 'none' };
      if (canShareFiles()) {
        try {
          var file = new global.File([blob], name, { type: 'image/png' });
          return global.navigator.share({
            files: [file],
            title: '인생 한 턴 — ' + h(state && state.name),
            text: '「인생 한 턴」에서 산 인생 한 번. ' + URL_TEXT
          }).then(function () {
            return { ok: true, mode: 'share' };
          }).catch(function (err) {
            // 사용자가 취소한 경우까지 저장으로 떨어뜨리지는 않는다
            var canceled = err && (err.name === 'AbortError' || err.name === 'NotAllowedError');
            if (canceled) return { ok: false, mode: 'cancel' };
            return download(state).then(function () { return { ok: true, mode: 'download' }; });
          });
        } catch (e) { /* 아래 저장으로 */ }
      }
      return download(state).then(function (r) { return { ok: r.ok, mode: 'download' }; });
    });
  }

  global.ShareCard = {
    W: W,
    H: H,
    model: model,
    runTitles: runTitles,
    familyNote: familyNote,
    filename: filename,
    draw: draw,
    render: render,
    toBlob: toBlob,
    dataUrl: dataUrl,
    download: download,
    share: share,
    canShareFiles: canShareFiles,
    available: available
  };
  if (typeof globalThis !== 'undefined') globalThis.ShareCard = global.ShareCard;
})(typeof window !== 'undefined' ? window : globalThis);
