export type Role = "ADMIN" | "EMPLOYEE";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
};
