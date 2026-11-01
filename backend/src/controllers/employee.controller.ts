import bcrypt from "bcrypt";
import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { HttpError } from "../utils/httpError.js";
import { createEmployeeSchema, createAdminSchema, employeeIdSchema, resetManagedUserPasswordSchema, updateEmployeeSchema, updateManagedUserSchema } from "../validators/employee.validator.js";
import { canCreateAdmin, canManageUserAccount } from "../security/permissions.js";

const employeeSelect = { id: true, name: true, email: true, role: true, permissions: true, emailVerified: true, accountStatus: true, createdAt: true, updatedAt: true } as const;
const managedUserSelect = { ...employeeSelect, mustChangePassword: true } as const;

export async function listManagedUsers(_req: Request, res: Response) {
  const users = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "EMPLOYEE"] } },
    select: managedUserSelect,
    orderBy: { createdAt: "desc" }
  });
  res.json({ users });
}

export async function getManagedUser(req: Request, res: Response) {
  const { id } = employeeIdSchema.parse(req.params);
  const user = await prisma.user.findUnique({ where: { id }, select: managedUserSelect });
  if (!user || user.role === "SUPER_ADMIN") throw new HttpError(404, "User not found");
  res.json({ user });
}

export async function listEmployees(_req: Request, res: Response) {
  const employees = await prisma.user.findMany({ where: { role: "EMPLOYEE" }, select: employeeSelect, orderBy: { createdAt: "desc" } });
  res.json({ employees });
}

export async function createEmployee(req: Request, res: Response) {
  const data = createEmployeeSchema.parse(req.body);
  const existing = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
  if (existing) throw new HttpError(409, "An account with this email already exists");

  const employee = await prisma.user.create({
    data: { name: data.name, email: data.email, passwordHash: await bcrypt.hash(data.password, 12), mustChangePassword: true, role: "EMPLOYEE", permissions: data.permissions, emailVerified: true, accountStatus: "ACTIVE" },
    select: employeeSelect
  });
  res.status(201).json({ employee });
}

export async function createAdminAccount(req: Request, res: Response) {
  if (!req.user || !canCreateAdmin(req.user.role)) throw new HttpError(403, "Only a Super Admin can create Admin accounts");
  const data = createAdminSchema.parse(req.body);
  const existing = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
  if (existing) throw new HttpError(409, "An account with this email already exists");

  const admin = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash: await bcrypt.hash(data.password, 12),
      mustChangePassword: true,
      role: "ADMIN",
      emailVerified: true,
      accountStatus: "ACTIVE"
    },
    select: employeeSelect
  });
  res.status(201).json({ employee: admin });
}

export async function updateManagedUser(req: Request, res: Response) {
  const { id } = employeeIdSchema.parse(req.params);
  const data = updateManagedUserSchema.parse(req.body);
  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, permissions: true, accountStatus: true, mustChangePassword: true }
  });
  if (!existing || existing.role === "SUPER_ADMIN") throw new HttpError(404, "User not found");
  if (!canManageUserAccount(req.user!.role, existing.role)) throw new HttpError(403, "You are not authorized to manage this account");
  if (req.user!.id === id && data.accountStatus === "SUSPENDED") {
    throw new HttpError(400, "You cannot deactivate your own account");
  }
  if (existing.role !== "EMPLOYEE" && data.permissions !== undefined) {
    throw new HttpError(400, "Permissions can only be assigned to Employee accounts");
  }

  req.auditPreviousValues = {
    name: existing.name,
    email: existing.email,
    role: existing.role,
    permissions: existing.permissions,
    accountStatus: existing.accountStatus,
    mustChangePassword: existing.mustChangePassword
  };
  if (data.permissions && JSON.stringify([...data.permissions].sort()) !== JSON.stringify([...existing.permissions].sort())) {
    req.auditActionOverride = "EMPLOYEE_PERMISSIONS_UPDATED";
  }

  if (data.email) {
    const emailOwner = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
    if (emailOwner && emailOwner.id !== id) throw new HttpError(409, "An account with this email already exists");
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(data.name === undefined ? {} : { name: data.name }),
      ...(data.email === undefined ? {} : { email: data.email }),
      ...(data.accountStatus === undefined ? {} : { accountStatus: data.accountStatus }),
      ...(data.permissions === undefined ? {} : { permissions: data.permissions })
    },
    select: managedUserSelect
  });
  res.json({ user });
}

export async function resetManagedUserPassword(req: Request, res: Response) {
  const { id } = employeeIdSchema.parse(req.params);
  const data = resetManagedUserPasswordSchema.parse(req.body);
  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, mustChangePassword: true }
  });
  if (!existing || existing.role === "SUPER_ADMIN") throw new HttpError(404, "User not found");
  if (!canManageUserAccount(req.user!.role, existing.role)) throw new HttpError(403, "You are not authorized to reset this password");

  req.auditPreviousValues = { role: existing.role, mustChangePassword: existing.mustChangePassword };
  const user = await prisma.user.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(data.password, 12), mustChangePassword: true },
    select: managedUserSelect
  });
  res.json({ user });
}

export async function updateEmployee(req: Request, res: Response) {
  const { id } = employeeIdSchema.parse(req.params);
  const data = updateEmployeeSchema.parse(req.body);
  const existing = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, permissions: true, name: true, email: true, accountStatus: true } });
  if (!existing || existing.role !== "EMPLOYEE") throw new HttpError(404, "Employee not found");
  req.auditPreviousValues = {
    name: existing.name,
    email: existing.email,
    permissions: existing.permissions,
    accountStatus: existing.accountStatus
  };
  if (data.permissions && JSON.stringify([...data.permissions].sort()) !== JSON.stringify([...existing.permissions].sort())) {
    req.auditActionOverride = "EMPLOYEE_PERMISSIONS_UPDATED";
  }

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
      ...(data.permissions === undefined ? {} : { permissions: data.permissions }),
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
