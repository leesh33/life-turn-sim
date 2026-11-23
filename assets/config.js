/* ─────────────────────────────────────────────
   config.js — 앱 스위치 (한 곳에서 켜고 끈다)
   ─────────────────────────────────────────────
   · SHOW_ADS_PROTOTYPE : 프로토타입 광고 지면(하단 스폰서 배너 · 「광고 보고」 문구 ·
     보상형 광고 모달)을 켠다. App Store 심사(2.1)에서는 진짜 광고가 아니면 감춰 둔다.
     AdMob(또는 애드센스·앱인토스) 연동이 끝나면 이 값을 true 로 바꾸고
     assets/ads.js 의 showRewardedAd 본문만 실제 SDK 호출로 바꾸면 된다.
   · SHOW_APPLE_SIGNIN : 「Apple로 로그인」 버튼을 켠다.
     iOS 앱(`com.odol.lifeturn`) 안에서는 **네이티브 Sign in with Apple**(id_token → Supabase
     `grant_type=id_token`)로 동작한다. App ID capability·Key·Supabase Apple Client IDs
     (`com.odol.lifeturn`)까지 등록돼 있다.
   · APPLE_SIGNIN_WEB : 웹(life-turn-sim.vercel.app)에서도 Apple 로그인 버튼을 내보낼지.
     공용 Supabase 프로젝트의 Apple provider 는 OAuth secret 이 **서비스 ID 한 개**에만 대응하고
     그 앞자리가 릴스핀(`com.odol.reelpin.signin`)이라, 웹에서 켜면 릴스핀 이름으로 동의창이 뜨고
     릴스핀 로그인까지 깨질 수 있다. 그래서 웹은 끔(false) — 앱 안에서만 Apple 로그인이 보인다.
   세 값 모두 index.html 이 가장 먼저 읽는다(다른 스크립트보다 앞).
   ───────────────────────────────────────────── */
(function (global) {
  'use strict';

  global.LifeFlags = {
    SHOW_ADS_PROTOTYPE: false,
    SHOW_APPLE_SIGNIN: true,
    APPLE_SIGNIN_WEB: false
  };
})(typeof window !== 'undefined' ? window : globalThis);
