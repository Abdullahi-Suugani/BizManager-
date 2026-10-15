import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { reportQuerySchema } from "../validators/report.validator.js";

function range(from?: string, to?: string) {
  const createdAt: { gte?: Date; lt?: Date } = {};
  if (from) createdAt.gte = new Date(`${from}T00:00:00.000Z`);
  if (to) {
    const end = new Date(`${to}T00:00:00.000Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    createdAt.lt = end;
  }
  return createdAt;
}

export async function getSalesReport(req: Request, res: Response) {
  const query = reportQuerySchema.parse(req.query);
  const where = { ...(req.user?.role === "ADMIN" ? {} : { employeeId: req.user!.id }), ...(query.from || query.to ? { createdAt: range(query.from, query.to) } : {}) };
  const transactions = await prisma.transaction.findMany({ where, select: { totalAmount: true, employeeId: true, employee: { select: { id: true, name: true, email: true } } } });
  const byEmployee = new Map<string, { employeeId: string; name: string; email: string; transactionCount: number; salesTotal: number }>();
  let salesTotal = 0;
  for (const transaction of transactions) {
    const total = Number(transaction.totalAmount);
    salesTotal += total;
    const current = byEmployee.get(transaction.employeeId) ?? { employeeId: transaction.employeeId, name: transaction.employee.name, email: transaction.employee.email, transactionCount: 0, salesTotal: 0 };
    current.transactionCount += 1;
    current.salesTotal += total;
    byEmployee.set(transaction.employeeId, current);
  }
  res.json({ from: query.from ?? null, to: query.to ?? null, transactionCount: transactions.length, salesTotal: Number(salesTotal.toFixed(2)), byEmployee: [...byEmployee.values()].map((entry) => ({ ...entry, salesTotal: Number(entry.salesTotal.toFixed(2)) })) });
}
