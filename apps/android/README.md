# 하루책 (HaruBook) — Android

> Kotlin 2.0 + Jetpack Compose / minSdk 26 (Android 8.0) / targetSdk 35.
>
> 백엔드: `https://eng.smap.site` (Next.js 16, monorepo `../../src`).
>
> Application ID: `site.smap.harubook.android`.

## 사전 요구
- macOS / Linux / Windows
- JDK 17+
- Android SDK (`~/Library/Android/sdk` 권장) — Android Studio 또는 `cmdline-tools`로 설치
- 또는 Android Studio Hedgehog/Iguana+

## 셋업
1) `local.properties` 파일에 SDK 경로 지정 (`.gitignore` 처리되므로 직접 작성):
```
sdk.dir=/Users/<you>/Library/Android/sdk
```
2) Gradle wrapper 다운로드(처음 한 번):
```
cd apps/android
./gradlew --version   # wrapper jar/properties가 없으면 ../scripts/bootstrap-wrapper.sh 참조
```

## 빌드 / 실행
```bash
# Debug APK 생성
./gradlew :app:assembleDebug

# 실기기·에뮬레이터에 설치
./gradlew :app:installDebug

# 단위 테스트
./gradlew :app:testDebugUnitTest
```

## 디렉토리
```
app/src/main/
├── AndroidManifest.xml
├── res/
│   ├── values/{strings,colors,themes}.xml
│   ├── mipmap-*/ic_launcher.png
│   ├── drawable/login_icon.png
│   └── xml/{backup,extraction}_rules.xml
└── java/site/smap/harubook/
    ├── HaruBookApp.kt           Application
    ├── MainActivity.kt
    ├── core/
    │   ├── networking/          ApiClient, AppConfig, ApiError
    │   ├── auth/                AuthState, PKCE, EncryptedPrefs
    │   └── models/              Profile, Book, Passage, ReadingLog
    ├── features/
    │   ├── auth/                LoginScreen, CustomTabsAuthRunner
    │   ├── profiles/            ProfilePickerScreen, ProfileViewModel
    │   ├── bookshelf/           BookshelfScreen, BookCard, LevelFilter, BookshelfViewModel
    │   └── reader/              ReaderScreen, PassagePager, ReaderViewModel
    └── designsystem/            Color, Type, Theme, PrimaryButton, BadgeChip
```

## 환경
- API base URL, OAuth 콜백 스킴은 `BuildConfig` 또는 `AppConfig`에서 관리
- 액세스 토큰은 `EncryptedSharedPreferences`(AES-256 GCM, AndroidKeyStore 마스터키)에 저장

## 인증 흐름
- Chrome Custom Tabs로 `https://eng.smap.site/api/auth/mobile/start` 오픈
- Google/Kakao OAuth 후 백엔드가 `smapeng://auth/callback?code=...`로 리다이렉트
- `MainActivity` `onNewIntent`가 콜백 인텐트 수신 → `POST /api/auth/mobile/exchange`
- 토큰 발급 후 EncryptedSharedPreferences에 저장
