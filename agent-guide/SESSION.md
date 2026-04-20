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
