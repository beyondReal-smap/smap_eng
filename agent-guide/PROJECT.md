---
name: project
description: smap_eng 프로젝트 핵심 요약. 프로젝트 구조와 기술 스택 파악용.
last-updated: 2026-04-20
---

# 프로젝트 개요

> **smap_eng** — 아이가 레벨별 영어 동화책을 읽고 **낭독·퀴즈·한글 해석**으로 학습하는 **오픈모델 기반 AI 학습 앱**.

---

## TL;DR

| 항목 | 내용 |
|------|------|
| **프로젝트** | smap_eng |
| **목적** | AI 생성 영어 동화책 + TTS 낭독 + 4지선다 퀴즈 + 한글 해석을 통한 아동 영어 학습 |
| **기술 스택** | Next.js 16.2.4 + React 19.2 + TypeScript / Tailwind 4 / Ollama(Gemma 4 E4B) / Kokoro-82M TTS / FLUX.1-schnell / SQLite + Drizzle |
| **MVP 기능** | 레벨별 동화 생성 · 문장 TTS · 4지선다 5문제 · 한글 해석 · 책장 · 독서 로그/재독 · **이미지 생성** · 가족 프로필 전환 |
| **작업 관리** | **GitHub Issues** — [bluemusk/smap_eng](https://github.com/bluemusk/smap_eng) |

---

## 핵심 기능 (MVP)

| # | 기능 | 구현 핵심 |
|---|------|-----------|
| 1 | **레벨별 동화 생성** | Gemma에 `age + CEFR + topic` 프롬프트 → JSON(제목, 문장 배열, 어휘) |
| 2 | **문장 단위 TTS 낭독** | Kokoro-82M로 Passage별 오디오 생성, 재생 중 현재 문장 하이라이트 |
| 3 | **4지선다 퀴즈 5문제** | 완독 시 Gemma에 본문 + 스키마로 요청, 정답률 기록 |
| 4 | **한글 해석** | 문장/단락 단위 토글. Gemma로 자연스러운 번역 + 어려운 단어 주석 |
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

**현재 상태** (Next.js 16.2.4 스캐폴딩 직후, `src-dir` 구조):

```
smap_eng/
├── agent-guide/            # AI 에이전트 문서 (GUIDE/PROJECT/SESSION)
├── public/                 # 정적 자원
├── src/
│   └── app/                # Next.js App Router
│       ├── layout.tsx
│       ├── page.tsx
│       ├── globals.css
│       └── favicon.ico
├── AGENTS.md               # Next.js 16 에이전트 지침 (⚠️ 브레이킹 체인지 경고)
├── CLAUDE.md               # @AGENTS.md 임포트
├── next.config.ts
├── package.json
├── tsconfig.json
├── eslint.config.mjs
├── postcss.config.mjs
└── .gitignore              # storage/ + *.db 등 추가 설정됨
```

**구현 추가 예정**:

```
src/
├── app/
│   ├── (reader)/           # 책장·리더·퀴즈 화면 그룹
│   │   ├── library/
│   │   ├── book/[id]/
│   │   └── quiz/[bookId]/
│   └── api/
│       ├── books/          # 동화 생성/조회 (POST /generate, GET /:id)
│       ├── tts/            # Kokoro 프록시
│       ├── image/          # FLUX 프록시
│       ├── quiz/           # 퀴즈 생성/채점
│       └── logs/           # 독서 로그
├── components/             # shadcn/ui + 커스텀 (Reader, Bookshelf, QuizCard)
├── lib/
│   ├── llm/                # Ollama 클라이언트 + 레벨별 프롬프트 + Zod 스키마
│   ├── tts/                # Kokoro 연동 (Python 서버 또는 내장)
│   ├── image/              # FLUX.1-schnell 연동
│   ├── db/                 # Drizzle 쿼리 레이어
│   └── utils/
├── types/                  # 공용 타입 (Book, Passage, Quiz, Profile, Level)
└── stores/                 # Zustand 스토어 (current profile, playback)

drizzle/                    # 마이그레이션 산출물
storage/                    # 로컬 바이너리 (.gitignore)
├── audio/                  # TTS 결과 mp3/wav
└── images/                 # FLUX 결과 png
data.db                     # SQLite (.gitignore)
```

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| **프레임워크** | **Next.js 16.2.4** (App Router, `src-dir`) + TypeScript 5.9 + React 19.2 |
| **UI** | **Tailwind CSS 4** (`@tailwindcss/postcss`) + shadcn/ui (예정) |
| **린터** | ESLint 9 (`eslint-config-next`) |
| **상태관리** | Zustand |
| **LLM** | Ollama + **Gemma 4 E4B** (Unsloth GGUF, `hf.co/unsloth/gemma-4-E4B-it-GGUF:UD-Q4_K_XL`) |
| **TTS** | Kokoro-82M (영어 특화 경량 모델) |
| **이미지 생성** | FLUX.1-schnell (ComfyUI 또는 Diffusers) — MVP 포함 |
| **데이터베이스** | SQLite (파일 기반) |
| **ORM** | Drizzle ORM |
| **오디오 저장** | 로컬 파일 시스템 (`./storage/audio/`) |
| **이미지 저장** | 로컬 파일 시스템 (`./storage/images/`) |

---

## 데이터 모델 (초안)

| 테이블 | 핵심 컬럼 |
|--------|-----------|
| `profiles` | id, name, avatar, created_at |
| `books` | id, profile_id, title, level(age+cefr), topic, created_at, cover_image_path |
| `passages` | id, book_id, order, text_en, text_ko, audio_path, scene_image_path |
| `quizzes` | id, book_id, question, choices(JSON), answer_index |
| `reading_logs` | id, profile_id, book_id, started_at, finished_at, progress_ratio, quiz_score |

> 상세 스키마는 `drizzle/schema.ts` 구현 시 확정.

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
cd /Users/genie/SmapSource/smap_eng
pnpm install
```

### 2) Ollama 서버 실행 및 모델 pull
```bash
# 서버 (별도 터미널 또는 macOS Ollama.app)
ollama serve

# 모델 pull (최초 1회, 약 3~5GB)
ollama pull hf.co/unsloth/gemma-4-E4B-it-GGUF:UD-Q4_K_XL

# 대화 테스트
ollama run hf.co/unsloth/gemma-4-E4B-it-GGUF:UD-Q4_K_XL
```

### 3) 개발 서버
```bash
pnpm dev              # http://localhost:3000
```

### 4) 추후 추가 예정
```bash
pnpm drizzle:generate # Drizzle 스키마 → 마이그레이션 생성
pnpm drizzle:migrate  # 마이그레이션 적용 (data.db)
pnpm lint             # ESLint
pnpm build            # 프로덕션 빌드
```

---

## 오픈모델 원칙

- **상용 API 금지**: OpenAI, Anthropic, Google Cloud TTS 등 폐쇄형 유료 API 도입 금지
- **로컬 우선**: 모델은 Ollama / 로컬 Python 서버에서 구동
- **대체 가능성 보장**: LLM/TTS/Image 레이어는 추상화하여 모델 교체 용이하게 구성

---

## 상세 참조

| 문서 | 내용 |
|------|------|
| [SESSION.md](SESSION.md) | 현재 상태, 세션 로그 |
| [GUIDE.md](GUIDE.md) | 작업 원칙, 용어, 오픈모델 구성 |
