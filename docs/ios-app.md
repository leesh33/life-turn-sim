# 인생 한 턴 — iOS 앱 (Expo WebView) 연동 규약

웹(`index.html` + `assets/`)을 iOS 앱으로 감싼다. 앱 프로젝트는 저장소 밖 `/workspace/life-turn-app`
(Expo/EAS, Bundle ID `com.odol.lifeturn`, App Store 앱 ID `6838213600`).

> `docs/ios-capacitor.md` 는 **맥+Xcode 로 Capacitor 를 쓰던 예전 계획**이다. 실제 출시 경로는 이 문서의
> Expo WebView 래퍼이고, Capacitor 파일(`capacitor.config.json`·`tools/pack-www.sh`)은 웹 자산을 모으는 용도로만 남겨 두었다.

## 1. 앱이 페이지에 심는 것

페이지 스크립트보다 먼저( `injectedJavaScriptBeforeContentLoaded` ):

```js
window.__LIFETURN_NATIVE__ = { shell: 'ios', platform: 'ios', appleAuth: true, appVersion: '1.0.0', webBase: 'https://life-turn-sim.vercel.app/' };
```

`assets/sync.js` 는 이 객체가 있으면 **앱 모드**로 동작한다.

- `providerOn('apple')` — 앱이면 `appleAuth` 만 보고 켠다(웹은 `APPLE_SIGNIN_WEB`, 기본 꺼짐).
- `signIn('google')` — 페이지를 옮기지 않고 `{type:'oauth', url}` 을 `postMessage` 로 앱에 넘긴다.
  `redirect_to` 는 `lifeturn://auth-callback`.
- `signIn('apple')` — `{type:'apple-signin'}` 만 보낸다(PKCE 불필요).

## 2. 앱이 페이지에 부르는 것

```js
window.LifeNative.oauthCallback('lifeturn://auth-callback?code=…')  // Google 등 OAuth 복귀
window.LifeNative.appleSignIn('<identityToken>', '<raw nonce>')     // 네이티브 Apple 로그인
```

- `completeOAuthCallback(url)` — 이 페이지의 `lifeTurnSim.auth.pkce.v1` verifier 로
  `POST /auth/v1/token?grant_type=pkce` → 세션 저장 → 즉시 동기화.
- `completeAppleSignIn(idToken, nonce)` — `POST /auth/v1/token?grant_type=id_token`
  (`{provider:'apple', id_token, nonce}`) → 세션 저장 → 동기화.
  Supabase Apple provider 의 Client IDs 에 **앱 번들 ID `com.odol.lifeturn`** 이 있어야 통과한다.

## 3. 앱에 넣는 HTML 만들기

```bash
./tools/pack-www.sh
node tools/build-native-html.mjs ../life-turn-app/src/generated/html.js
```

- `index.html` 의 `<link rel="stylesheet">`·`<script src>` 를 모두 인라인하고, 폰트는 woff2 만 data URI 로 넣는다
  (@font-face 7굵기 → normal/bold 2벌로 줄여 6MB → 2.7MB).
- 앱은 이 HTML 을 `loadHTMLString` + `baseUrl=https://life-turn-sim.vercel.app/` 로 띄운다:
  네트워크 없이 실행되면서도 오리진이 https 라 `localStorage` 가 정상 동작한다.
- 그래서 **앱에 들어간 화면은 인터넷 없이도 뜨고**, 클라우드 동기화·로그인만 네트워크를 쓴다.

## 4. 웹을 고친 뒤

1. `node test/` 전체 통과 확인 (앱 관련 검사는 `test/appstore.js` ⑤).
2. `main` 에 push → Vercel 라이브 반영.
3. 앱 화면도 바뀐 것이면 위 3번으로 HTML 재생성 → `life-turn-app` 커밋 → EAS 빌드/제출.
