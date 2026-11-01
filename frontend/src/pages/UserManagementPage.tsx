import { Fragment, useEffect, useState } from "react";
import axios from "axios";
import { api } from "../services/api";
import type { Permission, User } from "../types/auth";
import { useAuth } from "../context/AuthContext";

type ManagedUser = User & {
  emailVerified: boolean;
  accountStatus: "ACTIVE" | "PENDING" | "SUSPENDED";
  createdAt: string;
};
type FormMode = "create" | "edit" | "reset" | null;
type UserDraft = { name: string; email: string; password: string; role: "ADMIN" | "EMPLOYEE" };

const permissionOptions: readonly [Permission, string][] = [
  ["invoices.view", "View invoices"],
  ["invoices.create", "Create invoices"],
  ["invoices.edit", "Edit invoices"],
  ["invoices.delete", "Delete invoices"],
  ["products.view", "View products"],
  ["products.manage", "Manage products"],
  ["customers.view", "View customers"],
  ["customers.manage", "Manage customers"],
  ["inventory.view", "View inventory"],
  ["inventory.manage", "Manage inventory"],
  ["reports.view", "View reports"]
];
const initialPermissions: Permission[] = ["invoices.view", "invoices.create", "invoices.edit", "products.view", "inventory.view", "reports.view"];
const emptyDraft = (): UserDraft => ({ name: "", email: "", password: "", role: "EMPLOYEE" });

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ message?: string }>(error)) return error.response?.data?.message ?? fallback;
  return fallback;
}

