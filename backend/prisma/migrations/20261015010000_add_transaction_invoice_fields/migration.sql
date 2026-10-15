-- Additive migration. Existing transactions remain valid through nullable
-- customer fields and defaults for financial/status fields.
ALTER TABLE "Transaction"
  ADD COLUMN "customerName" TEXT,
  ADD COLUMN "customerPhone" TEXT,
  ADD COLUMN "customerAddress" TEXT,
  ADD COLUMN "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "isPaid" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "paymentMethod" TEXT NOT NULL DEFAULT 'Cash';
