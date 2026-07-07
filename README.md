# 하루책 (HaruBook)

> 아이의 **나이 · 영어 레벨 · 관심사**에 맞춰 매일 새로운 영어 동화책을 만들어 주는 아동 영어 학습 서비스. 문장별 원어민 낭독, 한글 해석, 4지선다 퀴즈, 단어장(SRS 복습)까지 한 권의 독서 루틴 안에서 이어집니다.

![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.2-149eca?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)
![MySQL](https://img.shields.io/badge/MySQL-8-4479a1?logo=mysql)

서비스 도메인: **[eng.smap.site](https://eng.smap.site)** · 제공: **비욘드리얼(Beyond Real)**

---

## ✨ 핵심 기능

| 기능 | 설명 |
|------|------|
| 📖 **레벨별 동화 생성** | 연령(5~10세) × CEFR(A1~B1) 조합으로 난이도를 지정해, 아이에게 맞춘 새 동화를 한 권씩 생성 |
| 🔊 **문장별 낭독** | 원어민 음성으로 문장을 하나씩 읽어 주고, 재생 중인 문장을 하이라이트 |
| 🇰🇷 **한글 해석** | 문장/단락 단위 번역 토글 + 어려운 단어 주석 |
| ✅ **4지선다 퀴즈** | 완독 후 본문 기반 5문항으로 이해도 확인, 정답률 기록 |
| 📚 **책장 & 재독** | 프로필별 생성/읽은 책을 카드로 보관, 연령×CEFR 레벨 필터, 재생성 없이 다시 읽기 |
| 🗂️ **단어장 (SRS)** | 간격 반복(Spaced Repetition) 기반 단어 복습 |
| 👨‍👩‍👧 **가족 프로필** | 한 계정에서 2~3명 프로필 전환, 각자 책장·독서 로그 분리 |
| 📊 **보호자 리포트** | 독서 로그·완독률·퀴즈 점수 기반 주간 학습 리포트 |
| 🎨 **장면 일러스트** | 장면별 프롬프트로 책 표지/삽화 이미지 생성 (실패 시 시드 기반 SVG 폴백) |

> 결제는 **별(Star) 크레딧** 단위입니다. 별 1개당 동화 1권을 생성하며, 가족(계정) 단위로 잔액이 합산됩니다.

---

## 🏗️ 기술 스택

| 영역 | 사용 기술 |
|------|-----------|
| **프레임워크** | Next.js 16.2.4 (App Router, `src-dir`, **webpack** 빌드) · React 19.2 · TypeScript 5 |
| **UI** | Tailwind CSS 4 (`@tailwindcss/postcss`) · base-ui · shadcn/ui · next-themes · sonner |
| **상태 관리** | Zustand (현재 프로필 · 재생 상태) |
| **인증** | Auth.js v5 (`next-auth@5`) + Drizzle Adapter · Google/Kakao OAuth · 모바일 exchange-code(PKCE) |
| **데이터베이스** | MySQL 8 (`mysql2/promise`, 커넥션 풀) · Drizzle ORM + drizzle-kit |
| **LLM (동화/퀴즈/번역)** | OpenAI Chat Completions (`openai` Node SDK, 싱글턴) — `response_format` JSON 강제 + Zod 검증 |
| **TTS (낭독)** | **Supertonic** (99M ONNX, 44.1kHz) — 로컬 FastAPI 서버(`services/tts`) |
| **이미지 생성** | FLUX.1-schnell (`services/image`) + 시드 기반 SVG 폴백 |
| **결제** | **포트원(PortOne)** 웹 결제 + **iOS In-App Purchase**(App Store Connect Consumable) |
| **푸시 알림** | Firebase Admin (FCM) |
| **PWA** | `manifest.webmanifest` + 서비스 워커 |
| **프로세스 관리/배포** | PM2 (`ecosystem.config.cjs`) |

> **모델 정책**: LLM은 OpenAI를 사용하고, TTS·이미지는 오픈 모델(Supertonic, FLUX.1-schnell)만 허용합니다. `src/lib/{llm,tts,image}/`로 추상화되어 벤더 교체가 용이합니다.

---

## 📱 플랫폼 구성 (멀티 클라이언트)

하나의 백엔드(Next.js API + MySQL)를 세 클라이언트가 공유합니다.

| 클라이언트 | 위치 | 스택 |
|------------|------|------|
| **웹 앱** | `src/` | Next.js (App Router) |
| **iOS 네이티브** | `apps/ios/HaruBook` | SwiftUI |
| **Android 네이티브** | `apps/android` | Jetpack Compose |
| **랜딩 페이지** | `apps/landing` | 별도 Next.js 워크스페이스 |

---

## 📂 프로젝트 구조

```
smap_eng/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/               # 로그인 · 회원가입 · 온보딩
│   │   ├── book/[id]/            # 리더 (낭독 · 한글 해석)
│   │   ├── quiz/[bookId]/        # 퀴즈
│   │   ├── parents/ stats/ vocab/# 보호자 리포트 · 통계 · 단어장
│   │   ├── subscribe/            # 별 크레딧 결제
│   │   ├── admin/                # 관리자 (books/credits/users/subscriptions)
│   │   └── api/                  # API 라우트
│   │       ├── auth/[...nextauth]/
│   │       ├── books/  tts/  image/
│   │       ├── logs/  learning-summary/  vocab/
│   │       ├── payments/  billing/  iap/
│   │       └── static/{audio,images}/[file]/   # 인증 게이트 정적 미디어
│   ├── components/               # Reader · Bookshelf · QuizRunner · shadcn/ui
│   ├── lib/
│   │   ├── auth/                 # 세션 · 소유권 검증 헬퍼
│   │   ├── billing/  iap/        # 별 크레딧 · 패키지 · 스토어 링크
│   │   ├── llm/                  # OpenAI 클라이언트 · 프롬프트 · Zod 스키마
│   │   ├── tts/                  # Supertonic 프록시 · 배치
│   │   ├── image/                # FLUX 클라이언트 · SVG 폴백
│   │   ├── db/                   # Drizzle 쿼리 + schema.ts
│   │   └── legal/                # 사업자 정보(SSOT)
│   └── stores/                   # Zustand
├── apps/
│   ├── ios/                      # SwiftUI 앱 (HaruBook)
│   ├── android/                  # Jetpack Compose 앱
│   └── landing/                  # 랜딩 페이지 (별도 워크스페이스)
├── services/
│   ├── tts/                      # Supertonic FastAPI 서버 (Python)
│   └── image/                    # FLUX 이미지 서비스 (Python)
├── drizzle/                      # 마이그레이션 SQL + meta 스냅샷
├── public/                       # 정적 자원 · PWA 매니페스트 · 폰트
├── ecosystem.config.cjs          # PM2
└── storage/                      # 로컬 바이너리 (audio/ images/, .gitignore)
```

---

## 🚀 시작하기

### 요구사항
- Node.js 20+ · **pnpm**
- MySQL 8
- Python 3.10+ (로컬 TTS/이미지 서버용)

### 1) 의존성 설치
```bash
pnpm install
```

### 2) 환경변수 설정
```bash
cp .env.example .env.local
```
주요 변수:
```bash
DATABASE_URL=mysql://user:pass@host:3306/smap_eng
AUTH_SECRET=...
OPENAI_API_KEY=sk-...
# OAuth
AUTH_GOOGLE_ID=...   AUTH_GOOGLE_SECRET=...
AUTH_KAKAO_ID=...    AUTH_KAKAO_SECRET=...
# TTS (로컬 Supertonic 서버)
SUPERTONIC_BASE_URL=http://localhost:8880
# 결제 (포트원)
NEXT_PUBLIC_PORTONE_STORE_ID=...
# 별 크레딧 가격 (KRW, 빌드 타임 inline)
NEXT_PUBLIC_STAR_PACK_SMALL_PRICE_KRW=1100
NEXT_PUBLIC_STAR_PACK_MEDIUM_PRICE_KRW=5500
NEXT_PUBLIC_STAR_PACK_LARGE_PRICE_KRW=11000
# 앱 스토어 설치 링크
NEXT_PUBLIC_APP_STORE_URL=...
NEXT_PUBLIC_PLAY_STORE_URL=...
```

### 3) 데이터베이스
```bash
pnpm db:generate     # schema.ts → 신규 마이그레이션 SQL
pnpm db:migrate      # MySQL에 적용
pnpm db:studio       # Drizzle Studio (선택)
```

### 4) 개발 서버
```bash
pnpm dev             # http://localhost:3000  (next dev --webpack)
```

### 5) 로컬 AI 서비스 (별도 터미널)
```bash
# 낭독(TTS) — Supertonic FastAPI (첫 실행 시 HF에서 모델 자동 다운로드)
cd services/tts && bash run.sh        # http://localhost:8880

# 이미지 생성 — FLUX 서비스
cd services/image && bash run.sh
```

### 6) 빌드 / 배포
```bash
pnpm lint                   # ESLint 9
pnpm exec tsc --noEmit      # 타입 체크
pnpm build                  # 프로덕션 빌드 (next build --webpack)
pnpm build:prod             # 웹 + 랜딩 동시 빌드
pnpm deploy                 # PM2 reload (smap-eng-next, smap-eng-web)
```

---

## 💳 별(Star) 크레딧 패키지

| 패키지 | 별 | 가격(KRW) | 비고 |
|--------|----|-----------|------|
| 별 1개 | 1 | 1,100 | 맛보기 (동화 1권) |
| 별 60개 팩 | 60 | 5,500 | 추천 · 가족 프로필 · 주간 리포트 |
| 별 130개 팩 | 130 | 11,000 | 연말 성장 리포트 · 우선 지원 |

별은 만료 없이 가족(계정) 단위로 합산되며, 별 1개로 동화 1권을 생성합니다.

---

## 🗄️ 데이터 모델 (요약)

> 정식 스키마: `src/lib/db/schema.ts` · 마이그레이션: `drizzle/`

- **인증(Auth.js v5)**: `users` · `accounts` · `sessions` · `verification_tokens`
- **학습 도메인**: `profiles` · `books` · `passages` · `quizzes` · `reading_logs` · `vocab_items`
- **결제·크레딧**: `credit_balances` · `credit_transactions` · `orders` · `subscriptions`
- **모바일 인증**: `mobile_auth_tokens` (exchange_code/access/refresh, PKCE S256)
- **운영**: `audit_logs` (관리자 작업 감사)

**보안 정책**: 자원 소유권 실패는 모두 **404**(미로그인 401, 권한 부족 403)로 통일해 리소스 enumeration(BOLA)을 차단합니다.

---

## 🔐 보안 / 운영 노트

- 시크릿(`OPENAI_API_KEY` 등)은 `.env.local`에만 보관 — 커밋 · 로깅 · 에러 메시지 노출 금지
- 정적 미디어(`/api/static/{audio,images}/[file]`)는 인증 게이트를 거쳐 제공
- 결제 확정은 서버에서 검증 후 크레딧을 지급(`FOR UPDATE` 잠금으로 동시성 제어)

---

## 🏢 제공 / 라이선스

- **서비스명**: 하루책 (HaruBook)
- **제공**: 비욘드리얼 (Beyond Real) · 대표 정진
- **문의**: admin@smap.site

본 저장소는 **비공개(Proprietary)** 입니다. 권리는 비욘드리얼에 있으며, 무단 복제·배포·사용을 금합니다.
