import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";

export async function getDashboardSummary(req: Request, res: Response) {
  const where = req.user?.role === "ADMIN" ? {} : { employeeId: req.user!.id };
  const [sales, transactionCount, productCount, employeeCount, products, expiringBatches, expiredBatches] = await prisma.$transaction([
    prisma.transaction.aggregate({ where, _sum: { totalAmount: true } }),
    prisma.transaction.count({ where }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: "EMPLOYEE", accountStatus: "ACTIVE" } }),
    prisma.product.findMany({ where: { isActive: true }, select: { stockQuantity: true, minimumStock: true, costPrice: true } }),
    prisma.productBatch.count({ where: { remainingQuantity: { gt: 0 }, expirationDate: { gt: new Date(), lte: new Date(Date.now() + 30 * 86400000) } } }),
    prisma.productBatch.count({ where: { remainingQuantity: { gt: 0 }, expirationDate: { lt: new Date() } } })
  ]);

  res.json({
    salesTotal: Number(sales._sum.totalAmount ?? 0),
    transactionCount,
    activeProductCount: productCount,
    activeEmployeeCount: employeeCount,
    lowStockCount: products.filter(p => Number(p.stockQuantity) <= Number(p.minimumStock) && Number(p.stockQuantity) > 0).length,
    outOfStockCount: products.filter(p => Number(p.stockQuantity) <= 0).length,
    expiringBatchCount: expiringBatches,
    expiredBatchCount: expiredBatches,
    inventoryValue: Number(products.reduce((sum, p) => sum + Number(p.stockQuantity) * Number(p.costPrice), 0).toFixed(2))
  });
}
