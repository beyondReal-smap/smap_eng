-- 프로필 soft delete 지원.
--
-- 책 / 학습기록 / 단어 진도는 보존하고 ProfilePickerView에서만 안 보이게 한다.
-- listProfiles 등 모든 사용자 노출 경로는 deleted_at IS NULL 필터를 적용해야 한다.

ALTER TABLE `profiles`
  ADD COLUMN `deleted_at` TIMESTAMP NULL DEFAULT NULL;
