import { z } from "zod";
import { employeePermissions } from "../security/permissions.js";

const employeeStatus = z.enum(["ACTIVE", "SUSPENDED"]);
const permissionList = z.array(z.enum(employeePermissions)).max(employeePermissions.length);

export const createEmployeeSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
  permissions: permissionList.optional().default([])
});

export const updateEmployeeSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  password: z.string().min(8).max(128).optional(),
  accountStatus: employeeStatus.optional(),
  permissions: permissionList.optional()
}).refine((data) => Object.keys(data).length > 0, "At least one employee field is required");

export const createAdminSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(12).max(128)
});

export const employeeIdSchema = z.object({ id: z.string().cuid() });

export const updateManagedUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  accountStatus: employeeStatus.optional(),
  permissions: permissionList.optional()
}).strict().refine((data) => Object.keys(data).length > 0, "At least one user field is required");

export const resetManagedUserPasswordSchema = z.object({
  password: z.string().min(12).max(128)
}).strict();
