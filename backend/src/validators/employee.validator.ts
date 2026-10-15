import { z } from "zod";

const employeeStatus = z.enum(["ACTIVE", "SUSPENDED"]);

export const createEmployeeSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128)
});

export const updateEmployeeSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  password: z.string().min(8).max(128).optional(),
  accountStatus: employeeStatus.optional()
}).refine((data) => Object.keys(data).length > 0, "At least one employee field is required");

export const employeeIdSchema = z.object({ id: z.string().cuid() });
