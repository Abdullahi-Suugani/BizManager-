export type Role = "SUPER_ADMIN" | "ADMIN" | "EMPLOYEE";

export type Permission =
  | "invoices.view"
  | "invoices.create"
  | "invoices.edit"
  | "invoices.delete"
  | "products.view"
  | "products.manage"
  | "customers.view"
  | "customers.manage"
  | "inventory.view"
  | "inventory.manage"
  | "reports.view";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions: Permission[];
  mustChangePassword?: boolean;
};
