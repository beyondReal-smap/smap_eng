# 문장 탭 재생 — 네이티브 앱(iOS/Android) 이식 스펙

> 웹(Next.js) 리더에 2026-07-26 구현·배포 완료. 같은 기능을 iOS/Android 네이티브
> 리더에 옮기기 위한 스펙. **맥 개발 환경에서 이 문서만 보고 구현 가능하도록 작성.**

## 1. 무엇을 만드는가

리더 본문에서 **전체 낭독을 한 번 들은 뒤**, 문장을 탭하면 **그 문장만** 다시 읽어준다.

- 발동 조건: 해당 passage의 전체 낭독을 한 번이라도 재생한 뒤 (웹의 `playedPassages`)
- 탭 대상: 문장 전체 영역. 단, **밑줄 단어(vocab)를 탭하면 기존 뜻 팝오버만** 뜨고 문장 재생은 안 됨
- 재생 중인 문장은 하이라이트, 끝나면 해제
- 전체 낭독 ↔ 문장 재생은 **양방향으로 서로를 정지**시킨다 (동시 재생 금지)

## 2. 서버 작업 — **이미 끝났고 추가 작업 없음** ✅

문장 재생은 기존 `POST /api/tts/word`를 그대로 쓴다. 앱은 이미 이 API를 호출 중이다.

| 플랫폼 | 기존 호출 위치 | 그대로 재사용 가능 |
|---|---|---|
| iOS | `Features/Vocab/VocabViewModel.swift:203` `speak(_:)` | ✅ 단어 → 문장으로 인자만 바뀜 |
| Android | `features/vocab/VocabViewModel.kt:170` | ✅ 동일 |

- 요청: `POST /api/tts/word`, body `{ "text": "<문장>" }`
- 응답: `{ audioPath, cached, bytes? }` — `audioPath`를 `AppConfig.apiBaseURL`에 붙이고 `Authorization: Bearer` 헤더로 받아 재생 (VocabViewModel과 동일 절차)
- 텍스트 상한 **200자**. 실측(본문 400건/문장 884개) 결과 문장 최대 123자, median 51자라 여유 있음
- 서버가 텍스트 SHA-1로 파일을 캐시하므로 같은 문장 재요청은 즉시 응답. 앱 메모리 캐시는 서버 왕복만 줄이는 용도

## 3. 문장 분리 규칙 (가장 중요 — 그대로 옮길 것)

웹 구현: `src/components/reader/shared.ts` 의 `splitSentences()`

```
종결 정규식:  /[.!?]+["'”’)\]]*\s+/g
약어 예외:    /\b(?:Mr|Mrs|Ms|Dr|St|Jr|Sr|Prof|vs|Fig|No|e\.g|i\.e)\.$/i
```

알고리즘:
1. 종결 정규식으로 매치를 순회한다
2. 매치 직전까지의 문자열이 **약어 예외에 걸리면 문장 경계로 보지 않고 건너뛴다** (`Mr. Kim` 오분리 방지)
3. 아니면 `[start, 매치 끝)` 구간을 한 조각으로 잘라 넣고 `start`를 매치 끝으로 옮긴다
4. 남은 꼬리를 마지막 조각으로 추가하고, 공백뿐인 조각은 버린다

### ⚠️ 반드시 지켜야 할 성질

**조각을 이어붙이면(`join("")`) 원문이 100% 복원되어야 한다.** 각 조각이 뒤따르는
공백·줄바꿈까지 보유하므로, 본문을 조각내 렌더해도 **화면상 텍스트가 달라지지 않는다.**
이 성질이 깨지면 레이아웃이 틀어진다.

### 검증 결과 (웹 구현 기준)

| 항목 | 결과 |
|---|---|
| 실제 passage 400건 → 문장 884개 원문 복원 | **실패 0건** |
| `He said, "Run!" Then he ran away. She waited.` | 3문장 ✅ (인용부호가 종결부호 뒤) |
| `Mr. Kim opened the box. It was empty.` | 2문장 ✅ (약어 예외) |
| `Only one sentence here.` | 1문장 ✅ |
| `First line.\nSecond line here.` | 2문장 ✅ (줄바꿈 보존) |

Android에는 `VocabHighlightTest.kt` 전례가 있으니 **`splitSentences` 단위 테스트를
같은 위치에 추가할 것** (위 4개 케이스 + 원문 복원).

## 4. 렌더 통합 — 양 플랫폼 공통 접근

두 앱 모두 본문을 **토큰 리스트로 분해해 Flow 레이아웃에 흘려넣는** 동일 구조다.

| | iOS | Android |
|---|---|---|
| 렌더 | `PassageView.swift` `VocabAwarePassageText` — `FlowLayout { ForEach(tokens) }` | `PassageView.kt:142` `FlowRow` |
| 토큰화 | `VocabAwarePassageText.tokens` (동 파일) | `VocabHighlight.kt` `tokenizePassage()` |

SwiftUI/Compose 모두 인라인으로 토큰 묶음을 감싸기 어렵다. **문장 단위 View로 감싸려
하지 말고, 토큰에 문장 인덱스를 부여**한다:

