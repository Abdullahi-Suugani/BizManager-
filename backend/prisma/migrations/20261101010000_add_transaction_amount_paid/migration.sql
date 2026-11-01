ALTER TABLE "Transaction"
ADD COLUMN "amountPaid" DECIMAL(12, 2) NOT NULL DEFAULT 0;

UPDATE "Transaction"
SET "amountPaid" = CASE
  WHEN "isPaid" THEN "totalAmount"
  ELSE 0
END;
