-- PKCE (RFC 7636) 지원: exchange_code에 code_challenge 컬럼 추가.
-- 앱이 verifier 미전송 시 NULL 유지(backwards compatible). 안정화 후 NOT NULL/require로 전환.
ALTER TABLE `mobile_auth_tokens` ADD `code_challenge` varchar(128);