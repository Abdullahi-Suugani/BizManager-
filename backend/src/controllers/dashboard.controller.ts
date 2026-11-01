import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { hasPermission, isBusinessAdministrator } from "../security/permissions.js";

export async function getDashboardSummary(req: Request, res: Response) {
  const isAdministrator = isBusinessAdministrator(req.user!.role);
  const transactionWhere = isAdministrator ? {} : { employeeId: req.user!.id };
  const canViewInvoices = hasPermission(req.user!.role, req.user!.permissions, "invoices.view");
  const canViewProducts = hasPermission(req.user!.role, req.user!.permissions, "products.view");
  const canViewInventory = hasPermission(req.user!.role, req.user!.permissions, "inventory.view");

  let salesTotal = 0;
  let transactionCount = 0;
  if (canViewInvoices) {
    const [sales, count] = await prisma.$transaction([
      prisma.transaction.aggregate({ where: transactionWhere, _sum: { totalAmount: true } }),
      prisma.transaction.count({ where: transactionWhere })
    ]);
    salesTotal = Number(sales._sum.totalAmount ?? 0);
    transactionCount = count;
  }

  let activeProductCount = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let inventoryValue = 0;
  if (canViewProducts || canViewInventory) {
    const [count, products] = await prisma.$transaction([
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.findMany({ where: { isActive: true }, select: { stockQuantity: true, minimumStock: true, costPrice: true } })
    ]);
    activeProductCount = canViewProducts ? count : 0;
    if (canViewInventory) {
      lowStockCount = products.filter((p) => Number(p.stockQuantity) <= Number(p.minimumStock) && Number(p.stockQuantity) > 0).length;
      outOfStockCount = products.filter((p) => Number(p.stockQuantity) <= 0).length;
      inventoryValue = Number(products.reduce((sum, p) => sum + Number(p.stockQuantity) * Number(p.costPrice), 0).toFixed(2));
    }
  }

  const activeEmployeeCount = isAdministrator
    ? await prisma.user.count({ where: { role: "EMPLOYEE", accountStatus: "ACTIVE" } })
    : 0;
  let expiringBatchCount = 0;
  let expiredBatchCount = 0;
  if (canViewInventory) {
    const [expiring, expired] = await prisma.$transaction([
      prisma.productBatch.count({ where: { remainingQuantity: { gt: 0 }, expirationDate: { gt: new Date(), lte: new Date(Date.now() + 30 * 86400000) } } }),
      prisma.productBatch.count({ where: { remainingQuantity: { gt: 0 }, expirationDate: { lt: new Date() } } })
    ]);
    expiringBatchCount = expiring;
    expiredBatchCount = expired;
  }

  res.json({
    salesTotal,
    transactionCount,
    activeProductCount,
    activeEmployeeCount,
    lowStockCount,
    outOfStockCount,
    expiringBatchCount,
    expiredBatchCount,
    inventoryValue
  });
}
