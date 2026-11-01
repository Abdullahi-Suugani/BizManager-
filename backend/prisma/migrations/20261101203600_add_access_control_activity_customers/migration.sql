ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';

ALTER TABLE "User"
ADD COLUMN "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "User"
SET "permissions" = ARRAY[
  'invoices.view',
  'invoices.create',
  'invoices.edit',
  'products.view',
  'inventory.view',
  'reports.view'
]::TEXT[]
WHERE "role" = 'EMPLOYEE';

CREATE TABLE "Customer" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "address" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActivityLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "actorName" TEXT NOT NULL,
  "actorRole" "Role",
  "action" TEXT NOT NULL,
  "recordType" TEXT NOT NULL,
  "recordId" TEXT,
  "description" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "previousValues" JSONB,
  "newValues" JSONB,
  "success" BOOLEAN NOT NULL,
  CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Transaction" ADD COLUMN "customerId" TEXT;

CREATE INDEX "Customer_name_idx" ON "Customer"("name");
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");
CREATE INDEX "ActivityLog_occurredAt_idx" ON "ActivityLog"("occurredAt");
CREATE INDEX "ActivityLog_actorName_idx" ON "ActivityLog"("actorName");
CREATE INDEX "ActivityLog_actorRole_action_idx" ON "ActivityLog"("actorRole", "action");
CREATE INDEX "ActivityLog_recordType_recordId_idx" ON "ActivityLog"("recordType", "recordId");
CREATE INDEX "Transaction_customerId_idx" ON "Transaction"("customerId");

ALTER TABLE "Customer"
ADD CONSTRAINT "Customer_createdBy_fkey"
FOREIGN KEY ("createdBy") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Transaction"
ADD CONSTRAINT "Transaction_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
