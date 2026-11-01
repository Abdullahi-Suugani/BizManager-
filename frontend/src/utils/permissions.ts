import type { Permission, User } from "../types/auth";

export function canAccess(user: User | null, permission: Permission) {
  if (!user) return false;
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") return true;
  if (user.permissions.includes(permission)) return true;
  const implications: Partial<Record<Permission, Permission[]>> = {
    "invoices.view": ["invoices.create", "invoices.edit", "invoices.delete"],
    "products.view": ["products.manage"],
    "customers.view": ["customers.manage"],
    "inventory.view": ["inventory.manage"]
  };
  return implications[permission]?.some((item) => user.permissions.includes(item)) ?? false;
}
