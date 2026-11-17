/* ─────────────────────────────────────────────
   feedback.js — 💬 제안·제보 게시판
   · 이벤트 제안(idea) / 버그·오타 제보(bug)
   · Supabase(rest/v1) + anon(publishable) 키 · RLS
   · 로그인 없이 바로 쓰기, 공감(👍)은 기기별 1회
   ───────────────────────────────────────────── */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://zdcdvjlssncsawpqsjwe.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_pLkbspw3eIAOO41uVSr-tA_9Asecqzq';
  var TABLE = 'life_sim_feedback';

  var LIKES_KEY = 'lifeTurnSim.feedback.likes.v1';
  var POSTS_KEY = 'lifeTurnSim.feedback.posts.v1';

  var AGE_GROUPS = ['1~7세', '8~13세', '14~19세', '20~24세', '25~34세', '35세~', '전체'];

  var STATUS = {
    open: { label: '접수됨', cls: 'open' },
    applied: { label: '반영됨', cls: 'applied' },
    fixed: { label: '수정됨', cls: 'fixed' }
  };

  var MIN_GAP_MS = 20 * 1000;   // 연속 도배 방지: 20초에 1건
  var DAILY_LIMIT = 5;          // 하루 5건까지
  var TITLE_MAX = 40;
  var CONTENT_MAX = 600;
  var AUTHOR_MAX = 12;

  var st = {
    tab: 'idea',
    sort: 'new',
    cache: {},          // 'idea|new' -> { at, items }
    items: [],
    loading: false,
    error: '',
    composing: false,
    ctx: null,          // { name, age, month, eventTitle, screen }
    ageGroup: '전체',
    open: false
  };

  function $(id) { return document.getElementById(id); }
  function h(v) { return String(v == null ? '' : v); }
  function esc(v) {
    return h(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ── 저장소 ── */
  function readJson(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      var v = JSON.parse(raw);
      return v == null ? fallback : v;
    } catch (e) { return fallback; }
  }
  function writeJson(key, value) {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* 사파리 프라이빗 모드 등 */ }
  }

  function likedMap() { var m = readJson(LIKES_KEY, {}); return (m && typeof m === 'object') ? m : {}; }
  function hasLiked(id) { return !!likedMap()[id]; }
  function markLiked(id) { var m = likedMap(); m[id] = 1; writeJson(LIKES_KEY, m); }

  function postLog() {
    var v = readJson(POSTS_KEY, {});
    var times = Array.isArray(v.times) ? v.times : [];
    var last = typeof v.last === 'string' ? v.last : '';
    return { times: times, last: last };
  }
  function recordPost(fingerprint) {
    var now = Date.now();
    var log = postLog();
    var dayAgo = now - 24 * 3600 * 1000;
    log.times = log.times.filter(function (t) { return t > dayAgo; }).concat([now]);
    log.last = fingerprint;
    writeJson(POSTS_KEY, log);
  }

  /* ── 서버 ── */
  function headers(extra) {
    var base = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + SUPABASE_ANON_KEY
    };
    if (extra) Object.keys(extra).forEach(function (k) { base[k] = extra[k]; });
    return base;
  }

  function apiFetch(path, opts) {
    var url = SUPABASE_URL + '/rest/v1/' + path;
    var conf = {
      method: (opts && opts.method) || 'GET',
      headers: headers(opts && opts.headers),
      cache: 'no-store'
    };
    if (opts && opts.body !== undefined) conf.body = JSON.stringify(opts.body);
    return fetch(url, conf).then(function (res) {
      return res.text().then(function (text) {
        var data = null;
        try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
        if (!res.ok) {
          var msg = (data && (data.message || data.hint || data.error)) || ('HTTP ' + res.status);
          var err = new Error(msg);
          err.status = res.status;
          err.data = data;
          throw err;
        }
        return data;
      });
    });
  }

  function listPath() {
    var order = st.sort === 'like' ? 'likes.desc,created_at.desc' : 'created_at.desc';
    return TABLE + '?select=id,kind,age_group,title,content,author,likes,status,player_age,player_month,created_at' +
      '&kind=eq.' + encodeURIComponent(st.tab) +
      '&order=' + encodeURIComponent(order) +
      '&limit=60';
  }

  /* ── 문구 ── */
  function tabInfo() {
    return st.tab === 'bug'
      ? {
        title: '🐛 버그·오타 제보',
        caption: '이상한 문장·멈춘 화면을 알려 주세요',
        formTitle: '🐛 버그·오타 제보',
        headLabel: '발생 위치·나이',
        headPlaceholder: '예: 8세 · 3개월차 · 「전학 첫날」',
        bodyLabel: '어떤 문제였나요?',
        bodyPlaceholder: '예: 세 번째 선택지를 누르면 화면이 멈춰요. "전학"이 "전확"으로 나와요.',
        submit: '제보 보내기',
        empty: '아직 제보가 없어요. 발견한 문제를 가장 먼저 알려 주세요!'
      }
      : {
        title: '💡 이벤트 제안',
        caption: '이런 상황·선택지가 있으면 좋겠다 싶은 걸 들려주세요',
        formTitle: '💡 이벤트 제안',
        headLabel: '제목',
        headPlaceholder: '예: 첫 자취방 구하기',
        bodyLabel: '상황·선택지 아이디어',
        bodyPlaceholder: '예: 22세, 원룸 계약 앞에서 보증금·월세·거리 중 무엇을 우선할지 고르는 이벤트',
        submit: '제안 보내기',
        empty: '아직 제안이 없어요. 첫 번째 아이디어를 남겨 주세요!'
      };
  }

  /* ── 나이 → 나이대 ── */
  function ageGroupOf(age) {
    if (typeof age !== 'number' || !isFinite(age)) return '전체';
    if (age <= 7) return '1~7세';
    if (age <= 13) return '8~13세';
    if (age <= 19) return '14~19세';
    if (age <= 24) return '20~24세';
    if (age <= 34) return '25~34세';
    return '35세~';
  }

  /* ── 시간 표기 ── */
  function whenText(iso) {
    var t = Date.parse(iso);
    if (!t) return '';
    var diff = Date.now() - t;
    if (diff < 0) diff = 0;
    if (diff < 60 * 1000) return '방금 전';
    if (diff < 60 * 60 * 1000) return Math.floor(diff / 60000) + '분 전';
    if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / 3600000) + '시간 전';
    if (diff < 7 * 24 * 60 * 60 * 1000) return Math.floor(diff / 86400000) + '일 전';
    var d = new Date(t);
    return (d.getMonth() + 1) + '/' + d.getDate();
  }

  /* ── 토스트 ── */
  var toastTimer = null;
  function fbToast(msg) {
    var node = $('fbToast');
    if (!node) return;
    node.textContent = msg;
    node.hidden = false;
    node.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      node.classList.remove('show');
      setTimeout(function () { node.hidden = true; }, 240);
    }, 2000);
  }

  /* ── 목록 렌더 ── */
  function cardHtml(item) {
    var status = STATUS[item.status] || STATUS.open;
    var liked = hasLiked(item.id);
    var likes = Number(item.likes) || 0;
    var ageText = (st.tab === 'idea' && item.age_group) ? item.age_group : '';
    var where = (st.tab === 'bug' && item.player_age) ? (item.player_age + '세') : '';
    return '' +
      '<article class="fb-card" data-id="' + esc(item.id) + '">' +
        '<div class="fb-card-top">' +
          '<span class="fb-badge ' + status.cls + '">' + status.label + '</span>' +
          (ageText ? '<span class="fb-chipage">' + esc(ageText) + '</span>' : '') +
          (where ? '<span class="fb-chipage">' + esc(where) + '</span>' : '') +
          '<span class="fb-when">' + esc(whenText(item.created_at)) + '</span>' +
        '</div>' +
        '<h4 class="fb-card-title">' + esc(item.title) + '</h4>' +
        '<p class="fb-card-text">' + esc(item.content).replace(/\n/g, '<br>') + '</p>' +
        '<div class="fb-card-foot">' +
          '<span class="fb-author">' + esc(item.author || '익명') + '</span>' +
          '<button type="button" class="fb-like' + (liked ? ' liked' : '') + '" data-like="' + esc(item.id) + '"' +
            (liked ? ' aria-pressed="true"' : ' aria-pressed="false"') + '>' +
            '👍 공감 <b>' + likes + '</b>' +
          '</button>' +
        '</div>' +
      '</article>';
  }

  function renderList() {
    var box = $('fbList');
    if (!box) return;
    if (st.loading) {
      box.innerHTML = '<div class="fb-state"><span class="fb-spin"></span>불러오는 중…</div>';
      return;
    }
    if (st.error) {
      box.innerHTML = '<div class="fb-state fb-state-error">' +
        '<p>' + esc(st.error) + '</p>' +
        '<button type="button" class="fb-retry" id="fbRetry">다시 불러오기</button>' +
        '</div>';
      var retry = $('fbRetry');
      if (retry) retry.addEventListener('click', function () { loadList(true); });
      return;
    }
    if (!st.items.length) {
      box.innerHTML = '<div class="fb-state">' + esc(tabInfo().empty) + '</div>';
      return;
    }
    box.innerHTML = st.items.map(cardHtml).join('');
  }

  function renderTabs() {
    var idea = $('fbTabIdea');
    var bug = $('fbTabBug');
    if (idea) {
      idea.classList.toggle('active', st.tab === 'idea');
      idea.setAttribute('aria-selected', st.tab === 'idea' ? 'true' : 'false');
    }
    if (bug) {
      bug.classList.toggle('active', st.tab === 'bug');
      bug.setAttribute('aria-selected', st.tab === 'bug' ? 'true' : 'false');
    }
    var cap = $('fbCaption');
    if (cap) cap.textContent = tabInfo().caption;
  }

  function renderSort() {
    var box = $('fbSort');
    if (!box) return;
    Array.prototype.forEach.call(box.querySelectorAll('.fb-sort-btn'), function (b) {
      b.classList.toggle('active', b.dataset.sort === st.sort);
    });
  }

  /* ── 목록 불러오기 ── */
  function loadList(force) {
    var key = st.tab + '|' + st.sort;
    var cached = st.cache[key];
    if (!force && cached && Date.now() - cached.at < 20000) {
      st.items = cached.items;
      st.loading = false;
      st.error = '';
      renderList();
      return;
    }
    st.loading = true;
    st.error = '';
    renderList();
    var tabAtRequest = st.tab;
    var sortAtRequest = st.sort;
    apiFetch(listPath()).then(function (rows) {
      if (st.tab !== tabAtRequest || st.sort !== sortAtRequest) return;
      var items = Array.isArray(rows) ? rows : [];
      st.items = items;
      st.cache[tabAtRequest + '|' + sortAtRequest] = { at: Date.now(), items: items };
      st.loading = false;
      st.error = '';
      renderList();
    }).catch(function (err) {
      if (st.tab !== tabAtRequest || st.sort !== sortAtRequest) return;
      st.loading = false;
      st.error = (!navigator.onLine)
        ? '인터넷에 연결되어 있지 않아 게시판을 불러오지 못했어요.'
        : '게시판을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.';
      renderList();
      if (window.console && console.warn) console.warn('[feedback] list', err && err.message);
    });
  }

  /* ── 공감 ── */
  function likeItem(id, btn) {
    if (hasLiked(id)) { fbToast('이미 공감한 글이에요'); return; }
    btn.disabled = true;
    apiFetch('rpc/increment_life_sim_feedback_like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { row_id: id }
    }).then(function (likes) {
      markLiked(id);
      var n = Number(likes);
      if (!isFinite(n)) {
        var found = st.items.filter(function (it) { return it.id === id; })[0];
        n = (found ? Number(found.likes) || 0 : 0) + 1;
      }
      var item = st.items.filter(function (it) { return it.id === id; })[0];
      if (item) item.likes = n;
      btn.classList.add('liked');
      btn.setAttribute('aria-pressed', 'true');
      btn.innerHTML = '👍 공감 <b>' + n + '</b>';
      btn.disabled = true;
      fbToast('공감했어요 · 고마워요!');
    }).catch(function (err) {
      btn.disabled = false;
      fbToast('공감을 남기지 못했어요. 잠시 후 다시 시도해 주세요');
      if (window.console && console.warn) console.warn('[feedback] like', err && err.message);
    });
  }

  /* ── 작성 폼 ── */
  function currentCtx() {
    var ctx = st.ctx || {};
    return {
      name: ctx.name || '익명',
      age: typeof ctx.age === 'number' ? ctx.age : null,
      month: typeof ctx.month === 'number' ? ctx.month : null,
      eventTitle: ctx.eventTitle || '',
      screen: ctx.screen || 'start'
    };
  }

  function locationText() {
    var c = currentCtx();
    if (c.age == null) return c.screen === 'start' ? '시작 화면' : '';
    var parts = [c.age + '세', (c.month || 1) + '개월차'];
    if (c.eventTitle) parts.push('「' + c.eventTitle + '」');
    return parts.join(' · ');
  }

  function openForm() {
    st.composing = true;
    var info = tabInfo();
    var form = $('fbForm');
    if (!form) return;

    // 나이대 (제안 탭)
    var c = currentCtx();
    st.ageGroup = ageGroupOf(c.age);
    if (AGE_GROUPS.indexOf(st.ageGroup) < 0) st.ageGroup = '전체';
    renderAgeChips();

    $('fbFormTitle').textContent = info.formTitle;
    $('fbHeadLabel').textContent = info.headLabel;
    var head = $('fbHead');
    head.maxLength = TITLE_MAX;
    head.placeholder = info.headPlaceholder;
    head.value = st.tab === 'bug' ? locationText() : '';
    $('fbBodyLabel').textContent = info.bodyLabel;
    var body = $('fbContent');
    body.maxLength = CONTENT_MAX;
    body.placeholder = info.bodyPlaceholder;
    body.value = '';
    var author = $('fbAuthor');
    author.maxLength = AUTHOR_MAX;
    author.value = (c.name && c.name !== '익명') ? c.name : '';
    $('fbSubmit').textContent = info.submit;
    $('fbError').hidden = true;
    $('fbError').textContent = '';
    updateCounts();

    form.dataset.tab = st.tab;
    form.hidden = false;
    // 제안 탭에서만 나이대 칩 노출
    $('fbAgeField').hidden = st.tab !== 'idea';
    setTimeout(function () {
      if (st.tab === 'bug') {
        // 위치·나이는 자동으로 채워 두고, 바로 내용을 적게 한다.
        var content = $('fbContent');
        if (content) content.focus();
      } else {
        var title = $('fbHead');
        if (title) { try { title.focus(); } catch (e) {} }
      }
    }, 60);
  }

  function closeForm() {
    st.composing = false;
    var form = $('fbForm');
    if (form) form.hidden = true;
  }

  function renderAgeChips() {
    var box = $('fbAgeChips');
    if (!box) return;
    box.innerHTML = AGE_GROUPS.map(function (g) {
      return '<button type="button" class="fb-chip' + (g === st.ageGroup ? ' active' : '') + '" data-age="' + esc(g) + '">' + esc(g) + '</button>';
    }).join('');
  }

  function updateCounts() {
    var title = $('fbHead');
    var body = $('fbContent');
    var tc = $('fbHeadCount');
    var bc = $('fbContentCount');
    if (tc && title) tc.textContent = title.value.length + '/' + TITLE_MAX;
    if (bc && body) bc.textContent = body.value.length + '/' + CONTENT_MAX;
  }

  function showFormError(msg) {
    var el = $('fbError');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
  }

  function validate(title, content, author) {
    if (title.length < 2) return st.tab === 'bug' ? '발생 위치·나이를 2자 이상 적어 주세요.' : '제목을 2자 이상 적어 주세요.';
    if (title.length > TITLE_MAX) return '제목은 ' + TITLE_MAX + '자까지 쓸 수 있어요.';
    if (content.length < 5) return st.tab === 'bug' ? '어떤 문제였는지 5자 이상 적어 주세요.' : '상황·선택지를 5자 이상 적어 주세요.';
    if (content.length > CONTENT_MAX) return '내용은 ' + CONTENT_MAX + '자까지 쓸 수 있어요.';
    if (author.length < 1) return '닉네임을 적어 주세요. (익명도 괜찮아요)';
    if (author.length > AUTHOR_MAX) return '닉네임은 ' + AUTHOR_MAX + '자까지 쓸 수 있어요.';

    var log = postLog();
    var now = Date.now();
    if (log.times.length && now - log.times[log.times.length - 1] < MIN_GAP_MS) {
      var wait = Math.ceil((MIN_GAP_MS - (now - log.times[log.times.length - 1])) / 1000);
      return '연속으로 올릴 수 없어요. ' + wait + '초 뒤에 다시 시도해 주세요.';
    }
    var dayAgo = now - 24 * 3600 * 1000;
    var todayCount = log.times.filter(function (t) { return t > dayAgo; }).length;
    if (todayCount >= DAILY_LIMIT) return '하루에 ' + DAILY_LIMIT + '건까지 올릴 수 있어요. 내일 다시 만나요!';
    var fingerprint = (st.tab + '|' + title + '|' + content).slice(0, 400);
    if (log.last === fingerprint) return '방금 같은 글을 올렸어요.';
    return '';
  }

  function submitForm() {
    var title = $('fbHead').value.trim();
    var content = $('fbContent').value.trim();
    var authorRaw = $('fbAuthor').value.trim();
    var author = authorRaw || '익명';

    title = title.replace(/\s+/g, ' ');

    var problem = validate(title, content, author);
    if (problem) { showFormError(problem); return; }

    var c = currentCtx();
    var payload = {
      kind: st.tab,
      age_group: st.tab === 'idea' ? st.ageGroup : ageGroupOf(c.age),
      title: title.slice(0, TITLE_MAX),
      content: content.slice(0, CONTENT_MAX),
      author: author.slice(0, AUTHOR_MAX)
    };
    if (st.tab === 'bug' && c.age != null) {
      payload.player_age = c.age;
      payload.player_month = c.month || 1;
    }

    var btn = $('fbSubmit');
    var label = btn.textContent;
    btn.disabled = true;
    btn.textContent = '올리는 중…';
    $('fbError').hidden = true;

    apiFetch(TABLE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: payload
    }).then(function (rows) {
      recordPost((st.tab + '|' + title + '|' + content).slice(0, 400));
      btn.disabled = false;
      btn.textContent = label;
      closeForm();
      st.sort = 'new';
      renderSort();
      st.cache = {};
      loadList(true);
      fbToast(st.tab === 'idea' ? '제안을 올렸어요 · 고마워요!' : '제보를 보냈어요 · 고마워요!');
    }).catch(function (err) {
      btn.disabled = false;
      btn.textContent = label;
      var msg = '글을 올리지 못했어요. ';
      if (err && err.status === 401) msg += '내용을 조금 더 자세히 적어 주세요.';
      else if (!navigator.onLine) msg += '인터넷 연결을 확인해 주세요.';
      else msg += '잠시 후 다시 시도해 주세요.';
      showFormError(msg);
      if (window.console && console.warn) console.warn('[feedback] insert', err && err.message);
    });
  }

  /* ── 열기/닫기 ── */
  function open(ctx) {
    st.ctx = ctx || null;
    st.open = true;
    var modal = $('fbModal');
    if (!modal) return;
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    closeForm();
    renderTabs();
    renderSort();
    loadList(false);
    var box = modal.querySelector('.fb-scroll');
    if (box) box.scrollTop = 0;
  }

  function close() {
    st.open = false;
    closeForm();
    var modal = $('fbModal');
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
  }

  /* ── 이벤트 연결 ── */
  function bind() {
    var modal = $('fbModal');
    if (!modal) return;

    $('fbClose').addEventListener('click', close);

    $('fbTabIdea').addEventListener('click', function () {
      if (st.tab === 'idea') return;
      st.tab = 'idea';
      closeForm();
      renderTabs();
      loadList(false);
      var box = modal.querySelector('.fb-scroll');
      if (box) box.scrollTop = 0;
    });
    $('fbTabBug').addEventListener('click', function () {
      if (st.tab === 'bug') return;
      st.tab = 'bug';
      closeForm();
      renderTabs();
      loadList(false);
      var box = modal.querySelector('.fb-scroll');
      if (box) box.scrollTop = 0;
    });

    $('fbSort').addEventListener('click', function (e) {
      var btn = e.target.closest('.fb-sort-btn');
      if (!btn || btn.dataset.sort === st.sort) return;
      st.sort = btn.dataset.sort;
      renderSort();
      loadList(false);
    });

    $('fbWrite').addEventListener('click', openForm);
    $('fbFormClose').addEventListener('click', closeForm);
    $('fbCancel').addEventListener('click', closeForm);

    $('fbAgeChips').addEventListener('click', function (e) {
      var chip = e.target.closest('.fb-chip');
      if (!chip) return;
      st.ageGroup = chip.dataset.age;
      Array.prototype.forEach.call(document.querySelectorAll('#fbAgeChips .fb-chip'), function (c) {
        c.classList.toggle('active', c === chip);
      });
    });

    $('fbHead').addEventListener('input', updateCounts);
    $('fbContent').addEventListener('input', updateCounts);

    $('fbForm').addEventListener('submit', function (e) {
      e.preventDefault();
      submitForm();
    });

    $('fbList').addEventListener('click', function (e) {
      var like = e.target.closest('.fb-like');
      if (like) { likeItem(like.dataset.like, like); return; }
      var card = e.target.closest('.fb-card');
      var text = e.target.closest('.fb-card-text');
      if (!card || !text) return;
      if (card.classList.contains('expanded')) { card.classList.remove('expanded'); return; }
      // 4줄을 넘어 잘려 있을 때만 펼친다.
      if (text.scrollHeight > text.clientHeight + 2) card.classList.add('expanded');
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && st.open) {
        if (st.composing) closeForm();
        else close();
      }
    });
  }

  window.Feedback = { open: open, close: close };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
