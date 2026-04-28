-- 동화 생성 인테이크 마법사 — 픽션/논픽션 장르 분기 + LLM 인테이크 보존.
--
-- 컬럼 추가 3건. 모두 NULL 허용이라 기존 books 행은 그대로 유효:
--   - genre        : 'fiction' | 'non_fiction'. NULL은 레거시(=fiction)로 해석.
--   - fun_facts    : 논픽션 전용 추가 정보 카드 [{title, body}] 2~3개.
--   - intake       : 마법사가 받은 LLM 질문 + 사용자 답변 원본(재현/품질 회귀 분석).
--
-- MySQL 8.0+ 는 `ADD COLUMN ... NULL`을 INSTANT 알고리즘으로 처리하므로
-- 대용량 books 테이블이라도 락 없이 즉시 반영된다.

ALTER TABLE `books`
  ADD COLUMN `genre` varchar(16) NULL,
  ADD COLUMN `fun_facts` json NULL,
  ADD COLUMN `intake` json NULL;
