# 하루책 (HaruBook) — iOS

> SwiftUI + Swift 6 / iOS 17+ / Xcode 26+. 번들 ID `site.smap.harubook.ios`, 모듈 `HaruBook`. 백엔드: `https://eng.smap.site` (Next.js 16, monorepo `../../src`).
>
> URL scheme은 `smapeng://`로 유지 — 백엔드 `parseMobileRedirect`가 해당 프로토콜만 허용. 사용자에게는 노출되지 않는 콜백용.

## 사전 요구
- macOS, Xcode 26+
- [xcodegen](https://github.com/yonaskolb/XcodeGen): `brew install xcodegen`

## 프로젝트 생성
```bash
cd apps/ios
xcodegen generate
open HaruBook.xcodeproj
```

> `project.yml` 변경 시 `xcodegen generate` 재실행. `.xcodeproj`는 `.gitignore` 처리되어 있으므로 매번 재생성한다.

## 빌드 / 실행
```bash
# 시뮬레이터
xcodebuild -scheme HaruBook \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  build

# 실기기 (Apple Developer Team 필요)
# Xcode에서 Signing & Capabilities → Team 선택
```

## 환경
- API base URL, OAuth 콜백 스킴은 `HaruBook/Resources/Config.plist` 참조
- 토큰은 Keychain (`kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`)에 저장

## 디렉토리
```
HaruBook/
├── HaruBookApp.swift
├── Info.plist
├── Resources/
│   ├── Config.plist
│   └── Assets.xcassets
├── Core/
│   ├── Networking/      APIClient, Endpoint, APIError, AppConfig
│   ├── Auth/            AuthService, AuthState, PKCE, KeychainStore
│   └── Models/          Profile, Book, Passage, ReadingLog
├── Features/
│   ├── Auth/            LoginView, WebAuthRunner
│   ├── Profiles/        ProfilePickerView, ProfileViewModel
│   ├── Bookshelf/       BookshelfView, BookCardView, LevelFilterView, BookshelfViewModel
│   └── Reader/          ReaderView, PassageView, ReaderViewModel
└── DesignSystem/        Color+Theme, Color+Hex, Typography, PrimaryButton, BadgeLabel
```
