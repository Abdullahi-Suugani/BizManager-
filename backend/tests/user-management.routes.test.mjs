import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import test from "node:test";
import { once } from "node:events";
import { app } from "../src/app.ts";
import { env } from "../src/config/env.ts";
import { prisma } from "../src/config/prisma.ts";

async function startApi(t, role) {
  const actor = {
    id: `test-${role.toLowerCase()}`,
    name: `Test ${role}`,
    email: `${role.toLowerCase()}@example.test`,
    role,
    permissions: [],
    accountStatus: "ACTIVE"
  };
  let created;
  const activityLogs = [];

  t.mock.method(prisma.user, "findUnique", async ({ where }) => {
    if (where.id === actor.id) return actor;
    if (where.email && created?.email === where.email) return { id: created.id };
    return null;
  });
  t.mock.method(prisma.user, "create", async ({ data }) => {
    created = { ...data, id: "created-user-id", createdAt: new Date(), updatedAt: new Date() };
    return {
      id: created.id,
      name: created.name,
      email: created.email,
      role: created.role,
      permissions: created.permissions ?? [],
      emailVerified: created.emailVerified,
      accountStatus: created.accountStatus,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt
    };
  });
  t.mock.method(prisma.activityLog, "create", async ({ data }) => {
    activityLogs.push(data);
    return { id: `activity-${activityLogs.length}` };
  });

  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const address = server.address();
  const token = jwt.sign({ userId: actor.id, role }, env.JWT_SECRET, { expiresIn: "8h" });
  return { url: `http://127.0.0.1:${address.port}/api/users`, token, getCreated: () => created, activityLogs };
}

test("Super Admin creates an Admin account without returning or auditing its password", async (t) => {
  const api = await startApi(t, "SUPER_ADMIN");
  const password = "Initial-Admin-123!";
  const response = await fetch(`${api.url}/admins`, {
    method: "POST",
    headers: { authorization: `Bearer ${api.token}`, "content-type": "application/json" },
    body: JSON.stringify({ name: "Test Admin", email: "  ADMIN@example.test ", password })
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.employee.role, "ADMIN");
  assert.equal(body.employee.email, "admin@example.test");
  assert.equal(api.getCreated().mustChangePassword, true);
  assert.equal(api.getCreated().emailVerified, true);
  assert.equal(await bcrypt.compare(password, api.getCreated().passwordHash), true);
  assert.equal(JSON.stringify(body).includes(password), false);
  assert.equal(JSON.stringify(api.activityLogs).includes(password), false);
  assert.equal(api.activityLogs[0].action, "ADMIN_CREATED");
});

test("Admin creates an Employee with assigned permissions and a forced first-login password change", async (t) => {
  const api = await startApi(t, "ADMIN");
  const password = "employee-temporary-123";
  const response = await fetch(api.url, {
    method: "POST",
    headers: { authorization: `Bearer ${api.token}`, "content-type": "application/json" },
    body: JSON.stringify({
      name: "Test Employee",
      email: "employee@example.test",
      password,
      permissions: ["invoices.view", "inventory.view"]
    })
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.employee.role, "EMPLOYEE");
  assert.deepEqual(api.getCreated().permissions, ["invoices.view", "inventory.view"]);
  assert.equal(api.getCreated().mustChangePassword, true);
  assert.equal(await bcrypt.compare(password, api.getCreated().passwordHash), true);
  assert.equal(JSON.stringify(body).includes(password), false);
  assert.equal(JSON.stringify(api.activityLogs).includes(password), false);
  assert.equal(api.activityLogs[0].action, "EMPLOYEE_CREATED");
});

test("Admin cannot create an Admin through the protected route", async (t) => {
  const api = await startApi(t, "ADMIN");
  const response = await fetch(`${api.url}/admins`, {
    method: "POST",
    headers: { authorization: `Bearer ${api.token}`, "content-type": "application/json" },
    body: JSON.stringify({ name: "Not Allowed", email: "not-allowed@example.test", password: "Initial-Admin-123!" })
  });

  assert.equal(response.status, 403);
  assert.equal(api.getCreated(), undefined);
  assert.equal(api.activityLogs[0].action, "ADMIN_CREATED");
  assert.equal(api.activityLogs[0].success, false);
});
