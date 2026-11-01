import { Router } from "express";
import { createAdminAccount, createEmployee, deactivateEmployee, listEmployees, updateEmployee } from "../controllers/employee.controller.js";
import { auditMutation } from "../middleware/activityAudit.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const employeeRouter = Router();
employeeRouter.use(requireAuth);
employeeRouter.get("/", requireRole("ADMIN"), asyncHandler(listEmployees));
employeeRouter.post("/", auditMutation("EMPLOYEE_CREATED", "EMPLOYEE"), requireRole("ADMIN"), asyncHandler(createEmployee));
employeeRouter.post("/admins", auditMutation("ADMIN_CREATED", "USER"), requireRole("SUPER_ADMIN"), asyncHandler(createAdminAccount));
employeeRouter.patch("/:id", auditMutation("EMPLOYEE_UPDATED", "EMPLOYEE"), requireRole("ADMIN"), asyncHandler(updateEmployee));
employeeRouter.post("/:id/deactivate", auditMutation("EMPLOYEE_SUSPENDED", "EMPLOYEE"), requireRole("ADMIN"), asyncHandler(deactivateEmployee));
