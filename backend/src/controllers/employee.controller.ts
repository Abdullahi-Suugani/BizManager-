import bcrypt from "bcrypt";
import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { HttpError } from "../utils/httpError.js";
import { createEmployeeSchema, employeeIdSchema, updateEmployeeSchema } from "../validators/employee.validator.js";

const employeeSelect = { id: true, name: true, email: true, role: true, emailVerified: true, accountStatus: true, createdAt: true, updatedAt: true } as const;

export async function listEmployees(_req: Request, res: Response) {
  const employees = await prisma.user.findMany({ where: { role: "EMPLOYEE" }, select: employeeSelect, orderBy: { createdAt: "desc" } });
  res.json({ employees });
}

export async function createEmployee(req: Request, res: Response) {
  const data = createEmployeeSchema.parse(req.body);
  const existing = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
  if (existing) throw new HttpError(409, "An account with this email already exists");

  const employee = await prisma.user.create({
    data: { name: data.name, email: data.email, passwordHash: await bcrypt.hash(data.password, 12), mustChangePassword: true, role: "EMPLOYEE", emailVerified: true, accountStatus: "ACTIVE" },
    select: employeeSelect
  });
  res.status(201).json({ employee });
}

export async function updateEmployee(req: Request, res: Response) {
  const { id } = employeeIdSchema.parse(req.params);
  const data = updateEmployeeSchema.parse(req.body);
  const existing = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!existing || existing.role !== "EMPLOYEE") throw new HttpError(404, "Employee not found");

  if (data.email) {
    const emailOwner = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
    if (emailOwner && emailOwner.id !== id) throw new HttpError(409, "An account with this email already exists");
  }

  const employee = await prisma.user.update({
    where: { id },
    data: {
      ...(data.name === undefined ? {} : { name: data.name }),
      ...(data.email === undefined ? {} : { email: data.email }),
      ...(data.accountStatus === undefined ? {} : { accountStatus: data.accountStatus }),
      ...(data.password === undefined ? {} : { passwordHash: await bcrypt.hash(data.password, 12), mustChangePassword: true })
    },
    select: employeeSelect
  });
  res.json({ employee });
}

export async function deactivateEmployee(req: Request, res: Response) {
  const { id } = employeeIdSchema.parse(req.params);
  const existing = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!existing || existing.role !== "EMPLOYEE") throw new HttpError(404, "Employee not found");
  const employee = await prisma.user.update({ where: { id }, data: { accountStatus: "SUSPENDED" }, select: employeeSelect });
  res.json({ employee });
}
