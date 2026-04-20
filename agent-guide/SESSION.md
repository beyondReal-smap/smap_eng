---
name: session
description: smap_eng 프로젝트 현재 상태. 세션 시작 시 현재 상태 파악용.
last-updated: 2026-04-20
---

# 세션 상태

> 세션 시작 시 현재 상태를 빠르게 파악하기 위한 문서

---

## 작업 관리

| 항목 | 내용 |
|------|------|
| **도구** | GitHub Issues |
| **레포** | [github.com/bluemusk/smap_eng](https://github.com/bluemusk/smap_eng) (clone: `git@github.com:bluemusk/smap_eng.git`) |
| **라벨 규칙** | `priority:P0/P1/P2`, `type:feat/fix/docs/chore`, `area:llm/tts/image/ui/db` |
| **조회 명령** | `gh issue list --label "priority:P0"` |

---

## 다음 작업

| 우선순위 | 작업 | 상태 |
|---------|------|------|
| **P0** | ~~Next.js 14 초기화~~ → **Next.js 16.2.4 + Tailwind 4 + React 19** 스캐폴딩 | ✅ Done (2026-04-20) |
| **P0** | ~~Ollama + Gemma 4 E4B 로드~~ → **OpenAI API 전환** (`gpt-5.2-chat-latest`) | ✅ Done (2026-04-20, 대표님 키 입력 대기) |
| **P0** | `src/lib/db/` Drizzle 스키마 구현 (`profiles` / `books` / `passages` / `quizzes` / `reading_logs`) | Todo |
| **P1** | `src/lib/llm/` OpenAI 클라이언트 + 레벨별 동화 프롬프트 + Zod 스키마 | ✅ Done (2026-04-20) |
| **P0** | OpenAI API 키 입력 (`.env.local`) + 실제 호출 스모크 테스트 | 🔄 대표님 키 입력 대기 |
| **P1** | `src/lib/tts/` Kokoro-82M TTS 연동 | Todo |
| **P1** | `src/lib/image/` FLUX.1-schnell 이미지 생성 (책 표지 + 장면 삽화) | Todo |
| **P1** | shadcn/ui 설치 + Bookshelf / Reader / QuizCard 컴포넌트 | Todo |
| **P1** | API 라우트: `/api/books`, `/api/tts`, `/api/image`, `/api/quiz`, `/api/logs` | Todo |
| **P1** | 한글 해석 토글 (문장/단락) | Todo |
| **P2** | Zustand 스토어 (가족 프로필 전환 2~3명) | Todo |
| **P2** | 독서 로그/재독 UI + 쿼리 |Todo |

---

## 열린 질문 / 확인 필요

| # | 질문 | 상태 |
|---|------|------|
| 1 | Kokoro 구동 방식 (별도 Python 서버 vs Node 내 임베딩) | 구현 시 결정 |
| 2 | FLUX.1-schnell 구동 방식 (ComfyUI API vs Diffusers Python 서버) | 구현 시 결정 |
| 3 | 향후 오픈 LLM 재검토 (Gemma 4 Ollama 지원 안정화 시 전환 가능성) | 분기별 재평가 |
| 4 | Next.js 16 브레이킹 체인지 — `AGENTS.md` 지침 준수 | 구현 중 상시 확인 |
| 5 | `/usr/local/bin/ollama` 잔여 심링크 삭제 (root 소유, `sudo rm /usr/local/bin/ollama`) | 대표님 수동 처리 |

---

## 기타 이슈

없음

---

## 최근 세션

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
