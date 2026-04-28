---
name: project
description: smap_eng 프로젝트 핵심 요약. 프로젝트 구조와 기술 스택 파악용.
last-updated: 2026-04-25
---

# 프로젝트 개요

> **smap_eng** — 아이가 레벨별 영어 동화책을 읽고 **낭독·퀴즈·한글 해석**으로 학습하는 **오픈모델 기반 AI 학습 앱**.

---

## TL;DR

| 항목 | 내용 |
|------|------|
| **프로젝트** | smap_eng |
| **목적** | AI 생성 영어 동화책 + TTS 낭독 + 4지선다 퀴즈 + 한글 해석을 통한 아동 영어 학습 |
| **기술 스택** | Next.js 16.2.4 + React 19.2 + TypeScript / Tailwind 4 + base-ui + shadcn/ui / **OpenAI (`gpt-5.2-chat-latest`)** / Kokoro-82M TTS / FLUX.1-schnell / **MySQL + mysql2/promise + Drizzle ORM** / Auth.js v5 / 토스페이먼츠 |
| **MVP 기능** | 레벨별 동화 생성 · 문장 TTS · 4지선다 5문제 · 한글 해석 · 책장 · 독서 로그/재독 · **이미지 생성** · 가족 프로필 전환 |
| **작업 관리** | **GitHub Issues** — [bluemusk/smap_eng](https://github.com/bluemusk/smap_eng) |

---

## 핵심 기능 (MVP)

| # | 기능 | 구현 핵심 |
|---|------|-----------|
| 1 | **레벨별 동화 생성** | OpenAI Chat Completions에 `age + CEFR + topic` 프롬프트 → JSON(제목, 문장 배열, 어휘). `response_format: {type: "json_object"}` 강제 |
| 2 | **문장 단위 TTS 낭독** | Kokoro-82M로 Passage별 오디오 생성, 재생 중 현재 문장 하이라이트 |
| 3 | **4지선다 퀴즈 5문제** | 완독 시 OpenAI에 본문 + 스키마로 요청, 정답률 기록 |
| 4 | **한글 해석** | 문장/단락 단위 토글. OpenAI로 자연스러운 번역 + 어려운 단어 주석 |
| 5 | **책장(Bookshelf)** | 프로필별 생성/읽은 책 카드 뷰, **Level 필터** (연령 × CEFR) |
| 6 | **독서 로그/재독** | 읽은 시각·완료율·퀴즈 점수 저장. 동일 책 재생성 없이 **재독 가능** |
| 7 | **이미지 생성** | 장면별 프롬프트 → FLUX.1-schnell → 책 표지 및 삽화 (MVP 포함) |
| 8 | **가족 프로필** | 2~3명 프로필 전환, 각자 책장/로그 분리 |

---

## 레벨 체계

**연령(5~10세) × CEFR(A1~B1)** 조합으로 난이도 지정.

| 연령 | 추천 CEFR | 문장 수 | 문장 길이 | 어휘 수준 |
|------|-----------|---------|-----------|-----------|
| 5~6세 | **A1** | 8~12 | 4~7 단어 | 기초 명사/동사, 현재형 |
| 7~8세 | **A1~A2** | 12~18 | 6~10 단어 | 과거형, 간단한 접속사 |
| 9~10세 | **A2~B1** | 18~25 | 8~14 단어 | 관계절, 감정/의견 표현 |

> 생성 프롬프트에 이 파라미터를 `system message`로 주입.

---

## 프로젝트 구조

**현재 상태** (MVP→인증→관리자→결제→PWA→SRS→엔딩 분기 구현 완료):

```
smap_eng/
├── agent-guide/            # AI 에이전트 문서 (GUIDE/PROJECT/SESSION)
├── drizzle/                # 마이그레이션 SQL + meta 스냅샷
│   ├── 0000_*.sql ~ 0006_credit_refund.sql
│   └── meta/
├── public/                 # 정적 자원, PWA 매니페스트, sw.js, fonts
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── layout.tsx, page.tsx, globals.css
│   │   ├── login/, signup/, onboarding/
│   │   ├── book/[id]/      # 리더
│   │   ├── quiz/[bookId]/  # 퀴즈
│   │   ├── parents/, stats/, vocab/
│   │   ├── subscribe/, subscribe/{success,fail}/
│   │   ├── admin/          # 관리자 (books/credits/subscriptions/users)
│   │   └── api/
│   │       ├── auth/[...nextauth]/   # Auth.js v5
│   │       ├── books/, books/[id]/{flag,quiz}/
│   │       ├── tts/[passageId]/, tts/word/
│   │       ├── image/{book,passage}/
│   │       ├── logs/, learning-summary/, vocab/
│   │       ├── parents/report/, profiles/
│   │       ├── payments/{checkout,confirm}/, billing/credits/
│   │       ├── static/{audio,images}/[file]/  # 인증 게이트 적용된 정적 미디어
│   │       └── admin/{books,credits,users}/
│   ├── auth.ts, proxy.ts             # Auth.js + Edge proxy(matcher: /api/* 제외)
│   ├── components/                   # shadcn/ui + 커스텀 (Reader, Bookshelf, QuizCard)
│   ├── lib/
│   │   ├── auth/session.ts           # requireUserId/ownership 헬퍼 + ApiAuthError
│   │   ├── billing/credits.ts        # consume/grant/refund (FOR UPDATE 잠금)
│   │   ├── llm/                      # OpenAI 클라이언트 + 프롬프트 + Zod 스키마
│   │   ├── tts/                      # Kokoro 클라이언트 + 배치
│   │   ├── image/                    # FLUX 클라이언트 + Seeded SVG 폴백(cover-art)
│   │   ├── db/                       # Drizzle 쿼리 + schema.ts
│   │   └── paths.ts, api-client.ts
│   ├── stores/                       # Zustand (current profile, playback)
│   └── types/
├── services/
│   ├── tts/                # Kokoro Python 서버
│   └── image/              # FLUX 서비스 (HF access 복구 대기)
├── ecosystem.config.cjs    # PM2
├── AGENTS.md, CLAUDE.md, next.config.ts, drizzle.config.ts
└── storage/                # 로컬 바이너리 (.gitignore)
    ├── audio/              # Kokoro 결과 wav (passage-<id>.wav, word-<slug>.wav)
    └── images/             # FLUX 결과 png (book-<id>-cover.png, passage-<id>-scene.png)
```

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| **프레임워크** | **Next.js 16.2.4** (App Router, `src-dir`, webpack 빌드) + TypeScript 5.9 + React 19.2 |
| **UI** | **Tailwind CSS 4** (`@tailwindcss/postcss`) + base-ui + shadcn/ui (Button/Card/Dialog/Sonner) |
| **린터** | ESLint 9 (`eslint-config-next`) |
| **상태관리** | Zustand |
| **인증** | Auth.js v5 (`next-auth@5.0.0-beta.31`) + Drizzle Adapter, Google/Kakao OAuth, 모바일 exchange-code(PKCE 옵션) |
| **결제** | 토스페이먼츠 (체크아웃 → confirm 서버 검증 → grantCredits) |
| **LLM** | **OpenAI Chat Completions** (`gpt-5.2-chat-latest`, 공식 `openai` Node SDK, singleton) |
| **TTS** | Kokoro-82M Python 서버 (`services/tts`) |
| **이미지 생성** | FLUX.1-schnell (`services/image`, HF access 복구 대기) + Seeded SVG 폴백(`cover-art.tsx`) |
| **데이터베이스** | **MySQL 8** (mysql2/promise, 풀링) |
| **ORM/마이그레이션** | Drizzle ORM + drizzle-kit (`drizzle/0000_*.sql ~ 0006_*.sql`) |
| **PWA** | `public/manifest.webmanifest` + `public/sw.js` + apple-icon/icon.png |
| **프로세스 관리** | PM2 (`ecosystem.config.cjs`) |
| **오디오/이미지 저장** | 로컬 파일 시스템 (`./storage/{audio,images}/`) — `/api/static/{audio,images}/[file]` 인증 게이트 경유 |

---

## 데이터 모델

> 정식 스키마: `src/lib/db/schema.ts`. 마이그레이션: `drizzle/0000_*.sql ~ 0006_*.sql`.

### Auth.js v5 코어 (4종)

| 테이블 | 역할 |
|--------|------|
| `users` | 부모(보호자) 계정. role: `user` | `admin`. ADMIN_EMAILS 화이트리스트로 자동 승격 |
| `accounts` | OAuth provider 토큰 (Google/Kakao) |
| `sessions` | 세션 토큰 |
| `verification_tokens` | 이메일 검증 토큰 |

### 도메인 (학습)

| 테이블 | 핵심 컬럼 |
|--------|-----------|
| `profiles` | id, user_id, name, avatar, created_at — 가족당 2~3명 |
| `books` | id, profile_id, title, age, cefr, topic, vocabulary(JSON), alternate_ending(JSON), flagged_at, cover_image_path |
| `passages` | id, book_id, order_index, text_en, text_ko, audio_path, scene_image_path |
| `quizzes` | id, book_id, question, choices(JSON), answer_index |
| `reading_logs` | id, profile_id, book_id, started_at, finished_at, progress_ratio, quiz_score |
| `vocab_items` | SRS 기반 단어 학습 기록 (간격 반복) |

### 결제·크레딧 (4종)

| 테이블 | 핵심 컬럼 |
|--------|-----------|
| `credit_balances` | user_id PK, balance, total_purchased, updated_at — 가족 단위 잔액 |
| `credit_transactions` | id, user_id, kind(`purchase`/`consume`/`grant`/`refund`), delta, package_id, book_id, **reversed_tx_id**(refund의 idempotency 키), created_at |
| `orders` | id, user_id, package_id, amount, stars, toss_order_id(unique), toss_payment_key, toss_method, receipt_url, status, failure_code, confirmed_at |
| `subscriptions` | 가족 단위 구독 레코드 (결제 이력/통계) |

### 모바일 인증

| 테이블 | 핵심 컬럼 |
|--------|-----------|
| `mobile_auth_tokens` | kind(`exchange_code`/`access`/`refresh`), value, user_id, expires_at, **code_challenge**(PKCE S256 base64url 43자, optional), revoked_at, created_at |

### 운영

| 테이블 | 핵심 컬럼 |
|--------|-----------|
| `audit_logs` | 관리자 작업 감사 로그 |

---

## ReadingLog 저장 전략

> 독서 세션의 진행률·완료 시각·퀴즈 점수를 단일 `reading_logs` 행에 누적 갱신한다. 보호자 리포트(`/parents`)와 단어장 통계의 입력원.

### 데이터 흐름

```
[Reader 진입] ─POST /api/logs─▶ reading_logs 행 생성 (profileId, bookId 소유권 검증)
                                  │
                                  ▼ id 클라이언트에 보관(state)
[passage 이동]  ─PATCH─▶ progressRatio 갱신 (0~1, 마지막 passage 도달 시 1.0)
[Reader 이탈]   ─PATCH─▶ finishedAtUnix(선택), progressRatio 마지막 값
[Quiz 시작]     ─POST 신규(있으면 그 행 PATCH)─▶ 동일 정책
[Quiz 완료]     ─PATCH─▶ quizScore 0~5
```

### API 계약 (`src/app/api/logs/route.ts`)

| 메서드 | 본문/쿼리 | 동작 | 인증 |
|--------|-----------|------|------|
| `POST` | `{ profileId, bookId }` | 새 행 생성 → `{ log: { id } }` | profile 소유권 + book 소유권, 둘이 동일 user여야 함. 불일치 시 404 (BOLA 차단) |
| `PATCH` | `{ id, progressRatio?, finishedAtUnix?, quizScore? }` | 부분 갱신 | log → profileId → user 소유권 검증. 미존재 시 404 |
| `GET` | `?profileId=` | 해당 프로필 로그 목록 | profile 소유권 |

**보안 정책 통일**: 소유권 실패는 모두 **404**(미로그인=401, 관리자 권한 부족=403). 자원 enumeration 차단 — `agent-guide/SESSION.md` 결정사항 참조.

### 클라이언트 호출 (웹 / 모바일 동등)

| 시점 | 웹 | 모바일 |
|------|----|--------|
| Reader 진입 후 첫 진행 | `src/components/reader.tsx:477+` POST → state에 id 저장 | `apps/mobile/src/app/books/[bookId].tsx:143` `updateReadingLog` (앞서 POST된 id 사용) |
| passage 이동 | `reader.tsx:533+` PATCH `progressRatio` | `books/[bookId].tsx:143` PATCH `progressRatio` |
| Reader 이탈 | `reader.tsx:550` `fetch` (`navigator.sendBeacon` 대체) PATCH `finishedAtUnix` | `books/[bookId].tsx:180` PATCH `finishedAtUnix` |
| Quiz 완료 | `src/components/quiz-runner.tsx:55+` POST/PATCH `quizScore` | `apps/mobile/src/app/quiz/[bookId].tsx:206` PATCH `quizScore` |

### 디버깅 시 주의

- **id 누락 race**: POST 응답 도착 전 PATCH가 발사되면 누락. Reader/Quiz는 `id`가 set된 이후에만 PATCH (state 가드).
- **soft 완료**: `finishedAt`은 사용자가 마지막 passage를 본 순간이 아닌 **Reader 화면 이탈 시** 기록. 즉, 마지막 passage에 머물기만 하고 안 떠나면 미완료로 남는다(설계 의도 — 잠깐 보고 닫은 경우 완료로 잡지 않기 위함).
- **score 범위**: `quizScore`는 `0~5` 정수. 5문제 고정 가정. 미래 확장 시 스키마 수정 필요.

---

## 핵심 파일

| 파일 | 역할 |
|------|------|
| `AGENTS.md` | ⚠️ Next.js 16 브레이킹 체인지 경고. 코드 작성 전 `node_modules/next/dist/docs/` 읽기 |
| `CLAUDE.md` | `@AGENTS.md` 임포트 (Claude Code 전용) |
| `next.config.ts` | Next.js 설정 (TypeScript) |
| `eslint.config.mjs` | ESLint 9 플랫 설정 |
| `postcss.config.mjs` | Tailwind 4용 PostCSS (`@tailwindcss/postcss`) |
| `src/app/layout.tsx` | 루트 레이아웃 |
| `src/app/page.tsx` | 랜딩 페이지 (기본 스캐폴딩) |
| `tsconfig.json` | `@/*` 임포트 별칭, strict 모드 |

> 구현 진행 중 `src/lib/`, `src/components/`, `drizzle/schema.ts` 등 추가 시 업데이트.

---

## 빠른 시작

### 1) 의존성 설치
```bash
cd /data/wwwroot/smap_eng
pnpm install
```

### 2) 환경변수 설정 (`.env.local`)
```bash
cp .env.example .env.local
# 필수: DATABASE_URL=mysql://..., AUTH_SECRET=..., OPENAI_API_KEY=sk-...
# OAuth: AUTH_GOOGLE_ID/SECRET, AUTH_KAKAO_ID/SECRET
# 결제: TOSS_SECRET_KEY, NEXT_PUBLIC_TOSS_CLIENT_KEY
```

### 3) 개발 서버
```bash
pnpm dev              # http://localhost:3000
```

### 4) DB / 빌드
```bash
pnpm exec drizzle-kit generate     # schema.ts → 신규 마이그레이션 SQL
pnpm exec drizzle-kit migrate      # MySQL에 적용
pnpm lint                          # ESLint
pnpm exec tsc --noEmit             # 타입 체크
pnpm build                         # 프로덕션 빌드 (Next.js + webpack)
```

---

## 모델 정책 (2026-04-20 개정)

- **LLM**: OpenAI `gpt-5.2-chat-latest` 사용 (승인됨). Anthropic·Google 등 추가 상용 LLM은 별도 승인 필요
- **TTS / 이미지**: 오픈 모델만 허용 (Kokoro, FLUX.1-schnell)
- **대체 가능성 보장**: LLM/TTS/Image 레이어는 `src/lib/{llm,tts,image}/`로 추상화 — 벤더 교체 용이
- **키 관리**: `OPENAI_API_KEY`는 `.env.local`에만 저장, 커밋·로깅·에러 메시지 노출 금지
- **사유 기록**: LLM 예외는 Gemma 4 로컬 구동이 Ollama 호환성 문제로 반복 실패하여 도입. 오픈 LLM 재검토는 `SESSION.md` 열린 질문 참조

---

## 상세 참조

| 문서 | 내용 |
|------|------|
| [SESSION.md](SESSION.md) | 현재 상태, 세션 로그 |
| [GUIDE.md](GUIDE.md) | 작업 원칙, 용어, 오픈모델 구성 |
