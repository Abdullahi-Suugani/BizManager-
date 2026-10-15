import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { createTransactionSchema } from "../validators/transaction.validator.js";
import { HttpError } from "../utils/httpError.js";
import { transactionQuerySchema } from "../validators/transaction-query.validator.js";

function money(value: number) {
  return Number(value.toFixed(2));
}

export async function createTransaction(req: Request, res: Response) {
  if (!req.user) {
    throw new HttpError(401, "You are not authenticated");
  }

  const data = createTransactionSchema.parse(req.body);
  const calculatedItems = data.items.map((item) => ({
    ...(item.productId ? { productId: item.productId } : {}),
    itemName: item.itemName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    amount: money(item.quantity * item.unitPrice)
  }));

  const subtotal = money(calculatedItems.reduce((sum, item) => sum + item.amount, 0));
  const discount = money(Math.min(data.discount, subtotal));
  const discountedSubtotal = money(subtotal - discount);
  const taxAmount = money(discountedSubtotal * (data.taxRate / 100));
  const totalAmount = money(discountedSubtotal + taxAmount);

  const saved = await prisma.$transaction(async (tx) => {
    for (const item of data.items) {
      if (!item.productId) continue;
      const updated = await tx.product.updateMany({ where: { id: item.productId, isActive: true, stockQuantity: { gte: item.quantity } }, data: { stockQuantity: { decrement: item.quantity } } });
      if (!updated.count) throw new HttpError(409, `Insufficient stock or inactive product for ${item.itemName}`);
    }
    let transactionNumber = `TRX-${String((await tx.transaction.count()) + 1).padStart(6, "0")}`;
    let suffix = 1;

    while (await tx.transaction.findUnique({ where: { transactionNumber } })) {
      suffix += 1;
      transactionNumber = `TRX-${String((await tx.transaction.count()) + suffix).padStart(6, "0")}`;
    }

    return tx.transaction.create({
      data: {
        transactionNumber,
        employeeId: req.user!.id,
        totalAmount,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerAddress: data.customerAddress,
        discount,
        taxRate: data.taxRate,
        taxAmount,
        isPaid: data.isPaid,
        paymentMethod: data.paymentMethod,
        items: {
          create: calculatedItems
        }
      },
      include: {
        employee: { select: { id: true, name: true, email: true, role: true } },
        items: true
      }
    });
  });

  res.status(201).json({ transaction: saved });
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

const transactionInclude = {
  employee: { select: { id: true, name: true, email: true, role: true } },
  items: true
} as const;

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
