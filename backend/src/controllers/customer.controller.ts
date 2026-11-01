import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { HttpError } from "../utils/httpError.js";

const customerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable()
});
const idSchema = z.object({ id: z.string().cuid() });

export async function listCustomers(_req: Request, res: Response) {
  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { invoices: true } } }
  });
  res.json({ customers });
}

export async function createCustomer(req: Request, res: Response) {
  const data = customerSchema.parse(req.body);
  const customer = await prisma.customer.create({
    data: { ...data, createdBy: req.user!.id }
  });
  res.status(201).json({ customer });
}

export async function updateCustomer(req: Request, res: Response) {
  const { id } = idSchema.parse(req.params);
  const data = customerSchema.parse(req.body);
  const existing = await prisma.customer.findUnique({ where: { id }, select: { name: true, phone: true, address: true } });
  if (!existing) throw new HttpError(404, "Customer not found");
  req.auditPreviousValues = { name: existing.name, phone: existing.phone, address: existing.address };
  const updated = await prisma.customer.updateMany({ where: { id }, data });
  if (!updated.count) throw new HttpError(404, "Customer not found");
  const customer = await prisma.customer.findUniqueOrThrow({ where: { id } });
  res.json({ customer });
}

export async function deleteCustomer(req: Request, res: Response) {
  const { id } = idSchema.parse(req.params);
  const existing = await prisma.customer.findUnique({ where: { id }, select: { name: true, phone: true, address: true } });
  if (!existing) throw new HttpError(404, "Customer not found");
  req.auditPreviousValues = { name: existing.name, phone: existing.phone, address: existing.address };
  const deleted = await prisma.customer.deleteMany({ where: { id } });
  if (!deleted.count) throw new HttpError(404, "Customer not found");
  res.json({ message: "Customer deleted. Existing invoice customer details are preserved." });
}
