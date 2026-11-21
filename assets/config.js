/* ─────────────────────────────────────────────
   config.js — 앱 스위치 (한 곳에서 켜고 끈다)
   ─────────────────────────────────────────────
   · SHOW_ADS_PROTOTYPE : 프로토타입 광고 지면(하단 스폰서 배너 · 「광고 보고」 문구 ·
     보상형 광고 모달)을 켠다. App Store 심사(2.1)에서는 진짜 광고가 아니면 감춰 둔다.
     AdMob(또는 애드센스·앱인토스) 연동이 끝나면 이 값을 true 로 바꾸고
     assets/ads.js 의 showRewardedAd 본문만 실제 SDK 호출로 바꾸면 된다.
   · SHOW_APPLE_SIGNIN : 「Apple로 로그인」 버튼을 켠다.
     Apple Developer 콘솔(Service ID · Key · Return URL)과 Supabase Auth 의 Apple provider 가
     준비되기 전에는 false — 켜 두면 누를 때 오류가 난다.
   두 값 모두 index.html 이 가장 먼저 읽는다(다른 스크립트보다 앞).
   ───────────────────────────────────────────── */
(function (global) {
  'use strict';

  global.LifeFlags = {
    SHOW_ADS_PROTOTYPE: false,
    SHOW_APPLE_SIGNIN: false
  };
})(typeof window !== 'undefined' ? window : globalThis);
