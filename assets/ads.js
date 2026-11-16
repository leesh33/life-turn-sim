/* ─────────────────────────────────────────────
   ads.js — 보상형 광고(프로토타입) 훅
   ─────────────────────────────────────────────
   지금은 3초 카운트다운 모달로 '광고 시청'을 흉내낸다.
   실제 광고 SDK로 바꿀 때는 아래 showRewardedAd 의 본문만 교체하면 된다.
   (호출부 · 보상 지급 · 화면 갱신은 그대로 둔다)

   ── AdMob (웹/Capacitor) 예시 ──
     const { AdMob, RewardAdPluginEvents } = await import('@capacitor-community/admob');
     AdMob.addListener(RewardAdPluginEvents.Rewarded, () => onReward());
     await AdMob.prepareRewardAd({ adId: AD_UNIT_ID });
     await AdMob.showRewardAd();

   ── Google AdSense 보상형 (H5 Games Ads) 예시 ──
     adBreak({ type: 'reward', name: reason,
       beforeAd: () => {}, afterAd: () => {},
       adBreakDone: (info) => { if (info.breakStatus === 'viewed') onReward(); } });

   ── 앱인토스 (Apps in Toss) 예시 ──
     const { loadFullScreenAd, showFullScreenAd } = await import('@apps-in-toss/web-framework');
     await loadFullScreenAd({ options: { adGroupId: AD_GROUP_ID } });
     showFullScreenAd({ options: { adGroupId: AD_GROUP_ID },
       onEvent: (e) => { if (e.type === 'rewarded') onReward(); } });
   ───────────────────────────────────────────── */
(function (global) {
  'use strict';

  var COUNTDOWN = 3;           // 프로토타입 광고 길이(초)
  var TITLES = {
    undo: { icon: '⏪', name: '타임머신', desc: '직전 선택을 되돌립니다' },
    reroll: { icon: '🎲', name: '히든 찬스', desc: '지금 사건을 다른 사건으로 바꿉니다' },
    heal: { icon: '💊', name: '긴급 회복', desc: '체력·멘탈을 회복합니다' }
  };

  var stats = { requested: 0, completed: 0, skipped: 0 };

  var els = null;
  var tickTimer = null;
  var pending = null;      // { reason, onReward }
  var closeTimer = null;

  function $(id) { return document.getElementById(id); }

  function build() {
    if (els) return els;
    els = {
      wrap: $('adModal'),
      body: $('adModalBody'),
      title: $('adTitle'),
      desc: $('adDesc'),
      icon: $('adIcon'),
      clock: $('adClock'),
      status: $('adStatus'),
      fill: $('adFill'),
      claim: $('adClaim'),
      close: $('adClose')
    };
    els.claim.addEventListener('click', claim);
    els.close.addEventListener('click', cancel);
    return els;
  }

  function open(reason) {
    var e = build();
    var meta = TITLES[reason] || { icon: '📺', name: '보상형 광고', desc: '보상을 받습니다' };
    e.icon.textContent = meta.icon;
    e.title.textContent = meta.name;
    e.desc.textContent = meta.desc;
    e.status.textContent = '보상형 광고 시청 중… (프로토타입 체험)';
    e.clock.textContent = String(COUNTDOWN);
    e.fill.style.width = '0%';
    e.claim.disabled = true;
    e.claim.textContent = '보상 받기';
    e.wrap.hidden = false;
    e.wrap.setAttribute('aria-hidden', 'false');
  }

  function close() {
    var e = build();
    e.wrap.hidden = true;
    e.wrap.setAttribute('aria-hidden', 'true');
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
    pending = null;
  }

  function startCountdown() {
    var e = build();
    var left = COUNTDOWN * 10; // 0.1초 단위
    var total = left;
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = setInterval(function () {
      left -= 1;
      var remainSec = Math.ceil(left / 10);
      e.clock.textContent = String(Math.max(0, remainSec));
      e.fill.style.width = (100 - (left / total) * 100).toFixed(1) + '%';
      if (left <= 0) {
        clearInterval(tickTimer);
        tickTimer = null;
        e.clock.textContent = '✓';
        e.status.textContent = '광고 시청 완료 · 보상을 받을 수 있습니다';
        e.claim.disabled = false;
        e.claim.focus();
      }
    }, 100);
  }

  function claim() {
    var e = build();
    if (e.claim.disabled) return;
    var job = pending;
    stats.completed += 1;
    e.claim.disabled = true;
    e.status.textContent = '보상이 적용되었습니다';
    close();
    if (job && typeof job.onReward === 'function') job.onReward(job.reason);
  }

  function cancel() {
    stats.skipped += 1;
    close();
    if (global.Life && global.Life.__onAdSkipped) global.Life.__onAdSkipped();
  }

  /**
   * 보상형 광고를 재생하고, 시청을 마쳤을 때 onReward(reason)를 부른다.
   * @param {'undo'|'reroll'|'heal'} reason
   * @param {(reason:string)=>void} onReward
   */
  function showRewardedAd(reason, onReward) {
    stats.requested += 1;
    pending = { reason: reason, onReward: onReward };
    open(reason);
    startCountdown();
  }

  global.showRewardedAd = showRewardedAd;
  global.adStats = stats;
  global.__adPrototype = { open: open, close: close, claim: claim, COUNTDOWN: COUNTDOWN };
})(window);
