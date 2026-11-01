import { Router } from "express";
import { createCustomer, deleteCustomer, listCustomers, updateCustomer } from "../controllers/customer.controller.js";
import { auditMutation } from "../middleware/activityAudit.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../security/permissions.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const customerRouter = Router();
customerRouter.use(requireAuth);
customerRouter.get("/", requirePermission("customers.view"), asyncHandler(listCustomers));
customerRouter.post("/", auditMutation("CUSTOMER_CREATED", "CUSTOMER"), requirePermission("customers.manage"), asyncHandler(createCustomer));
customerRouter.put("/:id", auditMutation("CUSTOMER_UPDATED", "CUSTOMER"), requirePermission("customers.manage"), asyncHandler(updateCustomer));
customerRouter.delete("/:id", auditMutation("CUSTOMER_DELETED", "CUSTOMER"), requirePermission("customers.manage"), asyncHandler(deleteCustomer));
