> ⚠️ **이 문서는 예전 계획(맥+Xcode + Capacitor)입니다.** 실제 출시는 Expo WebView 래퍼로 진행됐고 절차·연동 규약은
> [`docs/ios-app.md`](ios-app.md) 를 보세요. 아래 `capacitor.config.json`·`tools/pack-www.sh` 는 웹 자산을 모으는 데 계속 쓴다.

# 인생 한 턴 — iOS 앱으로 감싸기 (Capacitor)

웹앱(`index.html` + `assets/`)은 빌드 도구 없이 도는 정적 사이트입니다. 그대로 Capacitor 의
`www/` 로 복사해 iOS 네이티브 프로젝트에 넣으면 App Store 에 올릴 수 있습니다.
이 문서는 **맥 + Xcode** 기준입니다(iOS 빌드는 맥에서만 됩니다).

- 설정 파일: [`capacitor.config.json`](../capacitor.config.json)
  - `appId` `com.odol.lifeturn` · `appName` `인생 한 턴` · `webDir` `www`
  - `server.allowNavigation` — Google/Apple 로그인 창과 Supabase, 라이브 주소를 앱 안에서 열 수 있게 허용
- 웹 자산 복사 스크립트: [`tools/pack-www.sh`](../tools/pack-www.sh)

## 0. 준비물

- macOS + Xcode 15 이상 (App Store Connect 에 앱을 올릴 수 있는 최신 버전)
- Node.js 18 이상
- Apple Developer Program 가입(연 129,000원) — App Store Connect 에서 앱 레코드 생성
- CocoaPods (`sudo gem install cocoapods`) — Capacitor 6 iOS 는 Swift Package Manager 도 지원하지만 기본은 CocoaPods

## 1. 웹 자산을 `www/` 로 복사

```bash
cd life-turn-sim
./tools/pack-www.sh          # index.html · privacy.html · terms.html · assets/ → www/
```

`www/` 는 `.gitignore` 에 들어 있습니다(빌드 산출물).

## 2. Capacitor 설치와 iOS 프로젝트 만들기

저장소 루트에서 한 번만:

```bash
npm init -y                                        # package.json 이 없을 때만
npm install @capacitor/core@6 @capacitor/cli@6 @capacitor/ios@6
# capacitor.config.json 이 저장소에 이미 있습니다 — `npx cap init` 은 실행하지 않습니다(설정을 덮어쓸 수 있음).
npx cap add ios
npx cap sync ios
npx cap open ios                                    # Xcode 가 열립니다
```

> `package.json` 이 생기면 Vercel 이 정적 사이트 대신 npm 프로젝트로 볼 수 있습니다.
> Vercel 배포가 흔들리면 `package.json` 을 `.vercelignore` 에 넣거나, iOS 작업을 별도 폴더에서 하세요.
> (웹 배포는 지금처럼 `index.html` 정적 파일 그대로입니다.)

## 3. Xcode 에서 확인할 것

| 항목 | 값 |
| --- | --- |
| Bundle Identifier | `com.odol.lifeturn` |
| Display Name | 인생 한 턴 |
| Version / Build | 1.0 (1) |
| Deployment Target | iOS 15.0 이상 |
| Supported Orientations | Portrait (세로) 만 |
| Signing | 본인 Team · Automatically manage signing |

- **App Icon**: 1024×1024 PNG 한 장(알파 없음)을 `AppIcon` 에 넣습니다. (현재 `assets/favicon.svg` 는 웹용)
- **Launch Screen**: Capacitor 기본 스토리보드 그대로 두거나 배경색 `#F4F1EB` 로 맞춥니다.
- **Safe Area**: 웹 CSS 가 `env(safe-area-inset-*)` 를 쓰므로 `contentInset: always` 로 상단 노치·하단 홈바를 피합니다.
- **ATS**: 모든 요청이 https 라 `Info.plist` 예외는 필요 없습니다.
- **App Transport / 로그인 창**: Google·Apple 로그인은 `SFSafariViewController`(인앱 브라우저)로 열립니다.
  `allowNavigation` 에 `accounts.google.com`, `appleid.apple.com`, `zdcdvjlssncsawpqsjwe.supabase.co` 가 있어야
  로그인 후 앱으로 돌아옵니다. OAuth Redirect URL 은 Supabase Auth → URL Configuration 에
  `https://life-turn-sim.vercel.app/**` 이 이미 등록돼 있습니다(Capacitor 는 `capacitor://localhost` 로 뜨므로
  인앱 브라우저에서 웹 주소로 돌아오는 흐름을 씁니다).

## 4. App Store 심사 전 체크 (이번 정비에서 반영됨)

- **2.1 광고**: `assets/config.js` 의 `SHOW_ADS_PROTOTYPE = false` — 프로토타입 광고 배너·모달·「광고 보고」
  문구가 모두 꺼져 있고, 되돌리기/다시 뽑기/긴급 회복은 광고 없이 바로 동작합니다.
  AdMob 을 붙인 뒤 플래그를 켜면 됩니다.
- **5.1.1(v) 계정 삭제**: 명예의 전당 → 로그인 상태에서 **「계정 및 클라우드 기록 삭제」**.
  2단계 확인(설명 → `삭제` 입력) 뒤 Supabase 의 내 기록과 계정 연결을 지웁니다.
  서버 함수는 [`supabase/life_sim_account_delete.sql`](../supabase/life_sim_account_delete.sql) — 2026-11-21 프로젝트에 실행 완료
  (`public.life_sim_delete_my_account`, authenticated 만 실행). 같은 계정을 쓰는 릴스핀 기록이 있으면 계정은 남깁니다.
- **1.2 사용자 콘텐츠(제안·제보 게시판)**: 개인정보를 적지 말라는 안내와 신고·차단은 운영자 메일로 처리합니다.
- **개인정보처리방침 · 이용약관**: `/privacy.html` · `/terms.html` (앱 안 시작 화면 링크).
- **Sign in with Apple**: `assets/config.js` 의 `SHOW_APPLE_SIGNIN` — Apple Developer 콘솔과 Supabase
  Apple provider 를 켠 뒤 `true` 로 바꾸면 시작 화면·전당에 「Apple로 로그인」 버튼이 나타납니다.
  (Apple 심사 4.8: 다른 소셜 로그인을 제공하면 Apple 로그인도 함께 제공해야 합니다.)

## 5. TestFlight → 심사

```bash
npx cap sync ios
npx cap open ios
# Xcode: Product → Archive → Distribute App → App Store Connect → Upload
```

- App Store Connect 에서 스크린샷(6.7형 1290×2796 최소 3장), 설명, 키워드, 개인정보처리방침 URL
  (`https://life-turn-sim.vercel.app/privacy.html`)을 채웁니다.
- 심사 메모에는 "웹앱을 Capacitor 로 감싼 게임, 로그인은 선택(구글·애플), 광고 없음"을 적으면 통과가 빠릅니다.

## 6. 웹만 고칠 때

```bash
./tools/pack-www.sh && npx cap sync ios
```
웹 배포(Vercel)는 지금처럼 `main` push 로 자동 반영됩니다. 앱은 위 명령으로 웹 자산을 다시 넣고 새 빌드를 올립니다.