function generateSecurePassword() {
  const bytes = window.crypto.getRandomValues(new Uint8Array(18));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function UserManagementPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [draft, setDraft] = useState<UserDraft>(emptyDraft);
  const [permissions, setPermissions] = useState<Permission[]>(initialPermissions);
  const [mode, setMode] = useState<FormMode>(null);
  const [target, setTarget] = useState<ManagedUser | null>(null);
  const [viewing, setViewing] = useState<ManagedUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadUsers() {
    try {
      const response = await api.get<{ users: ManagedUser[] }>("/users");
      setUsers(response.data.users);
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, "Unable to load users."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadUsers(); }, []);

  function closeForm() {
    setMode(null);
    setTarget(null);
    setDraft(emptyDraft());
    setPermissions(initialPermissions);
    setShowPassword(false);
  }

  function startCreate() {
    setError("");
    setMessage("");
    setTarget(null);
    setDraft(emptyDraft());
    setPermissions(initialPermissions);
    setShowPassword(false);
    setMode("create");
  }

  function startEdit(account: ManagedUser) {
    setError("");
    setMessage("");
    setTarget(account);
    setDraft({ name: account.name, email: account.email, password: "", role: account.role as "ADMIN" | "EMPLOYEE" });
    setPermissions(account.permissions);
    setShowPassword(false);
    setMode("edit");
  }

  function startPasswordReset(account: ManagedUser) {
    setError("");
    setMessage("");
    setTarget(account);
    setDraft({ ...emptyDraft(), role: account.role as "ADMIN" | "EMPLOYEE" });
    setShowPassword(false);
    setMode("reset");
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      if (mode === "create") {
        if (draft.role === "ADMIN") {
          await api.post("/users/admins", { name: draft.name, email: draft.email, password: draft.password });
          setMessage("Admin account created. They must change their password at first login.");
        } else {
          await api.post("/users", { name: draft.name, email: draft.email, password: draft.password, permissions });
          setMessage("Employee account created. They must change their password at first login.");
        }
      } else if (mode === "edit" && target) {
        await api.patch(`/users/${target.id}`, {
          name: draft.name,
          email: draft.email,
          ...(target.role === "EMPLOYEE" ? { permissions } : {})
        });
        setMessage("User account updated.");
      } else if (mode === "reset" && target) {
        await api.post(`/users/${target.id}/password`, { password: draft.password });
        setMessage("Password reset. The user must change it at their next login.");
      } else {
        return;
      }
      closeForm();
      await loadUsers();
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, "Unable to save user account."));
    }
  }

  async function toggleStatus(account: ManagedUser) {
    setError("");
    setMessage("");
    try {
      const nextStatus = account.accountStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
      await api.patch(`/users/${account.id}`, { accountStatus: nextStatus });
      setMessage(nextStatus === "ACTIVE" ? "User account activated." : "User account deactivated.");
      await loadUsers();
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, "Unable to update account status."));
    }
  }

  async function showDetails(account: ManagedUser) {
    setError("");
    if (viewing?.id === account.id) {
      setViewing(null);
      return;
    }
    try {
      const response = await api.get<{ user: ManagedUser }>(`/users/${account.id}`);
      setViewing(response.data.user);
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, "Unable to load user details."));
    }
  }

  function canManage(account: ManagedUser) {
    return account.role === "EMPLOYEE" || user?.role === "SUPER_ADMIN";
  }

  const minimumPasswordLength = mode === "reset" || draft.role === "ADMIN" ? 12 : 8;
  const passwordLabel = mode === "reset" ? "New temporary password" : "Initial password";

  return <section className="min-w-0 bg-[#f5f7f6] p-3 text-slate-950 sm:p-6 lg:p-8">
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-emerald-800 sm:text-3xl">User Management</h1>
          <p className="mt-2 text-slate-600">Manage Admin and Employee accounts, permissions, and account access.</p>
        </div>
        <button type="button" onClick={startCreate} className="min-h-11 rounded bg-emerald-700 px-4 font-semibold text-white">Create user</button>
      </header>

      {mode ? <form onSubmit={submitForm} className="grid min-w-0 gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
        <div className="sm:col-span-2 lg:col-span-4">
          <h2 className="font-bold">{mode === "create" ? "Create user" : mode === "edit" ? `Edit ${target?.role === "ADMIN" ? "Admin" : "Employee"}` : `Reset password for ${target?.name}`}</h2>
          {mode === "create" ? <p className="mt-1 text-sm text-slate-600">New accounts must change their initial password at first login. Passwords are never returned by the API or stored in activity logs.</p> : null}
          {mode === "reset" ? <p className="mt-1 text-sm text-slate-600">The new temporary password will not be returned or displayed after saving.</p> : null}
        </div>
        {mode !== "reset" ? <>
          {mode === "create" && user?.role === "SUPER_ADMIN" ? <label className="grid gap-1 text-sm font-medium">
            Role
            <select className="h-11 rounded border px-3" value={draft.role} onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value as "ADMIN" | "EMPLOYEE" }))}>
              <option value="EMPLOYEE">Employee</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label> : mode === "create" ? <p className="flex items-center text-sm text-slate-600">Role: Employee</p> : <p className="flex items-center text-sm text-slate-600">Role: {target?.role === "ADMIN" ? "Admin" : "Employee"} (cannot be changed)</p>}
          <input required minLength={2} maxLength={100} aria-label="Full name" placeholder="Full name" className="h-11 min-w-0 rounded border px-3" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
          <input required type="email" aria-label="Email" placeholder="Email" className="h-11 min-w-0 rounded border px-3" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} />
        </> : null}
        {mode !== "edit" ? <div className="relative">
          <input required minLength={minimumPasswordLength} maxLength={128} type={showPassword ? "text" : "password"} aria-label={passwordLabel} placeholder={`${passwordLabel} (${minimumPasswordLength}+ characters)`} className="h-11 w-full min-w-0 rounded border px-3 pr-32" value={draft.password} onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))} />
          <div className="absolute right-1 top-1/2 flex -translate-y-1/2">
            <button type="button" onClick={() => setShowPassword((current) => !current)} className="min-h-11 px-2 text-xs font-semibold text-slate-600">{showPassword ? "Hide" : "Show"}</button>
            <button type="button" aria-label="Generate secure password" onClick={() => { setDraft((current) => ({ ...current, password: generateSecurePassword() })); setShowPassword(true); }} className="min-h-11 px-2 text-xs font-semibold text-emerald-700">Generate</button>
          </div>
        </div> : null}
        <div className="flex gap-2">
          <button className="min-h-11 flex-1 rounded bg-emerald-700 px-3 font-semibold text-white">{mode === "create" ? "Create user" : mode === "edit" ? "Save changes" : "Reset password"}</button>
          <button type="button" onClick={closeForm} className="min-h-11 rounded border px-3 font-semibold">Cancel</button>
        </div>
        {(mode === "create" && draft.role === "EMPLOYEE" || mode === "edit" && target?.role === "EMPLOYEE") ? <fieldset className="grid gap-2 border-t pt-3 sm:col-span-2 lg:col-span-4 sm:grid-cols-2 lg:grid-cols-3">
          <legend className="px-1 text-sm font-semibold">Employee permissions</legend>
          {permissionOptions.map(([permission, label]) => <label key={permission} className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={permissions.includes(permission)} onChange={(event) => setPermissions((current) => event.target.checked ? [...current, permission] : current.filter((value) => value !== permission))} />
            {label}
          </label>)}
        </fieldset> : null}
      </form> : null}

      {message ? <p role="status" className="text-sm font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p role="alert" className="text-sm font-semibold text-red-600">{error}</p> : null}

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-sm">
        {loading ? <p className="p-5 text-slate-600">Loading users...</p> : <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-100"><tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Created</th><th className="p-3">Actions</th></tr></thead>
          <tbody>{users.map((account) => <Fragment key={account.id}><tr className="border-t align-top">
            <td className="p-3 font-medium">{account.name}</td>
            <td className="break-all p-3">{account.email}</td>
            <td className="p-3">{account.role === "SUPER_ADMIN" ? "Super Admin" : account.role === "ADMIN" ? "Admin" : "Employee"}</td>
            <td className="p-3">{account.accountStatus}</td>
            <td className="whitespace-nowrap p-3">{new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(account.createdAt))}</td>
            <td className="p-3"><div className="flex flex-wrap gap-x-3 gap-y-1">
              <button type="button" onClick={() => void showDetails(account)} className="min-h-11 font-semibold text-emerald-700">{viewing?.id === account.id ? "Hide details" : "View details"}</button>
              {canManage(account) ? <>
                <button type="button" onClick={() => startEdit(account)} className="min-h-11 font-semibold text-emerald-700">Edit</button>
                <button type="button" onClick={() => startPasswordReset(account)} className="min-h-11 font-semibold text-emerald-700">Reset password</button>
                <button type="button" onClick={() => void toggleStatus(account)} className="min-h-11 font-semibold text-emerald-700">{account.accountStatus === "ACTIVE" ? "Deactivate" : "Activate"}</button>
              </> : null}
            </div></td>
          </tr>{viewing?.id === account.id ? <tr><td colSpan={6} className="bg-slate-50 px-3 pb-4">
              <strong className="block pt-3">Account details</strong>
              <p className="mt-1">Email verified: {viewing.emailVerified ? "Yes" : "No"} · Must change password: {viewing.mustChangePassword ? "Yes" : "No"}</p>
              <p className="mt-1">{viewing.role === "EMPLOYEE" ? `Permissions: ${viewing.permissions.length ? viewing.permissions.join(", ") : "None assigned"}` : "Full business-management access"}</p>
            </td></tr> : null}</Fragment>)}
          {users.length === 0 ? <tr><td colSpan={6} className="p-5 text-slate-600">No Admin or Employee accounts found.</td></tr> : null}</tbody>
        </table>}
      </div>
    </div>
  </section>;
}
