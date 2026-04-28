-- 환불(kind='refund') 원장 idempotency 키.
-- 동일한 consume tx 두 번 환불을 막기 위해 reversed_tx_id에 UNIQUE 인덱스.
-- MySQL은 NULL을 unique 위반으로 보지 않으므로 consume/grant/purchase 행은 자유롭게 NULL 유지.
ALTER TABLE `credit_transactions` ADD `reversed_tx_id` int;--> statement-breakpoint
ALTER TABLE `credit_transactions` ADD CONSTRAINT `credit_tx_reversed_idx` UNIQUE(`reversed_tx_id`);