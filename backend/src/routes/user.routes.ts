import { Router } from "express";
import { createAdminAccount, createEmployee, getManagedUser, listManagedUsers, resetManagedUserPassword, updateManagedUser } from "../controllers/employee.controller.js";
import { auditMutation } from "../middleware/activityAudit.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const userRouter = Router();
userRouter.use(requireAuth);
userRouter.get("/", requireRole("ADMIN"), asyncHandler(listManagedUsers));
userRouter.get("/:id", requireRole("ADMIN"), asyncHandler(getManagedUser));
userRouter.post("/", auditMutation("EMPLOYEE_CREATED", "USER"), requireRole("ADMIN"), asyncHandler(createEmployee));
userRouter.post("/admins", auditMutation("ADMIN_CREATED", "USER"), requireRole("SUPER_ADMIN"), asyncHandler(createAdminAccount));
userRouter.patch("/:id", auditMutation("USER_UPDATED", "USER"), requireRole("ADMIN"), asyncHandler(updateManagedUser));
userRouter.post("/:id/password", auditMutation("USER_PASSWORD_RESET", "USER"), requireRole("ADMIN"), asyncHandler(resetManagedUserPassword));
