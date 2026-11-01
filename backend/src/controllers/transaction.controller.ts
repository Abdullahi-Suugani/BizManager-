import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { createTransactionSchema } from "../validators/transaction.validator.js";
import { HttpError } from "../utils/httpError.js";
import { transactionQuerySchema } from "../validators/transaction-query.validator.js";

function money(value: number) {
  return Number(value.toFixed(2));
}

function calculateTotals(items: { amount: number }[], discountValue: number, taxRate: number) {
  const subtotal = money(items.reduce((sum, item) => sum + item.amount, 0));
  const discount = money(Math.min(discountValue, subtotal));
  const taxAmount = money((subtotal - discount) * (taxRate / 100));
  return { subtotal, discount, taxAmount, totalAmount: money(subtotal - discount + taxAmount) };
}

async function prepareItems(tx: Prisma.TransactionClient, items: ReturnType<typeof createTransactionSchema.parse>["items"]) {
  const productIds = [...new Set(items.flatMap((item) => item.productId ? [item.productId] : []))];
  const products = await tx.product.findMany({ where: { id: { in: productIds }, isActive: true } });
  const productById = new Map(products.map((product) => [product.id, product]));
  for (const item of items) {
    if (item.productId && !productById.has(item.productId)) {
      throw new HttpError(409, `Inactive or missing product for ${item.itemName}`);
    }
  }

  const calculatedItems = items.map((item) => {
    const product = item.productId ? productById.get(item.productId) : undefined;
    const unitPrice = product ? Number(product.unitPrice) : item.unitPrice;
    return {
      ...(item.productId ? { productId: item.productId } : {}),
      itemName: product?.name ?? item.itemName,
      description: item.description || undefined,
      quantity: item.quantity,
      unitPrice,
      amount: money(item.quantity * unitPrice)
    };
  });

  return { productById, calculatedItems };
}

async function reserveInventory(
  tx: Prisma.TransactionClient,
  userId: string,
  transactionId: string,
  items: { productId?: string; itemName: string; quantity: number }[],
  productById: Awaited<ReturnType<typeof prepareItems>>["productById"]
) {
  const requestedByProduct = new Map<string, number>();
  for (const item of items) {
    if (item.productId) requestedByProduct.set(item.productId, (requestedByProduct.get(item.productId) ?? 0) + item.quantity);
  }

  const productIds = [...requestedByProduct.keys()];
  const batches = await tx.productBatch.findMany({
    where: { productId: { in: productIds }, remainingQuantity: { gt: 0 }, OR: [{ expirationDate: null }, { expirationDate: { gt: new Date() } }] },
    orderBy: [{ expirationDate: { sort: "asc", nulls: "last" } }, { receivedDate: "asc" }]
  });
  const batchesByProduct = new Map<string, typeof batches>();
  for (const batch of batches) batchesByProduct.set(batch.productId, [...(batchesByProduct.get(batch.productId) ?? []), batch]);

  for (const [productId, requested] of requestedByProduct) {
    const product = productById.get(productId);
    if (!product) throw new HttpError(409, "A selected product is no longer available");
    const currentProduct = await tx.product.findUnique({ where: { id: productId }, select: { stockQuantity: true } });
    if (!currentProduct || Number(currentProduct.stockQuantity) < requested) throw new HttpError(409, `Insufficient stock for ${product.name}`);

    const availableBatches = batchesByProduct.get(productId) ?? [];
    if (product.trackExpiry && availableBatches.reduce((sum, batch) => sum + Number(batch.remainingQuantity), 0) < requested) {
      throw new HttpError(409, `Insufficient non-expired batch stock for ${product.name}`);
    }

    let remaining = requested;
    for (const batch of availableBatches) {
      if (!remaining) break;
      const used = Math.min(remaining, Number(batch.remainingQuantity));
      await tx.productBatch.update({ where: { id: batch.id }, data: { remainingQuantity: { decrement: used } } });
      await tx.stockMovement.create({
        data: { productId, batchId: batch.id, type: "SOLD", quantity: used, createdBy: userId, reason: "Invoice sale", reference: transactionId }
      });
      remaining -= used;
    }
    if (remaining > 0) {
      await tx.stockMovement.create({
        data: { productId, type: "SOLD", quantity: remaining, createdBy: userId, reason: "Invoice sale", reference: transactionId }
      });
    }
    await tx.product.update({ where: { id: productId }, data: { stockQuantity: { decrement: requested } } });
  }
}

async function releaseInventory(tx: Prisma.TransactionClient, userId: string, transactionId: string) {
  const movements = await tx.stockMovement.findMany({
    where: { reference: transactionId, type: { in: ["SOLD", "RETURNED"] } },
    orderBy: { createdAt: "asc" }
  });
  const netByBatch = new Map<string, { productId: string; batchId: string | null; quantity: number }>();
  for (const movement of movements) {
    const key = `${movement.productId}:${movement.batchId ?? "unbatched"}`;
    const current = netByBatch.get(key) ?? { productId: movement.productId, batchId: movement.batchId, quantity: 0 };
    current.quantity += movement.type === "SOLD" ? Number(movement.quantity) : -Number(movement.quantity);
    netByBatch.set(key, current);
  }

  const netByProduct = new Map<string, number>();
  for (const movement of netByBatch.values()) {
    if (movement.quantity <= 0) continue;
    netByProduct.set(movement.productId, (netByProduct.get(movement.productId) ?? 0) + movement.quantity);
    if (movement.batchId) {
      await tx.productBatch.update({ where: { id: movement.batchId }, data: { remainingQuantity: { increment: movement.quantity } } });
    }
    await tx.stockMovement.create({
      data: {
        productId: movement.productId,
        batchId: movement.batchId,
        type: "RETURNED",
        quantity: movement.quantity,
        createdBy: userId,
        reason: "Invoice edit reversal",
        reference: transactionId
      }
    });
  }
  for (const [productId, quantity] of netByProduct) {
    await tx.product.update({ where: { id: productId }, data: { stockQuantity: { increment: quantity } } });
  }
}

