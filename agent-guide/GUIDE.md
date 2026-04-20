---
name: guide
description: AI 에이전트 작업 원칙과 세션 시작 체크리스트. 세션 시작 시 가장 먼저 읽기.
last-updated: 2026-04-20
---

# 에이전트 가이드

> AI 에이전트가 세션을 시작할 때 읽는 문서입니다.

---

## 작업 원칙

- 모든 커뮤니케이션은 **한국어**로 (코드 변수/함수명은 영어 유지)
- **최소 변경**: 꼭 필요한 범위만 수정
- **근본 원인 해결** 우선, 우회 패치 지양
- **오픈모델 원칙 (LLM 예외, 2026-04-20 변경)**:
  - **LLM**: OpenAI API 허용 (`gpt-5.2-chat-latest`). Anthropic·Google 등 다른 상용 LLM 도입은 별도 승인
  - **TTS / 이미지**: Kokoro · FLUX.1-schnell 등 **오픈 모델 유지**
  - 배경: Gemma 4 E4B 로컬 구동이 Ollama 호환성 문제로 실패 → LLM만 상용으로 전환, 나머지는 원칙 유지
  - API 키는 반드시 `.env.local`에만 저장, 절대 커밋 금지
- 기존 코드 스타일 준수
- 커밋 메시지: `feat/fix/docs/refactor/chore` 형태

---

## 용어 정리

| 용어 | 설명 |
|------|------|
| **Bookshelf** | 책장. 생성된 동화책 목록 뷰 |
| **Level** | 난이도. 연령(5~10세) × CEFR(A1~B1) 조합 (예: `age-7:A1`) |
| **Profile** | 가족 구성원 프로필. 2~3명 전환, 각자 책장/로그 분리 |
| **Passage** | 낭독 단위. 문장 또는 짧은 문단 (TTS 재생 단위) |
| **Reading Log** | 독서 로그. 읽은 책/시각/완료 여부/퀴즈 결과 기록 |
| **Quiz** | 책 완독 후 생성되는 4지선다 5문제 |
| **LLM 모델** | **OpenAI `gpt-5.2-chat-latest`** (2026-04-20부터). 이전에는 Gemma 4 E4B를 Ollama로 돌리려 했으나 호환성 문제로 전환 |
| **Kokoro** | TTS 엔진 (Kokoro-82M, 영어 특화 경량 모델) |
| **FLUX.1-schnell** | 이미지 생성 모델. 책 표지 + 장면 삽화 생성 (MVP 포함) |
| **MCP** | Model Context Protocol. AI가 외부 도구와 통신하는 방식 |
| **P0/P1/P2** | 우선순위. P0(긴급) > P1(중요) > P2(보통) |

---

## 세션 시작 체크리스트

1. **프로젝트 파악**: `PROJECT.md` 읽기
2. **현재 상태 파악**: `SESSION.md` 읽기
3. **작업 확인**: GitHub Issues에서 라벨·마일스톤·우선순위 확인 (`gh issue list --label "priority:P0"`)
4. **작업 제안**: 1~3개 제안, 큰 변경은 계획 먼저

---

## 모델 스택 (하이브리드)

| 용도 | 모델 | 실행 환경 | 오픈/상용 |
|------|------|-----------|----------|
| **텍스트 생성 (LLM)** | `gpt-5.2-chat-latest` | **OpenAI API** | 상용 (승인됨) |
| **TTS** | Kokoro-82M | 로컬 Python 서버 또는 임베디드 | 오픈 |
| **이미지 생성** | FLUX.1-schnell | ComfyUI / Diffusers | 오픈 |

> LLM 외의 상용 API 도입은 반드시 대표님 승인 필요.

---

## MCP 도구 / CLI

| 도구 | 용도 | 사용 예시 |
|------|------|-----------|
| `gh` CLI | GitHub Issues/PR 관리 | `gh issue list`, `gh issue create -l "priority:P0"`, `gh pr create` |
| GitHub MCP (선택) | Claude Code에서 직접 이슈 조작 | 설정 시 `agent-guide/` 문서에 추가 |
| OpenAI SDK (`openai`) | Chat Completions 호출 | `src/lib/llm/client.ts`의 `chatJson()` 사용. 싱글톤 클라이언트 |

### 이슈 라벨 규칙

- `priority:P0` · `priority:P1` · `priority:P2`
- `type:feat` · `type:fix` · `type:docs` · `type:chore` · `type:refactor`
- `area:llm` · `area:tts` · `area:image` · `area:ui` · `area:db`

---

## 문서 역할

| 문서 | 갱신 시점 |
|------|----------|
| `SESSION.md` | 세션 종료 시 (오늘 한 일, 이슈) |
| `PROJECT.md` | 범위/아키텍처 변경 시에만 |
| `GUIDE.md` | 작업 원칙/용어/도구 구성 변경 시 |

---

## 시작 예시

> "현재 상태 요약하고, 오늘 작업 제안해줘"

> "SESSION.md 읽고 이어서 진행하자"
