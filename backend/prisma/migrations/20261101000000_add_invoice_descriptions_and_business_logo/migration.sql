-- Additive invoice fields; existing transactions and business settings remain unchanged.
ALTER TABLE "TransactionItem" ADD COLUMN "description" TEXT;
ALTER TABLE "BusinessSettings" ADD COLUMN "logoData" TEXT;
