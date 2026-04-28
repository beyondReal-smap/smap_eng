-- 환불 원장의 reversed_tx_id가 실제 존재하는 consume tx만 가리키도록 DB 수준에서 강제.
-- ON DELETE SET NULL: 원본 tx가 사라져도 환불 행은 감사 추적용으로 보존.
ALTER TABLE `credit_transactions` ADD CONSTRAINT `credit_transactions_reversed_tx_id_credit_transactions_id_fk` FOREIGN KEY (`reversed_tx_id`) REFERENCES `credit_transactions`(`id`) ON DELETE set null ON UPDATE no action;