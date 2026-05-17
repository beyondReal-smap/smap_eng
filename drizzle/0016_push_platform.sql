-- push_tokens 에 platform 컬럼 추가 (Android FCM 통합).
--
-- 기존 행은 모두 iOS 였으므로 default 'ios'. 신규 Android 등록은 'android'.
-- 발송 모듈(`src/lib/push/send.ts`)이 platform 별로 APNs vs FCM 라우팅한다.
ALTER TABLE `push_tokens`
  ADD COLUMN `platform` VARCHAR(16) NOT NULL DEFAULT 'ios' AFTER `device_token`;

-- FCM registration token 은 hex 64자가 아니라 가변 길이 base64url 이라 200으로는 좁다.
-- 표준 FCM 토큰은 ~163자이지만 안전하게 255로 확장.
ALTER TABLE `push_tokens`
  MODIFY COLUMN `device_token` VARCHAR(255) NOT NULL;

-- environment 컬럼은 의미가 platform 별로 다르다:
--   - ios:     'production' | 'sandbox'   (APNs 서버 분기)
--   - android: 'production' (FCM은 환경 분기 없음 — 향후 staging/dev 키 분리 시에만 사용)
-- 그래서 nullable 로 바꾸지 않고 기본값 'production' 유지.
