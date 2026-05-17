# Android iOS Core Parity Design

## 목적

Android 앱을 iOS 핵심 4탭 구조와 동등한 MVP로 맞춘다. 기존 Android Kotlin/Compose 앱 골격과 책장, 책 생성, 리더, 퀴즈 흐름은 유지하고, iOS의 핵심 홈 구조인 책장, 통계, 단어장, 설정 탭을 Android에 추가한다.

## 기준 코드

- iOS 기준: `apps/ios/HaruBook/Features/MainTabView.swift:18`
- Android 현재 라우터: `apps/android/app/src/main/java/site/smap/harubook/features/home/HomeRouter.kt:23`
- Android 기술 스택: `apps/android/README.md:1`
- Android API 클라이언트: `apps/android/app/src/main/java/site/smap/harubook/core/networking/ApiClient.kt:1`

## 범위

### 포함

- Android 홈을 4탭 구조로 변경한다.
- 책장 탭은 기존 `BookshelfScreen`, `CreateBookFlow`, `ReaderScreen`, `QuizScreen` 흐름을 유지한다.
- 통계 탭을 추가해 학습 요약, 책 진행 통계, 단어 학습 현황을 표시한다.
- 단어장 탭을 추가해 단어 목록, 뜻, 예문, 복습 상태를 표시한다.
- 설정 탭을 추가해 프로필 전환, 로그아웃, 약관/개인정보 링크를 제공한다.
- 필요한 Android 모델과 ViewModel을 iOS 모델 구조에 맞춰 추가한다.
- Gradle 단위 테스트와 Debug APK 빌드를 검증한다.

### 제외

- 이메일 로그인/회원가입
- Apple 로그인
- Store/IAP 결제
- Parents 리포트와 보호자 PIN
- Push 알림
- 계정 삭제
- 백엔드 API 변경

## 사용자 흐름

1. 앱 실행 후 로그인 상태를 복구한다.
2. 프로필이 없으면 기존 프로필 선택 화면으로 진입한다.
3. 프로필 선택 후 4탭 홈으로 진입한다.
4. 책장 탭에서는 기존처럼 책 목록, 생성, 리더, 퀴즈를 사용한다.
5. 통계 탭에서는 현재 프로필의 학습 요약을 확인한다.
6. 단어장 탭에서는 현재 프로필의 단어 목록을 확인한다.
7. 설정 탭에서는 프로필 전환 또는 로그아웃을 수행한다.

## 아키텍처

### 라우팅

`HomeRouter`는 프로필 선택 여부를 판단하는 최상위 라우터 역할을 유지한다. 프로필 선택 후에는 새 `MainTabScaffold`로 진입한다. `MainTabScaffold`는 하단 탭 상태를 관리하고, 책장 탭 내부에서만 기존 `NavHost` 기반 깊은 라우팅을 유지한다.

예상 구조:

```text
features/home/
├── HomeRouter.kt
└── MainTabScaffold.kt
```

`SessionPreferences`는 이번 구현에서 기존 `HomeRouter.kt` 위치를 유지한다. 새 파일은 4탭 UI를 담당하는 `MainTabScaffold.kt`만 추가한다.

### 탭 구성

| 탭 | Android 화면 | iOS 대응 |
|---|---|---|
| 책장 | 기존 `BookshelfScreen` 흐름 | `bookshelfTab` |
| 통계 | 신규 `StatsDashboardScreen` | `StatsDashboardView` |
| 단어장 | 신규 `VocabDeckScreen` | `VocabDeckView` |
| 설정 | 신규 `SettingsScreen` | `SettingsView` |

### 데이터 로딩

기존 `ApiClient`를 그대로 사용한다. 새 화면은 각 ViewModel에서 필요한 API를 호출하고, 화면은 로딩, 에러, 빈 상태, 성공 상태만 렌더링한다.

