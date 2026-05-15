-- 결말 분기(alternate_ending)의 사전 합성 TTS 경로 저장 컬럼.
--   - ending_audio_paths_a: 결말 A passages의 webPath 배열 (orderIndex 순).
--   - ending_audio_paths_b: 결말 B passages의 webPath 배열.
-- 합성 실패 슬롯은 ''(빈 문자열)로 보존하여 인덱스 정렬 유지.
-- 합성 전(또는 레거시 책)은 NULL — Reader는 NULL이면 음성 없이 텍스트만 표시.
--
-- MySQL 8.0+는 NULL 허용 컬럼 추가를 INSTANT 알고리즘으로 처리하므로 무락.

ALTER TABLE `books`
  ADD COLUMN `ending_audio_paths_a` json NULL,
  ADD COLUMN `ending_audio_paths_b` json NULL;
