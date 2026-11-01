import type { NextFunction, Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import type { Role } from "@prisma/client";
import { prisma } from "../config/prisma.js";

export type ActivityActor = {
  id?: string;
  name: string;
  role?: Role;
};

declare global {
  namespace Express {
    interface Request {
      auditPreviousValues?: Prisma.InputJsonValue;
      auditActionOverride?: string;
    }
  }
}

export async function recordActivity(input: {
  actor?: ActivityActor;
  action: string;
  recordType: string;
  recordId?: string | null;
  description: string;
  success: boolean;
  previousValues?: Prisma.InputJsonValue;
  newValues?: Prisma.InputJsonValue;
}) {
  await prisma.activityLog.create({
    data: {
      actorId: input.actor?.id ?? null,
      actorName: input.actor?.name ?? "Unknown user",
      actorRole: input.actor?.role ?? null,
      action: input.action,
      recordType: input.recordType,
      recordId: input.recordId ?? null,
      description: input.description,
      ...(input.previousValues === undefined ? {} : { previousValues: input.previousValues }),
      ...(input.newValues === undefined ? {} : { newValues: input.newValues }),
      success: input.success
    }
  });
}

export function auditMutation(action: string, recordType: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    let responseRecordId: string | null = null;
    const sendJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      let responseRecord: Record<string, unknown> | undefined;
      if (body && typeof body === "object") {
        for (const value of Object.values(body)) {
          if (value && typeof value === "object" && "id" in value && typeof value.id === "string") {
            responseRecordId = value.id;
            responseRecord = value as Record<string, unknown>;
            break;
          }
        }
      }
      const effectiveAction = req.auditActionOverride ?? action;
      const success = res.statusCode >= 200 && res.statusCode < 400;
      const newValues = success && responseRecord ? safeActivitySnapshot(recordType, responseRecord) : undefined;
      const actor = req.user ? { id: req.user.id, name: req.user.name, role: req.user.role } : undefined;
      const recordId = typeof req.params.id === "string" ? req.params.id : responseRecordId;
      const description = `${effectiveAction} ${recordType.toLowerCase()}${recordId ? ` ${recordId}` : ""}`;
      void recordActivity({
        actor,
        action: effectiveAction,
        recordType,
        recordId,
        description,
        success,
        ...(success && req.auditPreviousValues ? { previousValues: req.auditPreviousValues } : {}),
        ...(newValues ? { newValues } : {})
      }).then(async () => {
        if (recordType === "INVOICE" && success && responseRecord && Array.isArray(responseRecord.items) &&
          responseRecord.items.some((item) => item && typeof item === "object" && "productId" in item && item.productId)) {
          await recordActivity({
            actor,
            action: "INVENTORY_SOLD",
            recordType: "INVENTORY",
            recordId,
            description: `Inventory stock reserved by invoice ${recordId ?? ""}`.trim(),
            success: true
          });
        }
        sendJson(body);
      }).catch((error: unknown) => {
        console.error("Activity log persistence failed", {
          action: effectiveAction,
          recordType,
          error: error instanceof Error ? error.name : "Unknown error"
        });
        res.statusCode = 500;
        sendJson({ message: "The operation may have completed, but its audit record could not be saved. Check the record before retrying." });
      });
      return res;
    }) as Response["json"];
    next();
  };
}

function safeActivitySnapshot(recordType: string, value: Record<string, unknown>): Prisma.InputJsonValue | undefined {
  const allowedFields: Record<string, string[]> = {
    EMPLOYEE: ["name", "email", "role", "permissions", "accountStatus"],
    USER: ["name", "email", "role", "accountStatus"],
    PRODUCT: ["name", "code", "sku", "unitPrice", "stockQuantity", "isActive"],
    INVOICE: ["transactionNumber", "totalAmount", "amountPaid", "isPaid", "paymentMethod", "items"],
    CUSTOMER: ["name", "phone", "address"],
    SETTINGS: ["businessName", "contactEmail", "contactPhone", "address", "currency", "showBusinessContact", "showInvoiceLogo", "showPaymentStatus"],
    INVENTORY: ["productId", "type", "quantity", "reason", "batchNumber", "receivedQuantity", "remainingQuantity"]
  };
  const fields = allowedFields[recordType];
  if (!fields) return undefined;
  const snapshot = Object.fromEntries(fields.filter((field) => field in value).map((field) => [field, normalizeJson(value[field])]));
  if (recordType === "INVOICE" && Array.isArray(snapshot.items)) {
    snapshot.items = snapshot.items.map((item) => {
      if (!item || typeof item !== "object") return {};
      const row = item as Record<string, unknown>;
      return Object.fromEntries(["itemName", "quantity", "unitPrice", "amount", "productId"].filter((field) => field in row).map((field) => [field, normalizeJson(row[field])]));
    });
  }
  return snapshot as Prisma.InputJsonValue;
}

function normalizeJson(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalizeJson);
  if (value && typeof value === "object") {
    if ("toNumber" in value && typeof value.toNumber === "function") return value.toNumber();
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, normalizeJson(child)]));
  }
  return String(value);
}