```
sentences = splitSentences(text)
tokens = sentences.enumerated().flatMap { (i, s) in
            tokenize(s).map { Token(text: $0.text, isWord: $0.isWord, sentenceIndex: i) }
         }
```

문장별로 토큰화한 뒤 flatten하므로 **기존 Flow 레이아웃을 그대로 유지**하고, 3장의
"원문 복원" 성질 덕분에 렌더 결과도 기존과 동일하다.

그 다음:
- 각 토큰에 탭 제스처를 붙이되 **핸들러는 `token.sentenceIndex`를 넘긴다** → 문장 어디를 눌러도 같은 문장이 재생됨
- 하이라이트: `token.sentenceIndex == playingSentenceIndex`이면 배경색 적용
- **밑줄 단어 토큰(vocab 매칭)은 기존 팝오버 동작을 유지**하고 문장 탭 핸들러를 붙이지 않는다 (웹에서는 `data-vocab-word` 마커로 걸러냄)

## 5. 상태 관리 (ViewModel)

앱에는 웹의 `playedPassages`에 해당하는 **"이 passage를 한 번 들었는가" 상태가 없다.
새로 추가해야 한다.**

- iOS: `Features/Reader/ReaderViewModel.swift` (재생 토글은 `:203` 부근, `AudioPlayer.shared.toggle`)
- Android: `features/reader/ReaderViewModel.kt:155` (`AudioPlayer.toggle`)

추가할 상태:
1. `playedPassageIds: Set<Int>` — 전체 낭독이 실제 재생될 때 삽입. 세션 단위(화면 수명)면 충분
2. `playingSentence: (passageId, sentenceIndex)?` — 문장 재생 중 표시. **passage id를 함께 담아** passage를 넘기면 하이라이트가 자연히 무효화되게 할 것
3. 문장 오디오용 플레이어 인스턴스 + `[문장텍스트: audioPath]` 캐시

정지 규칙(양방향):
- 문장 탭 → 전체 낭독 플레이어 `pause()`
- 전체 낭독 시작 → 문장 플레이어 `pause()` + `playingSentence = nil`
- passage 전환 → 문장 플레이어 `pause()`

> 웹에서 이 양방향 정지 중 한쪽이 빠져 두 음성이 겹치는 버그가 실제로 발생했다. 반드시 양쪽 다 넣을 것.

## 6. 웹 구현 참조 (그대로 대응됨)

| 웹 파일 | 내용 |
|---|---|
| `src/components/reader/shared.ts` | `splitSentences()` + 약어 상수 |
| `src/components/reader/passage-text.tsx` | 문장 래퍼 `SentenceSpan`, 하이라이트, `data-vocab-word` 분리 |
| `src/components/reader.tsx` | `handleSentenceTap`, `playingSentence`, `sentenceTapEnabled`, `🔄 새로 만들기` 버튼 |
| `src/app/api/tts/word/route.ts` | 서버 (수정 불필요) |

## 7. 함께 넣으면 좋은 것 — "🔄 새로 만들기"

웹에는 `POST /api/tts/{passageId}?force=1`을 호출하는 재합성 버튼을 함께 넣었다.

**근거(실측):** Supertonic 합성은 **비결정적**이다. 같은 문장을 반복 합성하면 파형
상관이 0.015로 매번 다른 음성이 나온다. 따라서 발음이 뭉개진 오디오를 만났을 때
**재합성은 실제로 복구가 된다.** 반면 "다시 듣기"는 캐시된 같은 파일을 재생하므로
절대 고쳐지지 않는다. 앱에도 동일 버튼을 넣으면 사용자가 스스로 복구할 수 있다.

- iOS/Android 모두 `/api/tts/{id}` 호출 코드는 이미 있으므로 `?force=1` 쿼리만 추가하면 된다
- 비싼 경로(서버 재합성 수 초)이므로 이미 들어본 passage에서만 노출

## 8. 참고 — TTS 품질 관련 실측 (2026-07-26)

앱 쪽에서 "발음이 이상하다"는 이슈가 올라오더라도 **TTS 설정 튜닝으로 접근하지 말 것.**
ASR(whisper base.en) WER 측정 결과:

| 조건 | WER |
|---|---|
| **현재 운영값** (steps=8, speed=0.85) | **3.52%** ← 최선 |
| steps=16 | 4.29% (+22% 악화) |
| speed=1.0 | 4.73% (+34% 악화) |
| 문장 단위 합성 | 4.73% (+34% 악화) |

- 기존 오디오 1632개 전수 감사 결과 **잘린 파일 0건**
- passage 최대 257자로 라이브러리 300자 청킹은 발생하지 않음
- 남은 WER은 ASR 자체 오차 수준이라 **설정으로 고칠 계통적 오류는 발견되지 않음**
- 조사 스크립트: `.archive/2026-07-26_tts-quality-audit/`

> 참고: 문장 단위 합성이 WER상 더 나쁘게 나온 것은 문장별 오디오를 이어붙여 채점한
> 방식 때문일 수 있다. 문장 탭 재생의 가치는 합성 품질이 아니라 **"못 알아들은 문장만
> 골라 다시 듣는" 학습 UX**에 있다.
