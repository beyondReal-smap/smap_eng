---
name: session
description: smap_eng 프로젝트 현재 상태. 세션 시작 시 현재 상태 파악용.
last-updated: 2026-05-30 (TTS·이미지 안정성/캐시 개선 + 4/30~5/18 네이티브 앱·FCM·IAP 작업 로그 동기화)
---

# 세션 상태

> 세션 시작 시 현재 상태를 빠르게 파악하기 위한 문서

---

## 작업 관리

| 항목 | 내용 |
|------|------|
| **도구** | GitHub Issues |
| **레포** | [github.com/beyondReal-smap/smap_eng](https://github.com/beyondReal-smap/smap_eng) (clone: `git@github.com:beyondReal-smap/smap_eng.git`) |
| **라벨 규칙** | `priority:P0/P1/P2`, `type:feat/fix/docs/chore`, `area:llm/tts/image/ui/db` |
| **조회 명령** | `gh issue list --label "priority:P0"` |

---

## 다음 작업

> **MVP 웹앱 완료** (Next.js 16 + Drizzle + OpenAI 동화 생성 + Kokoro TTS + FLUX 이미지 +
> 퀴즈·단어장(SRS)·통계·보호자모드·결제). **네이티브 iOS·Android 앱 완료** (iOS 패리티,
> FCM 푸시, StoreKit 2 / Google Play Billing). 4/20~5/18 구현분은 아래 "최근 세션" 참조.
> 현재 초점: 양 스토어 심사 제출 및 운영.

| 우선순위 | 작업 | 상태 |
|---------|------|------|
| **P0** | iOS App Store 심사 제출 | 심사 준비 완료 (IAP 가격·앱 아이콘·splash·인앱 약관/계정삭제) |
| **P0** | Android Google Play 심사 제출 | 심사 준비 완료 (versionCode 2, Billing v7, splash 패리티) |
| **P1** | 관리자 푸시 발송 페이지 운영 (FCM 통합) | ✅ Done (2026-05-18) |
| **P2** | 향후 오픈 LLM(Gemma 등) 재검토 시 LLM 레이어 인터페이스 교체 | 분기별 재평가 |

---

## 열린 질문 / 확인 필요

| # | 질문 | 상태 |
|---|------|------|
| 1 | Kokoro 구동 방식 | ✅ 해결 — 별도 FastAPI 서버 (`KOKORO_BASE_URL=localhost:8880`) |
| 2 | FLUX.1-schnell 구동 방식 | ✅ 해결 — Diffusers CPU 서버 (`FLUX_BASE_URL=localhost:8890`) |
| 3 | 향후 오픈 LLM 재검토 (Gemma 등 안정화 시 전환) | 분기별 재평가 |
| 4 | Next.js 16 브레이킹 체인지 — `AGENTS.md` 지침 준수 | 구현 중 상시 확인 |
| 5 | `/usr/local/bin/ollama` 잔여 심링크 삭제 (root 소유, `sudo rm /usr/local/bin/ollama`) | 대표님 수동 처리 |

---

## 기타 이슈

없음

---

## 최근 세션

### 2026-05-30 (웹 미디어 안정성/캐시 + untracked 정리 + 세션 로그 동기화 + 대형 파일 7종 리팩토링)

#### 세션 목표
- 워킹트리에 누적된 미커밋 변경(성능·안정성·캐시) 검증 후 커밋. 폐기 잔여물 정리. SESSION.md 백필.
- 후반: God 모듈/컴포넌트 2종(`queries.ts` 1123줄, `reader.tsx` 1388줄) 리팩토링 — 동작 보존하며 도메인/관심사 분리.

#### 변경 / 커밋 (origin/main push 완료)
| 커밋 | 성격 | 내용 |
|------|------|------|
| `7456427` | fix(ui) | 인증 이미지 라우트(`/images`·`/audio`) 표지·장면 `unoptimized` — next/image optimizer 쿠키 미전달 404 복구 |
| `23b5f63` | perf(media) | TTS·이미지 hang 상한 타임아웃(`AbortSignal.timeout`+`any`), `KOKORO_SPEED(0.85)`·`*_TIMEOUT_MS` env 검증, 정적 라우트 `private`+약한 ETag 304 재검증, `/api/books` books·stats `Promise.all` 병렬화 |
| `6bf315f` | chore | 폐기 Expo 잔여(`apps/mobile/`)·디버그 PNG(`eng-*`·`profile-*`)·`scripts/test-fcm.mjs` gitignore |
| `67c9b14`·`4f98cde` | docs(session) | 4/30~5/30 작업 로그 동기화 + 레포 URL 정정(bluemusk→beyondReal-smap) |
| `2c9c2fc` | refactor(db) | `queries.ts` 1123줄 → 도메인별 10파일 + barrel |
| `709534d` | refactor(reader) | `reader.tsx` 1388 → 943줄, `reader/` 하위 6파일 분리 |
| `afc5c43` | refactor(auth) | `auth.ts` 875 → 42줄, `lib/auth/` 하위 4파일 분리 |
| `809a757` | refactor(cover-art) | `cover-art.tsx` 791 → 135줄, 일러스트 24종 → `cover-art/illustrations.tsx` |
| `7a74b2b` | refactor(create-book-dialog) | `create-book-dialog.tsx` 773 → 454줄, Step 6종 + 상수/타입 분리 |
| `750c5af` | refactor(vocab-deck) | `vocab-deck.tsx` 757 → 514줄, 보조 컴포넌트 8종 → `vocab-deck/components.tsx` |
| `839befc` | refactor(bookshelf) | `bookshelf.tsx` 656 → 328줄, 보조 7종 + 상수 → `bookshelf/`, LevelBadge·SkeletonGrid re-export |

#### 리팩토링 상세
- **`refactor(db)` queries.ts** — 1123줄 38함수를 도메인 경계로 분리. `queries.ts`는 barrel(re-export)로 전환해 **호출처 37개 파일 import 경로 변경 0**. 도메인: `queries/{profiles,books,vocab,passages,quizzes,reading-logs,parental,learning,admin}.ts` + 공유 헬퍼 `_shared.ts`(parseJsonColumn·toYMD). 의존 단방향(parental→books, admin→books). 동작 변화 0(순수 이동).
- **`refactor(reader)` reader.tsx** — 1388→943줄(−445). 강결합 본체 effect(TTS 폴링·백그라운드 합성·복구·자동재생·키보드)는 회귀 위험이 커 **유지**하고, 회귀 위험 낮은 응집 단위만 추출: `reader/{shared.ts, passage-text.tsx, ending-choice-dialog.tsx, reader-settings.tsx, use-reading-log.ts, use-font-size.ts}`. 동작 보존 의도(코드 이동 + 응집 훅화).
  - ⚠️ **수동 QA 권장**: effect 순서 의존 동작(낭독 재생/다시듣기·자동재생 연속·진도 저장)은 빌드로 회귀를 못 잡음 → 배포 전 실기기 확인.
  - 기존 lint 이슈(범위 밖, 원본부터 존재): `setState-in-effect`(진행복원), `requestTts` 사용순서, `setSceneCache` 미사용.

- **`refactor(auth)` auth.ts** — 875→42줄. NextAuth 코어 + 모바일 인증 핸들러 + crypto/PKCE 헬퍼를 순환 없는 단방향으로 분리: `lib/auth/{password.ts, mobile-shared.ts, next-auth-instance.ts, mobile-handlers.ts}`. 의존 방향 password·mobile-shared(순수) ← mobile-handlers → next-auth-instance, auth.ts가 조립. public API(handlers·auth·signIn·signOut) 유지, 호출처 7개 변경 0. 보안 핵심이라 회귀를 직접 대조 검증(scrypt 파라미터·PKCE 정규식·timingSafeEqual·`for('update')` 락·dev-issue 3중 가드·쿠키 보안 속성 일치). security-reviewer 에이전트는 파싱 오류로 실패 → 수동 대조로 대체.

- **`refactor(cover-art)` cover-art.tsx** — 791→135줄. hook 0개 순수 프레젠테이션 — SVG 일러스트 24종 + Svg 래퍼를 `cover-art/illustrations.tsx`(659줄)로 이동, CoverArt 본체·타입·PALETTES·TEMPLATES·pickVariant만 유지. 동작 변화 0(순수 이동). tsc + eslint + build 통과.
- **`refactor(create-book-dialog)` create-book-dialog.tsx** — 773→454줄. 5단계 마법사. 강결합 본체 hook(open·step·genre·cefr·intake)은 회귀 위험으로 유지하고, 순수 프레젠테이션 Step 6종(Genre/GenreCard/Cefr/Intake/Topic/Review)을 `create-book-dialog/steps.tsx`(333줄), 상수·타입을 `create-book-dialog/shared.ts`(28줄)로 분리. 동작 변화 0(코드 이동). tsc + eslint + build 통과.
- **`refactor(vocab-deck)` vocab-deck.tsx** — 757→514줄. 단어장 플래시카드 + SRS. 강결합 본체 hook(20개 — 덱/평가/발음/키보드)은 회귀 위험으로 유지하고, 순수 프레젠테이션 컴포넌트 8종(DailyGoalBar/SessionCompleteCard/CardStateChip/TabBar/TabItem/GradeButton/PronounceButton/Skeleton) + Tab 타입을 `vocab-deck/components.tsx`(252줄)로 분리. 동작 변화 0(코드 이동). tsc + eslint + build 통과.
- **`refactor(bookshelf)` bookshelf.tsx** — 656→328줄. 책장 그리드. 강결합 본체 hook(SSR fetch·필터·디바운스·recent)은 회귀 위험으로 유지하고, 보조 컴포넌트 7종(RecentCard/BookCard/CoverGenButton/FilterGroup/LevelPill/LevelBadge/SkeletonGrid)을 `bookshelf/components.tsx`(315줄), 상수·헬퍼를 `bookshelf/shared.ts`(40줄)로 분리. 외부 공개 컴포넌트(LevelBadge·SkeletonGrid)는 본체에서 re-export해 호출처 변경 0(app/loading.tsx의 SkeletonGrid import 유지). 동작 변화 0(코드 이동). tsc + eslint + build 통과.

#### 리팩토링 총괄 (대형 파일 6종, 모두 push 완료)
| 대상 | before→after | 분리 |
|------|------|------|
| `queries.ts` | 1123 → 21(barrel) | 도메인 10파일 |
| `reader.tsx` | 1388 → 943 | shared·보조 4·훅 2 (`reader/`) |
| `auth.ts` | 875 → 42 | `lib/auth/` 4파일(순환 없는 단방향) |
| `cover-art.tsx` | 791 → 135 | 일러스트 24종(`cover-art/illustrations.tsx`) |
| `create-book-dialog.tsx` | 773 → 454 | Step 6 + shared(`create-book-dialog/`) |
| `vocab-deck.tsx` | 757 → 514 | 보조 8 + Tab(`vocab-deck/components.tsx`) |
| `bookshelf.tsx` | 656 → 328 | 보조 7 + 상수(`bookshelf/`, re-export로 호환) |

> 공통 원칙: **순수 프레젠테이션/헬퍼/상수만 추출, 강결합 본체 hook은 유지**(회귀 위험 회피). 호출처 import 경로 변경 0, 각 단계 tsc+eslint+build 검증. ⚠️ reader는 effect 순서 의존 동작이 있어 배포 전 실기기 QA 권장.

#### 검증
- `tsc --noEmit` 0 에러 · `npm run build` 성공(각 Phase 독립 검증) · 정합성 리뷰 통과.

#### 메모
- SESSION.md 4/29 섹션의 커밋 해시(`b4c0311` 등)는 별도 macOS 작업분으로 **현재 main에 미존재**. 실제 main은 4/30~5/18에 네이티브 앱·FCM·IAP가 집중 진행됨(아래 백필).

---

### 2026-05-17~18 (Android iOS 패리티 클린 재작성 + FCM 통합 + 스토어 준비)

> ⚠️ 사후 백필(2026-05-30). 당시 세션 단위 상세 로그 없이 커밋 이력 기준 요약.

- **Android 전면 재작성**: 기존 앱 제거 후 iOS 패리티로 클린 재작성. Phase 1~7 — 빌드 시스템/DesignSystem/Core → Auth·Profiles·Bookshelf → Reader·Quiz·CreateBook 마법사·AudioPlayer → 4탭 홈(Stats·Vocab·Settings·Parents·Push·SRS·Legal·Store) → 단어 popover·일러스트 폴백 → **FCM 원격 푸시 + Google Play Billing v7**.
- **FCM 통합**: iOS도 APNs 직접 통신을 폐기하고 **FCM SDK로 통일**(Phase 9). `applicationId` 통일 + Firebase 자산 매칭 + 시크릿 보호.
- **iOS 패리티 마감**: Reader·통계·퀴즈·프로필·설정·보호자·스토어 화면 디자인 통일, A2Z 손글씨 폰트, CEFR 배지 색.
- **스토어 준비**: IAP 가격 실거래가 갱신(₩1,100/5,500/11,000), `CFBundleIconName`, splash 패리티(iOS UILaunchScreen 동등), Android versionCode 2.
- **기타**: 데이터 삭제 요청 안내 legal 페이지, 관리자 푸시 발송 페이지(발송 시간 표시 일관화 + 확인/결과 모달).

---

### 2026-05-15~16 (iOS Phase 4~5 + 대량 UI 정비 + 단어장/IAP)

> ⚠️ 사후 백필(2026-05-30). 커밋 이력 기준 요약.

- **iOS Phase 4**: 인앱 약관/설정/계정 삭제(App Store 심사 차단 해소), 이메일 가입/로그인 + 첫 프로필 온보딩, 학습 통계 + 단어장(SRS), 보호자 모드(PIN 게이트 + 주간 리포트), TabBar 재구성 + Privacy Manifest.
- **iOS Phase 5**: Sign in with Apple, StoreKit 2 IAP, APNs 푸시, StoreKit Configuration + App Store Server Notifications V2.
- **UI 대정비**: Color+Theme를 웹 `globals.css` oklch 토큰과 일치, A2Z 폰트 전역, 책장·리더·단어장·설정 패리티, WCAG AA 대비 교정, 결말 분기 TTS 사전 합성.
- **vocab**: 학습 진도 서버 동기화 + 평가 이벤트 로깅, 마스터 단어 카운트 차감.
- **api**: 모바일 OAuth callback origin 복원(`x-forwarded-host` 기반).

---

### 2026-04-30 (네이티브 Phase 3 — 동화 생성 마법사 + 이미지 + Expo 폐기 완료)

> ⚠️ 사후 백필(2026-05-30). 커밋 이력 기준 요약.

- **Phase 3 (iOS + Android)**: 동화 생성 intake 마법사(`/api/books/intake/questions`, `POST /api/books`) + 책 표지/장면 이미지(`/api/image/book/[bookId]/cover`, `/api/image/passage/[passageId]`).
- Expo/RN 앱 retire 완료, 네이티브 전환 문서 정정 + Compose deprecation 정리, Apple Developer Team ID 적용 + xcodegen 산출물 추적 해제.

---

### 2026-04-29 (HaruBook 네이티브 iOS·Android Phase 1+2 도입 + Expo/RN 폐기)

#### 세션 목표
- 모바일 클라이언트를 Expo/RN(`apps/mobile`)에서 네이티브로 일원화. iOS(SwiftUI) + Android(Jetpack Compose). 백엔드 변경 0.

#### 결정 사항
- **앱 표시명**: 하루책 (HaruBook). 번들/Application ID `site.smap.harubook.{ios,android}`.
- **모듈/타겟 명**: `HaruBook` (Swift 모듈) / `site.smap.harubook` (Kotlin 패키지).
- **인증 흐름**: 백엔드의 기존 `/api/auth/mobile/{start,exchange}` + PKCE S256 그대로 사용. iOS는 ASWebAuthenticationSession, Android는 Chrome Custom Tabs.
- **URL scheme**: `smapeng://` 유지 (백엔드 `parseMobileRedirect`가 해당 프로토콜만 화이트리스트). 사용자 비노출.
- **결제**: iOS MVP에서 비노출. App Store 정책상 외부 결제(Toss/PortOne) 사용 불가 → Phase 4에서 StoreKit 2 + 영수증 검증.
- **Apple Developer Team ID**: `ZVXXRV5MTP`.

#### 변경 파일 (요약)
| 영역 | 변경 |
|------|------|
| `apps/ios/` | 신규 — 33 Swift 파일, xcodegen 기반 (`project.yml`). SwiftUI + Swift 6, iOS 17+ |
| `apps/android/` | 신규 — 30 Kotlin 파일, Gradle 8.10 + AGP 8.7.3 + Kotlin 2.0.21 + Compose BOM 2024.12.01. minSdk 26 |
| `apps/mobile/` | 삭제 (90 파일, ~17.7K 라인) |
| `package.json` | `mobile:*` 7개 스크립트 + `build:prod`의 `mobile:export` 호출 제거 |
| `next.config.ts` | `/mobile/*` SPA fallback rewrite 제거 |
| `agent-guide/PROJECT.md` | ReadingLog 클라이언트 호출 표를 iOS/Android 네이티브 기준으로 정정 |

#### Phase 1 (스캐폴딩 + 기본 흐름)
- iOS / Android 양쪽: 인증 → 프로필 전환 → 책장(레벨 필터) → 리더(텍스트 + 한글 토글) + 독서 로그 POST/PATCH.
- 디자인 토큰 통일: `#1D5B53` primary, `#FFF7E8` background, `book_icon.png` 1024 업스케일.
- Keychain (iOS) / EncryptedSharedPreferences (Android, AES-256 GCM)에 토큰 저장.

#### Phase 2 (TTS + 4지선다 퀴즈)
- TTS: `POST /api/tts/[passageId]` → `{ audioPath: "/audio/passage-N.wav" }` → Bearer 인증 다운로드 → 메모리/디스크 캐시 → 재생.
- 퀴즈: 마지막 페이지 → "퀴즈 풀기" CTA → `POST /api/books/[id]/quiz` (멱등) → 5문제 진행 → 점수 PATCH `/api/logs { quizScore }`.

#### 검증
- iOS: Xcode 26.4 / iOS 26.4 시뮬레이터(iPhone 17 Pro) — `xcodebuild build` BUILD SUCCEEDED. LoginView 시각 검증 통과.
- Android: AGP 8.7.3 / Gradle 8.10 — `./gradlew :app:assembleDebug` BUILD SUCCESSFUL. APK 20MB. Pixel 9 Pro AVD에서 LoginScreen 시각 검증 통과. PKCE 단위 테스트 3/3 통과.

#### 커밋 (로컬, push 미수행)
- `f25a7e7` — Phase 1 스캐폴딩 (105 파일, +6,128)
- `8aff265` — Phase 2 TTS + 퀴즈 (20 파일, +1,625 / -70)
- `55a34b9` — Apple Developer Team ID 적용 + xcodegen 산출물 추적 해제
- `b4c0311` — Expo/RN 폐기 (92 파일, +2 / -17,701)

#### 환경
- macOS · Xcode 26.4 / Swift 6.3 / xcodegen 2.44.1
- JDK 17.0.8 / Gradle 8.14.2 (system) → wrapper 8.10
- Android Studio · `~/Library/Android/sdk` (platforms 34/35/36, build-tools 36.1.0)

#### 다음 착수점
- Phase 3: 동화 생성(intake 마법사 — `/api/books/intake/questions`, `POST /api/books`) + 책 표지/장면 이미지(`/api/image/book/[bookId]/cover`, `/api/image/passage/[passageId]`).
- Phase 4: StoreKit 2 / Google Play Billing(IAP), Sign in with Apple, APNs/FCM 푸시.
- iOS test target XCTest 모듈 자동 링크(xcodegen 옵션 보완).
- Android Material Icons `MenuBook`/`Divider` deprecation 정리(AutoMirrored / HorizontalDivider).

---

### 2026-04-20

#### 세션 목표
- 프로젝트 기획 확정 → `agent-guide/` 3종 생성 → Next.js 스캐폴딩 → Ollama 모델 로드

#### 변경 파일
| 파일 | 변경 유형 | 요약 |
|------|----------|------|
| `agent-guide/GUIDE.md` | 추가/수정 | 작업 원칙, 용어, 오픈모델 구성, GitHub Issues 라벨 규칙 |
| `agent-guide/PROJECT.md` | 추가/수정 | MVP 기능 8종, 레벨 체계, 기술 스택, 데이터 모델, **Next.js 16 실제 구조** |
| `agent-guide/SESSION.md` | 추가/수정 | 백로그, 결정사항, 세션 로그 |
| `AGENTS.md` | 자동 생성 (Next.js 16) | 에이전트 브레이킹 체인지 경고 |
| `CLAUDE.md` | 자동 생성 | `@AGENTS.md` 임포트 |
| `package.json` / `tsconfig.json` / `next.config.ts` / `eslint.config.mjs` / `postcss.config.mjs` | 자동 생성 | Next.js 16 스캐폴딩 |
| `src/app/{layout.tsx,page.tsx,globals.css,favicon.ico}` | 자동 생성 | 기본 템플릿 |
| `public/*` | 자동 생성 | 정적 에셋 |
| `.gitignore` | 수정 | `/storage/`, `*.db`, `*.sqlite` 추가 |

#### 결정 사항
- **플랫폼**: **Next.js 16.2.4** (App Router + `src-dir` + TS 5.9) — 당초 계획 Next.js 14에서 업그레이드
- **UI**: **Tailwind CSS 4** (`@tailwindcss/postcss`) + shadcn/ui(예정) + React 19.2
- **LLM**: Ollama + **Gemma 4 E4B** (Unsloth GGUF `UD-Q4_K_XL`)
- **TTS**: Kokoro-82M
- **이미지**: FLUX.1-schnell (MVP 포함)
- **작업 관리**: GitHub Issues + `gh` CLI ([bluemusk/smap_eng](https://github.com/bluemusk/smap_eng))
- **DB**: SQLite + Drizzle ORM
- **레벨**: 연령(5~10세) × CEFR(A1~B1)
- **사용자**: 가족 프로필 전환 (2~3명)
- **원칙**: 상용 API 금지, 모든 추론 스택 오픈모델로만 구성
- **Next.js 16 브레이킹 체인지 주의**: `AGENTS.md` 지침대로 학습 데이터 기반 코드 작성 지양, `node_modules/next/dist/docs/` 참조

#### 환경
- pnpm 9.12.2 · Node v25.5.0 · gh 2.52.0 (`bluemusk` 활성) · Ollama 구동 중 (포트 11434)
- 기존 모델 `gemma3:12b` (8.1GB) 확인 — 참고용 유지
- 새 모델 `hf.co/unsloth/gemma-4-E4B-it-GGUF:UD-Q4_K_XL` pull **백그라운드 진행 중**

#### 현재 상태
- ✅ Next.js 16 스캐폴딩 완료, `agent-guide/` 복귀
- 🔄 Ollama 모델 pull 진행 중 (백그라운드)
- ⏭️ **다음 세션 착수점**: ① 모델 pull 완료 확인 → ② Drizzle + better-sqlite3 설치 → ③ `src/lib/db/schema.ts` 6개 테이블 구현 → ④ `src/lib/llm/` Ollama 클라이언트 + 레벨별 프롬프트 + Zod 스키마

---

### 2026-04-20 (후반 세션)

#### 세션 목표
- Drizzle 스키마 + LLM 레이어 구현, 초기 git 커밋, Ollama → OpenAI 전환

#### 변경 파일
| 파일 | 변경 유형 | 요약 |
|------|----------|------|
| `src/lib/db/{schema,index}.ts`, `drizzle.config.ts`, `drizzle/0000_*.sql` | 추가 | Drizzle 5 테이블 + 마이그레이션 적용 (`data.db` 생성) |
| `src/lib/llm/{client,config,schemas,index}.ts`, `prompts/{story,quiz,translation}.ts` | 추가/**교체** | 초기 Ollama 기반 → OpenAI Chat Completions 기반으로 재작성 |
| `.env.example`, `.env.local` | 추가/교체 | OpenAI 전용 변수 (`OPENAI_API_KEY` 등) |
| `.gitignore` | 수정 | `!.env.example` 예외, `/storage/`, `*.db` 추가 |
| `package.json` | 수정 | `drizzle-orm`, `better-sqlite3`, `zod`, `drizzle-kit`, `@types/better-sqlite3`, **`openai`** 추가. `db:*` 스크립트 추가 |
| `agent-guide/{GUIDE,PROJECT,SESSION}.md` | 수정 | 모델 정책 개정 (LLM 예외), 실제 Next.js 16 구조, 커밋·전환 기록 |

#### 결정 사항 (순차)
1. **git 초기 커밋 완료**: `a14c8f4` — `feat: initial Next.js 16 scaffolding with Drizzle + LLM layer`. 브랜치 `main`, remote `https://github.com/bluemusk/smap_eng.git` 설정 (푸시 미수행)
2. **Ollama 구동 실패**: `gemma4` 아키텍처를 Ollama 0.20.5 / 0.21.0 내장 llama.cpp가 미지원 (`unknown model architecture: 'gemma4'`). Unsloth GGUF의 자체 포크 문제로 판단
3. **Ollama 완전 제거** (대표님 지시): `/Applications/Ollama.app`, `~/.ollama/` (5.7GB) 삭제. `/usr/local/bin/ollama` 심링크는 root 소유 — `sudo rm`으로 대표님 수동 처리 예정
4. **LLM 정책 개정**: TTS·이미지는 오픈모델 유지, **LLM만 OpenAI 허용**. 모델 `gpt-5.2-chat-latest` 지정
5. **LLM 레이어 재작성**: `openai` Node SDK(6.34.0) 기반 싱글톤 + `response_format: json_object` + `LLMError`. 기존 `generateStory/QuizSet/Translation` 인터페이스 그대로 유지

#### 환경
- Ollama 제거됨 (심링크 잔여)
- openai SDK 6.34.0 설치됨
- 타입체크(`tsc --noEmit`) 통과 — 0 에러

#### 현재 상태
- ✅ LLM 레이어 OpenAI 마이그레이션 완료, 문서 개정 완료
- ⏳ **대표님이 `.env.local`의 `OPENAI_API_KEY`를 실제 키로 교체 필요**
- ⏭️ **다음 착수점**: ① 키 입력 후 `generateStory({age:7, cefr:'A1'})` 스모크 테스트 → ② API 라우트 (`/api/books`, `/api/quiz`) → ③ 책장·리더 UI (shadcn/ui 설치) → ④ TTS(Kokoro) 연동 → ⑤ FLUX 연동
- ⏭️ **추가 커밋 예정**: OpenAI 전환분 (`feat: migrate LLM layer from Ollama to OpenAI`) — 대표님 승인 후 push

---

### 2026-04-20 (최종 세션)

#### 세션 목표
- OpenAI 전환 커밋 push → shadcn/ui + API 라우트 + 책장/리더/퀴즈 UI 일괄 구현

#### 변경 파일 (주요)
| 파일/경로 | 변경 유형 | 요약 |
|----------|----------|------|
| `src/components/ui/*` | 추가 (shadcn init) | 12개 (button, card, dialog, select, badge, tabs, progress, input, label, avatar, radio-group, sonner) |
| `src/lib/utils.ts` | 추가 (shadcn init) | `cn()` 유틸 |
| `src/lib/api-client.ts` | 추가 | `apiFetch<T>`, `ApiError` |
| `src/lib/db/queries.ts` | 추가 | profiles/books/passages/quizzes/readingLogs CRUD, 트랜잭션 `insertBookWithPassages` |
| `src/app/api/profiles/route.ts` | 추가 | GET/POST |
| `src/app/api/books/route.ts` | 추가 | POST(동화 생성) / GET(레벨 필터 목록) |
| `src/app/api/books/[id]/route.ts` | 추가 | GET (book + passages) |
| `src/app/api/books/[id]/quiz/route.ts` | 추가 | GET/POST (멱등 생성) |
| `src/app/api/logs/route.ts` | 추가 | POST/PATCH/GET |
| `src/app/api/_lib/errors.ts` | 추가 | Zod/LLMError/SyntaxError → HTTP 매핑 |
| `src/stores/profile.ts` | 추가 | Zustand persist 스토어 |
| `src/components/{profile-switcher,create-book-dialog,bookshelf,reader,quiz-runner}.tsx` | 추가 | UI 컴포넌트 5종 |
| `src/app/{page,book/[id]/page,quiz/[bookId]/page}.tsx` | 추가/교체 | 책장·리더·퀴즈 페이지 |
| `src/app/layout.tsx` | 수정 | 한국어 메타, Sonner Toaster |
| `package.json` | 수정 | `openai`, `zustand` 등 추가. `db:*` 스크립트 |

#### 결정 사항 (추가)
6. **shadcn/ui 엔진 Base UI 확인**: 현재 shadcn은 Radix가 아닌 `@base-ui/react` 기반. `asChild` 대신 `render` prop, 또는 `buttonVariants` 클래스 적용 패턴 사용
7. **레이어 분리 원칙**: GET은 서버 컴포넌트에서 `queries.ts` 직접 호출, 변이(POST/PATCH)는 API 라우트 통과
8. **Next.js 16 dynamic params는 `Promise<>`** — `await params` 패턴 준수 (모든 `[id]`, `[bookId]` 라우트 반영)

#### 커밋 & 푸시
- `a14c8f4` · `1ad9aca` · `6db5787` — **3 commits pushed**
- 원격은 현재 `git@github.com:beyondReal-smap/smap_eng.git` (SSH). 대표님이 remote 조정하신 것으로 추정

#### 검증
- `tsc --noEmit` 통과 (0 에러)
- `pnpm dev` → `http://localhost:3000` HTTP 200 · 컴파일 330ms
- `/api/profiles` 200 / `{"profiles":[]}` 정상

#### 현재 상태
- ✅ 책장 · 리더 · 퀴즈 UI 동작 가능 상태 (브라우저 열면 바로 테스트 가능)
- ⏳ **남은 큰 작업**: ① Kokoro TTS Python 서버 구동 + `src/lib/tts/` 프록시 (Task #13) ② FLUX.1-schnell + `src/lib/image/` (Task #14)
- 📝 **미구현 플로우**: 독서 완료 시 `/api/logs` 호출(진행률·점수 저장) — UI에 훅 추가 필요 (퀴즈 제출 시점)
- ⚠️ **참고**: 최초 1회 "새 동화 만들기" 클릭 시 OpenAI 호출 10~30초 소요 (reasoning_effort=medium 고정)

---

### 2026-04-20 (TTS/이미지 연동 세션)

#### 세션 목표
- **Kokoro TTS** + **FLUX.1-schnell 이미지** 로컬 서빙 통합

#### 변경 파일 (주요)
| 파일/경로 | 변경 유형 | 요약 |
|----------|----------|------|
| `services/tts/{requirements.txt,server.py,run.sh}` | 추가 | Python 3.10 venv + FastAPI + Kokoro 0.9.4, port 8880 |
| `services/image/{requirements.txt,server.py,run.sh}` | 추가 | Python 3.10 venv + FastAPI + mflux 0.17.5 (MLX), port 8890. `mflux-generate` CLI subprocess 호출 방식 |
| `src/lib/tts/kokoro.ts` | 추가 | Kokoro fetch 프록시 + `synthesize()` + `tts_health()` |
| `src/lib/image/flux.ts` | 추가 | FLUX 프록시 + `buildCoverPrompt()`·`buildSceneprompt()` + `generateImage()` |
| `src/app/api/tts/[passageId]/route.ts` | 추가 | POST: WAV 생성·캐싱 (`/public/audio/`) + `passages.audio_path` 갱신 |
| `src/app/api/image/book/[bookId]/cover/route.ts` | 추가 | POST: 책 표지 PNG 생성·캐싱 + `books.cover_image_path` 갱신 |
| `src/app/api/image/passage/[passageId]/route.ts` | 추가 | POST: 장면 삽화 PNG 생성·캐싱 + `passages.scene_image_path` 갱신 |
| `src/lib/db/queries.ts` | 수정 | `updatePassageAudio`, `updatePassageImage` 추가 |
| `src/components/reader.tsx` | 수정 | 🔊 낭독 버튼 활성화 + `<audio controls>` + passage별 캐시 |
| `.gitignore` | 수정 | `services/*/.venv/`, `/public/audio/`, `/public/images/` |

#### 검증
| 서비스 | 포트 | 상태 |
|--------|------|------|
| Next.js dev | 3000 | ✅ 정상 |
| Kokoro TTS | 8880 | ✅ /health OK, WAV 생성 확인 (170KB 36s 콜드) |
| FLUX image | 8890 | ✅ /health OK, mflux-generate CLI 존재 확인 (실제 생성은 첫 호출 시 ~6GB 다운로드) |
| `tsc --noEmit` | — | ✅ 0 에러 |

#### 결정 사항 (추가)
9. **로컬 스토리지 경로**: 오디오·이미지 모두 `/public/audio/`, `/public/images/`로 저장해 Next.js 정적 서빙. DB에는 웹 경로(`/audio/passage-xx.wav`, `/images/book-xx-cover.png`) 기록
10. **mflux API 변경 내성**: mflux 0.17.5는 Python API가 재구성됨(`mflux.Flux1`, `mflux.Config` 제거). `mflux-generate` CLI를 subprocess로 호출하는 방식 채택 — 향후 버전 변경에도 강건
11. **UI 리뉴얼**: 대표님이 `page/bookshelf/profile-switcher/create-book-dialog/reader/quiz-runner/book page`를 아동 친화적 디자인으로 리뉴얼(레벨 필 필터, 그래디언트 표지, `animate-*`/`press-scale`/`glass-card`/`level-*` 유틸). 기능 로직은 그대로 유지

#### 남은 작업 (다음 세션 후보)
- UI에 **이미지 생성 버튼** 통합 (Bookshelf 카드 "표지 만들기" / Reader "장면 그리기") — 현재는 API만 존재
- FLUX 첫 호출 시 모델 다운로드 진행률 UI (long-polling 또는 SSE)
- 독서 완료 시 `/api/logs` 호출 훅 (퀴즈 제출 시점) — `reading_logs` 레코드
- 프로덕션 빌드(`pnpm build`) 검증

#### 서버 기동 명령
```bash
# Kokoro TTS
bash services/tts/run.sh      # -> http://127.0.0.1:8880

# FLUX.1-schnell
bash services/image/run.sh    # -> http://127.0.0.1:8890

# Next.js dev
pnpm dev                       # -> http://localhost:3000
```

---

### 2026-04-21 (운영 전환 + UX 대개편 + B2 + vocabulary 세션)

#### 세션 목표
- 카카오 인앱 브라우저 하이드레이션 에러 대응
- 운영 모드 전환 (PM2 ecosystem production)
- 콘텐츠 난이도 상향 (B1 강화 + B2 신규 추가)
- UX/애니메이션 대개편 (키보드 네비, 자동재생, 슬라이드 전환, confetti 등)
- vocabulary 팝오버 (DB 확장 → Reader 통합)

#### 변경 파일 (주요)
| 파일/경로 | 변경 유형 | 요약 |
|----------|----------|------|
| `src/app/layout.tsx` | 수정 | `suppressHydrationWarning` on `<html>/<body>` (카카오 인앱 대응), `<ShortcutHelp />` 전역 렌더 |
| `ecosystem.config.cjs` | 수정 | `next dev` → `next start`, `NODE_ENV=production`, 포트 5027 유지 |
| `src/lib/db/schema.ts` | 수정 | `CEFR_LEVELS`에 **B2** 추가, `books.vocabulary` JSON 컬럼 추가, `VocabularyEntry` 타입 export |
| `drizzle/0001_early_lionheart.sql` | 자동 생성 | `ALTER TABLE books ADD vocabulary text` 적용 완료 |
| `src/lib/llm/prompts/story.ts` | 재작성 | A2/B1 상향, B2 신규 가이드라인(16-28단어·24-30 passage·문학적 서술), 스토리 구조(beginning/middle/end) 강제, vocabulary 5-12개 요구 |
| `src/lib/llm/schemas.ts` | 수정 | passages max 25→32, vocabulary max 15→20 |
| `src/app/globals.css` | 수정 | B2 색 토큰(light/dark), 7개 신규 키프레임(`bounce-in` `shake-no` `trophy-spin` `slide-in-left/right` `scale-breathe` `confetti-fall` `glow-soft`), `tilt-3d` 유틸, stagger 20개까지 확장 |
| `src/lib/hooks/use-keyboard-nav.ts` | 신규 | 전역 키 바인딩 훅 (input/contenteditable 자동 무시, 수정키 제외) |
| `src/components/reader.tsx` | 재작성 | 키보드(←→/Space/K), **자동재생 모드 토글(기본 OFF)**, localStorage 진행 저장, 최근 읽기 기록, 방향성 슬라이드, aria-live, kbd 표시, **vocabulary 팝오버(base-ui Popover)** |
| `src/components/quiz-runner.tsx` | 재작성 | 숫자키 1-4 답변, Enter/←→, 선택 bounce, **만점 confetti 40조각(CSS)**, 만점 트로피 스핀, B2 분기 |
| `src/components/bookshelf.tsx` | 재작성 | 정렬(최신/이름/난이도), **최근 읽기 가로 스크롤(localStorage)**, 카드 **3D 틸트(±6deg 마우스 추적)**, B2 필터 |
| `src/components/create-book-dialog.tsx` | 수정 | **B2 버튼**(4열), CEFR별 힌트 텍스트 |
| `src/components/shortcut-help.tsx` | 신규 | 우측 하단 `?` 플로팅 버튼 + 모달, 전역 `?` 단축키 |
| `src/app/api/books/route.ts` | 수정 | POST 시 `story.vocabulary`를 book에 저장 |

#### 결정 사항 (추가)
12. **카카오 인앱 WebView hydration 대응**: 인앱이 `<html>`에 `-webkit-touch-callout:none`, `<body>`에 `-webkit-text-size-adjust:100%`를 주입 → React가 mismatch 감지. 소스 미포함 확인 후 `suppressHydrationWarning`을 루트에만 적용(자식 트리 mismatch는 그대로 표면화)
13. **운영 모드 전환**: `ecosystem.config.cjs`에서 `next dev` → `next start` + `NODE_ENV=production`. Ready in 115ms, `/` 경로 prerender + `s-maxage=31536000` 확인
14. **B2 도입 방식**: SQLite text 컬럼은 CHECK constraint 없음 → `CEFR_LEVELS` 배열 확장만으로 마이그레이션 없이 호환. B2 색상은 라벤더(oklch 300° hue)로 기존 A1/A2/B1과 시각적 구분
15. **콘텐츠 난이도 철학**: 기존 B1까지 모두 "8-14 단어" 상한이라 관계절·감정묘사 담기 부족 → B1은 12-22단어로 상향, B2는 16-28단어·복합 시제·참여구·figurative language 허용. 프롬프트에 "do NOT dumb the story down" 명시 + 스토리 구조(beginning/middle/end) 필수화
16. **vocabulary 단어 매칭 전략**: 단순 lowercase 정규화 + regex `/(\w[\w'-]*)/` 토크나이즈. 복수형/시제 변화 미지원은 MVP 범위 밖 (후속 과제)
17. **자동재생 기본 OFF**: 대표님 지시. localStorage에 book별 토글 상태 저장
18. **confetti 구현**: CSS keyframe(`@keyframes confetti-fall`) 전용. 40 조각, 1.6s 후 자동 소멸. 외부 라이브러리 의존성 없음
19. **단축키 도움말 접근**: 전역 `?` 키 + 우측 하단 플로팅 버튼. RootLayout에 1곳만 마운트

#### 검증
| 항목 | 결과 |
|------|------|
| `pnpm build` | ✅ 컴파일 3.1s, tsc 3.5s, **0 에러** |
| `pnpm db:migrate` | ✅ 0001 마이그레이션 적용 완료 |
| PM2 production reload | ✅ Ready in 115ms |
| `GET /` | ✅ HTTP 200, 32KB, `x-nextjs-cache: HIT`, `x-nextjs-prerender: 1` |
| `GET /book/3` | ✅ HTTP 200 |
| `GET /quiz/3` | ✅ HTTP 200 |
| `GET /api/books?profileId=1` | ✅ JSON 정상 반환 |

#### 현재 상태
- ✅ 운영 모드로 5027 포트 서빙 중 (`pm2 status smap-eng-web`)
- ✅ 카카오 인앱 브라우저 재테스트 가능 상태
- ✅ B2 레벨 책 생성 가능 (`create-book-dialog` → B2 버튼)
- ✅ vocabulary가 있는 새 책을 생성하면 Reader에서 단어에 wavy underline, 탭 시 뜻 팝오버
- ⚠️ 기존 책(id 1-3)은 vocabulary 컬럼 NULL → Reader가 빈 Map으로 폴백, 팝오버 미표시 (정상 동작)

#### 후속 과제 (다음 세션 후보)
- **vocabulary 매칭 확장**: 복수형/과거형 변형 매칭 (간이 stemming 또는 LLM 출력에 surface forms 추가 요청)
- **PROJECT.md 레벨 체계 테이블**에 B2 행 추가
- **카카오 인앱 Web Inspector 검증**: 실기기에서 hydration 에러 소멸 확인 후 기록
- **B2 콘텐츠 생성 A/B 확인**: 실제 생성물이 지시된 복잡도를 달성하는지 샘플 확인, 필요 시 프롬프트 추가 보강

#### 재배포 명령
```bash
cd /home/jin/ai_engbook/smap_eng
pnpm build && pm2 reload ecosystem.config.cjs --update-env --only smap-eng-web
```

---

### 2026-04-21 (UI 탈AI화 P0 착수 세션)

#### 세션 목표
- Claude↔Codex 3라운드 재귀 토론으로 확정된 "AI 티 탈피 + 누락 기능" 계획(`final_report.md`) 중 **P0 10개 항목** 일괄 구현

#### 토론 산출물
`.collab-loop/ui-dehumanize/`
- `draft_v1.md` · Claude 초안 (Round 0)
- `packet_round{1,2,3}.md` + `reply_round{1,2,3}_codex.md` · 3라운드 왕복
- `final_report.md` · 최종 합의안 (하이브리드-lite 방향)
- `decision_log.md` · 결정·보류·리스크

#### 변경 파일 (주요)
| 파일/경로 | 변경 | 요약 |
|----------|------|------|
| `src/app/globals.css` | 수정 | 팔레트 재정의(story gold + off-blue ink), 레벨 hue 충돌 해소(A2 82→220 blue), dot 이중 인코딩 유틸 추가, 배경 radial orb 제거 + SVG noise 3%, glass-card 유틸 제거, `prefers-reduced-motion` 확장 |
| `src/app/page.tsx` | 재작성 | Hero/FloatingBooks/LevelGuide + "오늘의 추천 레벨·A1" 하드코딩 완전 제거 → HomeGreeting + Bookshelf 미니멀 구성 |
| `src/components/home-greeting.tsx` | 신규 | 프로필 이름 기반 인삿말 ("○○야, 오늘 뭐 읽을까?") |
| `src/components/cover-art.tsx` | 신규 | Seeded SVG 3종 템플릿(풍경/탈것/생물) × 6 팔레트 = 18 변주. 이모지 커버 대체 |
| `src/components/book-card-menu.tsx` | 신규 | 카드 우하단 ⋯ 메뉴: 제목 수정/표지 되돌리기/책장에서 치우기(soft delete) |
| `src/components/bookshelf.tsx` | 재작성 | 검색바(q 파라미터, 200ms debounce), `tilt-3d` 제거, 이모지 상수 제거→CoverArt, LevelBadge + dot 인코딩, BookCardMenu 통합 |
| `src/components/reader.tsx` | 수정 | 완료 CTA `variant='complete'`로 변경, blur orb 2개 제거, 버튼 이모지(🔊/🖼️/⏸️) 제거, 레벨 배지 dot 인코딩 |
| `src/components/quiz-runner.tsx` | 수정 | 제출 CTA `variant='complete'`, ScoreHeader 그라디언트 배경 제거, glass-card 제거, dot 인코딩 |
| `src/components/create-book-dialog.tsx` | 수정 | 생성 CTA 그라디언트→solid primary, 이모지(✨) 제거 |
| `src/components/profile-switcher.tsx` | 수정 | SelectTrigger glass-card 제거 |
| `src/app/book/[id]/page.tsx` | 수정 | 빈 상태 glass-card + 📭 이모지 제거 |
| `src/components/ui/button.tsx` | 수정 | `complete` variant 추가(완료 CTA 전용 그라디언트, 화면당 1개 규칙) |
| `src/lib/db/schema.ts` | 수정 | `books.deletedAt` 컬럼 추가 |
| `drizzle/0002_minor_bullseye.sql` | 자동 생성 | `ALTER TABLE books ADD deleted_at integer` — 적용 완료 |
| `src/lib/db/queries.ts` | 수정 | `listBooks`에 `deletedAt IS NULL` 필터 + `q` 검색 파라미터, `updateBook`, `softDeleteBook` 추가 |
| `src/app/api/books/route.ts` | 수정 | `ListBooksQuery.q` 스키마 추가 |
| `src/app/api/books/[id]/route.ts` | 재작성 | PATCH(title/topic/coverImagePath=null) + DELETE(soft) 추가 |

#### 결정 사항 (3라운드 토론 요약)
1. **시각 방향**: 하이브리드-lite (Storybook 종이형 베이스 + AI-forward 선택권 이식)
2. **팔레트**: 1 primary(story gold) + 1 accent(off-blue ink) + semantic 4종. 메인 컬러 1개 축소 제안은 철회
3. **레벨 hue**: A2 82→220 blue로 primary 충돌 해소. 색 + dot/mark 이중 인코딩으로 색맹 대응
4. **모션**: 화면당 장식 모션 최대 1개(shimmer/Lottie 포함). `prefers-reduced-motion`에서 의미 모션(bounce/shake/confetti)도 축소
5. **CTA 그라디언트**: `complete` variant 1종으로 제한. 완료 CTA에만 사용
6. **이모지**: 커버/CTA/네비게이션에서 제거. 결과 화면의 🏆🎉💪는 보상 맥락으로 gray zone 허용(추후 SVG 스티커로 대체 예정)
7. **스트릭 폐기**: 아동 앱 dark pattern 우려. 대신 "이번 주 읽은 날" 캘린더(P1)
8. **즉시 피드백 P1 강등**: 2026 Educational Psychology Review 메타분석 근거(타이밍보다 일관성)
9. **COPPA 3단 게이팅**: Level-1(PIN+안내)=P1 / Level-2(VPC 방식 확정)=P2 선결 / Level-3=MVP 밖
10. **커버 재생성 P1 강등**: P0에는 "커버 제거(폴백 복귀)"만 포함. FLUX 재호출은 P1
11. **일러스트 MVP**: Seeded SVG 3종 템플릿으로 20권까지 감당. P1에서 6종, 최종 10~12종

#### 검증
| 항목 | 결과 |
|------|------|
| `pnpm db:generate` + `db:migrate` | ✅ 0002 마이그레이션 적용 |
| `pnpm build` | ✅ 컴파일 3.2s + tsc 3.6s, 0 에러 |
| PM2 production reload | ✅ Ready |
| `GET /` / `/book/1` / `/quiz/1` | ✅ 모두 HTTP 200 |
| `GET /api/books?profileId=1&q=space` | ✅ 정상 필터 |
| `DELETE /api/books/3` + 목록 재조회 | ✅ 3권→2권 (soft delete 확인 후 DB 복원) |
| `PATCH /api/books/1 {title}` | ✅ 정상 반영 |
| `grep bg-clip-text` | ✅ 0건 (타이틀 그라디언트 완전 제거) |
| `grep glass-card` | ✅ 0건 (유틸 정의까지 삭제) |
| verifier 점검 | ✅ 10/10 P0 항목 반영, 회귀 위험 없음 |

#### 현재 상태
- ✅ P0 데이터 위생 10개 항목 모두 완료, 프로덕션 반영 중 (port 5027)
- ✅ 기존 책 3권(id 1~3) 데이터 보존, deleted_at NULL 상태
- ⏭️ **P1 착수점**:
  1. LearningSummary 컴포넌트 (reading_logs 집계)
  2. 단어장 `/vocab` + 플래시카드
  3. 보호자 모드 `/parents` + PIN (Level-1 COPPA)
  4. 따라 읽기 로컬 녹음 (MediaRecorder + IndexedDB)
  5. 퀴즈 즉시 피드백 토글
  6. 4단계 생성 진행 UI (스트리밍 대체)
  7. 이번 주 흔적 캘린더 (스트릭 대체)
- ⚠️ **알려진 gray zone** (후속 처리):
  - 결과 화면 이모지 🏆🎉💪 → SVG 스티커 3종으로 대체 (P1 후반)
  - `BookCardMenu`의 `window.confirm()` → 커스텀 Dialog로 대체 (모바일 UX)

---

### 2026-04-21 (P1 학습 루프 7개 일괄 착수 세션)

#### 세션 목표
- `final_report.md` §P1에서 합의된 "학습 루프" 7개 항목을 순서대로 구현

#### 변경 파일 (신규 10 + 수정 6)
| 파일/경로 | 변경 | 요약 |
|----------|------|------|
| `src/app/api/learning-summary/route.ts` | 신규 | reading_logs 집계 API |
| `src/app/api/vocab/route.ts` | 신규 | 프로필별 vocabulary 펼침 API |
| `src/app/api/parents/report/route.ts` | 신규 | 전체 프로필 주간 리포트 집계 |
| `src/app/vocab/page.tsx` | 신규 | 단어장 진입 페이지 |
| `src/app/parents/page.tsx` | 신규 | 보호자 모드 진입 페이지 (PIN Gate) |
| `src/components/learning-summary.tsx` | 신규 | 홈 Hero: 인삿말 + 3개 지표 + 이어 읽기 + 주간 흔적 |
| `src/components/vocab-deck.tsx` | 신규 | 플래시카드 (앞/뒤 뒤집기·셔플, 키보드 Space/←/→/S) |
| `src/components/parental-pin.tsx` | 신규 | PIN 설정/입력 게이트 |
| `src/components/weekly-report.tsx` | 신규 | 프로필별 주간 리포트 카드 |
| `src/components/read-aloud-recorder.tsx` | 신규 | MediaRecorder + IndexedDB 로컬 녹음 |
| `src/components/generation-progress.tsx` | 신규 | 4단계 pseudo-progress UI |
| `src/lib/hooks/use-parental-pin.ts` | 신규 | PIN SHA-256+salt 해시 + 30분 TTL |
| `src/lib/hooks/use-voice-consent.ts` | 신규 | 녹음 동의 localStorage |
| `src/lib/voice/indexeddb.ts` | 신규 | 녹음 Blob IndexedDB 저장소 |
| `src/lib/db/queries.ts` | 수정 | `getLearningSummary` (activeDaysThisWeek 포함), `getParentalReport`, `listVocabularyByProfile` 추가 |
| `src/app/page.tsx` | 수정 | HomeGreeting → LearningSummary, /vocab·/parents 네비 링크 |
| `src/components/reader.tsx` | 수정 | ReadAloudRecorder 통합 |
| `src/components/quiz-runner.tsx` | 수정 | ImmediateToggle + 즉시 피드백 분기 + GeneratingState 이모지→Lucide |
| `src/components/create-book-dialog.tsx` | 수정 | GenerationProgress 통합 |
| `src/components/vocab-deck.tsx` | 보강 | focus-visible 포커스 링 추가 |

#### 결정 사항 (추가)
19. **P1-1 LearningSummary 구조**: Hero 인삿말 + 3개 지표(읽은 책/만점/평균 정답률) + 이어 읽기 + 주간 흔적 캘린더를 **한 컴포넌트**로 통합. `home-greeting.tsx` 흡수
20. **P1-2 단어장 플래시카드**: SRS(간격 반복)는 P2로 미룸. MVP는 누적 단어장 + 앞/뒤 뒤집기 + 셔플만. 단어 중복 dedupe(word+meaning 키)
21. **P1-3 보호자 PIN**: 4자리 + SHA-256+salt 해시 + localStorage. 30분 세션 TTL. PIN 분실 시 reset 경로 제공. **COPPA Level-1** "아이 실수 진입 방지" 수준임을 UI에 명시
22. **P1-4 녹음 안전장치**: 서버 업로드 경로 **0개 구현** + `NEXT_PUBLIC_ENABLE_VOICE_UPLOAD=false` 기본 플래그 + 최초 1회 보호자 PIN+동의 Dialog. 30초 녹음 상한. IndexedDB에만 저장
23. **P1-5 즉시 피드백 기본값 OFF**: 2026 Edu Psych Review 메타분석 근거(타이밍보다 일관성 우선). 아이의 인지 부하를 고려한 기본값. localStorage 유지
24. **P1-6 4단계 pseudo-progress**: 토큰 스트리밍이 아닌 클라이언트 시간 기반 가짜 진행률. Codex Round 2 지적(스키마 미검증 누출 위험) 대응. 95% 상한에서 대기 → 실응답 시 이동
25. **P1-7 캘린더**: 숫자 streak/압박 카피 절대 금지. 최근 7일 그리드에 활동 있는 날만 색칠. 오늘은 점선 테두리로 구분

#### 검증
| 항목 | 결과 |
|------|------|
| `pnpm build` (3회) | ✅ 0 에러 |
| PM2 reload | ✅ Ready |
| `GET /` · `/book/1` · `/quiz/1` · `/vocab` · `/parents` | ✅ 전부 HTTP 200 |
| `/api/learning-summary?profileId=1` | ✅ `activeDaysThisWeek: ["2026-04-21"]` 반환 |
| `/api/vocab?profileId=1` | ✅ 0건 (기존 책 vocabulary NULL, 빈 상태 UI 정상) |
| `/api/parents/report` | ✅ 프로필별 주간 집계 정상 |
| verifier 점검 | ✅ 7/7 구현, 치명 이슈 없음 |

#### 현재 상태
- ✅ P1 학습 루프 7개 전부 완료, 프로덕션 반영 중 (port 5027)
- ✅ 헤더에 `/vocab`·`/parents` 네비 링크 (데스크톱)
- ⏭️ **P1 잔여** (이번 세션 범위 밖):
  - P1-8: 커버 재생성 (FLUX 재호출 + 진행/취소/재시도)
  - P1-10: 다크 모드 토글 + 글자 크기 조절
  - (P1-9 Seeded SVG 3종은 P0-6 커버 제거 작업에서 `cover-art.tsx`로 미리 구현됨)
- ⏭️ **P2 선결 조건**:
  - 발음 점수화(Whisper/ASR) 도입 전 **FTC VPC 가이드 법무 검토** 필수
  - `NEXT_PUBLIC_ENABLE_VOICE_UPLOAD` 플래그는 설계상 가드만 존재, 실제 업로드 코드는 아직 없음

---

### 2026-04-21 (P1-8·P1-10 이어가기 세션)

#### 세션 목표
- 이전 P1 7개(P1-1 ~ P1-7) 완료 후 남은 P1 잔여 항목 마무리:
  - P1-8 커버 재생성 (FLUX 재호출)
  - P1-10 다크 모드 토글 + Reader 글자 크기 조절

#### 변경 파일
| 파일 | 변경 | 요약 |
|------|------|------|
| `src/app/api/image/book/[bookId]/cover/route.ts` | 수정 | body `{"force":true}` 지원. seed 를 `(bookId+now)&0x7fffffff` 로 전환해 동일 책이라도 다른 결과 생성. 응답에 `regenerated` 플래그 |
| `src/components/book-card-menu.tsx` | 수정 | IMAGE_GEN_ENABLED 분기 + "표지 다시 만들기" 메뉴. AbortController로 취소 지원 토스트 액션 |
| `src/components/theme-provider.tsx` | 신규 | next-themes 래퍼 (`attribute="class"` · `defaultTheme="system"` · `disableTransitionOnChange` · `storageKey="smap-eng.theme"`) |
| `src/components/theme-toggle.tsx` | 신규 | Lucide Sun/Moon/Monitor 3단 라디오 토글 |
| `src/app/layout.tsx` | 수정 | `<ThemeProvider>`로 앱 전역 감싸기 |
| `src/app/page.tsx` | 수정 | 헤더에 `<ThemeToggle />` 추가(`md:block`) |
| `src/components/reader.tsx` | 수정 | `FontSize` 타입 + `PASSAGE_FONT_CLASS` 3단 + localStorage `reader:font-size` 복원/저장. 헤더에 `<FontSizePicker>` (sm/md/lg) |

#### 결정 사항 (추가)
26. **커버 재생성 취소 UX**: `toast.loading({ action: { label: '취소', onClick: abort } })` + AbortController. 모델 로드로 30~60초 이상 걸릴 수 있어 취소 액션 필수
27. **재생성 seed 전환**: 기존 seed=bookId는 재현성에는 좋지만 재생성에는 동일 결과 반환. `(bookId + Date.now()) & 0x7fffffff` 로 변경해 호출마다 seed 달라짐
28. **테마 저장소 키 분리**: `smap-eng.theme` — 프로필(`smap-eng.current-profile`)과 네임스페이스 정합
29. **글자 크기 스코프**: `body` CSS 변수가 아닌 Reader 내부 `<p className>` 에만 영향. 다른 페이지 레이아웃은 건드리지 않음
30. **모바일 접근성**: ThemeToggle은 `md:block`로 숨김, FontSizePicker는 `sm:inline-flex`로 노출 — 화면 폭에 따라 우선순위 차등

#### 검증
| 항목 | 결과 |
|------|------|
| `pnpm build` (2회) | ✅ 0 에러 |
| PM2 reload | ✅ Ready |
| `GET /`·`/book/1`·`/quiz/1`·`/vocab`·`/parents` | ✅ HTTP 200 |
| HTML에 next-themes 인라인 스크립트 확인 | ✅ `localStorage.getItem("smap-eng.theme")` 로드 |

#### 현재 상태
- ✅ P1 학습 루프 **10/10 완료** (P1-1 ~ P1-10). P0 + P1 전체 `final_report.md` 합의 사항 반영 완료
- ⏭️ **P2 진입 조건** (다시 확인):
  1. 발음 점수화(Whisper/ASR) — FTC VPC 가이드 법무 검토 선행
  2. 단어장 SRS(간격 반복) — 현 플래시카드 확장
  3. 엔딩 분기(A/B 선택) — 생성 프롬프트·스키마 수정 필요
  4. PWA + 오프라인 재독 — manifest + service worker
  5. AI 생성물 신고/숨김 — 부적절 콘텐츠 플래그
  6. 일러스트 6→10~12종 확장

---

### 2026-04-21 (P2 착수 세션 — 1번 제외 5/6 완료)

#### 세션 목표
- 대표님 지시로 P2-1(발음 점수화/VPC)은 제외. 나머지 P2-2 ~ P2-6 순서대로 구현.

#### 변경 파일 (신규 7 + 수정 10 + 마이그레이션 2)
| 파일/경로 | 변경 | 요약 |
|----------|------|------|
| `src/lib/srs.ts` | 신규 | Leitner 스타일 SRS 엔진. localStorage 네임스페이스 `srs:${profileId}`. 4-레벨 간격(5분/1일/3일/7일) |
| `src/components/vocab-deck.tsx` | 재작성 | 탭 2개(오늘 복습/전체), 3단계 평가 버튼(몰라·조금·알아), 숫자키(1/2/3) 단축키, "몰라" 시 덱 끝으로 이동 |
| `src/lib/db/schema.ts` | 수정 | `books.alternateEnding` JSON + `AlternateEnding/EndingPassage` 타입. `books.flaggedAt`/`flaggedReason` |
| `drizzle/0003_bumpy_joshua_kane.sql` · `0004_boring_lester.sql` | 자동 생성 | 위 컬럼 4개 마이그레이션 |
| `src/lib/llm/schemas.ts` | 수정 | `alternateEnding` optional 필드 추가 (labelA/B + passagesA/B 각 2~4개) |
| `src/lib/llm/prompts/story.ts` | 수정 | "ALTERNATE ENDINGS" 지시 + JSON shape 업데이트. 메인 passages는 choice point에서 중단, 두 결말은 별도 필드 |
| `src/app/api/books/route.ts` | 수정 | `story.alternateEnding`을 book에 저장 |
| `src/components/reader.tsx` | 수정 | `branch` state + localStorage `reader:branch:${bookId}`. 공통 passage 마지막에 ChoiceDialog. 엔딩 모드에선 TTS/이미지/녹음 비활성 |
| `public/manifest.webmanifest` · `icon.svg` · `icon-maskable.svg` · `sw.js` | 신규 | PWA 구성 (standalone/theme-color/maskable icon). SW는 정적=cache-first, 미디어=cache-first, API/페이지=network-first |
| `src/components/pwa-register.tsx` | 신규 | dev에선 SW 등록 해제, production에서만 `/sw.js` 등록 |
| `src/app/layout.tsx` | 수정 | `viewport.themeColor`, `metadata.manifest`, `appleWebApp`, `<PwaRegister />` 마운트 |
| `src/lib/db/queries.ts` | 수정 | `flagBook`, `unflagBook`, `listFlaggedBooksByProfile`. `listBooks`에 `flaggedAt IS NULL` 필터. `getParentalReport`에 `flaggedBooks` 필드 추가 |
| `src/app/api/books/[id]/flag/route.ts` | 신규 | POST(reason) / DELETE(철회) |
| `src/components/book-card-menu.tsx` | 수정 | "이 책 신고하기" 메뉴 + Dialog (사유 4종 라디오 + 상세 입력) |
| `src/components/weekly-report.tsx` | 수정 | `FlaggedList` 섹션 추가. "책장으로" 복원 + "완전 삭제" 버튼 |
| `src/components/cover-art.tsx` | 수정 | 3종 → **10종** 템플릿(landscape/vehicle/creature/castle/underwater/garden/night-sky/forest-path/balloon/kite) × 6 팔레트 = 60 조합 |

#### 결정 사항 (추가)
31. **SRS MVP**: 서버 저장 없이 localStorage 전용. 프로필 간 네임스페이스 분리. "몰라" 선택 시 덱 끝으로 보내 같은 세션에서 즉시 재학습 가능
32. **엔딩 분기 데이터 모델**: `passages` 테이블은 건드리지 않고 `books.alternate_ending` JSON에 embed. 장점: 기존 책 완전 하위 호환, 마이그레이션 1줄. 단점: 엔딩 passage엔 TTS/이미지 생성 불가 (설계 수용)
33. **엔딩 Reader UX**: 마지막 공통 passage "다음" 클릭 시 진행 대신 ChoiceDialog. A/B 선택 → branch=X, idx=commonCount. `reader:branch:${bookId}` localStorage에 선택 저장 → 같은 책 재진입 시 유지. "다른 결말 보기" 버튼으로 리셋 가능
34. **SW 전략**: 정적=cache-first / 미디어(/audio·/images)=cache-first / API & 페이지=network-first + 폴백. 오디오/이미지 캐시가 오프라인 재독의 핵심. Workbox 미도입(직접 95줄)
35. **PWA 아이콘**: PNG 래스터 대신 `image/svg+xml` (any + maskable 분리). iOS 홈화면 추가 호환을 위해 `appleWebApp.capable=true`
36. **신고 정책**: 신고된 책은 일반 책장에서 즉시 숨김(`flaggedAt IS NOT NULL` 제외). 보호자 모드에서만 리스트로 확인 + 철회/완전 삭제. Reader 직접 접근은 차단하지 않음(읽던 책 잠금은 UX 과함)
37. **신고 사유**: 4종 라디오(부정확/부적절/무서움/기타) + 상세 입력 80자. 라벨 + 상세를 " — "로 조인해 `flaggedReason`에 단일 문자열 저장

#### 검증
| 항목 | 결과 |
|------|------|
| `pnpm build` (5회) | ✅ 0 에러 |
| `pnpm db:generate` + `db:migrate` | ✅ 0003, 0004 적용 |
| PM2 reload | ✅ Ready |
| `GET /`·`/book/1`·`/quiz/1`·`/vocab`·`/parents` | ✅ 전부 HTTP 200 |
| `GET /manifest.webmanifest` · `/sw.js` · `/icon.svg` | ✅ 200 |
| `POST /api/books/1/flag` → `GET /api/parents/report` | ✅ flagged 1권 반영 |
| `DELETE /api/books/1/flag` | ✅ 철회, 책장 복귀 |
| 엔딩 분기 Reader 로직 TS | ✅ 0 에러 (branch/endingIdx/isEndingStep) |
| SRS 평가 버튼 키보드(1/2/3) | ✅ 동작 |

#### 현재 상태
- ✅ **P2 5/6 완료** (P2-2 ~ P2-6). P2-1(발음 점수화/VPC)은 대표님 지시로 제외
- ✅ `final_report.md`의 **모든 P0+P1 범위 + P2 음성 제외 범위 전량 반영**
- 📝 엔딩 분기는 **새로 생성하는 책부터** 적용됨 (기존 책 3권은 `alternateEnding=null`이라 분기 없음 — 정상 하위 호환)
- 📝 PWA 설치 프롬프트는 HTTPS에서만 노출됨 (localhost 또는 프로덕션 도메인에서 테스트 가능). PM2 dev의 HTTP 환경에선 SW 등록까지만 동작
- ⏭️ 다음 세션 후보:
  - 실기기 PWA 설치 검증(iOS Safari / Android Chrome)
  - 엔딩 분기 생성 품질 A/B 확인 (실제 새 책 1~2권 생성해 프롬프트 충실도 관찰)
  - 신고 플로우 e2e 확인 (책장 → 카드 메뉴 → 신고 → 보호자 확인 → 철회)

---

### 2026-04-28 (web↔mobile parity P0 — Reader 강화 마무리)

#### 세션 목표
- `.claude/plans/web-mobile-parity-plan.md` Phase 0 (Reader 강화) 완료 검증
  - 자동재생, 진행 복원, 백그라운드 TTS 프리페치, vocabulary 팝오버, 글자 크기 3단계, 좌우 스와이프, unmount keepalive 진행률 저장
- 끊겼던 세션을 이어 신규 훅/컴포넌트 검증 게이트(tsc / build / lint) 통과까지 마무리

#### 변경 파일 (Phase 0 결과물)
| 파일 | 변경 | 요약 |
|------|------|------|
| `apps/mobile/src/app/books/[bookId].tsx` | 재작성 | hydration 가드(`didHydrateRef`) + activeIndex/autoplay/fontSize 복원 + GestureDetector + ReaderProgress + PassageText/FontSizePicker 통합 + unmount keepalive PATCH |
| `apps/mobile/src/components/books/audio-button.tsx` | 재작성 | `onEnded`/`autoPlayOnLoad` prop, `didJustFinish` 1회 가드(`lastFinishedRef`), url별 자동재생 가드(`autoPlayedUrlRef`) |
| `apps/mobile/src/components/books/passage-text.tsx` | 신규 | 토큰 분할 + Pressable + Modal 팝오버. `buildVocabMap` 정규화 |
| `apps/mobile/src/components/books/font-size-picker.tsx` | 신규 | 3단계 라디오, accessibilityRole='radio' |
| `apps/mobile/src/components/books/reader-progress.tsx` | 신규 | 진행 게이지 + 카운터 + `🎙️ 낭독 준비 N/M` 배지 |
| `apps/mobile/src/hooks/use-reader-progress.ts` | 신규 | SecureStore(앱)/localStorage(웹) 양쪽 영속화, FontSize 전역 키 |
| `apps/mobile/src/hooks/use-background-tts.ts` | 신규 | 직렬 합성 + 라운드 실패 추적 + `BACKGROUND_TTS_GAP_MS=1500` / `RETRY_MS=10000` (웹과 동일) |
| `apps/mobile/src/hooks/use-pan-navigation.ts` | 신규 | `Gesture.Pan()` + `activeOffsetX[-10,10]` + `failOffsetY[-20,20]` + `runOnJS` 콜백 |

#### 결정 사항 (추가)
38. **상태 키 컨벤션**: 신규 키는 모바일 컨벤션(`reader.progress.${bookId}`, `reader.autoplay.${bookId}`, `reader.fontSize`)으로 통일. 웹의 콜론 구분 키는 호환성을 위해 유지(공존)
39. **자동재생 가드**: `didJustFinish`가 Android에서 다음 status update까지 true 유지될 수 있어 `lastFinishedRef`로 1회만 트리거. 같은 url에 자동재생 1회만 보장하기 위해 `autoPlayedUrlRef` 추가
40. **vocab 팝오버 형태**: 웹의 inline Popover.Root 대신 RN에서는 화면 중앙 Modal 카드 — 토큰별 anchor 측정 비용 회피
41. **세로 스크롤 충돌 회피**: `activeOffsetX[-10,10]` + `failOffsetY[-20,20]`로 가로 의도와 세로 의도를 분리. 결말 선택(마지막 passage)에서는 swipeEnabled=false로 실수 방지

#### 검증
| 항목 | 결과 |
|------|------|
| `cd apps/mobile && npx tsc --noEmit` | ✅ 0 에러 |
| `cd apps/mobile && pnpm lint` | ✅ 0 errors / 0 warnings (Array<T>·미사용 import 2건 정리 후) |
| 루트 `pnpm build` (웹) | ✅ Compiled successfully in 23.0s, static pages 24/24 |
| `[book-page diag]` 잔존 검색 | ✅ 0건 (이전 세션에서 이미 정리됨) |

#### 현재 상태
- ✅ Phase 0 (P0) 코드 게이트 4종 모두 통과 — `tsc / lint / web build / 디버그 로그 정리`
- ⏳ **수동 시나리오 검증 미수행** (대표님 디바이스 필요): 자동재생 5문장 연속, 앱 종료-재진입 위치 복원, 좌우 스와이프, 길게 누르기 vocab 팝오버, 새 책 생성 직후 백그라운드 TTS 채움
- ⏭️ **다음 후보**: `web-mobile-parity-plan.md` Phase 1 (퀴즈 즉시피드백 + 게임화) — `apps/mobile/src/app/quiz/[bookId].tsx` 재작성, confetti, expo-haptics

#### 게이트 미해결 항목
- [ ] iOS 시뮬레이터/실기기에서 자동재생 5문장 연속 동작 확인
- [ ] Android에서 `didJustFinish` 무한루프 없음 확인
- [ ] 앱 종료 → 재진입 시 마지막 위치/autoplay/fontSize 복원
- [ ] 새 책 30~60초 내 모든 passage `audio_path` 채워짐 관찰

---

### 2026-04-28 (web↔mobile parity P1 — 퀴즈 즉시피드백 + 게임화)

#### 세션 목표
- `web-mobile-parity-plan.md` Phase 1 완료
- 모바일 퀴즈를 웹과 동일한 카드형 1문항 흐름으로 재구성: 진행도 바, 즉시 피드백 토글, 햅틱, 만점 confetti, 첫 진입 안내 배너

#### 변경 파일 (신규 2 + 수정 2)
| 파일 | 변경 | 요약 |
|------|------|------|
| `apps/mobile/src/components/quiz/score-header.tsx` | 신규 | 만점 트로피 1회 회전(Reanimated `withTiming` 360deg), 점수, 진행 게이지 |
| `apps/mobile/src/components/quiz/confetti-burst.tsx` | 신규 | Reanimated 4 자체 구현, 24 pieces, 1.6s 자동 소멸. 외부 라이브러리 없음 |
| `apps/mobile/src/app/quiz/[bookId].tsx` | 재작성 | 1문항 카드형 + idx state + immediate 토글 + 햅틱(`expo-haptics` Success/Warning) + 만점 ConfettiBurst + 첫 진입 1회 안내 배너 + 결과 화면 상세 리뷰 |
| `apps/mobile/package.json` | 수정 | `expo-haptics ~55.0.14` 추가 |

#### 결정 사항 (추가)
42. **Confetti 라이브러리 선택**: 외부 라이브러리(`react-native-fast-confetti` 등) 미사용. **Reanimated 4 자체 구현** 채택 — 웹의 CSS keyframes 정책과 일관, 번들 사이즈/유지보수 부담 최소화. 24 pieces / 1.6s 자동 소멸은 웹과 동일 정책
43. **즉시 피드백 자동 진행**: ON일 때 정답 + 마지막 문제가 아니면 900ms 후 자동으로 다음 문제로(`AUTO_ADVANCE_DELAY_MS`). 오답이면 정답 셀이 강조되고 explanation 표시, 자동 진행 없음
44. **상태 키 컨벤션**: 모바일 퀴즈 키는 점 구분 — `quiz.immediate-feedback`, `quiz.intro.seen` (웹 `quiz:immediate-feedback`와 호환되지 않지만 의도된 분리, 디바이스별 설정)
45. **첫 진입 안내**: 토스트 인프라 없이 dismissible 배너로 처리. SecureStore `quiz.intro.seen='1'` 저장 시 영구 비표시. 회귀 위험(기존 사용자가 흐름 변경에 당황)을 1회 안내로 흡수
46. **햅틱 noop 가드**: `expo-haptics`는 web에서 `notificationAsync` 미지원 → `Platform.OS === 'web'` 조기 반환으로 console 경고 없이 통과
47. **결과 화면 트로피 회전**: Reanimated `withRepeat(withTiming(360, 900ms), 1, false)`로 1회 360deg 회전 후 정지. 웹 `animate-trophy` 대응

#### 검증
| 항목 | 결과 |
|------|------|
| `cd apps/mobile && npx tsc --noEmit` | ✅ 0 에러 |
| `cd apps/mobile && pnpm lint` | ✅ 0 errors / 0 warnings |
| 루트 `pnpm build` (웹) | ✅ Compiled successfully in 19.3s, static pages 24/24 |

#### 현재 상태
- ✅ Phase 1 (P1) 코드 게이트 3종 모두 통과 — `tsc / lint / web build`
- ⏳ **수동 시나리오 검증 미수행** (대표님 디바이스 필요): iOS/Android confetti 렌더, 햅틱 발화, 즉시 피드백 ON에서 정답 자동 진행, 첫 진입 안내 1회 표시 후 영구 비표시
- ⏭️ **다음 후보**: Phase 2 (보호자 PIN + 표지 재생성 노출 + vocab 깜빡임 수정) — 4개 파일 수정 예정 (`apps/mobile/src/components/parents/pin-gate.tsx`, `lib/parental-pin.ts`, `app/parents.tsx`, `components/books/book-manage-card.tsx`, `app/vocab.tsx`)

#### 게이트 미해결 항목 (Phase 1)
- [ ] iOS confetti 정상 렌더 (24 pieces 모두 화면 안에 들어오는지)
- [ ] Android confetti 동시 24개 애니메이션 프레임 드롭 없는지
- [ ] 정답 시 햅틱 Success / 오답 시 Warning 발화 확인
- [ ] 첫 진입 안내 배너 한 번만 표시 후 SecureStore에 저장
- [ ] 즉시 피드백 ON에서 정답 → 900ms 자동 다음 문제 동작

---

### 2026-04-28 (web↔mobile parity P2 — 보호자 PIN + 단어장 깜빡임 수정)

#### 세션 목표
- `web-mobile-parity-plan.md` Phase 2 완료
- 보호자 화면을 웹과 동일하게 PIN 게이트로 차단(COPPA Level-1) + 프로필 전환 시 단어장 잔상 제거
- 표지 재생성 버튼은 이미 구현되어 있어 이번 단계에서는 제외 (`book-manage-card.tsx` 기존 `regenerateBookCover()` 그대로 사용)

#### 변경 파일 (신규 2 + 수정 2)
| 파일 | 변경 | 요약 |
|------|------|------|
| `apps/mobile/src/lib/parental-pin.ts` | 신규 | `useParentalPin` 훅 — `expo-secure-store` + `expo-crypto` SHA-256 + 30분 TTL. 웹 훅과 API 동일 |
| `apps/mobile/src/components/parents/pin-gate.tsx` | 신규 | `<ParentalPinGate>` — 4자리 PIN 설정/검증/초기화 UI, 잠금 해제 후 children 렌더 + "지금 잠그기" 바 |
| `apps/mobile/src/app/parents.tsx` | 수정 | 기존 화면을 `ParentsContent`로 분리, default `ParentsScreen`은 `Screen → ParentalPinGate → ParentsContent` 래핑 |
| `apps/mobile/src/app/vocab.tsx` | 수정 | `loadDeck()` 시작부에 `setEntries([])` + `setIdx(0)` + `setFlipped(false)` + `setAudioPath(null)` 추가 — 프로필 전환 시 직전 카드 잔상 제거 |

#### 결정 사항 (추가)
48. **PIN 저장소 선택**: `expo-secure-store` (네이티브 Keychain/Keystore) + Web 빌드에서는 `localStorage`. 디바이스 단위 보관, 서버 동기화 없음 — COPPA Level-1 정책상 충분, VPC 아님
49. **PIN 해시**: `expo-crypto` SHA-256 + salt (`smap-eng:parental-pin:v1`). 포맷 접두사 `sha256:`. 웹 빌드에서 SubtleCrypto 실패 시 `xor:base64` fallback (웹 훅과 동일 정책)
50. **저장 키 분리**: 모바일 `smap_eng.parental_pin.v1` vs 웹 `parental-pin:hash` — 디바이스별 독립 잠금. 동일 사용자라도 웹/모바일 PIN을 따로 설정해야 함(의도된 분리)
51. **세션 TTL**: 잠금 해제 후 30분 후 자동 잠금 (웹과 동일 `UNLOCK_TTL_MS = 30 * 60 * 1000`)
52. **PIN 게이트 UX**: 토스트 미사용 — RN `Alert.alert`로 에러/초기화 확인. PrimaryButton 재사용으로 폴리시 일관
53. **단어장 깜빡임 fix 정책**: `setLoading(true)` 직전에 `entries`/`idx`/`flipped`/`audioPath` 즉시 비움 — 이전 프로필의 카드가 잠깐 보이는 문제 차단. fetch 성공 후 한 번 더 동일 값 setter가 호출되지만 idempotent
54. **표지 재생성(plan에는 있던 항목)**: `book-manage-card.tsx`에 이미 `regenerateBookCover()` + "표지 다시" 버튼 구현 확인 — Phase 2 작업 범위에서 제외

#### 검증
| 항목 | 결과 |
|------|------|
| `cd apps/mobile && npx tsc --noEmit` | ✅ 0 에러 |
| `cd apps/mobile && pnpm lint` | ✅ 0 errors / 0 warnings |
| 루트 `pnpm build` (웹) | ✅ Compiled successfully (정적 페이지 동일하게 생성됨) |

#### 현재 상태
- ✅ Phase 2 (P2) 코드 게이트 3종 모두 통과 — `tsc / lint / web build`
- ⏳ **수동 시나리오 검증 미수행** (대표님 디바이스 필요): PIN 설정/검증/초기화, 30분 자동 잠금, 프로필 전환 시 단어장 잔상 미발생, "지금 잠그기" 동작
- ⏭️ **다음 후보**: Phase 3 (`web-mobile-parity-plan.md` 참조) — 잔여 작업 항목 확인 후 착수

#### 게이트 미해결 항목 (Phase 2)
- [ ] PIN 미설정 → 4자리 입력 + 일치 확인 후 보호자 화면 진입
- [ ] PIN 설정 후 잠금 상태에서 4자리 입력 → 통과
- [ ] 30분 후 자동 잠금 (또는 "지금 잠그기" 즉시 잠금)
- [ ] PIN 초기화 시 Alert 확인 + 재설정 흐름
- [ ] 프로필 전환 시 단어장 카드 즉시 비워지고 로딩 → 새 프로필 단어 표시

---

### 2026-04-28 (web↔mobile parity P3 — 디자인 토큰 통일 + 다크모드 비활성화)

#### 세션 목표
- `web-mobile-parity-plan.md` Phase 3 마무리 — 웹/모바일 디자인 정책 통일
- 핵심: 모바일 다크모드 비활성화 (웹 `forcedTheme="light"`와 일관)

#### 사전 분석 결과
| 작업 (계획서) | 실제 상태 |
|---|---|
| `globals.css`에 `--paper`, `--gold` 등 모바일 토큰 추가 | ✅ **이미 존재** — `:root` lines 269-279에 `--paper`, `--paper-warm`, `--gold`, `--gold-deep`, `--mint`, `--peach` 모두 정의됨. 이전 세션에서 추가됨 |
| `theme-provider.tsx` 다크 정책 결정 | ✅ **이미 결정** — `forcedTheme="light"` + `enableSystem={false}` (2026-04-24) |
| `theme-toggle.tsx` 활성화 또는 삭제 | 🔍 **데드코드 확인** — 어디서도 import 되지 않음. 삭제 권고(자율 작업 중 `rm` 금지 정책으로 실제 삭제는 보류) |
| 모바일 `Colors.dark` 처리 | 🛠 **이번 세션 수정** — light alias 처리 |

#### 변경 파일 (수정 1)
| 파일 | 변경 | 요약 |
|------|------|------|
| `apps/mobile/src/constants/theme.ts` | 수정 | `Colors.dark`를 `lightPalette`(추출된 단일 진실)와 동일한 alias로 변경. `useColorScheme()`이 'dark'를 반환해도 light 팔레트가 그려지도록. `nightInk`/`nightPaper` 미사용 상수 제거 |

#### 결정 사항 (추가)
55. **모바일 다크 비활성화 정책**: 웹 `theme-provider`의 `forcedTheme="light"`와 동일하게 모바일도 light 단일. 근거 — 랜딩(apps/landing) + 웹 메인이 light 고정이라, 모바일만 다크면 OS 시스템 다크 환경에서 "다른 서비스처럼" 보이는 톤 분기 발생. 자녀용 동화책 톤(따뜻한 종이) 일관성도 강화
56. **alias 방식 채택 이유**: `Colors.dark` 심볼 자체를 제거하면 `keyof typeof Colors.dark` 타입과 향후 다크 부활 시 진입점이 사라진다. light을 가리키는 alias로 두면 (1) 즉시 효과 동일 (2) 추후 별도 객체로 분기만 다시 추가하면 부활 가능 — 비가역 변경 회피
57. **theme-toggle.tsx 데드코드**: 어디서도 import 되지 않으며 git untracked. 자율 작업 정책상 `rm` 미사용. 대표님 "삭제해줘" 시점에 삭제 예정. 현재로선 빌드/번들에 영향 없음(미사용 + 트리쉐이킹)
58. **globals.css 토큰 작업 불필요**: 계획서 작성 시점 이후 이미 누군가가 `--paper`/`--gold` 등 모바일 동등 토큰을 `:root`에 추가해 둠. 중복 작업 방지를 위해 sanity check만 수행

#### 검증
| 항목 | 결과 |
|------|------|
| `cd apps/mobile && npx tsc --noEmit` | ✅ 0 에러 |
| `cd apps/mobile && pnpm lint` | ✅ 0 errors / 0 warnings |
| 루트 `pnpm build` (웹) | ✅ Compiled successfully (정적 페이지 동일하게 생성됨) |

#### 현재 상태
- ✅ Phase 3 (P3) 코드 게이트 3종 모두 통과 — `tsc / lint / web build`
- ⏳ **수동 시나리오 검증 미수행** (대표님 디바이스/시뮬레이터 필요): OS 다크모드 강제 시 모바일 화면이 light 팔레트로 그려지는지
- ⏭️ **다음 후보**: Phase 4 (정리/검증) — `apps/mobile/src/app/index.tsx:779` 안내 문구 정확화, 웹 `reader.tsx:41-51` 미사용 타입 제거, ReadingLog 저장 전략 PROJECT.md 문서화, E2E 시나리오

#### 게이트 미해결 항목 (Phase 3)
- [ ] iOS/Android 디바이스에서 OS를 다크로 전환해도 앱 화면이 light 팔레트로 유지되는지
- [ ] (선택) `theme-toggle.tsx` 실제 삭제 — 대표님 명시 요청 후 진행
- [ ] 모바일 web 빌드(Expo Web)도 light로 일관 — 웹과 톤 차이 없음 확인

---

### 2026-04-28 (web↔mobile parity P4 — 정리/검증, plan 종결)

#### 세션 목표
- `web-mobile-parity-plan.md` Phase 4 마무리 — web↔mobile parity 5개 단계(P0~P4) 전체 종결
- 잔여 코드 정리 + 정책 문서화 + E2E 시나리오 정의

#### 사전 분석 결과
| 작업 (계획서) | 실제 상태 |
|---|---|
| `apps/mobile/src/app/index.tsx:779` 안내 문구 정확화 | 🛠 **수정** — "웹과 같은 생성 흐름" → "아이 취향을 조금 더 알려주면…"으로 사용자 가치 중심 표현 |
| `src/components/reader.tsx:41-51` 미사용 `TtsResponse`/`SceneResponse` 타입 제거 | ❌ **계획서 부정확** — grep 결과 lines 409·609(TtsResponse), 725(SceneResponse) 제네릭 인자로 **실제 사용 중**. 제거 시 빌드 깨짐. 작업 미수행 |
| ReadingLog 저장 전략 PROJECT.md 문서화 | 🛠 **신규 섹션 추가** — `데이터 모델`과 `핵심 파일` 사이에 "ReadingLog 저장 전략" 섹션. API 계약, 클라이언트 호출 시점 매트릭스, 디버깅 주의 |
| E2E 시나리오 정의 | 📋 **시나리오 명세만 정의** — 실제 디바이스 실행은 게이트 미해결 항목으로 남김 |

#### 변경 파일 (수정 2)
| 파일 | 변경 | 요약 |
|------|------|------|
| `apps/mobile/src/app/index.tsx:779` | 수정 | 안내 문구 — 웹 비교 표현 제거, 아이 취향 알려주기/비워도 됨을 강조 |
| `agent-guide/PROJECT.md` | 추가 | "ReadingLog 저장 전략" 섹션 — API 계약(POST/PATCH/GET), 보안 정책(소유권 실패=404 통일/BOLA 차단), 웹↔모바일 호출 매트릭스, race/soft-완료/score 범위 디버깅 노트 |

#### 결정 사항 (추가)
59. **계획서 부정확 정보 처리**: `reader.tsx:41-51` 제거 작업은 grep 검증 결과 데드코드 아님 → 작업 미수행. **계획서를 맹목적으로 따르지 않고 실제 코드 상태로 검증** 원칙 강화 — 미래 단계에서도 동일 정책 적용
60. **ReadingLog 문서화 위치**: `데이터 모델` 섹션 직후에 별도 H2 섹션. 단일 표가 아닌 **데이터 흐름 다이어그램 + API 계약 표 + 클라이언트 호출 매트릭스 + 디버깅 노트** 4단 구성으로 신규 합류자가 5분 안에 ReadingLog 정책 전체를 이해 가능
61. **E2E 시나리오는 코드 작업 아님**: 디바이스 실행 + 타이밍 검증이 필요해 자율 코드 작업 범위 외. 시나리오 8단계 명세만 SESSION.md에 게이트 미해결 항목으로 정의 — 추후 quality 게이트 추가 시 자동화 후보

#### 검증
| 항목 | 결과 |
|------|------|
| `cd apps/mobile && npx tsc --noEmit` | ✅ 0 에러 |
| `cd apps/mobile && pnpm lint` | ✅ 0 errors / 0 warnings |
| 루트 `pnpm build` (웹) | ✅ Compiled successfully |

#### web↔mobile parity plan 전체 결산 (P0~P4)

| Phase | 핵심 작업 | 코드 게이트 | 디바이스 검증 |
|-------|-----------|-------------|---------------|
| **P0 — Reader 강화** | 페이지 진행도, 폰트 크기, 자동재생, 단어 팝오버, 스와이프 네비, 백그라운드 TTS | ✅ | ⏳ |
| **P1 — Quiz 게임화** | 1문항 카드, 즉시 피드백, 햅틱, 만점 트로피·confetti | ✅ | ⏳ |
| **P2 — 보호자 PIN + 단어장 깜빡임** | `useParentalPin` + `<ParentalPinGate>`, vocab `setEntries([])` | ✅ | ⏳ |
| **P3 — 디자인 토큰 통일** | 모바일 다크 alias, 토큰 sanity check | ✅ | ⏳ |
| **P4 — 정리/검증** | 안내 문구 정확화, ReadingLog PROJECT.md 문서화 | ✅ | 📋 시나리오만 정의 |

#### 현재 상태
- ✅ web↔mobile parity 5개 단계(P0~P4) 코드 작업 **전체 완료** — 모든 게이트(tsc/lint/build) 통과
- ⏳ **디바이스/시뮬레이터 실기 검증 미수행** — 각 Phase별 게이트 미해결 항목 누적
- ⏭️ **다음 후보**:
  1. 디바이스 실기 검증 (대표님 일정에 맞춰 시나리오 진행)
  2. 누적된 다른 백로그 작업으로 전환 (`agent-guide/SESSION.md > 다음 작업` 표 참조)
  3. (선택) `theme-toggle.tsx` 데드코드 실제 삭제

#### 게이트 미해결 항목 (Phase 4 / E2E 시나리오)

다음 8단계가 디바이스에서 모두 통과해야 web↔mobile parity가 실기 검증된 것으로 본다.

1. [ ] 책 만들기 — 맞춤 질문 1~2개 입력 후 "이야기 만들기" → 새 책 생성 + 이미지 표지 표시
2. [ ] Reader 진입 — 페이지 진행도(`X/Y`), 폰트 크기 3단 토글 작동
3. [ ] 자동재생 — TTS 재생 후 `onEnded`로 다음 passage 자동 이동, 백그라운드 TTS prefetch가 1.5s gap으로 진행
4. [ ] 스와이프 — 좌우 pan으로 이전/다음 passage, 세로 스크롤은 fail 영역(±20px) 안에서 정상
5. [ ] Quiz — 1문항 카드 + 즉시 피드백 ON에서 정답 → 900ms 자동 다음 문제 + 햅틱 Success
6. [ ] 만점 화면 — 트로피 1회 360deg 회전 + 24 pieces confetti 1.6s 후 소멸
7. [ ] PIN 게이트 — `/parents` 진입 시 4자리 입력 후 통과, "지금 잠그기" 즉시 잠금
8. [ ] 보호자 리포트 — 점수가 PATCH `/api/logs`로 갱신되어 주간 정답률에 반영

### 2026-04-28 (디바이스 검증 중 — "장면 만들기/그리기" 버튼 제거)

#### 트리거
디바이스 검증 진행 중 대표님 피드백: "장면 만들기 버튼은 필요없는데". 패리티 정책상 옵션 B(웹+모바일 동시 제거) 선택.

#### 변경 파일 (수정 2)
| 파일 | 제거 항목 |
|------|----------|
| `src/components/reader.tsx` | `IMAGE_GEN_ENABLED` 상수, `interface SceneResponse`, `loadingScene`/`setLoadingScene` state, `handleDrawScene` async 함수, "장면 그리기" Button JSX |
| `apps/mobile/src/app/books/[bookId].tsx` | `generatePassageImage` import, `sceneLoadingId`/`setSceneLoadingId` state, `prepareScene` async 함수, "장면 만들기" `<PrimaryButton>` JSX |

#### 보존 항목
- API 라우트 `/api/image/passage/[passageId]` 유지 (서버 보존)
- `flux.ts` 장면 프롬프트 빌더 유지 (재활용 대비)
- 웹 `sceneCache`/`currentScene`/`<Image>` 표시 로직 유지 — DB에 `sceneImagePath`가 저장된 기존 책은 계속 노출
- 모바일 `sceneUrl`/`<ExpoImage>` 표시 유지 — 동일 정책
- `apps/mobile/src/lib/api.ts`의 `generatePassageImage` 함수 자체는 유지 (호출자만 제거)

#### 결정 사항
62. **웹+모바일 동시 제거 (옵션 B)**: 한쪽만 제거 시 패리티 깨짐. 사용자 결정으로 둘 다 정리. 표시 로직은 유지해 추후 부활 시 버튼만 다시 붙이면 되는 비파괴적 비활성화로 최소화

#### 검증
| 항목 | 결과 |
|------|------|
| `pnpm exec tsc --noEmit` (웹) | ✅ 0 에러 |
| `cd apps/mobile && pnpm exec tsc --noEmit` | ✅ 0 에러 |
| grep 잔존 심볼 (`loadingScene`/`prepareScene`/`SceneResponse`/`generatePassageImage` 호출) | ✅ 0건 |

#### 디바이스 검증 영향
P0 게이트의 단계 3(TTS) 검증 시 "장면 그리기" 버튼이 사라진 것을 확인 — 별도 게이트 단계 추가 불필요.

### 2026-04-28 (디바이스 검증 중 — 책장 인라인 관리 패널 제거)

#### 트리거
디바이스 검증 진행 중 대표님 피드백: "제목저장, 표시다시, 보호자확인, 책 숨기기 이런 버튼들을 없애줘. 원래 없던 건데". 모바일 책장(`apps/mobile/src/app/index.tsx`)이 각 책마다 `BookManageCard`로 인라인 관리 패널(2 input + 4 buttons)을 렌더 중이었으나, 웹 패리티상 이 위치에는 **단순 카드만** 있어야 함이 맞다.

#### 변경 파일 (수정 1)
| 파일 | 변경 |
|------|------|
| `apps/mobile/src/app/index.tsx` | `<BookManageCard>` → `<BookCard>` 교체. import도 `book-card`로 변경. `onChanged` prop 제거 (BookCard는 불필요) |

#### 사용하지 않게 된 파일 (자율 삭제 금지 → 보존 + 보고)
- `apps/mobile/src/components/books/book-manage-card.tsx` — 모바일 내 호출자 0건. dead code. 삭제 권한이 없어 보존하며, 사용자 요청 시 제거 예정
- `flagBook`/`regenerateBookCover`/`updateBookTitle` (apps/mobile/src/lib/api.ts) — 호출자 사라짐. 단 `deleteBook`/`unflagBook`은 `parents.tsx` 보호자 화면에서 계속 사용

#### 결정 사항
63. **인라인 관리 패널 → 카드 단순화**: 웹은 책 카드 메뉴(`book-card-menu.tsx`)에서 같은 기능을 제공하는데 모바일만 인라인 패널이라 패리티 깨짐. 단순 `BookCard`로 정렬하는 게 맞음. 추후 모바일에도 메뉴 패턴이 필요해지면 `book-card-menu.tsx`의 컨셉을 RN ActionSheet/BottomSheet로 포팅하는 별도 작업으로 분리
64. **dead code 보존 정책**: `book-manage-card.tsx`는 자율 삭제 금지(rm 차단). 사용자 명시 요청 시 일괄 정리 예정. 그동안은 import만 끊어 빌드/런타임 영향 0

#### 보존 사항
- `apps/mobile/src/app/parents.tsx`의 "보호자 확인 책" 섹션 + "숨기기" 버튼은 **보호자 PIN 게이트 뒤의 워크플로우**라 그대로 유지 (대표님 메시지의 4개 버튼과 별개)

#### 검증
| 항목 | 결과 |
|------|------|
| `cd apps/mobile && pnpm exec tsc --noEmit` | ✅ 0 에러 |
| `BookManageCard` 잔존 import grep | ✅ 0건 (실제 호출처) — 컴포넌트 파일 자체만 미사용으로 남음 |

### 2026-04-28 (디바이스 검증 중 — 모바일 홈 미인증 게이트 P0 수정)

#### 트리거 (P0 — 보안 결함)
대표님 피드백: "로그인을 안했는데 새책 만들기, 책장이 보이면 안 될 것 같은데". 검증 결과:
- `apps/mobile/src/app/index.tsx`가 마운트 시 **세션 조회 없이** `fetchProfiles`/`fetchCredits`/`fetchBooks` 등 API를 곧장 호출
- 미인증 상태에서도 모든 섹션(새 책 만들기 폼, 책장, 프로필 만들기, 단축 그리드, 학습 요약)이 화면에 그려짐 — 401이 떨어져 `authRequired`가 true가 될 때까지 노출
- 401 분기가 발화하기 전 깜빡임뿐 아니라, 일부 섹션은 `profiles.length === 0` 조건만 체크해 미인증 신규 사용자에게도 노출됨

#### 수정 전략
**세션 우선 게이트**(`getStoredMobileSession`)를 마운트 흐름의 첫 단계로 도입. API 응답에 의존하지 않고 클라이언트가 보유한 세션 만료 여부로 게이트 결정.

#### 변경 파일 (수정 1)
| 파일 | 변경 |
|------|------|
| `apps/mobile/src/app/index.tsx` | (1) `getStoredMobileSession` import. (2) `sessionState: 'loading' \| 'authenticated' \| 'guest'` state 도입. (3) `runInitialLoad`에서 세션 조회 → 게스트면 API 호출 스킵 + 게스트 상태 진입. (4) `loadLibrary`에서도 세션 사전 검증. (5) `handleLoadError` 401/302 분기에 `setSessionState('guest')` 추가. (6) `resetAuthState()` 도입 — 게스트 전환 시 캐시 데이터 즉시 비움. (7) 보호 섹션 6곳(shortcutGrid, 프로필 chip 리스트, 프로필 만들기, 학습 요약, 새 책 만들기, 책장)에 `sessionState === 'authenticated'` 가드 추가. (8) 게이트 카드는 `sessionState === 'guest'`로 노출, `authRequired`에 따라 "다시 로그인 필요" / "로그인이 필요합니다" 분기. (9) SessionCard `onChanged` 콜백을 게스트 전환 인지하도록 보강 — 로그아웃 후 세션 재조회 → 게스트면 데이터 초기화. (10) hero 버튼 라벨/onPress도 sessionState 기반으로 정렬 |

#### 결정 사항
65. **클라이언트 측 세션 우선 게이트**: 401 응답 의존이 아닌 `getStoredMobileSession` 결과로 사전 분기. 토큰이 만료된 경우에도 클라이언트가 만료를 감지해 즉시 게스트로 전환되어 보호 UI가 노출되지 않음. **서버 측 인증 검증은 그대로 유지** — 다층 방어 (defense in depth)
66. **3-state 세션 모델 (`loading`/`authenticated`/`guest`)**: 마운트 직후 짧은 'loading' 상태를 두어 게이트 카드 깜빡임 방지. 'guest'와 '인증 후 401'을 동일 게이트로 통합하되 게이트 카드 헤더 문구만 분기
67. **보호 섹션 일괄 가드**: 'profiles.length === 0' 같은 데이터-기반 분기는 미인증/신규 사용자를 구분하지 못하므로 모든 보호 섹션에 sessionState 가드를 명시적으로 추가. 미래 섹션 추가 시에도 동일 패턴 적용
68. **SessionCard onChanged 보강**: 로그아웃 후 즉시 게스트 상태로 진입하도록 콜백을 async + 세션 재조회 패턴으로 변경. 기존엔 `loadLibrary(true)` 호출 후 401에 의존했던 것을 능동적 전환으로

#### 검증
| 항목 | 결과 |
|------|------|
| `cd apps/mobile && pnpm exec tsc --noEmit` | ✅ 0 에러 |
| `grep "sessionState\\|authRequired"` 가드 분포 | ✅ 보호 섹션 6곳 모두 적용 (525/651/704/738/773/888) |

#### 보안 결함 분류 (사후)
- **분류**: 부적절한 인가 검사 (Improper Authorization) — Defense in depth 차원에서 클라이언트 게이트 누락
- **영향 범위**: 모바일 앱 홈 화면. 서버는 영향 없음 (서버는 401 정상 응답)
- **시각적 노출만**의 결함 — 실제 데이터 누출 없음 (API가 401 차단). 그러나 UI 신뢰도 P0
- **해결 검증 잔여**: 디바이스 실기 — 미인증 상태로 앱 실행 시 hero/4스텝/게이트 카드만 노출 확인 필요

### 2026-04-28 (디바이스 검증 중 — 네이티브 홈 재설계 4-Phase, /sc:improve A안)

#### 트리거
- 사용자 피드백: "모바일 앱이면 앱 시작하기 버튼이 나오는게 맞냐? 처음부터 다시 만들어야하는거 아니냐? 엉망이네"
- 진단: `apps/mobile/src/app/index.tsx`가 `apps/landing/`(웹 랜딩)을 그대로 RN으로 포팅 — 이미 앱을 연 사용자에게 "앱 시작하기" CTA, hero, HeroSceneCard, 4-step 안내, 마케팅 태그가 부적절
- 사용자 지시: "/sc:improve A로 진행하는데 네이티브 앱에 맞게 화면구성 순서.. 제대로 해라"

#### 4-Phase 재설계 전략 (기능 손실 없이 단계별 검증)
순서를 Phase 1 → 3 → 4 → 2로 진행해 중간 단계에서도 책 생성/프로필 생성 기능이 끊기지 않도록 함
1. **Phase 1**: `_layout.tsx`에 인증 가드 추가 — 미인증이면 `/login`으로 redirect
2. **Phase 3**: 새 책 만들기 폼을 `apps/mobile/src/app/books/new.tsx`로 추출 (홈에서 통째로 옮김)
3. **Phase 4**: 첫 사용자 onboarding을 `apps/mobile/src/app/onboarding.tsx`로 분리 (4-step 안내 + 프로필 생성)
4. **Phase 2**: `index.tsx`를 네이티브 홈으로 재구성 — 웹 랜딩 잔재 전부 제거

#### 변경 파일 (수정 2, 신규 2)
| 파일 | 작업 | 핵심 변경 |
|---|---|---|
| `apps/mobile/src/app/_layout.tsx` | 수정 | `useAuthGate()` 훅 — `useSegments` + `getStoredMobileSession`으로 미인증/만료 시 `router.replace('/login')`. `PUBLIC_SEGMENTS = {login, auth}`. ready 전에는 Stack 마운트 보류 (splash overlay 유지) |
| `apps/mobile/src/app/books/new.tsx` | 신규 | profileId query param 받기 → fetchProfiles+fetchCredits 부트스트랩 → CEFR/장르/주제/intake → createBook → `router.replace('/books/[bookId]')`. 별 부족 시 /subscribe redirect, 401 시 /login redirect |
| `apps/mobile/src/app/onboarding.tsx` | 신규 | 4-step 안내 (LANDING_STEPS 이전) + 프로필 생성 폼 (이름/나이/아바타 프리셋 6종). 저장 후 `router.replace('/')`. 401 시 /login |
| `apps/mobile/src/app/index.tsx` | 통째 재작성 | 1394 → 532줄. 신규 구성: ① 상단 바(브랜드+별 chip) ② 활성 프로필 헤더(큰 아바타+`{이름}의 하루책`) ③ 다중 프로필 chip row ④ 이어 읽기 카드(continueBook 매칭 시) ⑤ 책장+새 책 만들기 CTA(가운데 ＋ 버튼) ⑥ 이번 주 학습 metric 그리드 ⑦ 단축 그리드(단어장/통계/보호자/별 충전) ⑧ SessionCard ⑨ 아이 추가 버튼 |

#### 제거 (웹 랜딩 잔재)
- `HeroSceneCard` 컴포넌트, `LANDING_STEPS` 상수
- `headerCta` "앱 시작하기" 버튼, `heroSticker`/`heroTitle`/`heroText`/`heroActions`/`heroTags`
- `openWebLogin`/`openWebSignup`/`openHeroPrimary`/`openStart` 함수 (웹 외부 링크 의존)
- "무료로 시작하기"/"어떻게 쓰나요?"/"#5~10세 #영어 레벨 A1~B2 #보호자 리포트" 마케팅 태그
- `landingSection`/`stepGrid`/`stepCard`/`stepNumber`/`sectionIntro`/`eyebrow` 스타일
- 게스트 게이트 카드 — `_layout` 가드가 redirect로 처리하므로 화면에서 게스트가 보일 일 없음
- 인라인 프로필 생성 폼 (onboarding으로 이전)
- 인라인 새 책 만들기 폼 (books/new로 이전)

#### 결정 사항
- **Phase 1 인증 가드 위치**: root layout에 두어 모든 라우트 진입 전 검증. 화면별 게이트 중복 제거
- **books/new 라우트 분리 이유**: 홈을 가볍게 유지하고 책 생성 흐름을 별도 컨텍스트로 격리. param으로 profileId 전달해 다중 프로필 시 모호성 제거
- **onboarding 별도 라우트 이유**: 첫 사용자/추가 자녀 등록 둘 다 동일 컴포넌트 재사용. 4-step 안내를 첫 진입에만 보여 마케팅 잡음 제거
- **기능 손실 없는 마이그레이션**: Phase 3/4 신규 라우트를 먼저 만든 뒤 Phase 2에서 폼 제거. 순간이라도 책 생성 불가 상태가 발생하지 않게 순서 조정
- **세션 만료 처리**: 401 응답 시 `clearStoredMobileSession() → router.replace('/login')`. _layout 가드와 화면 내 backup의 이중 방어선

#### 검증
| 항목 | 결과 |
|---|---|
| `cd apps/mobile && pnpm exec tsc --noEmit` | ✅ 0 에러 |
| 컴포넌트 시그니처 일치 (PrimaryButton/StatusPill/SessionCard/Screen/useTheme) | ✅ 사용 토큰 모두 존재 |
| 라우트 등록 (_layout Stack.Screen) | ✅ books/new + onboarding 추가 |
| 디바이스 실기 (HMR 반영 후 확인) | ⏳ 대표님 검증 대기 |

#### 잔여 작업
- 디바이스에서 다음 시나리오 확인:
  1. 미인증 → 자동 /login redirect (Phase 1)
  2. 로그인 후 첫 사용자 → 자동 /onboarding redirect (Phase 2 mount)
  3. 프로필 1명 등록 후 / 로 복귀 → 책장 빈 상태 + 새 책 만들기 CTA
  4. 새 책 만들기 → /books/new에서 별 잔액 확인 + 생성 → /books/[bookId]
  5. 책장에서 BookCard 진입 → 읽기 → 이어 읽기로 홈 복귀
  6. 다중 프로필 시 chip row 전환
  7. 로그아웃 → 자동 /login redirect