| 기능 | API |
|---|---|
| 통계 요약 | `GET /api/learning-summary?profileId=...` |
| 책 진행 통계 | `GET /api/books?profileId=...` |
| 단어장 | `GET /api/vocab?profileId=...` |

단어 음성 재생은 이번 MVP에서 제외한다. 단어장 탭은 목록, 뜻, 예문, 복습 상태 표시까지만 구현한다.

## 화면 설계

### 책장

기존 UI와 동작을 유지한다. 탭 구조 도입 후에도 생성 완료 시 새 책 리더로 이동하고, 퀴즈 완료 시 책장으로 복귀한다.

### 통계

iOS `StatsDashboardView`의 정보 구조를 Android Compose로 옮긴다. 주요 카드:

- 이번 달 학습량
- 읽은 책 수와 진행률
- 학습 단어 수
- 최근 학습 요약

데이터 일부가 없으면 해당 카드만 빈 상태로 표시하고, 전체 화면 실패로 확대하지 않는다. API 호출 자체가 실패한 경우 재시도 버튼을 표시한다.

### 단어장

iOS `VocabDeckView`의 카드형 학습 화면을 Android에 맞춰 구현한다. 1차 MVP는 목록과 카드 중심이다.

- 단어
- 뜻
- 예문
- 원문 출처 또는 책 제목이 응답에 있으면 표시
- 복습 상태가 있으면 배지로 표시
- 단어 음성 재생 버튼은 표시하지 않음

### 설정

최소 설정 화면으로 구현한다.

- 현재 계정 상태 요약
- 프로필 전환
- 로그아웃
- 이용약관
- 개인정보처리방침

법적 문서는 앱 내부 WebView를 새로 만들지 않고 Android Custom Tabs로 연다.

## 에러 처리

- 401은 기존 `ApiClient` 정책대로 `AuthState.handleUnauthorized()`에 위임한다.
- 네트워크 실패는 화면별 에러 상태와 재시도 버튼으로 처리한다.
- 개별 카드 데이터 누락은 카드 단위 빈 상태로 처리한다.
- 예외를 삼켜 기본값으로 위장하지 않는다.

## 테스트와 검증

필수 검증:

```bash
cd apps/android
GRADLE_USER_HOME=/private/tmp/codex-gradle-cache ./gradlew :app:testDebugUnitTest
GRADLE_USER_HOME=/private/tmp/codex-gradle-cache ./gradlew :app:assembleDebug
```

수동 검증:

- 로그인 상태 복구 후 프로필 선택 없이 기존 프로필로 홈 진입
- 프로필 전환 후 프로필 선택 화면 복귀
- 책장 탭에서 책 열기, 생성, 퀴즈 완료 복귀
- 통계 탭 로딩/성공/에러 상태
- 단어장 탭 로딩/성공/빈 상태
- 설정 탭 로그아웃 후 로그인 화면 복귀

## 리스크

| 리스크 | 대응 |
|---|---|
| iOS 모델과 Android 모델의 필드 차이 | API 응답을 확인한 뒤 Android 모델에 필요한 필드만 추가 |
| `HomeRouter`가 비대해짐 | 탭 UI는 `MainTabScaffold.kt`로 분리하고 세션 선호값은 기존 위치 유지 |
| 단어 TTS 응답 구조 불확실 | 이번 MVP에서 단어 음성 재생 제외 |
| 탭 내부 라우팅 충돌 | 책장 탭에만 기존 깊은 `NavHost`를 두고 다른 탭은 단일 화면 유지 |

## 성공 기준

- Android 앱에서 프로필 선택 후 책장, 통계, 단어장, 설정 4탭을 사용할 수 있다.
- 기존 책장, 책 생성, 리더, 퀴즈 흐름이 회귀하지 않는다.
- iOS 핵심 홈 구조와 Android 홈 구조가 기능적으로 대응된다.
- 단위 테스트와 Debug APK 빌드가 통과한다.
