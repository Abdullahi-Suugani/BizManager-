import assert from "node:assert/strict";
import test from "node:test";
import { createAdminSchema, createEmployeeSchema, resetManagedUserPasswordSchema, updateManagedUserSchema } from "./employee.validator.js";

test("employee creation normalizes email and accepts assigned capabilities", () => {
  const parsed = createEmployeeSchema.parse({
    name: "Example Employee",
    email: "EMPLOYEE@EXAMPLE.COM",
    password: "temporary8",
    permissions: ["invoices.view", "products.view"]
  });
  assert.equal(parsed.email, "employee@example.com");
  assert.deepEqual(parsed.permissions, ["invoices.view", "products.view"]);
});

test("Admin creation requires a 12-character initial password", () => {
  assert.equal(createAdminSchema.safeParse({
    name: "Example Admin",
    email: "admin@example.com",
    password: "twelve-chars"
  }).success, true);
  assert.equal(createAdminSchema.safeParse({
    name: "Example Admin",
    email: "admin@example.com",
    password: "short"
  }).success, false);
});

test("managed-user edits reject role and password changes", () => {
  assert.equal(updateManagedUserSchema.safeParse({ role: "ADMIN" }).success, false);
  assert.equal(updateManagedUserSchema.safeParse({ password: "replacement-password" }).success, false);
});

test("password reset requires a temporary password of at least 12 characters", () => {
  assert.equal(resetManagedUserPasswordSchema.safeParse({ password: "safe-temporary-password" }).success, true);
  assert.equal(resetManagedUserPasswordSchema.safeParse({ password: "short" }).success, false);
});
