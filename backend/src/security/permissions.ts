import type { Role } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/httpError.js";

export const employeePermissions = [
  "invoices.view",
  "invoices.create",
  "invoices.edit",
  "invoices.delete",
  "products.view",
  "products.manage",
  "customers.view",
  "customers.manage",
  "inventory.view",
  "inventory.manage",
  "reports.view"
] as const;

export type EmployeePermission = typeof employeePermissions[number];
const permissionImplications: Partial<Record<EmployeePermission, EmployeePermission[]>> = {
  "invoices.view": ["invoices.create", "invoices.edit", "invoices.delete"],
  "products.view": ["products.manage"],
  "customers.view": ["customers.manage"],
  "inventory.view": ["inventory.manage"]
};

export function isBusinessAdministrator(role: Role) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function canCreateAdmin(role: Role) {
  return role === "SUPER_ADMIN";
}

export function hasPermission(role: Role, permissions: string[], permission: EmployeePermission) {
  return isBusinessAdministrator(role) || permissions.includes(permission) ||
    (permissionImplications[permission]?.some((impliedPermission) => permissions.includes(impliedPermission)) ?? false);
}

export function requireAnyPermission(...permissions: EmployeePermission[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !permissions.some((permission) => hasPermission(req.user!.role, req.user!.permissions, permission))) {
      next(new HttpError(403, `Permission denied: one of ${permissions.join(", ")} is required`));
      return;
    }

    next();
  };
}

export function requirePermission(permission: EmployeePermission) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !hasPermission(req.user.role, req.user.permissions, permission)) {
      next(new HttpError(403, `Permission denied: ${permission} is required`));
      return;
    }

    next();
  };
}
