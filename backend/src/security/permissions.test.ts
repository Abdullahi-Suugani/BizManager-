import assert from "node:assert/strict";
import test from "node:test";
import { canCreateAdmin, employeePermissions, hasPermission, isBusinessAdministrator } from "./permissions.js";

test("Admin and Super Admin share all business capabilities", () => {
  for (const role of ["ADMIN", "SUPER_ADMIN"] as const) {
    assert.equal(isBusinessAdministrator(role), true);
    for (const permission of employeePermissions) {
      assert.equal(hasPermission(role, [], permission), true);
    }
  }
});

test("employees receive only explicitly assigned capabilities", () => {
  assert.equal(isBusinessAdministrator("EMPLOYEE"), false);
  assert.equal(hasPermission("EMPLOYEE", ["invoices.view"], "invoices.view"), true);
  assert.equal(hasPermission("EMPLOYEE", ["invoices.view"], "invoices.edit"), false);
  assert.equal(hasPermission("EMPLOYEE", ["products.manage"], "products.view"), true);
  assert.equal(hasPermission("EMPLOYEE", ["inventory.manage"], "inventory.view"), true);
});

test("only Super Admin can create Admin accounts", () => {
  assert.equal(canCreateAdmin("SUPER_ADMIN"), true);
  assert.equal(canCreateAdmin("ADMIN"), false);
  assert.equal(canCreateAdmin("EMPLOYEE"), false);
});

test("permission names are restricted to the known capability allowlist", () => {
  assert.equal(employeePermissions.includes("inventory.manage"), true);
  const knownPermissions: readonly string[] = employeePermissions;
  assert.equal(knownPermissions.includes("accounts.promote"), false);
});
