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
- **오픈모델 원칙**: 상용 API(OpenAI, Anthropic 등) 도입 금지. 모든 추론은 로컬(Ollama) 또는 오픈 가중치 기반
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
| **Gemma 4 E4B** | 본 프로젝트의 기본 LLM. Unsloth GGUF + Q4_K_XL 양자화. 태그 `hf.co/unsloth/gemma-4-E4B-it-GGUF:UD-Q4_K_XL` |
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

## 오픈모델 기본 구성

| 용도 | 모델 | 실행 환경 |
|------|------|-----------|
| **텍스트 생성** | Gemma 4 E4B (Unsloth GGUF UD-Q4_K_XL) | Ollama |
| **TTS** | Kokoro-82M | 로컬 Python 서버 또는 임베디드 |
| **이미지 생성** | FLUX.1-schnell | ComfyUI / Diffusers |

> 상용 API 도입 시 반드시 대표님 승인 필요.

---

## MCP 도구 / CLI

| 도구 | 용도 | 사용 예시 |
|------|------|-----------|
| `gh` CLI | GitHub Issues/PR 관리 | `gh issue list`, `gh issue create -l "priority:P0"`, `gh pr create` |
| GitHub MCP (선택) | Claude Code에서 직접 이슈 조작 | 설정 시 `agent-guide/` 문서에 추가 |
| Ollama CLI | 모델 pull/run/list | `ollama list`, `ollama run hf.co/unsloth/gemma-4-E4B-it-GGUF:UD-Q4_K_XL` |

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
