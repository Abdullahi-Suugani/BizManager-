import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";

export async function getDashboardSummary(req: Request, res: Response) {
  const where = req.user?.role === "ADMIN" ? {} : { employeeId: req.user!.id };
  const [sales, transactionCount, productCount, employeeCount] = await prisma.$transaction([
    prisma.transaction.aggregate({ where, _sum: { totalAmount: true } }),
    prisma.transaction.count({ where }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: "EMPLOYEE", accountStatus: "ACTIVE" } })
  ]);

  res.json({
    salesTotal: Number(sales._sum.totalAmount ?? 0),
    transactionCount,
    activeProductCount: productCount,
    activeEmployeeCount: employeeCount
  });
}