async function nextTransactionNumber(tx: Prisma.TransactionClient) {
  let suffix = 1;
  let transactionNumber = `TRX-${String((await tx.transaction.count()) + 1).padStart(6, "0")}`;
  while (await tx.transaction.findUnique({ where: { transactionNumber } })) {
    suffix += 1;
    transactionNumber = `TRX-${String((await tx.transaction.count()) + suffix).padStart(6, "0")}`;
  }
  return transactionNumber;
}

function transactionFields(data: ReturnType<typeof createTransactionSchema.parse>, totals: ReturnType<typeof calculateTotals>) {
  return {
    totalAmount: totals.totalAmount,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    customerAddress: data.customerAddress,
    discount: totals.discount,
    taxRate: data.taxRate,
    taxAmount: totals.taxAmount,
    isPaid: data.isPaid,
    paymentMethod: data.paymentMethod
  };
}

const transactionInclude = {
  employee: { select: { id: true, name: true, email: true, role: true } },
  items: true
} as const;

export async function createTransaction(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "You are not authenticated");

  const data = createTransactionSchema.parse(req.body);
  const saved = await prisma.$transaction(async (tx) => {
    const { productById, calculatedItems } = await prepareItems(tx, data.items);
    const totals = calculateTotals(calculatedItems, data.discount, data.taxRate);
    const transaction = await tx.transaction.create({
      data: {
        transactionNumber: await nextTransactionNumber(tx),
        employeeId: req.user!.id,
        ...transactionFields(data, totals)
      }
    });
    await reserveInventory(tx, req.user!.id, transaction.id, data.items, productById);
    return tx.transaction.update({
      where: { id: transaction.id },
      data: { items: { create: calculatedItems } },
      include: transactionInclude
    });
  }, { maxWait: 10000, timeout: 15000 });

  res.status(201).json({ transaction: saved });
}

export async function updateTransaction(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, "You are not authenticated");
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const data = createTransactionSchema.parse(req.body);

  const saved = await prisma.$transaction(async (tx) => {
    const existing = await tx.transaction.findFirst({ where: { id, ...accessFilter(req) }, include: { items: true } });
    if (!existing) throw new HttpError(404, "Invoice not found");

    if (existing.items.some((item) => item.productId)) {
      const trackedMovements = await tx.stockMovement.count({ where: { reference: id, type: { in: ["SOLD", "RETURNED"] } } });
      if (!trackedMovements) {
        throw new HttpError(409, "This older invoice has no linked stock history and cannot be edited safely.");
      }
    }

    const { productById, calculatedItems } = await prepareItems(tx, data.items);
    const totals = calculateTotals(calculatedItems, data.discount, data.taxRate);
    await releaseInventory(tx, req.user!.id, id);
    await reserveInventory(tx, req.user!.id, id, data.items, productById);
    return tx.transaction.update({
      where: { id },
      data: {
        ...transactionFields(data, totals),
        items: { deleteMany: {}, create: calculatedItems }
      },
      include: transactionInclude
    });
  }, { maxWait: 10000, timeout: 15000 });

  res.json({ transaction: saved });
}

function dateRange(from?: string, to?: string) {
  const createdAt: { gte?: Date; lt?: Date } = {};
  if (from) createdAt.gte = new Date(`${from}T00:00:00.000Z`);
  if (to) {
    const nextDay = new Date(`${to}T00:00:00.000Z`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    createdAt.lt = nextDay;
  }
  return createdAt;
}

function accessFilter(req: Request) {
  return req.user?.role === "ADMIN" ? {} : { employeeId: req.user!.id };
}

export async function listTransactions(req: Request, res: Response) {
  const query = transactionQuerySchema.parse(req.query);
  const where = {
    ...accessFilter(req),
    ...(query.invoiceNumber ? { transactionNumber: { contains: query.invoiceNumber, mode: "insensitive" as const } } : {}),
    ...(query.employeeId && req.user?.role === "ADMIN" ? { employeeId: query.employeeId } : {}),
    ...(query.item ? { items: { some: { itemName: { contains: query.item, mode: "insensitive" as const } } } } : {}),
    ...(query.from || query.to ? { createdAt: dateRange(query.from, query.to) } : {})
  };
  const skip = (query.page - 1) * query.pageSize;
  const [transactions, total] = await prisma.$transaction([
    prisma.transaction.findMany({ where, include: transactionInclude, orderBy: { createdAt: "desc" }, skip, take: query.pageSize }),
    prisma.transaction.count({ where })
  ]);
  res.json({ transactions, pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) } });
}

export async function getTransaction(req: Request, res: Response) {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const transaction = await prisma.transaction.findFirst({ where: { id, ...accessFilter(req) }, include: transactionInclude });
  if (!transaction) throw new HttpError(404, "Invoice not found");
  res.json({ transaction });
}
