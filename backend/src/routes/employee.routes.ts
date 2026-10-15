import { Router } from "express";
import { createEmployee, deactivateEmployee, listEmployees, updateEmployee } from "../controllers/employee.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const employeeRouter = Router();
employeeRouter.use(requireAuth, requireRole("ADMIN"));
employeeRouter.get("/", asyncHandler(listEmployees));
employeeRouter.post("/", asyncHandler(createEmployee));
employeeRouter.patch("/:id", asyncHandler(updateEmployee));
employeeRouter.post("/:id/deactivate", asyncHandler(deactivateEmployee));
