-- Additive migration: existing tables and rows are preserved.
CREATE TABLE "Product" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "unitPrice" DECIMAL(12,2) NOT NULL,
  "stockQuantity" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");
CREATE INDEX "Product_name_idx" ON "Product"("name");
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");

CREATE TABLE "BusinessSettings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "businessName" TEXT NOT NULL DEFAULT 'BizManager Business',
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  "address" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "showBusinessContact" BOOLEAN NOT NULL DEFAULT true,
  "showInvoiceLogo" BOOLEAN NOT NULL DEFAULT false,
  "showPaymentStatus" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BusinessSettings_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TransactionItem" ADD COLUMN "productId" TEXT;
CREATE INDEX "TransactionItem_productId_idx" ON "TransactionItem"("productId");
ALTER TABLE "TransactionItem" ADD CONSTRAINT "TransactionItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
